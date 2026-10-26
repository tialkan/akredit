# Bağımsız inceleme: 2. dalga (İP-08…11)

Tarih: 2026-10-27. Dal: `inceleme/dalga-2`. Yöntem: kod ve testler doğrudan okundu, kütüphane kaynağı (better-auth 1.7.14, @better-auth/sso 1.7.14, fflate) gerektiğinde incelendi, `pnpm verify` çalıştırıldı; yazar raporlarına dayanılmadı.

## Düzeltilenler (testle kanıtlı)

1. **Kritik — Kurumsal giriş başka kurumun üyeliğini ele geçirebiliyordu (web/kimlik, kiracı yalıtımı).** Bir kurumun OIDC/SAML sağlayıcısı kendi alan adı dışındaki bir e-postayı (ör. B kurumunun henüz hesabı olmayan yöneticisi) bildirdiğinde hesap açılıyor, `uyelikleriBagla` bu hesabı B'nin üyeliğine bağlıyordu. Sağlayıcının `domain` alanı hiç denetlenmiyordu. Düzeltme: `sunucu.ts` içinde `user.create.before` (sağlayıcı kimliği varsa e-posta alan adı denetimi) ve `session.create.before` (kullanıcının her kurumsal hesabı için alan adı uyumu) eklendi; `epostaAlanAdiUyarMi`. Test: `oidc.test.ts` "kurum sağlayıcısı kendi alan adı dışındaki e-postayla başka kurumun üyeliğine bağlanamaz" (düzeltmeden önce başarısızdı).
2. **Yüksek — Kuruma özel e-posta adresinde gönderen taklidi (isci/kanıt hattı).** `gonderenDogrula`, DMARC geçmese de SPF + DKIM geçen iletiyi kabul ediyordu. SPF ve DKIM saldırganın kendi alan adı için geçer, From ile hizalı olmayabilir; kurum alan adında DMARC kaydı yoksa (`none`) taklit edilmiş kurum adresinden kanıt eklenebiliyordu. Düzeltme: yalnız `dmarc = pass`. Test: `birim.test.ts` e-posta testi (hizasız SPF/DKIM örneği).

Ayrıca eşzamanlı davet kabulü için gerileme testi eklendi (`yonetim.test.ts`, mevcut kod geçiyor).

## Açık bulgular (önem sırasıyla)

1. **Orta — Var olan kullanıcı kurumsal girişle bağlanamaz.** `accountLinking.trustedProviders` ayarı @better-auth/sso 1.7 tarafından yok sayılıyor (`trustProviderByName: false`); güven yalnız `domainVerified` sağlayıcıda verilir. Sihirli bağlantıyla hesabı açılmış kullanıcı sonra SSO ile giremez ("account not linked"). Düzeltme önerisi: varsayılan sağlayıcılara `domainVerified: true` vermek (alan adı denetimi artık bizim kancamızda da var) ve bunu testle göstermek. İşlevsel hata, güvenlik açığı değil.
2. **Orta — Çerçeve başlıkları resmî metin olarak doğrulanmamış.** `packages/cerceveler/src/veri.ts` YÖKAK kod ve başlıkları "web üzerinden okunan metin"den alındığını söylüyor, ama SHA-256 ve dosya yok; şema `metinDurumu` kuralını yalnız `metin` alanına uygular, `baslik` alanı denetimsiz. Başlıklar arayüzde resmî ad gibi görünebilir. Öneri: `baslikDurumu` alanı ya da başlıkların da `dogrulanmadi` rozetiyle gösterilmesi; resmî belge `kaynaklar/resmi/` altına konunca içe aktarmayla değiştirilmeli (insan işi §12/5).
3. **Orta — CI gizli bilgi taraması test anahtarında düşebilir.** `apps/web/src/kimlik/test/fixtures/idp-anahtar.pem` (sahte IdP özel anahtarı) depoda; `.gitleaksignore`/`.gitleaks.toml` yok. Gitleaks `private-key` kuralı bu dosyayı bulur. Burada docker yok, doğrulanamadı. Öneri: anahtarı testte üretmek ya da yol bazlı izin listesi.
4. **Düşük — ZIP'te bildirilen boyut gerçek boyuttan küçükse içerik sessizce kesilir.** fflate açılmış boyutu merkez dizinden alır; boyutu kurcalanmış paket bombaya dönüşmez (denendi: 50 MB içerik 10 baytla sınırlandı) ama kesik dosya kanıt olarak kaydedilir. Öneri: yerel başlıktaki CRC-32 ile açılan veriyi karşılaştırıp uyuşmazsa reddetmek.
5. **Düşük — S3 409 yanıtı "zaten var" sayılıyor.** `s3.ts` `koy` 409'u (eşzamanlı koşullu yazım çakışması) yazılmış kabul ediyor; diğer yazım başarısız olursa kanıt satırı olmayan nesneye bağlanır. Öneri: 409'da `varMi` ile doğrulamak.
6. **Düşük — SigV4 kanonik başlıkta iç boşluklar sıkıştırılmıyor.** Yalnız `trim` yapılıyor; değerinde ardışık boşluk olan başlık (ör. elle verilen `content-type`) imza hatası verir. Şu an gönderilen başlıklarda sorun yok.
7. **Düşük — Davet kabulü atomik değil.** Davet okunup sonra işaretleniyor; eşzamanlı kabulde ikinci işlem kişi/üyelik tekillik kısıtına takıldığı için şimdilik tek atama oluşuyor (test eklendi), ama koruma dolaylı. Öneri: önce `UPDATE … WHERE kabul_zamani IS NULL RETURNING` ile daveti sahiplenmek.
8. **Düşük — CI eylemleri sürüm etiketiyle, imajlar `latest` ile.** `actions/*@v5`, `minio/minio:latest`, `mailpit:latest`; tedarik zinciri için SHA ile sabitlenmeli (İP-26/27).
9. **Bilgi — SAML imza sarma ve OIDC nonce kütüphaneye bırakılmış.** Testler yanlış anahtarla imzalı yanıtı ve değiştirilmiş `state`'i reddettiğini gösteriyor; imzasız assertion, sarma (XSW) ve nonce tekrarı için ayrı test yok. İP-27 sızma testinde ele alınmalı.

Denetlenip sorun bulunmayanlar: sihirli bağlantı tek kullanım ve davetsiz hesap reddi (testli); API anahtarı yetkisi kişinin rolleriyle kesişiyor, kurum düzeyi ve `karar.ver` anahtara verilemiyor, kullanıcı/anahtar yönetimi yalnız oturumla; kimlik tabloları uygulama rolüne kapalı; günlük ve kütüphane kayıtları `gizliAyikla`dan geçiyor; nesne anahtarı UUID/özet biçimiyle sınırlı (yol geçişi yok), yerel sürücü `wx` + `link` ile üzerine yazmıyor, S3 `If-None-Match: *` ve COMPLIANCE kilidi; yurt dışı YZ'ye izin yoksa çağrı yok, izin varsa maskeli; Dockerfile son aşamada kaynak/.env yok, kullanıcı `node`.

## Durum

`pnpm verify` temiz. web testleri 62 → 64, isci testleri 21 (bir test genişletildi).
