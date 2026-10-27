# Veri işleme sözleşmesi (şablon)

> **TASLAK — avukat incelemesi gerektirir.** Bu şablon yurt dışı aktarım için Kurulca ilan edilen **standart sözleşmenin yerine geçmez**; standart sözleşme değiştirilmeden ayrıca imzalanır ve beş iş günü içinde Kuruma bildirilir (K3, K4).

**Taraflar**
- Veri sorumlusu: `[KURUM ADI]`, adres `[...]`, KEP `[...]` ("Kurum")
- Veri işleyen: `[İŞLETMECİ]`, adres `[...]` ("İşletmeci")

## Madde 1 — Konu
İşletmeci, Kurumun akredit.org hizmetini kullanması sırasında Kurum adına ve yalnız Kurumun yazılı talimatıyla kişisel veri işler. Talimatlar bu sözleşme, hizmet ayarları ve Kurumun yazılı bildirimleridir.

## Madde 2 — İşlemenin kapsamı
Amaç: kalite güvencesi ve akreditasyon süreçlerinin yürütülmesi. Veri kategorileri ve ilgili kişi grupları Ek-1'dedir ([veri-envanteri.md](veri-envanteri.md)).

## Madde 3 — İşletmecinin yükümlülükleri
1. Veriyi kendi amaçları için kullanmaz, satmaz, model eğitiminde kullanmaz.
2. Öğrenci kimliklerini takma adla (HMAC) tutar; eşleme anahtarını ayrı saklar.
3. Personelini gizlilik yükümlülüğüne bağlar.
4. Ek-2'deki teknik ve idari tedbirleri uygular.
5. Veri ihlalini öğrenir öğrenmez, gecikmeksizin ve en geç `[__] saat` içinde Kuruma bildirir. Kuruma Kurula bildirim için gereken bilgiyi verir (yasal süre `DOĞRULANMADI`, K11).
6. İlgili kişi başvurularını Kuruma iletir; Kurumun 30 günlük cevap süresine uyabilmesi için `[__] gün` içinde destek verir (K7; m. 13 `DOĞRULANMADI`).
7. Kurumun denetim hakkına makul ölçüde katlanır.

## Madde 4 — Alt veri işleyenler
1. Güncel liste Ek-3'tedir. YZ sağlayıcısı Kurumun hizmet ayarlarında açıkça seçtiği sağlayıcıdır; seçim ve değişiklik, seçenin adı ve zamanıyla değiştirilemez günlüğe yazılır.
2. İşletmeci yeni alt veri işleyeni en az `[30] gün` önceden bildirir; Kurum itiraz edebilir.
3. Kişisel veri, Kurum açıkça izin vermedikçe yurt dışındaki YZ sağlayıcısına maskelenmeden gönderilmez.

## Madde 5 — Yurt dışı aktarım
Aktarım yalnız 6698 m. 9 ve Yönetmelikteki mekanizmalardan biriyle yapılır (yeterlilik kararı, uygun güvence ya da arızi aktarım; K3). Standart sözleşme kullanılırsa imzayı izleyen beş iş günü içinde Kuruma bildirimin hangi tarafça yapılacağı: `[KURUM / İŞLETMECİ]` (K4).

## Madde 6 — Saklama, iade ve silme
1. Sözleşme sona erince İşletmeci, Kurumun seçimiyle verileri makine tarafından okunabilir biçimde iade eder ve `[__] gün` içinde siler ya da anonim hale getirir.
2. Kanıt dosyaları ve değiştirilemez günlük kayıtları için silme, takma ad eşlemesi ve anahtarların silinmesi yoluyla yapılır; günlüğe silme kaydı eklenir ([saklama-imha-politikasi.md](saklama-imha-politikasi.md)).
3. Silme işlemlerinin kaydı en az 3 yıl saklanır (K7).

## Madde 7 — Sorumluluk
Tarafların sorumluluğu `[...]`. Veri güvenliğinde veri işleyenin veri sorumlusuyla birlikte sorumluluğu kanundan doğar (m. 12, `DOĞRULANMADI`).

## Madde 8 — Süre ve fesih
Ana hizmet sözleşmesiyle aynı süre. `[...]`

## Madde 9 — Uyuşmazlık
`[...]` mahkemeleri ve icra daireleri.

**Ekler:** Ek-1 Veri envanteri · Ek-2 Teknik ve idari tedbirler (şifreleme, satır güvenliği, erişim günlüğü, en az yetki, yedekleme) · Ek-3 Alt veri işleyenler (`EKSİK`: barındırma ve YZ sağlayıcıları henüz kesinleşmedi)

İmzalar: `[...]`
