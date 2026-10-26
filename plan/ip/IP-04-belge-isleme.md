# İP-04: Belge işleme

- **Durum:** inceleme
- **Faz:** 1 (Temeller)
- **Bağımlılık:** yok (sözleşme `packages/belge/src/turler.ts` ve `index.ts` imzaları hazır)
- **Sahip olduğu yollar:** `packages/belge/**`, `docs/raporlar/IP-04.md`
- **Büyüklük:** orta-büyük

## Amaç

Kurumlarda dolaşan her belgeyi (PDF, Word, Excel, PowerPoint, LibreOffice, HTML, CSV) çapası belli metne çevirmek ve sistemin ürettiği raporları Word/Excel olarak vermek. Atıfların sayfa ve bölüm doğruluğu buna dayanır.

## Kapsam

`src/index.ts` içindeki imzaları uygula (imza değişikliği gerekiyorsa en küçük değişikliği yap ve raporda belirt):

1. `turTahminEt(veri, ipucu)`: sihirli baytlar (`%PDF-`, ZIP içindeki `[Content_Types].xml` / `mimetype` dosyası ile docx/xlsx/pptx/odt/ods ayrımı, PNG/JPEG/TIFF), sonra uzantı ve MIME.
2. `metinCikar(veri, ipucu, secenek)` → `BelgeMetni`:
   - **PDF** (`unpdf`): sayfa başına bölüm, `capa.sayfa`. Metin katmanı yoksa ya da çok seyrekse `ocrGerekli: true` ve Türkçe uyarı.
   - **DOCX** (`fflate` + XML): paragraflar, başlık stilleri (Heading/Başlık 1-3 → `duzey`), tablolar (`Tablo` olarak, hücre metinleriyle), dipnotlar; bölüm çapası başlık metni ya da sırası.
   - **XLSX / ODS** (`exceljs`, ODS için `fflate` + XML): her sayfa bir `Tablo`, `capa.hucre` = "Sayfa!A1" aralığı; ayrıca okunabilir metin bölümü.
   - **CSV**: ayraç tespiti (`;`, `,`, sekme), tırnaklı alanlar, UTF-8 BOM, Windows-1254 (Türkçe) kodlama tespiti ve dönüşümü, ondalık virgül.
   - **PPTX / ODP**: slayt başına bölüm, `capa.slayt`; konuşmacı notları ayrı bölüm.
   - **ODT**: paragraflar ve başlıklar.
   - **HTML**: `script`/`style` atılır, başlıklar ve tablolar korunur.
   - **Metin, Markdown, JSON**: düz metin; Markdown başlıkları bölüm olur.
   - **Görsel** (PNG, JPEG, TIFF): `ocrGerekli: true`.
   - Eski ikili `.doc`, `.xls`, `.ppt`: `apps/cli/lib/belge.mjs` gibi yol gösteren Türkçe uyarı.
3. `tabloOku(veri, ipucu)` → `TabloVerisi`: XLSX, ODS, CSV için ham hücreler (birleştirilmiş hücrelerde değer sol üst hücrede, diğerleri null; tarihler ISO metin; formüllerde hesaplanmış değer).
4. `parcala(belge, secenek)`: paragraf sınırına saygılı, çapası korunan parçalar; tablo satırları bölünmez (çok büyük tablolar satır grupları hâlinde, başlık satırı her parçada tekrar eder); sayfa sınırı aşılmaz. Varsayılan hedef 1000, en çok 1600 karakter.
5. `docxUret(model)`: Türkçe başlık stilleri, numaralı/madde listeler, tablolar (başlık satırı tekrarlı), `vurgu: "eksik"` için belirgin biçim, üst/alt bilgi, sayfa numarası. Atıflar metin içinde kalır (`[K:… s.3]`).
6. `xlsxUret(sayfalar)`: başlık satırı kalın ve dondurulmuş, sütun genişlikleri içerikten.
7. **Güvenlik**: boyut sınırı; ZIP bombası koruması (açılmış toplam boyut, sıkıştırma oranı ve dosya sayısı sınırları); XML'de DTD/varlık genişletme işlenmez; PDF ayrıştırmada zaman aşımı; bozuk dosyada çökme yerine Türkçe uyarılı boş sonuç.
8. **Özet**: `BelgeMetni.ozet` girdinin SHA-256'sı (`@akredit/cekirdek` `ozetHesapla` hazır değilse `node:crypto` ile).

## Kabul ölçütleri

- [x] Türkçe karakterler (ı, İ, ğ, Ğ, ş, Ş, ç, Ç, ö, Ö, ü, Ü) her biçimde kayıpsız. (`cikarma.test.ts`, `tablo.test.ts`, `uretim.test.ts`: PDF, DOCX, PPTX, ODT, ODP, HTML, MD, CSV, XLSX, ODS)
- [x] Gidiş-dönüş testleri: `docxUret` ile üretilen belge `metinCikar` ile okununca başlıklar, paragraflar ve tablolar geri gelir; `xlsxUret` → `tabloOku` aynı hücreleri verir. (`uretim.test.ts`, `tablo.test.ts > XLSX`)
- [x] PDF: testte üretilen (ya da `test/fixtures/` altına konan küçük) metinli PDF'ten sayfa numaralı bölümler; metinsiz PDF'te `ocrGerekli`. (`test/pdf-yardimci.ts` ToUnicode'lu Type0 yazı tipiyle PDF üretir)
- [x] CSV: noktalı virgül + ondalık virgül + Windows-1254 örneği doğru okunur. (`tablo.test.ts > CSV`)
- [x] ZIP bombası ve DTD varlık saldırısı örnekleri reddedilir, süreç çökmez. (`guvenlik.test.ts`)
- [x] Parçalama: çapalar korunur, sınırlar aşılmaz, tablo satırı bölünmez. (`parcala.test.ts`; tek istisna: başlıkla bile sığmayan tek tablo satırı bölünmez, kendi parçası olur)
- [x] `pnpm verify` temiz.

## Kapsam dışı

OCR'ın kendisi (kuyruk ve Tesseract bağdaştırıcısı İP-10'da), gömme (İP-03/İP-10), PDF üretimi (HTML → PDF, İP-16).

## Günlük

- 2026-10-23: İP tanımlandı, sözleşme yazıldı.
- 2026-10-27: Uygulandı, durum **inceleme**. Kendi XML ayrıştırıcısı (DTD/ENTITY reddi), sınırlı ZIP açma (dosya sayısı, açılmış boyut, oran), PDF (unpdf, sayfa çapası, seyrek metinde OCR), DOCX (başlık stili/anahat düzeyi, tablo, dipnot), PPTX/ODP (slayt + konuşmacı notu + tablo), ODT, XLSX (exceljs; birleştirme, tarih, formül), ODS (tekrar sınırı), CSV (UTF-8/BOM/UTF-16/Windows-1254, ayraç, ondalık virgül), HTML, Markdown, görsel ve eski Office uyarıları. `parcala`, `docxUret`, `xlsxUret` tamam. 48 test.
  - Sözleşmeye yalnız ekleme: `CikarmaSecenekleri` (`enBuyukDosyaSayisi`, `enBuyukSikistirmaOrani`, `zamanAsimiMs`), `TabloVerisi.uyarilar?`, `tabloOku`'ya isteğe bağlı üçüncü parametre `secenek`.
  - ODP, `BelgeTuru` içinde ayrı tür olmadığı için `"pptx"` türüyle döner (içerik ODF olarak okunur).
  - Kalan: PDF zaman aşımı yalnız eşzamansız beklemeyi keser; PDF.js eşzamanlı uzun bir döngüye girerse kesilemez. Kesin yalıtım (worker thread / ayrı süreç) İP-10 kanıt hattına bırakıldı.

