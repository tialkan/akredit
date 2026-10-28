# 0006: Başka kurumdan örnek ayrı bir türdür ve kanıt değildir

- **Durum:** kabul
- **Tarih:** 2026-10-28
- **İP:** İP-37

## Bağlam

İP-37 ile kanıt avcısı web aramasıyla başka üniversitelerin örnek uygulamalarını bulur. Bu sayfalar hocaya fikir verir, ama kurumun yaptığı bir şeyi göstermez. Kanıt havuzuna ya da rapora karışırsa "kanıtsız iddia yok" ilkesi (CLAUDE.md, ilke 1) dolaylı yoldan delinir: başka kurumun faaliyeti bizim kanıtımız gibi görünür.

## Karar

1. Web aramasının sonucu `dis_ornek` adlı ayrı bir öneri türüdür (risk: orta). İçeriği `kanitDegildir: true` taşır, kanıta atıf (`atiflar`) taşımaz, hedefi kanıt olamaz.
2. Veritabanı son savunma hattıdır (`0011_dis_ornek.sql`): (a) bu kurallara uymayan `dis_ornek` önerisi eklenemez; (b) `dis_ornek` önerisine verilen karar kanıt-ölçüt bağlantısının dayanağı olamaz; (c) kaynağı dış örnek olan kanıt kaydı eklenemez.
3. Servis katmanında rapora/matrise kanıt girerken `raporKanitiDenetle` kullanılır; dış örnek kimliği "kural ihlali" verir.
4. Eksik giderme taslağında dış örneklerin metni modele gönderilmez; yalnız kaynakça (adres, başlık, erişim zamanı) olarak listelenir. Taslakta bir dış örneğin cümlesine çok benzeyen (Jaccard ≥ 0,6) cümle varsa uyarı verilir.
5. Web araması yalnız kurum yurt dışı YZ iznini vermiş ve `yz.webArama.acik` ayarını açmışsa yapılır; istek başına sonuç kurum tavanıyla (en çok 10) sınırlıdır. Yanıttan yalnız `url_citation` notları alınır; modelin özet metni kullanılmaz.

## Sonuçlar

- Hoca dış örneği "işe yarar" diye onaylayabilir; bu onay yalnız "kaynak olarak tut" anlamına gelir, hiçbir yerde kanıt sayılmaz.
- Yeni bir öneri türü eklendiği için `@akredit/cekirdek` `OneriTuru`, `@akredit/vt` şema enum'u, servis şemaları ve web etiketleri güncellendi.
- Kurumun kendi sitesinden taranan belgeler ise kanıttır: adres, erişim zamanı ve SHA-256 ile kanıt havuzuna girer, ölçüte bağlanması yine insan onayıyla olur.
