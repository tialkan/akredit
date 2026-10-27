# Kurulum ve yükseltme tatbikatı

İki katmanlı tatbikat vardır:

1. **Bileşen tatbikatı (Docker gerekmez):** `infra/kurum-ici/denetle.sh` ve `infra/kurum-ici/tatbikat/tatbikat.sh`. Her değişiklikte çalıştırılabilir.
2. **Tam tatbikat (temiz sunucu):** bu belgedeki kontrol listesi; kurulum belgesi baştan sona, yalnız belgeye bakılarak yürütülür.

## 1. Bileşen tatbikatı: yapıldı (2026-10-27)

Ortam: geliştirme kapsayıcısı, PostgreSQL 16.15 + pgvector, Node.js 22.22. Çıktılar:

- [tatbikat/2026-10-27-yerel-pg16.txt](tatbikat/2026-10-27-yerel-pg16.txt) — **BAŞARILI**, 16 denetim:
  - Kurulum: eski sürüm (8 göçten ilk 7'si, 55 tablo) + kurum verisi.
  - Yükseltme: `vt-yedek.sh al` (özet doğrulandı) → `infra/uretim/goc.ts` → 8 göç, veri korundu; ikinci çalıştırma bir şey değiştirmedi.
  - Veriyle geri dönüş: `vt-yedek.sh don` → 7 göç, 55 tablo, yükseltme öncesi veri var, sonrası yok.
  - Bozuk yedek (1 bayt eklenmiş) reddedildi, veritabanına dokunulmadı; var olan yedeğin üzerine yazma reddedildi.
  - Dönüşten sonra yeniden yükseltme çalıştı.
  - Yerel model: 127.0.0.1'deki sahte OpenAI uyumlu sunucuya `yz-ayari.ts` ile istek gitti ve yanıt alındı (1 istek); `https://api.openai.com/v1` adresi istek atılmadan reddedildi.
- [tatbikat/2026-10-27-denetle.txt](tatbikat/2026-10-27-denetle.txt) — **BAŞARILI**, 44 denetim: betik sözdizimi, sürüm sabitleme, ağ yalıtımı (yalnız caddy dış ağda), `docker compose config` (Ollama ve vLLM profilleriyle), demet oluştur/doğrula/yükle ve değiştirilmiş demetin reddi (sahte `docker` ile), `yz-ayari.test.ts` (5 test). Helm `lint/template` **atlandı** (Helm yoktu).

## 2. Tam tatbikat: YAPILMADI

Bu İP'nin ortamında Docker sunucusu (daemon) çalışmıyordu, Docker Hub / GHCR / ollama.com / get.helm.sh erişimi kapalıydı, GPU ve temiz sunucu yoktu. Bu yüzden **imaj çekme, demet oluşturma (gerçek imajlarla), `kur.sh`, `yukselt.sh`, `geri-don.sh`, Caddy, Ollama, vLLM ve Helm kurulumu hiç çalıştırılmadı.** Kabul ölçütünün bu kısmı kurum (ya da proje sahibi) tarafından aşağıdaki listeyle yapılmalı ve sonucu `tatbikat/<tarih>-tam.txt` olarak eklenmelidir.

### Kontrol listesi (temiz Ubuntu 24.04 sanal makinesi, internetsiz)

Hazırlık makinesinde iki sürümün demeti (örn. `v0.3.0` ve `v0.4.0`; tek sürüm varsa ikinci demet aynı kodla `v0.3.1` etiketiyle üretilir) ve küçük bir model (`qwen2.5:7b`) hazırlanır. Sunucunun dışa çıkışı güvenlik duvarıyla kapatılır (`curl -m 5 https://example.org` zaman aşımı vermeli).

| # | Adım | Beklenen | Sonuç |
|---|---|---|---|
| 1 | kurulum.md 1: `demet-olustur.sh v0.3.0` | `SHA256SUMS`, `imajlar.txt` özetli | |
| 2 | kurulum.md 2: `demet-yukle.sh` | imajlar yüklü; 1 bayt değiştirilmiş kopya reddedilir | |
| 3 | kurulum.md 3: ayar dosyası | `docker compose config -q` hatasız | |
| 4 | kurulum.md 4: `kur.sh v0.3.0` | web sağlıklı, `https://<alan>/` 200 | |
| 5 | Panelde yönetici, birim, bir kanıt yükle | kanıt listede, özetli | |
| 6 | kurulum.md 6: `model-sor.ts` | Türkçe yanıt | |
| 7 | `docker compose exec isci wget -qO- -T 5 https://example.org` | **başarısız** (dışa çıkış yok) | |
| 8 | `model-olc.ts` | tablo üretildi, dosya saklandı | |
| 9 | Ölçüm sırasında sunucunun dış arabiriminde `tcpdump -i <dış> not port 443 and not port 22` | caddy dışında giden bağlantı yok | |
| 10 | yukseltme.md: `yukselt.sh v0.4.0` | yedek dosyası + `.sha256`, göçler, web sağlıklı, 5. adımdaki kanıt duruyor | |
| 11 | `geri-don.sh v0.3.0` (yalnız kod) | web sağlıklı, kanıt duruyor | |
| 12 | `yukselt.sh v0.4.0`, sonra yeni bir kanıt ekle, sonra `geri-don.sh v0.3.0 --yedek <dosya>` | yeni kanıt kayıtta yok, eskisi var; `geri-donus-oncesi-*.dump` oluştu | |
| 13 | Süreleri yaz | kurulum (adım 1–4) ve yükseltme (adım 10) dakika olarak | |

Kubernetes için aynı liste [kubernetes.md](kubernetes.md) adımlarıyla, 7. adım bir geçici podla yürütülür.
