// Sayfa geneli içerik güvenlik politikası (G-27-1). Her istekte yeni nonce; betikler yalnız nonce'la
// (ve 'strict-dynamic' ile onların yüklediği betiklerle) çalışır. Next.js nonce'u istek başlığındaki
// CSP'den okur ve kendi betiklerine ekler; bu yüzden sayfalar dinamik işlenir (kök yerleşim).

export const NONCE_BASLIGI = "x-nonce";

export type CspKipi = "zorla" | "rapor";

/** AKREDIT_CSP=rapor ile yalnız raporlanır (Content-Security-Policy-Report-Only); varsayılan zorlar. */
export function cspKipi(deger: string | undefined): CspKipi {
  return deger === "rapor" ? "rapor" : "zorla";
}

export function cspBaslikAdi(kip: CspKipi): string {
  return kip === "rapor" ? "Content-Security-Policy-Report-Only" : "Content-Security-Policy";
}

/** 16 rastgele bayt, base64. Rastgelelik dışarıdan verilir (sınanabilir). */
export function nonceUret(rastgele: (b: Uint8Array) => Uint8Array = (b) => crypto.getRandomValues(b)): string {
  return Buffer.from(rastgele(new Uint8Array(16))).toString("base64");
}

export function cspBasligi(nonce: string, secenek: { gelistirme: boolean }): string {
  if (!/^[A-Za-z0-9+/]{16,}={0,2}$/.test(nonce)) throw new Error("geçersiz nonce");
  const yonergeler: [string, ...string[]][] = [
    ["default-src", "'self'"],
    // Geliştirmede React hata yığınlarını eval ile kurar; üretimde yok.
    ["script-src", "'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(secenek.gelistirme ? ["'unsafe-eval'"] : [])],
    ["style-src", "'self'", `'nonce-${nonce}'`],
    // Çubuk genişlikleri gibi öğe üstü `style` öznitelikleri; betik çalıştıramaz.
    ["style-src-attr", "'unsafe-inline'"],
    ["img-src", "'self'", "data:", "blob:"],
    ["font-src", "'self'"],
    ["connect-src", "'self'"],
    ["worker-src", "'self'"],
    ["manifest-src", "'self'"],
    ["object-src", "'none'"],
    ["base-uri", "'self'"],
    ["form-action", "'self'"],
    ["frame-ancestors", "'none'"],
    ...(secenek.gelistirme ? [] : [["upgrade-insecure-requests"] as [string]]),
  ];
  return yonergeler.map((y) => y.join(" ")).join("; ");
}
