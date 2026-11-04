// Bologna ders bilgi paketi araçları: denetim, alan rehberi, taslak denetimi, sayfa ayrıştırma, kopya metni.
//
// Tasarım: sunucu model çağırmaz, bu yüzden doldurma seçeneklerini (amaç metni, çıktı cümleleri, haftalık
// konular) üretemez. Seçenekleri hocanın asistanı üretir; sunucu kural, sınır ve kalıp verir, üretileni
// Akredit kurallarıyla denetler ve bütün sayıları (iş yükü, toplamlar) kendisi hesaplar (ilke 2).
// Kurallar @akredit/cekirdek taslak ve sayfa denetiminden gelir; resmî ölçüt değildir, öyle etiketlenir.
// Sunucu adres çekmez (SSRF yok): Bologna sayfası yapıştırılan HTML olarak gelir, ağsız ayrıştırılır.
// Kaynak ve yetkili alanları kişi adı içerir; bu araçlar onları taşımaz (ilke 7), hoca OBS'ye kendisi yazar.

import { dersSayfasiCoz, programCiktilari, tablolar } from "@akredit/baglayicilar/bologna-ayristir";
import {
  type BolognaDersSayfasi,
  type BolognaVerisi,
  type Bulgu,
  bolognaDenetle,
  type DenetlenecekTaslak,
  taslakDenetle,
} from "@akredit/cekirdek";
import { DOGRULANMADI as DOGRULANMADI_ISARETI } from "@akredit/cerceveler";
import { z } from "zod";
import { type AcikArac, AracHatasi, arac, KOD_KAYNAGI } from "./temel.ts";

// ---------------------------------------------------------------- Alan modeli

export const ALAN_KODLARI = [
  "amac",
  "icerik",
  "yontem",
  "notlar",
  "onKosul",
  "ciktilar",
  "degerlendirme",
  "isyuku",
  "dersYapisi",
  "haftalar",
  "katki",
  "ska",
  "kaynaklar",
  "yetkililer",
] as const;
export type AlanKodu = (typeof ALAN_KODLARI)[number];

interface AlanBilgisi {
  ad: string;
  /** OBS düzenleme ekranındaki sekme (Proliz). */
  sekme: string;
  kurallar: string[];
  sinir?: Record<string, number | string>;
  kaliplar: string[];
  yasaklar: string[];
  /** MCP bu alanı taşıyabilir mi (kişisel veri sınırı). */
  mcpTasir: boolean;
}

const DERS_BILGILERI = "Ders Bilgileri";
const ORTAK_YASAK = 'Alanı "-", ".", "Yok" ile geçiştirmeyin (ön koşul hariç). Türkçe karakterleri düşürmeyin.';

/** Akredit'in Bologna doldurma kuralları (packages/cekirdek/src/bologna/taslak.ts, apps/cli/skills/bologna-doldur). */
export const ALANLAR: Record<AlanKodu, AlanBilgisi> = {
  amac: {
    ad: "Dersin amacı",
    sekme: DERS_BILGILERI,
    kurallar: [
      "K1: Ders adıyla tutarlı olsun; başka dersten kopya olmasın.",
      "K2: 60-120 kelime. İngilizcesi tam çeviri olsun.",
    ],
    sinir: { enAzKelime: 60, enCokKelime: 120 },
    kaliplar: [
      "Bu dersin amacı, öğrencilere [alanın temel konuları] konusunda [kazanılacak yetkinlik] kazandırmaktır.",
      "Öğrenciler [yöntem] yoluyla [beceri] geliştirir. Dönem sonunda [somut iş] yapabilmeleri hedeflenir.",
    ],
    yasaklar: [ORTAK_YASAK],
    mcpTasir: true,
  },
  icerik: {
    ad: "Dersin içeriği",
    sekme: DERS_BILGILERI,
    kurallar: ["K2: 120-250 kelime. Haftalık akışla aynı konuları kapsasın.", "İngilizcesi tam çeviri olsun."],
    sinir: { enAzKelime: 120, enCokKelime: 250 },
    kaliplar: [
      "Ders, [giriş konusu] ile başlar. Ardından [ana konular] işlenir. [Uygulama ya da proje] ile tamamlanır.",
    ],
    yasaklar: [ORTAK_YASAK],
    mcpTasir: true,
  },
  yontem: {
    ad: "Yöntem ve teknikler",
    sekme: DERS_BILGILERI,
    kurallar: ["K2: 40-90 kelime.", "K11: Başka dersin yöntem metniyle birebir aynı olmasın."],
    sinir: { enAzKelime: 40, enCokKelime: 90 },
    kaliplar: ["Ders [anlatım, tartışma, uygulama, proje] ile yürütülür. [Haftalık etkinlik] konuyu pekiştirir."],
    yasaklar: [ORTAK_YASAK],
    mcpTasir: true,
  },
  notlar: {
    ad: "Ders notları",
    sekme: DERS_BILGILERI,
    kurallar: ["K3: Boş bırakılmaz.", "Hocanın gerçekten kullandığı notları yazın."],
    kaliplar: ["Haftalık ders sunumları; [uygulama föyleri]; [çevrim içi kaynak adı]."],
    yasaklar: [ORTAK_YASAK, "Var olmayan not ya da kaynak uydurmayın."],
    mcpTasir: true,
  },
  onKosul: {
    ad: "Ön koşul",
    sekme: DERS_BILGILERI,
    kurallar: ['Ön koşul yoksa "Yok" yazılabilir.'],
    kaliplar: ["Yok", "[Ders kodu] [Ders adı] dersini almış olmak."],
    yasaklar: [],
    mcpTasir: true,
  },
  ciktilar: {
    ad: "Öğrenme çıktıları",
    sekme: "Öğrenme Çıktıları",
    kurallar: [
      "K4: Her çıktı ölçülebilir bir eylem fiiliyle biter (açıklar, uygular, tasarlar). 'Bilgi sahibi olur', 'öğrenir', 'kavrar' olmaz.",
      "K5: 8-12 çıktı, Ö1'den kesintisiz. Her çıktının türü Bilgi, Beceri ya da Yetkinlik; çoğu Beceri, en az biri Yetkinlik.",
      "İngilizcesi tam çeviri olsun.",
    ],
    sinir: { enAzCikti: 8, enCokCikti: 12 },
    kaliplar: [
      "[Konu] kavramlarını örneklerle açıklar. (Bilgi)",
      "[Yöntem] kullanarak [problem türünü] çözer. (Beceri)",
      "[Ürün] tasarlar ve ekip içinde sunar. (Yetkinlik)",
    ],
    yasaklar: ["Ölçülemeyen fiil (bilir, anlar, öğrenir, farkındalık kazanır)."],
    mcpTasir: true,
  },
  degerlendirme: {
    ad: "Değerlendirme",
    sekme: DERS_BILGILERI,
    kurallar: [
      "Katkılar toplamı tam %100.",
      "Uygulamalı derste (U ya da L sıfırdan büyük) uygulama, proje, ödev ya da laboratuvar kalemi olur.",
    ],
    sinir: { toplamYuzde: 100 },
    kaliplar: ["Ara Sınav 1 %40, Yarıyıl Sonu Sınavı 1 %60", "Ara Sınav 1 %30, Proje 1 %20, Yarıyıl Sonu Sınavı 1 %50"],
    yasaklar: [],
    mcpTasir: true,
  },
  isyuku: {
    ad: "AKTS iş yükü",
    sekme: DERS_BILGILERI,
    kurallar: [
      "K8: Toplam iş yükü (sayı x süre toplamı) = AKTS x bölen (varsayılan 30), tam eşit.",
      "AKTS'yi değiştirmeyin, saat dağılımını değiştirin.",
      "Ders Süresi satırının haftalık süresi T+U+L toplamına eşit olur.",
      "Yayımlanmış sayfa denetiminde AKTS başına 25-30 saat kabul edilir; yeni taslakta tam eşitlik istenir.",
    ],
    sinir: { varsayilanBolen: 30, sayfaAraligi: "25-30 saat/AKTS" },
    kaliplar: [
      "Ders Süresi 14 x (T+U+L)",
      "Sınıf Dışı Ders Çalışma Süresi 14 x [saat]",
      "Ara Sınav Hazırlık 1 x [saat]",
      "Yarıyıl Sonu Sınavı Hazırlık 1 x [saat]",
    ],
    yasaklar: ["Toplamı kendiniz yazmayın; bologna_taslak_denetle hesaplar."],
    mcpTasir: true,
  },
  dersYapisi: {
    ad: "Ders yapısı (alan yüzdeleri)",
    sekme: DERS_BILGILERI,
    kurallar: ["K6: Yüzdeler toplamı tam %100 ve içerikle tutarlı."],
    sinir: { toplamYuzde: 100 },
    kaliplar: ["Alan Bilgisi %60, Temel Bilim %40"],
    yasaklar: [],
    mcpTasir: true,
  },
  haftalar: {
    ad: "Haftalık ders akışı",
    sekme: "Ders Akışı",
    kurallar: [
      "14-16 hafta. Her konu en az 8 kelime.",
      "K9: Her haftada ön hazırlık ve doküman dolu.",
      "Ara sınav haftası (çoğunlukla 8. hafta) ve son haftada yarıyıl sonu sınavı görünür.",
      "İngilizce konu dolu.",
    ],
    sinir: { enAzHafta: 14, enCokHafta: 16, enAzKelime: 8 },
    kaliplar: ["[Konu]: [alt başlık 1], [alt başlık 2] ve örnek uygulamalar"],
    yasaklar: [ORTAK_YASAK],
    mcpTasir: true,
  },
  katki: {
    ad: "Program çıktısına katkı",
    sekme: "Prg.Çıktısına Katkısı",
    kurallar: [
      "K12: Her Ö satırı dolu; değerler 1-5 ya da boş.",
      "Yalnız programın resmî P kodları kullanılır; P kodlarını Bologna sayfasından alın, ezberden yazmayın.",
      "Dolu hücrelerin çoğu 5 olmasın; ayrıştırın.",
      "'Tüm' satırına dokunmayın.",
    ],
    sinir: { enAz: 1, enCok: 5 },
    kaliplar: ["Ö1: P1=4, P3=2"],
    yasaklar: ["Matrisi şişirmeyin."],
    mcpTasir: true,
  },
  ska: {
    ad: "Sürdürülebilir Kalkınma Amaçları",
    sekme: "Sür. Kalkınma Amaçları",
    kurallar: ["K7: 1-17 arasından gerçekten ilgili 2-4 amaç."],
    sinir: { enAz: 2, enCok: 4 },
    kaliplar: ["4 (Nitelikli eğitim) ve dersle doğrudan ilgili 1-3 amaç"],
    yasaklar: [],
    mcpTasir: true,
  },
  kaynaklar: {
    ad: "Kaynaklar",
    sekme: "Diğer Kaynaklar",
    kurallar: ["En az 2 gerçek kaynak (yazar ve eser adı)."],
    sinir: { enAz: 2 },
    kaliplar: ["Yazar, Eser adı, Yayınevi, Yıl"],
    yasaklar: [
      "Emin olunmayan kitap, ISBN ya da yayınevi uydurulmaz; kaynağı hoca verir.",
      "Yazar adı kişisel veri süzgecine takıldığı için bu alan MCP'ye gönderilmez; yalnız kaynak sayısı denetlenir.",
    ],
    mcpTasir: false,
  },
  yetkililer: {
    ad: "Dersin yetkilileri",
    sekme: "Dersin Yetkilileri",
    kurallar: ["K10: Koordinatör ve dersi veren hocanın kendisidir; başka hocanın adı yazılmaz."],
    kaliplar: [],
    yasaklar: ["Ad ve e-posta kişisel veridir; MCP'ye gönderilmez. Hoca OBS'ye kendisi yazar."],
    mcpTasir: false,
  },
};

/** Bloom'un yenilenmiş sınıflaması düzeylerine göre örnek fiiller. Akredit örneğidir, resmî liste değildir. */
export const BLOOM_FIILLERI: { duzey: string; fiiller: string[] }[] = [
  { duzey: "Hatırlama", fiiller: ["tanımlar", "listeler", "sayar", "adlandırır"] },
  { duzey: "Anlama", fiiller: ["açıklar", "özetler", "sınıflandırır", "örneklendirir"] },
  { duzey: "Uygulama", fiiller: ["uygular", "hesaplar", "kullanır", "çözer"] },
  { duzey: "Çözümleme", fiiller: ["çözümler", "karşılaştırır", "ayırt eder", "ilişkilendirir"] },
  { duzey: "Değerlendirme", fiiller: ["değerlendirir", "eleştirir", "gerekçelendirir", "savunur"] },
  { duzey: "Yaratma", fiiller: ["tasarlar", "geliştirir", "oluşturur", "planlar"] },
];

const RESMI_DAYANAK = {
  durum: DOGRULANMADI_ISARETI,
  not: "Bu kurallar Akredit'in iç kurallarıdır, resmî ölçüt değildir. Kurumunuzun Bologna ya da AKTS yönergesi farklı sınır koyabilir; o yönerge önceliklidir.",
};

const SECENEK_KURALI =
  "Sunucu metin üretmez. Seçenekleri asistan üretir: 2-3 kısa, birbirinden gerçekten farklı seçenek (A, B, C), ilki önerilen. Her seçeneği bologna_taslak_denetle ile denetleyin, yalnız geçenleri gösterin. Hocanın vermediği bilgi (kitap, araç, proje adı) uydurulmaz.";

const KAYNAK_KURALLAR = KOD_KAYNAGI("packages/cekirdek/src/bologna/taslak.ts", "Akredit Bologna taslak kuralları");
const KAYNAK_SAYFA = KOD_KAYNAGI("packages/cekirdek/src/bologna/denetim.ts", "Akredit Bologna sayfa denetim kuralları");
const KAYNAK_AYRISTIRICI = KOD_KAYNAGI(
  "packages/baglayicilar/src/bologna-proliz/ayristir.ts",
  "Akredit Bologna (Proliz) sayfa ayrıştırıcısı",
);

const BOLOGNA_KISISEL_IPUCU =
  "Bologna sayfasında Dersi Verenler, Dersin Yardımcıları ve Dersin Yetkilileri satırlarını, kaynaklardaki yazar adlarını ve e-postaları çıkarıp yeniden gönderin.";

// ---------------------------------------------------------------- Ortak hesap ve eşleme

const TUL = z
  .string()
  .trim()
  .regex(/^\d{1,2}\+\d{1,2}\+\d{1,2}$/u, "T+U+L '2+1+0' biçiminde olmalı.");

const tulSaati = (tul: string | undefined): number | null => {
  if (!tul || !/^\d+\+\d+\+\d+$/u.test(tul.trim())) return null;
  return tul
    .split("+")
    .map(Number)
    .reduce((t, x) => t + x, 0);
};

const yuvarla = (x: number, b = 1) => Math.round(x * 10 ** b) / 10 ** b;

/** Bir taslak bulgusunun hangi alana ait olduğu. "genel" birden çok alana değen bulgudur. */
export function bulguAlani(b: Bulgu): AlanKodu | "temel" | "genel" {
  switch (b.kural) {
    case "Temel":
      return "temel";
    case "Değerlendirme":
      return "degerlendirme";
    case "K8":
      return "isyuku";
    case "K6":
      return "dersYapisi";
    case "K4":
    case "K5":
      return "ciktilar";
    case "Ders akışı":
    case "K9":
      return "haftalar";
    case "Kaynaklar":
      return "kaynaklar";
    case "K12":
      return "katki";
    case "K7":
      return "ska";
    case "K10":
      return "yetkililer";
    case "K2":
    case "K3": {
      const a = b.aciklama;
      if (/^Amaç/u.test(a)) return "amac";
      if (/^İçerik/u.test(a)) return "icerik";
      if (/^Yöntem/u.test(a)) return "yontem";
      if (/^Ders notları/u.test(a)) return "notlar";
      if (/^Ö\d+/u.test(a)) return "ciktilar";
      if (/^\d+\. hafta/u.test(a)) return "haftalar";
      return "genel";
    }
    default:
      return "genel";
  }
}

// ---------------------------------------------------------------- Taslak alanları şeması

const IkiDilli = z.object({
  tr: z.string().max(6000),
  en: z.string().max(6000).optional(),
});

const TaslakAlanlari = z.object({
  amac: IkiDilli.optional(),
  icerik: IkiDilli.optional(),
  yontem: IkiDilli.optional(),
  notlar: IkiDilli.optional(),
  onKosul: z.string().max(500).optional(),
  ciktilar: z
    .array(
      z.object({
        kod: z.string().trim().max(10).describe("Ö1, Ö2, ..."),
        tr: z.string().max(600),
        en: z.string().max(600).optional(),
        tur: z.enum(["Bilgi", "Beceri", "Yetkinlik"]),
      }),
    )
    .max(20)
    .optional(),
  degerlendirme: z
    .array(
      z.object({ ad: z.string().max(100), sayi: z.number().int().min(0).max(50), katki: z.number().min(0).max(100) }),
    )
    .max(20)
    .optional(),
  isyuku: z
    .array(z.object({ ad: z.string().max(100), sayi: z.number().min(0).max(100), sure: z.number().min(0).max(200) }))
    .max(20)
    .optional()
    .describe("Satır başına sayı ve süre; toplamı sunucu hesaplar"),
  dersYapisi: z
    .array(z.object({ alan: z.string().max(100), yuzde: z.number().min(0).max(100) }))
    .max(10)
    .optional(),
  haftalar: z
    .array(
      z.object({
        hafta: z.number().int().min(1).max(20),
        konu: IkiDilli,
        onHazirlik: z.string().max(500),
        dokuman: z.string().max(500),
      }),
    )
    .max(20)
    .optional(),
  katki: z
    .record(
      z.string().max(10),
      z.record(z.string().max(10), z.union([z.number().int().min(1).max(5), z.null(), z.literal("")])),
    )
    .optional()
    .describe("Ö kodu, P kodu, 1-5 ya da boş"),
  ska: z.array(z.number().int().min(1).max(17)).max(17).optional(),
  kaynakSayisi: z
    .number()
    .int()
    .min(0)
    .max(50)
    .optional()
    .describe("Hocanın verdiği gerçek kaynak sayısı (yazar ve eser adı olan). Adlar gönderilmez."),
});
type TaslakAlanlariT = z.infer<typeof TaslakAlanlari>;

const DersTemeli = z.object({
  kod: z.string().trim().max(30).optional(),
  ad: z.string().trim().max(200).optional(),
  akts: z.number().min(0).max(60).optional(),
  tul: TUL.optional().describe("Teori+Uygulama+Laboratuvar, ör. '2+1+0'"),
  bolen: z.number().int().min(20).max(40).default(30).describe("AKTS başına saat; varsayılan 30"),
});
type DersTemeliT = z.infer<typeof DersTemeli>;

const ikiDil = (m: { tr: string; en?: string | undefined } | undefined, ingilizce: boolean) =>
  m ? { tr: m.tr, en: m.en ?? (ingilizce ? "" : m.tr) } : undefined;

/** Taslak alanlarını cekirdek kurallarıyla denetler; yalnız verilen alanların bulgularını alan alan döndürür. */
export function alanBulgulari(
  ders: DersTemeliT,
  alanlar: TaslakAlanlariT,
  s: { ingilizce: boolean; programCiktilari?: string[] | undefined },
): Map<AlanKodu | "genel", Bulgu[]> {
  const t: DenetlenecekTaslak = {
    ...(ders.kod ? { kod: ders.kod } : {}),
    ...(ders.ad ? { ad: ders.ad } : {}),
    ...(ders.akts !== undefined ? { akts: ders.akts } : {}),
    ...(ders.tul ? { tul: ders.tul } : {}),
    bolen: ders.bolen,
    ...(alanlar.amac ? { amac: ikiDil(alanlar.amac, s.ingilizce) } : {}),
    ...(alanlar.icerik ? { icerik: ikiDil(alanlar.icerik, s.ingilizce) } : {}),
    ...(alanlar.yontem ? { yontem: ikiDil(alanlar.yontem, s.ingilizce) } : {}),
    ...(alanlar.notlar ? { notlar: ikiDil(alanlar.notlar, s.ingilizce) } : {}),
    ...(alanlar.ciktilar
      ? { ciktilar: alanlar.ciktilar.map((c) => ({ ...c, en: c.en ?? (s.ingilizce ? "" : c.tr) })) }
      : {}),
    ...(alanlar.degerlendirme ? { degerlendirme: alanlar.degerlendirme } : {}),
    ...(alanlar.isyuku ? { isyuku: alanlar.isyuku } : {}),
    ...(alanlar.dersYapisi ? { dersYapisi: alanlar.dersYapisi } : {}),
    ...(alanlar.haftalar
      ? {
          haftalar: alanlar.haftalar.map((h) => ({
            ...h,
            konu: { tr: h.konu.tr, en: h.konu.en ?? (s.ingilizce ? "" : h.konu.tr) },
          })),
        }
      : {}),
    ...(alanlar.katki ? { katki: alanlar.katki } : {}),
    ...(alanlar.ska ? { ska: alanlar.ska } : {}),
    ...(alanlar.kaynakSayisi !== undefined
      ? { kaynaklar: Array.from({ length: alanlar.kaynakSayisi }, () => ({ yazar: "var", eser: "var" })) }
      : {}),
    programCiktilari: s.programCiktilari ?? [],
  };
  const verilen = new Set<string>(
    Object.keys(alanlar).filter((k) => alanlar[k as keyof TaslakAlanlariT] !== undefined),
  );
  if (verilen.has("kaynakSayisi")) verilen.add("kaynaklar");
  const sonuc = new Map<AlanKodu | "genel", Bulgu[]>();
  const ekle = (a: AlanKodu | "genel", b: Bulgu) => sonuc.set(a, [...(sonuc.get(a) ?? []), b]);
  // İş yükü AKTS olmadan denetlenemez; cekirdek "akts boş" diye temel bulgu verir, burada alana bağlanır.
  if (verilen.has("isyuku") && ders.akts === undefined)
    ekle("isyuku", {
      duzey: "hata",
      kural: "K8",
      aciklama: "Dersin AKTS değeri verilmedi; iş yükü hedefi hesaplanamaz.",
    });
  for (const b of taslakDenetle(t, { bolen: ders.bolen }).bulgular) {
    const a = bulguAlani(b);
    if (a === "temel" || a === "yetkililer") continue;
    if (a === "isyuku" && ders.akts === undefined) continue;
    if (!s.ingilizce && /İngilizce/u.test(b.aciklama)) continue;
    if (a === "genel") {
      if (verilen.size) ekle("genel", b);
      continue;
    }
    if (!verilen.has(a)) continue;
    const temiz =
      b.kural === "K12"
        ? {
            ...b,
            aciklama: b.aciklama.replace(
              " Önce bologna-al ile oku.",
              " Bologna sayfasındaki P kodlarını programCiktilari olarak verin.",
            ),
          }
        : b;
    ekle(a, temiz);
  }
  return sonuc;
}

/** Bütün sayılar burada hesaplanır; asistan toplam yazmaz (ilke 2). */
export function bolognaHesabi(ders: DersTemeliT, alanlar: TaslakAlanlariT) {
  const saat = tulSaati(ders.tul);
  const hedef = ders.akts !== undefined ? ders.akts * ders.bolen : null;
  const isyuku = alanlar.isyuku
    ? (() => {
        const satirlar = alanlar.isyuku.map((x) => ({
          ad: x.ad,
          sayi: x.sayi,
          sure: x.sure,
          toplam: yuvarla(x.sayi * x.sure, 2),
        }));
        const toplam = yuvarla(
          satirlar.reduce((t, x) => t + x.toplam, 0),
          2,
        );
        const dersSuresi = alanlar.isyuku.find((x) => /ders süresi/iu.test(x.ad));
        return {
          satirlar,
          toplam,
          hedef,
          fark: hedef === null ? null : yuvarla(hedef - toplam, 2),
          aktsBasinaSaat: ders.akts ? yuvarla(toplam / ders.akts) : null,
          dersSuresiHaftalikBeklenen: saat,
          dersSuresiHaftalikVerilen: dersSuresi ? dersSuresi.sure : null,
          aciklama:
            hedef === null
              ? "AKTS verilmediği için hedef hesaplanmadı."
              : toplam === hedef
                ? `Toplam ${toplam} saat, hedef ${ders.akts} x ${ders.bolen} = ${hedef}. Uyumlu.`
                : `Toplam ${toplam} saat, hedef ${ders.akts} x ${ders.bolen} = ${hedef}. ${hedef > toplam ? `${yuvarla(hedef - toplam, 2)} saat ekleyin` : `${yuvarla(toplam - hedef, 2)} saat azaltın`}; AKTS'yi değiştirmeyin.`,
        };
      })()
    : null;
  const toplamYuzde = (xs: { v: number }[] | undefined) =>
    xs
      ? yuvarla(
          xs.reduce((t, x) => t + x.v, 0),
          2,
        )
      : null;
  return {
    isyuku,
    degerlendirmeToplami: toplamYuzde(alanlar.degerlendirme?.map((x) => ({ v: x.katki }))),
    dersYapisiToplami: toplamYuzde(alanlar.dersYapisi?.map((x) => ({ v: x.yuzde }))),
    ciktiSayisi: alanlar.ciktilar?.length ?? null,
    haftaSayisi: alanlar.haftalar?.length ?? null,
  };
}

// ---------------------------------------------------------------- bologna_denetle (genişletilmiş)

const sayiYaDaBos = z.number().nullable().default(null);
const BolognaDersGirdisi = z.object({
  kod: z.string().trim().min(1).max(30),
  ad: z.string().max(200).optional(),
  zorunlu: z.boolean().default(true),
  yariyil: z.number().int().min(1).max(16).nullable().default(null),
  tul: z.string().max(20).optional().describe("Teori+Uygulama+Laboratuvar, ör. '2+1+0'"),
  kredi: sayiYaDaBos,
  akts: sayiYaDaBos,
  guncelleme: z.string().max(20).optional().describe("Son güncelleme tarihi, GG.AA.YYYY"),
  amac: z.string().max(6000).optional().describe("Dersin amacı (Türkçe)"),
  icerik: z.string().max(6000).optional().describe("Dersin içeriği (Türkçe)"),
  yontem: z.string().max(6000).optional().describe("Yöntem ve teknikler (Türkçe)"),
  notlar: z.string().max(6000).optional().describe("Ders notları (Türkçe)"),
  kaynakSayisi: z.number().int().min(0).max(50).optional().describe("Sayfadaki kaynak sayısı; adlar gönderilmez"),
  ciktilar: z
    .array(z.object({ kod: z.string().max(20), metin: z.string().max(1000) }))
    .max(40)
    .default([]),
  degerlendirme: z
    .array(z.object({ ad: z.string().max(200), sayi: sayiYaDaBos, katki: sayiYaDaBos }))
    .max(40)
    .default([]),
  isyuku: z
    .array(z.object({ ad: z.string().max(200), sayi: sayiYaDaBos, sure: sayiYaDaBos, toplam: sayiYaDaBos }))
    .max(40)
    .default([]),
  dersYapisi: z
    .array(z.object({ alan: z.string().max(200), yuzde: sayiYaDaBos }))
    .max(20)
    .default([]),
  haftalar: z.number().int().min(0).max(30).default(0).describe("Haftalık konu satırı sayısı"),
  katki: z
    .record(z.string().max(20), z.record(z.string().max(20), z.string().max(5)))
    .default({})
    .describe("Ders çıktısı ya da 'Tüm' satırı, program çıktısı kodu, katkı değeri ('1'-'5', '' ya da '-')"),
});
type BolognaDersGirdisiT = z.infer<typeof BolognaDersGirdisi>;

type AlanDurumu = "bos" | "zayif" | "tamam" | "bilinmiyor";

interface AlanSatiri {
  no: number;
  alan: AlanKodu;
  ad: string;
  sekme: string;
  durum: AlanDurumu;
  nedenler: string[];
  kural: string;
}

/** Yayımlanmış sayfa verisinden alan alan durum çıkarır (boş, zayıf, tamam). */
function alanDurumlari(d: BolognaDersGirdisiT, sayfaBulgulari: Bulgu[]): AlanSatiri[] {
  const tr = (m: string | undefined) => (m?.trim() ? { tr: m } : undefined);
  const alanlar: TaslakAlanlariT = {
    ...(tr(d.amac) ? { amac: tr(d.amac) } : {}),
    ...(tr(d.icerik) ? { icerik: tr(d.icerik) } : {}),
    ...(tr(d.yontem) ? { yontem: tr(d.yontem) } : {}),
    ...(tr(d.notlar) ? { notlar: tr(d.notlar) } : {}),
    ...(d.ciktilar.length
      ? { ciktilar: d.ciktilar.map((c) => ({ kod: c.kod, tr: c.metin, tur: "Beceri" as const })) }
      : {}),
    ...(d.kaynakSayisi !== undefined ? { kaynakSayisi: d.kaynakSayisi } : {}),
  };
  const b = alanBulgulari({ akts: d.akts ?? undefined, bolen: 30 }, alanlar, { ingilizce: false });
  // Sayfada çıktı türü görünmez; türle ilgili kurallar burada denetlenmez.
  const turKurali = /Yetkinlik|Beceri|türü/u;
  const nedenler = (a: AlanKodu) =>
    (b.get(a) ?? []).filter((x) => x.duzey === "hata" && !turKurali.test(x.aciklama)).map((x) => x.aciklama);
  const sayfa = (re: RegExp) => sayfaBulgulari.filter((x) => re.test(x.kural)).map((x) => x.aciklama);
  const metinAlan = (a: AlanKodu, deger: string | undefined): [AlanDurumu, string[]] =>
    deger === undefined
      ? ["bilinmiyor", ["Bu alan gönderilmedi."]]
      : !deger.trim()
        ? ["bos", []]
        : nedenler(a).length
          ? ["zayif", nedenler(a)]
          : ["tamam", []];
  const liste: [AlanKodu, AlanDurumu, string[]][] = [
    ["amac", ...metinAlan("amac", d.amac)],
    ["icerik", ...metinAlan("icerik", d.icerik)],
    ["yontem", ...metinAlan("yontem", d.yontem)],
    ["notlar", ...metinAlan("notlar", d.notlar)],
    [
      "ciktilar",
      ...((): [AlanDurumu, string[]] => {
        if (!d.ciktilar.length) return ["bos", []];
        const n = [...nedenler("ciktilar"), ...sayfa(/^ders-ciktisi$/u)];
        return n.length ? ["zayif", n] : ["tamam", []];
      })(),
    ],
    [
      "degerlendirme",
      ...((): [AlanDurumu, string[]] => {
        if (!d.degerlendirme.length) return ["bos", []];
        const n = sayfa(/^degerlendirme$/u);
        return n.length ? ["zayif", n] : ["tamam", []];
      })(),
    ],
    [
      "isyuku",
      ...((): [AlanDurumu, string[]] => {
        if (!d.isyuku.length) return ["bos", []];
        const n = sayfa(/^akts-isyuku$/u);
        return n.length ? ["zayif", n] : ["tamam", []];
      })(),
    ],
    [
      "dersYapisi",
      ...((): [AlanDurumu, string[]] => {
        if (!d.dersYapisi.length) return ["bos", []];
        const n = sayfa(/^ders-yapisi$/u);
        return n.length ? ["zayif", n] : ["tamam", []];
      })(),
    ],
    [
      "haftalar",
      ...((): [AlanDurumu, string[]] => {
        if (!d.haftalar) return ["bos", []];
        if (d.haftalar < 14 || d.haftalar > 16) return ["zayif", [`${d.haftalar} hafta var, 14-16 olmalı.`]];
        return ["tamam", []];
      })(),
    ],
    [
      "katki",
      ...((): [AlanDurumu, string[]] => {
        const satirlar = Object.keys(d.katki).filter((k) => /^Ö\d+$/u.test(k));
        if (!satirlar.length) return ["bos", []];
        const bosSatir = satirlar.filter((k) => !Object.values(d.katki[k] ?? {}).some((v) => v && v !== "-"));
        const n = [
          ...(bosSatir.length ? [`${bosSatir.join(", ")} satırı tamamen boş.`] : []),
          ...sayfa(/^(katki-destegi|matris-tutarlilik)$/u),
        ];
        return n.length ? ["zayif", n] : ["tamam", []];
      })(),
    ],
    [
      "kaynaklar",
      ...((): [AlanDurumu, string[]] => {
        if (d.kaynakSayisi === undefined) return ["bilinmiyor", ["Kaynak sayısı gönderilmedi."]];
        if (d.kaynakSayisi === 0) return ["bos", []];
        return d.kaynakSayisi < 2 ? ["zayif", [`${d.kaynakSayisi} kaynak var, en az 2 olmalı.`]] : ["tamam", []];
      })(),
    ],
  ];
  return liste.map(([alan, durum, n], i) => ({
    no: i + 1,
    alan,
    ad: ALANLAR[alan].ad,
    sekme: ALANLAR[alan].sekme,
    durum,
    nedenler: n,
    kural: ALANLAR[alan].kurallar.join(" "),
  }));
}

export const bolognaDenetleAraci = arac({
  ad: "bologna_denetle",
  baslik: "Bologna ders paketini denetle",
  aciklama:
    "Bir dersin Bologna bilgi paketini denetler: hangi alan boş, hangisi zayıf, neden. AKTS ve iş yükü uyumu, değerlendirme toplamı, öğrenme çıktıları, haftalar ve katkı tablosu. Kurallar Akredit'in iç kurallarıdır, karar komisyonundur.",
  sonrakiAdim:
    "Doldurulacak alanları hocaya numaralı gösterin ve sorun: 1) hepsini sırayla dolduralım (önerilen) 2) yalnız boş olanlar 3) numaraları kendim seçeyim. Her alan için bologna_alan_rehberi'ni çağırın.",
  kisiselVeriIpucu: BOLOGNA_KISISEL_IPUCU,
  girdi: z.object({
    ders: BolognaDersGirdisi,
    programCiktilari: z
      .array(z.object({ kod: z.string().max(20), metin: z.string().max(1000) }))
      .max(40)
      .optional()
      .describe("Program çıktıları; verilirse program düzeyindeki kurallar da çalışır"),
    matrisSatiri: z
      .record(z.string().max(20), z.string().max(5))
      .optional()
      .describe("Program matrisinde bu dersin satırı: program çıktısı kodu ve değer"),
    aktsSaat: z
      .tuple([z.number().min(1), z.number().max(60)])
      .optional()
      .describe("AKTS başına saat aralığı; varsayılan [25, 30]"),
  }),
  calistir: ({ ders, programCiktilari, matrisSatiri, aktsSaat }, b) => {
    const { amac: _a, icerik: _i, yontem: _y, notlar: _n, kaynakSayisi: _k, ...sayfaAlanlari } = ders;
    const sayfa: BolognaDersSayfasi & { kod: string } = {
      ...sayfaAlanlari,
      ad: ders.ad ?? ders.kod,
      bilgiler: {},
    };
    const pkodlar = Object.keys(matrisSatiri ?? {});
    const veri: BolognaVerisi = {
      adres: "kullanici-girdisi",
      okundu: b.simdi().toISOString(),
      programCiktilari: programCiktilari ?? [],
      matris: {
        pkodlar,
        dersler: matrisSatiri
          ? [
              {
                kod: ders.kod,
                ad: ders.ad ?? ders.kod,
                zorunlu: ders.zorunlu,
                grup: null,
                yariyil: ders.yariyil,
                grupBasligi: false,
                degerler: matrisSatiri,
              },
            ]
          : [],
      },
      tyycIsaret: null,
      dersler: [{ ...sayfa, zorunlu: ders.zorunlu, bos: false, kaynak: "kullanici-girdisi" }],
    };
    let bulgular = bolognaDenetle(veri, { simdi: b.simdi().getTime(), ...(aktsSaat ? { aktsSaat } : {}) });
    // Program düzeyi kuralları yalnız program çıktıları verildiyse anlamlıdır.
    if (!programCiktilari) bulgular = bulgular.filter((x) => x.konu !== "-");
    const alanlar = alanDurumlari(ders, bulgular);
    const doldurulacak = alanlar.filter((a) => a.durum === "bos" || a.durum === "zayif");
    return {
      sonuc: {
        ders: ders.kod,
        hataSayisi: bulgular.filter((x) => x.duzey === "hata").length,
        uyariSayisi: bulgular.filter((x) => x.duzey === "uyari").length,
        ozet: doldurulacak.length
          ? `${doldurulacak.length} alan doldurulmalı ya da iyileştirilmeli: ${doldurulacak.map((a) => `${a.no}) ${a.ad}`).join(", ")}.`
          : "Gönderilen alanlarda boş ya da zayıf alan bulunmadı.",
        alanlar,
        doldurulacak: doldurulacak.map((a) => a.no),
        dokunulmayacak: ["Kaynaklar ve Dersin Yetkilileri kişi adı içerir; hoca OBS'de kendisi yazar."],
        bulgular,
        not: "Kurallar Akredit'in iç kurallarıdır, resmî ölçüt değildir. Düzeltme kararını ders sorumlusu ve komisyon verir.",
      },
      kaynak: [KAYNAK_SAYFA, KAYNAK_KURALLAR],
      ...(doldurulacak.length
        ? {}
        : { sonrakiAdim: "Hocaya sorun: 1) başka bir ders 2) OBS'ye kopya metni (bologna_kopya_metni) 3) bitir." }),
    };
  },
});

// ---------------------------------------------------------------- bologna_alan_rehberi

const alanRehberi = arac({
  ad: "bologna_alan_rehberi",
  baslik: "Bologna alanı nasıl doldurulur",
  aciklama:
    "Bir Bologna alanının (amaç, içerik, çıktılar, iş yükü, haftalar...) doldurma kurallarını, sınırlarını, örnek kalıplarını ve Bloom fiillerini verir. AKTS ve T+U+L verilirse iş yükü hedefini hesaplar. Metin üretmez.",
  sonrakiAdim:
    "Bu kurallara uyan 2-3 kısa seçenek (A, B, C) yazın, bologna_taslak_denetle ile denetleyin, geçenleri hocaya gösterin. Hoca harfle seçer; 'hepsi A' toplu onaydır.",
  girdi: z.object({
    alan: z.enum([...ALAN_KODLARI, "hepsi"]).describe("Alan kodu ya da 'hepsi'"),
    akts: z.number().min(0).max(60).optional(),
    tul: TUL.optional().describe("ör. '2+1+0'"),
    hafta: z.number().int().min(10).max(20).default(14).describe("Ders haftası sayısı; varsayılan 14"),
    bolen: z.number().int().min(20).max(40).default(30).describe("AKTS başına saat; varsayılan 30"),
  }),
  calistir: ({ alan, akts, tul, hafta, bolen }) => {
    const secilen = alan === "hepsi" ? [...ALAN_KODLARI] : [alan];
    const saat = tulSaati(tul);
    const hesap =
      secilen.includes("isyuku") && akts !== undefined
        ? (() => {
            const hedef = akts * bolen;
            const dersSuresi = saat === null ? null : hafta * saat;
            return {
              hedefSaat: hedef,
              formul: `${akts} AKTS x ${bolen} = ${hedef} saat`,
              dersSuresiSatiri: saat === null ? null : { sayi: hafta, sure: saat, toplam: dersSuresi },
              kalanSaat: dersSuresi === null ? null : hedef - dersSuresi,
              not:
                dersSuresi === null
                  ? "T+U+L verilmedi; ders süresi satırı hesaplanmadı."
                  : `Ders süresi ${hafta} x ${saat} = ${dersSuresi} saat. Kalan ${hedef - dersSuresi} saati sınıf dışı çalışma, ödev, proje ve sınav hazırlığına dağıtın.`,
            };
          })()
        : null;
    return {
      sonuc: {
        alanlar: secilen.map((a) => ({
          alan: a,
          ...ALANLAR[a],
          ...(a === "ciktilar" ? { bloomFiilleri: BLOOM_FIILLERI } : {}),
        })),
        ...(hesap ? { isyukuHesabi: hesap } : {}),
        secenekUretimi: SECENEK_KURALI,
        resmiDayanak: RESMI_DAYANAK,
      },
      kaynak: [
        KAYNAK_KURALLAR,
        KOD_KAYNAGI("apps/cli/skills/bologna-doldur/SKILL.md", "Akredit Bologna doldurma rehberi"),
      ],
      ...(secilen.every((a) => !ALANLAR[a].mcpTasir)
        ? { sonrakiAdim: "Bu alan kişi adı içerir; hocadan OBS'ye kendisinin yazmasını isteyin. Sonraki alana geçin." }
        : {}),
    };
  },
});

// ---------------------------------------------------------------- bologna_taslak_denetle

const taslakDenetleAraci = arac({
  ad: "bologna_taslak_denetle",
  baslik: "Bologna taslağını denetle",
  aciklama:
    "Asistanın yazdığı 1-3 seçeneği (A, B, C) Akredit kurallarıyla denetler. Puan vermez: her seçenek için geçer ya da eksik nedenlerini döndürür. İş yükü toplamını, AKTS başına saati ve yüzde toplamlarını kendisi hesaplar.",
  sonrakiAdim:
    "Geçen seçenekleri hocaya kısa gösterin (A, B, C; ilki önerilen). Geçmeyeni düzeltip yeniden denetleyin, hocaya göstermeyin. Seçim bitince bologna_kopya_metni ile OBS metnini verin.",
  kisiselVeriIpucu: BOLOGNA_KISISEL_IPUCU,
  girdi: z.object({
    ders: DersTemeli,
    secenekler: z
      .array(z.object({ etiket: z.string().trim().min(1).max(3).describe("A, B, C"), alanlar: TaslakAlanlari }))
      .min(1)
      .max(3),
    programCiktilari: z.array(z.string().max(10)).max(40).optional().describe("Programın P kodları: P1, P2, ..."),
    ingilizce: z.boolean().default(true).describe("İngilizce karşılıklar da denetlensin mi"),
  }),
  calistir: ({ ders, secenekler, programCiktilari, ingilizce }) => {
    const sonuclar = secenekler.map((s) => {
      const b = alanBulgulari(ders, s.alanlar, { ingilizce, programCiktilari });
      const hepsi = [...b.entries()].flatMap(([alan, xs]) => xs.map((x) => ({ alan, ...x })));
      const eksikler = hepsi
        .filter((x) => x.duzey === "hata")
        .map((x) => ({ alan: x.alan, kural: x.kural, neden: x.aciklama }));
      return {
        etiket: s.etiket,
        gecer: eksikler.length === 0,
        eksikler,
        uyarilar: hepsi
          .filter((x) => x.duzey !== "hata")
          .map((x) => ({ alan: x.alan, kural: x.kural, neden: x.aciklama })),
        hesap: bolognaHesabi(ders, s.alanlar),
      };
    });
    return {
      sonuc: {
        gecenler: sonuclar.filter((x) => x.gecer).map((x) => x.etiket),
        secenekler: sonuclar,
        not: "Geçer, Akredit kurallarına uyuyor demektir; içeriğin doğruluğuna ve derse uygunluğuna hoca karar verir.",
        resmiDayanak: RESMI_DAYANAK,
      },
      kaynak: [KAYNAK_KURALLAR],
      ...(sonuclar.some((x) => x.gecer)
        ? {}
        : {
            sonrakiAdim:
              "Hiçbir seçenek geçmedi. Eksik nedenlerine göre düzeltip yeniden denetleyin; hocaya henüz göstermeyin.",
          }),
    };
  },
});

// ---------------------------------------------------------------- bologna_ayristir

/** Bologna sayfasında kişi adı taşıyan satırlar: ilk hücre bu etiketlerden biriyse satır atılır. */
const KISI_SATIRI =
  /^(Dersi Veren(ler)?|Dersin Yardımcıları|Dersin Koordinatörü|Koordinatör|Dersin Yetkilileri|Yetkililer|Sorumlu|Kaynaklar|Instructors?|Assistants?|Coordinator|Course Coordinator|Resources)(\s|:|$)/iu;
const EPOSTA = /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.\p{L}{2,}/gu;
const TELEFON = /(\+90[\s-]?)?\(?0?\d{3}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}(?!\d)/gu;
const hucreMetni = (h: string) =>
  h
    .replace(/<[^>]*>/gu, " ")
    .replace(/&nbsp;/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();

/** Yapıştırılan HTML'den kişi satırlarını, e-posta ve telefonları bellekte atar; yalnız atılanların adlarını döndürür. */
export function bolognaKisiselAyikla(html: string): { html: string; atilan: string[] } {
  const atilan = new Set<string>();
  let h = html.replace(/<tr\b[\s\S]*?<\/tr>/giu, (tr) => {
    const ilk = tr.match(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/iu)?.[1];
    const etiket = ilk ? hucreMetni(ilk) : "";
    if (!KISI_SATIRI.test(etiket)) return tr;
    atilan.add(etiket.slice(0, 40));
    return "";
  });
  h = h.replace(EPOSTA, () => {
    atilan.add("e-posta adresleri");
    return "";
  });
  h = h.replace(TELEFON, () => {
    atilan.add("telefon numaraları");
    return "";
  });
  return { html: h, atilan: [...atilan] };
}

const ayristirAraci = arac({
  ad: "bologna_ayristir",
  baslik: "Bologna sayfasını ayrıştır",
  aciklama:
    "Yapıştırılan Bologna (Proliz) ders sayfası ya da program çıktıları sayfası HTML'ini çözer ve bologna_denetle girdisine çevirir. Adres çekmez; yalnız yapıştırılan metni okur.",
  sonrakiAdim: "Çıkan ders verisini bologna_denetle'ye verin (girdi hazır: bolognaDenetleGirdisi).",
  kisiselVeriIpucu:
    "Bilinen kişi satırları, e-posta ve telefon atıldıktan sonra da kişisel veri kaldı. O kısımları çıkarıp yeniden gönderin.",
  onAyikla: (g) => {
    const html = (g as { html?: unknown } | null)?.html;
    if (typeof html !== "string") return { girdi: g, atilan: [] };
    const r = bolognaKisiselAyikla(html);
    return { girdi: { ...(g as object), html: r.html }, atilan: r.atilan };
  },
  girdi: z.object({
    html: z
      .string()
      .min(20)
      .max(400_000)
      .describe("Sayfanın HTML kaynağı (tarayıcıda Sayfa Kaynağı ya da asistanın web aracı)"),
    tur: z.enum(["otomatik", "ders", "program_ciktilari"]).default("otomatik"),
  }),
  calistir: ({ html, tur }) => {
    if (!tablolar(html).length)
      throw new AracHatasi(
        "Sayfada tablo bulunamadı. Düz metin değil, sayfanın HTML kaynağını yapıştırın; ya da alanları bologna_denetle'ye doğrudan verin.",
      );
    const programMi =
      tur === "program_ciktilari" || (tur === "otomatik" && !/İş Yükü|Workload|Yarıyıl Çalışmaları/iu.test(html));
    if (programMi) {
      const pc = programCiktilari(html);
      if (!pc.length) throw new AracHatasi("Program çıktıları okunamadı. Sayfa biçimi tanınmadı.");
      return {
        sonuc: { tur: "program_ciktilari", programCiktilari: pc, pKodlari: pc.map((p) => p.kod) },
        kaynak: [KAYNAK_AYRISTIRICI],
        sonrakiAdim:
          "P kodlarını bologna_denetle (programCiktilari) ve bologna_taslak_denetle (programCiktilari) çağrılarında kullanın.",
      };
    }
    const d = dersSayfasiCoz(html);
    if (!d.kod && !d.ciktilar?.length && !d.isyuku?.length)
      throw new AracHatasi(
        "Ders sayfası biçimi tanınmadı. Proliz dışındaki OBS sayfalarında alanları bologna_denetle'ye doğrudan verin.",
      );
    const ders = {
      kod: d.kod ?? "DERS",
      ...(d.ad ? { ad: d.ad } : {}),
      yariyil: d.yariyil,
      ...(d.tul ? { tul: d.tul } : {}),
      kredi: d.kredi,
      akts: d.akts,
      ...(d.guncelleme ? { guncelleme: d.guncelleme } : {}),
      ciktilar: d.ciktilar ?? [],
      degerlendirme: d.degerlendirme ?? [],
      isyuku: d.isyuku ?? [],
      dersYapisi: d.dersYapisi ?? [],
      haftalar: d.haftalar ?? 0,
      katki: d.katki ?? {},
    };
    return {
      sonuc: {
        tur: "ders",
        bolognaDenetleGirdisi: { ders },
        okunamayan: [
          "Amaç, içerik, yöntem ve ders notları bu sayfa biçiminde çoğunlukla görünmez; hocaya sorun ya da OBS düzenleme ekranından yapıştırmasını isteyin.",
        ],
      },
      kaynak: [KAYNAK_AYRISTIRICI],
    };
  },
});

// ---------------------------------------------------------------- bologna_kopya_metni

const SEKME_SIRASI = [
  "Ders Bilgileri",
  "Öğrenme Çıktıları",
  "Ders Akışı",
  "Prg.Çıktısına Katkısı",
  "Sür. Kalkınma Amaçları",
];

const kopyaMetniAraci = arac({
  ad: "bologna_kopya_metni",
  baslik: "OBS'ye kopyalanacak metin",
  aciklama:
    "Hocanın seçtiği alanları OBS sekmesi ve alan adıyla sıralı, alan alan kopyalanacak düz metin olarak verir. Tablolar sekmeyle ayrılır. Toplamları kendisi hesaplar ve kalan eksikleri yazar. OBS'ye yazmaz; kaydı hoca yapar.",
  sonrakiAdim:
    "Metni olduğu gibi, kod bloğu içinde gösterin. Hocaya sorun: 1) OBS'ye yapıştırdım, yeniden denetle 2) bir alanı değiştir 3) bitir.",
  kisiselVeriIpucu: BOLOGNA_KISISEL_IPUCU,
  girdi: z.object({
    ders: DersTemeli,
    alanlar: TaslakAlanlari,
    programCiktilari: z.array(z.string().max(10)).max(40).optional(),
    ingilizce: z.boolean().default(true),
  }),
  calistir: ({ ders, alanlar, programCiktilari, ingilizce }) => {
    const bolumler: { sira: number; sekme: string; alan: string; deger: string }[] = [];
    const ekle = (sekme: string, alan: string, deger: string) =>
      bolumler.push({ sira: bolumler.length + 1, sekme, alan, deger });
    const hesap = bolognaHesabi(ders, alanlar);
    const iki = (ad: string, m: { tr: string; en?: string | undefined } | undefined) => {
      if (!m) return;
      ekle(DERS_BILGILERI, `${ad} (Türkçe)`, m.tr.trim());
      if (m.en?.trim()) ekle(DERS_BILGILERI, `${ad} (İngilizce)`, m.en.trim());
    };
    iki("Dersin Amacı", alanlar.amac);
    iki("Dersin İçeriği", alanlar.icerik);
    iki("Yöntem ve Teknikler", alanlar.yontem);
    iki("Ders Notları", alanlar.notlar);
    if (alanlar.onKosul !== undefined) ekle(DERS_BILGILERI, "Ön Koşul", alanlar.onKosul.trim());
    if (alanlar.degerlendirme)
      ekle(
        DERS_BILGILERI,
        "Değerlendirme (ad, sayı, katkı %)",
        [
          ...alanlar.degerlendirme.map((x) => `${x.ad}\t${x.sayi}\t${x.katki}`),
          `Toplam\t\t${hesap.degerlendirmeToplami}`,
        ].join("\n"),
      );
    if (hesap.isyuku)
      ekle(
        DERS_BILGILERI,
        "AKTS İş Yükü (ad, sayı, süre, toplam saat)",
        [
          ...hesap.isyuku.satirlar.map((x) => `${x.ad}\t${x.sayi}\t${x.sure}\t${x.toplam}`),
          `Toplam İş Yükü\t\t\t${hesap.isyuku.toplam}`,
          ...(hesap.isyuku.hedef !== null ? [`AKTS\t\t\t${ders.akts}`] : []),
        ].join("\n"),
      );
    if (alanlar.dersYapisi)
      ekle(DERS_BILGILERI, "Ders Yapısı (alan, %)", alanlar.dersYapisi.map((x) => `${x.alan}\t${x.yuzde}`).join("\n"));
    if (alanlar.ciktilar)
      ekle(
        "Öğrenme Çıktıları",
        "Öğrenme çıktıları (kod, tür, Türkçe, İngilizce)",
        alanlar.ciktilar.map((c) => `${c.kod}\t${c.tur}\t${c.tr.trim()}\t${c.en?.trim() ?? ""}`).join("\n"),
      );
    if (alanlar.haftalar)
      ekle(
        "Ders Akışı",
        "Haftalar (hafta, konu, İngilizce konu, ön hazırlık, dokümanlar)",
        alanlar.haftalar
          .map(
            (h) =>
              `${h.hafta}\t${h.konu.tr.trim()}\t${h.konu.en?.trim() ?? ""}\t${h.onHazirlik.trim()}\t${h.dokuman.trim()}`,
          )
          .join("\n"),
      );
    if (alanlar.katki) {
      const p = programCiktilari?.length
        ? programCiktilari
        : [...new Set(Object.values(alanlar.katki).flatMap((s) => Object.keys(s)))];
      ekle(
        "Prg.Çıktısına Katkısı",
        "Katkı tablosu ('Tüm' satırına dokunmayın)",
        [
          `\t${p.join("\t")}`,
          ...Object.entries(alanlar.katki).map(([o, s]) => `${o}\t${p.map((k) => s[k] ?? "").join("\t")}`),
        ].join("\n"),
      );
    }
    if (alanlar.ska) ekle("Sür. Kalkınma Amaçları", "Seçilecek amaç numaraları", alanlar.ska.join(", "));
    if (!bolumler.length) throw new AracHatasi("Kopyalanacak alan yok. En az bir alan gönderin.");
    const b = alanBulgulari(ders, alanlar, { ingilizce, programCiktilari });
    const kalanEksikler = [...b.entries()].flatMap(([alan, xs]) =>
      xs.filter((x) => x.duzey === "hata").map((x) => ({ alan, neden: x.aciklama })),
    );
    const baslik = [ders.kod, ders.ad].filter(Boolean).join(" ") || "Ders";
    const sirali = [...bolumler].sort(
      (x, y) => SEKME_SIRASI.indexOf(x.sekme) - SEKME_SIRASI.indexOf(y.sekme) || x.sira - y.sira,
    );
    const metin = [
      `${baslik}: OBS'ye kopyalanacak alanlar`,
      "",
      ...sirali.flatMap((x, i) => [`${i + 1}. ${x.sekme} > ${x.alan}`, x.deger, ""]),
      "Kaynaklar ve Dersin Yetkilileri bu metinde yoktur; OBS'de kendiniz yazın.",
      ...(kalanEksikler.length
        ? [
            "",
            "Kalan eksikler:",
            ...kalanEksikler.map((e) => `- ${ALANLAR[e.alan as AlanKodu]?.ad ?? "Genel"}: ${e.neden}`),
          ]
        : []),
    ].join("\n");
    return {
      sonuc: {
        metin,
        bolumler: sirali.map((x, i) => ({ ...x, sira: i + 1 })),
        hesap,
        kalanEksikler,
        not: "Alan adları OBS sürümüne göre küçük farklar gösterebilir. Kaydı ve son kontrolü hoca yapar.",
      },
      kaynak: [KAYNAK_KURALLAR],
      ...(kalanEksikler.length
        ? {
            sonrakiAdim:
              "Kalan eksikleri hocaya numaralı gösterin ve sorun: 1) eksikleri dolduralım 2) böyle kalsın, metni kopyalayacağım.",
          }
        : {}),
    };
  },
});

export const BOLOGNA_ARACLARI: readonly AcikArac[] = [
  ayristirAraci,
  alanRehberi,
  taslakDenetleAraci,
  kopyaMetniAraci,
] as unknown as readonly AcikArac[];
