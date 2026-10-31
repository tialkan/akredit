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

// ---------------------------------------------------------------------------------------------------------
// Ölçüt ağacına bağlama

/**
 * Programa ya da disipline özgü içeriğin bağlandığı ölçüt. Bağ belgeden gelir: MÜDEK 3.1 Ölçüt 5.1 eğitim
 * planının "EK-1'de verilen disipline özgü konuları" içermesini ister; FEDEK 4.1 Ölçüt 10.1 "Programa özgü
 * ölçütlerin sağlandığı kanıtlanmış" olmasını ister. Hangi bölümün geçerli olduğunu kurum seçer; Akredit
 * program adından tahmin etmez.
 */
export interface OzguBagi {
  cerceve: "mudek-lisans" | "fedek-lisans";
  olcutKod: string;
  /** Panelde ve raporda kullanılan ad. */
  ad: string;
  /** Bir bölüm için kullanılan sözcük. */
  bolumAdi: "disiplin" | "program";
}

export const OZGU_BAGLARI: readonly OzguBagi[] = [
  { cerceve: "mudek-lisans", olcutKod: "5.1", ad: "Disipline özgü eğitim planı konuları (EK-1)", bolumAdi: "disiplin" },
  { cerceve: "fedek-lisans", olcutKod: "10.1", ad: "Programa özgü ölçütler", bolumAdi: "program" },
];

/** Çerçevenin özgü içerik bağı; yoksa null (seçim gerekmez). */
export function ozguBagi(cerceve: string): OzguBagi | null {
  return OZGU_BAGLARI.find((b) => b.cerceve === cerceve) ?? null;
}

/** Çerçevenin seçilebilir bölümleri (MÜDEK EK-1 disiplinleri ya da FEDEK programları). */
export function ozguBolumListesi(cerceve: string): readonly OzguBolum[] {
  return cerceve === "mudek-lisans" ? MUDEK_EK1.bolumler : cerceve === "fedek-lisans" ? FEDEK_PROGRAMA_OZGU : [];
}

/** Göstergeleri olan çerçeve (EPDAD öğretmen eğitimi 1.1). */
export const GOSTERGELI_CERCEVE = "epdad-ogretmen";

/** Kaynak belgenin okunur adı (kaynak listesindeki not); bulunamazsa dosya adı. */
export function belgeAdi(dosya: string): string {
  return Object.values(PROGRAM_BELGELERI).find((b) => b.dosya === dosya)?.not ?? dosya;
}

/** Bir ölçütün altında gösterilen öğe: disipline ya da programa özgü konu, ya da EPDAD göstergesi. */
export type OlcutEki =
  | {
      tur: "ozgu_konu";
      /** Kararlı kimlik: `cerceve/bolum/sıra` (sıra 1'den). */
      kimlik: string;
      bolumKod: string;
      bolumBaslik: string;
      grup: string | null;
      metin: string;
      kaynak: OzguKaynak;
    }
  | {
      tur: "gosterge";
      kimlik: string;
      no: number;
      metin: string;
      duzeyler: Readonly<Record<DuzeyAdi, string>> | null;
      kaynak: OzguKaynak;
    };

/**
 * Ölçütün altındaki ek öğeler. Özgü konular yalnız kurumun seçtiği bölümlerden gelir; bilinmeyen bölüm kodu
 * yok sayılır. EPDAD'da alt standardın göstergeleri gelir. Saf işlev; metin belgeden gelir, yazılmaz.
 */
export function olcutEkleri(cerceve: string, olcutKod: string, secilenBolumler: readonly string[]): OlcutEki[] {
  if (cerceve === GOSTERGELI_CERCEVE)
    return altStandartGostergeleri(olcutKod).map((g) => ({
      tur: "gosterge",
      kimlik: `${cerceve}/${g.altStandart}/${g.no}`,
      no: g.no,
      metin: g.metin,
      duzeyler: g.duzeyler,
      kaynak: g.kaynak,
    }));
  const bag = ozguBagi(cerceve);
  if (!bag || bag.olcutKod !== olcutKod) return [];
  const secili = new Set(secilenBolumler);
  return ozguBolumListesi(cerceve)
    .filter((b) => secili.has(b.kod))
    .flatMap((b) =>
      b.konular.map((k, i) => ({
        tur: "ozgu_konu" as const,
        kimlik: `${cerceve}/${b.kod}/${i + 1}`,
        bolumKod: b.kod,
        bolumBaslik: b.baslik,
        grup: k.grup,
        metin: k.metin,
        kaynak: k.kaynak,
      })),
    );
}
