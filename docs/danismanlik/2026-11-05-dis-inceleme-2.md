Analyzed plan.md:L1-266
Analyzed promptlar.ts:L1-297
Analyzed http.ts:L1-173
Analyzed route.ts:L1-14
Analyzing page.tsx
Analyzing page.tsx
Ran list files in key directories
Analyzed sunucu.ts:L1-185
Analyzed yardim.ts:L1-405
Analyzed package.json:L1-28
Analyzed 0008-mcp-odagi-barindirma-askida.md:L1-36
Analyzed araclar.ts:L1-535
Analyzed bologna.ts:L1-800
Analyzed kaynak-dogrula.ts:L1-380
Analyzed kisisel-veri.ts:L1-114
Analyzed not-tablosu.ts:L1-263
Ran list files in apps/web/src
Analyzed bologna.ts:L801-1472
Analyzed genel-ayristir.ts:L1-504
Analyzed page.tsx:L1-270
Analyzed page.tsx:L1-125
Analyzed page.tsx:L1-256
Analyzed layout.tsx:L1-83
Analyzed kurulum.ts:L1-53
Analyzed icerik.ts:L1-800
Analyzed hukuk-paketi.ts:L1-31
Analyzed kaynaklar.json:L1-372
Analyzed taslak.ts:L1-185
Analyzed denetim.ts:L1-158
Analyzed veri-yokak.ts:L1-250
Analyzed veri.ts:L1-250
Analyzed cerceveler.ts:L1-175
Analyzed page.tsx:L1-119
Analyzed page.tsx:L1-94
Analyzed page.tsx:L1-127
Ran list workspace packages and public files
Analyzed proxy.ts:L1-36
Analyzed iletisim.ts:L1-5
Analyzed page.tsx:L1-39
Analyzed globals.css:L1-416
Analyzed gorsel.tsx:L1-64
Analyzed ci.yml:L1-178
Analyzed yayin.yml:L1-105
Analyzed veri-resmi.ts:L1-138
Analyzed olcut-ham.ts:L1-250
Analyzed layout.tsx:L1-57
Analyzed package.json:L1-61
Analyzed derle.ts:L1-55
Analyzed cli.ts:L1-32
Analyzed temel.ts:L1-62
Analyzed page.tsx:L1-113
Analyzed cerceve-ozeti.ts:L1-11
Ran list files in yz, baglayicilar, infra, docs/raporlar
Analyzed kvkk.ts:L1-424
Analyzed IP-49.md:L1-125
Analyzed kaynaklar.ts:L1-79
Analyzed resmi-metin.test.ts:L1-90
Analyzed basliklar.ts:L1-70
Analyzed next.config.ts:L1-46
Analyzed csp.ts:L1-44
Analyzed acik-mcp-hiz-siniri.md:L1-94
Analyzed mcp-hoca-deneyimi.md:L1-95
Analyzed acik-mcp.test.ts:L1-270
Analyzed program-tablolari-resmi.test.ts:L1-218
Analyzed llms.txt:L1-32
Analyzed dil.ts:L1-243
Analyzed page.tsx:L1-80

Aşağıdaki değerlendirme depodaki kaynak kodların, testlerin, yapılandırma dosyalarının ve site sayfalarının doğrudan incelenmesine dayanmaktadır. İsteğiniz doğrultusunda övgüye yer verilmemiş; yalnız sorunlar, riskler ve somut düzeltmeler yazılmıştır.

---

## 1. Hoca Deneyimi

### 1.1. Sohbete düz `"akredit"` yazmak MCP istemini (prompt) tetiklemez
- **Önem:** Kritik
- **Kanıt:** [page.tsx](file:///Users/baris/Documents/GitHub/akredit/apps/web/src/app/(site)/page.tsx#L194), [mcp-kullan/page.tsx](file:///Users/baris/Documents/GitHub/akredit/apps/web/src/app/(site)/mcp-kullan/page.tsx#L46-L56), [sunucu.ts](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/sunucu.ts#L21-L31), [promptlar.ts](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/promptlar.ts#L243-L291), [mcp-hoca-deneyimi.md](file:///Users/baris/Documents/GitHub/akredit/docs/raporlar/mcp-hoca-deneyimi.md#L18-L21)
- **Neden sorun:** Sitede hocaya *"Yeni sohbette `akredit` yazın"* deniyor. Ancak MCP protokolünde sunucu istemleri (`prompts/list` ve `prompts/get` — [`ACIK_ISTEMLER`](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/promptlar.ts#L243)) sohbet kutusuna düz metin yazılarak tetiklenmez; istemcilerde `+` menüsünden veya `/` eğik çizgi komutuyla seçilir. Hoca sohbete düz `"akredit"` yazdığında istemci `prompts/get` çağırmaz, modele yalnız tek kelimelik `"akredit"` mesajı gönderir. Akışın başlaması tamamen istemcinin `InitializeResult.instructions` ([`SUNUCU_TALIMATI`](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/sunucu.ts#L21-L31)) alanını sistem istemine eklemesine kalır. ChatGPT başta olmak üzere pek çok istemci MCP `instructions` ve `prompts` alanlarını yok sayar veya kullanıcıya göstermez (`DOĞRULANMADI` — [IP-49.md](file:///Users/baris/Documents/GitHub/akredit/docs/raporlar/IP-49.md#L46) ve [mcp-hoca-deneyimi.md](file:///Users/baris/Documents/GitHub/akredit/docs/raporlar/mcp-hoca-deneyimi.md#L20) içinde de gerçek istemcilerde doğrulanmadığı kayıtlıdır). Bu durumda model `"Akredit nedir, ne yapmamı istiyorsunuz?"` diye sorar ya da rastgele bir araç çağırır; vaat edilen 1-2-3-4 menüsü hiç çıkmaz.
- **Önerilen düzeltme:**
  1. `acik-mcp` içine parametresiz bir `akredit_basla` (veya `menu_goster`) **aracı (`tool`)** ekleyin ve açıklamasını (description) *"Kullanıcı 'akredit', 'merhaba' veya ne yapacağını sorduğunda İLK OLARAK bu aracı çağır"* yapın. İstemciler `prompts` ve `instructions` alanlarını yok saysa bile `tools/list` açıklamalarını modele her zaman verir.
  2. Sitedeki yönergeyi yalnız `"akredit yazın"` olmaktan çıkarıp `"Bologna ders paketimi doldurmak istiyorum, akredit araçlarını kullan"` gibi niyet belirten cümlelerle güncelleyin.

### 1.2. Ana sayfadaki "En kolay yol" kutusu yazılımcı ajanlarına (Claude Code / Codex) göre yazılmış; sayfalar arası kurulum adımları birbiriyle çelişiyor
- **Önem:** Kritik
- **Kanıt:** [page.tsx](file:///Users/baris/Documents/GitHub/akredit/apps/web/src/app/(site)/page.tsx#L151-L171), [kurulum.ts](file:///Users/baris/Documents/GitHub/akredit/apps/web/src/site/kurulum.ts#L22-L53), [mcp-kullan/page.tsx](file:///Users/baris/Documents/GitHub/akredit/apps/web/src/app/(site)/mcp-kullan/page.tsx#L201-L224), [yardim.ts](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/yardim.ts#L54-L120)
- **Neden sorun:**
  1. Yapay zekâdan anlamayan bir öğretim elemanının ana sayfada karşılaştığı ilk kutu (`En kolay yol: kopyalayın, yapıştırın` — [page.tsx](file:///Users/baris/Documents/GitHub/akredit/apps/web/src/app/(site)/page.tsx#L152-L165)) `Claude Code ya da Codex'e yapıştırılacak metin` başlığını taşıyor. Hoca bu metni normal `claude.ai` veya `chatgpt.com` sohbet kutusuna yapıştırdığında asistan kendi ayarlarına girip MCP sunucusu ekleyemez.
  2. Ana sayfa ([yardim.ts](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/yardim.ts#L58-L70)) Claude için `Sol alttaki adınıza tıklayın, Settings (Ayarlar) > Connectors (Bağlayıcılar) > Add custom connector` derken, [/mcp-kullan](file:///Users/baris/Documents/GitHub/akredit/apps/web/src/app/(site)/mcp-kullan/page.tsx#L204-L210) sayfası `Ayarlarda Customize, ardından Connectors... + Add... No sign in` diyor. İki sayfa birbiriyle çelişiyor (`DOĞRULANMADI` — [yardim.ts](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/yardim.ts#L73) içinde `degisebilir: true` olarak işaretlenmiş).
  3. ChatGPT'de özel MCP bağlayıcısı eklemek (Developer Mode / Geliştirici Modu) ve Agent Mode çalıştırmak ücretsiz hesaplarda kapalıdır; ücretli abonelik (Plus/Pro/Team) ve kurumsal hesaplarda yönetici izni gerektirir. Sitede "Ücretsiz, hesapsız" vurgusu yapılırken hocanın ChatGPT'de ücretli hesaba ve geliştirici moduna ihtiyaç duyacağı ana sayfada gizlenmiştir.
- **Önerilen düzeltme:**
  1. Ana sayfadaki ilk kutudan `Claude Code / Codex` ifadesini kaldırın; bunu yalnız `/mcp-kullan` altında "Yazılımcılar / Komut satırı" sekmesine taşıyın.
  2. `/mcp-kullan` sayfasındaki elle yazılmış kurulum adımlarını silip ana sayfayla aynı tek kaynaktan ([` BAGLAYICI_ADIMLARI`](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/yardim.ts#L54)) besleyin.
  3. Claude ve ChatGPT'nin hangi abonelik paketlerinde özel MCP bağlayıcısına izin verdiğini ilk adımda açıkça yazın.

### 1.3. Tarayıcıyla OBS'ye giriş ve kopyala-yapıştır (`Ctrl+A, Ctrl+C`) yedek akışı teknik olarak kırık
- **Önem:** Yüksek
- **Kanıt:** [promptlar.ts](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/promptlar.ts#L90-L125), [bologna.ts](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/bologna.ts#L946-L959), [genel-ayristir.ts](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/genel-ayristir.ts#L474-L476), [yardim.ts](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/yardim.ts#L242-L250)
- **Neden sorun:**
  1. İstemler ([`ORTAK_KURALLAR`](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/promptlar.ts#L90-L104)) asistanın "kenardaki tarayıcıda" OBS açacağını varsayıyor. Standart `claude.ai` web arayüzünde kenar tarayıcısı yoktur; kullanıcının ayrıca Chrome eklentisi (Claude in Chrome) veya ChatGPT Agent Mode kullanması gerekir.
  2. Üniversite OBS sistemleri (Proliz, ÜBYS, Kion) çoğunlukla e-Devlet kapısı, 2FA, `iframe` içi dinamik ASP.NET ViewState / AJAX postback kullanır. Bulut tabanlı bir tarayıcı ajanının (ChatGPT Agent Mode, ABD IP'siyle) üniversite güvenlik duvarını ve e-Devlet doğrulamasını geçip 8 ayrı sekmede ViewState bozmadan `Kaydet`e basması gerçek ortamda yüksek olasılıkla başarısız olur (`DOĞRULANMADI` — canlı bir üniversite OBS'sinde uçtan uca test kaydı depoda yoktur).
  3. Tarayıcı olmadığında önerilen yedek yol ([yardim.ts](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/yardim.ts#L245-L246)): *"OBS'de ders sayfasını açın, `Ctrl+A` ve `Ctrl+C` ile kopyalayıp sohbete yapıştırın"*. Hoca sayfayı `Ctrl+A, Ctrl+C` ile kopyaladığında panoya **HTML değil, düz metin** kopyalanır. Oysa [`prolizMi(html)`](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/bologna.ts#L946-L951) ve [`dersSayfasiCoz`](file:///Users/baris/Documents/GitHub/akredit/packages/baglayicilar/src/bologna/ayristir.ts) `<table>`, `<tr>`, `<td>` etiketleri bekler! Düz metin geldiğinde kod [`genelDersCoz`](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/genel-ayristir.ts#L439)'e düşer; `genelDersCoz` ise `dersYapisi: []` ve `katki: {}` alanlarını **her zaman boş döndürür** ([genel-ayristir.ts](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/genel-ayristir.ts#L474-L476)). Yani Proliz kullanan hoca bile kopyala-yapıştır yaptığında Proliz ayrıştırıcısı devreye girmez ve katkı matrisi okunamaz.
- **Önerilen düzeltme:**
  1. [`genelDersCoz`](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/genel-ayristir.ts#L439) içine sekme (`\t`) ile ayrılmış düz metin (tarayıcıdan `Ctrl+A, Ctrl+C` çıktısı) için ÖÇ-PÇ katkı matrisi ve ders yapısı ayrıştırıcısı ekleyin.
  2. Tarayıcı otomasyonunu birincil yol gibi sunmak yerine, sekme sekme kopyalanabilir hazır metin çıktısını birincil ve güvenilir yol yapın.

---

## 2. Doğruluk ve Halüsinasyon Riski

### 2.1. `"4) Hepsini akıllıca doldur"` ve `"4) Hepsini doldur ve kaydet"` seçenekleri asistana uydurma yaptıracak şekilde tasarlanmış
- **Önem:** Kritik
- **Kanıt:** [promptlar.ts](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/promptlar.ts#L38-L45), [promptlar.ts](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/promptlar.ts#L114-L144), [taslak.ts](file:///Users/baris/Documents/GitHub/akredit/packages/cekirdek/src/bologna/taslak.ts#L58-L125)
- **Neden sorun:** Projenin değişmez ilkeleri *"Kanıtsız iddia yok; bağlanamayan içerik EKSİK olarak işaretlenir, yapılmış gibi yazılmaz"* ve *"Uydurma yok"* diyor. Ancak [`AKILLI_DOLDURMA`](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/promptlar.ts#L138-L144) istemi asistana tam tersini emrediyor:
  - *"Amaç ya da içerik yoksa dersin odağını ders adından ve program çıktılarından çıkar. Akıllı doldurmada sorma."* ([promptlar.ts](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/promptlar.ts#L38-L39))
  - *"Kalan her alan için A/B/C seçeneklerini kendin yaz, dersin düzeyine, kredisine ve program çıktılarına en uygun olanı kendin seç. Hocaya ara soru sorma."* ([promptlar.ts](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/promptlar.ts#L140-L141))
  - Üstelik [`taslakDenetle`](file:///Users/baris/Documents/GitHub/akredit/packages/cekirdek/src/bologna/taslak.ts#L58-L125) kuralları herhangi bir alanı boş bırakmayı **hata (`gecer: false`)** sayıyor: ders notları boş olamaz (`K3`, [taslak.ts](file:///Users/baris/Documents/GitHub/akredit/packages/cekirdek/src/bologna/taslak.ts#L62)), uygulamalı derste ödev/proje/lab değerlendirme kalemi zorunlu (`K7`, [taslak.ts](file:///Users/baris/Documents/GitHub/akredit/packages/cekirdek/src/bologna/taslak.ts#L68-L70)), 14 haftanın her birinde `onHazirlik` ve `dokuman` dolu olmak zorunda (`K9`, [taslak.ts](file:///Users/baris/Documents/GitHub/akredit/packages/cekirdek/src/bologna/taslak.ts#L115-L116)).
  - Sonuç: Boş bir OBS ders sayfasıyla `"4) Hepsini akıllıca doldur"` seçildiğinde, asistan `bologna_taslak_denetle` aracından `gecer: true` alabilmek için **hocanın sınav/ödev yüzdelerini, 14 haftalık konuları, her haftanın ders dokümanını, ders notunun varlığını ve ÖÇ-PÇ katkı derecelerini (1–5) dersin sadece adına bakarak uydurmak zorundadır!** Ardından [`OBS_YAZMA`](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/promptlar.ts#L119-L122) içindeki `"4) Hepsini doldur ve kaydet"` seçilirse bu uydurulmuş sınav oranları ve taahhütler doğrudan resmî OBS sistemine kaydedilir. Sınav/ödev oranları ve haftalık içerik üniversite senatosuna karşı hukuki taahhüttür; öğrenci itirazlarında resmî delildir.
- **Önerilen düzeltme:**
  1. Değerlendirme oranları (vize/final/ödev/proje yüzdeleri) ve dersin gerçekten uygulama/lab içerip içermediği hocaya **sorulmadan** asla otomatik doldurulmamalıdır; [`AKILLI_DOLDURMA`](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/promptlar.ts#L138) içinde bile bu iki soru zorunlu tutulmalıdır.
  2. [`OBS_YAZMA`](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/promptlar.ts#L119) içindeki `"4) Hepsini doldur ve kaydet"` seçeneğini kaldırın; asistana OBS'deki `Kaydet` düğmesine basma izni vermeyin, yalnız form alanlarını doldurup `Kaydet` butonuna basmayı insana bırakın (İlke 3: *"Beyan ve son gönderim insanda"*).

### 2.2. `bologna_taslak_denetle` kaynakların gerçekten doğrulandığını denetlemiyor
- **Önem:** Yüksek
- **Kanıt:** [bologna.ts](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/bologna.ts#L456-L477)
- **Neden sorun:** [`alanBulgulari`](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/bologna.ts#L456-L463) içinde `kaynaklar` alanı denetlenirken, modelin `kaynak_dogrula` aracını çağırıp çağırmadığına veya kaynağın gerçek olup olmadığına hiç bakılmıyor:
  ```ts
  kaynaklar: (alanlar.kaynaklar ?? []).map((k) => {
    const t = k.trim();
    return { yazar: t ? "var" : "", eser: t };
  }),
  ```
  Ardından yalnız metin içinde `19xx` veya `20xx` gibi 4 haneli bir yıl ([`KUNYE_YILI`](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/bologna.ts#L384)) geçip geçmediğine bakılıyor ([bologna.ts](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/bologna.ts#L474)). Model `kaynak_dogrula` aracını hiç çağırmadan `"Ahmet Yılmaz, İleri Algoritmalar, 2022"` gibi tamamen uydurma iki satır gönderdiğinde `bologna_taslak_denetle` ve `bologna_durum` **`gecer: true` ve `tamamlandi: true`** döndürür!
- **Önerilen düzeltme:** `bologna_taslak_denetle` ve `bologna_durum` içindeki `kaynaklar` girdisini düz `string[]` olmaktan çıkarıp `kaynak_dogrula` çıktısını (veya sunucu tarafında `kaynaklariDogrula` çağrısını) zorunlu kılın; `durum === "bulunamadi"` olan kaynak varsa `"Hoca onayı olmadan doğrulanmamış kaynak yazılamaz"` bulgusu üretin.

### 2.3. `kaynak_dogrula` Türkçe akademik kitaplarda yüksek yanlış pozitif ve yanlış negatif üretir
- **Önem:** Yüksek
- **Kanıt:** [kaynak-dogrula.ts](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/kaynak-dogrula.ts#L50-L72), [kaynak-dogrula.ts](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/kaynak-dogrula.ts#L317-L343), [IP-49.md](file:///Users/baris/Documents/GitHub/akredit/docs/raporlar/IP-49.md#L115)
- **Neden sorun:**
  1. [`baslikEslesir`](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/kaynak-dogrula.ts#L58-L64) 2+ harfli kelimelerin %60–%80 örtüşmesine, [`yazarEslesir`](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/kaynak-dogrula.ts#L67-L72) ise yalnız tek bir yazar soyadının eşleşmesine bakıyor. `"Veri Yapıları"`, `"Genel Kimya"`, `"Anayasa Hukuku"` gibi iki kelimelik jenerik ders kitabı adlarında ve `"Yılmaz"`, `"Kaya"`, `"Demir"` gibi yaygın soyadlarında Crossref'teki alakasız bir bildiri veya makale gerçek ders kitabıymış gibi `"dogrulandi"` dönebilir.
  2. Türkiye'deki akademik yayınevlerinin (Pegem, Seçkin, Nobel, Beta, Palme, Dora vb.) Türkçe ders kitaplarının önemli bir kısmı Crossref ve Open Library'de yoktur; Google Books API ise anahtarsız/anonim çağrılarda sıkı kota uygular ve sunucu IP'sini hızlıca `429 Too Many Requests` ile engeller.
  3. [IP-49.md](file:///Users/baris/Documents/GitHub/akredit/docs/raporlar/IP-49.md#L115) raporunda açıkça belirtildiği üzere, `test/fixtures/kaynak` verileri elle kurgulanmıştır; canlı ortamda gerçek DOI ve ISBN ile doğrulama testi yapılmamıştır (`DOĞRULANMADI`).
- **Önerilen düzeltme:**
  1. Eşleşmede yayın yılı, yayınevi ve kayıt türünü (`book` / `monograph` vs `journal-article`) kontrol edin; kitap aramasında 5 sayfalık dergi makalesini `"dogrulandi"` saymayın.
  2. Türkçe kitaplar için TOKAT (Ulusal Toplu Katalog) veya YÖK Tez/Kütüphane üstveri sorgusu ya da ISBN-13 sağlama basamağı (checksum) doğrulaması ekleyin.

---

## 3. Akreditasyon İçeriği

### 3.1. `/cerceveler` sayfası ve `kaynaklar.json`, depodaki gerçek çerçeve verisiyle çelişiyor
- **Önem:** Kritik
- **Kanıt:** [cerceveler/page.tsx](file:///Users/baris/Documents/GitHub/akredit/apps/web/src/app/(site)/cerceveler/page.tsx#L97-L103), [kaynaklar.json](file:///Users/baris/Documents/GitHub/akredit/kaynaklar/resmi/kaynaklar.json#L98-L107), [cerceveler.ts](file:///Users/baris/Documents/GitHub/akredit/packages/cerceveler/src/program-tablolari/cerceveler.ts#L45-L85), [araclar.ts](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/araclar.ts#L48)
- **Neden sorun:** Sitenin [/cerceveler](file:///Users/baris/Documents/GitHub/akredit/apps/web/src/app/(site)/cerceveler/page.tsx#L97-L103) sayfasında:
  > *"Henüz yok: MÜDEK ve diğer program akreditasyon kuruluşları: resmî belge kütüphaneye eklenmedi, ölçüt ağacı boştur."*
  
  yazıyor ve [`kaynaklar/resmi/kaynaklar.json`](file:///Users/baris/Documents/GitHub/akredit/kaynaklar/resmi/kaynaklar.json#L98-L107) içinde de `"id": "mudek-degerlendirme-olcutleri", "durum": "DOĞRULANMADI"` duruyor. Oysa `packages/cerceveler` içinde MÜDEK 3.1, MÜDEK YL 2.0, FEDEK 4.1, EPDAD 1.1, EPDAD RPD ve SABAK R4 çerçeveleri çoktan ayrıştırılmış ve MCP araçlarında kullanıma açılmış ([cerceveler.ts](file:///Users/baris/Documents/GitHub/akredit/packages/cerceveler/src/program-tablolari/cerceveler.ts#L45-L85))! Ziyaretçi `/mcp-kullan` sayfasında *"YÖKAK, MÜDEK, FEDEK, EPDAD ve SABAK var"* okurken `/cerceveler` sayfasına tıkladığında *"MÜDEK ölçüt ağacı boştur"* ifadesiyle karşılaşıyor.
- **Önerilen düzeltme:** [/cerceveler/page.tsx](file:///Users/baris/Documents/GitHub/akredit/apps/web/src/app/(site)/cerceveler/page.tsx), [cerceve-ozeti.ts](file:///Users/baris/Documents/GitHub/akredit/apps/web/src/site/cerceve-ozeti.ts) ve [kaynaklar.json](file:///Users/baris/Documents/GitHub/akredit/kaynaklar/resmi/kaynaklar.json) dosyalarını [`TUM_CERCEVELER`](file:///Users/baris/Documents/GitHub/akredit/packages/cerceveler/src/veri.ts#L20) dizisinden otomatik beslenecek şekilde birleştirin.

### 3.2. Resmî ölçüt metinlerinde ayrıştırma kayıpları var ve tüm çerçeveler `dogrulandi: false` durumunda
- **Önem:** Yüksek
- **Kanıt:** [resmi-metin.test.ts](file:///Users/baris/Documents/GitHub/akredit/packages/cerceveler/test/resmi-metin.test.ts#L83-L86), [veri-resmi.ts](file:///Users/baris/Documents/GitHub/akredit/packages/cerceveler/src/veri-resmi.ts#L85-L95), [acik-mcp.test.ts](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/test/acik-mcp.test.ts#L156-L157), [program-tablolari-resmi.test.ts](file:///Users/baris/Documents/GitHub/akredit/packages/cerceveler/test/program-tablolari-resmi.test.ts#L170), [cerceveler.ts](file:///Users/baris/Documents/GitHub/akredit/packages/cerceveler/src/program-tablolari/cerceveler.ts#L79)
- **Neden sorun:**
  1. **YÖKAK 3.3:** `A.4.1` ve `B.2.2` alt ölçütlerinin 1–5 olgunluk düzeyi (rubrik) metinleri PDF tablosundan ayrıştırılamadığı için boş/`DOĞRULANMADI` dönüyor ([resmi-metin.test.ts](file:///Users/baris/Documents/GitHub/akredit/packages/cerceveler/test/resmi-metin.test.ts#L83-L86)). Genel olgunluk düzeyleri de PDF'te görsel (Şekil 1) olduğu için metin olarak yok ([veri-resmi.ts](file:///Users/baris/Documents/GitHub/akredit/packages/cerceveler/src/veri-resmi.ts#L85)).
  2. **EPDAD 1.1:** Bazı göstergelerin (ör. `2.1.1` gösterge 1) derecelendirme düzey tanımları belgeden ayrılamadığı için `"Belgeden okunamadı"` dönüyor ([acik-mcp.test.ts](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/test/acik-mcp.test.ts#L156-L157)).
  3. **FEDEK 4.1:** Programa özgü ölçütler (Bölüm II) ana ölçüt ağacında (`olcut-ham.ts`) yer almıyor ([program-tablolari-resmi.test.ts](file:///Users/baris/Documents/GitHub/akredit/packages/cerceveler/test/program-tablolari-resmi.test.ts#L170)); sadece ek tablolarda kısmen bulunuyor.
  4. **Uzman onayı eksik:** Depodaki 7 çerçevenin tamamında `dogrulandi: false` ([veri-resmi.ts](file:///Users/baris/Documents/GitHub/akredit/packages/cerceveler/src/veri-resmi.ts#L95), [cerceveler.ts](file:///Users/baris/Documents/GitHub/akredit/packages/cerceveler/src/program-tablolari/cerceveler.ts#L79)) bayrağı var (`DOĞRULANMADI`).
- **Önerilen düzeltme:** PDF/DOCX ayrıştırıcının kaçırdığı `A.4.1`, `B.2.2` ve EPDAD `2.1.1` tablolarını resmî PDF'ten birebir kopyalayıp SHA-256 ve sayfa numarası referansıyla yama (override) tablosu olarak ekleyin; FEDEK programa özgü ölçütlerini `olcut_getir` aracından doğrudan sorgulanabilir hale getirin.

### 3.3. Bologna taslak kuralları (`taslak.ts`) Türk yükseköğretim uygulamasıyla ve TYYÇ/AKTS rehberleriyle çatışıyor
- **Önem:** Yüksek
- **Kanıt:** [taslak.ts](file:///Users/baris/Documents/GitHub/akredit/packages/cekirdek/src/bologna/taslak.ts#L28-L31), [taslak.ts](file:///Users/baris/Documents/GitHub/akredit/packages/cekirdek/src/bologna/taslak.ts#L76-L97), [bologna.ts](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/bologna.ts#L893)
- **Neden sorun:**
  1. **K5 — Öğrenme çıktısı sayısının 8–12 arasında zorunlu tutulması ([taslak.ts](file:///Users/baris/Documents/GitHub/akredit/packages/cekirdek/src/bologna/taslak.ts#L93)):** YÖK TYYÇ rehberlerinde, AKTS Kullanıcı Kılavuzu'nda ve Türkiye'deki üniversitelerin kalite komisyonlarında bir ders için **4 ila 8** öğrenme çıktısı önerilir. Özellikle MÜDEK ve FEDEK denetimlerinde her öğrenme çıktısının sınav/ödev sorularıyla ayrı ayrı ölçülüp kanıtlanması zorunludur; bir derse zorla 8–12 çıktı yazdırmak (`< 8` olduğunda `gecer: false` hatası vermek) öğretim elemanını ölçülemeyecek kadar çok çıktı yazmaya zorlar ve akreditasyon denetiminde doğrudan bulgu (eksiklik) sebebidir.
  2. **K4 — Yalnız geniş zaman eki (`/(ar|er|ır|ir|ur|ür)\.?\s*$/i`) dayatması ([taslak.ts](file:///Users/baris/Documents/GitHub/akredit/packages/cekirdek/src/bologna/taslak.ts#L28)):** Türkiye'deki üniversitelerin yarısından fazlası TYYÇ matrisleriyle uyumlu olarak `"-ebilme / -abilme"` (ör. *"tasarlayabilme"*, *"analiz edebilme"*) veya `"-ebilir / -abilir"` kalıbını kullanır. Mevcut regex `"tasarlayabilme"` ifadesini hata sayarken, `"farkında olur"`, `"sahip olur"`, `"haberdar olur"` gibi **ölçülemeyen** ifadeleri (`OLCULEMEZ` listesinde yoksa) `-ur` ile bittiği için geçerli kabul eder!
  3. **K8 — AKTS iş yükünde aralık yerine tam eşitlik (`isToplam === akts * 30`) zorunluluğu ([taslak.ts](file:///Users/baris/Documents/GitHub/akredit/packages/cekirdek/src/bologna/taslak.ts#L76-L81)):** YÖK mevzuatında (Yükseköğretim Yeterlilikler Çerçevesi) 1 AKTS = **25–30 saat** aralığındadır ve pek çok üniversitede (ör. 1 AKTS = 25 saat veya 27 saat kullanan kurumlar) ya da 1–2 saatlik yuvarlama farklarında OBS bunu kabul eder. [`bolognaDenetle`](file:///Users/baris/Documents/GitHub/akredit/packages/cekirdek/src/bologna/denetim.ts#L29) 25–30 aralığını kabul ederken [`taslakDenetle`](file:///Users/baris/Documents/GitHub/akredit/packages/cekirdek/src/bologna/taslak.ts#L77) tam `akts * 30` eşitliği dayatmaktadır.
  4. **Varsayılan İngilizce zorunluluğu ([bologna.ts](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/bologna.ts#L893), [L1176](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/bologna.ts#L1176)):** `ingilizce: z.boolean().default(true)` nedeniyle, OBS'sinde İngilizce alanı olmayan Türkçe programlarda bile modelden her alanın İngilizcesini üretmesi isteniyor; bu da bağlam penceresini (token) ve yanıt süresini ikiye katlıyor.
- **Önerilen düzeltme:**
  1. `K5` alt sınırını `8`'den `4` veya `5`'e çekin; `8–12` yerine `5–8` aralığını önerip `4–10` aralığını geçerli kabul edin.
  2. `K4` içinde `-ebilme/-abilme` eklerini de kabul edin ve `OLCULEMEZ` listesine `"sahip ol"`, `"farkında ol"`, `"haberdar ol"`, `"vakıf ol"` fiillerini ekleyin.
  3. `ingilizce` parametresinin varsayılanını ayrıştırılan OBS sayfasında İngilizce alan/sekme olup olmadığına göre otomatik belirleyin.

---

## 4. Güvenlik ve KVKK

### 4.1. KVKK yanılsaması: Öğrenci not tablosu MCP sunucusuna gelmeden önce yurt dışındaki yapay zekâ sağlayıcısına (Anthropic / OpenAI) düz metin olarak gidiyor
- **Önem:** Kritik
- **Kanıt:** [mcp-kullan/page.tsx](file:///Users/baris/Documents/GitHub/akredit/apps/web/src/app/(site)/mcp-kullan/page.tsx#L191-L192), [promptlar.ts](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/promptlar.ts#L173-L176), [not-tablosu.ts](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/not-tablosu.ts#L69), [AGENTS.md](file:///Users/baris/Documents/GitHub/akredit/AGENTS.md#L22)
- **Neden sorun:** [/mcp-kullan](file:///Users/baris/Documents/GitHub/akredit/apps/web/src/app/(site)/mcp-kullan/page.tsx#L191-L192) sayfasında:
  > *"Not tablosunda ad, soyad ve numara hesaplamadan önce atılır; öğrenciler o1, o2 gibi takma ad alır."*
  
  yazıyor ve [`OLCME_ADIMLARI`](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/promptlar.ts#L173-L176) istemi hocadan Excel not tablosunu doğrudan Claude/ChatGPT sohbetine yapıştırmasını istiyor.
  **Ancak mimari gerçek şudur:** Hoca öğrenci ad, soyad ve numaralarını içeren tabloyu Claude veya ChatGPT penceresine yapıştırdığı anda, bu veriler `akredit.org/mcp` sunucusundaki [`not_tablosu_ayristir`](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/not-tablosu.ts#L69) aracına ulaşmadan **önce** doğrudan ABD'deki Anthropic veya OpenAI sunucularına gönderilir ve sohbet geçmişine kaydedilir! Akredit sunucusunun kendi belleğinde `ad/soyad` sütununu silmesi, kişisel verinin çoktan yurt dışına aktarıldığı gerçeğini değiştirmez. Bu durum hem 6698 sayılı KVKK md. 9 (yurt dışına veri aktarımı) açısından öğretim elemanını idari/hukuki sorumluluk altına sokar, hem de deponun kendi İlke 7 kuralını (*"Kişisel veri, kurum izin vermedikçe yurt dışındaki bir yapay zekâ sağlayıcısına maskelenmeden gönderilmez"* — [AGENTS.md](file:///Users/baris/Documents/GitHub/akredit/AGENTS.md#L22)) ihlal eder.
- **Önerilen düzeltme:**
  1. Sitedeki *"ad, soyad ve numara hesaplamadan önce atılır"* ifadesini derhal düzeltin; hocayı **sohbete yapıştırmadan önce Excel'de Ad, Soyad ve Öğrenci No sütunlarını silmesi** konusunda kırmızı uyarı kutusuyla uyarın.
  2. [`not_tablosu_ayristir`](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/not-tablosu.ts#L69) aracı tablo başlığında `Ad`, `Soyad`, `Öğrenci No` veya 9–11 haneli numara sütunu gördüğünde sessizce atmak yerine hata döndürüp *"Kişisel verileri yapay zekâ sohbetine göndermeyin; lütfen Excel'de Ad/Soyad/Numara sütunlarını silip yalnız not sütunlarını yapıştırın ve bu mesajı sohbet geçmişinizden silin"* uyarısı versin.
  3. ÇK/PÇ hesaplamasını MCP yerine `akredit.org` üzerinde **%100 tarayıcı içi (client-side JavaScript, sunucuya ve LLM'e hiçbir veri göndermeyen)** bir sayfa olarak sunun.

### 4.2. Herkese açık MCP uç noktasında (`/mcp`) hız sınırı `X-Forwarded-For` sahteciliğiyle (spoofing) tamamen aşılabilir ve dış API'lere karşı yükseltme (amplification) saldırısına açık
- **Önem:** Kritik
- **Kanıt:** [http.ts](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/http.ts#L50-L76), [http.ts](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/http.ts#L126-L133), [kaynak-dogrula.ts](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/kaynak-dogrula.ts#L361-L366), [acik-mcp-hiz-siniri.md](file:///Users/baris/Documents/GitHub/akredit/docs/isletim/acik-mcp-hiz-siniri.md#L29), [IP-49.md](file:///Users/baris/Documents/GitHub/akredit/docs/raporlar/IP-49.md#L59-L68)
- **Neden sorun:**
  1. [`istemciAdresi`](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/http.ts#L126-L133) fonksiyonu IP adresini `x-forwarded-for` başlığının **ilk** öğesinden (`split(",")[0]`) alıyor. Standart ters vekiller (Traefik/Nginx) istemcinin gönderdiği `X-Forwarded-For` başlığına yeni IP'yi **sona** ekler (`X-Forwarded-For: <sahte-ip>, <gercek-ip>`). Saldırgan her istekte rastgele bir `X-Forwarded-For: 10.x.x.x` başlığı gönderdiğinde `split(",")[0]` her seferinde sahte IP'yi okur ve dakikada 60 istek sınırı tamamen devre dışı kalır! Üstelik [acik-mcp-hiz-siniri.md](file:///Users/baris/Documents/GitHub/akredit/docs/isletim/acik-mcp-hiz-siniri.md#L29) ve [IP-49.md](file:///Users/baris/Documents/GitHub/akredit/docs/raporlar/IP-49.md#L68) içinde ters vekil (Coolify/Traefik) hız sınırının sunucuda henüz uygulanmadığı (`DOĞRULANMADI`) açıkça yazılıdır.
  2. [`AdresKovasi`](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/http.ts#L63-L66) `enCokAdres = 10_000` dolduğunda en eski kaydı siler (`kovalar.keys().next().value`). Saldırgan 10.000 sahte başlık göndererek tüm gerçek IP sayaçlarını sıfırlayabilir.
  3. Hız sınırı aşıldığında saldırgan `kaynak_dogrula` aracına her istekte 10 kaynak göndererek ([kaynak-dogrula.ts](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/kaynak-dogrula.ts#L362)) Akredit sunucusuna istek başına 30'a kadar dış HTTPS sorgusu (Crossref, Open Library, Google Books) yaptırabilir; bu da `akredit.org` IP'sinin bu servisler tarafından kara listeye alınmasına yol açar.
- **Önerilen düzeltme:**
  1. `istemciAdresi` içinde Cloudflare kullanılıyorsa `cf-connecting-ip`, Traefik kullanılıyorsa `x-real-ip` veya `x-forwarded-for` listesinin **güvenilen vekil sayısına göre sondan** elemanını alın.
  2. `kaynak_dogrula` için IP başına ayrı ve çok daha sıkı bir kota (ör. dakikada en çok 5 çağrı) ile sunucu genelinde (global) eşzamanlı dış istek sınırı (semaphore / circuit breaker) ekleyin.

### 4.3. Gövde boyutu denetiminde bellek tükenmesi (OOM) ve büyük metinlerde senkron Regex (event-loop bloklama) riski
- **Önem:** Yüksek
- **Kanıt:** [http.ts](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/http.ts#L135-L141), [sunucu.ts](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/sunucu.ts#L50-L70), [kvkk.ts](file:///Users/baris/Documents/GitHub/akredit/packages/yz/src/guvence/kvkk.ts#L295-L335), [not-tablosu.ts](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/not-tablosu.ts#L163)
- **Neden sorun:**
  1. [`govdeOku`](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/http.ts#L135-L141) önce `content-length` başlığına bakıyor, ancak istemci `Transfer-Encoding: chunked` ile `Content-Length` göndermeden çok büyük bir akış (stream) yollarsa `await istek.arrayBuffer()` **tüm akışı belleğe aldıktan sonra** `tampon.byteLength > enBuyuk` kontrolü yapıyor.
  2. Her araç çağrısında [`hazirla()`](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/sunucu.ts#L50-L70) girdi nesnesindeki tüm string'ler üzerinde [`maskele()`](file:///Users/baris/Documents/GitHub/akredit/packages/yz/src/guvence/kvkk.ts#L295-L335) fonksiyonunu çalıştırıyor. `maskele()` içinde [`ADRES`](file:///Users/baris/Documents/GitHub/akredit/packages/yz/src/guvence/kvkk.ts#L24-L25) (`[\p{L}\d\s.,/-]{0,40}?` gibi geri izlemeli niceleyiciler) ve 146 isimlik [`AD_LISTESI`](file:///Users/baris/Documents/GitHub/akredit/packages/yz/src/guvence/kvkk.ts#L31-L185) dahil 12'den fazla karmaşık Unicode regex senkron olarak çalışıyor. 512 KB'lık ardışık isteklerle Node.js tek iş parçacıklı olay döngüsü (event loop) kilitlenebilir.
  3. Ayrıca [`not_tablosu_ayristir`](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/not-tablosu.ts#L163) şeması `max(2_000_000)` (2 MB) kabul edeceğini söylerken HTTP katmanı `512 * 1024` (512 KB) ile sınırlıdır ([http.ts](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/http.ts#L96)).
- **Önerilen düzeltme:**
  1. `istek.body` (`ReadableStream`) okunurken bayt sayacıyla akış sırasında `enBuyuk` aşıldığı anda akışı iptal edin (`reader.cancel()`).
  2. Bologna araçlarında (`kisiselVeriKapsami: "yok"` olanlarda) zaten sonuç reddedilmediği halde tüm HTML üzerinde ağır `maskele()` çalıştırmak yerine hafif kontrol yapın; buna karşılık Bologna araçlarında `kisiselVeriKapsami: "yok"` ([bologna.ts](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/bologna.ts#L266)) yerine `"ogrenci"` kapsamını kullanın ki yanlışlıkla yapıştırılan TCKN ve öğrenci numaraları engellensin.

### 4.4. Hukuk metinleri geçerli bir KVKK Aydınlatma Metni niteliği taşımıyor ve `llms.txt` ile çelişiyor
- **Önem:** Yüksek
- **Kanıt:** [kvkk/page.tsx](file:///Users/baris/Documents/GitHub/akredit/apps/web/src/app/(site)/kvkk/page.tsx#L19-L21), [kvkk/page.tsx](file:///Users/baris/Documents/GitHub/akredit/apps/web/src/app/(site)/kvkk/page.tsx#L45-L47), [gizlilik/page.tsx](file:///Users/baris/Documents/GitHub/akredit/apps/web/src/app/(site)/gizlilik/page.tsx#L20-L23), [kosullar/page.tsx](file:///Users/baris/Documents/GitHub/akredit/apps/web/src/app/(site)/kosullar/page.tsx#L15), [llms.txt](file:///Users/baris/Documents/GitHub/akredit/apps/web/public/llms.txt#L25-L31)
- **Neden sorun:**
  1. 6698 sayılı KVKK md. 10 ve Aydınlatma Yükümlülüğünün Yerine Getirilmesinde Uyulacak Usul ve Esaslar Hakkında Tebliğ md. 4 uyarınca aydınlatma metninde **veri sorumlusunun kimliği** (gerçek kişiyse adı-soyadı ve iletişim adresi; tüzel kişiyse unvanı) ve **veri sahibi başvuru kanalı** bulunmak zorundadır. Tüzel kişilik kurulmamış olsa bile siteyi işleten gerçek kişi (projenin geliştiricisi) kanunen veri sorumlusudur. [/kvkk](file:///Users/baris/Documents/GitHub/akredit/apps/web/src/app/(site)/kvkk/page.tsx#L19-L20) sayfasında *"veri sorumlusunun tüzel kimliği, adresi ve başvuru kanalları henüz kesinleştirilmemiştir"* yazması hukuken aydınlatma yükümlülüğünü ortadan kaldırmaz, aksine ihlali belgelemektedir.
  2. Metinlerin içinde avukatın inceleme sırasında bıraktığı şablon/kontrol ifadeleri temizlenmeden yayına alınmış: *"Hangi kategorilerin gerçekten işlendiği, etkin hizmet ve veri envanteriyle doğrulanmalıdır"* ([kvkk/page.tsx](file:///Users/baris/Documents/GitHub/akredit/apps/web/src/app/(site)/kvkk/page.tsx#L45-L46)), *"doğrulandıktan sonra yapılabilir"* ([gizlilik/page.tsx](file:///Users/baris/Documents/GitHub/akredit/apps/web/src/app/(site)/gizlilik/page.tsx#L57)).
  3. [/proje](file:///Users/baris/Documents/GitHub/akredit/apps/web/src/site/icerik.ts#L318) sayfası hukuk metinlerine `"Yayında"` derken, [public/llms.txt](file:///Users/baris/Documents/GitHub/akredit/apps/web/public/llms.txt#L25-L31) hâlâ `"hukuk metinleri taslaktır"` diyor.
- **Önerilen düzeltme:** Tüzel kişilik kurulana kadar veri sorumlusu olarak işletmeci gerçek kişinin adını ve kurumsal bir e-posta adresini (`kvkk@akredit.org`) yazın; şarta bağlı şablon cümlelerini ("doğrulanmalıdır", "işlenebilir") kaldırıp yalnız şu an açık olan site ve `/mcp` uç noktasının gerçekte ne işlediğini (IP adresi, hız sınırı sayacı, hata günlüğü) kesin ifadelerle yazın.

---

## 5. Mimari ve Kod Kalitesi

### 5.1. Devasa askıda (ölü) kod kütlesi üretim derlemesine ve CI sürecine yük bindiriyor
- **Önem:** Yüksek
- **Kanıt:** [next.config.ts](file:///Users/baris/Documents/GitHub/akredit/apps/web/next.config.ts#L14-L31), [ci.yml](file:///Users/baris/Documents/GitHub/akredit/.github/workflows/ci.yml#L12-L90), [yayin.yml](file:///Users/baris/Documents/GitHub/akredit/.github/workflows/yayin.yml#L41-L65)
- **Neden sorun:** Canlı ürün bugün yalnız statik tanıtım sayfaları ve `acik-mcp`'den oluşurken, [apps/web/next.config.ts](file:///Users/baris/Documents/GitHub/akredit/apps/web/next.config.ts#L14-L31) 15 çalışma alanı paketinin tamamını (`@akredit/vt`, `@akredit/servis`, `@akredit/depo`, `@akredit/yetki`, `@akredit/surec`, `@akredit/anket` vb.) ve `pglite`, `postgres`, `nodemailer` paketlerini üretim imajına bağlıyor. Her `main` itmesinde [ci.yml](file:///Users/baris/Documents/GitHub/akredit/.github/workflows/ci.yml) ve [yayin.yml](file:///Users/baris/Documents/GitHub/akredit/.github/workflows/yayin.yml) PostgreSQL 17 + pgvector konteyneri kaldırıp göçleri çalıştırıyor ve kullanılmayan `akredit-isci` Docker imajını derleyip GHCR'ye yüklüyor.
- **Önerilen düzeltme:**
  1. `yayin.yml` içinden askıdaki `isci` Docker imajı derlemesini çıkarın veya `workflow_dispatch` / yol filtresine (`paths`) bağlayın.
  2. `apps/web` içinde `AKREDIT_BARINDIRMA` kapalıyken panel/API rotalarının ve veritabanı paketlerinin derlemeye girmesini önleyin.

### 5.2. `await connection()` ile zorunlu SSR yapılması ve `s-maxage=300` önbelleklemenin CSP Nonce mekanizmasını boşa düşürmesi
- **Önem:** Yüksek
- **Kanıt:** [layout.tsx](file:///Users/baris/Documents/GitHub/akredit/apps/web/src/app/layout.tsx#L41-L43), [proxy.ts](file:///Users/baris/Documents/GitHub/akredit/apps/web/src/proxy.ts#L15-L21), [basliklar.ts](file:///Users/baris/Documents/GitHub/akredit/apps/web/src/guvenlik/basliklar.ts#L63), [csp.ts](file:///Users/baris/Documents/GitHub/akredit/apps/web/src/guvenlik/csp.ts#L18-L35)
- **Neden sorun:** [layout.tsx](file:///Users/baris/Documents/GitHub/akredit/apps/web/src/app/layout.tsx#L42-L43) her sayfada `await connection()` çağırarak tüm statik tanıtım sayfalarını çalışma zamanında (SSR) üretmeye zorluyor; gerekçe olarak istek başına CSP `nonce` üretilmesi yazılmış. Ancak [proxy.ts](file:///Users/baris/Documents/GitHub/akredit/apps/web/src/proxy.ts#L19-L21) aynı sayfalara `Cache-Control: public, s-maxage=300, stale-while-revalidate=600` başlığı veriyor! Önünde bir paylaşımlı önbellek (CDN) varsa 5 dakika boyunca tüm ziyaretçilere **aynı nonce** sunulur (yani istek başına nonce güvenliği zaten ortadan kalkar) ya da CDN başlık ile gövdeyi farklı önbelleklerse CSP hatasıyla sayfa betikleri tamamen kırılır.
- **Önerilen düzeltme:** Tanıtım sayfalarında ya `s-maxage` başlığını kaldırıp gerçekten istek başına yanıt dönün ya da statik sayfalarda dinamik nonce yerine sabit CSP (veya hash tabanlı CSP) kullanıp sayfaları tamamen statik (SSG) üretin.

### 5.3. `@akredit/acik-mcp` derleme betiğinin (`scripts/derle.ts`) kırılganlığı ve npm yayın belirsizliği
- **Önem:** Orta
- **Kanıt:** [derle.ts](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/scripts/derle.ts#L33-L45), [package.json](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/package.json#L28-L31), [IP-49.md](file:///Users/baris/Documents/GitHub/akredit/docs/raporlar/IP-49.md#L55)
- **Neden sorun:**
  1. [derle.ts](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/scripts/derle.ts#L33-L42) `tsc` çıktısı üzerinde regex (`replace(/(["'])(@akredit\/[a-z-]+...)/)`) çalıştırarak 5 iç paketin tüm derlenmiş dosyalarını `dist/ic/` altına kopyalıyor ve import yollarını el yordamıyla yamıyor. Bu 5 paketten herhangi birine yeni bir dış bağımlılık eklendiğinde `apps/acik-mcp/package.json` içindeki `dependencies` otomatik güncellenmediği için `npx @akredit/acik-mcp` çalışma zamanında `ERR_MODULE_NOT_FOUND` ile çöker.
  2. Sitede [/mcp-kullan](file:///Users/baris/Documents/GitHub/akredit/apps/web/src/app/(site)/mcp-kullan/page.tsx#L247-L255) sayfasında kullanıcılara `npx -y @akredit/acik-mcp` komutu öneriliyor, ancak [IP-49.md](file:///Users/baris/Documents/GitHub/akredit/docs/raporlar/IP-49.md#L55) raporunda *"npm yayını: paket 0.4.0'a yükseltildi ve derlendi; yayın yapılmadı"* yazıyor (`DOĞRULANMADI` — yerel ortamda ağ kapalı olduğundan `registry.npmjs.org/@akredit/acik-mcp` üzerindeki güncel sürüm doğrulanamadı). Paket npm'de yayımlanmadıysa veya eski sürümdeyse sitedeki `npx` ve `claude mcp add` komutları doğrudan başarısız olur veya eski kodu çalıştırır.
- **Önerilen düzeltme:** Regex ile import yamamak yerine `tsup` veya `esbuild` (yalnız `@akredit/*` iç paketlerini bundle edip `zod` ve `@modelcontextprotocol/sdk`'yı external bırakan standart yapılandırma) kullanın ve `yayin.yml` içine sürüm etiketiyle otomatik `npm publish --provenance` adımı ekleyin.

---

## 6. Site ve Tasarım

### 6.1. Ana sayfa ürünün ne işe yaradığını ve somut çıktısını göstermeden kurulum komutu dayatıyor
- **Önem:** Yüksek
- **Kanıt:** [page.tsx](file:///Users/baris/Documents/GitHub/akredit/apps/web/src/app/(site)/page.tsx#L124-L186)
- **Neden sorun:** Ana sayfa ([page.tsx](file:///Users/baris/Documents/GitHub/akredit/apps/web/src/app/(site)/page.tsx#L128-L134)) *"Akreditasyon ve Bologna yardımcısı / Ücretsiz, açık kaynak, hesapsız. Kendi yapay zekânızda çalışır."* dedikten hemen sonra hocaya teknik kurulum kutusunu gösteriyor. Öğretim elemanı *"Ben bunu kurunca ekranda ne göreceğim? Benim 14 haftalık Bologna ders planımı, AKTS iş yükü tablomu, ÇK/PÇ matrisimi nasıl hazırlıyor?"* sorusunun cevabını (gerçek bir önce/sonra örneğini veya örnek sohbet ekranını) ana sayfada hiç görmüyor.
- **Önerilen düzeltme:** Ana sayfada kurulum adımlarından **önce**, gerçek bir ders için (ör. *"BİL201 Veri Yapıları — Eksik Bologna sayfasından tam denetimli 14 haftalık plana ve AKTS tablosuna geçiş"*) somut girdi/çıktı örneği gösterin.

### 6.2. Sitenin her yerinde "Askıda / Tamamlanmadı / Tüzel kimlik yok" uyarıları var ve tek iletişim kanalı kişisel bir LinkedIn profili
- **Önem:** Yüksek
- **Kanıt:** [iletisim.ts](file:///Users/baris/Documents/GitHub/akredit/apps/web/src/site/iletisim.ts#L4), [iletisim/page.tsx](file:///Users/baris/Documents/GitHub/akredit/apps/web/src/app/(site)/iletisim/page.tsx#L28-L51), [deneyin/page.tsx](file:///Users/baris/Documents/GitHub/akredit/apps/web/src/app/(site)/deneyin/page.tsx#L19-L31), [proje/page.tsx](file:///Users/baris/Documents/GitHub/akredit/apps/web/src/app/(site)/proje/page.tsx#L60-L68)
- **Neden sorun:**
  1. Üst menüye veya alt bilgiye tıklayan bir rektör yardımcısı, dekan veya kalite koordinatörü `/deneyin`, `/proje`, `/iletisim`, `/kvkk`, `/guvenlik` sayfalarının tamamında *"Demo henüz tamamlanmadı"*, *"Sponsor bulunamadı"*, *"Tüzel kimlik belirlenmedi"*, *"Sızma testi yapılmadı"* mesajlarıyla karşılaşıyor. Bu dil dürüstlük sınırını aşıp terk edilmiş/güvensiz proje izlenimi veriyor.
  2. Sitede bir e-posta adresi (`iletisim@akredit.org`) veya GitHub Discussions bağlantısı bile yok; tüm iletişim düğmeleri kişisel bir LinkedIn profiline (`https://www.linkedin.com/in/tialkan/`) gidiyor ([iletisim.ts](file:///Users/baris/Documents/GitHub/akredit/apps/web/src/site/iletisim.ts#L4)). LinkedIn hesabı olmayan veya resmî kurumsal e-posta ile yazışmak zorunda olan kamu üniversitesi yöneticileri projeye ulaşamaz.
- **Önerilen düzeltme:**
  1. `akredit.org` alan adı üzerinde bir e-posta yönlendirmesi (`iletisim@akredit.org`, `guvenlik@akredit.org`) ve GitHub Issues/Discussions bağlantısı açın.
  2. Askıdaki barındırılan platform sayfalarını (`/deneyin` vb.) navigasyondan kaldırın veya `/deneyin` sayfasını "Sponsor bulunamadığı için kapalı" demek yerine doğrudan tarayıcıda çalışan sunucusuz bir Bologna / ÇK-PÇ deneme aracına dönüştürün.

### 6.3. Yapay zekâ üretimi hissi veren görseller ve erişilebilirlik/CSS pürüzleri
- **Önem:** Orta
- **Kanıt:** [gorsel.tsx](file:///Users/baris/Documents/GitHub/akredit/apps/web/src/site/gorsel.tsx#L12-L21), [page.tsx](file:///Users/baris/Documents/GitHub/akredit/apps/web/src/app/(site)/page.tsx#L129), [page.tsx](file:///Users/baris/Documents/GitHub/akredit/apps/web/src/app/(site)/page.tsx#L245-L250), [globals.css](file:///Users/baris/Documents/GitHub/akredit/apps/web/src/app/globals.css#L96-L104)
- **Neden sorun:**
  1. Sitedeki `calisma-masasi`, `amfi`, `avlu`, `araclar` gravür görselleri ([gorsel.tsx](file:///Users/baris/Documents/GitHub/akredit/apps/web/src/site/gorsel.tsx#L12-L21)) hem yapay zekâ üretimi olduğunu belli ediyor hem de ürünün çözdüğü somut işle (OBS formları, AKTS tabloları, ölçüt ağaçları) hiçbir görsel bağ kurmuyor.
  2. [page.tsx](file:///Users/baris/Documents/GitHub/akredit/apps/web/src/app/(site)/page.tsx#L245-L250) içindeki kapanış sloganı (`SLOGAN.split(" ").map(...)`) her kelimeyi ayrı bir `<span>` içine böldüğü için bazı ekran okuyucularda cümlenin bütünlüğü yerine kelime kelime kopuk okunmasına yol açar.
  3. [globals.css](file:///Users/baris/Documents/GitHub/akredit/apps/web/src/app/globals.css#L96-L104) içindeki `@layer` dışı `h1, h2` kuralları, bileşenlerde verilen `leading-[1.08]`, `tracking-[-0.025em]` gibi Tailwind sınıflarını ([page.tsx](file:///Users/baris/Documents/GitHub/akredit/apps/web/src/app/(site)/page.tsx#L129)) sessizce eziyor.
- **Önerilen düzeltme:** Dekoratif gravür görselleri yerine gerçek araç çıktılarının (Bologna denetim raporu, ÇK/PÇ tablosu, YÖKAK kanıt listesi) temiz arayüz bileşenlerini gösterin; slogan paragrafındaki kelime bölme (`split(" ")`) yapısını kaldırın veya kapsayıcıya `aria-label={SLOGAN}` verip iç `span`'lara `aria-hidden="true"` ekleyin.

---

## 7. Ürün ve Sürdürülebilirlik

### 7.1. "YZ bilmeyen hoca" hedef kitlesi ile "Özel MCP Bağlayıcısı" dağıtım kanalı arasında temel ürün-kanal uyumsuzluğu var
- **Önem:** Kritik
- **Kanıt:** [0008-mcp-odagi-barindirma-askida.md](file:///Users/baris/Documents/GitHub/akredit/docs/adr/0008-mcp-odagi-barindirma-askida.md#L1-L40), [araclar.ts](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/araclar.ts#L45-L280)
- **Neden sorun:**
  1. Türkiye'deki öğretim elemanlarının büyük çoğunluğu ücretsiz ChatGPT veya ücretsiz Claude kullanır; MCP protokolünü bilmez, ChatGPT'de ücretli Developer Mode açamaz, tarayıcı ajanı kuramaz.
  2. En çarpıcı nokta şudur: `apps/acik-mcp` içindeki 11 aracın 10'u (`bologna_ayristir`, `bologna_denetle`, `bologna_taslak_denetle`, `is_yuku_oner`, `not_tablosu_ayristir`, `ck_pc_hesapla`, `olcut_ara`, `olcut_getir`, `kanit_oneri`, `rapor_dil_denetle`) **hiçbir yapay zekâ modeli veya veritabanı kullanmayan, %100 deterministik, sıfır sunucu maliyetli saf TypeScript fonksiyonlarıdır!**
  3. Bu fonksiyonları çalıştırmak için hocayı MCP kurmaya zorlamak, potansiyel kullanıcıların %90'ından fazlasını daha ilk adımda kaybetmek demektir.
- **Önerilen düzeltme (Benimsenmeyi artıracak ilk 3 adım):**
  1. **Adım 1 — `akredit.org` üzerinde sıfır sunucu maliyetli (tarayıcı içi / client-side) Web Araçları açın:**
     `@akredit/cekirdek`, `@akredit/olcme` ve `@akredit/cerceveler` zaten saf TypeScript olduğu için doğrudan tarayıcıda çalışır. `/deneyin` sayfasını kapatmak yerine 3 sekmeli tarayıcı içi araç yapın:
     - **Sekme 1 (ÇK/PÇ Hesaplayıcı):** Hoca Excel not tablosunu yapıştırır, hesaplama **hocanın kendi tarayıcısında** yapılır (sunucuya ve LLM'e hiçbir öğrenci verisi gitmez — KVKK sorunu kökten çözülür!), sonuç DOCX/XLSX olarak indirilir.
     - **Sekme 2 (Bologna Denetleyici ve İstem Üretici):** Hoca OBS sayfasını yapıştırır, eksik/hatalı alanlar ve AKTS iş yükü anında ekranda görünür; **"Claude / ChatGPT'ye Yapıştırılacak Hazır İstem Kopyala"** düğmesiyle hoca hiçbir MCP kurmadan ücretsiz ChatGPT/Claude'da bile aynı kalitede taslak üretebilir.
     - **Sekme 3 (YÖKAK / MÜDEK / FEDEK / EPDAD / SABAK Ölçüt ve Kanıt Arama):** Hoca ölçütü tarayıcıda arar, resmî metni ve kanıt önerilerini anında görür.
  2. **Adım 2 — ChatGPT Custom GPT ve Claude Project şablonu yayımlayın:**
     ChatGPT'de özel MCP bağlayıcısı kurmak Developer Mode gerektirir; ancak **Custom GPT (Actions / OpenAPI)** bağlantısı ücretsiz dahil tüm ChatGPT kullanıcıları tarafından **tek tıkla (kurulumsuz)** açılabilir! `/mcp` uç noktasının yanına basit bir REST/OpenAPI sarmalayıcısı (`/api/acik/...`) ekleyip ChatGPT Mağazası'nda "Akredit — Bologna ve Akreditasyon Yardımcısı" GPT'si yayımlamak kurulum sürtünmesini sıfıra indirir.
  3. **Adım 3 — Somut kullanım istatistiğiyle kurumsal sponsorluğa gidin:**
     Hiçbir üniversite veya sponsor "demo kapalı, kullanıcı yok" durumundaki bir projeye bütçe vermez. Tarayıcı içi araçlar ve tek tıkla çalışan Custom GPT üzerinden aylık birkaç bin öğretim elemanı trafiği oluştuğunda, üniversitelerin Kalite Koordinatörlüklerine doğrudan veriyle gidilebilir.

---

## En Kritik 10 Sorun (Öncelik Sırasıyla Tek Liste)

1. **[Kritik — KVKK & Güvenlik]** Öğrenci not tablosunun (`not_tablosu_ayristir`) sohbete yapıştırılmasıyla öğrenci ad/soyad/numara verilerinin MCP sunucusundan önce doğrudan yurt dışındaki LLM sağlayıcılarına (Anthropic/OpenAI) düz metin olarak gitmesi ([promptlar.ts](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/promptlar.ts#L173-L176), [mcp-kullan/page.tsx](file:///Users/baris/Documents/GitHub/akredit/apps/web/src/app/(site)/mcp-kullan/page.tsx#L191-L192)).
2. **[Kritik — Halüsinasyon & Hukuki Risk]** `"4) Hepsini akıllıca doldur"` ve `"4) Hepsini doldur ve kaydet"` akışının, hocaya sormadan değerlendirme yüzdelerini, 14 haftalık konuları, ön hazırlık/dokümanları ve ÖÇ-PÇ katkı puanlarını dersin yalnız adına bakarak uydurup resmî OBS'ye kaydetmeye çalışması ([promptlar.ts](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/promptlar.ts#L38-L45), [L119-L144](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/promptlar.ts#L119-L144)).
3. **[Kritik — Hoca Deneyimi]** Sohbete düz `"akredit"` yazmanın MCP `prompts/get` çağrısını tetiklememesi ve çoğu istemcinin `instructions` alanını yok sayması nedeniyle vaat edilen başlangıç menüsünün çıkmaması ([page.tsx](file:///Users/baris/Documents/GitHub/akredit/apps/web/src/app/(site)/page.tsx#L194), [sunucu.ts](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/sunucu.ts#L21-L31)).
4. **[Kritik — Güvenlik]** `/mcp` uç noktasındaki hız sınırının (`AdresKovasi`) `X-Forwarded-For` başlığının ilk öğesini okuması nedeniyle tek satırlık başlık sahteciliğiyle (spoofing) tamamen aşılabilmesi ve `kaynak_dogrula` üzerinden dış API'lere yükseltme (amplification) saldırısına açık olması ([http.ts](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/http.ts#L126-L133), [kaynak-dogrula.ts](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/kaynak-dogrula.ts#L361-L366)).
5. **[Kritik — Ürün Stratejisi]** %100 deterministik ve sıfır maliyetli olan araçların (Bologna denetimi, ÇK/PÇ hesabı, ölçüt arama) tarayıcıda doğrudan çalıştırılmak yerine yalnız kurulumu zor MCP bağlayıcısı arkasına kilitlenmesi; `/deneyin` sayfasının kapatılmış olması ([deneyin/page.tsx](file:///Users/baris/Documents/GitHub/akredit/apps/web/src/app/(site)/deneyin/page.tsx#L19-L31)).
6. **[Kritik — Hoca Deneyimi]** Ana sayfadaki ilk kurulum kutusunun `Claude Code ya da Codex` için yazılmış olması ve ana sayfa ile `/mcp-kullan` arasındaki Claude kurulum adımlarının birbiriyle çelişmesi ([page.tsx](file:///Users/baris/Documents/GitHub/akredit/apps/web/src/app/(site)/page.tsx#L152-L165), [mcp-kullan/page.tsx](file:///Users/baris/Documents/GitHub/akredit/apps/web/src/app/(site)/mcp-kullan/page.tsx#L204-L210), [yardim.ts](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/yardim.ts#L58-L70)).
7. **[Kritik — İçerik Tutarsızlığı]** `/cerceveler` sayfasında ve `kaynaklar.json` içinde *"MÜDEK ve diğer program akreditasyon kuruluşları henüz yok, ölçüt ağacı boştur"* yazarken MCP sunucusunda MÜDEK, FEDEK, EPDAD ve SABAK'ın kullanımda olması ([cerceveler/page.tsx](file:///Users/baris/Documents/GitHub/akredit/apps/web/src/app/(site)/cerceveler/page.tsx#L97-L103), [cerceveler.ts](file:///Users/baris/Documents/GitHub/akredit/packages/cerceveler/src/program-tablolari/cerceveler.ts#L45-L85)).
8. **[Yüksek — Doğruluk]** `bologna_taslak_denetle` aracının kaynakların `kaynak_dogrula` ile doğrulandığını kontrol etmemesi; içinde 4 haneli yıl geçen her uydurma metni `gecer: true` sayması ([bologna.ts](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/bologna.ts#L456-L477)).
9. **[Yüksek — Akreditasyon & Bologna Kuralları]** `taslakDenetle` içinde 8–12 öğrenme çıktısı zorunluluğu (`< 8` hata), yalnız geniş zaman eki (`-ar/-er/-ır/-ir`) kabul edilmesi ve OBS'den `Ctrl+A, Ctrl+C` ile düz metin kopyalandığında Proliz ayrıştırıcısının devre dışı kalıp katkı matrisini boş döndürmesi ([taslak.ts](file:///Users/baris/Documents/GitHub/akredit/packages/cekirdek/src/bologna/taslak.ts#L28-L97), [bologna.ts](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/bologna.ts#L946-L959), [genel-ayristir.ts](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/genel-ayristir.ts#L474-L476)).
10. **[Yüksek — Hukuk & Güven]** `/kvkk` ve `/gizlilik` sayfalarında veri sorumlusu kimliğinin ve e-posta adresinin bulunmaması, avukat inceleme notlarının ("doğrulanmalıdır") metin içinde unutulmuş olması ve sitedeki tek iletişim kanalının kişisel LinkedIn profili olması ([kvkk/page.tsx](file:///Users/baris/Documents/GitHub/akredit/apps/web/src/app/(site)/kvkk/page.tsx#L19-L47), [iletisim.ts](file:///Users/baris/Documents/GitHub/akredit/apps/web/src/site/iletisim.ts#L4)).

---

## İlk 2 Haftada Yapılması Gereken Somut İş Planı

### 1. Hafta: Güvenlik, KVKK, Doğruluk ve Kırık Akışların Onarımı
1. **Gün 1–2 (Güvenlik & Hız Sınırı):**
   - [http.ts](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/http.ts#L126-L141) içinde `istemciAdresi` fonksiyonunu `cf-connecting-ip` / `x-real-ip` veya `x-forwarded-for` son güvenilir elemanını alacak şekilde düzeltin; `govdeOku` fonksiyonunu akış (stream) sırasında 512 KB sınırını aşarsa anında kesecek şekilde yeniden yazın.
   - `kaynak_dogrula` aracına IP başına dakikada 5 istek sınırı ve dış API çağrılarına eşzamanlılık sınırı ekleyin.
   - [bologna.ts](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/bologna.ts#L266) içindeki `kisiselVeriKapsami: "yok"` ayarını `"ogrenci"` yapın.
2. **Gün 3–4 (Halüsinasyon Engelleri & Bologna Kuralları):**
   - [sunucu.ts](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/sunucu.ts) içine parametresiz `akredit_basla` aracını ekleyin (sohbette `"akredit"` yazıldığında istemci `prompts` desteklemese bile aracın çağrılıp menüyü döndürmesini sağlayın).
   - [promptlar.ts](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/promptlar.ts#L119-L144) içinde `"4) Hepsini akıllıca doldur"` seçilse bile sınav/ödev değerlendirme yüzdelerini ve dersin uygulama durumunu hocaya sormayı zorunlu kılın; `"4) Hepsini doldur ve kaydet"` seçeneğinden otomatik `Kaydet`e basma talimatını kaldırın.
   - [bologna.ts](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/bologna.ts#L456-L477) içinde kaynakların `kaynak_dogrula` ile doğrulandığını denetleyin.
   - [taslak.ts](file:///Users/baris/Documents/GitHub/akredit/packages/cekirdek/src/bologna/taslak.ts#L28-L97) içinde öğrenme çıktısı alt sınırını 4'e çekin, `-ebilme/-abilme` kipini kabul edin ve [genel-ayristir.ts](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/genel-ayristir.ts#L474-L476) içine `Ctrl+A, Ctrl+C` düz metin katkı matrisi ayrıştırıcısı ekleyin.
3. **Gün 5 (Resmî Çerçeve Yamaları & npm Yayını):**
   - YÖKAK `A.4.1`, `B.2.2` ve EPDAD `2.1.1` eksik rubrik hücrelerini resmî PDF'ten tamamlayın.
   - [derle.ts](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/scripts/derle.ts) paketlemesini sağlamlaştırıp `@akredit/acik-mcp` paketini npm'de yayımlayın ve `npx -y @akredit/acik-mcp` komutunu temiz bir ortamda doğrulayın.

### 2. Hafta: Site, Hukuk, KVKK Korumalı Web Araçları ve Dağıtım
4. **Gün 6–7 (Site Tutarsızlıkları & Hukuk Metinleri):**
   - [/cerceveler](file:///Users/baris/Documents/GitHub/akredit/apps/web/src/app/(site)/cerceveler/page.tsx), [kaynaklar.json](file:///Users/baris/Documents/GitHub/akredit/kaynaklar/resmi/kaynaklar.json) ve [llms.txt](file:///Users/baris/Documents/GitHub/akredit/apps/web/public/llms.txt) dosyalarını güncel çerçeve verisiyle eşitleyin.
   - Ana sayfadaki `Claude Code / Codex` kutusunu kaldırıp gerçek bir Bologna/ÇK-PÇ önce-sonra örneği koyun; `/mcp-kullan` ile ana sayfanın kurulum adımlarını tek kaynaktan besleyin.
   - `/kvkk` ve `/gizlilik` sayfalarındaki avukat şablon notlarını temizleyin, gerçek kişi veri sorumlusu kimliğini ve `iletisim@akredit.org` e-posta adresini ekleyin.
5. **Gün 8–10 (Tarayıcı İçi — Sıfır Sunucu Maliyetli `/deneyin` Araçları):**
   - `/deneyin` sayfasını "Sponsor bulunamadığı için kapalı" olmaktan çıkarıp, `@akredit/olcme`, `@akredit/cekirdek` ve `@akredit/cerceveler` paketlerini **doğrudan istemci tarayıcısında (client-side)** çalıştıran 3 araca dönüştürün:
     1. **Tarayıcı İçi ÇK/PÇ Hesaplayıcı** (öğrenci not tablosu tarayıcıdan dışarı çıkmaz, LLM'e gitmez).
     2. **Tarayıcı İçi Bologna Denetleyici + Tek Tıkla İstem Üretici** (MCP kuramayan hocalar için).
     3. **Tarayıcı İçi Ölçüt ve Kanıt Arama Motoru** (YÖKAK, MÜDEK, FEDEK, EPDAD, SABAK).

---

## `DOĞRULANMADI` İşaretli İddialar ve Doğrulama Sınırları

İnceleme sırasında yerel çalışma ortamında dış ağ erişimi kapalı olduğundan ve depodaki kendi raporlarınızda da açık bırakıldığından, aşağıdaki noktalar tahmin edilmemiş ve **`DOĞRULANMADI`** olarak işaretlenmiştir:

1. **Canlı ters vekil (Coolify / Traefik / Cloudflare) hız sınırı ve IP başlığı davranışı (`DOĞRULANMADI`):** [docs/isletim/acik-mcp-hiz-siniri.md](file:///Users/baris/Documents/GitHub/akredit/docs/isletim/acik-mcp-hiz-siniri.md#L29) ve [docs/raporlar/IP-49.md](file:///Users/baris/Documents/GitHub/akredit/docs/raporlar/IP-49.md#L68) içinde de belirtildiği üzere, `https://akredit.org/mcp` önünde Traefik veya Cloudflare'in `X-Forwarded-For` başlığını nasıl yazdığı ve vekil katmanında hız sınırı olup olmadığı canlı sunucu yapılandırmasına erişilemediği için doğrulanmamıştır (ancak [http.ts](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/http.ts#L128) içindeki `split(",")[0]` kusuru kodda kesindir).
2. **`@akredit/acik-mcp` paketinin npm kayıt defterindeki (`registry.npmjs.org`) güncel durumu (`DOĞRULANMADI`):** [docs/raporlar/IP-49.md](file:///Users/baris/Documents/GitHub/akredit/docs/raporlar/IP-49.md#L55) *"yayın yapılmadı"* diyor; paket sonradan elle `npm publish` edildiyse bile yerel ağsız ortamda canlı npm kaydı sorgulanamamıştır.
3. **Claude.ai ve ChatGPT web arayüzlerinin bugünkü canlı menü adları ve `InitializeResult.instructions` davranışı (`DOĞRULANMADI`):** [apps/acik-mcp/src/yardim.ts](file:///Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/yardim.ts#L73) ve [docs/raporlar/IP-49.md](file:///Users/baris/Documents/GitHub/akredit/docs/raporlar/IP-49.md#L46) içinde de işaretlendiği üzere, Claude.ai ve ChatGPT arayüzlerinde düz `"akredit"` yazıldığında `SUNUCU_TALIMATI` alanının modeli deterministik olarak menü göstermeye yönlendirip yönlendirmediği canlı istemci oturumlarında doğrulanmamıştır.
4. **Canlı üniversite OBS sistemlerinde (Proliz, ÜBYS, Kion) tarayıcı ajanıyla form kaydetme başarımı (`DOĞRULANMADI`):** Depoda statik HTML ayrıştırma testleri vardır ancak canlı bir üniversite OBS oturumunda tarayıcı ajanının sekme sekme form doldurup kaydettiğine dair uçtan uca test veya kayıt yoktur.
5. **Resmî çerçeve ölçüt ağaçlarının (`packages/cerceveler`) uzman onayı (`DOĞRULANMADI`):** Kodda tüm çerçeveler `dogrulandi: false` ([veri-resmi.ts](file:///Users/baris/Documents/GitHub/akredit/packages/cerceveler/src/veri-resmi.ts#L95), [cerceveler.ts](file:///Users/baris/Documents/GitHub/akredit/packages/cerceveler/src/program-tablolari/cerceveler.ts#L79)) olarak işaretlidir; PDF/DOCX'ten otomatik ayrıştırılan metinlerin resmî belgelerle %100 satır satır uzman kontrolü henüz tamamlanmamıştır.