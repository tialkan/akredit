# KVKK uyum analizi

> **TASLAK — avukat incelemesi gerektirir.** Atıflar [kaynaklar.md](kaynaklar.md) kodlarına yapılır. Kanun madde içerikleri resmî metinden doğrulanamamıştır (K11: `DOĞRULANMADI`).

## 1. Roller

| Taraf | Rol (önerilen) | Gerekçe |
|---|---|---|
| Yükseköğretim kurumu | Veri sorumlusu | İşleme amacını (kalite güvencesi, akreditasyon) ve araçlarını (hangi veri, hangi YZ sağlayıcısı) kurum belirler. |
| Akredit işletmecisi `[İŞLETMECİ]` | Veri işleyen | Kurum adına, kurumun talimatıyla işler; veriyi kendi amacı için kullanmaz. |
| YZ sağlayıcısı (kurumun seçtiği) | Alt veri işleyen | İşletmeci üzerinden ya da kurumun kendi anahtarıyla (BYOK) çağrılır. |
| akredit.org ziyaretçisi, hesap sahibi (hesap güvenliği, faturalama dışı) | İşletmeci veri sorumlusudur | Tanıtım sitesi, iletişim formu, hesap güvenlik günlükleri işletmecinin kendi amacıdır. |

Rol belirlemesi somut olaya göre yapılır (K10). BYOK düzeninde YZ sağlayıcısıyla sözleşme ilişkisi kurumla doğrudan kurulabilir; bu durumda sağlayıcı kurumun doğrudan veri işleyeni olur. Avukat hangi modelin geçerli olduğunu kurum bazında netleştirmelidir.

## 2. Veri kategorileri ve önerilen hukuki sebepler

Hukuki sebep adları 6698 m. 5'e dayanır (K11: `DOĞRULANMADI`). Kesin seçim kurumun hukuk biriminindir.

| Kategori | Örnek | Önerilen dayanak (taslak) |
|---|---|---|
| Kullanıcı kimlik ve iletişim | ad, kurumsal e-posta, birim, rol | Sözleşmenin ifası / veri sorumlusunun meşru menfaati / kanunlarda öngörülme (kurum iç mevzuatı) |
| İşlem güvenliği | giriş zamanı, IP, erişim günlüğü | Hukuki yükümlülük (veri güvenliği, m. 12) ve meşru menfaat |
| Öğrenci not ve başarı verisi | takma adlı (HMAC) öğrenci kimliği, notlar | Kurumun kanunlarda öngörülen görevleri; `DOĞRULANMADI` — yükseköğretim mevzuatı araştırılmadı |
| Anket yanıtları | ders/program değerlendirme | Açık rıza ya da kurumun kalite güvencesi görevi; açık rıza seçilirse ayrı açık rıza metni şart (K8) |
| Kanıt belgelerindeki kişisel veriler | toplantı tutanağındaki adlar | Kurumun hukuki yükümlülüğü / meşru menfaat |

Özel nitelikli veri (sağlık, engellilik vb.) işlenmesi amaçlanmaz. Kanıt belgelerinde bulunabilir; 7499 ile bu şartlar değişti (K2), avukat incelemeli.

## 3. Uyum kontrol listesi

| # | Konu | Durum | Not |
|---|---|---|---|
| 1 | Veri işleme sözleşmesi | Taslak | [veri-isleme-sozlesmesi.md](veri-isleme-sozlesmesi.md) |
| 2 | Aydınlatma metinleri ayrı, "okudum, anladım" teyitli | Taslak | K8'e göre; açık rıza metni ayrıdır |
| 3 | Saklama ve imha politikası, 6 ayı aşmayan periyodik imha | Taslak | K7 |
| 4 | Silme talebinin 30 gün içinde sonuçlanması ve 3 yıl kaydı | Taslak politika; ürün akışı `EKSİK` | K7; aşağı bkz. 4 |
| 5 | Veri envanteri | Taslak | [veri-envanteri.md](veri-envanteri.md) |
| 6 | VERBİS değerlendirmesi | Taslak | K6 |
| 7 | Yurt dışı aktarım: standart sözleşme + 5 iş günü bildirimi | Taslak | K3, K4 |
| 8 | Kurum ayarlarında YZ sağlayıcısı açık seçimi ve kaydı | Ürün içi `EKSİK` | İlke 7 |
| 9 | Veri ihlali bildirim prosedürü | `EKSİK` | m. 12; süre `DOĞRULANMADI` |
| 10 | Veri dışa aktarma (ilgili kişi ve kurum) | Ürün içi `EKSİK` | |

## 4. Silme talebi ile değiştirilemez günlük çatışması

İlke 4 günlüğü yalnız eklenir tutar; K7 silme ister. Önerilen çözüm (kriptografik ayırma):

- Günlükte ve kanıt kayıtlarında öğrenci yalnız takma adla (HMAC) geçer; gerçek kimlik ile takma ad arasındaki **eşleme tablosu** ayrı tutulur.
- Silme talebinde eşleme satırı ve kişiye özgü anahtar silinir; günlüğe "silme talebi uygulandı" diye **yeni** bir kayıt eklenir (talep kimliği, zaman, onaylayan). Günlük zinciri ve SHA-256 özetleri değişmez.
- Sonuçta günlükteki takma ad kimseyle ilişkilendirilemez hale gelir. Bunun KVKK anlamında "anonim hale getirme" sayılıp sayılmayacağı avukat görüşü gerektirir (`DOĞRULANMADI`).
- Kullanıcı adının (personel) günlükteki onay kayıtlarında kalması ilke 3 gereğidir; bunun saklama gerekçesi (ispat yükü, hukuki yükümlülük) avukatça teyit edilmelidir.

Bu akışın kodu ve testi `packages/vt` içinde yazılmalıdır; İP-28'in yolları dışındadır. Sonraki İP'ye devredilmiştir.

## 5. Yapay zekâ özelinde

- Model çıktıları insan onayından geçer (ilke 3); K10'daki insan doğrulaması önerisiyle uyumludur.
- Kurum verisi modeli eğitmek için kullanılmaz; sağlayıcı sözleşmesinde eğitim dışı tutma şartı aranmalı (`DOĞRULANMADI`: sağlayıcı koşulları incelenmedi).
- Maskeleme varsayılan açıktır; maskesiz gönderim yalnız kurum ayarıyla (ilke 7).
