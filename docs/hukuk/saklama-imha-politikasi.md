# Saklama ve imha politikası

> **TASLAK — avukat incelemesi gerektirir.** Dayanak: Silme, Yok Etme veya Anonim Hale Getirme Yönetmeliği (K7). Politika yükümlülüğü VERBİS'e kayıtlı veri sorumlusu içindir; Akredit bunu kurum adına taslak olarak sunar.

## Saklama süreleri (taslak; kurum belirler)

| Veri | Süre | Gerekçe |
|---|---|---|
| Kullanıcı hesabı | Hesap kapanınca `[__]` | `[...]` |
| Onay ve karar kayıtları (kişi adıyla) | `[akreditasyon döngüsü + __ yıl]` | İspat (ilke 3) |
| Takma ad eşlemesi (öğrenci) | Ölçme dönemi + `[__]` ya da silme talebine kadar | En az veri |
| Anket yanıtları | `[__]` | |
| Erişim ve güvenlik günlükleri | `[__]` | Veri güvenliği |
| Silme işlem kayıtları | En az 3 yıl | K7 |

**Periyodik imha:** her `[__]` ayda bir; en çok 6 ay (K7).

## Silme yöntemleri

- **Silme:** ilişkisel kayıtların silinmesi (hesap, takma ad eşlemesi).
- **Kriptografik silme:** kişiye özgü anahtarın ve eşlemenin silinmesi; değiştirilemez günlük ve kanıt kayıtları dokunulmadan kimseyle ilişkilendirilemez hale gelir. Anonim hale getirme sayılıp sayılmadığı: `DOĞRULANMADI` (avukat görüşü).
- **Yedekler:** yedek dönüşüm süresi `[__]` sonunda silinmiş veriler yedeklerden de düşer.

## Silme talebi akışı

1. İlgili kişi kuruma başvurur; işletmeciye gelen başvuru kuruma iletilir.
2. Kurum yetkilisi talebi platformda kaydeder; talep günlüğe eklenir.
3. Yetkili, işleme şartlarının sürüp sürmediğini değerlendirir ve adıyla onaylar ya da gerekçeli reddeder (ilke 3).
4. Onaylanırsa: eşleme ve anahtar silinir; günlüğe "silme uygulandı" kaydı **eklenir**. Mevcut kayıtlar değiştirilmez.
5. Veri işleyenlere (YZ sağlayıcısı dahil) bildirim yapılır.
6. Kişiye 30 gün içinde yazılı ya da elektronik cevap verilir (K7).
7. Silme kaydı en az 3 yıl saklanır.

Ürün içi uygulama ve testi `EKSİK` (bkz. `docs/raporlar/IP-28.md`).
