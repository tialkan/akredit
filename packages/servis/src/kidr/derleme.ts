// BİDR/KİDR derleme ve olgunluk önerisi (saf mantık, İP-20). IO yok; zaman ve kimlik dışarıdan gelir.
//
// İlkeler:
// - Bölüm metni yalnız kayıtlardan kurulur: onaylı kanıt–ölçüt bağı olan her kanıt bir atıflı paragraftır.
//   Bağı olmayan alt ölçüt `[EKSİK: …]` olarak kalır; faaliyet, sayı ya da sonuç yazılmaz (ilke 1, 2).
// - Sayılar (kanıtlı alt ölçüt, birim sayısı) yalnız burada deterministik sayılır.
// - Olgunluk düzeyi önerisi yüksek risklidir: hiçbir politika karara bağlayamaz, son söz komisyondadır (ilke 3).
//   Rubrik metni DOĞRULANMADI ise düzey önerilmez; yalnız kanıt dökümü ve eksikler komisyona sunulur.

import type { DocxBolumu, DocxModeli } from "@akredit/belge";
import { atifYaz } from "@akredit/cekirdek";
import { type Cerceve, DOGRULANMADI, type Olcut, type OlgunlukDuzeyi, tumOlcutler } from "@akredit/cerceveler";
import { z } from "zod";

export interface KanitKaydi {
  id: string;
  ozet: string;
  baslik: string;
  /** Kanıtın onaylı bağla bağlandığı ölçüt kodları. */
  olcutKodlari: string[];
  /** Kanıtın ait olduğu birim; kurum düzeyindeki kanıtta null. */
  birimId: string | null;
}

export interface BolumTaslagi {
  /** Alt ölçüt kodu (ör. "B.1.3"). */
  kod: string;
  baslik: string;
  /** Üst bölüm (rapor şablonu kodu, ör. "B"). */
  ustBolum: string;
  metin: string;
  kanitIdleri: string[];
  eksik: boolean;
}

/** Şablon bölümü → altındaki yaprak ölçütler (alt ölçütler), şablondaki sırayla. */
export function altOlcutler(cerceve: Cerceve): { ustBolum: string; olcut: Olcut }[] {
  const harita = new Map(tumOlcutler(cerceve.olcutler).map((o) => [o.kod, o]));
  const sonuc: { ustBolum: string; olcut: Olcut }[] = [];
  const gorulen = new Set<string>();
  for (const b of cerceve.raporSablonu)
    for (const k of b.olcutKodlari) {
      const kok = harita.get(k);
      if (!kok) continue;
      for (const o of tumOlcutler([kok]))
        if (o.altOlcutler.length === 0 && !gorulen.has(o.kod)) {
          gorulen.add(o.kod);
          sonuc.push({ ustBolum: b.kod, olcut: o });
        }
    }
  return sonuc;
}

/** Bir alt ölçüt için atıflı bölüm metni. Kanıt yoksa yalnız EKSİK işareti. */
export function bolumMetni(kanitlar: readonly KanitKaydi[], kapsamAdi: string): string {
  if (!kanitlar.length) return `[EKSİK: ${kapsamAdi} için bu alt ölçüte onaylı kanıt bağı yok.]`;
  return [...kanitlar]
    .sort((a, b) => a.baslik.localeCompare(b.baslik, "tr") || a.ozet.localeCompare(b.ozet))
    .map((k) => `Kayıtlı kanıt: ${k.baslik} ${atifYaz(k.ozet)}`)
    .join("\n\n");
}

/** BİDR bölümleri: yalnız birimin kanıtları. */
export function bidrBolumleri(
  cerceve: Cerceve,
  birim: { id: string; ad: string },
  kanitlar: readonly KanitKaydi[],
): BolumTaslagi[] {
  const kendi = kanitlar.filter((k) => k.birimId === birim.id);
  return altOlcutler(cerceve).map(({ ustBolum, olcut }) => {
    const ilgili = kendi.filter((k) => k.olcutKodlari.includes(olcut.kod));
    return {
      kod: olcut.kod,
      baslik: olcut.baslik,
      ustBolum,
      metin: bolumMetni(ilgili, birim.ad),
      kanitIdleri: ilgili.map((k) => k.id),
      eksik: ilgili.length === 0,
    };
  });
}

export interface BidrOzeti {
  raporId: string;
  birimId: string;
  birimAdi: string;
  bolumler: { kod: string; metin: string; kanitIdleri: string[] }[];
}

/**
 * KİDR bölümleri: kurum düzeyindeki kanıtlar ve her birimin BİDR bölüm metni birleşir. BİDR'si olmayan birim
 * EKSİK olarak yazılır. Birim metni olduğu gibi aktarılır (atıflar korunur), yeniden yazılmaz.
 */
export function kidrBolumleri(
  cerceve: Cerceve,
  kurumAdi: string,
  kurumKanitlari: readonly KanitKaydi[],
  birimler: readonly { id: string; ad: string }[],
  bidrler: readonly BidrOzeti[],
): BolumTaslagi[] {
  const kurumDuzeyi = kurumKanitlari.filter((k) => k.birimId === null);
  const sirali = [...birimler].sort((a, b) => a.ad.localeCompare(b.ad, "tr"));
  return altOlcutler(cerceve).map(({ ustBolum, olcut }) => {
    const ilgili = kurumDuzeyi.filter((k) => k.olcutKodlari.includes(olcut.kod));
    const parcalar: string[] = [];
    const idler = new Set(ilgili.map((k) => k.id));
    let kanitli = ilgili.length > 0;
    if (ilgili.length) parcalar.push(`Kurum düzeyi (${kurumAdi}):\n\n${bolumMetni(ilgili, kurumAdi)}`);
    for (const birim of sirali) {
      const r = bidrler.find((x) => x.birimId === birim.id);
      const bolum = r?.bolumler.find((x) => x.kod === olcut.kod);
      if (!r || !bolum) {
        parcalar.push(`${birim.ad}:\n\n[EKSİK: ${birim.ad} için birim iç değerlendirme raporu derlenmedi.]`);
        continue;
      }
      if (bolum.kanitIdleri.length) kanitli = true;
      for (const id of bolum.kanitIdleri) idler.add(id);
      parcalar.push(`${birim.ad}:\n\n${bolum.metin}`);
    }
    if (!parcalar.length) parcalar.push(bolumMetni([], kurumAdi));
    return {
      kod: olcut.kod,
      baslik: olcut.baslik,
      ustBolum,
      metin: parcalar.join("\n\n"),
      kanitIdleri: [...idler],
      eksik: !kanitli,
    };
  });
}

/** Deterministik kapsam sayıları (rapora yalnız bunlar yazılır). */
export function kapsamSayilari(bolumler: readonly BolumTaslagi[]) {
  const kanitli = bolumler.filter((b) => !b.eksik).length;
  return {
    altOlcutSayisi: bolumler.length,
    kanitliAltOlcut: kanitli,
    eksikAltOlcut: bolumler.length - kanitli,
    kanitSayisi: new Set(bolumler.flatMap((b) => b.kanitIdleri)).size,
  };
}

// ---------- Olgunluk düzeyi önerisi ----------

/** Model ya da kişi adayı: dışarıdan gelir, doğrulanır. */
export const OlgunlukAdayi = z
  .object({
    olcutKod: z.string().min(1).max(20),
    duzey: z.number().int().min(1).max(5),
    gerekce: z.string().trim().min(1).max(2_000),
    kanitIdleri: z.array(z.string().uuid()).min(1).max(50),
  })
  .strict();
export type OlgunlukAdayi = z.infer<typeof OlgunlukAdayi>;

export const OlgunlukIcerigi = z.object({
  baslik: z.string(),
  metin: z.string(),
  raporId: z.string(),
  olcutKod: z.string(),
  /** Önerilen düzey; rubrik doğrulanmadıysa ya da aday kanıtla desteklenmediyse null. */
  onerilenDuzey: z.number().int().min(1).max(5).nullable(),
  rubrik: z.array(z.object({ duzey: z.number(), ad: z.string(), aciklama: z.string() })),
  rubrikDogrulandi: z.boolean(),
  kanitIdleri: z.array(z.string()),
  eksikler: z.array(z.string()),
});
export type OlgunlukIcerigi = z.infer<typeof OlgunlukIcerigi>;

export function rubrikDogrulandiMi(rubrik: readonly OlgunlukDuzeyi[]): boolean {
  return rubrik.length > 0 && rubrik.every((d) => d.ad !== DOGRULANMADI && d.aciklama !== DOGRULANMADI);
}

/**
 * Bir alt ölçüt için olgunluk önerisi. Düzey yalnız şu üç koşulda önerilir: rubrik doğrulanmış, aday var ve
 * adayın gösterdiği kanıtların hepsi bu bölümün kanıtları. Aksi hâlde `onerilenDuzey` null ve neden EKSİK yazılır.
 */
export function olgunlukOnerisiKur(g: {
  raporId: string;
  bolum: Pick<BolumTaslagi, "kod" | "baslik" | "kanitIdleri">;
  rubrik: readonly OlgunlukDuzeyi[];
  aday?: OlgunlukAdayi | undefined;
}): { icerik: OlgunlukIcerigi; gerekce: string; atiflar: { kanitId: string }[] } {
  const eksikler: string[] = [];
  const dogrulandi = rubrikDogrulandiMi(g.rubrik);
  if (!dogrulandi) eksikler.push(`Olgunluk rubriğinin resmî metni ${DOGRULANMADI}; düzey komisyonca belirlenir.`);
  if (!g.bolum.kanitIdleri.length) eksikler.push("Bu alt ölçüte bağlı onaylı kanıt yok.");
  let duzey: number | null = null;
  let adayGerekce = "";
  if (g.aday) {
    const yabanci = g.aday.kanitIdleri.filter((k) => !g.bolum.kanitIdleri.includes(k));
    if (yabanci.length) eksikler.push("Aday düzeyin gösterdiği kanıtlar bu bölümün kanıtları değil; aday alınmadı.");
    else if (!g.rubrik.some((r) => r.duzey === g.aday?.duzey)) eksikler.push("Aday düzey rubrikte yok; aday alınmadı.");
    else if (dogrulandi) {
      duzey = g.aday.duzey;
      adayGerekce = g.aday.gerekce;
    }
  } else if (dogrulandi && g.bolum.kanitIdleri.length) eksikler.push("Düzey adayı yok; komisyon belirler.");
  const satirlar = [
    `${g.bolum.kod} ${g.bolum.baslik}`,
    duzey === null ? "Önerilen düzey: yok (komisyon kararı)." : `Önerilen düzey: ${duzey}.`,
    ...(adayGerekce ? [`Gerekçe: ${adayGerekce}`] : []),
    ...eksikler.map((e) => `[EKSİK: ${e}]`),
  ];
  const kanitIdleri = duzey !== null && g.aday ? g.aday.kanitIdleri : g.bolum.kanitIdleri;
  return {
    icerik: {
      baslik: `Olgunluk düzeyi: ${g.bolum.kod}`,
      metin: satirlar.join("\n"),
      raporId: g.raporId,
      olcutKod: g.bolum.kod,
      onerilenDuzey: duzey,
      rubrik: g.rubrik.map((r) => ({ ...r })),
      rubrikDogrulandi: dogrulandi,
      kanitIdleri: [...g.bolum.kanitIdleri],
      eksikler,
    },
    gerekce:
      duzey === null
        ? "Düzey önerilmedi; kanıt dökümü komisyonun kararına sunuldu."
        : `Rubrik ve kanıtla desteklenen aday düzey ${duzey}. Yüksek risk: yalnız komisyon karar verir.`,
    atiflar: kanitIdleri.map((kanitId) => ({ kanitId })),
  };
}

/**
 * Komisyon kararından kesin düzey. Onay → önerilen düzey; düzeltme → metindeki "Düzey: n"; ret ya da düzeyi
 * olmayan onay → null (düzey belirlenmedi).
 */
export function kararDuzeyi(
  icerik: Pick<OlgunlukIcerigi, "onerilenDuzey">,
  karar: { sonuc: "onaylandi" | "duzeltildi" | "reddedildi"; duzeltmeMetni?: string | null } | null,
): number | null {
  if (!karar || karar.sonuc === "reddedildi") return null;
  if (karar.sonuc === "onaylandi") return icerik.onerilenDuzey;
  const m = (karar.duzeltmeMetni ?? "").match(/d[üu]zey\s*:?\s*([1-5])\b/iu);
  return m ? Number(m[1]) : null;
}

// ---------- Gelişmeye açık yönler → eylem planı → izleme ----------

export const GelismeyeAcikYonGirdisi = z
  .object({
    /** Dış değerlendirme raporu kanıtı (kurumda kayıtlı). */
    kaynakKanitId: z.string().uuid("Geçersiz kimlik."),
    yonler: z
      .array(
        z
          .object({
            /** Rapordaki ifade, kişi tarafından kopyalanır; sistem yazmaz. */
            metin: z.string().trim().min(1, "Gelişmeye açık yönü yazın.").max(2_000),
            olcutKod: z.string().max(20).optional(),
            sorumluKisiId: z.string().uuid().optional(),
            hedefTarih: z
              .string()
              .regex(/^\d{4}-\d{2}-\d{2}$/u, "Tarih YYYY-AA-GG biçiminde olmalı.")
              .optional(),
          })
          .strict(),
      )
      .min(1, "En az bir gelişmeye açık yön ekleyin.")
      .max(100),
  })
  .strict();

export type IzlemeDurumu = "kanitsiz" | "kanitli" | "gecikti";

export function izlemeDurumu(
  e: { kanitIdleri: readonly string[]; hedefTarih: Date | null },
  simdi: Date,
): IzlemeDurumu {
  if (e.kanitIdleri.length) return "kanitli";
  if (e.hedefTarih && e.hedefTarih.getTime() < simdi.getTime()) return "gecikti";
  return "kanitsiz";
}

// ---------- Dışa aktarım ----------

export interface DisaAktarimGirdisi {
  baslik: string;
  kurumAdi: string;
  donem: string;
  cerceve: Pick<Cerceve, "ad" | "surum" | "dogrulandi" | "raporSablonu">;
  bolumler: readonly Pick<BolumTaslagi, "kod" | "baslik" | "ustBolum" | "metin" | "eksik">[];
  /** Komisyon kararıyla kesinleşmiş düzeyler (kod → düzey ya da null). */
  duzeyler: Readonly<Record<string, number | null>>;
  eylemler: readonly { tanim: string; durum: IzlemeDurumu; hedefTarih: string | null }[];
  onaylandi: boolean;
}

const IZLEME_ADI: Record<IzlemeDurumu, string> = { kanitli: "Kanıtlı", kanitsiz: "Kanıt bekliyor", gecikti: "Gecikti" };

/** KİDR/BİDR DOCX modeli. Biçim, çerçevenin rapor şablonundan gelir; şablon doğrulanmadıysa bu yazılır. */
export function raporDocxModeli(g: DisaAktarimGirdisi): DocxModeli {
  const s = kapsamSayilari(g.bolumler.map((b) => ({ ...b, kanitIdleri: [] })));
  const kanitli = g.bolumler.filter((b) => !b.eksik).length;
  const bolumler: DocxBolumu[] = [
    {
      baslik: "Rapor bilgileri",
      duzey: 1,
      icerik: [
        {
          tur: "tablo",
          basliklar: ["Alan", "Değer"],
          satirlar: [
            ["Kurum", g.kurumAdi],
            ["Dönem", g.donem || "EKSİK"],
            ["Çerçeve", `${g.cerceve.ad} (${g.cerceve.surum})`],
            ["Alt ölçüt", String(s.altOlcutSayisi)],
            ["Kanıtlı alt ölçüt", String(kanitli)],
          ],
        },
        ...(g.cerceve.dogrulandi
          ? []
          : [
              {
                tur: "paragraf" as const,
                metin: `Rapor yapısı ve ölçüt metinleri resmî belgeyle doğrulanmadı (${DOGRULANMADI}). Göndermeden önce güncel kılavuzla karşılaştırın.`,
                vurgu: "not" as const,
              },
            ]),
      ],
    },
  ];
  for (const sb of g.cerceve.raporSablonu) {
    bolumler.push({ baslik: sb.baslik, duzey: 1, icerik: [] });
    for (const b of g.bolumler.filter((x) => x.ustBolum === sb.kod)) {
      const d = g.duzeyler[b.kod];
      bolumler.push({
        baslik: `${b.kod} ${b.baslik}`,
        duzey: 2,
        icerik: [
          ...b.metin
            .split(/\n\s*\n/u)
            .filter((p) => p.trim())
            .map((p) => ({
              tur: "paragraf" as const,
              metin: p.trim(),
              ...(p.includes("[EKSİK") ? { vurgu: "eksik" as const } : {}),
            })),
          {
            tur: "paragraf",
            metin:
              d === undefined || d === null
                ? "Olgunluk düzeyi: komisyon kararı bekliyor."
                : `Olgunluk düzeyi (komisyon kararı): ${d}`,
            vurgu: "not",
          },
        ],
      });
    }
  }
  bolumler.push({
    baslik: "Gelişmeye açık yönler ve eylem planı",
    duzey: 1,
    icerik: g.eylemler.length
      ? [
          {
            tur: "tablo",
            basliklar: ["Eylem", "Hedef tarih", "İzleme"],
            satirlar: g.eylemler.map((e) => [e.tanim, e.hedefTarih ?? "EKSİK", IZLEME_ADI[e.durum]]),
          },
        ]
      : [{ tur: "paragraf", metin: "[EKSİK: Dış değerlendirmeden aktarılmış eylem yok.]", vurgu: "eksik" }],
  });
  return {
    baslik: g.baslik,
    altBaslik: g.donem || undefined,
    ustBilgi: `${g.kurumAdi}${g.onaylandi ? "" : " · Taslak — onaylanmadı"}`,
    altBilgi: "Akredit ile derlendi. Her olgusal cümle bir kanıta bağlıdır; bağlanamayan EKSİK yazılır.",
    bolumler,
  };
}

/** YÖKAK sistemine aktarım planı. Son adım her zaman insandır; sistem dış kuruma göndermez. */
export function aktarimPlani(g: {
  eksikAltOlcut: number;
  kararBekleyenDuzey: number;
  cerceveDogrulandi: boolean;
}): { adim: string; kim: "sistem" | "insan"; hazir: boolean }[] {
  return [
    { adim: "Bölüm metinlerini kanıtlardan derle", kim: "sistem", hazir: true },
    { adim: "Eksik alt ölçütleri tamamla", kim: "insan", hazir: g.eksikAltOlcut === 0 },
    { adim: "Olgunluk düzeylerini komisyonda karara bağla", kim: "insan", hazir: g.kararBekleyenDuzey === 0 },
    { adim: "Rapor yapısını güncel resmî kılavuzla karşılaştır", kim: "insan", hazir: g.cerceveDogrulandi },
    { adim: "Word dosyasını indir ve kurum sistemine yükle", kim: "sistem", hazir: true },
    { adim: "Raporu YÖKAK sistemine gönder (kurum adına beyan)", kim: "insan", hazir: false },
  ];
}
