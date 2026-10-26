// Arayüzün saf yardımcı işlevleri. IO yapmaz; tarayıcıda ve sunucuda aynı sonucu verir.

import type { MatrisDegeri, OneriTuru, RiskDuzeyi } from "@akredit/cekirdek";

export const RISK_ETIKETI: Readonly<Record<RiskDuzeyi, string>> = {
  dusuk: "Düşük risk",
  orta: "Orta risk",
  yuksek: "Yüksek risk",
};

export const RISK_SIRASI: readonly RiskDuzeyi[] = ["yuksek", "orta", "dusuk"];

export const ONERI_TURU_ETIKETI: Readonly<Record<OneriTuru, string>> = {
  kanit_etiketi: "Kanıt etiketi",
  toplanti_tutanagi: "Toplantı tutanağı",
  anket_ozeti: "Anket özeti",
  matris_katkisi: "Matris katkısı",
  soru_cikti_eslemesi: "Soru-çıktı eşlemesi",
  bologna_taslagi: "Ders bilgi paketi taslağı",
  rapor_bolumu: "Rapor bölümü",
  eylem: "Eylem",
  olgunluk_duzeyi: "Olgunluk düzeyi",
  yazma_plani: "Yazma planı",
  dis_gonderim: "Dış gönderim",
};

/** Arama için: Türkçe küçük harf, aksanlar sadeleşir ("Öğrenci" ve "ogrenci" eşleşir). */
export function metinAramaAnahtari(metin: string): string {
  return metin
    .toLocaleLowerCase("tr")
    .replaceAll("ı", "i")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const AYLAR = [
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
];

/** "2026-10-31" ya da ISO zaman → "31 Ekim 2026". Saat dilimine bağlı değildir (tarih kısmı okunur). */
export function tarihYaz(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  const ay = AYLAR[Number(m[2]) - 1];
  return ay ? `${Number(m[3])} ${ay} ${m[1]}` : iso;
}

/** İki ISO tarih arasındaki gün farkı (b - a). */
export function gunFarki(a: string, b: string): number {
  return Math.round((Date.parse(b.slice(0, 10)) - Date.parse(a.slice(0, 10))) / 86_400_000);
}

/** 0-1 güven → "%87"; yoksa "—". */
export function yuzdeYaz(oran: number | null): string {
  if (oran === null || !Number.isFinite(oran)) return "—";
  return `%${Math.round(oran * 100)}`;
}

/** Bayt → "12,4 KB". */
export function boyutYaz(bayt: number): string {
  if (bayt < 1024) return `${bayt} B`;
  const kb = bayt / 1024;
  if (kb < 1024) return `${kb.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} KB`;
  return `${(kb / 1024).toLocaleString("tr-TR", { maximumFractionDigits: 1 })} MB`;
}

/** Dakika → "1 sa 25 dk". */
export function sureYaz(dakika: number): string {
  if (dakika < 60) return `${dakika} dk`;
  const sa = Math.floor(dakika / 60);
  const dk = dakika % 60;
  return dk ? `${sa} sa ${dk} dk` : `${sa} sa`;
}

/** Öğeleri risk düzeyine göre (yüksek → düşük) gruplar; boş gruplar da döner. */
export function riskeGoreGrupla<T extends { risk: RiskDuzeyi }>(
  ogeler: readonly T[],
  riskBul: (o: T) => RiskDuzeyi = (o) => o.risk,
): { risk: RiskDuzeyi; ogeler: T[] }[] {
  return RISK_SIRASI.map((risk) => ({ risk, ogeler: ogeler.filter((o) => riskBul(o) === risk) }));
}

export type SiralamaYonu = "artan" | "azalan";

/** Türkçe alfabeye uygun, kararlı sıralama. Sayılar sayı olarak karşılaştırılır. */
export function sirala<T>(ogeler: readonly T[], deger: (o: T) => string | number, yon: SiralamaYonu): T[] {
  const carpan = yon === "artan" ? 1 : -1;
  return ogeler
    .map((o, i) => ({ o, i }))
    .sort((x, y) => {
      const a = deger(x.o);
      const b = deger(y.o);
      const fark =
        typeof a === "number" && typeof b === "number"
          ? a - b
          : String(a).localeCompare(String(b), "tr", { numeric: true, sensitivity: "base" });
      return fark !== 0 ? fark * carpan : x.i - y.i;
    })
    .map((x) => x.o);
}

export type KisayolEylemi = "sonraki" | "onceki" | "onayla" | "duzelt" | "reddet" | "sec" | "yardim";

/** Onay kutusunun klavye kısayolları. Değiştirici tuşlarla basılanlar yok sayılır. */
export function kisayolEylemi(tus: string, degistirici = false): KisayolEylemi | null {
  if (degistirici) return null;
  switch (tus) {
    case "j":
      return "sonraki";
    case "k":
      return "onceki";
    case "a":
      return "onayla";
    case "d":
      return "duzelt";
    case "r":
      return "reddet";
    case "x":
      return "sec";
    case "?":
      return "yardim";
    default:
      return null;
  }
}

export const KISAYOLLAR: readonly { tus: string; aciklama: string }[] = [
  { tus: "j", aciklama: "Sonraki öneri" },
  { tus: "k", aciklama: "Önceki öneri" },
  { tus: "a", aciklama: "Onayla" },
  { tus: "d", aciklama: "Düzelt" },
  { tus: "r", aciklama: "Reddet" },
  { tus: "x", aciklama: "Seç ya da seçimi kaldır (düşük ve orta risk)" },
  { tus: "?", aciklama: "Bu yardımı aç" },
];

/** Matris hücresinin ekranda yazılışı ve ekran okuyucu açıklaması. */
export function matrisHucreYazisi(d: MatrisDegeri): { kisa: string; uzun: string; seviye: number } {
  if (d.tur === "puan") return { kisa: String(d.puan), uzun: `Katkı ${d.puan} / 5`, seviye: d.puan };
  if (d.tur === "iliskisiz") return { kisa: "–", uzun: "İlişki yok", seviye: 0 };
  return { kisa: "?", uzun: "Kanıt yetersiz", seviye: -1 };
}

/** Bir döngüde sınırlı gezinme: dizinin dışına taşmaz. */
export function sinirla(deger: number, en: number, enCok: number): number {
  return Math.min(Math.max(deger, en), enCok);
}
