# İP-08: Geliştirme altyapısı ve sürekli entegrasyon

- **Durum:** inceleme
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

- [ ] CI iş akışı ana dalda yeşil. (Yazıldı; ana dala itilmeden doğrulanamaz.)
- [ ] `docker compose up` ile yerel veritabanı ve depo kalkar, `packages/vt` göçleri uygulanır. (Yazıldı; bu ortamda Docker Hub kapalı olduğundan çalıştırılamadı. Göç betiği CI `postgres` işinde de çalışır.)
- [ ] İmajlar derlenir; imajda kaynak dışı gizli bilgi yok. (CI `imajlar` işi derler, gitleaks ile tarar ve kullanıcıyı denetler; yerelde derlenemedi.)
- [x] `pnpm verify` temiz (376 test: 353 Vitest + 23 cli).

## Notlar

CI iş akışı iskelette yazıldı (orkestratör). Docker ve geliştirme ortamı 2. dalgada.

## Günlük

- 2026-10-23: İP tanımlandı. Başlamadan önce kapsamı güncel mimariye göre ayrıntılandır.
- 2026-10-27: Önceki kısım: `ci.yml` (verify Node 22/24, web derlemesi, Playwright) orkestratörce yazılmıştı. Bu oturumda eklendi: CI'ya gerçek PostgreSQL 17 + pgvector işi (`infra/gelistirme/goc.ts`, `vt-sinama.ts`: eşzamanlı göç ve 40 bağlantıdan eşzamanlı günlük yazımı, `sira` boşluksuz, zincir doğrulanır; İP-02 raporunun isteği), Docker imaj işi (derleme, imaj dosya sisteminde gitleaks, kök olmayan kullanıcı denetimi), git geçmişinde gitleaks, bağımlılık incelemesi (yüksek önem, GPL/AGPL), `codeql.yml`, `dependabot.yml` (npm, actions, docker; haftalık, gruplu). `infra/gelistirme/docker-compose.yml` (PostgreSQL 17 + pgvector, `goc`, MinIO + nesne kilitli kova, Mailpit), `.env.ornek`, `web.Dockerfile`/`isci.Dockerfile` (çok aşamalı, `node` kullanıcısı, sağlık denetimi, ayrı `.dockerignore`), `docs/gelistirme.md`. Karar: Dockerfile'lar şimdilik `infra/gelistirme/` altında; üretim dağıtımı İP-26. Kalan: CI'nın ana dalda yeşil görülmesi, compose ve imajların Docker Hub erişimli bir makinede denenmesi.
- 2026-10-30 (inceleme kapanışı, dal `inceleme/kapanis`): Bağımsız inceleme. Kod tarafı tamam (`pnpm check`, `pnpm typecheck`, testler temiz). İnsan bekleyen: GitHub Actions işleri ana dalda hiç başlamıyor: `gh run view 41038336154` "The job was not started because recent account payments have failed or your spending limit needs to be increased". Depo sahibinin GitHub faturalandırmasını düzeltmesi, sonra CI'nın yeşil görülmesi; `docker compose up` ve imaj derlemesinin Docker Hub erişimli makinede denenmesi. Durum inceleme.
