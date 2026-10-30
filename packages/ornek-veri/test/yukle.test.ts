// Demo neslinin PGlite'ta (göçlenmiş gerçek şema, satır güvenliği ve tetikleyicilerle) yüklenmesi.

import { akademik, aktorYukle, gosterge, oneri, type ServisBaglami, sahaZiyareti } from "@akredit/servis";
import {
  gocleriUygula,
  kiraciIslemi,
  ORNEK_KURUM_ID,
  pgliteBaglantisi,
  type SorguSonucu,
  satirlar,
  sema,
  tohumla,
  type Vt,
} from "@akredit/vt";
import { count, eq, sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ornekUniversiteUret } from "../src/index.ts";
import {
  demoAyariOku,
  demoKurumuMu,
  demoYenile,
  etkinDemoKurumu,
  suresiDolanDemoHesaplariniSil,
} from "../src/yukle.ts";

const OGRENCI = 400;
let db: Vt;
let kapat: () => Promise<void>;
let demo: string;

beforeAll(async () => {
  const b = await pgliteBaglantisi();
  db = b.db;
  kapat = b.kapat;
  await gocleriUygula(db);
  await tohumla(db); // gerçek (demo olmayan) kiracı
  const y = await demoYenile(db, { ogrenciSayisi: OGRENCI });
  expect(y.durum).toBe("yuklendi");
  demo = y.kurumId;
});
afterAll(async () => kapat());

describe("demo nesli yükleme", () => {
  it("etkin nesil yeni kurumdur; kurum demo işaretlidir, gerçek kurum değildir", async () => {
    expect(await etkinDemoKurumu(db)).toBe(demo);
    expect(await demoKurumuMu(db, demo)).toBe(true);
    expect(await demoKurumuMu(db, ORNEK_KURUM_ID)).toBe(false);
  });

  it("üretilen veri birebir yüklenir: ders, puan, ölçme sonucu, öneri sayıları", async () => {
    const u = ornekUniversiteUret({ ogrenciSayisi: OGRENCI });
    const sayi = async (t: PgTable) =>
      kiraciIslemi(db, demo, async (tx) => (await tx.select({ n: count() }).from(t))[0]?.n ?? 0);
    expect(await sayi(sema.ders)).toBe(120);
    expect(await sayi(sema.olcmeSonucu)).toBe(120);
    expect(await sayi(sema.ogrenciPuani)).toBe(u.acilislar.reduce((t, a) => t + a.veri.puanlar.length, 0));
    expect(await sayi(sema.oneri)).toBe(u.oneriler.length + u.dersler.filter((d) => d.matris).length);
    expect(await sayi(sema.kanit)).toBe(u.belgeler.length);
  });

  it("kiracı yalıtımı: demo bağlamında gerçek kurumun satırı görünmez, gerçek bağlamda demo satırı görünmez", async () => {
    const demoDersleri = await kiraciIslemi(db, demo, (tx) => tx.select({ k: sema.ders.kurumId }).from(sema.ders));
    expect(demoDersleri.every((d) => d.k === demo)).toBe(true);
    const gercek = await kiraciIslemi(db, ORNEK_KURUM_ID, (tx) => tx.select({ k: sema.ders.kurumId }).from(sema.ders));
    expect(gercek.length).toBe(6);
    expect(gercek.some((d) => d.k === demo)).toBe(false);
  });

  it("işçinin kurum listesi demo kurumunu içermez", async () => {
    const r = satirlar(
      (await db.execute(sql`select isci_kurumlari()::text as id`)) as unknown as SorguSonucu<{ id: string }>,
    );
    expect(r.map((x) => x.id)).toContain(ORNEK_KURUM_ID);
    expect(r.map((x) => x.id)).not.toContain(demo);
  });

  it("demo işareti sonradan değiştirilemez", async () => {
    await expect(
      kiraciIslemi(db, ORNEK_KURUM_ID, (tx) =>
        tx.update(sema.kurum).set({ demo: true }).where(eq(sema.kurum.id, ORNEK_KURUM_ID)),
      ),
    ).rejects.toThrow();
    await expect(
      kiraciIslemi(db, demo, (tx) => tx.update(sema.kurum).set({ demo: false }).where(eq(sema.kurum.id, demo))),
    ).rejects.toThrow();
  });

  it("servis katmanı demo kurumunda program, ölçme ve bekleyen öneri döndürür", async () => {
    const ayar = await demoAyariOku(db, demo);
    expect(ayar).not.toBeNull();
    const p = ayar?.personalar.bolum_baskani;
    const aktor = await aktorYukle(db, demo, p?.kisiId as string);
    // Persona şablonunun atamaları kişiye yazılmaz; ziyaretçi oturumu kopyalar. Burada elle veriyoruz.
    const b: ServisBaglami = {
      db,
      simdi: () => new Date(),
      aktor: {
        ...aktor,
        atamalar: (p?.atamalar ?? []).map((a) => ({
          rol: a.rol,
          kapsam: { tur: a.kapsamTuru, id: a.kapsamId },
          baslangic: new Date("2026-01-01T00:00:00Z"),
          bitis: null,
        })),
      },
    };
    const programlar = await akademik.programlar(b);
    expect(programlar.map((x) => x.ad)).toEqual(["Bilgisayar Mühendisliği"]);
    expect(programlar[0]?.ciktilar).toHaveLength(6);
    expect(programlar[0]?.matris.length).toBeGreaterThan(0);
    const aa = (await akademik.dersler(b)).find((d) => d.ad === "Algoritma Analizi");
    expect(aa?.olcme.length).toBe(4);
    expect(aa?.olcme.some((o) => o.saglanma < 0.6)).toBe(true);
    const bekleyen = await oneri.bekleyenOneriler(b, { sinir: 100 });
    expect(bekleyen.ogeler.map((o) => o.tur)).toEqual(expect.arrayContaining(["eylem", "toplanti_tutanagi"]));
    // Kurum yöneticisi şablonu gösterge panosunu ölçme sonuçlarından hesaplar.
    const r = ayar?.personalar.rektorluk;
    const rb: ServisBaglami = {
      ...b,
      aktor: {
        ...(await aktorYukle(db, demo, r?.kisiId as string)),
        atamalar: [
          { rol: "kurum_yoneticisi", kapsam: { tur: "kurum", id: demo }, baslangic: new Date(0), bitis: null },
        ],
      },
    };
    const pano = await gosterge.gostergePanosu(rb);
    expect(pano.veriler.some((v) => v.anahtar === "toplam_pc")).toBe(true);

    // İP-48: saha ziyareti hazırlığı demo kiracısında modelsiz çalışır; her ölçüt soru üretir, oran deterministiktir.
    const saha = await sahaZiyareti.hazirla(b, { programId: programlar[0]?.id, cerceveKod: "yokak-kurumsal" });
    expect(saha.programAd).toBe("Bilgisayar Mühendisliği");
    expect(saha.yz).toBeNull();
    expect(saha.toplam.soru).toBeGreaterThan(0);
    expect(saha.toplam.soru).toBe(saha.sorular.filter((s) => s.kaynak !== "yz").length);
    expect(saha.toplam.kanitli).toBeLessThanOrEqual(saha.toplam.soru);
    // Oran = kanıtlı soru / kurallı soru yüzdesi, bir ondalık; model önerisi paydaya girmez.
    expect(saha.toplam.oran).toBe(Math.round((saha.toplam.kanitli * 1000) / saha.toplam.soru) / 10);
    // Her ölçüt en az bir soru üretir.
    expect(saha.hazirlik.every((h) => h.soru >= 1)).toBe(true);
  });

  it("değişmeyen nesil yeniden yüklenmez; ziyaretçi kararı varsa yeni nesil açılır, eski silinmez", async () => {
    expect((await demoYenile(db, { ogrenciSayisi: OGRENCI })).durum).toBe("gerek_yok");
    const ayar = await demoAyariOku(db, demo);
    await kiraciIslemi(db, demo, async (tx) => {
      const [o] = await tx.select({ id: sema.oneri.id }).from(sema.oneri).where(eq(sema.oneri.tur, "eylem")).limit(1);
      await tx.insert(sema.karar).values({
        kurumId: demo,
        oneriId: o?.id as string,
        sonuc: "onaylandi",
        kararVerenKisiId: ayar?.personalar.ogretim_elemani.kisiId as string,
        dayanak: "dogrudan",
        zaman: new Date(Date.now() + 1000),
      });
    });
    const y = await demoYenile(db, { ogrenciSayisi: OGRENCI });
    expect(y).toMatchObject({ durum: "yuklendi", neden: "ziyaretçiler karar verdi" });
    expect(y.kurumId).not.toBe(demo);
    expect(await etkinDemoKurumu(db)).toBe(y.kurumId);
    const nesiller = await db.select().from(sema.demoNesli);
    expect(nesiller.map((n) => n.demoKurumId)).toEqual(expect.arrayContaining([demo, y.kurumId]));
    // Eski neslin verisi duruyor (yalnız eklenir).
    const eski = await kiraciIslemi(db, demo, async (tx) => (await tx.select({ n: count() }).from(sema.ders))[0]?.n);
    expect(eski).toBe(120);
  });

  it("süresi dolan demo hesapları kimlik tablolarından silinir, süresi dolmayan kalır", async () => {
    const ayar = await demoAyariOku(db, demo);
    const kisiId = ayar?.personalar.ogretim_elemani.kisiId as string;
    const simdi = new Date("2026-10-28T12:00:00Z");
    for (const [ad, bitis] of [
      ["eski", new Date("2026-10-28T11:00:00Z")],
      ["yeni", new Date("2026-10-28T13:00:00Z")],
    ] as const) {
      const eposta = `ziyaretci-${ad}@demo.akredit.invalid`;
      await db.insert(sema.kimlikKullanici).values({ id: `k-${ad}`, name: "Ziyaretçi", email: eposta });
      await db
        .insert(sema.kimlikUyelik)
        .values({ kullaniciId: `k-${ad}`, eposta, bagliKurumId: demo, kisiId, demoBitis: bitis, demoRolu: "x" });
    }
    expect(await suresiDolanDemoHesaplariniSil(db, simdi)).toBe(1);
    const kalan = await db.select({ id: sema.kimlikKullanici.id }).from(sema.kimlikKullanici);
    expect(kalan.map((k) => k.id)).toEqual(["k-yeni"]);
  });
});
