# Veri işleme sözleşmesi (kurum paketi sürümü)

> **TASLAK, avukat incelemesi gerekir.** Bu taslak, yurt dışı aktarım için Kurulca ilan edilen standart sözleşmenin yerine geçmez (K3, K4). Kaynak kodları için kaynaklar.md.

**Taraflar.** Veri sorumlusu: `[KURUM ADI]` ("Kurum"). Veri işleyen: `[İŞLETMECİ]` ("İşletmeci"). İşletmecinin tüzel kimliği `EKSİK`.

## Madde 1: Konu
İşletmeci, Kurumun akredit.org hizmetini kullanması sırasında kişisel veriyi yalnız Kurum adına ve Kurumun yazılı talimatıyla işler.

## Madde 2: Kapsam
Amaç: kalite güvencesi ve akreditasyon süreçlerinin yürütülmesi. Veri kategorileri, amaçlar, alıcılar ve aktarımlar Ek-1'deki veri akış envanterindedir (veri-akis-envanteri.md). Envanter yazılımdan üretilir; yazılım değişince yeniden üretilir ve Kuruma bildirilir.

## Madde 3: İşletmecinin yükümlülükleri
1. Veriyi kendi amacı için kullanmaz, satmaz, model eğitiminde kullanmaz ve kullandırmaz.
2. Öğrenci kimliklerini takma adla (HMAC) tutar; eşleme ve kişiye özgü anahtarları ayrı saklar.
3. **Çıkış kapısı.** Kurum dışındaki ya da yurt dışındaki yapay zekâ hizmetine giden her içeriği zorunlu çıkış kapısından geçirir: kişisel veri maskelenir; maskelenemeyen şüpheli içerik gönderilmez ve insan incelemesine düşer; her çağrı için değer içermeyen çıkış kaydı tutulur.
4. Kurum yurt dışı yapay zekâ iznini vermedikçe yurt dışındaki bir hizmete hiçbir içerik göndermez. İzin, verenin adı, zamanı ve dayanağıyla değiştirilemez günlüğe yazılır.
5. Personelini gizlilik yükümlülüğüne bağlar; Ek-2 tedbirlerini uygular.
6. Veri ihlalini öğrenir öğrenmez ve en geç `[__] saat` içinde Kuruma bildirir. Kurula bildirimin yasal süresi `DOĞRULANMADI` (K11).
7. İlgili kişi başvurularını Kuruma iletir; Kurumun 30 günlük süresine (K7) uyabilmesi için `[__] gün` içinde destek verir.
8. Kurumun denetim hakkına makul ölçüde katlanır.

## Madde 4: Alt veri işleyenler
1. Liste Ek-3'tedir; yapay zekâ sağlayıcısı Kurumun ayarlarda seçtiği hizmettir (envanterdeki "Yapay zekâ işleme" satırları).
2. Yeni alt veri işleyen en az `[30] gün` önce bildirilir; Kurum itiraz edebilir.

## Madde 5: Yurt dışı aktarım
Tasarım gereği yurt dışındaki hizmete kişisel veri aktarılmaz (Madde 3/3). Kurum maskesiz aktarıma karar verirse aktarım 6698 m. 9 ve Yönetmelikteki mekanizmalardan biriyle yapılır (K3); standart sözleşme notu: 02-standart-sozlesme-kullanim-notu.md.

## Madde 6: Saklama ve silme
1. Sözleşme bitince veriler Kurumun seçimiyle iade edilir ve `[__] gün` içinde silinir ya da anonim hale getirilir.
2. Değiştirilemez kayıtlarda silme, kişiye özgü anahtarın silinmesiyle (kriptografik silme) yapılır; günlüğe yeni bir "silme uygulandı" kaydı eklenir (saklama-imha-politikasi.md). Hukuki niteliği `DOĞRULANMADI`.
3. Silme kayıtları en az 3 yıl saklanır (K7).

## Madde 7: Beyan ve sorumluluk
1. Yazılım kurum adına beyanda bulunmaz, dış kuruma son gönderim yapmaz; bu kararlar Kurumun yetkilisindedir (06-beyan-siniri.md, 05-sorumluluk-matrisi.md).
2. Tarafların sorumluluğu `[...]`. Veri güvenliğinde birlikte sorumluluk (m. 12): `DOĞRULANMADI`.

## Madde 8: Süre, fesih, uyuşmazlık
`[...]`

**Ekler.** Ek-1 Veri akış envanteri · Ek-2 Teknik ve idari tedbirler (şifreleme, satır güvenliği, değiştirilemez günlük, çıkış kapısı, en az yetki, yedekleme) · Ek-3 Alt veri işleyenler (`EKSİK`: barındırma kesinleşmedi).

İmzalar: `[...]`
