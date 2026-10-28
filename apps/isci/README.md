# @akredit/isci

Arka plan işleri (pg-boss): kanıt hattı, bağlayıcı eşitlemeleri, süreç motoru (takvim, hatırlatma, yükseltme), bildirim e-postaları, günlük zinciri doğrulaması, rapor üretimi.

- Giriş noktası: `node apps/isci/src/ana.ts` (sağlık: `GET /saglik`, 8080). Ortam değişkenleri ve kuyruklar: [`docs/raporlar/IP-36.md`](../../docs/raporlar/IP-36.md).
- Uçtan uca sınama (gerçek PostgreSQL + pg-boss): `bash infra/gelistirme/isci-uctan-uca.sh`.

Kapsam: [`IP-10`](../../plan/ip/IP-10-kanit-hatti.md), [`IP-14`](../../plan/ip/IP-14-surec-motoru.md), [`IP-36`](../../plan/ip/IP-36-isci-calisma.md).
