// Bütün yanıtlara eklenen güvenlik ve sürüm başlıkları, herkese açık sayfaların önbellek politikası (İP-49).
// Saf işlevler; next.config.ts (headers) ve src/proxy.ts (Cache-Control) kullanır, test edilir.
// CSP ve frame-ancestors burada değil, istek başına nonce ile src/proxy.ts'te verilir (G-27-1).

export interface Baslik {
  key: string;
  value: string;
}

/**
 * HSTS yalnız max-age ile: includeSubDomains ve preload yok (alt alan adlarının hepsi HTTPS'e hazır olmayabilir,
 * preload listesinden çıkmak aylar sürer). Permissions-Policy: sitenin hiç kullanmadığı aygıt izinleri kapalı.
 */
export const GUVENLIK_BASLIKLARI: Baslik[] = [
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), hid=(), midi=(), magnetometer=(), gyroscope=(), accelerometer=(), browsing-topics=()",
  },
];

export const SURUM_BASLIGI = "x-app-version";

/** Derleme anındaki commit (Coolify SOURCE_COMMIT); verilmemişse ya da "bilinmiyor" ise paket sürümü. */
export function surumBelirle(ortam: Record<string, string | undefined>, paketSurumu: string): string {
  const c = ortam.SOURCE_COMMIT?.trim();
  if (!c || c === "bilinmiyor") return paketSurumu;
  // Başlığa güvenli: yalnız commit karakterleri; tam SHA kısaltılmaz.
  return /^[0-9A-Za-z._-]{1,64}$/u.test(c) ? c : paketSurumu;
}

/** Herkese açık, kişiye özel içerik taşımayan tanıtım sayfaları. Panel, API, form ve giriş yolları burada yok. */
export const ONBELLEKLI_YOLLAR: readonly string[] = [
  "/",
  "/ne-yapar",
  "/nasil-calisir",
  "/kimler-icin",
  "/cerceveler",
  "/yapay-zeka",
  "/giris-ve-hesap",
  "/guvenlik",
  "/sinirlar",
  "/sss",
  "/iletisim",
  "/mcp-kullan",
  "/acik-kaynak",
  "/kvkk",
  "/gizlilik",
  "/kosullar",
  "/yol-haritasi",
  "/belgeler",
  "/proje",
];

/**
 * Paylaşılan önbellek (CDN, ters vekil) 5 dakika tutar, arka planda yeniler. Sayfalar yine istek başına işlenir
 * (CSP nonce'u, barındırma bayrağı çalışma anında okunur); bayrak değişikliği en geç 5 dakikada yansır.
 * Tarayıcı s-maxage'ı uygulamaz. Diğer yollar için null: Next'in kendi değeri (no-store) kalır.
 */
export const ONBELLEK_DEGERI = "public, s-maxage=300, stale-while-revalidate=600";

export function onbellekPolitikasi(yol: string): string | null {
  const y = yol.length > 1 && yol.endsWith("/") ? yol.slice(0, -1) : yol;
  if (ONBELLEKLI_YOLLAR.includes(y)) return ONBELLEK_DEGERI;
  if (/^\/belgeler\/[a-z0-9-]+$/u.test(y)) return ONBELLEK_DEGERI;
  return null;
}
