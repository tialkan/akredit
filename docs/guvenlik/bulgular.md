# Güvenlik bulguları

Sürüm: İP-27, 2026-10-27; açık bulgu düzeltmeleri (dal `duzeltme/acik-bulgular`), 2026-10-27. Kaynaklar: `docs/raporlar/inceleme-dalga-1.md`, `-2.md`, `-3.md` ve İP-27 çalışması.
Dış sızma testi bulguları geldiğinde bu tabloya `D-xx` kimliğiyle eklenir.

Önem: Kritik / Yüksek / Orta / Düşük / Bilgi. **Kural:** Kritik ya da Yüksek önemde açık bulgu varken
üretime çıkılmaz.

## Açık

| Kimlik | Önem | Bulgu | Öneri / sahip |
|---|---|---|---|
| D2-2 | Orta | Çerçeve başlıkları resmî metin olarak doğrulanmamış (ilke 6). Güvenlik değil, doğruluk. | `baslikDurumu` alanı; resmî belge içe aktarımı (insan işi) |
| D3-5 | Düşük | KİDR, BİDR bölüm metnini sayı denetiminden geçirmeden aktarıyor. | `cumleDenetle` KİDR'de de |
| D3-6 | Düşük | Portal soru/yanıtı günlüğe tam metin (ilke 7). | Maskele ya da özetle |
| D3-7 | Düşük | Bologna taslağında model kaynaklı yüzde/saat politikayla onaylanabilir. | Politikada `bologna_taslagi` için insan şartı |
| D3-8 | Düşük | ÖDR sayı denetimi atıflı kanıtın dosya adındaki rakamı izinli sayıyor. | Dosya adını dayanaktan çıkar |
| G-27-3 | Düşük | Üretim imajları `surumler.env`'de henüz özetle (`@sha256`) sabit değil; CI hizmet imajı yalnız kesin etiketle (`pgvector/pgvector:0.8.0-pg17`). Bu ortamdan kayıt defterine erişilemedi. | Ağ erişimli ortamda `infra/uretim/imaj-sabitle.sh`; CI imajına özet ekle |
| G-27-4 | Düşük | Hız sınırı süreç içi bellek; çok örnekli dağıtımda örnek başına. | Caddy `rate_limit` ya da paylaşılan sayaç |
| G-27-5 | Bilgi | OIDC isteğinde nonce yok (`@better-auth/sso` 1.7). PKCE + state + tek kullanımlık kod testle gösterildi. | Kütüphane desteklerse aç |

Kritik ya da Yüksek önemde açık bulgu yok. Kalan doğrulama (bulgu değil): G-27-2 için `infra/kurum-ici/denetle.sh` helm'li ve Docker sunuculu bir ortamda (helm lint/template, compose ile kurulum ve eski sürümden yükseltme) bir kez çalıştırılmalı; G-27-1 için ilk hafta `AKREDIT_CSP=rapor` ile ihlal raporları izlenmeli.

## Açık bulgu düzeltmelerinde kapananlar (testle, 2026-10-27)

| Kimlik | Önem | Bulgu | Düzeltme | Test |
|---|---|---|---|---|
| G-27-2 | Yüksek | Kurum içi compose ve Helm web/işçiyi süper kullanıcıyla bağlıyordu. | `infra/kurum-ici/postgres/02-uygulama-kullanicisi.sh` (yinelenebilir: yoksa açar, varsa parola/yetki eşitler; `NOSUPERUSER NOBYPASSRLS`, `akredit_oturum` üyesi; adı `POSTGRES_USER` ile aynıysa reddeder). Compose: `AKREDIT_VT_ADRES` → `UYGULAMA_VT_*`, betik initdb'ye bağlı; göç süper kullanıcıyla sürer. `parola.sh`: `kur.sh` boş gizlileri (`UYGULAMA_VT_PAROLA` dahil) üretir, dolu olana dokunmaz; `yukselt.sh` eski kurulumlarda kullanıcı adını/parolasını yazar ve göçten sonra kullanıcıyı açar. Demet `kurum-ici/` dizinini taşıdığından betik demettedir (denetle.sh denetler). Helm: `vt.uygulamaKullanici` (süper kullanıcıyla aynıysa `fail`), gizli nesnede `UYGULAMA_VT_PAROLA`, betik ConfigMap (kanca) + initdb bağı + `vt-kullanici` kanca işi (göçten sonra, eski kurulumlar için). | `infra/kurum-ici/vt-kullanici.test.ts` (denetle.sh 9. adım): compose/Helm bağlantıları, parola üretimi, ad reddi ve **gerçek PostgreSQL 16** üzerinde: kullanıcı süper değil, RLS atlamaz, `akredit_oturum` üyesi, ikinci çalıştırma hatasız, `ALTER TABLE … DISABLE TRIGGER` reddedilir. `helm` bu ortamda yok: `helm lint/template` çalıştırılmadı; Docker sunucusu yok: uçtan uca kurulum denenmedi. |
| G-27-1 | Orta | Sayfa geneli CSP yoktu. | `apps/web/src/proxy.ts` (Next 16 ara katmanı) + `src/guvenlik/csp.ts`: istek başına 16 baytlık nonce; `script-src 'self' 'nonce-…' 'strict-dynamic'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`, `style-src 'self' 'nonce-…'` + `style-src-attr 'unsafe-inline'` (yalnız öğe üstü stil; betik çalıştıramaz). Kök yerleşim `connection()` ile dinamik işlenir ki Next betiklere nonce eklesin. `AKREDIT_CSP=rapor` ile `Report-Only` kipi (ilk hafta için önerilen); varsayılan zorlar. | `src/guvenlik/csp.test.ts` (7 test); ayrıca `next build` + `next start` ile `/gizlilik` yanıtında başlık ve bütün `<script>`/stil bağlantılarında nonce görüldü. Tarayıcıda (Playwright) CSP ihlali taraması yapılmadı. |
| D3-2 | Orta | MCP `soru_cikti_eslemesi`/`rapor_bolumu` yazıp ders dosyası akışını engelleyebiliyordu. | İki tür MCP `ONERI_EYLEMI`'nden çıkarıldı; ders dosyası servisi `uretici.kanal = 'mcp'` kayıtları seçmez (derin savunma). | `apps/mcp/test/mcp.test.ts` (iki tür `gecersiz_istek`), `ders-dosyasi.test.ts` (açılışı taklit eden dış kanal kaydı onaylı eşleme/dosyayı gölgelemez; düzeltmesiz başarısız). |
| D3-3 | Orta | MCP kurum düzeyi (kapsamsız) kanıta öneriyi "bulunamadı" diye reddediyordu. | Kapsamsız kanıt kurum hedefine çözülünce kaydın varlığı ayrıca denetlenir; yetki kurum kapsamında. | `mcp.test.ts`: kabul; olmayan/uuid olmayan/başka kurum kanıtı `bulunamadi`; öğretim elemanı `yetki_yok`. |
| D3-4 | Orta | Gösterge panosu örnek veriyle çalışıyordu; elle değerin kanıt onayı denetlenmiyordu. | `@akredit/servis gosterge.gostergePanosu`: tanımlar `gosterge`, ham veri `gosterge_olcumu` (`kaynak = {anahtar, kaynak}`); elle değer yalnız kararla onaylanmış kanıt etiketi olan kanıtla hesaba girer; `saglanan_pc`/`toplam_pc` ölçme sonuçlarından `programPcHesapla` ile; elle "ölçme" verisi reddedilir; hesaba girmeyenler nedeniyle panelde listelenir. Panel gerçek kipte bunu kullanır (örnek kipte örnek veri). | `packages/servis/test/gosterge.test.ts` (elle doğrulanmış 72/80 = %90 ve 1/2 PÇ = %50; onaysız/olmayan kanıt; yetki ve kiracı yalıtımı). |
| D2-1 | Orta | Var olan kullanıcı kurumsal girişle bağlanamıyordu. | `sso({ domainVerification: { enabled: true } })`: kütüphane bağlamada `trustedProviders` değil `domainVerified` okuyor; ayardan gelen sağlayıcılar doğrulanmış sayılır, e-posta alan adı şartı korunur. (`defaultSSO`'ya alanı elle eklemek sağlayıcı parmak izini bozup bütün girişleri kırıyordu.) | `oidc.test.ts`: sihirli bağlantıyla açılmış hesap bağlanır (düzeltmesiz "account not linked"); başka alan adındaki var olan hesaba bağlanamaz. |

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
