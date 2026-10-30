// İlk çerçeveler. 2020 tabanlı YÖKAK ve KİDR taslağı ile MÜDEK, resmî dosyaya erişilemeden
// kuruldu (metinleri DOGRULANMADI); geçmiş raporlar için korunur. Resmî belgeden alınmış
// güncel YÖKAK sürümleri veri-resmi.ts içindedir. Ayrıntı: docs/cerceveler.md.

import { PROGRAM_CERCEVELERI } from "./program-tablolari/cerceveler.ts";
import { type Cerceve, cerceveSemasi, DOGRULANMADI, type KanitGereksinimi, type Olcut } from "./sema.ts";
import { YOKAK_KIDR_3_2_1, YOKAK_KURUMSAL_3_3 } from "./veri-resmi.ts";

const ERISIM = "2026-10-27";

// YÖKAK "Alt Ölçütler Rehberi" (kapakta 2020). Kodlar ve başlıklar belgenin web üzerinden
// okunan metninden alındı (dosya indirilemedi, SHA-256 yok); belgeyle karşılaştırılmadan
// resmî sayılmaz. Bu sürüm güncel olmayabilir.
const YOKAK_2020: readonly (readonly [string, string])[] = [
  ["A", "KALİTE GÜVENCESİ SİSTEMİ"],
  ["A.1", "Misyon ve Stratejik Amaçlar"],
  ["A.1.1", "Misyon, vizyon, stratejik amaç ve hedefler"],
  ["A.1.2", "Kalite güvencesi, eğitim öğretim, araştırma geliştirme, toplumsal katkı ve yönetim sistemi politikaları"],
  ["A.1.3", "Kurumsal performans yönetimi"],
  ["A.2", "İç Kalite Güvencesi"],
  ["A.2.1", "Kalite Komisyonu"],
  ["A.2.2", "İç kalite güvencesi mekanizmaları (PUKÖ çevrimleri, takvim, birimlerin sahiplenmesi)"],
  ["A.2.3", "Liderlik ve kalite güvencesi kültürü"],
  ["A.3", "Paydaş Katılımı"],
  [
    "A.3.1",
    "İç ve dış paydaşların kalite güvencesi, eğitim öğretim, araştırma geliştirme, yönetim ve uluslararasılaşma süreçlerine katılımı",
  ],
  ["A.4", "Uluslararasılaşma"],
  ["A.4.1", "Uluslararasılaşma politikası"],
  ["A.4.2", "Uluslararasılaşma süreçlerinin yönetimi ve organizasyonel yapısı"],
  ["A.4.3", "Uluslararasılaşma kaynakları"],
  ["A.4.4", "Uluslararasılaşma performansının izlenmesi ve iyileştirilmesi"],
  ["B", "EĞİTİM ve ÖĞRETİM"],
  ["B.1", "Programların Tasarımı ve Onayı"],
  ["B.1.1", "Programların tasarımı ve onayı"],
  ["B.1.2", `Program amaçları, çıktıları ve programın … (başlığın devamı okunamadı, ${DOGRULANMADI})`],
  ["B.1.3", "Ders kazanımlarının program çıktıları ile eşleştirilmesi"],
  ["B.1.4", "Programın yapısı ve ders dağılım dengesi"],
  ["B.1.5", "Öğrenci iş yüküne dayalı tasarım"],
  ["B.1.6", "Ölçme ve değerlendirme"],
  ["B.2", "Öğrenci Kabulü ve Gelişimi"],
  ["B.2.1", "Öğrenci kabulü ve önceki öğrenmenin tanınması ve kredilendirilmesi"],
  ["B.2.2", "Diploma, derece ve diğer yeterliliklerin tanınması ve sertifikalandırılması"],
  ["B.3", "Öğrenci Merkezli Öğrenme Öğretme ve Değerlendirme"],
  ["B.3.1", "Öğretim yöntem ve teknikleri"],
  ["B.3.2", "Ölçme ve değerlendirme"],
  ["B.3.3", "Öğrenci geri bildirimleri"],
  ["B.3.4", "Akademik danışmanlık"],
  ["B.4", "Öğretim Elemanları"],
  ["B.4.1", "Atama, yükseltme ve görevlendirme kriterleri"],
  ["B.4.2", "Öğretim yetkinliği"],
  ["B.4.3", "Eğitim faaliyetlerine yönelik teşvik ve ödüllendirme"],
  ["B.5", "Öğrenme Kaynakları"],
  ["B.5.1", "Öğrenme kaynakları"],
  ["B.5.2", "Sosyal, kültürel, sportif faaliyetler"],
  ["B.5.3", "Tesis ve altyapılar"],
  ["B.5.4", "Engelsiz üniversite"],
  ["B.5.5", "Rehberlik, psikolojik danışmanlık ve kariyer hizmetleri"],
  ["B.6", "Programların İzlenmesi ve Güncellenmesi"],
  ["B.6.1", "Program çıktılarının izlenmesi ve güncellenmesi"],
  ["B.6.2", "Mezun izleme sistemi"],
  ["C", "ARAŞTIRMA ve GELİŞTİRME"],
  ["C.1", "Araştırma Stratejisi"],
  ["C.1.1", "Kurumun araştırma politikası, hedefleri ve stratejisi"],
  ["C.1.2", "Araştırma-Geliştirme süreçlerinin yönetimi ve organizasyonel yapısı"],
  ["C.1.3", "Araştırmaların yerel/ bölgesel/ ulusal kalkınma hedefleriyle ilişkisi"],
  ["C.2", "Araştırma Kaynakları"],
  ["C.2.1", "Araştırma kaynakları: fiziki, teknik, mali"],
  ["C.2.2", "Üniversite içi kaynaklar (BAP)"],
  ["C.2.3", "Üniversite dışı kaynaklara yönelim"],
  ["C.2.4", "Doktora programları ve post-doc imkanları"],
  ["C.3", "Araştırma Yetkinliği"],
  ["C.3.1", "Öğretim elemanlarının araştırma yetkinliği ve araştırma yetkinliğinin geliştirilmesi"],
  ["C.3.2", "Ulusal ve uluslararası ortak programlar ve ortak araştırma birimleri"],
  ["C.4", "Araştırma Performansı"],
  ["C.4.1", "Öğretim elemanı performans değerlendirmesi"],
  ["C.4.2", "Araştırma performansının değerlendirilmesi ve sonuçlara dayalı iyileştirilmesi"],
  ["C.4.3", "Araştırma bütçe performansı"],
  ["D", "TOPLUMSAL KATKI"],
  ["D.1", "Toplumsal Katkı Stratejisi"],
  ["D.1.1", "Toplumsal katkı politikası, hedefleri ve stratejisi"],
  ["D.1.2", "Toplumsal Katkı Süreçlerinin Yönetimi ve Organizasyonel Yapısı"],
  ["D.2", "Toplumsal Katkı Kaynakları"],
  ["D.2.1", "Kaynaklar"],
  ["D.3", "Toplumsal Katkı Performansı"],
  ["D.3.1", "Toplumsal Katkı Performansının İzlenmesi ve İyileştirilmesi"],
  ["E", "YÖNETİM SİSTEMİ"],
  ["E.1", "Yönetim ve İdari Birimlerin Yapısı"],
  ["E.1.1", "Yönetim modeli ve idari yapı"],
  ["E.1.2", "Süreç yönetimi"],
  ["E.2", "Kaynakların Yönetimi"],
  ["E.2.1", "İnsan kaynakları yönetimi"],
  ["E.2.2", "Finansal kaynakların yönetimi"],
  ["E.3", "Bilgi Yönetim Sistemi"],
  ["E.3.1", "Entegre bilgi yönetim sistemi"],
  ["E.3.2", "Bilgi güvenliği ve güvenilirliği"],
  ["E.4", "Destek Hizmetleri"],
  ["E.4.1", "Hizmet ve malların uygunluğu, kalitesi ve sürekliliği"],
  ["E.5", "Kamuoyunu Bilgilendirme ve Hesap Verebilirlik"],
  ["E.5.1", "Kamuoyunu bilgilendirme"],
  ["E.5.2", "Hesap verme yöntemleri"],
];

/** Akredit'in kendi süreçlerinden üretilebilen kanıt gereksinimleri (iç öneri, resmî değil). */
const YOKAK_KANIT: Readonly<Record<string, KanitGereksinimi[]>> = {
  "B.1.3": [
    { tur: "matris", aciklama: "Ders öğrenme kazanımı ↔ program çıktısı matrisi", uretenSurec: "cekirdek/matris" },
  ],
  "B.1.5": [{ tur: "ders_bilgi_paketi", aciklama: "AKTS iş yükü hesapları", uretenSurec: "baglayicilar/bologna" }],
  "B.3.2": [{ tur: "istatistik", aciklama: "Ders not istatistikleri", uretenSurec: "olcme" }],
  "B.6.1": [{ tur: "istatistik", aciklama: "Program çıktısı sağlanma düzeyleri", uretenSurec: "olcme" }],
};

/** Düz (kod, başlık) listesinden ağaç kurar; üst kod, son noktadan önceki kısımdır. */
export function agacKur(
  satirlar: readonly (readonly [string, string])[],
  yap: (kod: string, baslik: string) => Omit<Olcut, "altOlcutler">,
): Olcut[] {
  const harita = new Map<string, Olcut>();
  const kok: Olcut[] = [];
  for (const [kod, baslik] of satirlar) {
    const o: Olcut = { ...yap(kod, baslik), altOlcutler: [] };
    harita.set(kod, o);
    const i = kod.lastIndexOf(".");
    const ust = i < 0 ? undefined : harita.get(kod.slice(0, i));
    if (i >= 0 && !ust) throw new Error(`${kod} için üst ölçüt yok.`);
    (ust ? ust.altOlcutler : kok).push(o);
  }
  return kok;
}

const dogrulanmamis = (kod: string, baslik: string): Omit<Olcut, "altOlcutler"> => ({
  kod,
  baslik,
  baslikDurumu: "dogrulanmadi",
  metin: DOGRULANMADI,
  metinDurumu: "dogrulanmadi",
  kaynakSayfa: null,
  kanitGereksinimleri: YOKAK_KANIT[kod] ?? [],
});

/** Olgunluk düzeyleri 1–5; resmî ad ve açıklamalar belgeden alınamadı. */
const dogrulanmamisRubrik = [1, 2, 3, 4, 5].map((duzey) => ({ duzey, ad: DOGRULANMADI, aciklama: DOGRULANMADI }));

export const YOKAK_KURUMSAL_2020: Cerceve = cerceveSemasi.parse({
  kod: "yokak-kurumsal",
  ad: "YÖKAK kurumsal değerlendirme ölçütleri (Alt Ölçütler Rehberi)",
  surum: "2020",
  resmi: true,
  kaynak: {
    adres: "https://www.yokak.gov.tr/documents/national-doc/Ek7AltOlcutlerRehberi.pdf",
    erisimTarihi: ERISIM,
    sha256: null,
    dosya: null,
    not: "Kodlar ve başlıklar belgenin web üzerinden okunan metninden alındı; dosya indirilemedi. Güncel sürüm denetlenmeli.",
  },
  yayimTarihi: null,
  dogrulandi: false,
  dogrulayan: null,
  dogrulamaZamani: null,
  olgunlukDuzeyleri: dogrulanmamisRubrik,
  olcutler: agacKur(YOKAK_2020, dogrulanmamis),
  raporSablonu: [],
});

/**
 * KİDR yapısı. Resmî KİDR kılavuzu indirilemedi; bölümler geçici olarak ölçüt ana
 * başlıklarına (A–E) bağlandı. Bölüm adları kılavuzdan alınana kadar DOGRULANMADI.
 */
export const YOKAK_KIDR_TASLAK: Cerceve = cerceveSemasi.parse({
  ...YOKAK_KURUMSAL_2020,
  kod: "yokak-kidr",
  ad: "YÖKAK Kurum İç Değerlendirme Raporu yapısı",
  surum: "taslak-2020",
  kaynak: {
    adres: "https://www.yokak.gov.tr",
    erisimTarihi: ERISIM,
    sha256: null,
    dosya: null,
    not: "KİDR hazırlama kılavuzunun resmî adresi bulunamadı; site engelli. Kılavuz indirilmeli.",
  },
  raporSablonu: ["A", "B", "C", "D", "E"].map((k) => ({
    kod: k,
    baslik: `${k} bölümü (${DOGRULANMADI})`,
    olcutKodlari: [k],
  })),
});

/** MÜDEK: resmî ölçüt belgesine erişilemedi; ağaç boş, hiçbir metin hafızadan yazılmadı. */
export const MUDEK_TASLAK: Cerceve = cerceveSemasi.parse({
  kod: "mudek",
  ad: "MÜDEK değerlendirme ölçütleri",
  surum: DOGRULANMADI,
  resmi: true,
  kaynak: {
    adres: "https://www.mudek.org.tr",
    erisimTarihi: ERISIM,
    sha256: null,
    dosya: null,
    not: "Site engelli; ölçüt belgesinin adresi bulunamadı. Güncel ölçüt belgesi indirilip içe aktarılmalı.",
  },
  yayimTarihi: null,
  dogrulandi: false,
  dogrulayan: null,
  dogrulamaZamani: null,
  olgunlukDuzeyleri: [],
  olcutler: [],
  raporSablonu: [],
});

const ic =
  (kanit: Record<string, KanitGereksinimi[]>, metin: Record<string, string>) => (kod: string, baslik: string) => ({
    kod,
    baslik,
    baslikDurumu: "ic" as const,
    metin: metin[kod] ?? baslik,
    metinDurumu: "ic" as const,
    kaynakSayfa: null,
    kanitGereksinimleri: kanit[kod] ?? [],
  });

const IC_RUBRIK = [
  { duzey: 1, ad: "Yok", aciklama: "Bu konuda tanımlı bir süreç ya da kanıt yok." },
  { duzey: 2, ad: "Planlandı", aciklama: "Süreç tanımlandı ama uygulandığına dair kanıt yok." },
  { duzey: 3, ad: "Uygulanıyor", aciklama: "Süreç uygulanıyor ve kanıtı var." },
  { duzey: 4, ad: "İzleniyor", aciklama: "Sonuçlar ölçülüyor ve gözden geçiriliyor." },
  { duzey: 5, ad: "İyileştiriliyor", aciklama: "İzleme sonuçlarına göre iyileştirme yapıldığı kanıtlı." },
];

/** Akredit iç öz değerlendirme çerçevesi (önlisans). Resmî değildir. */
export const AKREDIT_ONLISANS_IC: Cerceve = cerceveSemasi.parse({
  kod: "akredit-onlisans-ic",
  ad: "Önlisans programları için Akredit iç öz değerlendirme çerçevesi",
  surum: "0.1",
  resmi: false,
  kaynak: null,
  yayimTarihi: null,
  dogrulandi: false,
  dogrulayan: null,
  dogrulamaZamani: null,
  olgunlukDuzeyleri: IC_RUBRIK,
  olcutler: agacKur(
    [
      ["P", "Program"],
      ["P.1", "Program çıktıları tanımlı ve yayımlanmış"],
      ["P.2", "Dersler program çıktılarıyla eşleştirilmiş"],
      ["P.3", "Program çıktılarının sağlanma düzeyi ölçülüyor"],
      ["P.4", "Paydaş görüşü alınıyor ve programa yansıtılıyor"],
      ["P.5", "Mezunlar izleniyor"],
    ],
    ic(
      {
        "P.2": [{ tur: "matris", aciklama: "Ders–program çıktısı matrisi", uretenSurec: "cekirdek/matris" }],
        "P.3": [{ tur: "istatistik", aciklama: "PÇ sağlanma düzeyleri", uretenSurec: "olcme" }],
        "P.4": [{ tur: "tutanak", aciklama: "Danışma kurulu tutanakları", uretenSurec: null }],
      },
      {},
    ),
  ),
  raporSablonu: [{ kod: "1", baslik: "Program öz değerlendirmesi", olcutKodlari: ["P"] }],
});

/** Bologna/AKTS uyumu iç denetim çerçevesi. Resmî değildir. */
export const BOLOGNA_AKTS_IC: Cerceve = cerceveSemasi.parse({
  kod: "bologna-akts-ic",
  ad: "Bologna/AKTS uyumu (Akredit iç denetimi)",
  surum: "0.1",
  resmi: false,
  kaynak: null,
  yayimTarihi: null,
  dogrulandi: false,
  dogrulayan: null,
  dogrulamaZamani: null,
  olgunlukDuzeyleri: IC_RUBRIK,
  olcutler: agacKur(
    [
      ["BA", "Ders bilgi paketi"],
      ["BA.1", "Her dersin öğrenme kazanımları yazılı"],
      ["BA.2", "AKTS iş yükü hesabı ders kredisiyle tutarlı"],
      ["BA.3", "Değerlendirme yöntemleri kazanımlarla ilişkili"],
    ],
    ic(
      {
        "BA.2": [{ tur: "ders_bilgi_paketi", aciklama: "İş yükü tablosu", uretenSurec: "baglayicilar/bologna" }],
      },
      {},
    ),
  ),
  raporSablonu: [],
});

export const ILK_CERCEVELER: readonly Cerceve[] = [
  YOKAK_KURUMSAL_2020,
  YOKAK_KIDR_TASLAK,
  YOKAK_KURUMSAL_3_3,
  YOKAK_KIDR_3_2_1,
  MUDEK_TASLAK,
  AKREDIT_ONLISANS_IC,
  BOLOGNA_AKTS_IC,
  // Program akreditasyonu kuruluşları (İP-47): resmî belgeden, uzman doğrulaması bekliyor.
  ...PROGRAM_CERCEVELERI,
];
