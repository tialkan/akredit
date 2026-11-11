# Akredit

Yükseköğretimde kalite güvencesi ve akreditasyon süreçlerini kanıta dayalı, kayıtlı ve onaylı yürüten açık kaynak platform. Yayın adresi: [akredit.org](https://akredit.org).

Akredit kanıtı kaynağından toplar, ölçer, raporu her iddiayı bir kanıta bağlayarak yazar, eksikleri bulur, kalite süreçlerini takvimine göre yürütür ve her adımı değiştirilemez biçimde kaydeder. Öğretim elemanına kalan iş, önüne gelen önerilere tek dokunuşla karar vermektir. Kurum adına beyan ve dış kuruma son gönderim her zaman insandadır.

> Bu depo [Akreddit](https://github.com/tialkan/akreddit) projesinin devamıdır. Mevcut komut satırı aracı ve Claude Code eklentisi `apps/cli` altında çalışmaya devam eder.

## Durum

- **Yayında:** herkese açık, hesapsız Akredit MCP sunucusu ([akredit.org/mcp](https://akredit.org/mcp), kaynak `apps/acik-mcp`), tanıtım sitesi ve tarayıcıda çalışan araçlar ([akredit.org/deneyin](https://akredit.org/deneyin)).
- **Askıda:** barındırılan kurum hizmeti (kurum açma, kurum girişi ve paneli, pilot). Kod depoda durur, sponsor bulunana kadar hizmet verilmez. Karar: [ADR 0008](docs/adr/0008-mcp-odagi-barindirma-askida.md).

Yol haritası, iş paketleri ve ilkeler: **[plan.md](plan.md)**. Mimari: [docs/mimari.md](docs/mimari.md). Kararlar: [docs/adr/](docs/adr/README.md).

## Depo

| Yol | İçerik |
|---|---|
| `apps/acik-mcp` | Herkese açık MCP sunucusu (yayında) |
| `apps/web` | akredit.org tanıtım sitesi, tarayıcı içi araçlar ve uygulama paneli (panel askıda) |
| `apps/isci` | Arka plan işleri (askıda) |
| `apps/mcp` | Kurum verisiyle çalışan MCP sunucusu (askıda) |
| `apps/cli` | Akreddit komut satırı aracı ve Claude Code eklentisi |
| `packages/*` | Çekirdek, veritabanı, YZ katmanı, belge işleme, bağlayıcılar, ölçme, çerçeveler |
| `plan/`, `docs/` | Plan, iş paketleri, mimari, kararlar |

## Geliştirme

Node.js 22.18 ya da üstü ve pnpm gerekir.

```bash
corepack enable
pnpm install
pnpm verify                       # biçim, tip denetimi, testler (bütün depo)
pnpm verify:canli                 # yalnız yayındaki ürün: web, açık MCP ve gömdükleri paketler
pnpm --filter @akredit/web dev    # web paneli
```

Katkı kuralları ve ajanlar için rehber: [CLAUDE.md](CLAUDE.md).

## Akreddit komut satırı aracı

Kurulum ve kullanım: [apps/cli/README.md](apps/cli/README.md) ve [tezatlas.com/akreddit/kurulum](https://tezatlas.com/akreddit/kurulum).

## Lisans

[Apache Lisansı 2.0](LICENSE). "Akredit" ve "Akreddit" adları ve logoları lisans kapsamında değildir. Ayrıntı: [NOTICE](NOTICE). Güvenlik bildirimi: [SECURITY.md](SECURITY.md).

Copyright 2026 Tarık İsmet ALKAN · [Kulular Teknoloji](https://kulular.com.tr)
