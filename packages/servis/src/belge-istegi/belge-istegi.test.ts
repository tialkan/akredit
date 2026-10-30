// İP-45: hesapsız belge isteme. Jeton tek kullanımlık ve süreli; açık hâlde veritabanına ve günlüğe girmez;
// yüklenen dosya doğrulanmamış kanıt olur, kabul kararı olmadan ölçüte bağlanamaz. Bütün adlar uydurmadır.

import { createHash } from "node:crypto";
import { kiraciIslemi, sema } from "@akredit/vt";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ortam, SIMDI } from "../../test/yardimci.ts";
import { ServisHatasi } from "../hata.ts";
import * as oneri from "../oneri.ts";
import * as bi from "./index.ts";

const GIZLI = "deneme-belge-istegi-anahtari-en-az-otuz-iki-bayt";
const GUN = 86_400_000;

let o: Awaited<ReturnType<typeof ortam>>;
beforeAll(async () => {
  o = await ortam();
});
afterAll(async () => {
  await o.kapat();
});

async function kod(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    if (e instanceof ServisHatasi) return e.kod;
    const kok = (e as { cause?: { code?: string } })?.cause ?? (e as { code?: string });
    return `vt:${kok?.code ?? String(e)}`;
  }
  return "hata yok";
}

const giden: { alici: string; konu: string; metin: string }[] = [];
const tasiyici = { gonder: async (i: (typeof giden)[number]) => void giden.push(i) };
const ayar = (t: bi.EpostaGondericisi | null = tasiyici) => ({
  gizli: GIZLI,
  temelAdres: "https://akredit.org/",
  tasiyici: t,
});
const jetonu = (baglanti: string) => decodeURIComponent(new URL(baglanti).searchParams.get("j") ?? "");

let sayac = 0;
function dosya(): bi.YuklenenDosya {
  sayac++;
  const ozet = createHash("sha256").update(`belge-${sayac}`).digest("hex");
  return {
    ozet,
    depoAnahtari: `${o.a.kurumId}/${ozet}`,
    dosyaAdi: "../personel/egitim-plani.pdf",
    mime: "application/pdf",
    boyut: 1234,
  };
}

async function istek(gun = 7, aliciEposta: string | null = "personel@ornek.edu.tr") {
  const b = await o.baglam(o.a, o.a.yonetici);
  return bi.istekOlustur(
    b,
    { istenen: "2025 yılı personel hizmet içi eğitim planı", ...(aliciEposta ? { aliciEposta } : {}), sonGun: gun },
    ayar(),
  );
}

describe("jeton", () => {
  it("imzası değiştirilen ya da biçimi bozuk jeton reddedilir", () => {
    const j = bi.jetonUret(
      GIZLI,
      o?.a.kurumId ?? "01900000-0000-7000-8000-00000000000a",
      "01900000-0000-7000-8000-000000000001",
      new Uint8Array(32),
    );
    expect(bi.jetonCoz(GIZLI, j).istekId).toBe("01900000-0000-7000-8000-000000000001");
    expect(() => bi.jetonCoz(GIZLI, `${j}x`)).toThrow(ServisHatasi);
    expect(() => bi.jetonCoz(`${GIZLI}-baska`, j)).toThrow(ServisHatasi);
    expect(() => bi.jetonCoz(GIZLI, "a.b.c")).toThrow(ServisHatasi);
    expect(() => bi.jetonUret(GIZLI, "x", "y", new Uint8Array(8))).toThrow();
  });

  it("dosya türü uzantı ve ilk baytlarla denetlenir", () => {
    const pdf = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
    expect(bi.dosyaDenetle(pdf, "plan.pdf")).toEqual({ tamam: true, mime: "application/pdf" });
    expect(bi.dosyaDenetle(pdf, "plan.exe").tamam).toBe(false);
    expect(bi.dosyaDenetle(new Uint8Array([0x4d, 0x5a]), "plan.pdf").tamam).toBe(false);
    expect(bi.dosyaDenetle(new Uint8Array(), "plan.pdf").tamam).toBe(false);
    expect(bi.dosyaDenetle(new Uint8Array(bi.EN_BUYUK_DOSYA + 1), "plan.pdf").tamam).toBe(false);
  });
});

describe("istek ve yükleme", () => {
  it("istek e-postayla gider; bağlantı tek kullanımlıktır, ikinci kullanım reddedilir", async () => {
    const s = await istek();
    expect(s.gonderim).toBe("gonderildi");
    const ileti = giden.at(-1);
    expect(ileti?.alici).toBe("personel@ornek.edu.tr");
    expect(ileti?.metin).toContain(s.baglanti);
    const j = jetonu(s.baglanti);
    const on = await bi.istekOnizle(o.db, GIZLI, j, SIMDI);
    expect(on.durum).toEqual({ gecerli: true });
    expect(on.isteyenAd).toBe("Deneme Yönetici A");
    const y = await bi.istekYukle(
      o.db,
      GIZLI,
      { jeton: j, dosya: dosya(), aciklama: "Ek açıklama.", agIzi: "ag1" },
      SIMDI,
    );
    expect(y.kanitId).toBeTruthy();
    expect(await kod(bi.istekYukle(o.db, GIZLI, { jeton: j, dosya: dosya(), agIzi: "ag1" }, SIMDI))).toBe("cakisma");
    expect((await bi.istekOnizle(o.db, GIZLI, j, SIMDI)).durum).toMatchObject({ gecerli: false });
  });

  it("eşzamanlı iki yüklemeden yalnız biri geçer", async () => {
    const j = jetonu((await istek()).baglanti);
    const r = await Promise.allSettled([
      bi.istekYukle(o.db, GIZLI, { jeton: j, dosya: dosya(), agIzi: null }, SIMDI),
      bi.istekYukle(o.db, GIZLI, { jeton: j, dosya: dosya(), agIzi: null }, SIMDI),
    ]);
    expect(r.filter((x) => x.status === "fulfilled")).toHaveLength(1);
  });

  it("süresi dolan bağlantı reddedilir", async () => {
    const j = jetonu((await istek(2)).baglanti);
    const sonra = new Date(SIMDI.getTime() + 2 * GUN);
    expect(await kod(bi.istekYukle(o.db, GIZLI, { jeton: j, dosya: dosya(), agIzi: null }, sonra))).toBe(
      "kural_ihlali",
    );
    expect((await bi.istekOnizle(o.db, GIZLI, j, sonra)).durum).toMatchObject({ gecerli: false });
  });

  it("başka bir istekle imzalanmış ama özeti tutmayan jeton reddedilir", async () => {
    const s = await istek();
    const sahte = bi.jetonUret(GIZLI, o.a.kurumId, s.id, new Uint8Array(32).fill(7));
    expect(await kod(bi.istekOnizle(o.db, GIZLI, sahte, SIMDI))).toBe("bulunamadi");
  });

  it("jeton açık hâlde veritabanına ve günlüğe yazılmaz; yalnız özeti saklanır", async () => {
    const s = await istek();
    const j = jetonu(s.baglanti);
    await bi.istekYukle(o.db, GIZLI, { jeton: j, dosya: dosya(), agIzi: null }, SIMDI);
    const [satir] = await kiraciIslemi(o.db, o.a.kurumId, (tx) =>
      tx.select().from(sema.belgeIstegi).where(eq(sema.belgeIstegi.id, s.id)),
    );
    expect(satir?.belirtecOzet).toBe(createHash("sha256").update(j).digest("hex"));
    const imzaParcasi = j.split(".")[1] ?? "";
    // Bütün tabloların bütün satırları metne çevrilip jetonun parçaları aranır.
    const tablolar = ["belge_istegi", "belge_istegi_gonderimi", "belge_istegi_yuklemesi", "gunluk", "kanit", "oneri"];
    for (const t of tablolar) {
      const r = await o.db.execute(sql.raw(`select coalesce(string_agg(x::text, ' '), '') as m from ${t} x`));
      const metin = String((r as unknown as { rows: { m: string }[] }).rows[0]?.m ?? "");
      expect(metin.includes(j), t).toBe(false);
      expect(metin.includes(imzaParcasi), t).toBe(false);
    }
  });

  it("e-posta yoksa istek oluşturulur ama gönderilmedi diye işaretlenir; panel listesi bunu gösterir", async () => {
    const b = await o.baglam(o.a, o.a.yonetici);
    const s1 = await istek(7, null);
    expect(s1.gonderim).toBe("gonderilmedi");
    expect(s1.neden).toMatch(/e-posta/u);
    const s2 = await bi.istekOlustur(
      b,
      { istenen: "Kütüphane kullanım istatistikleri", aliciEposta: "kutuphane@ornek.edu.tr" },
      ayar(null),
    );
    expect(s2.gonderim).toBe("gonderilmedi");
    const s3 = await bi.istekOlustur(
      b,
      { istenen: "SKS etkinlik listesi", aliciEposta: "sks@ornek.edu.tr" },
      ayar({ gonder: async () => Promise.reject(new Error("smtp kapalı")) }),
    );
    expect(s3.gonderim).toBe("gonderilmedi");
    const liste = await bi.istekleri(b);
    for (const id of [s1.id, s2.id, s3.id])
      expect(liste.find((x) => x.id === id)?.gonderim?.durum).toBe("gonderilmedi");
    expect(liste.find((x) => x.id === s1.id)?.aliciVar).toBe(false);
  });

  it("istek oluşturmak yetki ister; gözlemci oluşturamaz, başka kurum göremez", async () => {
    const g = await o.baglam(o.a, o.a.gozlemci);
    expect(await kod(bi.istekOlustur(g, { istenen: "Bir belge" }, ayar()))).toBe("yetki_yok");
    const bb = await o.baglam(o.b, o.b.yonetici);
    expect(await bi.istekleri(bb)).toEqual([]);
  });

  it("geçersiz girdi reddedilir", async () => {
    const b = await o.baglam(o.a, o.a.yonetici);
    await expect(bi.istekOlustur(b, { istenen: "x" }, ayar())).rejects.toThrow();
    await expect(bi.istekOlustur(b, { istenen: "Belge", sonGun: 60 }, ayar())).rejects.toThrow();
    await expect(bi.istekOlustur(b, { istenen: "Belge", birimAdi: "a\nb" }, ayar())).rejects.toThrow();
  });

  it("aynı ağ izinden saatlik sınır aşılınca yükleme reddedilir", async () => {
    const ag = "hiz-siniri-agi";
    for (let i = 0; i < bi.AG_SINIRI_SAATLIK; i++)
      await bi.istekYukle(o.db, GIZLI, { jeton: jetonu((await istek()).baglanti), dosya: dosya(), agIzi: ag }, SIMDI);
    const j = jetonu((await istek()).baglanti);
    expect(await kod(bi.istekYukle(o.db, GIZLI, { jeton: j, dosya: dosya(), agIzi: ag }, SIMDI))).toBe(
      "cok_fazla_istek",
    );
    // Sınır aşımı bağlantıyı tüketmez: bir saat sonra aynı bağlantı çalışır.
    const sonra = new Date(SIMDI.getTime() + 3_600_001);
    await bi.istekYukle(o.db, GIZLI, { jeton: j, dosya: dosya(), agIzi: ag }, sonra);
  });
});

describe("doğrulama insan kararıdır", () => {
  it("yüklenen dosya SHA-256 özetiyle doğrulanmamış kanıt olur; kabul kararı olmadan ölçüte bağlanamaz", async () => {
    const j = jetonu((await istek()).baglanti);
    const d = dosya();
    const y = await bi.istekYukle(o.db, GIZLI, { jeton: j, dosya: d, agIzi: null }, SIMDI);
    const { kanit, oneriSatiri, isleme } = await kiraciIslemi(o.db, o.a.kurumId, async (tx) => ({
      kanit: (await tx.select().from(sema.kanit).where(eq(sema.kanit.id, y.kanitId)))[0],
      oneriSatiri: (await tx.select().from(sema.oneri).where(eq(sema.oneri.id, y.oneriId)))[0],
      isleme: await tx.select().from(sema.kanitIsleme).where(eq(sema.kanitIsleme.kanitId, y.kanitId)),
    }));
    expect(kanit?.ozet).toBe(d.ozet);
    expect(kanit?.dosyaAdi).toBe("egitim-plani.pdf");
    expect(kanit?.kaynakAyrinti).toMatchObject({ disBirim: true, dogrulama: "dogrulanmamis" });
    expect(isleme.map((x) => x.durum)).toEqual(["bekliyor"]);
    expect(oneriSatiri).toMatchObject({ tur: "kanit_etiketi", hedefTuru: "kanit", hedefId: y.kanitId, risk: "orta" });
    expect(await kiraciIslemi(o.db, o.a.kurumId, (tx) => bi.atifaUygunMu(tx, y.kanitId))).toBe(false);

    // Ölçüt (çerçeve tablosu kiracısızdır, sahip rolüyle eklenir).
    const [c] = await o.db.insert(sema.cerceve).values({ kod: "deneme-ip45", ad: "Deneme", surum: "1" }).returning();
    const [ol] = await o.db
      .insert(sema.olcut)
      .values({ cerceveId: c?.id as string, kod: "A.1", baslik: "Deneme ölçüt", sira: 1 })
      .returning();
    // Başka bir onaylı kararla bağlamaya çalışmak da reddedilir.
    const b = await o.baglam(o.a, o.a.yonetici);
    const baskaKarar = await oneri.kararVer(b, { oneriId: o.a.oneriOrta, sonuc: "onaylandi" });
    const bagla = (kararId: string) =>
      kiraciIslemi(o.db, o.a.kurumId, (tx) =>
        tx
          .insert(sema.kanitOlcutBaglantisi)
          .values({ kurumId: o.a.kurumId, kanitId: y.kanitId, olcutId: ol?.id as string, kararId }),
      );
    expect(await kod(bagla(baskaKarar.id))).toBe("vt:23514");

    // Panel listesi: yüklendi, kabul bekliyor.
    expect((await bi.istekleri(b)).find((x) => x.kanitId === y.kanitId)?.durum).toBe("yuklendi");
    // Kabul: komisyon üyesi öneriyi onaylar.
    const kabul = await oneri.kararVer(b, { oneriId: y.oneriId, sonuc: "onaylandi" });
    expect(await kiraciIslemi(o.db, o.a.kurumId, (tx) => bi.atifaUygunMu(tx, y.kanitId))).toBe(true);
    await bagla(kabul.id);
    expect((await bi.istekleri(b)).find((x) => x.kanitId === y.kanitId)?.durum).toBe("kabul_edildi");
  });

  it("istek ve yükleme günlükte; kayıtlar değiştirilemez", async () => {
    const s = await istek();
    await bi.istekYukle(o.db, GIZLI, { jeton: jetonu(s.baglanti), dosya: dosya(), agIzi: null }, SIMDI);
    const g = await kiraciIslemi(o.db, o.a.kurumId, (tx) =>
      tx.select().from(sema.gunluk).where(eq(sema.gunluk.hedefId, s.id)),
    );
    expect(g.map((x) => x.eylem).sort()).toEqual(["belge_istegi.olusturuldu", "belge_istegi.yuklendi"]);
    expect(await kod(o.db.execute(sql`update belge_istegi set istenen = 'x' where id = ${s.id}`))).toBe("vt:23000");
    expect(await kod(o.db.execute(sql`delete from belge_istegi_yuklemesi where id = ${s.id}`))).toBe("vt:23000");
  });
});

describe("hatırlatma", () => {
  it("son tarihe 48 saatten az kalan, yüklenmemiş, gönderilmiş isteği bir kez listeler", async () => {
    const s = await istek(3);
    const once = await bi.hatirlatilacaklar(o.db, o.a.kurumId, SIMDI);
    expect(once.some((x) => x.id === s.id)).toBe(false);
    const yakin = new Date(SIMDI.getTime() + 2 * GUN);
    const l = await bi.hatirlatilacaklar(o.db, o.a.kurumId, yakin);
    expect(l.find((x) => x.id === s.id)?.aliciEposta).toBe("personel@ornek.edu.tr");
    await bi.gonderimYaz(o.db, o.a.kurumId, s.id, "hatirlatma", "gonderildi", null, yakin);
    expect((await bi.hatirlatilacaklar(o.db, o.a.kurumId, yakin)).some((x) => x.id === s.id)).toBe(false);
    expect(bi.hatirlatmaIletisi({ istenen: "Plan", son: yakin }).metin).not.toMatch(/https?:/u);
  });
});
