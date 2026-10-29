// Servis testleri için örnek veri: iki kurum, rolleri farklı kişiler, kanıt, öneri, çıktı, rapor, görev.
// Bütün adlar ve numaralar uydurmadır.

import { gocleriUygula, pgliteBaglantisi, sema, type Vt } from "@akredit/vt";
import { sql } from "drizzle-orm";
import { type Aktor, aktorYukle, type ServisBaglami } from "../src/baglam.ts";

export const KURUM_A = "01900000-0000-7000-8000-00000000000a";
export const KURUM_B = "01900000-0000-7000-8000-00000000000b";
export const SIMDI = new Date("2026-10-27T09:00:00Z");

export interface Ornek {
  kurumId: string;
  birimId: string;
  programId: string;
  digerProgramId: string;
  dersId: string;
  yonetici: string;
  ogretim: string;
  gozlemci: string;
  rolsuz: string;
  kanitDers: string;
  kanitKurum: string;
  oneriDusuk: string;
  oneriOrta: string;
  oneriOrta2: string;
  oneriYuksek: string;
  /** Kurum düzeyinde, türü yüksek riskli (dış gönderim). */
  oneriDisGonderim: string;
  raporId: string;
  dersCiktiId: string;
  programCiktiId: string;
  donemId: string;
  dersAcilisiId: string;
}

const ilk = <T>(x: T[]): T => {
  const d = x[0];
  if (!d) throw new Error("ekleme başarısız");
  return d;
};

const ozet = (n: number) => n.toString(16).padEnd(64, "a");

export async function kurumEkle(db: Vt, kurumId: string, harf: string, taban: number): Promise<Ornek> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.kurum_id', ${kurumId}, true)`);
    await tx.insert(sema.kurum).values({ id: kurumId, ad: `Örnek ${harf} Üniversitesi`, kisaAd: `Ö${harf}Ü` });
    const birim = ilk(
      await tx
        .insert(sema.birim)
        .values({ kurumId, tur: "myo", ad: `Örnek ${harf} MYO` })
        .returning(),
    );
    const program = ilk(
      await tx
        .insert(sema.program)
        .values({ kurumId, birimId: birim.id, ad: `Bilgisayar ${harf}`, duzey: "onlisans" })
        .returning(),
    );
    const diger = ilk(
      await tx
        .insert(sema.program)
        .values({ kurumId, birimId: birim.id, ad: `Muhasebe ${harf}`, duzey: "onlisans" })
        .returning(),
    );
    const ders = ilk(
      await tx
        .insert(sema.ders)
        .values({ kurumId, programId: program.id, kod: `BP${harf}102`, ad: "Veri Tabanı", akts: 5, yariyil: 2 })
        .returning(),
    );
    const kisi = async (ad: string) =>
      ilk(await tx.insert(sema.kisi).values({ kurumId, adSoyad: ad, unvan: "Öğr. Gör." }).returning()).id;
    const yonetici = await kisi(`Deneme Yönetici ${harf}`);
    const ogretim = await kisi(`Deneme Hoca ${harf}`);
    const gozlemci = await kisi(`Deneme Gözlemci ${harf}`);
    const rolsuz = await kisi(`Deneme Rolsüz ${harf}`);
    const bas = new Date("2026-01-01T00:00:00Z");
    await tx.insert(sema.rolAtamasi).values([
      { kurumId, kisiId: yonetici, rol: "kurum_yoneticisi", kapsamTuru: "kurum", kapsamId: kurumId, baslangic: bas },
      { kurumId, kisiId: ogretim, rol: "ogretim_elemani", kapsamTuru: "ders", kapsamId: ders.id, baslangic: bas },
      { kurumId, kisiId: gozlemci, rol: "gozlemci", kapsamTuru: "kurum", kapsamId: kurumId, baslangic: bas },
    ]);
    const kanit = async (n: number, ad: string, kapsamlar: unknown[]) =>
      ilk(
        await tx
          .insert(sema.kanit)
          .values({
            kurumId,
            ozet: ozet(taban + n),
            dosyaAdi: ad,
            mime: "application/pdf",
            boyut: 1000 + n,
            depoAnahtari: `${kurumId}/${ozet(taban + n)}`,
            kaynakTuru: "yukleme",
            kapsamlar,
          })
          .returning(),
      ).id;
    const kanitDers = await kanit(1, "ders-izlencesi.pdf", [{ tur: "ders", id: ders.id }]);
    const kanitKurum = await kanit(2, "kalite-politikasi.pdf", []);
    await tx
      .insert(sema.kanitParcasi)
      .values({ kurumId, kanitId: kanitDers, sira: 0, capa: { sayfa: 1 }, metin: "Haftalık konu listesi." });
    await tx.insert(sema.kanitIsleme).values([
      { kurumId, kanitId: kanitDers, durum: "bekliyor", ayrinti: { asama: "alindi" } },
      { kurumId, kanitId: kanitKurum, durum: "hata", ayrinti: { asama: "cikarma", ileti: "Dosya okunamadı." } },
    ]);
    // Sıra önemli: aynı işlemde `now()` aynı olduğundan son durum `id` ile belirlenir (UUID v7 artan).
    await tx.insert(sema.kanitIsleme).values({
      kurumId,
      kanitId: kanitDers,
      durum: "gomme_tamam",
      ayrinti: { asama: "tamam", kisiselVeri: "var" },
    });
    const oneri = async (
      tur: "kanit_etiketi" | "matris_katkisi" | "dis_gonderim" | "olgunluk_duzeyi",
      risk: "dusuk" | "orta" | "yuksek",
      hedefTuru: string,
      hedefId: string,
      guven = 0.9,
    ) =>
      ilk(
        await tx
          .insert(sema.oneri)
          .values({
            kurumId,
            tur,
            hedefTuru,
            hedefId,
            icerik: { baslik: `Öneri ${tur}`, metin: "Önerilen metin." },
            gerekce: "Örnek gerekçe.",
            guven,
            ureticiTuru: "kural",
            uretici: { kural: "ornek", surum: "1" },
            risk,
          })
          .returning(),
      ).id;
    const oneriDusuk = await oneri("kanit_etiketi", "dusuk", "kanit", kanitDers);
    const oneriOrta = await oneri("matris_katkisi", "orta", "ders", ders.id);
    const oneriYuksek = await oneri("olgunluk_duzeyi", "yuksek", "ders", ders.id);
    const oneriDisGonderim = await oneri("dis_gonderim", "yuksek", "rapor", "r-1");
    const oneriOrta2 = await oneri("matris_katkisi", "orta", "ders", ders.id);
    const pc = ilk(
      await tx
        .insert(sema.cikti)
        .values({ kurumId, tur: "program", sahipId: program.id, kod: "PÇ1", metin: "Program çıktısı." })
        .returning(),
    );
    const dc = ilk(
      await tx
        .insert(sema.cikti)
        .values({ kurumId, tur: "ders", sahipId: ders.id, kod: "ÖÇ1", metin: "Ders çıktısı." })
        .returning(),
    );
    const rapor = ilk(
      await tx
        .insert(sema.rapor)
        .values({ kurumId, tur: "bidr", kapsam: { tur: "birim", id: birim.id }, baslik: "BİDR 2026" })
        .returning(),
    );
    await tx.insert(sema.raporBolumuSurumu).values({
      kurumId,
      raporId: rapor.id,
      bolumKodu: "A.1",
      metin: `İzlence yayımlandı [K:${ozet(taban + 1).slice(0, 8)} s.1].\n\nDış paydaş toplantısı yapıldı.`,
    });
    const gorev = ilk(
      await tx
        .insert(sema.gorev)
        .values({ kurumId, baslik: "Ders dosyasını tamamla", atananKisiId: ogretim })
        .returning(),
    );
    await tx
      .insert(sema.sonTarih)
      .values({ kurumId, gorevId: gorev.id, ad: "Teslim", tarih: new Date("2026-11-15T00:00:00Z") });
    const donem = ilk(
      await tx
        .insert(sema.donem)
        .values({ kurumId, ad: "2025-2026 Bahar", baslangic: "2026-02-01", bitis: "2026-06-30" })
        .returning(),
    );
    const acilis = ilk(
      await tx
        .insert(sema.dersAcilisi)
        .values({ kurumId, dersId: ders.id, donemId: donem.id, sorumluKisiIdleri: [ogretim] })
        .returning(),
    );
    return {
      donemId: donem.id,
      dersAcilisiId: acilis.id,
      kurumId,
      birimId: birim.id,
      programId: program.id,
      digerProgramId: diger.id,
      dersId: ders.id,
      yonetici,
      ogretim,
      gozlemci,
      rolsuz,
      kanitDers,
      kanitKurum,
      oneriDusuk,
      oneriOrta,
      oneriOrta2,
      oneriYuksek,
      oneriDisGonderim,
      raporId: rapor.id,
      dersCiktiId: dc.id,
      programCiktiId: pc.id,
    };
  });
}

export async function ortam() {
  const b = await pgliteBaglantisi();
  await gocleriUygula(b.db);
  const a = await kurumEkle(b.db, KURUM_A, "A", 0x100);
  const bb = await kurumEkle(b.db, KURUM_B, "B", 0x200);
  const baglam = async (
    o: Ornek,
    kisi: string,
    tur: Aktor["tur"] = "oturum",
    kapsam: Aktor["anahtarKapsami"] = null,
  ): Promise<ServisBaglami> => ({
    db: b.db,
    aktor: await aktorYukle(b.db, o.kurumId, kisi, tur, kapsam),
    simdi: () => SIMDI,
  });
  return { db: b.db, a, b: bb, baglam, kapat: b.kapat };
}

/** Yurt dışı iznini tek geçerli yoldan, yöneticinin adıyla imzalanan kararla açar (İP-35). */
export async function yurtDisiIzniVer(b: ServisBaglami, harf: "A" | "B" = "A"): Promise<void> {
  const kurulum = await import("../src/kurulum/index.ts");
  await kurulum.yurtDisiKarariImzala(b, {
    izin: true,
    imzaAdi: `Deneme Yönetici ${harf}`,
    metinOzeti: kurulum.YURT_DISI_METNI_OZETI,
  });
}
