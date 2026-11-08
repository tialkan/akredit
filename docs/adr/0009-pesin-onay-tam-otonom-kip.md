# ADR 0009: Peşin onay ile tam otonom Bologna kipi

- **Tarih:** 2026-11-08
- **Durum:** kabul edildi (kurucu kararı)

## Bağlam

Kurucunun hedefi: öğretim elemanı başta bir kez "hallet" der, süreç kendi kendine biter, hoca sonunda yalnız raporu
görür; hata ya da itirazı olursa OBS'de kendisi düzeltir. 0.6-0.7'de akış iki yerde duruyordu: sayfada olmayan resmî
bilgi (değerlendirme yüzdesi, kaynak) teyidi ve OBS'ye kayıt onayı. Değişmez ilke 3 "beyan ve son gönderim insanda",
ilke 2 "uydurma yok" der; sunucu durumsuzdur, oturum hafızası yoktur.

## Karar

1. **Peşin onay bir kez, hocanın kendi sözüyle.** "hepsini yap ve kaydet", "sen hallet", "sormadan kaydet" gibi bir
   söz `akredit_basla`'da yakalanır. Asistan sözleşmeyi hocaya geri söyler: giriş ekranı dışında durak yok, bilinmeyen
   resmî bilgi uydurulmaz ve boş bırakılır, Onaya Gönder hocada, "dur" ile vazgeçilir.
2. **Onay metni araçtan araca taşınır ve kayda geçer.** `obs_ders_listesi`, `bologna_kopya_metni` ve
   `bologna_toplu_ozet` `pesinOnay` alır; sunucu `pesinOnayVar` ile sözde kayıt/yetki sözü olduğunu denetler, geçerliyse
   `hocayaSimdiSor: false` döner ve metni `pesinOnayKaydi` olarak yanıta yazar. Kayıt sözü olmayan metin onay sayılmaz;
   akış eski durakla sürer.
3. **Kapılar değişmez.** Teyitsiz değerlendirme yüzdesi ve doğrulanmamış kaynak peşin onayla da yazılmaz; EKSİK kalır ve
   son raporda listelenir. Ders kodu/dönem uyuşmazlığı (`dur`) ve ikinci geri okuma farkı döngüyü durdurur.
4. **"Kaydet" ile "Onaya Gönder" ayrılır.** OBS'de Kaydet, hocanın sonradan değiştirebileceği taslak kaydıdır ve peşin
   onayla yapılır. Onaya Gönder (birim/komisyon beyanı) her zaman hocanın kendi tıklamasıdır.

## Gerekçe

İlke 3'ün aradığı "insan kararı" peşin onayda vardır: hoca ne olacağını bilerek, kendi sözüyle onaylar; söz yanıtta
kayıtlıdır. İlke 2 kod kapılarıyla korunur, asistanın serbestliği artınca uydurma riski artmaz. Bu, ADR 0007'deki
"varsayılan onay, kayıtlı dayanakla" yaklaşımının MCP tarafındaki karşılığıdır.

## Sınırlar

Sunucu onay sözünün gerçekten hocadan geldiğini kanıtlayamaz; asistanın uydurmasına karşı tek koruma sözün hoca
sohbetinde görünür olması ve son raporda `pesinOnayKaydi` ile tekrar gösterilmesidir. Onay varsayılan değildir;
hoca söylemezse akış teyit ve kayıt durağıyla sürer.
