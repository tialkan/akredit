// Kılavuz metinleri için basit okunabilirlik ölçüleri. Pilot kullanıcı testinin yerini tutmaz; yazarken
// uzun cümleyi ve teknik terimi yakalamak içindir.

/** Kullanıcı kılavuzlarında geçmemesi gereken teknik terimler (küçük harfle, kelime başı eşleşmesi). */
export const YASAK_TERIMLER = [
  "api",
  "sso",
  "saml",
  "oidc",
  "oauth",
  "mcp",
  "json",
  "csv",
  "xlsx",
  "docx",
  "sql",
  "veritabanı",
  "sunucu tarafı",
  "token",
  "belirteç",
  "hash",
  "sha-256",
  "hmac",
  "rls",
  "kiracı",
  "pnpm",
  "docker",
  "commit",
  "endpoint",
  "uç nokta",
];

export function cumleler(metin: string): string[] {
  return metin
    .split(/(?<=[.!?:;])\s+/u)
    .map((c) => c.trim())
    .filter((c) => c.length > 0);
}

export function kelimeSayisi(cumle: string): number {
  return cumle.split(/\s+/u).filter((k) => /\p{L}|\d/u.test(k)).length;
}

export function yasakTerimler(metin: string): string[] {
  const kucuk = metin.toLocaleLowerCase("tr");
  return YASAK_TERIMLER.filter((t) => new RegExp(`(^|[^\\p{L}])${t.replace(/[.]/gu, "\\$&")}`, "u").test(kucuk));
}

export interface SadelikOlcusu {
  cumleSayisi: number;
  ortalamaKelime: number;
  enUzunCumle: number;
}

export function sadelikOlc(metinler: string[]): SadelikOlcusu {
  const hepsi = metinler.flatMap(cumleler);
  const uzunluklar = hepsi.map(kelimeSayisi);
  const toplam = uzunluklar.reduce((a, b) => a + b, 0);
  return {
    cumleSayisi: hepsi.length,
    ortalamaKelime: hepsi.length === 0 ? 0 : Math.round((toplam / hepsi.length) * 10) / 10,
    enUzunCumle: Math.max(0, ...uzunluklar),
  };
}
