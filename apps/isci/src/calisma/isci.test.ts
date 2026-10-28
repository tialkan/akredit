// İşçi girişi: kurum dolaşımı, bağlayıcı ayarı, eşitleme ve pg-boss kayıtları (PGlite, gerçek pg-boss).
// Ağ yoktur: YÖK Atlas yanıtı kayıtlı örnektir (packages/baglayicilar fixture'ının kopyası, 2026-10-27).
// Kurum ve kişi adları uydurmadır.

import { readFileSync } from "node:fs";
import type { DisBaglam } from "@akredit/baglayicilar";
import { bellekDepo } from "@akredit/depo";
import { bellekTasiyici, gercekSaat } from "@akredit/surec";
import { gocleriUygula, kiraciIslemi, pgliteBaglantisi, sema, type Vt } from "@akredit/vt";
import { eq } from "drizzle-orm";
import { fromPglite, PgBoss } from "pg-boss";
import { afterEach, describe, expect, it } from "vitest";
import { kanitAra } from "../arama.ts";
import { bellekKuyrugu, type HatBaglami } from "../kanit-hatti/index.ts";
import { baglayiciEsitle, type EsitlemeBaglami } from "./baglayici-isleri.ts";
import { isciKur, ZAMANLAMA } from "./isci.ts";
import { baglayiciAyari, kurumlariListele } from "./kurumlar.ts";

const A = "01900000-0000-7000-8000-0000000000a1";
const B = "01900000-0000-7000-8000-0000000000b2";
const KAYITLI = readFileSync(new URL("./test/fixtures/yokatlas-arama.json", import.meta.url), "utf8");

let kapat: (() => Promise<void>) | null = null;
afterEach(async () => {
  await kapat?.();
  kapat = null;
});

async function kur(ayarA: object = {}, ayarB: object = {}) {
  const bag = await pgliteBaglantisi();
  const db: Vt = bag.db;
  kapat = () => bag.kapat();
  await gocleriUygula(db);
  await db.insert(sema.kurum).values([
    { id: A, ad: "Uydurma Üniversitesi", ayarlar: ayarA },
    { id: B, ad: "Başka Uydurma Üniversitesi", ayarlar: ayarB },
  ]);
  return { db, istemci: bag.istemci };
}

function sahteDis(): DisBaglam & { istekler: string[]; ilerlet(ms: number): void } {
  let simdi = Date.UTC(2026, 9, 27, 9, 0, 0);
  const istekler: string[] = [];
  return {
    istekler,
    ilerlet: (ms) => {
      simdi += ms;
    },
    simdi: () => new Date(simdi),
    bekle: async (ms) => {
      simdi += ms;
    },
    fetch: (async (adres: string | URL | Request) => {
      istekler.push(String(adres));
      return new Response(KAYITLI, { status: 200, headers: { "content-type": "application/json" } });
    }) as typeof fetch,
  };
}

const YOKATLAS = { baglayicilar: { yokatlas: { acik: true, programKodlari: ["103610085"] } } };

function esitleme(db: Vt, dis: DisBaglam): EsitlemeBaglami {
  const hat: HatBaglami = { db, depo: bellekDepo(), kuyruk: bellekKuyrugu() };
  return { hat, dis, kasa: null, istemciler: {} };
}

describe("kurum dolaşımı ve bağlayıcı ayarı", { timeout: 60_000 }, () => {
  it("isci_kurumlari() bütün kurum kimliklerini verir", async () => {
    const { db } = await kur();
    expect(await kurumlariListele(db)).toEqual([A, B]);
  });

  it("ayar yoksa, kapalıysa ya da geçersizse bağlayıcı çalışmaz", async () => {
    const { db } = await kur(YOKATLAS, {
      baglayicilar: {
        yokatlas: { acik: false, programKodlari: ["103610085"] },
        bologna: { acik: true, adresler: ["yanlis"] },
      },
    });
    expect(await baglayiciAyari(db, A, "yokatlas")).toMatchObject({ acik: true, programKodlari: ["103610085"] });
    expect(await baglayiciAyari(db, A, "bologna")).toBeNull();
    expect(await baglayiciAyari(db, B, "yokatlas")).toBeNull();
    expect(await baglayiciAyari(db, B, "bologna")).toBeNull();
  });
});

describe("bağlayıcı eşitleme", { timeout: 60_000 }, () => {
  it("YÖK Atlas verisi kanıt olur; değişmeyen veri ertesi çalıştırmada yeni kanıt üretmez", async () => {
    const { db } = await kur(YOKATLAS);
    const dis = sahteDis();
    const e = esitleme(db, dis);
    const ilk = await baglayiciEsitle(e, A, "yokatlas");
    expect(ilk).toMatchObject({ durum: "tamam", eklenen: 1, zatenVar: 0 });
    // Bir hafta sonra aynı yanıt: okuma zamanı içerikte olmadığından özet aynı kalır.
    dis.ilerlet(7 * 86_400_000);
    const ikinci = await baglayiciEsitle(e, A, "yokatlas");
    expect(ikinci).toMatchObject({ durum: "tamam", eklenen: 0, zatenVar: 1 });
    const kanitlar = await kiraciIslemi(db, A, (tx) =>
      tx
        .select({ ad: sema.kanit.dosyaAdi, tur: sema.kanit.kaynakTuru, ayrinti: sema.kanit.kaynakAyrinti })
        .from(sema.kanit),
    );
    expect(kanitlar).toHaveLength(1);
    expect(kanitlar[0]).toMatchObject({ ad: "yokatlas.json", tur: "baglayici", ayrinti: { baglayici: "yokatlas" } });
    // Son çalışma kurum ayarına yazılır.
    const ayar = await baglayiciAyari(db, A, "yokatlas");
    expect(ayar?.son).toMatchObject({ zaman: "2026-11-03T09:00:00.000Z", eklenen: 0, zatenVar: 1 });
    // Kapalı kurumda ağa istek gitmez.
    const once = dis.istekler.length;
    expect(await baglayiciEsitle(e, B, "yokatlas")).toMatchObject({ durum: "kapali" });
    expect(dis.istekler.length).toBe(once);
  });

  it("OAuth kasası yoksa e-posta eşitlemesi açık iletiyle durur ve durum kaydedilir", async () => {
    const { db } = await kur({
      baglayicilar: {
        eposta: {
          acik: true,
          saglayici: "google",
          sunucu: "imap.uydurma.edu.tr",
          kullanici: "kanit@uydurma.edu.tr",
          guvenilirSunucu: "mx.uydurma.edu.tr",
          izinliGonderenler: ["uydurma.edu.tr"],
          belirtec: "v1.uydurma.sifreli.metin",
        },
      },
    });
    const o = await baglayiciEsitle(esitleme(db, sahteDis()), A, "eposta");
    expect(o).toMatchObject({ durum: "hata", ileti: "E-posta bağlantısı bu sunucuda yapılandırılmamış." });
    expect((await baglayiciAyari(db, A, "eposta"))?.son?.ileti).toBe(o.ileti);
  });
});

describe("pg-boss kayıtları (PGlite)", { timeout: 120_000 }, () => {
  it("zamanlamalar kurulur; planla işi yalnız bağlayıcısı açık kuruma eşitleme koyar; süreç turu çalışır", async () => {
    const { db, istemci } = await kur(YOKATLAS);
    const boss = new PgBoss({ db: fromPglite(istemci), backend: "pglite", schema: "pgboss", supervise: false });
    await boss.start();
    const kayitlar: object[] = [];
    const gunluk = {
      info: (o: object) => kayitlar.push(o),
      warn: (o: object) => kayitlar.push(o),
      error: (o: object) => kayitlar.push(o),
    };
    try {
      const isci = await isciKur({
        db,
        boss,
        depo: bellekDepo(),
        eposta: bellekTasiyici(),
        saat: gercekSaat,
        kurumFabrikasi: { kasa: null, bildir: false },
        esitleme: { dis: sahteDis(), kasa: null, istemciler: {} },
        zamanlama: true,
        saatDilimi: "Europe/Istanbul",
        gunluk,
      });
      const zamanlar = (
        await istemci.query<{ name: string; key: string; cron: string }>(
          "select name, key, cron from pgboss.schedule order by name, key",
        )
      ).rows;
      expect(zamanlar).toHaveLength(ZAMANLAMA.length);
      expect(zamanlar.find((z) => z.key === "eposta")?.cron).toBe("*/15 * * * *");
      expect(zamanlar.find((z) => z.key === "bologna")?.cron).toBe("17 3 * * 1");

      await boss.send("baglayici.planla", { tur: "yokatlas" });
      const bekle = async (kosul: () => Promise<boolean>) => {
        for (let i = 0; i < 200 && !(await kosul()); i++) await new Promise((r) => setTimeout(r, 250));
      };
      await bekle(async () => (await kiraciIslemi(db, A, (tx) => tx.select().from(sema.kanit))).length > 0);
      const a = await kiraciIslemi(db, A, (tx) => tx.select({ id: sema.kanit.id }).from(sema.kanit));
      const b = await kiraciIslemi(db, B, (tx) => tx.select({ id: sema.kanit.id }).from(sema.kanit));
      expect(a).toHaveLength(1);
      expect(b).toHaveLength(0);
      expect(kayitlar).toContainEqual({ tur: "yokatlas", konan: 1 });

      // Açılışta konan süreç turu bütün kurumları dolaşır.
      await bekle(async () => isci.durum.sonTik !== null);
      expect(isci.durum.sonTik).not.toBeNull();
      expect(isci.durum.basladi).toBe(true);
    } finally {
      await boss.stop({ graceful: true, timeout: 5000 });
    }
  });
});

describe("gömmesiz kanıt arama", { timeout: 60_000 }, () => {
  it("Türkçe tam metin: çekim ekli sorgu kökten eşleşir; başka kurum görünmez", async () => {
    const { db } = await kur();
    const ekle = async (kurumId: string, metin: string) =>
      kiraciIslemi(db, kurumId, async (tx) => {
        const ozet = (kurumId === A ? "a" : "b").repeat(64);
        const [k] = await tx
          .insert(sema.kanit)
          .values({
            kurumId,
            ozet,
            dosyaAdi: "x.txt",
            mime: "text/plain",
            boyut: 1,
            depoAnahtari: `${kurumId}/${ozet}`,
            kaynakTuru: "yukleme",
          })
          .returning({ id: sema.kanit.id });
        await tx
          .insert(sema.kanitParcasi)
          .values({ kurumId, kanitId: k?.id as string, sira: 0, capa: { bolum: "1" }, metin });
        return k?.id as string;
      });
    const ka = await ekle(A, "Öğrenci anketi sonuçları kalite komisyonunda değerlendirildi.");
    await ekle(B, "Öğrenci anketleri başka kurumda.");
    const s = await kanitAra(db, A, "öğrencilerin anketleri");
    expect(s.map((x) => x.kanitId)).toEqual([ka]);
    expect(s[0]?.yontem).toBe("tam_metin");
    expect(s[0]?.alinti).toContain("anketi");
    expect(await kanitAra(db, A, "bütçe planlaması")).toEqual([]);
    expect(await kanitAra(db, A, "   ")).toEqual([]);
    // Kiracı yalıtımı doğrudan: B'nin parçası A'nın aramasında yok.
    const hepsi = await kiraciIslemi(db, A, (tx) =>
      tx.select().from(sema.kanitParcasi).where(eq(sema.kanitParcasi.kurumId, B)),
    );
    expect(hepsi).toEqual([]);
  });
});
