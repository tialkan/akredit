# @akredit/baglayicilar

Kurum sistemlerinden ve açık kaynaklardan veriyi hocadan istemeden almak için bağlayıcılar. Kapsam ve kabul ölçütleri: [`plan/ip/IP-05-baglayicilar.md`](../../plan/ip/IP-05-baglayicilar.md).

Ortak arayüz (`src/baglayici.ts`): ağ, bekleme ve zaman her zaman `DisBaglam` üzerinden gelir (`gercekBaglam()` gerçek ağ ve saat verir). Testlerde sahte bağlam kullanılır; birim testleri ağa çıkmaz.

## Bologna Bilgi Paketi (Proliz OBS)

- **Kaynak:** kurumun herkese açık Bologna sayfaları (`.../bologna/progLearnOutcomes.aspx`, `progCourseMatrix.aspx`, `progTYYCMatrix.aspx`, `progCourses.aspx`, `progCourseDetails.aspx`). Giriş gerekmez, yalnız okunur.
- **Kullanım:** `programiOku(adres, baglam, { dersler?, aralikMs?, zamanAsimiMs? })` → `BolognaVerisi` (`@akredit/cekirdek`). Denetim (`denetle`) `@akredit/cekirdek` içindedir.
- **Hız sınırı:** istekler sıralıdır; ilk istekten sonra her istekten önce varsayılan 350 ms beklenir. Zaman aşımı 20 sn. `User-Agent: Akredit (akreditasyon hazirligi; salt okuma)` (HTTP başlığı Latin-1 olmak zorunda olduğu için ASCII).
- **Kullanım koşulları:** sayfalar herkese açıktır; yine de kurumun bilgi işlem birimine haber verilmesi ve sunucuyu yormayacak aralıkla okunması önerilir. Kurumun kullanım koşulları DOĞRULANMADI.
- **Bilinen sınırlar:** ayrıştırıcı `apps/cli/lib/bologna.mjs` ile birebir aynı davranır (eşdeğerlik testi var). Proliz sayfa yapısı kuruma ya da sürüme göre değişirse tablolar bulunamaz ve boş sonuç döner; bu durum hata değil, denetimde bulgu olarak görünür. Yalnız `lang` ve `curSunit` parametreli program adresleri desteklenir.

## OBS not aktarımı

- **Kaynak:** OBS'den indirilen soru bazlı not dökümü (Excel ya da CSV). Dosya `@akredit/belge` ile `TabloVerisi`'ne çevrilir; bu paket dosya okumaz.
- **Kullanım:** `notAktar(tablo, { takmaAd, aracId?, aracAdi?, tur?, tamPuanlar?, profil? })` → `{ arac, puanlar, bulgular, profil }`.
- **Tespit:** başlık satırı ilk 15 satırda aranır (öğrenci numarası ve en az bir soru sütunu). Soru başlıkları: "S1", "Soru 1", "1. Soru", "1", "1a"; tam puan başlıkta "S1 (10)" ya da "S1/10" biçiminde, başlığın altındaki "Tam Puan" satırında ya da parametreyle verilir (öncelik: parametre, başlık, satır). "GR", "DZ", "Girmedi" değerli öğrencinin bütün puanları boş (`null`) olur.
- **Eşleme profili:** tanınmayan dökümler için `NotAktarimProfili` (JSON, `profilOku` ile doğrulanır) kurum düzeyinde kaydedilir. Tespit edilen profil de sonuçla döner, kaydedilebilir.
- **Kişisel veri:** öğrenci numarası yalnız çağıranın verdiği `takmaAd` işlevine gider (HMAC çağıranın işidir); ad sütunu hiç okunmaz. Bulgular hücre değerini değil, yalnız hücre adresini (`Sayfa!C5`) içerir.
- **Bilinen sınırlar:** binlik ayraçlı sayılar ("1.234,5") sayı sayılmaz. Birden çok sayfalı dosyada yalnız ilk sayfa (ya da profilde adı verilen sayfa) okunur. Toplam tutarlılığı 0,01 payla denetlenir; toplamda ağırlıklandırma varsa bulgu üretir.
