// Bütün yanıtlara eklenen güvenlik ve sürüm başlıkları, durağan varlıkların önbellek politikası (İP-49).
// Saf işlevler; next.config.ts (headers) kullanır, test edilir.
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

/**
 * Sayfalar paylaşılan önbelleğe alınmaz: her yanıt istek başına yeni bir CSP nonce'u taşır; önbellekteki sayfa
 * bütün ziyaretçilere aynı nonce'u verirdi (dış inceleme, 05.11.2026). Uzun önbellek yalnız durağan varlıklara.
 * _next/static dosyalarının adı içerik özeti taşır; Next onlara kendisi "max-age=31536000, immutable" verir.
 * public/gorsel ve public/marka adları içerik özeti taşımaz: içerik değişirse dosya adı da değişmelidir.
 */
export const DURAGAN_ONBELLEK = "public, max-age=31536000, immutable";

export const DURAGAN_YOLLAR: readonly string[] = ["/gorsel/:yol*", "/marka/:yol*"];
