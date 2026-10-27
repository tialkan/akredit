// Ders dosyası ve ölçme raporu servisi (İP-16). Akış:
//   1. Not dökümü aktarımı (OBS dosyası, soru bazlı): öğrenci numarası yalnız takma ada (HMAC) çevrilir.
//      Aynı işlemde soru → ÇK eşleme önerisi açılır (önceki dönemden taşınır ya da model adayı; orta risk).
//   2. İnsan eşlemeyi tek kararla onaylar ya da metni düzelterek onaylar (`/kararlar`).
//   3. Ölçme `@akredit/olcme` ile yapılır, sonuç `olcme_sonucu`na girer; ders dosyası raporu ve dosya onayı
//      önerisi (yüksek risk: kurum adına beyan, toplu ya da politikayla onaylanamaz) açılır. İşçi bunu onaydan
//      sonra kendiliğinden yapar; hoca isterse elle de başlatabilir.
//   4. DOCX (ders dosyası) ve XLSX (ölçme raporu) her istekte kayıtlardan deterministik üretilir.
// Sayılar yalnız ölçme sonucundan gelir; hocanın etkileşimi değiştirilemez günlükten ölçülür.

import { createHmac } from "node:crypto";
import { notAktar } from "@akredit/baglayicilar";
import { docxUret, tabloOku, xlsxUret } from "@akredit/belge";
import type { DersOlcmeVerisi, MatrisDegeri } from "@akredit/cekirdek";
import { ozetHesapla } from "@akredit/cekirdek";
import type { CkPcMatrisi, DersOlcmeSonucu } from "@akredit/olcme";
import { dersiOlc } from "@akredit/olcme";
import { gunlugeYaz, type Islem, kiraciIslemi, sema, type Vt } from "@akredit/vt";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { gunluge, islem, type ServisBaglami } from "../baglam.ts";
import { bulunamadi, ServisHatasi } from "../hata.ts";
import { type DosyaGirdisi, type DosyaOnayi, dersDosyasiModeli, olcmeRaporuSayfalari } from "./belge.ts";
import {
  type EslemeAraci,
  EslemeMetniHatasi,
  type EslemeSatiri,
  eslemeMetni,
  eslemeMetniOku,
  eslemeOnerisiKur,
} from "./esleme.ts";
import { type EtkilesimOzeti, etkilesimOzeti } from "./etkilesim.ts";

export * from "./belge.ts";
export * from "./esleme.ts";
export * from "./etkilesim.ts";

const Kimlik = z.string().uuid("Geçersiz kimlik.");
const AracTuru = z.enum(["ara_sinav", "yariyil_sonu", "odev", "proje", "kisa_sinav", "uygulama", "butunleme", "diger"]);

export const DokumGirdisi = z
  .object({
    dersAcilisiId: Kimlik,
    araclar: z
      .array(
        z
          .object({
            ad: z.string().trim().min(1, "Sınavın adını yazın.").max(100),
            tur: AracTuru,
            agirlik: z
              .number()
              .min(0, "Ağırlık 0 ile 100 arasında olmalı.")
              .max(100, "Ağırlık 0 ile 100 arasında olmalı."),
            dosyaAdi: z.string().trim().min(1).max(200),
            icerikBase64: z.string().min(1, "Dosya boş.").max(900_000, "Dosya çok büyük."),
            tamPuanlar: z.record(z.string(), z.number().positive()).optional(),
          })
          .strict(),
      )
      .min(1, "En az bir sınav dosyası ekleyin.")
      .max(8),
    /** İlk dönem için model adayları (`[{aracAdi?, soruNo, ckKodlari}]`); doğrulanır, sayı içermez. */
    adaylar: z.array(z.unknown()).max(500).optional(),
    uretici: z.record(z.string(), z.string()).optional(),
  })
  .strict()
  .superRefine((g, c) => {
    const adlar = g.araclar.map((a) => a.ad);
    if (new Set(adlar).size !== adlar.length)
      c.addIssue({ code: "custom", path: ["araclar"], message: "Her sınavın adı farklı olmalı." });
  });

export const BelgeBicimi = z.enum(["docx", "xlsx"]);

export const DosyaCiktisi = z.object({
  dosyaAdi: z.string(),
  mime: z.string(),
  ozet: z.string(),
  icerikBase64: z.string(),
});

export const Asama = z.enum([
  "dokum_bekliyor",
  "esleme_onayda",
  "esleme_reddedildi",
  "olcme_bekliyor",
  "onay_bekliyor",
  "onaylandi",
  "reddedildi",
]);

export const DersDosyasiDurumu = z.object({
  dersAcilisiId: z.string(),
  dersId: z.string(),
  donem: z.string(),
  asama: Asama,
  eslemeOneriId: z.string().nullable(),
  dosyaOneriId: z.string().nullable(),
  raporId: z.string().nullable(),
  olcmeSonucuId: z.string().nullable(),
  eksikler: z.array(z.string()),
  etkilesim: z.object({
    adimSayisi: z.number(),
    yuklemeSayisi: z.number(),
    kararSayisi: z.number(),
    toplamSureMs: z.number(),
    adimlar: z.array(z.object({ eylem: z.string(), zaman: z.string() })),
  }),
});
export type DersDosyasiDurumu = z.infer<typeof DersDosyasiDurumu>;

export const DokumSonucu = z.object({
  eslemeOneriId: z.string(),
  araclar: z.array(z.object({ id: z.string(), ad: z.string(), soruSayisi: z.number() })),
  ogrenciSayisi: z.number(),
  uyarilar: z.array(z.string()),
  eksikler: z.array(z.string()),
});

const EslemeIcerigi = z.object({
  baslik: z.string(),
  metin: z.string(),
  dersAcilisiId: z.string(),
  araclar: z.array(z.object({ ad: z.string(), tur: AracTuru, sorular: z.array(z.object({ no: z.string() })) })),
  ckKodlari: z.array(z.string()),
  satirlar: z.array(
    z.object({
      aracAdi: z.string(),
      aracTur: AracTuru,
      soruNo: z.string(),
      ckKodlari: z.array(z.string()),
      kaynak: z.enum(["onceki_donem", "yz", "yok", "insan"]),
    }),
  ),
});

const DosyaIcerigi = z.object({
  baslik: z.string(),
  metin: z.string(),
  dersAcilisiId: z.string(),
  raporId: z.string(),
  olcmeSonucuId: z.string(),
  eslemeOneriId: z.string(),
});

const json = (v: unknown) => JSON.parse(JSON.stringify(v)) as object;

/** Öğrenci numarasının kurum anahtarlı takma adı (HMAC-SHA256, onaltılık ilk 32 karakter). */
export function takmaAdUret(anahtar: string, kurumId: string, ogrenciNo: string): string {
  return createHmac("sha256", anahtar)
    .update(`akredit.ogrenci.v1:${kurumId}:${ogrenciNo.trim()}`)
    .digest("hex")
    .slice(0, 32);
}

async function acilisYukle(tx: Islem, id: string) {
  const [r] = await tx
    .select({ a: sema.dersAcilisi, d: sema.ders, donem: sema.donem })
    .from(sema.dersAcilisi)
    .innerJoin(sema.ders, eq(sema.ders.id, sema.dersAcilisi.dersId))
    .innerJoin(sema.donem, eq(sema.donem.id, sema.dersAcilisi.donemId))
    .where(eq(sema.dersAcilisi.id, id));
  if (!r) throw bulunamadi();
  return r;
}

/** Dersin her kod için en son sürümdeki çıktıları. */
async function dersCiktilari(tx: Islem, dersId: string) {
  const satir = await tx
    .select()
    .from(sema.cikti)
    .where(and(eq(sema.cikti.tur, "ders"), eq(sema.cikti.sahipId, dersId)))
    .orderBy(asc(sema.cikti.kod), asc(sema.cikti.surum));
  const son = new Map<string, (typeof satir)[number]>();
  for (const c of satir) son.set(c.kod, c);
  return [...son.values()];
}

type OneriKarar = { o: typeof sema.oneri.$inferSelect; k: typeof sema.karar.$inferSelect | null };

/**
 * D3-2: eşleme ve dosya bölümü yalnız bu akışın kendi ürettiği kayıtlardır. Dış kanaldan (MCP) gelen
 * aynı türde bir öneri en yeni kayıt olarak onaylı eşlemeyi gölgelememeli; o yüzden seçilmez.
 */
const disKanalDegil = sql`coalesce(${sema.oneri.uretici}->>'kanal', '') <> 'mcp'`;

async function oneriler(tx: Islem, tur: "soru_cikti_eslemesi" | "rapor_bolumu", dersId: string): Promise<OneriKarar[]> {
  return tx
    .select({ o: sema.oneri, k: sema.karar })
    .from(sema.oneri)
    .leftJoin(sema.karar, eq(sema.karar.oneriId, sema.oneri.id))
    .where(
      and(eq(sema.oneri.tur, tur), eq(sema.oneri.hedefTuru, "ders"), eq(sema.oneri.hedefId, dersId), disKanalDegil),
    )
    .orderBy(desc(sema.oneri.olusturma), desc(sema.oneri.id));
}

/** Kararla kesinleşmiş eşleme satırları; karar yoksa ya da ret ise null. */
function onayliSatirlar(r: OneriKarar): EslemeSatiri[] | null {
  const ic = EslemeIcerigi.safeParse(r.o.icerik);
  if (!ic.success || !r.k || r.k.sonuc === "reddedildi") return null;
  if (r.k.sonuc === "onaylandi") return ic.data.satirlar;
  const metin = (r.k.duzeltme as { metin?: unknown } | null)?.metin;
  try {
    return eslemeMetniOku(typeof metin === "string" ? metin : "", ic.data.araclar, ic.data.ckKodlari);
  } catch (e) {
    if (e instanceof EslemeMetniHatasi) return null;
    throw e;
  }
}

/**
 * Not dökümlerini aktarır ve eşleme önerisini açar. `takmaAdAnahtari` sunucudaki kurum anahtarıdır (en az 32
 * bayt); numara veritabanına, günlüğe ya da yanıta girmez.
 */
export async function dokumAktar(
  b: ServisBaglami,
  girdi: unknown,
  takmaAdAnahtari: string,
): Promise<z.infer<typeof DokumSonucu>> {
  const g = DokumGirdisi.parse(girdi);
  if (Buffer.byteLength(takmaAdAnahtari) < 32)
    throw new ServisHatasi("beklenmeyen", "Öğrenci takma ad anahtarı tanımlı değil. Sistem yöneticisine bildirin.");
  // Dosyalar işlem dışında okunur (uzun sürebilir); kişisel veri yalnız takma ada çevrilmiş olarak kalır.
  const okunan: { girdi: (typeof g.araclar)[number]; s: ReturnType<typeof notAktar> }[] = [];
  for (const a of g.araclar) {
    const veri = new Uint8Array(Buffer.from(a.icerikBase64, "base64"));
    const tablo = await tabloOku(veri, { ad: a.dosyaAdi });
    if (tablo.sayfalar.length === 0)
      throw new ServisHatasi(
        "gecersiz_istek",
        `${a.ad}: dosya okunamadı. ${tablo.uyarilar?.join(" ") ?? "Excel ya da CSV dosyası yükleyin."}`,
      );
    const s = notAktar(tablo, {
      takmaAd: (no) => takmaAdUret(takmaAdAnahtari, b.aktor.kurumId, no),
      aracAdi: a.ad,
      tur: a.tur,
      ...(a.tamPuanlar ? { tamPuanlar: a.tamPuanlar } : {}),
    });
    const hatalar = s.bulgular.filter((x) => x.duzey === "hata");
    if (hatalar.length)
      throw new ServisHatasi(
        "gecersiz_istek",
        `${a.ad}: dökümde düzeltilmesi gereken yerler var. ${hatalar
          .slice(0, 5)
          .map((h) => h.aciklama)
          .join(" ")}`,
      );
    const tamsiz = s.arac.sorular.filter((q) => q.tamPuan === null);
    if (tamsiz.length || s.arac.sorular.length === 0)
      throw new ServisHatasi(
        "gecersiz_istek",
        s.arac.sorular.length === 0
          ? `${a.ad}: dökümde soru sütunu bulunamadı. Başlık satırında S1, S2 … sütunları olmalı.`
          : `${a.ad}: ${tamsiz.map((q) => `S${q.no}`).join(", ")} için tam puan bulunamadı. Başlığa "(10)" gibi yazın ya da tam puanları girin.`,
      );
    okunan.push({ girdi: a, s });
  }
  return islem(b, async (tx, gerekli) => {
    const { a: acilis, d: ders } = await acilisYukle(tx, g.dersAcilisiId);
    await gerekli("olcme.veri_gir", { tur: "ders", id: ders.id });
    const var_ = await tx
      .select({ id: sema.olcmeAraci.id })
      .from(sema.olcmeAraci)
      .where(eq(sema.olcmeAraci.dersAcilisiId, acilis.id))
      .limit(1);
    if (var_.length)
      throw new ServisHatasi("cakisma", "Bu dönemin notları zaten aktarılmış. Düzeltme için yeni dönem kaydı açın.");
    const ckler = await dersCiktilari(tx, ders.id);
    if (ckler.length === 0)
      throw new ServisHatasi(
        "kural_ihlali",
        "Dersin öğrenme çıktıları kayıtlı değil. Önce ders bilgi paketini onaylayın.",
      );
    const araclar: { id: string; ad: string; soruSayisi: number }[] = [];
    const ogrenciler = new Set<string>();
    const uyarilar: string[] = [];
    for (const { girdi: a, s } of okunan) {
      const [arac] = await tx
        .insert(sema.olcmeAraci)
        .values({
          kurumId: b.aktor.kurumId,
          dersAcilisiId: acilis.id,
          tur: a.tur,
          ad: a.ad,
          agirlik: String(a.agirlik),
        })
        .returning({ id: sema.olcmeAraci.id });
      if (!arac) throw new Error("Araç eklenemedi.");
      const sorular = await tx
        .insert(sema.soru)
        .values(
          s.arac.sorular.map((q) => ({
            kurumId: b.aktor.kurumId,
            olcmeAraciId: arac.id,
            numara: q.no,
            tamPuan: String(q.tamPuan),
          })),
        )
        .returning({ id: sema.soru.id, numara: sema.soru.numara });
      const soruId = new Map(sorular.map((q) => [q.numara, q.id]));
      const puanlar = s.puanlar
        .filter((p) => soruId.has(p.soruNo))
        .map((p) => {
          ogrenciler.add(p.ogrenci);
          return {
            kurumId: b.aktor.kurumId,
            olcmeAraciId: arac.id,
            soruId: soruId.get(p.soruNo) as string,
            ogrenciTakmaAd: p.ogrenci,
            puan: p.puan === null ? null : String(p.puan),
          };
        });
      for (let i = 0; i < puanlar.length; i += 500)
        await tx.insert(sema.ogrenciPuani).values(puanlar.slice(i, i + 500));
      uyarilar.push(...s.bulgular.map((x) => `${a.ad}: ${x.aciklama}`));
      araclar.push({ id: arac.id, ad: a.ad, soruSayisi: sorular.length });
    }
    const eslemeAraclari: EslemeAraci[] = okunan.map(({ girdi: a, s }) => ({
      ad: a.ad,
      tur: a.tur,
      sorular: s.arac.sorular.map((q) => ({ no: q.no })),
    }));
    // Önceki dönem: aynı dersin başka açılışına ait, en yeni onaylı eşleme.
    let onceki: EslemeSatiri[] | undefined;
    for (const r of await oneriler(tx, "soru_cikti_eslemesi", ders.id)) {
      const ic = EslemeIcerigi.safeParse(r.o.icerik);
      if (!ic.success || ic.data.dersAcilisiId === acilis.id) continue;
      const s = onayliSatirlar(r);
      if (s) {
        onceki = s;
        break;
      }
    }
    const ckKodlari = ckler.map((c) => c.kod);
    const oneri = eslemeOnerisiKur({
      araclar: eslemeAraclari,
      ckKodlari,
      ...(onceki ? { onceki } : {}),
      ...(g.adaylar ? { adaylar: g.adaylar } : {}),
    });
    const yzKullanildi = oneri.satirlar.some((x) => x.kaynak === "yz");
    const [o] = await tx
      .insert(sema.oneri)
      .values({
        kurumId: b.aktor.kurumId,
        tur: "soru_cikti_eslemesi",
        hedefTuru: "ders",
        hedefId: ders.id,
        icerik: json({
          baslik: `Soru ve ders çıktısı eşlemesi: ${ders.kod}`,
          metin: eslemeMetni(oneri.satirlar),
          dersAcilisiId: acilis.id,
          araclar: eslemeAraclari,
          ckKodlari,
          satirlar: oneri.satirlar,
          eksikler: oneri.eksikler,
          reddedilenler: oneri.reddedilenler,
        }),
        gerekce: `${oneri.satirlar.length} soru; ${oneri.satirlar.filter((x) => x.kaynak === "onceki_donem").length} önceki dönemden, ${oneri.satirlar.filter((x) => x.kaynak === "yz").length} öneriden; ${oneri.eksikler.length} eşlenmedi.`,
        ureticiTuru: yzKullanildi ? "yz" : "kural",
        uretici: yzKullanildi
          ? (g.uretici ?? { gorev: "soru-cikti-eslemesi" })
          : { kural: "onceki-donem-tasima", surum: "1" },
        // Hocaya tek, orta riskli onay.
        risk: "orta",
      })
      .returning({ id: sema.oneri.id });
    if (!o) throw new Error("Öneri eklenemedi.");
    await gunluge(
      tx,
      b,
      "ders_dosyasi.dokum_aktarildi",
      { tur: "ders_acilisi", id: acilis.id },
      { dersAcilisi: acilis.id, arac: araclar.length, ogrenci: ogrenciler.size, oneri: o.id },
    );
    return { eslemeOneriId: o.id, araclar, ogrenciSayisi: ogrenciler.size, uyarilar, eksikler: oneri.eksikler };
  });
}

function matrisPuani(d: string): MatrisDegeri | null {
  if (d === "iliskisiz") return { tur: "iliskisiz" };
  if (d === "yetersiz_kanit") return { tur: "yetersiz_kanit" };
  const n = Number(d);
  return Number.isInteger(n) && n >= 1 && n <= 5 ? { tur: "puan", puan: n as 1 | 2 | 3 | 4 | 5 } : null;
}

async function olcmeVerisi(tx: Islem, acilisId: string, dersKodu: string, donem: string, satirlar: EslemeSatiri[]) {
  const araclar = await tx
    .select()
    .from(sema.olcmeAraci)
    .where(eq(sema.olcmeAraci.dersAcilisiId, acilisId))
    .orderBy(asc(sema.olcmeAraci.olusturma), asc(sema.olcmeAraci.id));
  const ids = araclar.map((a) => a.id);
  const sorular = ids.length ? await tx.select().from(sema.soru).where(inArray(sema.soru.olcmeAraciId, ids)) : [];
  const puanlar = ids.length
    ? await tx.select().from(sema.ogrenciPuani).where(inArray(sema.ogrenciPuani.olcmeAraciId, ids))
    : [];
  const soruNo = new Map(sorular.map((q) => [q.id, q.numara]));
  const veri: Omit<DersOlcmeVerisi, "ciktilar"> = {
    dersKodu,
    donem,
    araclar: araclar.map((a) => ({
      id: a.id,
      tur: a.tur,
      ad: a.ad ?? a.tur,
      agirlik: Number(a.agirlik),
      sorular: sorular
        .filter((q) => q.olcmeAraciId === a.id)
        .map((q) => ({
          no: q.numara,
          tamPuan: Number(q.tamPuan),
          eslemeler: (
            satirlar.find((s) => s.aracAdi === (a.ad ?? a.tur) && s.soruNo === q.numara)?.ckKodlari ?? []
          ).map((k) => ({ ciktiKod: k, agirlik: 1 })),
        })),
    })),
    puanlar: puanlar.map((p) => ({
      ogrenci: p.ogrenciTakmaAd,
      aracId: p.olcmeAraciId,
      soruNo: p.soruId ? (soruNo.get(p.soruId) ?? "*") : "*",
      puan: p.puan === null ? null : Number(p.puan),
    })),
  };
  return { veri, araclar, sorular };
}

async function matrisOku(tx: Islem, ciktilar: { id: string; kod: string }[]): Promise<CkPcMatrisi> {
  if (ciktilar.length === 0) return {};
  const katkilar = await tx
    .select({ k: sema.katki, pcKod: sema.cikti.kod })
    .from(sema.katki)
    .innerJoin(sema.cikti, eq(sema.cikti.id, sema.katki.programCiktiId))
    .where(
      inArray(
        sema.katki.dersCiktiId,
        ciktilar.map((c) => c.id),
      ),
    )
    .orderBy(asc(sema.katki.olusturma), asc(sema.katki.id));
  const kod = new Map(ciktilar.map((c) => [c.id, c.kod]));
  const m: CkPcMatrisi = {};
  for (const { k, pcKod } of katkilar) {
    const d = matrisPuani(k.deger);
    const ck = kod.get(k.dersCiktiId);
    if (!d || !ck) continue;
    m[ck] = { ...(m[ck] ?? {}), [pcKod]: d };
  }
  return m;
}

async function esikOku(tx: Islem, kurumId: string): Promise<number | undefined> {
  const [k] = await tx.select({ a: sema.kurum.ayarlar }).from(sema.kurum).where(eq(sema.kurum.id, kurumId));
  const e = (k?.a as { esikler?: { ckBasari?: unknown } } | undefined)?.esikler?.ckBasari;
  return typeof e === "number" && e >= 0 && e <= 100 ? e : undefined;
}

/**
 * Onaylı eşlemeden ölçmeyi yapar, sonucu, ders dosyası raporunu ve dosya onay önerisini yazar. Aynı eşleme için
 * ikinci kez çağrılırsa var olan kaydı döndürür.
 */
async function dosyaUret(
  tx: Islem,
  kurumId: string,
  acilisId: string,
  simdi: Date,
  aktor: { tur: "kisi" | "sistem"; id: string | null },
): Promise<{ raporId: string; olcmeSonucuId: string; dosyaOneriId: string }> {
  const { a: acilis, d: ders, donem } = await acilisYukle(tx, acilisId);
  const esleme = (await oneriler(tx, "soru_cikti_eslemesi", ders.id)).find(
    (r) => (r.o.icerik as { dersAcilisiId?: string }).dersAcilisiId === acilis.id,
  );
  if (!esleme) throw new ServisHatasi("kural_ihlali", "Önce bu dönemin not dökümünü yükleyin.");
  const satirlar = onayliSatirlar(esleme);
  if (!satirlar)
    throw new ServisHatasi(
      "kural_ihlali",
      esleme.k
        ? "Soru-çıktı eşlemesi reddedildi. Eşlemeyi düzelterek yeniden onaylatın."
        : "Soru-çıktı eşlemesi henüz onaylanmadı. Önce eşlemeyi onaylayın.",
    );
  const mevcut = (await oneriler(tx, "rapor_bolumu", ders.id))
    .map((r) => DosyaIcerigi.safeParse(r.o.icerik))
    .find((p) => p.success && p.data.eslemeOneriId === esleme.o.id);
  if (mevcut?.success) {
    const [o] = (await oneriler(tx, "rapor_bolumu", ders.id)).filter(
      (r) => (r.o.icerik as { raporId?: string }).raporId === mevcut.data.raporId,
    );
    return { raporId: mevcut.data.raporId, olcmeSonucuId: mevcut.data.olcmeSonucuId, dosyaOneriId: o?.o.id ?? "" };
  }
  const ckler = await dersCiktilari(tx, ders.id);
  const { veri } = await olcmeVerisi(tx, acilis.id, ders.kod, donem.ad, satirlar);
  const esik = await esikOku(tx, kurumId);
  const sonuc = dersiOlc(
    { ...veri, ciktilar: ckler.map((c) => ({ kod: c.kod, metin: c.metin })) },
    { matris: await matrisOku(tx, ckler), ...(esik !== undefined ? { esik } : {}) },
  );
  const ckId = new Map(ckler.map((c) => [c.kod, c.id]));
  const [os] = await tx
    .insert(sema.olcmeSonucu)
    .values({
      kurumId,
      dersAcilisiId: acilis.id,
      hesapSurumu: sonuc.hesapSurumu,
      girdiOzeti: sonuc.girdiOzeti,
      sonuc: json({
        ...sonuc,
        // Panelin ÇK sağlanma görünümü (0-1): ÇK ortalamasının 100'e oranı; ölçülmeyen ÇK yazılmaz.
        ciktilar: sonuc.ckBasarilari
          .filter((c) => c.ortalama !== null)
          .map((c) => ({ ciktiId: ckId.get(c.ckKod), kod: c.ckKod, saglanma: (c.ortalama as number) / 100 })),
      }),
    })
    .returning({ id: sema.olcmeSonucu.id });
  if (!os) throw new Error("Ölçme sonucu eklenemedi.");
  const [rapor] = await tx
    .insert(sema.rapor)
    .values({
      kurumId,
      tur: "ders_dosyasi",
      kapsam: json({ tur: "ders", id: ders.id, dersAcilisiId: acilis.id, olcmeSonucuId: os.id }),
      donemId: donem.id,
      baslik: `${ders.kod} ${ders.ad} ders dosyası (${donem.ad})`,
    })
    .returning({ id: sema.rapor.id });
  if (!rapor) throw new Error("Rapor eklenemedi.");
  const [o] = await tx
    .insert(sema.oneri)
    .values({
      kurumId,
      tur: "rapor_bolumu",
      hedefTuru: "ders",
      hedefId: ders.id,
      icerik: json({
        baslik: `Ders dosyasını onayla: ${ders.kod} (${donem.ad})`,
        metin: `Ders dosyası ve ölçme raporu hazır: ${sonuc.ogrenciSayisi} öğrenci, ${sonuc.ckBasarilari.length} ders çıktısı, ${sonuc.bulgular.length} bulgu. Belgeleri indirip inceleyin; onayınız dosyanın imza sayfasına adınız ve zamanla yazılır.`,
        dersAcilisiId: acilis.id,
        raporId: rapor.id,
        olcmeSonucuId: os.id,
        eslemeOneriId: esleme.o.id,
      }),
      gerekce: `Ölçme ${sonuc.hesapSurumu} ile yapıldı; girdi özeti ${sonuc.girdiOzeti.slice(0, 12)}.`,
      atiflar: [],
      ureticiTuru: "kural",
      uretici: { kural: "ders-dosyasi", surum: "1" },
      // Ders dosyası öğretim elemanının beyanıdır: toplu ya da politikayla onaylanamaz.
      risk: "yuksek",
    })
    .returning({ id: sema.oneri.id });
  if (!o) throw new Error("Öneri eklenemedi.");
  await gunlugeYaz(tx, {
    aktor,
    eylem: "ders_dosyasi.olusturuldu",
    hedef: { tur: "rapor", id: rapor.id },
    ayrinti: { dersAcilisi: acilis.id, olcmeSonucu: os.id, oneri: o.id, girdiOzeti: sonuc.girdiOzeti },
    zaman: simdi,
  });
  return { raporId: rapor.id, olcmeSonucuId: os.id, dosyaOneriId: o.id };
}

/** Hocanın elle başlattığı ölçme ve dosya üretimi. */
export async function olustur(b: ServisBaglami, dersAcilisiId: string): Promise<DersDosyasiDurumu> {
  const id = Kimlik.parse(dersAcilisiId);
  await islem(b, async (tx, gerekli) => {
    const { d } = await acilisYukle(tx, id);
    await gerekli("olcme.veri_gir", { tur: "ders", id: d.id });
    await dosyaUret(tx, b.aktor.kurumId, id, b.simdi(), { tur: "kisi", id: b.aktor.kisiId });
  });
  return durum(b, id);
}

/** İşçi turu: eşlemesi onaylanmış ama dosyası üretilmemiş açılışları sistem aktörüyle üretir. */
export async function bekleyenleriUret(db: Vt, kurumId: string, simdi: Date): Promise<string[]> {
  const acilislar = await kiraciIslemi(db, kurumId, async (tx) => {
    const eslemeler = await tx
      .select({ o: sema.oneri, k: sema.karar })
      .from(sema.oneri)
      .innerJoin(sema.karar, eq(sema.karar.oneriId, sema.oneri.id))
      .where(and(eq(sema.oneri.tur, "soru_cikti_eslemesi"), disKanalDegil));
    const dosyalar = await tx
      .select({ icerik: sema.oneri.icerik })
      .from(sema.oneri)
      .where(and(eq(sema.oneri.tur, "rapor_bolumu"), disKanalDegil));
    const uretilmis = new Set(dosyalar.map((d) => (d.icerik as { eslemeOneriId?: string }).eslemeOneriId));
    return eslemeler
      .filter((r) => !uretilmis.has(r.o.id) && onayliSatirlar(r) !== null)
      .map((r) => (r.o.icerik as { dersAcilisiId: string }).dersAcilisiId);
  });
  const uretilen: string[] = [];
  for (const a of [...new Set(acilislar)]) {
    await kiraciIslemi(db, kurumId, (tx) => dosyaUret(tx, kurumId, a, simdi, { tur: "sistem", id: null }));
    uretilen.push(a);
  }
  return uretilen;
}

async function etkilesimOku(tx: Islem, acilisId: string, oneriIdleri: string[]): Promise<EtkilesimOzeti> {
  const kosul = oneriIdleri.length
    ? sql`(${sema.gunluk.ayrinti} ->> 'dersAcilisi' = ${acilisId} or (${sema.gunluk.eylem} = 'karar.verildi' and ${sema.gunluk.ayrinti} ->> 'oneri' in (${sql.join(
        oneriIdleri.map((i) => sql`${i}`),
        sql`, `,
      )})))`
    : sql`${sema.gunluk.ayrinti} ->> 'dersAcilisi' = ${acilisId}`;
  const satir = await tx
    .select({
      eylem: sema.gunluk.eylem,
      aktorTuru: sema.gunluk.aktorTuru,
      zaman: sema.gunluk.zaman,
      ayrinti: sema.gunluk.ayrinti,
    })
    .from(sema.gunluk)
    .where(kosul);
  return etkilesimOzeti(satir.map((s) => ({ ...s, ayrinti: s.ayrinti as Record<string, unknown> })));
}

async function durumHesapla(tx: Islem, acilisId: string): Promise<DersDosyasiDurumu> {
  const { a, d, donem } = await acilisYukle(tx, acilisId);
  const esleme =
    (await oneriler(tx, "soru_cikti_eslemesi", d.id)).find(
      (r) => (r.o.icerik as { dersAcilisiId?: string }).dersAcilisiId === a.id,
    ) ?? null;
  const dosya =
    (await oneriler(tx, "rapor_bolumu", d.id)).find(
      (r) =>
        DosyaIcerigi.safeParse(r.o.icerik).success && (r.o.icerik as { dersAcilisiId?: string }).dersAcilisiId === a.id,
    ) ?? null;
  const di = dosya ? DosyaIcerigi.parse(dosya.o.icerik) : null;
  const asama: DersDosyasiDurumu["asama"] = !esleme
    ? "dokum_bekliyor"
    : !esleme.k
      ? "esleme_onayda"
      : !onayliSatirlar(esleme)
        ? "esleme_reddedildi"
        : !dosya
          ? "olcme_bekliyor"
          : !dosya.k
            ? "onay_bekliyor"
            : dosya.k.sonuc === "reddedildi"
              ? "reddedildi"
              : "onaylandi";
  const eksikler: string[] = [];
  const ei = esleme ? EslemeIcerigi.safeParse(esleme.o.icerik) : null;
  if (ei?.success) {
    const s = onayliSatirlar(esleme as OneriKarar) ?? ei.data.satirlar;
    for (const x of s) if (x.ckKodlari.length === 0) eksikler.push(`${x.aracAdi} · S${x.soruNo} eşlenmedi`);
  }
  const ids = [esleme?.o.id, dosya?.o.id].filter((x): x is string => !!x);
  return {
    dersAcilisiId: a.id,
    dersId: d.id,
    donem: donem.ad,
    asama,
    eslemeOneriId: esleme?.o.id ?? null,
    dosyaOneriId: dosya?.o.id ?? null,
    raporId: di?.raporId ?? null,
    olcmeSonucuId: di?.olcmeSonucuId ?? null,
    eksikler,
    etkilesim: await etkilesimOku(tx, a.id, ids),
  };
}

export async function durum(b: ServisBaglami, dersAcilisiId: string): Promise<DersDosyasiDurumu> {
  const id = Kimlik.parse(dersAcilisiId);
  return islem(b, async (tx, gerekli) => {
    const { d } = await acilisYukle(tx, id);
    await gerekli("olcme.oku", { tur: "ders", id: d.id });
    return durumHesapla(tx, id);
  });
}

/** Dersin bütün açılışlarının ders dosyası durumu (en yeni dönem önce). */
export async function dersinDosyalari(b: ServisBaglami, dersId: string): Promise<DersDosyasiDurumu[]> {
  const id = Kimlik.parse(dersId);
  return islem(b, async (tx, gerekli) => {
    await gerekli("olcme.oku", { tur: "ders", id });
    const acilislar = await tx
      .select({ id: sema.dersAcilisi.id })
      .from(sema.dersAcilisi)
      .innerJoin(sema.donem, eq(sema.donem.id, sema.dersAcilisi.donemId))
      .where(eq(sema.dersAcilisi.dersId, id))
      .orderBy(desc(sema.donem.baslangic));
    const sonuc: DersDosyasiDurumu[] = [];
    for (const a of acilislar) sonuc.push(await durumHesapla(tx, a.id));
    return sonuc;
  });
}

/** Panelin ders görünümündeki kontrol listesi (en yeni açılış). Yetkiyi çağıran denetler. */
export async function kontrolListesi(tx: Islem, dersId: string): Promise<{ ad: string; tamam: boolean }[]> {
  const [a] = await tx
    .select({ id: sema.dersAcilisi.id })
    .from(sema.dersAcilisi)
    .innerJoin(sema.donem, eq(sema.donem.id, sema.dersAcilisi.donemId))
    .where(eq(sema.dersAcilisi.dersId, dersId))
    .orderBy(desc(sema.donem.baslangic))
    .limit(1);
  if (!a) return [];
  const s = await durumHesapla(tx, a.id);
  const sira = ["dokum_bekliyor", "esleme_onayda", "olcme_bekliyor", "onay_bekliyor", "onaylandi"];
  const i = sira.indexOf(
    s.asama === "esleme_reddedildi" ? "esleme_onayda" : s.asama === "reddedildi" ? "onay_bekliyor" : s.asama,
  );
  return [
    { ad: `Not dökümü (${s.donem})`, tamam: i >= 1 },
    { ad: "Soru-çıktı eşlemesi onayı", tamam: i >= 2 },
    { ad: "Ölçme sonuçları", tamam: i >= 3 },
    { ad: "Ders dosyası onayı", tamam: i >= 4 },
  ];
}

async function onayOku(tx: Islem, r: OneriKarar | null): Promise<DosyaOnayi | null> {
  if (!r?.k || r.k.sonuc === "reddedildi") return null;
  const [k] = await tx.select({ ad: sema.kisi.adSoyad }).from(sema.kisi).where(eq(sema.kisi.id, r.k.kararVerenKisiId));
  return { onaylayan: k?.ad ?? r.k.kararVerenKisiId, zaman: r.k.zaman, sonuc: r.k.sonuc, dayanak: r.k.dayanak };
}

/** Belge girdisini kayıtlardan kurar (sayılar ölçme sonucundan). */
async function dosyaGirdisi(tx: Islem, kurumId: string, acilisId: string): Promise<DosyaGirdisi> {
  const durumu = await durumHesapla(tx, acilisId);
  if (!durumu.olcmeSonucuId)
    throw new ServisHatasi("kural_ihlali", "Ders dosyası henüz oluşmadı. Önce eşlemeyi onaylayın ve ölçmeyi başlatın.");
  const { a, d, donem } = await acilisYukle(tx, acilisId);
  const [os] = await tx.select().from(sema.olcmeSonucu).where(eq(sema.olcmeSonucu.id, durumu.olcmeSonucuId));
  if (!os) throw bulunamadi();
  const sonuc = os.sonuc as DersOlcmeSonucu;
  const eslemeler = await oneriler(tx, "soru_cikti_eslemesi", d.id);
  const esleme = eslemeler.find((r) => r.o.id === durumu.eslemeOneriId) ?? null;
  const dosya = (await oneriler(tx, "rapor_bolumu", d.id)).find((r) => r.o.id === durumu.dosyaOneriId) ?? null;
  const satirlar = esleme ? (onayliSatirlar(esleme) ?? []) : [];
  const { araclar, sorular } = await olcmeVerisi(tx, a.id, d.kod, donem.ad, satirlar);
  const ckler = await dersCiktilari(tx, d.id);
  const [kurum] = await tx.select({ ad: sema.kurum.ad }).from(sema.kurum).where(eq(sema.kurum.id, kurumId));
  const sorumlular = a.sorumluKisiIdleri.length
    ? await tx.select({ ad: sema.kisi.adSoyad }).from(sema.kisi).where(inArray(sema.kisi.id, a.sorumluKisiIdleri))
    : [];
  const kanitlar = (await tx.select().from(sema.kanit).orderBy(asc(sema.kanit.dosyaAdi))).filter((k) =>
    (Array.isArray(k.kapsamlar) ? k.kapsamlar : []).some(
      (x: { tur?: string; id?: string }) => x?.tur === "ders" && x.id === d.id,
    ),
  );
  return {
    kurumAdi: kurum?.ad ?? "",
    ders: { kod: d.kod, ad: d.ad, akts: d.akts },
    donem: donem.ad,
    sorumlular: sorumlular.map((s) => s.ad),
    ciktilar: ckler.map((c) => ({ kod: c.kod, metin: c.metin })),
    araclar: araclar.map((x) => ({
      id: x.id,
      ad: x.ad ?? x.tur,
      tur: x.tur,
      agirlik: Number(x.agirlik),
      sorular: sorular
        .filter((q) => q.olcmeAraciId === x.id)
        .map((q) => ({ no: q.numara, tamPuan: Number(q.tamPuan) })),
    })),
    esleme: satirlar,
    eslemeOnayi: await onayOku(tx, esleme),
    sonuc,
    olcmeSonucuId: os.id,
    kanitlar: kanitlar.map((k) => ({ dosyaAdi: k.dosyaAdi ?? "belge", ozet: k.ozet })),
    etkilesim: durumu.etkilesim,
    dosyaOnayi: await onayOku(tx, dosya),
  };
}

const MIME = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

/** Ders dosyası (DOCX) ya da ölçme raporu (XLSX). Onaysız belge "Taslak" üst bilgisi taşır. */
export async function belge(
  b: ServisBaglami,
  dersAcilisiId: string,
  bicim: unknown,
): Promise<z.infer<typeof DosyaCiktisi>> {
  const id = Kimlik.parse(dersAcilisiId);
  const tur = BelgeBicimi.parse(bicim);
  const g = await islem(b, async (tx, gerekli) => {
    const { d } = await acilisYukle(tx, id);
    await gerekli("rapor.oku", { tur: "ders", id: d.id });
    const g = await dosyaGirdisi(tx, b.aktor.kurumId, id);
    await gunluge(tx, b, "ders_dosyasi.indirildi", { tur: "ders_acilisi", id }, { bicim: tur });
    return g;
  });
  const veri = tur === "docx" ? await docxUret(dersDosyasiModeli(g)) : await xlsxUret(olcmeRaporuSayfalari(g));
  const ad = `${g.ders.kod}-${g.donem}`.replace(/[^\p{L}\p{N}-]+/gu, "-");
  return {
    dosyaAdi: `${ad}-${tur === "docx" ? "ders-dosyasi" : "olcme-raporu"}.${tur}`,
    mime: MIME[tur],
    ozet: ozetHesapla(veri),
    icerikBase64: Buffer.from(veri).toString("base64"),
  };
}
