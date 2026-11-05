Tarık hocam, **“yazılım tamamlandı” iddiası, incelediğim açık MCP akışının güvence düzeyiyle uyuşmuyor.** En büyük sorun, matematiksel ve biçimsel denetimden geçen bir taslağın, dersin gerçek uygulamasını doğrulayan içerik gibi OBS’ye kaydedilebilmesi. “Uydurma yok” ilkesi burada kodla tam uygulanmıyor.

İnceleme 5 Kasım 2026 tarihinde yapıldı. Yerel depo commit’i `b36d301`, GitHub’ın herkese açık HEAD’iyle eşleşiyor. Canlı ana sayfayı tarayıcıda, kurulum sayfasını HTTP üzerinden açtım; `/mcp` uç noktasından gerçek `initialize` yanıtı aldım. Aşağıdaki kod bağlantıları incelediğim yerel dosyalara gidiyor.

Test çalıştırma girişimi `vitest: command not found` nedeniyle başlamadı; bağımlılıklar kurulu değildi. **Testlerin güncel olarak geçtiği DOĞRULANMADI.** Bu inceleme bağımsız sızma testi, tam mevzuat uygunluk denetimi veya bütün OBS’lerde kullanıcı testi değildir.

**1. Hoca deneyimi**

**F1 — Yüksek: “Akredit’i ekle, OBS’yi doldur” akışında ikinci bir kurulum bağımlılığı saklı.**

**Kanıt:** [promptlar.ts:94](/Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/promptlar.ts:94), [kurulum sayfası:123](</Users/baris/Documents/GitHub/akredit/apps/web/src/app/(site)/mcp-kullan/page.tsx:123>).

MCP bağlantısı, asistana OBS tarayıcısını kontrol etme yeteneği kazandırmıyor. Akış ayrıca tarayıcı kontrolü, oturum açma, sayfa okuma ve form yazma yeteneği gerektiriyor. Teknik bilgisi olmayan hoca MCP’yi başarıyla ekledikten sonra asıl işte takılabilir.

**Düzeltme:** Kurulumun başına yetenek kontrolü koyun: “Akredit bağlı mı?”, “Tarayıcı kontrolü var mı?”, “Bu ortamda OBS’ye yazılabilir mi?” Sonuca göre ayrı ve sınanmış akış gösterin. Desteklenmeyen ortamda uçtan uca otomasyon vaadini göstermeyin.

**F2 — Orta: Kurulum rehberleri tek bir güncel kullanıcı yolunda birleşmiyor.**

**Kanıt:** Canlı [ana sayfa](https://akredit.org/), [ayrıntılı kurulum:203](</Users/baris/Documents/GitHub/akredit/apps/web/src/app/(site)/mcp-kullan/page.tsx:203>).

Ana sayfa Claude için Settings → Connectors anlatırken ayrıntılı rehber Customize → Connectors diyor. Güncel Anthropic belgesi bireysel hesaplar için Customize → Connectors yolunu veriyor; kurum hesaplarının ayrı yönetici adımları var. [Anthropic kurulum belgesi](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp)

ChatGPT rehberi geliştirici kipini anlatıyor; ancak **bağlayıcı + tarayıcı kontrolü + OBS’ye yazmanın aynı kullanıcı ortamında birlikte çalıştığı DOĞRULANMADI**. MCP bağlantısının kurulabilmesi, bu birleşimin çalıştığını kanıtlamaz. [OpenAI özel MCP belgesi](https://developers.openai.com/api/docs/guides/custom-mcp-server)

**Düzeltme:** İstemci, hesap türü, işletim sistemi, tarayıcı yeteneği ve son test tarihini içeren destek tablosu yayımlayın. Metinleri tek kaynaktan üretin.

**F3 — Orta: “akredit” kelimesi güvenilir bir uygulama başlatıcısı değil.**

**Kanıt:** [sunucu.ts:174](/Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/sunucu.ts:174), [kurulum sayfası:119](</Users/baris/Documents/GitHub/akredit/apps/web/src/app/(site)/mcp-kullan/page.tsx:119>).

Başlangıç bir MCP prompt’u olarak kayıtlı. Sohbete aynı kelimeyi yazmak, her istemcide bu prompt’un gerçekten çağrılmasını garanti etmez. Kullanıcı normal sohbet cevabı alabilir.

**Düzeltme:** Bir `akredit_baslat` aracı sağlayın; bağlantı kontrolü ve menüyü yapılandırılmış sonuçla döndürsün. İstemciye özgü prompt seçme adımlarını da açıkça gösterin.

**2. Doğruluk ve halüsinasyon**

**F4 — Kritik: Deterministik hesap, gerçek iş yükünün kanıtı yerine kullanılabiliyor.**

**Kanıt:** [bologna.ts:1226](/Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/bologna.ts:1226), [promptlar.ts:143](/Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/promptlar.ts:143).

Kod, kalan saatleri önceden belirlenmiş oranlarla dağıtıyor; son satıra artığı vererek toplamı AKTS hedefine eşitliyor. Bu işlem matematiksel olarak tutarlı bir **öneri** üretir. Öğrencinin gerçekten o kadar çalıştığını, dersin proje içerdiğini veya sınav hazırlığının bu dağılımda olduğunu doğrulamaz.

Örneğin ders hakkında yeterli bilgi yokken “ödev ve proje ağırlıklı” dağılım seçilmesi, yapılmayan bir değerlendirme faaliyetini ders paketine sokabilir.

**Düzeltme:** Her satırda `kaynak`, `varsayim`, `hocaTeyidi` tutun. Ölçülmüş iş yükü ile önerilen dağılımı ayırın. Teyitsiz dağılım OBS’ye yazma paketine alınmasın.

**F5 — Yüksek: Dersin gerçek içeriği yerine ders adından üretilmiş içerik geçebilir.**

**Kanıt:** [promptlar.ts:138](/Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/promptlar.ts:138), [promptlar.ts:39](/Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/promptlar.ts:39).

Amaç veya içerik yoksa dersin odağı ders adından çıkarılıyor; akıllı doldurmada soru sorulmaması isteniyor. Sonra haftalar, çıktılar ve değerlendirme önerileri oluşturuluyor. Biçim denetimi bunların o derste gerçekten uygulanacağını göstermez.

**Düzeltme:** Onaylı ders izlencesi, mevcut ders dokümanı veya hocanın kısa içerik teyidi olmadan bu alanlar “öneri” olarak kalsın. “Denetimden geçti” yerine “biçim denetiminden geçti; içerik teyidi bekliyor” yazın.

**F6 — Yüksek: OBS’ye yazma güvenliği açık MCP tarafından uygulanmıyor.**

**Kanıt:** [promptlar.ts:114](/Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/promptlar.ts:114), [sunucu.ts:152](/Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/sunucu.ts:152).

Açık MCP araçları salt okuma/hesaplama olarak tanıtılıyor; OBS’ye yazmayı ayrı tarayıcı aracı yapıyor. Dolayısıyla MCP, yazılacak içeriğin denetlenen içerikle aynı olduğunu, doğru derse yazıldığını veya izin kapsamını teknik olarak kontrol etmiyor. “Hepsini kaydet” talimatı bu açığı kapatmıyor.

**Düzeltme:** Yazma bağlayıcısına ders, dönem, alan, önceki değer, yeni değer ve taslak özetiyle bağlı bir değişiklik paketi verin. Sayfa değişmişse yazmayı durdurun. Her kayıt sonrası alanları geri okuyup birebir karşılaştırın. Bu mekanizma kurulana kadar otomatik kaydetmeyi varsayılan yapmayın.

**F7 — Yüksek: Kaynak doğrulama etiketi olduğundan güçlü.**

**Kanıt:** [kaynak-dogrula.ts:58](/Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/kaynak-dogrula.ts:58), [aynı dosya:67](/Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/kaynak-dogrula.ts:67).

Başlık sözcük benzerliğiyle, yazar ise soyadının bulunan yazar metninde geçmesiyle eşleşiyor. Bu; doğru baskıyı, doğru kişiyi veya kaynağın dersle uygunluğunu doğrulamaz. Soyadı alt dize eşleşmesi yanlış kişiyi kabul edebilir.

**Düzeltme:** Sonuçları `kimlik_eslesmesi`, `bibliyografik_tamlik`, `icerik_uygunlugu` olarak ayırın. Tam yazar belirteçleri, baskı, yıl ve ISBN eşleşmesini kullanın. “Katalogda bulundu” sonucunu “ders kaynağı olarak doğrulandı” diye sunmayın.

**3. Akreditasyon ve Bologna içeriği**

**F8 — Yüksek: İç kurallar evrensel Bologna zorunluluğuna dönüşebiliyor.**

**Kanıt:** [bologna.ts:118](/Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/bologna.ts:118), [promptlar.ts:142](/Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/promptlar.ts:142), [bologna.ts:412](/Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/bologna.ts:412).

8–12 öğrenme çıktısı, 14 hafta, belirli kelime aralıkları ve 30 saatlik varsayılan aynı akışa yerleştirilmiş. Bunların bütün Türkiye yükseköğretimi için bağlayıcı olduğu **DOĞRULANMADI**. Üstelik saat böleni şemada 20–40 kabul ediyor; bu, metinde anlatılan 25–30 saat politikasıyla tutarsız.

ECTS, öğrenme çıktılarıyla ilişkili iş yükünü esas alır; hedef toplamı tutturmak tek başına yeterli değildir. [Avrupa Komisyonu ECTS açıklaması](https://education.ec.europa.eu/education-levels/higher-education/inclusive-and-connected-higher-education/european-credit-transfer-and-accumulation-system)

**Düzeltme:** Kuralları “resmî zorunluluk”, “kurum kararı”, “Akredit önerisi” olarak ayırın. Her kuralın kaynak, yürürlük tarihi ve kapsamı olsun. Kurum takvimi ve AKTS politikası profil olarak seçilsin.

**F9 — Yüksek: Belge bütünlüğü ile uzman doğrulaması aynı şey değil.**

**Kanıt:** [veri-resmi.ts:95](/Users/baris/Documents/GitHub/akredit/packages/cerceveler/src/veri-resmi.ts:95), [veri.ts:159](/Users/baris/Documents/GitHub/akredit/packages/cerceveler/src/veri.ts:159), [resmî kaynak envanteri](/Users/baris/Documents/GitHub/akredit/kaynaklar/resmi/kaynaklar.json).

Envanterdeki 29 indirilen dosyanın SHA-256 değerlerini yeniden hesapladım; eşleşti. Ancak çerçevelerde `dogrulandi: false` kayıtları var. Ölçütlerin ve kanıt listelerinin tamamının doğru aktarılması, güncel sürümlerin seçilmesi ve kapsamların doğru yorumlanması **DOĞRULANMADI**.

**Düzeltme:** Kuruluş bazında uzman incelemesi yapın. Ölçüt bazında belge sayfası ve aktarım karşılaştırması üretin. Uzman onayı olmayan çerçeveyi kullanıcı sonucunda belirgin biçimde gösterin. Resmî metin, yorum ve örnek kanıtlar ayrı alanlarda dursun.

**4. Güvenlik ve KVKK**

**F10 — Yüksek: Maskeleme sunucuda yapıldığında ilk aktarım zaten gerçekleşmiş oluyor.**

**Kanıt:** [not-tablosu.ts:1](/Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/not-tablosu.ts:1), [promptlar.ts:60](/Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/promptlar.ts:60), [kurulum sayfası:191](</Users/baris/Documents/GitHub/akredit/apps/web/src/app/(site)/mcp-kullan/page.tsx:191>).

Kimlik sütunlarının sunucuda atılması, ham tablonun önce kullanıcının yapay zekâ sağlayıcısına ve uzak MCP’ye ulaşmasını engellemez. Satır sırasına göre `o1` üretmek de tek başına anonimleştirme güvencesi değildir.

**Düzeltme:** Ham not tablosunu sohbet kutusuna yapıştırma akışını kaldırın. Yerel dosya işleyiciyle kimlikleri aktarım öncesi ayıklayın; kullanıcıya gönderilecek veriyi gösterin. Veri akışını sağlayıcılar dahil açıklayın.

**F11 — Yüksek: “Giriş bilgisi sunucuya hiç girmez” iddiası teknik olarak doğru değil.**

**Kanıt:** [kisisel-veri.ts:14](/Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/kisisel-veri.ts:14), [aynı dosya:85](/Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/kisisel-veri.ts:85), [http.ts:139](/Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/http.ts:139).

Gövde sunucuya alındıktan sonra etiketli parola, OTP ve bazı çerez desenleri aranıyor. Etiketsiz parola veya farklı belirteç biçimleri bu desenlerle yakalanmayabilir. Ayrıca Bologna araçlarında kişisel veri kapsamı kapatılabiliyor: [kisisel-veri.ts:67](/Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/kisisel-veri.ts:67).

**Düzeltme:** İddiayı daraltın; istemci tarafında aktarım öncesi ayıklama yapın. Tam HTML yerine izinli ders alanlarını çıkarın. Kamuya açık öğretim elemanı bilgisi ile rastgele kişisel veri taşıyan HTML’i aynı kapsamda kabul etmeyin.

**F12 — Yüksek: İstek boyutu sınırı belleği korumak için geç uygulanıyor.**

**Kanıt:** [http.ts:135](/Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/http.ts:135), [kaynak-dogrula.ts:90](/Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/kaynak-dogrula.ts:90).

İstek bütünüyle `arrayBuffer()` ile okunuyor, ardından boyutu denetleniyor. Katalog cevabında da `text()` sonrası sınır var. Başlık yoksa veya güvenilmezse sınırı aşan içerik önce belleğe alınır.

**Düzeltme:** Akışı bayt sayarak okuyun ve eşikte iptal edin. Ters vekilde gövde sınırı, okuma süresi ve eşzamanlı istek kotası uygulayın. Canlı altyapıda bunların bulunup bulunmadığı **DOĞRULANMADI**.

**F13 — Yüksek: Hız sınırı dağıtık hizmet için yeterli değil.**

**Kanıt:** [http.ts:50](/Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/http.ts:50), [aynı dosya:128](/Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/http.ts:128).

Kova süreç belleğinde; istemci kimliği `x-forwarded-for` başlığının ilk değerinden geliyor. Yeniden başlatma/çoklu süreç limitleri böler. Vekil başlığı güvenilir biçimde yeniden yazmıyorsa kimlik değiştirilebilir. Bulut MCP istemcilerinin ortak çıkış adresi de kullanıcıları aynı kovada toplayabilir.

**Düzeltme:** Güvenilir vekil zinciri, paylaşılan kota deposu, küresel eşzamanlılık sınırı ve katalog araçlarına ayrı maliyet bütçesi ekleyin. Başlıkla atlatmanın canlıda mümkün olduğu **DOĞRULANMADI**.

SSRF bakımından incelediğim katalog işlevi sabit hostlar ve yönlendirme reddi kullanıyor. **Bu yolda kullanıcı kontrollü SSRF açığı bulduğumu söylemiyorum.** Tüm depo için SSRF güvenliği **DOĞRULANMADI**.

**F14 — Yüksek: İşletmeci ve başvuru kanalı belirsizken hizmet veri kabul ediyor.**

**Kanıt:** [KVKK sayfası:19](</Users/baris/Documents/GitHub/akredit/apps/web/src/app/(site)/kvkk/page.tsx:19>).

Metin, kimlik, adres ve başvuru kanallarının henüz kesinleşmediğini söylüyor. Tüzel şirket kurmak tek seçenek değildir; fakat hizmeti fiilen işleten sorumlu tarafın belirlenmesi gerekir. Avukatın metni incelemesi, uygulamadaki veri akışlarının uygunluğunu kanıtlamaz. [KVKK aydınlatma yükümlülüğü](https://www.kvkk.gov.tr/Icerik/2033/Aydinlatma-Yukumlulugu-)

**Düzeltme:** Gerçek işletmeciyi, rolünü, iletişim/başvuru kanalını, sağlayıcıları ve saklama sürelerini kesinleştirin. Hukuki uygunluğun bütünü **DOĞRULANMADI**.

**5. Mimari, test ve bakım**

**F15 — Yüksek: SDK senaryosu, gerçek hocanın uçtan uca başarısını kanıtlamıyor.**

**Kanıt:** [hoca-akisi-03.test.ts:536](/Users/baris/Documents/GitHub/akredit/apps/acik-mcp/test/hoca-akisi-03.test.ts:536).

Test, SDK üzerinden araçları sıralı çağırıyor ve prompt metnini kontrol ediyor. Gerçek modelin yanlış yorumlamasını, OBS oturumunu, yanlış ders seçmesini veya kaydetme davranışını sınamıyor.

**Düzeltme:** Ayrı üç katman kurun: deterministik birim testleri, kötü niyetli belge/model değerlendirmeleri, sentetik OBS üzerinde gerçek tarayıcı senaryoları. “Metinde yasak var” testi ile “yasak davranış gerçekleşmiyor” testini ayırın.

**F16 — Orta: Açık MCP, askıdaki platformun bakım yükünü taşıyor.**

**Kanıt:** [CI yapılandırması](/Users/baris/Documents/GitHub/akredit/.github/workflows/ci.yml), [MCP paket bağımlılıkları](/Users/baris/Documents/GitHub/akredit/apps/acik-mcp/package.json).

MCP odağına rağmen CI; web, işçi, PostgreSQL ve Docker yüzeylerini kapsıyor. Bunların tamamına “ölü kod” demek yanlış olur; ancak açık MCP değişikliğinin bakım ve yayın maliyetini büyütüyorlar.

**Düzeltme:** Açık MCP’nin bağımlılık grafiğini ve yayın hattını ayırın. Askıdaki platformun bakım düzeyini ilan edin. Yayınlanan npm paketini temiz ortamda kurup başlatan test zorunlu olsun. Güncel bağımlılık açıkları ve yayınlanan paketin çalışması **DOĞRULANMADI**.

**6. Site ve tasarım**

**F17 — Orta: Ana sayfa ilk değeri göstermeden kurulum yükünü kullanıcıya veriyor.**

**Kanıt:** Canlı [ana sayfa](https://akredit.org/), [kurulum sayfası:170](</Users/baris/Documents/GitHub/akredit/apps/web/src/app/(site)/mcp-kullan/page.tsx:170>).

İlk ekranda büyük dekoratif görsel var; gerçek ders girdisi, bulunan hata ve düzeltilmiş çıktı görünmüyor. Ardından uygulama, bağlayıcı, tarayıcı ve geliştirici aracı seçimi geliyor. Teknik olmayan kullanıcı, ürünü anlamadan altyapı seçmek zorunda.

**Düzeltme:** İlk ekrana tek gerçekçi örnek koyun: anonim ders metni → bulunan sorun → açıklamalı düzeltme. Kurulumu kullanıcı ortamına göre açılan tek akışa indirin. Gravürün “YZ üretimi” olduğu **DOĞRULANMADI**; sorun üretim yöntemi değil, ürünün nasıl çalıştığını açıklamaması.

WCAG 2.2 AA, mobil taşma, ekran okuyucu ve kontrast uygunluğu **DOĞRULANMADI**. Bu incelemede çalışmayan bağlantı saptandığını iddia etmiyorum; site genelinde kırık bağlantı taraması tamamlanmadı.

**7. Ürün ve sürdürülebilirlik**

**F18 — Yüksek: Ücretsiz sunucu maliyetinden çok destek ve doğrulama maliyeti belirsiz.**

**Kanıt:** [proje sayfası:57](</Users/baris/Documents/GitHub/akredit/apps/web/src/app/(site)/proje/page.tsx:57>), [promptlar.ts:94](/Users/baris/Documents/GitHub/akredit/apps/acik-mcp/src/promptlar.ts:94).

Ürün; istemci arayüzleri, farklı OBS’ler, resmî ölçüt sürümleri ve kullanıcı desteğine bağımlı. Sponsor bulunmasa da bunlar değişmeye devam eder. Maliyet, kullanım, bakım kapasitesi ve devamlılık bütçesi **DOĞRULANMADI**.

**Düzeltme:** MCP’yi dağıtım kanalı olarak koruyun; destek kapsamını önce tek OBS, tek ders akışı ve sınırlı istemci kombinasyonuna daraltın. Finansman hesabına sunucu kadar uzman doğrulaması ve destek saatini de koyun.

Benimsenme için ilk üç adım:

1. Tek desteklenen ortamda kurulumdan doğrulanmış taslağa kadar gerçek kullanıcı deneyi yapın.
2. “Otomatik doldurma” yerine kanıtı ve belirsizliği gösteren değişiklik önizlemesini ürünün merkezine koyun.
3. Kurulum başarısı, tamamlanan ders oranı ve hocanın harcadığı gerçek süreyi ölçün; vaatleri bu sonuçlara göre yazın.

**En kritik 10 sorun, öncelik sırasıyla**

1. **F4:** Hedefe uydurulmuş iş yükünün gerçek uygulama gibi kaydedilebilmesi.
2. **F6:** OBS yazımında denetlenen taslak ile kaydedilen içerik arasında teknik bağ bulunmaması.
3. **F10:** Kişisel verinin maskelemeden önce dış hizmetlere aktarılabilmesi.
4. **F5:** Ders adından çıkarılan varsayımların doğrulanmış içerik görünümü kazanması.
5. **F14:** İşletmeci ve başvuru kanallarının belirsizliği.
6. **F12:** Boyut sınırlarının tam okuma sonrasında uygulanması.
7. **F13:** Süreç içi ve vekil başlığına bağlı hız sınırı.
8. **F8:** Kuruma göre değişen Bologna kurallarının sabitlenmesi.
9. **F9:** Uzman onayı bekleyen çerçevelerle kapsamlı doğruluk vaadi.
10. **F15:** Gerçek model ve OBS davranışını kapsamayan uçtan uca güvence.

**İlk iki haftalık somut iş planı**

| Gün | İş | Tamamlanma ölçütü |
|---|---|---|
| 1–2 | Otomatik kaydetme varsayılanını kaldırın; öneri/doğrulanmış bilgi ayrımını ekleyin. | Teyitsiz iş yükü ve değerlendirme satırları yazma paketine giremiyor. |
| 3–4 | Yerel kimlik ayıklama ve veri akışı açıklamasını hazırlayın. | Ham öğrenci kimliği uzak MCP’ye gönderilmeden ayıklanıyor. |
| 5–6 | Akış sırasında boyut sınırı, güvenilir vekil ve küresel kota uygulayın. | Büyük/yavaş gövde ve eşzamanlı istek testleri geçiyor. |
| 7–8 | Kurum Bologna profili ve kural kaynaklarını çıkarın. | Her zorunlu kural kaynak ve kapsam taşıyor; öneriler ayrı gösteriliyor. |
| 9–10 | Bir çerçeveyi uzmanla doğrulayın; katalog eşleşmesini sıkılaştırın. | Ölçüt aktarım karşılaştırması ve yanlış eşleşme testleri yayımlanıyor. |
| 11–12 | Sentetik OBS’de değişiklik önizlemesi ve geri okuma testi kurun. | Yanlış ders/dönem ve değişmiş sayfa koşullarında yazma duruyor. |
| 13 | Teknik olmayan öğretim elemanlarıyla kurulum testi yapın. | Takılma noktaları, müdahale sayısı ve süre kayıtlı. |
| 14 | Site iddialarını ölçülen kapsamla hizalayın; işletmeci bilgilerini tamamlayın. | Destek tablosu, bilinen sınırlar ve test edilmiş sürüm açıkça yayımlanıyor. |

İki haftanın hedefi “tamamlandı” etiketini güçlendirmek değil; **hangi işlemin hangi kanıt ve teknik güvenceyle güvenilir olduğunu gösteren, sınırları ölçülmüş bir sürüm çıkarmak** olmalı.