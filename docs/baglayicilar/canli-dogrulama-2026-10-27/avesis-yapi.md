# AVESİS canlı yapı notu (avesis.ebyu.edu.tr, 2026-10-27, tarayıcıyla)

Kişi adları ve yayın başlıkları aşağıdaki örneklerde KURGU ile değiştirilmiştir; işaretleme (etiket, sınıf, öznitelik, sıra) canlı sayfadan birebir alınmıştır.

## Adresler
- Profil: `/<kullanici-adi>` (ör. `/agul`). Başlık: `<h1 class="title">Prof. Dr. AD SOYAD</h1>`; `<title>Prof. Dr. AD SOYAD | AVESİS</title>`.
- Alt sayfalar: `/<k>/egitim`, `/<k>/arastirma`, `/<k>/deneyim`, `/<k>/yayinlar`, `/<k>/projeler`, `/<k>/bilimselfaaliyetler`, `/<k>/basarilar`, `/<k>/dokumanlar`, `/<k>/iletisim`, `/<k>/indir?languageCode=tr|en`.
- Yayın ayrıntısı: `/yayin/<uuid>/<slug>`.
- Araştırmacı arama listesi `/arastirmaci-arama`: bağlantılar `href` taşımaz, `<a data-networkuserid="12001221">Unvan AD, Fakülte, Bölüm</a>` biçimindedir; profile tıklamayla (JS) gidilir. Kullanıcı adı listeden okunamaz.
- Araştırma alanları (`/<k>/arastirma`) sunucu HTML'inde BOŞ gelir: `<ul id="avesisAreas"></ul>`, `wosAreas`, `scopusAreas`; JS ile POST isteğiyle doldurulur. Ayrıntı modalı: `/usermetrics/researcharearesumelistmodal?networkUserId=<id>&<alan>=<anahtar>`.
- Eski kurgu örnekteki `.unvan`, `.birim`, `.arastirma-alanlari` sınıfları canlı sayfada YOK.

## Metrikler (profil ana sayfası)
```html
<div class="col-md-3 col-sm-3 left-bar-figures m-bottom-30"> <h4 class="metrics-title">Yayın (WoS)</h4> <div> <strong class="metrics-count">1</strong> </div> </div>
```
İlk kutuda `<strong class="metrics-count">` doğrudan h4'ün kardeşidir (div sarmalı yok). Görülen başlıklar: Yayın, Yayın (WoS), Yayın (Scopus), H-İndeks (WoS), Atıf (Scopus), H-İndeks (Scopus), Atıf (Scholar), H-İndeks (Scholar), Atıf (TrDizin), H-İndeks (TrDizin), H-İndeks (Sobiad), Atıf (Diğer Toplam), Proje, Tez Danışmanlığı, Açık Erişim.

## Yayınlar sayfası
Her tür bir akordeon bölümüdür:
```html
<div class="ol-accordion dark-skin"> <div class="ac-item open"> <div class="item-head"> <span>Makaleler</span> <span class="badge badge-primary">52</span> </div> <div class="item-body"> <div id="publications-wrapper" class="pubs-wrapper"> <div class="filter-container" data-callback="onLabelFilterClick"> <div class="filter active" data-key="all"> Tümü (52) </div> <div class="filter inactive" data-key="sci_ssci_ahci"> SCI-E, SSCI, AHCI (1) </div> <div class="filter inactive" data-key="sci_ssci_ahci_esci"> SCI-E, SSCI, AHCI, ESCI (1) </div> <div class="filter inactive" data-key="scopus"> Scopus (1) </div> <div class="filter inactive" data-key="trdizin"> TRDizin (12) </div> <div class="filter inactive" data-key="other"> Diğer Yayınlar (39) </div> </div>
  <div class="pub-item with-icon" data-filters="sci_ssci_ahci,sci_ssci_ahci_esci,scopus" style="border-bottom: none"> <div class="elem-wrapper"><i class="oli oli-bookmark"></i></div> <div class="content-wrapper"> <h3 class="title"> <a target="_blank" href="/yayin/00000000-0000-4000-8000-000000000001/kurgu-makale-basligi"> <span style="margin-right: 5px; color: #bbb;">1.</span> <strong>Kurgu Makale Başlığı</strong> </a> </h3> <div class="description"> <div class="citation"><a class="authorsRichText" data-networkuserid="10000001" data-placement="bottom" data-othercorporation="false"> ÖRNEK D.</a>, <a class="authorsRichText" title="Ayşe Kurgu" data-toggle="popover" data-placement="bottom" data-content=""> Kurgu A.</a></div> <div class="citation" style="max-width:100%!important;"> <span> <a class="journalDetailModalLink" data-toggle="asyncmodal" data-asyncmodal-size="lg" href="/journal/getjournaldetailbyarticleid?articleId=00000000-0000-4000-8000-000000000001&amp;modalDisplayedControllerId=5&amp;journalName=Hayali%20Dergi" target="_blank">Hayali Dergi</a> , cilt.10, sa.9, 2015 (SSCI, Scopus) </span> </div> </div> </div> </div>
  </div></div></div></div>
```
İkinci ve sonraki bölümlerde `.pubs-wrapper` kimliksizdir ve önünde `<div class="sp-blank-20"></div>` vardır. Görülen bölüm adları: "Makaleler", "Hakemli Bilimsel Toplantılarda Yayımlanmış Bildiriler", "Kitaplar", "Diğer Yayınlar". Bildiri kaydı örneği satır sonu: `..., ss.32-48, (Tam Metin Bildiri)`.
Dizin bilgisi iki yerden okunabilir: `data-filters` (sci_ssci_ahci, sci_ssci_ahci_esci, scopus, trdizin, other) ve atıf satırının sonundaki parantez (SSCI, Scopus).
Sayfanın `<script>` bloklarında `item.querySelector('.title span').textContent = ...` gibi HTML benzeri dizeler bulunur; ayrıştırıcı script içeriğini atlamalıdır.
