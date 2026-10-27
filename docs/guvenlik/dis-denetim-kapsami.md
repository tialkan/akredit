# Bağımsız sızma testi: kapsam ve teklif isteme taslağı

Sürüm: İP-27, 2026-10-27. **Bu iş insan işidir** (hizmet alımı): firma seçimi, sözleşme, gizlilik
sözleşmesi ve test izni Akredit yürütücüsünün kararıdır. Bu belge yalnız kapsamı ve gönderilecek metnin
taslağını verir. Yasal ifadeler (sözleşme, sorumluluk sınırı) hukuk danışmanınca yazılmalıdır.

## 1. Amaç

Akredit'in (akredit.org, çok kiracılı) ve kurum içi kurulumunun, OWASP ASVS 4.0.3 düzey 2'ye göre bağımsız
olarak sınanması; özellikle **kiracı yalıtımının** ayrıca sınanması (İP-27 kabul ölçütü).

## 2. Kapsam

| Alan | Ayrıntı | Öncelik |
|---|---|---|
| Kiracı yalıtımı | İki deneme kurumu (A, B) ve her rolde hesap verilir. A'dan B'nin kanıt, öneri, karar, günlük, anket, kişi verisine her yoldan (panel, `/api/v1`, MCP, imzalı indirme bağlantısı, e-posta onay bağlantısı, değerlendirici portalı) erişme, yazma, kimlik karıştırma | **Zorunlu, ayrı bölüm** |
| Kimlik doğrulama | Sihirli bağlantı, OIDC ve SAML (deneme IdP'si sağlanır), davet akışı, API anahtarları, oturum yönetimi | Yüksek |
| Yetki | Rol/kapsam atlatma, değerlendirici süre sonu, yüksek riskli kararın insan dışında verilmesi | Yüksek |
| Değiştirilemezlik | Kanıt, karar, günlük kayıtlarının değiştirilmesi/silinmesi; özet zincirinin kırılması | Yüksek |
| Dosya işleme | Kanıt yükleme (PDF, OOXML, ODF, ZIP, görüntü), e-posta ile kanıt alma; bomba, yol geçişi, ayrıştırıcı açıkları | Yüksek |
| YZ | Dolaylı istem enjeksiyonu (belge, e-posta) ile veri sızdırma, yetkisiz araç çağrısı, uydurma sayının rapora girmesi, kişisel verinin maskesiz yurt dışına çıkması | Yüksek |
| Web | XSS, CSRF, açık yönlendirme, güvenlik başlıkları, önbellek | Orta |
| Altyapı | Barındırılan sunucu dış yüzeyi (TLS, açık kapılar), kapsayıcı yapılandırması, VT rolleri (beyaz kutu) | Orta |
| Kurum içi kurulum | Docker Compose demeti; Helm şablonları (yapılandırma incelemesi) | Orta |
| CLI (Akreddit) | Aktarım paketi işleme, yerel veritabanı | Düşük |

**Kapsam dışı:** Kurum IdP'leri, YZ sağlayıcılarının kendi altyapısı, sosyal mühendislik, hizmet
engelleme (yük testi yalnız önceden kararlaştırılan zaman diliminde ve hazırlık ortamında).

## 3. Yöntem ve ortam

- Gri kutu: kaynak kodu (açık kaynak, Apache-2.0) ve `docs/guvenlik/` belgeleri verilir.
- Hazırlık ortamı (`dagit.sh hazirlik`), üretimle aynı sürüm; gerçek kişisel veri yok, uydurma tohum verisi.
- Süre: 10–15 adam-gün (öneri; firma kendi tahminini verir).
- Raporlama: Her bulgu için önem (CVSS 3.1 ya da 4.0), yeniden üretme adımları, etkilenen bileşen ve
  ASVS madde eşlemesi. Kritik bulgu bulunduğu gün bildirilir.
- Yeniden test: Düzeltmelerden sonra bir tur yeniden test teklife dahil olmalı.

## 4. Teslim edilecekler

1. Yönetici özeti (Türkçe) ve teknik rapor.
2. ASVS L2 kontrol listesinin denetçi tarafından doldurulmuş hâli (`asvs-l2.md` ile karşılaştırılır).
3. Kiracı yalıtımı için ayrı bölüm: denenen yollar ve sonuçları.
4. Yeniden test raporu.

Bulgular `docs/guvenlik/bulgular.md` tablosuna `D-xx` olarak işlenir; kritik/yüksek kapanmadan üretime çıkılmaz.

## 5. Teklif isteme taslağı (e-posta)

> **Konu:** Sızma testi teklif isteği: Akredit (yükseköğretim kalite güvencesi platformu)
>
> Merhaba,
>
> Akredit, yükseköğretim kurumlarının kalite güvencesi ve akreditasyon süreçlerini yürüten açık kaynak,
> çok kiracılı bir web platformudur (Next.js, PostgreSQL satır güvenliği, S3 uyumlu depo, YZ katmanı).
> Üretime çıkmadan önce bağımsız bir sızma testi yaptırmak istiyoruz.
>
> Kapsam ve beklentilerimiz ekteki "Bağımsız sızma testi: kapsam" belgesindedir. Özetle:
> - OWASP ASVS 4.0.3 düzey 2'ye göre gri kutu test,
> - kiracılar arası veri yalıtımının ayrı bir bölüm olarak sınanması,
> - kurumsal tek oturum (OIDC, SAML), dosya yükleme ve yapay zekâ istem enjeksiyonu senaryoları,
> - bulgu raporu ve düzeltmeler sonrası bir tur yeniden test.
>
> Tekliflerinizde şunları rica ederiz:
> 1. Toplam ücret ve adam-gün dağılımı, yeniden test ücreti,
> 2. Önerilen takvim (başlangıç ve rapor tarihi),
> 3. Testi yapacak ekibin deneyimi ve sertifikaları (ör. OSCP, OSWE, CREST) ile benzer iş referansları,
> 4. Raporlama örneği (anonimleştirilmiş),
> 5. Veri gizliliği ve test verisinin imhası konusundaki uygulamanız,
> 6. Sorumluluk sigortası bilgisi.
>
> Test ortamı Türkiye'deki hazırlık sunucumuzda olacaktır; gerçek kişisel veri içermez.
> Teklifleri [TARİH] tarihine kadar [E-POSTA] adresine bekliyoruz.
>
> Saygılarımızla,
> [AD SOYAD], [UNVAN]

Köşeli parantezli yerler gönderen tarafından doldurulur. Belge ekine bu dosyanın 1–4. bölümleri konur.

## 6. İnsan kararı gereken adımlar

- [ ] En az üç firmadan teklif istemek, seçmek.
- [ ] Gizlilik ve test izni sözleşmesini imzalamak (hukuk).
- [ ] Hazırlık ortamını, deneme IdP'sini ve hesapları hazırlamak.
- [ ] Rapor geldikten sonra bulguları `bulgular.md`'ye işlemek, kritik/yüksek kapanınca üretim kararını vermek.
