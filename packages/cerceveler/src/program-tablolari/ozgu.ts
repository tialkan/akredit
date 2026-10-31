// Program akreditasyonunun çerçeveye ek resmî içerikleri (İP-47): MÜDEK EK-1 disipline özgü eğitim planı
// konuları, FEDEK programa özgü ölçütler, EPDAD 1.1 kılavuzunun göstergeleri ve dörtlü dereceli puanlama
// anahtarı. Metinler ozgu-ham.ts'ten gelir (belgeden çıkarıldı); burada her öğeye belge dosyası, SHA-256 ve
// sayfa eklenir. Özeti olmayan belgeye dayanan öğe yüklenmez (ilke 6).

import type { KaynakBelge } from "../sema.ts";
import { PROGRAM_BELGELERI } from "./kaynaklar.ts";
import {
  EPDAD_OGRETMEN_1_1_GOSTERGE_HAM,
  FEDEK_4_1_PROGRAMA_OZGU_HAM,
  type GostergeHam,
  MUDEK_EK1_NOT,
  MUDEK_LISANS_3_1_EK1_HAM,
  type OzguBolumHam,
} from "./ozgu-ham.ts";

/** Öğenin resmî kaynağı: belge dosyası, dosyanın SHA-256 özeti ve PDF'deki fiziksel sayfa. */
export interface OzguKaynak {
  dosya: string;
  sha256: string;
  sayfa: number;
}

export interface OzguKonu {
  metin: string;
  grup: string | null;
  kaynak: OzguKaynak;
}

export interface OzguBolum {
  /** Çerçeve kodu (`mudek-lisans`, `fedek-lisans`). */
  cerceve: string;
  /** Bölüm kodu, belgedeki başlıktan türetilmiş ASCII ad (ör. `bilgisayar-yazilim`). */
  kod: string;
  baslik: string;
  giris: string;
  kaynak: OzguKaynak;
  konular: readonly OzguKonu[];
}

export type DuzeyAdi = "ileri" | "oldukca" | "gelismeye" | "baslangic";

export interface Gosterge {
  cerceve: "epdad-ogretmen";
  /** Alt standart kodu (ör. `1.1.1`). */
  altStandart: string;
  no: number;
  metin: string;
  /** Dört düzeyin belgedeki tanımı; belgeden güvenle ayrılamadıysa null (EKSİK, uydurulmaz). */
  duzeyler: Readonly<Record<DuzeyAdi, string>> | null;
  kaynak: OzguKaynak;
}

function kaynak(b: KaynakBelge, sayfa: number): OzguKaynak {
  if (!b.dosya || !b.sha256) throw new Error(`Resmî belge özeti saklanmadan içerik yüklenemez: ${b.adres}`);
  return { dosya: b.dosya, sha256: b.sha256, sayfa };
}

export function ozguBolumleri(cerceve: string, b: KaynakBelge, ham: readonly OzguBolumHam[]): readonly OzguBolum[] {
  return ham.map((h) => ({
    cerceve,
    kod: h.kod,
    baslik: h.baslik,
    giris: h.giris,
    kaynak: kaynak(b, h.sayfa),
    konular: h.konular.map((k) => ({ metin: k.metin, grup: k.grup ?? null, kaynak: kaynak(b, k.sayfa) })),
  }));
}

const DUZEY_SIRASI: readonly DuzeyAdi[] = ["ileri", "oldukca", "gelismeye", "baslangic"];

export function gostergeler(b: KaynakBelge, ham: readonly GostergeHam[]): readonly Gosterge[] {
  return ham.map((h) => ({
    cerceve: "epdad-ogretmen",
    altStandart: h.altStandart,
    no: h.no,
    metin: h.metin,
    duzeyler: h.duzeyler
      ? (Object.fromEntries(DUZEY_SIRASI.map((d, i) => [d, h.duzeyler?.[i] ?? ""])) as Record<DuzeyAdi, string>)
      : null,
    kaynak: kaynak(b, h.sayfa),
  }));
}

/** MÜDEK lisans 3.1 EK-1: 26 disiplin kümesi (Ölçüt 5.1 bu konuları eğitim planında arar). */
export const MUDEK_EK1 = {
  not: { metin: MUDEK_EK1_NOT.metin, kaynak: kaynak(PROGRAM_BELGELERI.mudekLisans31, MUDEK_EK1_NOT.sayfa) },
  bolumler: ozguBolumleri("mudek-lisans", PROGRAM_BELGELERI.mudekLisans31, MUDEK_LISANS_3_1_EK1_HAM),
} as const;

/** FEDEK 4.1 II. bölüm: 27 programa özgü ölçüt. */
export const FEDEK_PROGRAMA_OZGU: readonly OzguBolum[] = ozguBolumleri(
  "fedek-lisans",
  PROGRAM_BELGELERI.fedek41,
  FEDEK_4_1_PROGRAMA_OZGU_HAM,
);

/** EPDAD öğretmen eğitimi 1.1 göstergeleri, alt standart ve numara sırasıyla. */
export const EPDAD_GOSTERGELERI: readonly Gosterge[] = gostergeler(
  PROGRAM_BELGELERI.epdadKilavuz11,
  EPDAD_OGRETMEN_1_1_GOSTERGE_HAM,
);

/**
 * EPDAD kılavuzunun önerdiği dörtlü dereceli puanlama anahtarı (kılavuz s. 7). Düzey adları belgedeki
 * yazımıyla; test her birini kaynak sayfada arar.
 */
export const EPDAD_DERECELENDIRME_ANAHTARI = {
  duzeyler: [
    { kod: "ileri", ad: "İleri Düzeyde" },
    { kod: "oldukca", ad: "Oldukça Gelişmiş" },
    { kod: "gelismeye", ad: "Gelişmeye Açık" },
    { kod: "baslangic", ad: "Başlangıç Düzeyinde" },
  ] as const satisfies readonly { kod: DuzeyAdi; ad: string }[],
  dayanak:
    "Alt Standartlar onlara ait göstergeler çerçevesinde dörtlü dereceli puanlama (‘İleri Düzeyde’; ‘Oldukça Gelişmiş’; ‘Gelişmeye Açık’; Başlangıç Düzeyinde) anahtarı ile değerlendirilmesi önerilmektedir.",
  kaynak: kaynak(PROGRAM_BELGELERI.epdadKilavuz11, 7),
} as const;

/** Bir alt standardın göstergeleri. */
export function altStandartGostergeleri(altStandart: string): readonly Gosterge[] {
  return EPDAD_GOSTERGELERI.filter((g) => g.altStandart === altStandart);
}

/** Çerçeve ve bölüm koduyla programa ya da disipline özgü bölüm; yoksa null. */
export function ozguBolum(cerceve: string, kod: string): OzguBolum | null {
  const liste = cerceve === "mudek-lisans" ? MUDEK_EK1.bolumler : cerceve === "fedek-lisans" ? FEDEK_PROGRAMA_OZGU : [];
  return liste.find((b) => b.kod === kod) ?? null;
}
