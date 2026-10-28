// Karar kartları klavye kısayolları (İP-39). Katman 2'de "hepsini onayla" kısayolu bilerek yoktur.

export type KartEylemi =
  | { tur: "sonraki" }
  | { tur: "onceki" }
  | { tur: "sec"; sira: number }
  | { tur: "kendi" }
  | { tur: "kaydet" }
  | { tur: "yardim" };

export function kartKisayolu(tus: string, degistirici = false): KartEylemi | null {
  if (degistirici) return null;
  if (tus === "j") return { tur: "sonraki" };
  if (tus === "k") return { tur: "onceki" };
  if (tus === "1" || tus === "2" || tus === "3") return { tur: "sec", sira: Number(tus) - 1 };
  if (tus === "y") return { tur: "kendi" };
  if (tus === "o") return { tur: "kaydet" };
  if (tus === "?") return { tur: "yardim" };
  return null;
}

export const KART_KISAYOLLARI: readonly { tus: string; aciklama: string }[] = [
  { tus: "j", aciklama: "Sonraki karar" },
  { tus: "k", aciklama: "Önceki karar" },
  { tus: "1-3", aciklama: "Önlem seç" },
  { tus: "y", aciklama: "Kendi önlemini yaz" },
  { tus: "o", aciklama: "Seçili önlemle kararı kaydet" },
  { tus: "?", aciklama: "Bu yardımı aç" },
];

/** Hesaptan gelen yüzde değerini yazar; sayı modelden gelmez. */
export function yuzde(x: number): string {
  return `%${x.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}`;
}
