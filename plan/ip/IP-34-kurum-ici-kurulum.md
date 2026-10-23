# İP-34: Kurum içi kurulum paketi ve yerel model

- **Durum:** bekliyor
- **Faz:** 6
- **Bağımlılık:** İP-26
- **Sahip olduğu yollar:** `infra/kurum-ici/**`, `docs/kurulum/**`, `docs/raporlar/IP-34.md`
- **Büyüklük:** orta

## Amaç

Verisini dışarı çıkarmak istemeyen kurumların Akredit'i kendi altyapısında çalıştırabilmesi.

## Kapsam

1. Helm şeması ve Docker Compose paketi; internete kapalı kurulum demeti.
2. Açık ağırlıklı model sunucusu rehberi (vLLM/SGLang; Türkçe başarımı ölçülmüş modeller, donanım önerileri).
3. Sürüm yükseltme ve geri dönüş prosedürü.

## Kabul ölçütleri

- [ ] Temiz bir sunucuda belgeden kurulum ve yükseltme tatbikatı.
- [ ] `pnpm verify` temiz.

## Günlük

- 2026-10-23: İP tanımlandı. Başlamadan önce kapsamı güncel mimariye göre ayrıntılandır.
