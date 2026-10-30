# İP-34: Kurum içi kurulum paketi ve yerel model

- **Durum:** inceleme
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

- [ ] Temiz bir sunucuda belgeden kurulum ve yükseltme tatbikatı. **Kısmen:** veritabanı yükseltme/geri dönüş ve yerel model yolu kurulum betikleriyle yerelde başarılı (`docs/kurulum/tatbikat/2026-10-27-yerel-pg16.txt`); Docker'lı tam tatbikat ortamda Docker daemon ve kayıt defteri erişimi olmadığından yapılamadı, kontrol listesi `docs/kurulum/tatbikat.md`.
- [x] `pnpm verify` temiz (2026-10-27: 1002 test).

## Günlük

- 2026-10-23: İP tanımlandı. Başlamadan önce kapsamı güncel mimariye göre ayrıntılandır.
- 2026-10-27: Uygulandı (dal `ip/34-kurum-ici`). Compose yığını (yalnız caddy dış ağda; web/işçi/vt/model `internal` ağlarda), Helm şeması (NetworkPolicy ile dışa çıkış yasağı, kapatılamaz), internetsiz kurulum demeti (SHA-256 doğrulamalı), `kur.sh`/`yukselt.sh` (önce yedek, hata halinde kod dönüşü)/`geri-don.sh` (kod ya da veriyle), `vt-yedek.sh`, yerel model ayar denetimi `yz-ayari.ts` (yalnız ollama/vllm/sglang, yalnız iç adres, yurt dışı izni kapalı) ve ölçüm aracı `model-olc.ts`, `docs/kurulum/` kılavuzları. `denetle.sh` (44 denetim) ve `tatbikat/tatbikat.sh` (16 denetim, PG16) başarılı. Yapılamayan: Docker ile gerçek kurulum/yükseltme, Ollama/vLLM/Helm çalıştırma, model Türkçe başarım ölçümü (ortamda Docker daemon, Docker Hub, ollama.com, get.helm.sh, GPU yoktu). Karar: kurum içi YZ ayarı ayrı bir katmanda (`infra/kurum-ici/yz-ayari.ts`) denetlenir, çünkü `@akredit/yz` özel adresli yerel hazırı da yurt içi sayıyor; web/işçinin `AKREDIT_YZ_*` okuması sonraki İP'ye bırakıldı. Ortak dosya: `biome.json`'a Helm şablon dizini dışlaması. Göç gerekmedi. Rapor: `docs/raporlar/IP-34.md`.
- 2026-10-30 (inceleme kapanışı, dal `inceleme/kapanis`): Bağımsız inceleme. İnsan bekleyen: Docker daemon, kayıt defteri ve (yerel model için) GPU erişimli temiz bir sunucuda belgeden kurulum ve yükseltme tatbikatı (`docs/kurulum/tatbikat.md`), `helm lint/template`, yerel modelin Türkçe başarım ölçümü. Durum inceleme.
