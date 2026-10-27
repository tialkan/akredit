// Resmî YÖKAK belgelerinden kurulan güncel çerçeveler. Bütün metinler veri-yokak.ts içindeki,
// belgeden çıkarılmış satırlardan gelir; burada metin yazılmaz, yalnız yapı kurulur.
// Belgeler: kaynaklar/resmi/yokak/, özetler kaynaklar/resmi/kaynaklar.json içinde.
// Çerçeveler uzman onayı almadıkça `dogrulandi: false` kalır (onay insan kararıdır).

import { type Cerceve, cerceveSemasi, DOGRULANMADI, type KaynakBelge, type Olcut } from "./sema.ts";
import { YOKAK_ANAHTAR_3_3_HAM, YOKAK_OLCUTLER_3_1_HAM } from "./veri-yokak.ts";

const ERISIM = "2026-10-27";
const ADRES = (ad: string) => encodeURI(`https://www.yokak.gov.tr/documents/national-doc/${ad}`);

export const YOKAK_BELGELERI = {
  kilavuz33: {
    adres: ADRES("1_Gündem_Değerlendirme Programları Kılavuzu 3.3 (1) (1).pdf"),
    erisimTarihi: ERISIM,
    sha256: "cfa3de9bf3c2ed456502ef6a17378df7ecf8a4ddf78ceafb0773a4aefd8f0dfa",
    dosya: "yokak/yokak-degerlendirme-programlari-kilavuzu-3.3-2026-10-27.pdf",
    not: "YÖKAK Değerlendirme Programları Kılavuzu Sürüm 3.3 (2026). Ek-1 YÖKAK Dereceli Değerlendirme Anahtarı: alt ölçütler, olgunluk düzeyleri, örnek kanıtlar.",
  },
  olcutler31: {
    adres: ADRES("YOKAK_Degerlendirme_Olcutleri_3.1.pdf"),
    erisimTarihi: ERISIM,
    sha256: "cecefe54ded832d3739e8728bd06b0dc396ea9a6564b9b2cd9a150cf72bb303f",
    dosya: "yokak/yokak-degerlendirme-olcutleri-3.1-2026-10-27.pdf",
    not: "YÖKAK Değerlendirme Ölçütleri (Sürüm 3.1): ana başlıklar ve ölçütler.",
  },
  kidr321: {
    adres: ADRES("KIDR_Hazırlama_Kılavuzu_3.2.1_yeni.pdf"),
    erisimTarihi: ERISIM,
    sha256: "e6acbc1c4c7563c143f2f341b257793e0274247b523d7bc9ff7d24d3db9c410d",
    dosya: "yokak/yokak-kidr-hazirlama-kilavuzu-3.2.1-2026-10-27.pdf",
    not: "Kurum İç Değerlendirme Raporu Hazırlama Kılavuzu (Sürüm 3.2.1 - 24/01/2025). Ek-1 KİDR şablonu.",
  },
} as const satisfies Record<string, KaynakBelge>;

/** Ölçüt ağacı (A–D, A.1…, A.1.1…). `anaKaynak`: çerçevenin ana kaynağı olan belgenin dosyası. */
function yokakAgaci(anaKaynak: string): Olcut[] {
  const dosya = (d: string) => (d === anaKaynak ? {} : { kaynakDosya: d });
  const kok: Olcut[] = [];
  const harita = new Map<string, Olcut>();
  for (const u of YOKAK_OLCUTLER_3_1_HAM) {
    const o: Olcut = {
      kod: u.kod,
      baslik: u.baslik,
      baslikDurumu: "resmi",
      // Ana başlığın ayrı metni yoksa belgedeki metin başlığın kendisidir.
      metin: u.metin || u.baslik,
      metinDurumu: "resmi",
      kaynakSayfa: u.sayfa,
      ...dosya(YOKAK_BELGELERI.olcutler31.dosya),
      kanitGereksinimleri: [],
      altOlcutler: [],
    };
    harita.set(u.kod, o);
    const ust = u.kod.includes(".") ? harita.get(u.kod.slice(0, u.kod.lastIndexOf("."))) : undefined;
    if (u.kod.includes(".") && !ust) throw new Error(`${u.kod} için üst ölçüt yok.`);
    (ust ? ust.altOlcutler : kok).push(o);
  }
  for (const a of YOKAK_ANAHTAR_3_3_HAM) {
    const ust = harita.get(a.kod.slice(0, a.kod.lastIndexOf(".")));
    if (!ust) throw new Error(`${a.kod} için üst ölçüt yok.`);
    ust.altOlcutler.push({
      kod: a.kod,
      baslik: a.baslik,
      baslikDurumu: "resmi",
      metin: a.metin || DOGRULANMADI,
      metinDurumu: a.metin ? "resmi" : "dogrulanmadi",
      kaynakSayfa: a.sayfa,
      ...dosya(YOKAK_BELGELERI.kilavuz33.dosya),
      ...(a.duzeyler.length === 5 && a.metin
        ? { olgunlukTanimlari: a.duzeyler.map((metin, i) => ({ duzey: i + 1, metin })) }
        : {}),
      ...(a.ornekKanitlar.length && a.metin ? { ornekKanitlar: [...a.ornekKanitlar] } : {}),
      kanitGereksinimleri: [],
      altOlcutler: [],
    });
  }
  return kok;
}

/**
 * Kılavuz 3.3'te genel olgunluk düzeyleri (Şekil 1) görsel olarak verilmiştir, metni
 * çıkarılamadı. Her alt ölçütün kendi düzey metinleri `olgunlukTanimlari` içindedir.
 */
const GENEL_DUZEYLER = [1, 2, 3, 4, 5].map((duzey) => ({ duzey, ad: DOGRULANMADI, aciklama: DOGRULANMADI }));

export const YOKAK_KURUMSAL_3_3: Cerceve = cerceveSemasi.parse({
  kod: "yokak-kurumsal",
  ad: "YÖKAK Değerlendirme Ölçütleri ve Dereceli Değerlendirme Anahtarı",
  surum: "3.3",
  resmi: true,
  kaynak: YOKAK_BELGELERI.kilavuz33,
  ekKaynaklar: [YOKAK_BELGELERI.olcutler31],
  yayimTarihi: null,
  dogrulandi: false,
  dogrulayan: null,
  dogrulamaZamani: null,
  olgunlukDuzeyleri: GENEL_DUZEYLER,
  olcutler: yokakAgaci(YOKAK_BELGELERI.kilavuz33.dosya),
  raporSablonu: [],
});

/** KİDR Ek-1 şablonu: bölüm başlıkları ve sayfaları KİDR kılavuzu 3.2.1'den (8. sayfa). */
const KIDR_SABLON: readonly [string, string, string[]][] = [
  ["ozet", "Özet", []],
  ["kurum", "Kurum Hakkında Bilgiler", []],
  ["kurum.1", "İletişim Bilgileri", []],
  ["kurum.2", "Tarihsel Gelişimi", []],
  ["kurum.3", "Misyonu, Vizyonu, Değerleri ve Hedefleri", []],
  ["A", "LİDERLİK, YÖNETİŞİM VE KALİTE", ["A"]],
  ["B", "EĞİTİM VE ÖĞRETİM", ["B"]],
  ["C", "ARAŞTIRMA VE GELİŞTİRME", ["C"]],
  ["D", "TOPLUMSAL KATKI", ["D"]],
  ["sonuc", "Sonuç ve Değerlendirme", []],
];
export const KIDR_SABLON_SAYFASI = 8;

export const YOKAK_KIDR_3_2_1: Cerceve = cerceveSemasi.parse({
  kod: "yokak-kidr",
  ad: "YÖKAK Kurum İç Değerlendirme Raporu yapısı",
  surum: "3.2.1",
  resmi: true,
  kaynak: YOKAK_BELGELERI.kidr321,
  ekKaynaklar: [YOKAK_BELGELERI.kilavuz33, YOKAK_BELGELERI.olcutler31],
  yayimTarihi: "2025-01-24",
  dogrulandi: false,
  dogrulayan: null,
  dogrulamaZamani: null,
  olgunlukDuzeyleri: GENEL_DUZEYLER,
  olcutler: yokakAgaci(YOKAK_BELGELERI.kidr321.dosya),
  raporSablonu: KIDR_SABLON.map(([kod, baslik, olcutKodlari]) => ({
    kod,
    baslik,
    baslikDurumu: "resmi",
    kaynakSayfa: KIDR_SABLON_SAYFASI,
    olcutKodlari,
  })),
});
