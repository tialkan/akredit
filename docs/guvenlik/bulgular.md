# Güvenlik bulguları

Sürüm: İP-27, 2026-10-27. Kaynaklar: `docs/raporlar/inceleme-dalga-1.md`, `-2.md`, `-3.md` ve İP-27 çalışması.
Dış sızma testi bulguları geldiğinde bu tabloya `D-xx` kimliğiyle eklenir.

Önem: Kritik / Yüksek / Orta / Düşük / Bilgi. **Kural:** Kritik ya da Yüksek önemde açık bulgu varken
üretime çıkılmaz.

## Açık

| Kimlik | Önem | Bulgu | Öneri / sahip |
|---|---|---|---|
| G-27-2 | **Yüksek** | Kurum içi kurulum (`infra/kurum-ici/docker-compose.yml`, Helm `vt.yaml`) web ve işçiyi hâlâ `POSTGRES_USER` (süper kullanıcı) ile bağlıyor. Barındırılan kurulumda kapandı (D3-1), kurum içinde değil. | `kur.sh` parola üretimine `UYGULAMA_VT_*` eklenmeli, `02-uygulama-kullanicilari.sh` demete konmalı, Helm'de ayrı gizli. İP-34 sahibi yollar; ayrı İP. Kurum içi sürüm bu kapanmadan dağıtılmamalı. |
| G-27-1 | Orta | Sayfa geneli içerik güvenlik politikası (CSP) yok. Caddy diğer başlıkları koyuyor; Next.js sayfaları CSP'siz. | Next.js ara katmanında istek başına nonce'lu `script-src 'nonce-…' 'strict-dynamic'`; önce `Content-Security-Policy-Report-Only` ile bir hafta. |
| D3-2 | Orta | MCP `oneri_olustur` `soru_cikti_eslemesi`/`rapor_bolumu` türünü yazabiliyor; ders dosyası akışı engellenebilir. | Bu iki türü MCP'den çıkar ya da servis yalnız `ureticiTuru: kural` kaydı seçsin (`apps/mcp`, `packages/servis`). |
| D3-3 | Orta | MCP kurum düzeyi kanıta öneriyi "bulunamadı" diye reddediyor (işlevsel). | `apps/mcp` |
| D3-4 | Orta | Gösterge panosu örnek veriyle; elle girilen değerin kanıtı onaylı mı denetlenmeli. | İP-21 devamı |
| D2-1 | Orta | Var olan kullanıcı kurumsal girişle bağlanamıyor (`trustedProviders` yok sayılıyor). İşlevsel, açık değil. | Varsayılan sağlayıcılara `domainVerified: true` + test |
| D2-2 | Orta | Çerçeve başlıkları resmî metin olarak doğrulanmamış (ilke 6). Güvenlik değil, doğruluk. | `baslikDurumu` alanı; resmî belge içe aktarımı (insan işi) |
| D3-5 | Düşük | KİDR, BİDR bölüm metnini sayı denetiminden geçirmeden aktarıyor. | `cumleDenetle` KİDR'de de |
| D3-6 | Düşük | Portal soru/yanıtı günlüğe tam metin (ilke 7). | Maskele ya da özetle |
| D3-7 | Düşük | Bologna taslağında model kaynaklı yüzde/saat politikayla onaylanabilir. | Politikada `bologna_taslagi` için insan şartı |
| D3-8 | Düşük | ÖDR sayı denetimi atıflı kanıtın dosya adındaki rakamı izinli sayıyor. | Dosya adını dayanaktan çıkar |
| G-27-3 | Düşük | Üretim imajları `surumler.env`'de henüz özetle (`@sha256`) sabit değil; CI hizmet imajı yalnız kesin etiketle (`pgvector/pgvector:0.8.0-pg17`). Bu ortamdan kayıt defterine erişilemedi. | Ağ erişimli ortamda `infra/uretim/imaj-sabitle.sh`; CI imajına özet ekle |
| G-27-4 | Düşük | Hız sınırı süreç içi bellek; çok örnekli dağıtımda örnek başına. | Caddy `rate_limit` ya da paylaşılan sayaç |
| G-27-5 | Bilgi | OIDC isteğinde nonce yok (`@better-auth/sso` 1.7). PKCE + state + tek kullanımlık kod testle gösterildi. | Kütüphane desteklerse aç |

## Bu İP'de kapananlar (testle)

| Kimlik | Önem | Bulgu | Düzeltme | Test |
|---|---|---|---|---|
| D3-1 | Yüksek | Barındırılan üretimde web, işçi ve exporter süper kullanıcıyla bağlanıyordu. | Göç `0008_oturum_rolu.sql` (`akredit_oturum`), `infra/uretim/postgres/02-uygulama-kullanicilari.sh`, compose bağlantıları | `packages/vt/test/oturum-rolu.test.ts` (PGlite); ayrıca gerçek PostgreSQL 16 + pgvector üzerinde init betiği ve dokuz göç çalıştırıldı: uygulama kullanıcısı süper değil, RLS atlamıyor, tetikleyici kapatamıyor ("must be owner"), günlük silemiyor, kurum ayarsız 0 satır, kiracı işlemine geçebiliyor, şema kurabiliyor; izleme kullanıcısı kimlik tablolarını okuyamıyor. Docker Compose ile uçtan uca dağıtım denenmedi. |
| D1-4 | Düşük | Yazıyla sayı ("beş toplantı", "yüzde kırk") sayı güvencesinden kaçıyordu. | `sayilariCikar` yazıyla sayı çözümü | `packages/yz/test/sayi-kalkan.test.ts` |
| D1-5 | Düşük | KVKK maskesi sabit hat telefonu kapsamıyordu. | `TELEFON` deseni 2xx–5xx ve 850 | `packages/yz/test/kvkk.test.ts` |
| D2-4 | Düşük | ZIP'te boyutu küçük bildirilen girdi kesilip kanıt olabiliyordu. | CRC-32 + boyut denetimi (`belge/zip.ts`, `isci/kanit-hatti/alma.ts`) | `belge/test/guvenlik.test.ts`, `isci/.../birim.test.ts` |
| D2-5 | Düşük | S3 409 "zaten var" sayılıyordu. | 409'da `varMi` doğrulaması | `depo/test/depo.test.ts` |
| D2-6 | Düşük | SigV4 kanonik başlıkta iç boşluk sıkıştırılmıyordu. | Ardışık boşluk tek boşluğa | `depo/test/depo.test.ts` |
| D2-7 | Düşük | Davet kabulü atomik değildi. | `UPDATE … WHERE kabul_zamani IS NULL RETURNING` ile sahiplenme, hata olursa geri bırakma | `apps/web/src/kimlik/yonetim.test.ts` (eski kod da tekillik kısıtı sayesinde geçiyordu; test artık kaybedenin 404 aldığını ve var olan üyenin ikinci davetini sınar) |
| D2-8 | Düşük | CI eylemleri sürüm etiketiyle. | Eylemler zaten 40 haneli SHA ile (İP-26), `denetle.sh` denetliyor; CI VT imajı kesin etikete alındı (özet: G-27-3) | `infra/uretim/denetle.sh` |
| D2-9 | Bilgi | İmzasız SAML, XSW ve OIDC nonce/tekrar testleri yoktu. | Testler eklendi; davranış doğru çıktı | `saml.test.ts` (imzasız, imzalı içerik değiştirme, XSW, yeniden gönderim), `oidc.test.ts` (kod enjeksiyonu, yeniden oynatma) |

## Daha önce kapananlar

Dalga 1 #1, #2, #3, #6, #7; dalga 2 #3 (gitleaks izin listesi `.gitleaks.toml`, İP-27'de doğrulandı);
dalga 3'te düzeltilenler (raporlarda "Düzeltilenler").
