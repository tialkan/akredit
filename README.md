# Akredit

Yükseköğretimde kalite güvencesi ve akreditasyon süreçlerini kanıta dayalı, kayıtlı ve onaylı yürüten açık kaynak platform. Yayın adresi: **akredit.org** (hazırlanıyor).

Akredit kanıtı kaynağından toplar, ölçer, raporu her iddiayı bir kanıta bağlayarak yazar, eksikleri bulur, kalite süreçlerini takvimine göre yürütür ve her adımı değiştirilemez biçimde kaydeder. Öğretim elemanına kalan iş, önüne gelen önerilere tek dokunuşla karar vermektir. Kurum adına beyan ve dış kuruma son gönderim her zaman insandadır.

> Bu depo [Akreddit](https://github.com/tialkan/akreddit) projesinin devamıdır. Mevcut komut satırı aracı ve Claude Code eklentisi `apps/cli` altında çalışmaya devam eder.

## Durum

Geliştirme sürüyor. Yol haritası, iş paketleri ve ilkeler: **[plan.md](plan.md)**. Mimari: [docs/mimari.md](docs/mimari.md).

## Depo

| Yol | İçerik |
|---|---|
| `apps/web` | akredit.org tanıtım sitesi ve uygulama paneli |
| `apps/isci` | Arka plan işleri |
| `apps/cli` | Akreddit komut satırı aracı ve Claude Code eklentisi |
| `packages/*` | Çekirdek, veritabanı, YZ katmanı, belge işleme, bağlayıcılar, ölçme, çerçeveler |
| `plan/`, `docs/` | Plan, iş paketleri, mimari, kararlar |

## Geliştirme

Node.js 22.18 ya da üstü ve pnpm gerekir.

```bash
corepack enable
pnpm install
pnpm verify                       # biçim, tip denetimi, testler
pnpm --filter @akredit/web dev    # web paneli
```

Katkı kuralları ve ajanlar için rehber: [CLAUDE.md](CLAUDE.md).

## Akreddit komut satırı aracı

Kurulum ve kullanım: [apps/cli/README.md](apps/cli/README.md) ve [tezatlas.com/akreddit/kurulum](https://tezatlas.com/akreddit/kurulum).

## Lisans

[Apache Lisansı 2.0](LICENSE). "Akredit" ve "Akreddit" adları ve logoları lisans kapsamında değildir. Ayrıntı: [NOTICE](NOTICE). Güvenlik bildirimi: [SECURITY.md](SECURITY.md).

Copyright 2026 Tarık İsmet ALKAN · [Kulular Teknoloji](https://kulular.com.tr)
