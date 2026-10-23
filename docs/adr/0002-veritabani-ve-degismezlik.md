# ADR-0002: PostgreSQL, satır güvenliği ve değiştirilemez kayıt

- Durum: kabul edildi (2026-10-23)

## Bağlam

Akreditasyonda güven, kanıtın ve kararın sonradan değiştirilmediğinin gösterilebilmesine dayanır. Akreddit bunu SQLite tetikleyicileriyle yapıyordu. Barındırılan çok kiracılı sistemde kiracılar arası sızıntı en ağır hatadır.

## Karar

- PostgreSQL 17 + pgvector, Drizzle ORM. Tetikleyiciler, satır güvenliği ve işlevler SQL göçleriyle yazılır.
- Her kiracı tablosunda `kurum_id` ve `FORCE ROW LEVEL SECURITY`. Uygulama rolü `BYPASSRLS` taşımaz, her işlem `SET LOCAL app.kurum_id` ile başlar.
- Kanıt, öneri, karar, çıktı, rapor sürümü ve günlük yalnız eklenir (UPDATE/DELETE tetikleyiciyle reddedilir).
- Günlük kurum başına SHA-256 özet zinciridir. Doğrulama işlevi zinciri baştan hesaplar.
- Testler PGlite ile gerçek PostgreSQL davranışında çalışır.

## Sonuçlar

- "Düzeltme" her zaman yeni kayıttır. Arayüz geçerli sürümü karardan hesaplar.
- KVKK silme talepleri için kişisel veri, değişmez tablolardan ayrı tutulur (takma ad eşlemesi ayrı tabloda, silinebilir). Böylece günlük bütünlüğü bozulmadan kişi bağlantısı koparılabilir.
