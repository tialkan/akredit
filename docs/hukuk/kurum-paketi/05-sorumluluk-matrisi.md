# Sorumluluk matrisi

> **TASLAK, avukat incelemesi gerekir.** Katmanlar, docs/danismanlik/2026-10-28-dis-incelemeler.md'deki üç katmanlı karar modelindendir. Katman oranları `DOĞRULANMADI` (pilotta ölçülecek). Süreli varsayılan onayın hukuki dayanağı Senato yönergesidir; yönerge metni hukukçu incelemesi gerektirir (`DOĞRULANMADI`).

## Kim neyi onaylar

| Katman | Örnek iş | Kim onaylar | Kayıt | Hata olursa |
|---|---|---|---|---|
| 0 Tam otomatik | Resmî sistemde zaten onaylı verinin aktarılması, rutin indeksleme, eşiği geçen hesaplar | Onaya düşmez; dayanak kaynak sistemdeki onaydır | Değiştirilemez günlük (kaynak, zaman, özet) | Kaynak sistem hatası kaynağında düzeltilir; Akredit'te düzeltme yeni kayıtla yapılır, eski kayıt kalır. Hesap hatası yazılım hatasıdır: işletmeci düzeltir, etkilenen çıktılar yeniden üretilir ve kuruma bildirilir |
| 1 Süreli varsayılan onay | Önceki dönemden devreden Bologna, rutin özet, tutanak taslağı | İlgili öğretim elemanı ya da birim sorumlusu; süre dolunca kurum yönergesine dayanarak onaylanmış sayılır | Fark özeti, süre, yönerge dayanağı, devreden yetkilinin imzalı yetki devri politikası | Sorumlu itiraz ederse yeni kayıtla geri alınır. Süre dolup onaylanmış sayılan içerikten doğan sorumluluk yönergeye göre kurumda kalır (`DOĞRULANMADI`) |
| 2 Zorunlu karar | Eşik altı çıktı için önlem, müfredat/AKTS değişikliği, nihai rapor, dış kuruma gönderim | Yetkili kişi; devredilemez | Onaylayanın adı, zamanı, dayanağı (ilke 3) | Karar kişinindir; yazılım öneri sunar. Kararın düzeltilmesi yeni kararla yapılır |

## Yapay zekâ ve kişisel veri

| Olay | Sistem ne yapar | Kim karar verir |
|---|---|---|
| Yurt dışı izni yok | Yurt dışı hizmete hiçbir istek gitmez; "reddedildi" çıkış kaydı | Kurum yöneticisi izni adıyla açabilir |
| Maskelenemeyen şüpheli içerik | Çağrı yapılmaz; iş "insan incelemesi"ne düşer; "engellendi" kaydı | Yetkili, içeriği temizler ya da kurum içi modeli seçer |
| Maskeleme bir kişisel veriyi kaçırdı | Çıkış kaydından ilgili çağrılar bulunur | Kurum ihlal değerlendirmesi yapar (m. 12, `DOĞRULANMADI`); işletmeci Madde 3/6 süresinde bildirir ve deseni düzeltir |
| Silme talebi | Kişiye özgü anahtar silinir, günlüğe "silme uygulandı" kaydı eklenir | Kurumun yetkilisi talebi onaylar; adı günlüğe girer |

## Sınır

Yazılım kurum adına beyanda bulunmaz, dış kuruma son gönderimi yapmaz (06-beyan-siniri.md).
