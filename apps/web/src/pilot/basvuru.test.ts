// Pilot başvurusu (İP-42): göçlenmiş PGlite ile gerçek veritabanı davranışı. Adlar ve adresler uydurmadır.

import { bellekTasiyici } from "@akredit/surec";
import { gocleriUygula, pgliteBaglantisi, type SorguSonucu, satirlar, type Vt } from "@akredit/vt";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  AG_SINIRI_SAATLIK,
  bildirimMetni,
  EPOSTA_SINIRI_GUNLUK,
  ortamdanPilotAlicisi,
  PilotGirdisi,
  type PilotOrtami,
  pilotBasvurusuIsle,
} from "./basvuru.ts";

const ADRES = "http://akredit.test";
const SIMDI = new Date("2026-10-28T10:00:00Z");

let db: Vt;
let kapat: () => Promise<void>;
beforeAll(async () => {
  const b = await pgliteBaglantisi();
  await gocleriUygula(b.db);
  db = b.db;
  kapat = b.kapat;
});
afterAll(async () => {
  await kapat();
});

function ortam(ek: Partial<PilotOrtami> = {}): PilotOrtami & { uyarilar: string[] } {
  const uyarilar: string[] = [];
  return {
    db,
    simdi: () => SIMDI,
    temelAdres: ADRES,
    izinliKokenler: [],
    gizli: "test-icin-sabit-ve-gizli-olmayan-anahtar-0123456789",
    tasiyici: null,
    alici: null,
    uyar: (m) => uyarilar.push(m),
    uyarilar,
    ...ek,
  };
}

function istek(s: { koken?: string | null; ip?: string } = {}): Request {
  const h = new Headers({ "content-type": "application/json" });
  if (s.koken !== null) h.set("origin", s.koken ?? ADRES);
  h.set("x-real-ip", s.ip ?? "203.0.113.7");
  return new Request(`${ADRES}/api/pilot`, { method: "POST", headers: h });
}

const GECERLI = {
  kurum: "Uydurma Bilim Üniversitesi",
  birim: "Mühendislik Fakültesi",
  rol: "kalite_komisyonu",
  eposta: "Kalite@UBU.edu.tr",
  surec: "bologna",
  aciklama: "Önce bir programla başlamak istiyoruz.",
  kvkk: true,
  // Form 10 saniye önce açılmış.
  acilis: SIMDI.getTime() - 10_000,
};

async function kayitSayisi(): Promise<number> {
  const s = satirlar(
    (await db.execute(sql`select count(*)::int as n from pilot_basvurusu`)) as unknown as SorguSonucu<{ n: number }>,
  );
  return Number(s[0]?.n ?? 0);
}

describe("pilot başvurusu", () => {
  it("başka kökenden ya da kökensiz istek reddedilir, kayıt olmaz", async () => {
    expect((await pilotBasvurusuIsle(ortam(), istek({ koken: "https://kotu.example" }), GECERLI)).durum).toBe(403);
    expect((await pilotBasvurusuIsle(ortam(), istek({ koken: null }), GECERLI)).durum).toBe(403);
    expect(await kayitSayisi()).toBe(0);
  });

  it("şema: beklenmeyen alan, eksik KVKK onayı, genel e-posta, satır sonu reddedilir", async () => {
    const o = ortam();
    const dene = async (g: unknown) => pilotBasvurusuIsle(o, istek(), g);
    expect((await dene({ ...GECERLI, fazla: "x" })).durum).toBe(400);
    expect((await dene({ ...GECERLI, kvkk: false })).durum).toBe(400);
    const genel = await dene({ ...GECERLI, eposta: "kisi@gmail.com" });
    expect(genel.durum).toBe(400);
    expect(JSON.stringify(genel.govde)).toContain("Kurumsal e-posta");
    expect((await dene({ ...GECERLI, kurum: "Kurum\r\nBcc: x@y.z" })).durum).toBe(400);
    expect((await dene({ ...GECERLI, rol: "yonetici" })).durum).toBe(400);
    expect(await kayitSayisi()).toBe(0);
  });

  it("bal küpü dolu ya da çok hızlı gönderim aynı yanıtı alır ama kaydedilmez", async () => {
    const o = ortam();
    expect(await pilotBasvurusuIsle(o, istek(), { ...GECERLI, webSitesi: "http://x" })).toEqual({
      durum: 201,
      govde: { tamam: true },
    });
    expect((await pilotBasvurusuIsle(o, istek(), { ...GECERLI, acilis: SIMDI.getTime() - 500 })).durum).toBe(201);
    expect(await kayitSayisi()).toBe(0);
  });

  it("SMTP yoksa kaydeder, 'alındı' döner ve uyarı yazar; kişisel veri uyarıya girmez", async () => {
    const o = ortam();
    expect(await pilotBasvurusuIsle(o, istek(), GECERLI)).toEqual({ durum: 201, govde: { tamam: true } });
    expect(await kayitSayisi()).toBe(1);
    expect(o.uyarilar).toHaveLength(1);
    expect(o.uyarilar[0]).toContain("AKREDIT_PILOT_ALICI");
    expect(o.uyarilar.join(" ")).not.toMatch(/ubu\.edu\.tr|Uydurma/u);
    const s = satirlar(
      (await db.execute(sql`select eposta, rol, surec, kvkk_onayi from pilot_basvurusu`)) as unknown as SorguSonucu<{
        eposta: string;
        rol: string;
        surec: string;
      }>,
    );
    // E-posta küçük harfe çevrilir.
    expect(s[0]).toMatchObject({ eposta: "kalite@ubu.edu.tr", rol: "kalite_komisyonu", surec: "bologna" });
  });

  it("SMTP ve alıcı varsa kurucuya bildirim gider; konu sabit, girdi gövdede", async () => {
    const t = bellekTasiyici();
    const o = ortam({ tasiyici: t, alici: "kurucu@ornek.org" });
    const y = await pilotBasvurusuIsle(o, istek({ ip: "198.51.100.9" }), {
      ...GECERLI,
      eposta: "baskan@ubu.edu.tr",
      rol: "rektorluk",
    });
    expect(y.durum).toBe(201);
    expect(t.kutu).toHaveLength(1);
    expect(t.kutu[0]?.alici).toBe("kurucu@ornek.org");
    expect(t.kutu[0]?.konu).toBe("Akredit: yeni pilot başvurusu");
    expect(t.kutu[0]?.metin).toContain("Rol: Rektörlük");
    expect(o.uyarilar).toEqual([]);
  });

  it("bildirim gönderilemezse başvuru yine kayıtlı kalır ve 'alındı' döner", async () => {
    const o = ortam({
      tasiyici: {
        async gonder() {
          throw new Error("bağlantı yok");
        },
      },
      alici: "kurucu@ornek.org",
    });
    const once = await kayitSayisi();
    expect(
      (await pilotBasvurusuIsle(o, istek({ ip: "198.51.100.10" }), { ...GECERLI, eposta: "a@ubu.edu.tr" })).durum,
    ).toBe(201);
    expect(await kayitSayisi()).toBe(once + 1);
    expect(o.uyarilar[0]).toContain("bildirim gönderilemedi");
  });

  it("hız sınırı: aynı ağdan saatte en çok 5, aynı e-postadan günde en çok 3 başvuru", async () => {
    const o = ortam();
    // Aynı e-posta: önceki testte 1 kayıt var (kalite@ubu.edu.tr), farklı ağlardan 2 daha kabul edilir, 4. reddedilir.
    for (let i = 0; i < EPOSTA_SINIRI_GUNLUK - 1; i++)
      expect((await pilotBasvurusuIsle(o, istek({ ip: `192.0.${i + 10}.1` }), GECERLI)).durum).toBe(201);
    expect((await pilotBasvurusuIsle(o, istek({ ip: "192.0.99.1" }), GECERLI)).durum).toBe(429);
    // Aynı ağ (/24): 5 başvuru kabul, 6. reddedilir.
    for (let i = 0; i < AG_SINIRI_SAATLIK; i++)
      expect(
        (await pilotBasvurusuIsle(o, istek({ ip: `100.64.1.${i + 1}` }), { ...GECERLI, eposta: `k${i}@ubu.edu.tr` }))
          .durum,
      ).toBe(201);
    expect(
      (await pilotBasvurusuIsle(o, istek({ ip: "100.64.1.200" }), { ...GECERLI, eposta: "son@ubu.edu.tr" })).durum,
    ).toBe(429);
  });

  it("kayıt yalnız eklenir: oturum rolü güncelleyemez ve silemez", async () => {
    const dene = (q: ReturnType<typeof sql>) =>
      db.transaction(async (tx) => {
        await tx.execute(sql`set local role akredit_oturum`);
        await tx.execute(q);
      });
    await expect(dene(sql`update pilot_basvurusu set kurum = 'x'`)).rejects.toThrow();
    await expect(dene(sql`delete from pilot_basvurusu`)).rejects.toThrow();
    await expect(dene(sql`select count(*) from pilot_basvurusu`)).resolves.toBeUndefined();
  });

  it("alıcı ortamdan okunur, geçersiz adres yok sayılır; bildirim metni satır sonu taşımaz", () => {
    expect(ortamdanPilotAlicisi({ AKREDIT_PILOT_ALICI: "kurucu@ornek.org" })).toBe("kurucu@ornek.org");
    expect(ortamdanPilotAlicisi({ AKREDIT_PILOT_ALICI: "yanlis" })).toBeNull();
    expect(ortamdanPilotAlicisi({})).toBeNull();
    const g = PilotGirdisi.parse(GECERLI);
    expect(bildirimMetni(g, SIMDI).konu).not.toMatch(/[\r\n]/u);
  });
});
