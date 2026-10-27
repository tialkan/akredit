# Proliz Bologna canlı sınama (obs.ebyu.edu.tr/oibs/bologna, EBYÜ Hukuk curSunit=57, 2026-10-27)

Gerçek `@akredit/baglayicilar` ayrıştırıcısı (esbuild ile paketlenip) tarayıcıda canlı sayfalara uygulandı.

| Sayfa | Durum | Sonuç |
|---|---|---|
| progLearnOutcomes.aspx (23 KB) | 200 | DOĞRU: 10 program çıktısı, P1 = "Hukukun temel kavramlarını analiz ederek meslek hayatında uygular." |
| progCourseMatrix.aspx (365 KB) | 200 | HATA: pkodlar P1..P10 doğru, ama dersler = 0 |
| progTYYCMatrix.aspx (130 KB) | 200 | HATA: tyycIsaretSayisi = 0 (gerçekte işaretli hücreler var) |
| progCourses.aspx (1.5 MB) | 200 | HATA: dersKimlikleri = {} |
| progCourseDetails.aspx?curCourse=1106285 (130 KB) | 200 | Büyük ölçüde DOĞRU; dersYapisi = [] (HATA) |

## Kök neden 1: sayısal ders kodu
Bu kurumda ders kodları `1000.020105` biçiminde (harf öneki yok). Ayrıştırıcıdaki `/^[A-ZÇĞİÖŞÜ]{2,}\s*\d/` (programMatrisi) ve `/\b([A-ZÇĞİÖŞÜ]{2,}\s?\d{3}[A-Z]?)\b/` (dersKimlikleri) bu kodları kaçırıyor. Kod deseni hem `HUK101`/`HUK 101` hem `1000.020105` biçimini kabul etmeli.

Matris canlı satırları (tablolar() çıktısı):
- Başlık: ["Ders Kodu","Ders Adı","Zorunlu/Seçmeli","Grup Kodu","P1",…,"P10"]
- Yarıyıl başlığı satırı: `<tr class="matrix-section-h1"><td align="left" colspan="14" style="height:30px;">1.Yarıyıl Ders Planı</td></tr>`
- Ders: ["1000.020105","Anayasa Hukukunun Genel Esasları","Zorunlu","","4","4","3","4","4","3","3","3","3","3"]
- Ders: ["1000.020107","Medeni Hukuka Giriş ve Kişiler Hukuku","Zorunlu","","5","4","4","5","4","4","4","4","4","5"]
- Tablo açılışı: `<table id="tblMatris" class="table table-sm table-hover matrix-table" style="width:100%;">`; hücre: `<td class="matrix-row-header" align="left" style="height:22px;">Ders Kodu</td>`

progCourses canlı satır işaretlemesi (birebir):
```html
<tr class="borderColorLisghtGray" onmouseover="this.originalstyle=this.style.backgroundColor;this.style.backgroundColor=&#39;#f0f0f0&#39;" onmouseout="this.style.backgroundColor=this.originalstyle;" myid="3"> <td style="width:20px;"> <a onclick="return prolizOpenCourseDetails(1106285);" id="grdBolognaDersler_btnDersAyrinti_3" href="javascript:__doPostBack(&#39;grdBolognaDersler$ctl05$btnDersAyrinti&#39;,&#39;&#39;)" style="color:#5B636A;font-family:Open Sans;font-size:9pt;display:table-cell;vertical-align :middle; color:black;"><i class="fal fa-info-circle text-info" style="font-size:12pt"></i></a> </td><td align="left"> <a onclick="return prolizOpenCourseDetails(1106285);" id="grdBolognaDersler_btnDersKod_3" href="javascript:__doPostBack(&#39;grdBolognaDersler$ctl05$btnDersKod&#39;,&#39;&#39;)" style="color:#5B636A;font-family:Open Sans;font-size:9pt;">1000.020105</a> </td><td> <span id="grdBolognaDersler_lblDersAd_3" style="color:#3A3A3A;font-family:Open Sans;font-size:8pt;">Anayasa Hukukunun Genel Esasları</span> </td><td> <span id="grdBolognaDersler_Label3_3" style="color:#3A3A3A;font-family:Open Sans;font-size:8pt;">4+0+0</span> </td>
```
(Kimlik yakalama `prolizOpenCourseDetails\('?(\d+)` doğru çalışıyor; yalnız kod deseni eşleşmiyor.)

## Kök neden 2: TYYÇ matrisi yapısı (10 program çıktısı için)
Başlık iki satırlı, rowspan/colspan'lı:
```html
<tr class="tyyc-header tyyc-header-top"> <td class="tyyc-header" align="center" colspan="2" rowspan="2">Temel Alan</td><td title="…" class="tyyc-header" align="center" colspan="10">Program Yeterlilikleri</td><td class="tyyc-header" align="center" colspan="2" rowspan="2">Ulusal Yeterlilik</td> </tr><tr class="tyyc-header tyyc-header-sub"> <td title="…" class="tyyc-header" align="center">#1</td>…<td …>#10</td>
```
tablolar() satırları (sırayla):
["Temel Alan","Program Yeterlilikleri","Ulusal Yeterlilik"]
["#1",…,"#10"]
["", ×14]
["Bilgi","1","","","","","","","","","","","1","Bilgi"]      ← 14 hücre: alan(rowspan), alt no, P1..P10, alt no, alan(rowspan)
["2","","","","","","","","","","",""]                         ← 12 hücre: alt no, P1..P10, alt no (rowspan yüzünden alan hücreleri yok)
["3", ×…12]
["4", ×…12]
["", ×14]
["Beceriler","1","",…,"","1","Beceriler"]
["2","","","","","","","","","","","2"]
["3",…]
["", ×14]
["Yetkinlikler Bağımsız Çalışabilme ve Sorumluluk Alabilme","1",…,"1","Yetkinlikler Bağımsız Çalışabilme ve Sorumluluk Alabilme"]
["2",…,"2"]
["","","","","","","","","","","","3"]
Mevcut kod 14 hücreli satırda slice(2,12) alıyor: bu P1..P9 + ilk sütunu kaydırıyor (doğrusu slice(2, 2+P) ama ilk iki hücre "alan","alt no"). 12 hücreli satırda slice(1,11) doğru. Bu örnekte görülen satırlarda P hücreleri boş; işaret karakteri (ör. "X" ya da "✓") bu programda HİÇ olmayabilir — bu durumda 0 doğru sonuç olabilir. DOĞRULANMADI: işaretli hücrenin hangi karakterle gösterildiği. Kural: sıfır sayımı "veri yok" ile karıştırılmamalı; hiç P hücresi okunamadıysa null, okunup boşsa 0 dönmeli ve satır yapısı (14/12 hücre) testle sabitlenmeli.

## Kök neden 3: ders yapısı (alan yüzdeleri)
Canlı ders sayfasında tablo ilk satırı ["Sosyal Bilimler","%100",""] — "Alan Bilgisi"/"Field" başlığı yok. dersYapisi bu tabloyu "%" içeren ikinci hücreden tanımalı.

## Ders sayfası doğru okunan alanlar (1106285)
yarıyıl 1, kod 1000.020105, T+U+L 4+0+0, kredi 4, AKTS 6, güncelleme 08.10.2025, 2 değerlendirme (Ara Sınav 40, Yarıyıl Sonu 60), 6 iş yükü satırı (toplam 56+112+1+2+7+2=180 saat → 180/30 = 6 AKTS, tutarlı), 5 öğrenme çıktısı (Ö1…Ö5), 16 hafta, katkı matrisi "Tüm" + Ö1..Ö5 × P1..P10.
Tablo başlıkları: "Yarıyıl | Kodu | Adı | T+U+L | Kredi | AKTS | Son Güncelleme Tarihi", "Dersin Dili | Türkçe", "Kaynaklar | …", "Sosyal Bilimler | %100 | ", "Yarıyıl Çalışmaları | Sayısı | Katkı", "İş Yükü | Sayısı | Süre | Toplam İş Yükü (Saat)", "Sıra No | Açıklama", "Hafta | Konu | Ön Hazırlık | Dökümanlar", " | P1 | … | P10".

## KVKK notu
Ders sayfası "Dersi Verenler" ve "Dersin Yardımcıları" alanlarında öğretim elemanı adları ve bir e-posta adresi içeriyor. Bunlar herkese açık görev bilgisi olsa da bağlayıcı çıktısında e-posta adresleri ayıklanmalı ya da maskelenmeli; fixture'larda yalnız kurgu ad kullanılmalı.
