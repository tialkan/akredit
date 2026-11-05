// Tarayıcı derlemesinde @akredit/yz yerine geçen boş modül (next.config.ts, turbopack.resolveAlias).
// /deneyin araçları herkese açık MCP'nin ayrıştırıcılarını içe aktarır; onların kişisel veri denetimi
// (apps/acik-mcp/src/kisisel-veri.ts) @akredit/yz'yi çağırır. O denetim yalnız sunucuya gelen girdi içindir;
// tarayıcıda veri hiçbir yere gönderilmediği için çağrılmaz. @akredit/yz Node modülleri (async_hooks, crypto)
// kullandığından tarayıcıya paketlenemez. Yanlışlıkla çağrılırsa sessizce geçmez, hata verir.

export type VeriTuru = "KİŞİ" | "TCKN" | "TELEFON" | "EPOSTA" | "IBAN" | "ÖĞRENCİ-NO" | "ADRES" | "İMZA";

export function maskele(_metin: string, _secenek?: unknown): never {
  throw new Error("Kişisel veri maskeleyicisi tarayıcıda kullanılmaz.");
}
