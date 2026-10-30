// Saha ziyareti soru listesi (İP-48, saf). Sorular kuralla kurulur:
//   - çerçevedeki her ölçüt ve alt ölçüt bir soru üretir,
//   - raporda EKSİK işaretli her cümle bir soru üretir,
//   - model önerisi ancak çerçevedeki bir ölçüt koduna bağlıysa listeye girer.
// Her soruya o ölçüte kararla bağlanmış onaylı kanıtlar eşlenir. Cevap metni yazılmaz; kanıtı olmayan soru
// "hazırlıksız" sayılır. Hazırlık oranı = kanıtlı soru / soru (ölçüt başına ve toplam), olasılık değildir.

import { ozetHesapla } from "@akredit/cekirdek";
import { type Cerceve, type Olcut, tumOlcutler } from "@akredit/cerceveler";

export const ROLLER = ["rektorluk", "komisyon", "bolum", "ogretim_elemani", "ogrenci"] as const;
export type Rol = (typeof ROLLER)[number];

export const ROL_ADLARI: Readonly<Record<Rol, string>> = {
  rektorluk: "Rektörlük",
  komisyon: "Kalite komisyonu",
  bolum: "Bölüm",
  ogretim_elemani: "Öğretim elemanı",
  ogrenci: "Öğrenci",
};

export type SoruKaynagi = "olcut" | "eksik" | "yz";

export interface EslenenKanit {
  kanitId: string;
  ozet: string;
  dosyaAdi: string;
}

export interface SahaSorusu {
  /** Kaynak ve metinden türetilen kararlı kimlik (16 onaltılık). */
  id: string;
  olcutKod: string;
  olcutBaslik: string;
  kaynak: SoruKaynagi;
  metin: string;
  /** Model dili düzelttiyse kuralın ürettiği özgün metin. */
  ozgunMetin: string | null;
  /** EKSİK kaynaklı soruda rapordaki eksik cümle. */
  eksikCumle: string | null;
  roller: Rol[];
  kanitlar: EslenenKanit[];
  hazirlik: "hazir" | "hazirliksiz";
}

export interface OlcutHazirligi {
  olcutKod: string;
  baslik: string;
  soru: number;
  kanitli: number;
  /** kanitli / soru, yüzde, bir ondalık; sorusu yoksa null. */
  oran: number | null;
}

export interface SahaListesi {
  cerceveKod: string;
  sorular: SahaSorusu[];
  hazirlik: OlcutHazirligi[];
  toplam: { soru: number; kanitli: number; oran: number | null };
}

export interface KanitBagi {
  kanitId: string;
  ozet: string;
  dosyaAdi: string;
  olcutKodlari: string[];
}

export interface EksikCumle {
  olcutKod: string;
  metin: string;
}

export interface SoruGirdisi {
  cerceve: Cerceve;
  kanitlar: readonly KanitBagi[];
  eksikCumleler: readonly EksikCumle[];
  /** Modelin önerdiği sorular (ayıklanmış). Ölçüt kodu çerçevede yoksa listeye girmez. */
  yzOnerileri?: readonly { olcutKod: string; metin: string }[];
  /** Soru kimliği → modelin düzelttiği metin (ayıklanmış). */
  dilDuzeltmeleri?: ReadonlyMap<string, string>;
}

const soruKimligi = (kaynak: SoruKaynagi, kod: string, metin: string) =>
  ozetHesapla(`saha.v1|${kaynak}|${kod}|${metin}`).slice(0, 16);

/** Yüzde, bir ondalık (yarım yukarı). */
export function oranHesapla(kanitli: number, soru: number): number | null {
  if (soru === 0) return null;
  return Math.round((kanitli * 1000) / soru) / 10;
}

/**
 * Kurallı rol ataması: her soru komisyona; kök ölçüt rektörlüğe; yaprak ölçüt bölüme; ölçme, ders paketi
 * ya da matris gerektiren ölçüt öğretim elemanına; anket gerektiren ölçüt öğrenciye. EKSİK soruları
 * komisyon ve bölüme gider.
 */
export function rolleriBul(o: Olcut, kok: boolean, kaynak: SoruKaynagi): Rol[] {
  const r = new Set<Rol>(["komisyon"]);
  if (kaynak === "eksik") r.add("bolum");
  if (kok) r.add("rektorluk");
  if (!o.altOlcutler.length) r.add("bolum");
  for (const k of o.kanitGereksinimleri) {
    if (k.uretenSurec === "olcme" || k.tur === "ders_bilgi_paketi" || k.tur === "matris") r.add("ogretim_elemani");
    if (k.tur === "anket") r.add("ogrenci");
  }
  return ROLLER.filter((x) => r.has(x));
}

export function olcutSorusuMetni(o: Pick<Olcut, "kod" | "baslik">): string {
  return `${o.kod} ${o.baslik}: Bu konuda ne yapıyorsunuz ve bunu hangi kanıt gösteriyor?`;
}

export function eksikSorusuMetni(kod: string, cumle: string): string {
  const temiz = cumle.replace(/\s+/gu, " ").replace(/[?]/gu, "").trim().slice(0, 200);
  return `${kod}: Raporda şu konu eksik görünüyor: "${temiz}" Bu eksik için ne yapıldı, hangi kanıt var?`;
}

/** Soru listesini kurar. Aynı girdi her zaman aynı listeyi verir. */
export function sorulariKur(g: SoruGirdisi): SahaListesi {
  const olcutler = tumOlcutler(g.cerceve.olcutler);
  const kokler = new Set(g.cerceve.olcutler.map((o) => o.kod));
  const kanitlarFn = (kod: string): EslenenKanit[] =>
    g.kanitlar
      .filter((k) => k.olcutKodlari.includes(kod))
      .map((k) => ({ kanitId: k.kanitId, ozet: k.ozet, dosyaAdi: k.dosyaAdi }))
      .sort((a, b) => a.dosyaAdi.localeCompare(b.dosyaAdi, "tr") || a.ozet.localeCompare(b.ozet));
  const sorular: SahaSorusu[] = [];
  const ekle = (o: Olcut, kaynak: SoruKaynagi, metin: string, eksikCumle: string | null) => {
    const id = soruKimligi(kaynak, o.kod, metin);
    if (sorular.some((s) => s.id === id)) return;
    const duzeltme = g.dilDuzeltmeleri?.get(id) ?? null;
    const kanitlar = kanitlarFn(o.kod);
    sorular.push({
      id,
      olcutKod: o.kod,
      olcutBaslik: o.baslik,
      kaynak,
      metin: duzeltme ?? metin,
      ozgunMetin: duzeltme ? metin : null,
      eksikCumle,
      roller: rolleriBul(o, kokler.has(o.kod), kaynak),
      kanitlar,
      hazirlik: kanitlar.length ? "hazir" : "hazirliksiz",
    });
  };
  for (const o of olcutler) {
    ekle(o, "olcut", olcutSorusuMetni(o), null);
    for (const e of g.eksikCumleler)
      if (e.olcutKod === o.kod) ekle(o, "eksik", eksikSorusuMetni(o.kod, e.metin), e.metin);
    for (const y of g.yzOnerileri ?? []) if (y.olcutKod === o.kod) ekle(o, "yz", y.metin.trim(), null);
  }
  // Oran yalnız kurallı sorulardan (ölçüt ve EKSİK) hesaplanır: model önerisinin sayısı paydayı
  // değiştirmez (ilke 2; inceleme dalga 8, D8-8).
  const kuralli = sorular.filter((x) => x.kaynak !== "yz");
  const hazirlik: OlcutHazirligi[] = olcutler.map((o) => {
    const s = kuralli.filter((x) => x.olcutKod === o.kod);
    const kanitli = s.filter((x) => x.hazirlik === "hazir").length;
    return { olcutKod: o.kod, baslik: o.baslik, soru: s.length, kanitli, oran: oranHesapla(kanitli, s.length) };
  });
  const kanitli = kuralli.filter((x) => x.hazirlik === "hazir").length;
  // Çerçevede olmayan koda bağlı EKSİK cümle ve öneri yukarıdaki döngüde hiç eklenmez.
  return {
    cerceveKod: g.cerceve.kod,
    sorular,
    hazirlik,
    toplam: { soru: kuralli.length, kanitli, oran: oranHesapla(kanitli, kuralli.length) },
  };
}

/** Rolün soru seti, liste sırasıyla. */
export function rolSorulari(l: SahaListesi, rol: Rol): SahaSorusu[] {
  return l.sorular.filter((s) => s.roller.includes(rol));
}
