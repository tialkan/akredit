# Kişisel veri envanteri (taslak)

> **TASLAK — avukat incelemesi gerektirir.** Veri şeması `packages/vt` ile karşılaştırılarak doğrulanmalıdır (`EKSİK`).

| Süreç | İlgili kişi | Veri kategorisi | Amaç | Alıcı | Yurt dışı | Saklama |
|---|---|---|---|---|---|---|
| Hesap yönetimi | Personel | Kimlik, iletişim, rol | Erişim | İşletmeci | Hayır | Bkz. politika |
| Onay ve karar | Personel | Ad, zaman, dayanak | İspat | Kurum, denetçi | Hayır | Uzun |
| Kanıt yönetimi | Personel, belgede geçenler | Belge içeriği | Kalite güvencesi | YZ sağlayıcısı (maskeli) | Kurum seçimine bağlı | Kalıcı (ilke 4) |
| Ölçme (not aktarımı) | Öğrenci | Takma ad, notlar | ÇK/PÇ ölçümü | YZ (takma adlı, izinle) | Kurum seçimine bağlı | Dönem + `[__]` |
| Anket | Katılımcı | Yanıtlar | Değerlendirme | — | Kurum seçimine bağlı | `[__]` |
| Güvenlik | Tüm kullanıcılar | IP, zaman, işlem | Veri güvenliği | İşletmeci | Hayır | `[__]` |
| İletişim formu | Ziyaretçi | Ad, e-posta, ileti | Cevap | İşletmeci | `[barındırmaya bağlı]` | `[__]` |
