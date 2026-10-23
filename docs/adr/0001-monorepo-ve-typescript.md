# ADR-0001: pnpm çalışma alanı, TypeScript ve derlemesiz Node

- Durum: kabul edildi (2026-10-23)

## Bağlam

Akreddit tek paketlik, bağımlılıksız bir JavaScript komut satırı aracıydı. akredit.org; web paneli, arka plan işçisi, veritabanı, YZ katmanı ve bağlayıcılar içeren, birçok ajanın paralel çalışacağı bir sisteme dönüşüyor.

## Karar

- Tek depo, pnpm çalışma alanı: `apps/*` ve `packages/*`.
- TypeScript 6 (strict, `erasableSyntaxOnly`). Paketler kaynak `.ts` dosyalarını dışa açar (`exports: ./src/index.ts`). Node 22.18+ bu dosyaları tip ayıklamayla doğrudan çalıştırır, Next.js `transpilePackages` ile derler. Ayrı derleme adımı yoktur.
- Vitest (birim), Playwright (uçtan uca), Biome (biçim ve denetim).
- `apps/cli` (Akreddit) mevcut JavaScript ve `node --test` düzeniyle korunur, sonraki bir İP'de çekirdeğe bağlanır.

## Sonuçlar

- Paketler arası tipler derlemesiz paylaşılır. `enum`, `namespace`, yapıcı parametre özelliği kullanılamaz.
- TypeScript 7 (yerel derleyici) JS API'sini değiştirdiği için Next.js ve araçlar uyumlu olana kadar 6.x'te kalınır.
