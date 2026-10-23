// Türkçe metin yardımcıları. Saf işlevler; arama, alıntı doğrulama ve karşılaştırma için kullanılır.

const TIRE = /[‐-―−]/gu;
const TEK_TIRNAK = /[‘’‚‛´`]/gu;
const CIFT_TIRNAK = /[“”„‟«»]/gu;
const YUMUSAK_TIRE = /­/gu;
// PDF'lerde satır sonunda bölünen kelimeler: "bilgi-\nsayar" → "bilgisayar".
const SATIR_SONU_BOLME = /(\p{Ll})-\s*\n\s*(\p{Ll})/gu;

/** Türkçe kurallarıyla küçük harfe çevirir: "İ" → "i", "I" → "ı". */
export function kucukHarf(metin: string): string {
  return metin.toLocaleLowerCase("tr-TR");
}

/** Türkçe kurallarıyla büyük harfe çevirir: "i" → "İ", "ı" → "I". */
export function buyukHarf(metin: string): string {
  return metin.toLocaleUpperCase("tr-TR");
}

/**
 * Karşılaştırma için normalleştirir: Unicode NFC, Türkçe küçük harf, tipografik tırnak ve tireler,
 * yumuşak tire, satır sonunda bölünmüş kelimeler ve boşluklar. Anlamı değiştirmez, harf düşürmez.
 */
export function normallestir(metin: string): string {
  return kucukHarf(
    metin
      .normalize("NFC")
      .replace(YUMUSAK_TIRE, "")
      .replace(SATIR_SONU_BOLME, "$1$2")
      .replace(TEK_TIRNAK, "'")
      .replace(CIFT_TIRNAK, '"')
      .replace(TIRE, "-"),
  )
    .replace(/\s+/gu, " ")
    .trim();
}

/** Alıntı, parça metninde (normalleştirilmiş olarak) birebir geçiyor mu? */
export function alintiGeciyorMu(alinti: string, parcaMetni: string): boolean {
  const a = normallestir(alinti);
  if (!a) return false;
  return normallestir(parcaMetni).includes(a);
}

/** Metindeki kelimeleri sayar (boşlukla ayrılmış, boş olmayan). */
export function kelimeSayisi(metin: string | null | undefined): number {
  return String(metin ?? "")
    .trim()
    .split(/\s+/u)
    .filter(Boolean).length;
}
