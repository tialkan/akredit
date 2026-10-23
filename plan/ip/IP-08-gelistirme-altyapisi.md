# İP-08: Geliştirme altyapısı ve sürekli entegrasyon

- **Durum:** devam
- **Faz:** 1
- **Bağımlılık:** yok
- **Sahip olduğu yollar:** `.github/**`, `infra/gelistirme/**`, `docs/gelistirme.md`, `.env.ornek`, `docs/raporlar/IP-08.md`
- **Büyüklük:** küçük

## Amaç

Her katkının otomatik doğrulanması ve yerel geliştirme ortamının tek komutla kalkması.

## Kapsam

1. GitHub Actions: `pnpm verify` (Node 22 ve 24), web derlemesi, Playwright uçtan uca testleri, CodeQL, bağımlılık incelemesi, gizli bilgi taraması.
2. Dependabot (ya da Renovate) yapılandırması: haftalık, gruplanmış güncellemeler.
3. `infra/gelistirme/docker-compose.yml`: PostgreSQL 17 + pgvector, MinIO (S3), Mailpit (e-posta). `.env.ornek`.
4. Dockerfile'lar: `apps/web` (Next.js standalone), `apps/isci`. Çok aşamalı, kök olmayan kullanıcı, sağlık denetimi.
5. `docs/gelistirme.md`: kurulum, komutlar, sorun giderme.

## Kabul ölçütleri

- [ ] CI iş akışı ana dalda yeşil.
- [ ] `docker compose up` ile yerel veritabanı ve depo kalkar, `packages/vt` göçleri uygulanır.
- [ ] İmajlar derlenir; imajda kaynak dışı gizli bilgi yok.
- [ ] `pnpm verify` temiz.

## Notlar

CI iş akışı iskelette yazıldı (orkestratör). Docker ve geliştirme ortamı 2. dalgada.

## Günlük

- 2026-10-23: İP tanımlandı. Başlamadan önce kapsamı güncel mimariye göre ayrıntılandır.
