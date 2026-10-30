// Test yardımcıları: göçlenmiş PGlite veritabanı ve her kiracı tablosuna en az bir satır ekleyen örnek veri.
// Örnek veriler uydurmadır.

import { type SQL, sql } from "drizzle-orm";
import { pgliteBaglantisi, type Vt } from "../src/baglanti.ts";
import { gocleriUygula } from "../src/goc.ts";
import { gunlugeYaz, type SorguSonucu, satirlar } from "../src/gunluk.ts";
import * as s from "../src/sema/index.ts";

export const KURUM_A = "01900000-0000-7000-8000-00000000000a";
export const KURUM_B = "01900000-0000-7000-8000-00000000000b";

export async function sorgu<T>(db: Vt | Parameters<Parameters<Vt["transaction"]>[0]>[0], ifade: SQL): Promise<T[]> {
  return satirlar((await db.execute(ifade)) as unknown as SorguSonucu<T>);
}

export async function gocluVt() {
  const b = await pgliteBaglantisi();
  await gocleriUygula(b.db);
  return b;
}

/** 1024 boyutlu, yalnız ilk üç bileşeni dolu vektör. */
export function vektor(x: number, y: number, z: number): number[] {
  const v = new Array<number>(1024).fill(0);
  v[0] = x;
  v[1] = y;
  v[2] = z;
  return v;
}

export interface OrnekKimlikler {
  kisi: string;
  oneriDusuk: string;
  oneriYuksek: string;
  oneriOrta: string;
  politika: string;
  kanit: string;
}

/** Sahip rolüyle (PGlite'ta süper kullanıcı) kurumun her kiracı tablosuna bir satır ekler. */
export async function kurumVerisiEkle(db: Vt, kurumId: string, ad: string): Promise<OrnekKimlikler> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.kurum_id', ${kurumId}, true)`);
    const ilk = <T>(x: T[]): T => {
      const d = x[0];
      if (!d) throw new Error("ekleme başarısız");
      return d;
    };
    await tx.insert(s.kurum).values({ id: kurumId, ad });
    const birim = ilk(
      await tx
        .insert(s.birim)
        .values({ kurumId, tur: "myo", ad: `${ad} MYO` })
        .returning(),
    );
    const program = ilk(
      await tx
        .insert(s.program)
        .values({ kurumId, birimId: birim.id, ad: "Örnek Program", duzey: "onlisans" })
        .returning(),
    );
    const ders = ilk(
      await tx
        .insert(s.ders)
        .values({ kurumId, programId: program.id, kod: "ORN101", ad: "Örnek Ders", akts: 5, yariyil: 1 })
        .returning(),
    );
    const donem = ilk(
      await tx.insert(s.donem).values({ kurumId, ad: "Güz", baslangic: "2026-09-01", bitis: "2027-01-31" }).returning(),
    );
    const kisi = ilk(await tx.insert(s.kisi).values({ kurumId, adSoyad: "Deneme Kişi" }).returning());
    const acilis = ilk(
      await tx
        .insert(s.dersAcilisi)
        .values({ kurumId, dersId: ders.id, donemId: donem.id, sorumluKisiIdleri: [kisi.id] })
        .returning(),
    );
    await tx
      .insert(s.rolAtamasi)
      .values({ kurumId, kisiId: kisi.id, rol: "program_sorumlusu", kapsamTuru: "program", kapsamId: program.id });

    const cerceve = ilk(
      await tx
        .insert(s.cerceve)
        .values({ kod: `deneme-${ad}`, ad: "Deneme çerçevesi", surum: "0" })
        .returning(),
    );
    const olcut = ilk(
      await tx.insert(s.olcut).values({ cerceveId: cerceve.id, kod: "A.1", baslik: "Deneme", sira: 1 }).returning(),
    );

    const kanit = ilk(
      await tx
        .insert(s.kanit)
        .values({
          kurumId,
          ozet: (kurumId.slice(-1) === "a" ? "a" : "b").repeat(64),
          dosyaAdi: "ornek.pdf",
          mime: "application/pdf",
          boyut: 10,
          depoAnahtari: "deneme/ornek.pdf",
          kaynakTuru: "yukleme",
        })
        .returning(),
    );
    await tx.insert(s.kanitIsleme).values({ kurumId, kanitId: kanit.id, durum: "bekliyor" });
    const parca = ilk(
      await tx
        .insert(s.kanitParcasi)
        .values({
          kurumId,
          kanitId: kanit.id,
          sira: 1,
          capa: { sayfa: 1 },
          metin: "Örnek metin",
          gomme: vektor(1, 0, 0),
        })
        .returning(),
    );

    const pc = ilk(
      await tx
        .insert(s.cikti)
        .values({ kurumId, tur: "program", sahipId: program.id, kod: "PÇ1", metin: "Örnek." })
        .returning(),
    );
    const dc = ilk(
      await tx
        .insert(s.cikti)
        .values({ kurumId, tur: "ders", sahipId: ders.id, kod: "ÖÇ1", metin: "Örnek." })
        .returning(),
    );

    const oneri = (tur: "kanit_etiketi" | "matris_katkisi" | "olgunluk_duzeyi", risk: "dusuk" | "orta" | "yuksek") =>
      tx
        .insert(s.oneri)
        .values({
          kurumId,
          tur,
          hedefTuru: "kanit",
          hedefId: kanit.id,
          icerik: {},
          gerekce: "Deneme",
          guven: 0.9,
          ureticiTuru: "kural",
          uretici: { kural: "deneme", surum: "1" },
          risk,
        })
        .returning()
        .then(ilk);
    const oneriDusuk = await oneri("kanit_etiketi", "dusuk");
    const oneriOrta = await oneri("matris_katkisi", "orta");
    const oneriYuksek = await oneri("olgunluk_duzeyi", "yuksek");
    const oneriKatki = await oneri("matris_katkisi", "orta");
    const politika = ilk(
      await tx
        .insert(s.yetkiPolitikasi)
        .values({
          kurumId,
          ad: "Kanıt etiketleri",
          oneriTurleri: ["kanit_etiketi"],
          enYuksekRisk: "dusuk",
          enDusukGuven: 0.8,
          imzalayanKisiId: kisi.id,
          baslangic: new Date("2026-01-01T00:00:00Z"),
        })
        .returning(),
    );
    const kararKatki = ilk(
      await tx
        .insert(s.karar)
        .values({ kurumId, oneriId: oneriKatki.id, sonuc: "onaylandi", kararVerenKisiId: kisi.id, dayanak: "dogrudan" })
        .returning(),
    );
    await tx
      .insert(s.katki)
      .values({ kurumId, dersCiktiId: dc.id, programCiktiId: pc.id, deger: "3", kararId: kararKatki.id });
    await tx
      .insert(s.kanitOlcutBaglantisi)
      .values({ kurumId, kanitId: kanit.id, parcaId: parca.id, olcutId: olcut.id, kararId: kararKatki.id });
    // İP-13: e-posta onay bağlantısı ve kullanımı (göç 0006).
    const baglantiId = crypto.randomUUID();
    const t0 = new Date("2026-01-02T00:00:00Z");
    const t1 = new Date("2026-01-03T00:00:00Z");
    await tx.execute(sql`insert into onay_baglantisi (id, kurum_id, oneri_id, kisi_id, sonuc, son, olusturma)
      values (${baglantiId}, ${kurumId}, ${oneriKatki.id}, ${kisi.id}, 'onaylandi', ${t1.toISOString()}, ${t0.toISOString()})`);
    await tx.execute(sql`insert into onay_baglantisi_kullanimi (id, kurum_id, karar_id, zaman)
      values (${baglantiId}, ${kurumId}, ${kararKatki.id}, ${t0.toISOString()})`);

    const arac = ilk(
      await tx
        .insert(s.olcmeAraci)
        .values({ kurumId, dersAcilisiId: acilis.id, tur: "ara_sinav", agirlik: "0.4" })
        .returning(),
    );
    const soru = ilk(
      await tx
        .insert(s.soru)
        .values({
          kurumId,
          olcmeAraciId: arac.id,
          numara: "1",
          tamPuan: "10",
          ciktiEslemesi: [{ ciktiId: dc.id, agirlik: 1 }],
        })
        .returning(),
    );
    await tx
      .insert(s.ogrenciPuani)
      .values({ kurumId, olcmeAraciId: arac.id, soruId: soru.id, ogrenciTakmaAd: "tk-1", puan: "7" });
    await tx
      .insert(s.olcmeSonucu)
      .values({ kurumId, dersAcilisiId: acilis.id, hesapSurumu: "1", girdiOzeti: "0".repeat(64), sonuc: {} });

    const rapor = ilk(
      await tx
        .insert(s.rapor)
        .values({ kurumId, tur: "odr", kapsam: { tur: "program", id: program.id } })
        .returning(),
    );
    await tx.insert(s.raporBolumuSurumu).values({ kurumId, raporId: rapor.id, olcutId: olcut.id, metin: "Taslak." });

    const st = ilk(
      await tx.insert(s.surecTanimi).values({ kurumId, kod: "ders-dosyasi", ad: "Ders dosyası" }).returning(),
    );
    const so = ilk(await tx.insert(s.surecOrnegi).values({ kurumId, surecTanimiId: st.id }).returning());
    const gorev = ilk(
      await tx
        .insert(s.gorev)
        .values({ kurumId, surecOrnegiId: so.id, baslik: "Dosyayı tamamla", atananKisiId: kisi.id })
        .returning(),
    );
    await tx
      .insert(s.sonTarih)
      .values({ kurumId, gorevId: gorev.id, ad: "Teslim", tarih: new Date("2027-01-15T00:00:00Z") });
    await tx.insert(s.bildirim).values({ kurumId, kisiId: kisi.id, tur: "hatirlatma" });
    await tx.insert(s.eylem).values({ kurumId, kaynak: { tur: "bulgu", id: "x" }, tanim: "İyileştirme" });
    await tx.insert(s.toplanti).values({ kurumId, baslik: "Komisyon", zaman: new Date("2026-11-01T10:00:00Z") });
    const anket = ilk(await tx.insert(s.anket).values({ kurumId, baslik: "Ders değerlendirme" }).returning());
    await tx
      .insert(s.anketSorusu)
      .values({ kurumId, anketId: anket.id, sira: 1, metin: "Memnun musunuz?", tur: "likert" });
    await tx.insert(s.anketYaniti).values({ kurumId, anketId: anket.id, yanitlar: { 1: 4 } });
    await tx
      .insert(s.anketBelirteci)
      .values({ kurumId, anketId: anket.id, ozet: "0".repeat(64), kaynak: "baglanti", kullanildi: true });
    const gosterge = ilk(await tx.insert(s.gosterge).values({ kurumId, kod: "G1", ad: "Mezun oranı" }).returning());
    await tx.insert(s.gostergeOlcumu).values({ kurumId, gostergeId: gosterge.id, donemId: donem.id, deger: "0.5" });
    await tx
      .insert(s.takmaAd)
      .values({ kurumId, takmaAd: "tk-1", numaraSifreli: new Uint8Array([1, 2, 3]), anahtarSurumu: "1" });
    // İP-40: kişiye özgü anahtar (sarılı anahtar uydurma baytlardır).
    await tx.execute(
      sql`insert into kisi_anahtari (kurum_id, konu, anahtar_sarili) values (${kurumId}, 'ornek-konu', ${new Uint8Array([9])})`,
    );
    await tx.insert(s.kayitDuzeltmesi).values({
      kurumId,
      hedefTuru: "birim",
      hedefId: kisi.id,
      onceki: { ad: "Eski ad" },
      yeni: { ad: "Yeni ad" },
      duzeltenKisiId: kisi.id,
    });
    await tx.insert(s.pukoOlayi).values({
      kurumId,
      pukoId: "ornek-puko",
      tur: "acildi",
      olay: { tur: "acildi", pukoId: "ornek-puko" },
      zaman: new Date("2026-01-05T09:00:00Z"),
    });
    await gunlugeYaz(tx, { aktor: { tur: "sistem", id: null }, eylem: "deneme.basladi" });

    return {
      kisi: kisi.id,
      oneriDusuk: oneriDusuk.id,
      oneriOrta: oneriOrta.id,
      oneriYuksek: oneriYuksek.id,
      politika: politika.id,
      kanit: kanit.id,
    };
  });
}

/** Şemadan okunan kiracı tabloları: `kurum_id` sütunu taşıyan bütün tablolar. */
export async function kiraciTablolari(db: Vt): Promise<string[]> {
  const r = await sorgu<{ table_name: string }>(
    db,
    sql`select table_name from information_schema.columns
        where table_schema = 'public' and column_name = 'kurum_id' order by table_name`,
  );
  return r.map((x) => x.table_name);
}

/** PostgreSQL hata kodunu (SQLSTATE) çıkarır; Drizzle hatayı `cause` içine sarar. */
export function hataKodu(e: unknown): string | undefined {
  let h: unknown = e;
  for (let i = 0; i < 4 && h; i++) {
    const kod = (h as { code?: unknown }).code;
    if (typeof kod === "string") return kod;
    h = (h as { cause?: unknown }).cause;
  }
  return undefined;
}

export function hataMetni(e: unknown): string {
  const parcalar: string[] = [];
  let h: unknown = e;
  for (let i = 0; i < 4 && h; i++) {
    parcalar.push(String((h as { message?: unknown }).message ?? h));
    h = (h as { cause?: unknown }).cause;
  }
  return parcalar.join(" | ");
}

/** Sözü verilen işlemin reddedildiğini doğrular ve hatayı döndürür. */
export async function reddedilir(is: () => Promise<unknown>): Promise<unknown> {
  try {
    await is();
  } catch (e) {
    return e;
  }
  throw new Error("İşlem reddedilmeliydi ama başarılı oldu.");
}
