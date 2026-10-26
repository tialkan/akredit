// Küçük yardımcılar.

/** Türkçe büyük/küçük harf ve aksan farkını yok sayan arama anahtarı. */
export function aramaAnahtari(metin: string): string {
  return metin
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ı/gu, "i")
    .replace(/\s+/gu, " ")
    .trim();
}

/** Ad karşılaştırması (imza): boşluk ve büyük/küçük harf farkı önemsiz, Türkçe harfler önemli. */
export function adlarAyniMi(a: string, b: string): boolean {
  const n = (x: string) => x.trim().replace(/\s+/gu, " ").toLocaleLowerCase("tr");
  return n(a) === n(b);
}
