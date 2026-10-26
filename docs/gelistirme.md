# Geliştirme kılavuzu

## Gereksinimler

- Node.js 22.18 ya da üstü (CI 22 ve 24 ile sınar)
- pnpm (sürüm kök `package.json` içindeki `packageManager` alanında; `corepack enable` yeterli)
- Docker ve Docker Compose (yerel veritabanı, nesne deposu, e-posta için)

## Kurulum

```bash
corepack enable
pnpm install
pnpm verify                     # biçim + tip + test; temiz olmalı
cp .env.ornek .env
docker compose -f infra/gelistirme/docker-compose.yml --env-file .env up -d
```

Compose şunları kaldırır:

| Hizmet | Ne | Adres |
|---|---|---|
| `vt` | PostgreSQL 17 + pgvector | `localhost:5432` |
| `goc` | `packages/vt` göçlerini uygular, çıkar | — |
| `depo` | MinIO (S3 uyumlu) | API `localhost:9000`, konsol `localhost:9001` |
| `depo-kova` | Kanıt kovasını nesne kilidiyle açar, çıkar | — |
| `posta` | Mailpit | SMTP `localhost:1025`, arayüz `localhost:8025` |

`goc` hizmeti depoyu salt okunur bağlar ve yerelde kurulu bağımlılıkları kullanır; bu yüzden önce `pnpm install` çalıştırılmalıdır. Göçleri elle uygulamak için: `node --env-file=.env infra/gelistirme/goc.ts`.

Değerler yalnız yereldir; gerçek anahtar ve parola `.env.ornek` dosyasına ya da depoya yazılmaz (`.env` git dışındadır).

## Komutlar

```bash
pnpm verify                          # birleştirmeden önce
pnpm check | pnpm format             # Biome denetimi | düzeltme
pnpm typecheck
pnpm test
pnpm --filter <paket> test           # tek paket
pnpm --filter @akredit/web dev       # web paneli, http://localhost:3000
pnpm --filter @akredit/web e2e       # Playwright (önce: pnpm --filter @akredit/web exec playwright install chromium)
node --env-file=.env infra/gelistirme/vt-sinama.ts   # gerçek PostgreSQL'de eşzamanlı göç ve günlük sınaması
```

## İmajlar

```bash
docker build -f infra/gelistirme/web.Dockerfile -t akredit-web .
docker build -f infra/gelistirme/isci.Dockerfile -t akredit-isci .
```

İkisi de çok aşamalıdır, son aşama `node` (kök olmayan) kullanıcıyla çalışır ve sağlık denetimi içerir. Yapı bağlamından `.env`, anahtar dosyaları ve `node_modules` çıkarılır (`*.Dockerfile.dockerignore`). Üretim dağıtımı İP-26'nındır.

## Sürekli entegrasyon

`.github/workflows/ci.yml`:

- **Doğrula**: Node 22 ve 24 ile `pnpm verify` ve web derlemesi.
- **Uçtan uca**: Playwright (`apps/web/e2e`).
- **Gerçek PostgreSQL**: pgvector'lü PostgreSQL 17 hizmetiyle göçler ve `vt-sinama.ts` (PGlite tek bağlantılı olduğu için birim testlerinde sınanamayan eşzamanlı günlük yazımı ve eşzamanlı göç).
- **Docker imajları**: iki imaj derlenir, dosya sistemi gitleaks ile taranır, kullanıcının `node` olduğu denetlenir.
- **Gizli bilgi taraması**: bütün git geçmişi gitleaks ile.
- **Bağımlılık incelemesi**: çekme isteklerinde yüksek önemli açık ya da uyumsuz lisans (GPL/AGPL) varsa kalır.

`codeql.yml` haftalık ve her değişiklikte CodeQL çalıştırır. `dependabot.yml` npm, GitHub Actions ve Docker imajlarını haftalık, gruplanmış günceller.

## Sorun giderme

- **`pnpm` bulunamadı**: `corepack enable`.
- **Node sürümü hatası / `.ts` dosyası çalışmıyor**: `node --version` 22.18 ya da üstü olmalı.
- **5432 portu dolu**: `.env` içinde `POSTGRES_PORT` ve `DATABASE_URL` portunu değiştirin.
- **`goc` hizmeti `Cannot find package` ile kalıyor**: depo kökünde `pnpm install` çalıştırın, sonra `docker compose ... up goc`.
- **"Uygulanmış göç değiştirilmiş"**: uygulanmış bir göç dosyası değiştirilmiştir. Göçler yalnız eklenir; yeni bir göç yazın. Yerel veriyi sıfırlamak için: `docker compose -f infra/gelistirme/docker-compose.yml down -v`.
- **Playwright tarayıcısı yok**: `pnpm --filter @akredit/web exec playwright install --with-deps chromium`.
