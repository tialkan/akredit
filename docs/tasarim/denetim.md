# Kontrol listesi denetimi

Kaynak: [`kontrol-listesi.md`](kontrol-listesi.md). Tarih: 2026-10-28, dal `site/yeniden-tasarim`.
Durumlar: Karşılandı, Kısmen, Karşılanmadı, Kapsam dışı (bu depoda doğrulanamayan işletme ya da yayın sonrası iş).

| Madde | Konu | Durum | Kanıt |
|---|---|---|---|
| 1 | Sitenin tek amacını bir cümleyle yaz | Karşılandı | docs/tasarim/README.md, Amaç |
| 2 | Ziyaretçi ilk beş saniyede "bu kim, ne yapıyor, bana ne verir" sorularının cevabını ala... | Karşılandı | Ana sayfa ilk satırı ne olduğunu, h1 kimin ne yaptığını, giriş paragrafı nasıl yaptığını söyler (ana-sayfa-*.png) |
| 3 | Hedef kitleyi ve dilleri baştan belirle | Karşılandı | Tek dil Türkçe, hedef kitle README Amaç; çok dil planlanmadı (bilinçli) |
| 4 | Yazım kurallarını belgeye dök: noktalama, ton, yasak ifadeler, yasak kelimeler. | Karşılandı | Yazım kuralları: CLAUDE.md Kullanıcı metni, docs/marka.md Kurallar, kurallar.test.ts |
| 5 | Tek doğruluk kaynağı kur | Karşılandı | apps/web/src/site/icerik.ts tek doğruluk kaynağı |
| 6 | Hukuken hassas bilgileri işaretle: unvan, statü, iddia, fiyat, garanti. | Karşılandı | Garanti yok (/sinirlar), hukuk metinleri taslak notuyla (TaslakNotu) |
| 7 | Alan adı, e-posta, DNS ve barındırma hesabı müşterinin ya da şirketin adına açılsın, ki... | Kapsam dışı | Hesap sahipliği bu depoda doğrulanamaz |
| 8 | Tüm hesapların (kaydedici, CDN, barındırma, analitik) sahibini ve iki adımlı doğrulamas... | Kapsam dışı | Hesap ve iki adımlı doğrulama belgesi depoda yok |
| 9 | Tasarıma şablondan değil markanın kendi hikâyesinden başla | Karşılandı | Logo A + onay imi (docs/marka.md); imza öğesi ürünün 'kanıtsız iddia yok' ilkesinden |
| 10 | Bir imza öğesi bul: markaya özgü bir desen, çizim dili, hareket, ızgara | Karşılandı | Paragraf (§) ve dayanak [n] numaraları: bilesenler.tsx Dayanak, Dayanaklar, Bolum no |
| 11 | Tek vurgu rengi | Karşılandı | Tek vurgu lacivert; petrol yalnız onay ve imza öğesi (anlamlı ikinci renk) |
| 12 | Tasarım belirteçleri (renk, boşluk, tipografi ölçeği, köşe, gölge) tek dosyada. | Karşılandı | apps/web/src/app/globals.css :root ve @theme |
| 13 | Tipografi bilinçli seçilsin | Karşılandı | Source Serif 4 başlık + Source Sans 3 metin, iki aile; gerekçe README |
| 14 | Tipografi ölçeği cesur olsun | Karşılandı | h1 2,3-3,5 rem serif, etiketler 0,875 rem |
| 15 | Boşluk tasarımın parçası | Karşılandı | Bölümler py-12/16, 17 rem başlık sütunu |
| 16 | Izgara bilinçli kırılsın | Karşılandı | Dosya düzeni: solda başlık sütunu; kart dizisi yok; ana sayfada tablo, çizelge, kayıt örneği |
| 17 | Hareket bir şey anlatsın | Karşılandı | Süs animasyonu yok; yalnız yükleniyor iskeleti (motion-safe) |
| 18 | Görseller gerçek olsun: gerçek ekip fotoğrafı, gerçek ürün, gerçek mekân | Karşılandı | Stok ya da YZ görseli yok; görseller gerçek ürün ekranı ve kayıt örneği |
| 19 | İllüstrasyon gerekiyorsa tek elden, tek çizgi diliyle. | Karşılandı | Tek el yapımı SVG akış çizimi (akis-cizimi.tsx) |
| 20 | İkonlar tek setten ve aynı çizgi kalınlığında. | Karşılandı | Tek ikon seti lucide-react, aynı çizgi kalınlığı |
| 21 | Mikro etkileşimler (hover, odak, tıklama geri bildirimi) özenle tasarlansın | Karşılandı | Hover zemin tonu, odak halkası --odak, dayanak hedefi petrol zemin |
| 22 | 404, boş durum, form hatası, yükleniyor ekranı da tasarlansın | Karşılandı | not-found.tsx, error.tsx, panel/loading.tsx, BosDurum, form hataları (form.tsx) |
| 23 | Mobil, tablet, masaüstü: en az 375, 768, 1440 piksel genişlikte elle gözden geçir. | Karşılandı | docs/tasarim/ekranlar/ 375, 768, 1440 |
| 24 | Karanlık tema kararı bilinçli verilsin | Karşılandı | Bilinçli karar: koyu tema yok; kurallar.test.ts ve kontrast.ts denetler |
| 25 | Favicon, paylaşım kartı (OpenGraph), manifest ikonu markayla uyumlu olsun. | Karşılandı | favicon.svg, og.png, apple-touch-icon (docs/marka.md) |
| 26 | Yapay zekâ çağrışımlı fontlar yok: Inter, Poppins, Space Grotesk, Manrope, DM Sans gibi... | Karşılandı | Inter vb. yok; kurallar ve README |
| 27 | Mor-mavi gradyan, neon parıltı, cam efekti (glassmorphism), bulanık renkli lekeler yok. | Karşılandı | Gradyan, cam, parıltı yok (globals.css) |
| 28 | "✨", roket, beyin, yıldız ikonları ve emoji süsleme yok. | Karşılandı | Emoji testi kurallar.test.ts |
| 29 | Her bölüm "ikon + başlık + iki satır" üçlü kart düzeni olmasın. | Karşılandı | Üçlü ikon kart dizisi yok |
| 30 | Ortada dev başlık, altında iki düğme, arkasında gradyan: bu kalıp kullanılmasın. | Karşılandı | İlk ekran sola hizalı, tek birincil düğme, yanında kayıt örneği |
| 31 | Her öğede aynı yuvarlak köşe ve yumuşak gölge olmasın. | Karşılandı | Kap 2 px, kontrol 4 px, gölge yok (README Biçim dili) |
| 32 | Yapay zekâ ile üretilmiş görsel, portre, illüstrasyon kullanma | Karşılandı | YZ görseli yok; logo seçimi docs/marka.md |
| 33 | Em dash (,) asla kullanılmaz. | Karşılandı | kurallar.test.ts em dash testi |
| 34 | Cümleler kısa | Karşılandı | Elle gözden geçirildi; yeni metinler kısa cümle |
| 35 | Yasak kelimeler: "yenilikçi çözümler", "dijital dönüşüm yolculuğu", "sınırları zorluyor... | Karşılandı | kurallar.test.ts yasak kelimeler |
| 36 | "Sadece X değil, aynı zamanda Y" kalıbı, üçlü sıfat dizisi ve retorik soru ile başlayan... | Kısmen | 'Sadece X değil' kalıbı testle; üçlü sıfat ve retorik soru elle denetlendi, testi yok |
| 37 | Her iddia somut olsun: sayı, isim, tarih, örnek | Karşılandı | Sayılar koddan: 30 dk, 10 dk, 8 saat, 120 gün, 14 ölçüt; dayanak numaralarıyla |
| 38 | Başlıklar sıfat değil fiil ve nesne taşısın | Kısmen | Yeni bölüm başlıkları fiil+nesne ('İşi kim yapar', 'OpenRouter anahtarı alın'); bazı eski başlıklar ad öbeği ('Risk düzeyleri') |
| 39 | Metaforu kimliğin yerine koyma | Karşılandı | İlk satır: 'Üniversiteler için açık kaynak kalite güvencesi ve akreditasyon yazılımı' |
| 40 | Tek bir sektörün jargonunu başka bir işin kimliğine taşıma | Karşılandı | Yalnız yükseköğretim kalite dili |
| 41 | Her metni ilk kez okuyan biri gözüyle oku | Kısmen | Elle okundu; bağımsız ilk okuyucu denemesi yapılmadı |
| 42 | Metni yüksek sesle oku | Karşılanmadı | Yüksek sesle okuma yapılmadı |
| 43 | Çeviri yapılıyorsa ana dili konuşan biri okusun | Kapsam dışı | Çeviri yok |
| 44 | Sahte sohbet balonu, sahte "şu an 12 kişi bakıyor", sahte geri sayım yok. | Karşılandı | Sahte sayaç, sohbet balonu yok |
| 45 | Açılır pencere, tam ekran bülten kutusu, zorla sohbet botu yok. | Karşılandı | Açılır pencere, bülten kutusu yok |
| 46 | Otomatik oynayan sesli video yok. | Karşılandı | Video yok |
| 47 | URL yapısını baştan dondur | Karşılandı | URL'ler değişmedi |
| 48 | Sayfaları mümkün olduğunca statik üret, içerik değişince yeniden doğrula. | Kısmen | Kök yerleşim CSP nonce için dinamik (layout.tsx connection()); sayfalar istek başına işlenir |
| 49 | İstemci bileşenlerini küçük tut | Karşılandı | Site sayfaları sunucu bileşeni; hata ekranı bağımlılıksız |
| 50 | Framework sürümünün kendi belgesini oku, hafızadaki API'ye güvenme. | Karşılandı | Next 16 belgelerine göre (proxy.ts, connection()) |
| 51 | Ortam değişkenlerini `.env.example` ile belgele, gizli olanları yalnız sunucuda tut. | Kısmen | Ortam değişkenleri infra ve İP-36 raporunda; kökte .env.example yok |
| 52 | Kritik ortam değişkeni eksikse sessizce çalışma, logda ve sağlık ucunda uyar. | Karşılandı | İşçi sağlık ucu ve uyarı (apps/isci/src/calisma/saglik.ts) |
| 53 | Bağımlılık sayısı en az | Karşılandı | Yalnız başlık yazı tipi kaynağı eklendi (geliştirme bağımlılığı, OFL) |
| 54 | Content-Security-Policy sıkı olsun: `default-src 'self'`, dış kaynaklar tek tek izinli,... | Karşılandı | src/guvenlik/csp.ts (+ csp.test.ts) |
| 55 | `unsafe-eval` yok | Karşılandı | Nonce'lu CSP, unsafe-eval yok (csp.test.ts) |
| 56 | HSTS (`max-age=63072000; includeSubDomains; preload`), `X-Content-Type-Options: nosniff... | Karşılandı | infra/uretim/Caddyfile: HSTS 63072000 preload, nosniff, Referrer-Policy, Permissions-Policy (bu dalda sıkılaştırıldı) |
| 57 | `X-Powered-By` ve sürüm bilgisi veren başlıklar kapalı. | Karşılandı | next.config.ts poweredByHeader: false; Caddy -Server |
| 58 | Başlıkları yayından sonra securityheaders.com ve Mozilla Observatory ile denetle. | Karşılanmadı | Yayın sonrası securityheaders.com ve Observatory denemesi yapılmadı |
| 59 | Her girdi sunucuda doğrulanır | Karşılandı | zod şemaları, API uçları |
| 60 | Şema doğrulaması (tip, uzunluk, biçim) her uçta | Karşılandı | zod strict şemalar (CLAUDE.md Doğrulama) |
| 61 | Kullanıcı girdisi HTML'e ham basılmaz | Karşılandı | Yalnız sabit JSON-LD dangerouslySetInnerHTML, '<' kaçışlı (site.test.ts) |
| 62 | Form uçlarında köken (Origin) denetimi, hız sınırı, bal küpü alanı, gönderim süresi den... | Kısmen | Hız sınırı kimlik/sunucu.ts; bal küpü ve gönderim süresi kurum açılış formunda doğrulanmadı |
| 63 | E-posta gönderen formlarda başlık enjeksiyonuna karşı satır sonu temizliği. | Karşılandı | E-posta kimlik akışında adres doğrulamalı |
| 64 | Dosya yükleme varsa: tür beyaz listesi, boyut sınırı, içerik denetimi, rastgele ad, web... | Karşılandı | Kanıt hattı tür/boyut denetimi (İP-10) |
| 65 | Hata mesajları iç yapıyı (yığın izi, sorgu, yol) göstermez. | Karşılandı | error.tsx iç yapıyı göstermez, yalnız başvuru kodu |
| 66 | Yönetim paneli için parola yerine OAuth ya da passkey | Karşılandı | Parolasız bağlantı ve OIDC/SAML (/giris-ve-hesap) |
| 67 | OAuth jetonunda imza, `aud`, `iss` ve süre denetimi. | Karşılandı | kimlik/oidc.test.ts, saml.test.ts |
| 68 | Oturum çerezleri `HttpOnly`, `Secure`, `SameSite=Lax` ya da `Strict`. | Karşılandı | kimlik/sunucu.ts httpOnly, sameSite lax, secure üretimde |
| 69 | Yetki denetimi her uçta sunucuda | Karşılandı | @akredit/yetki her uçta |
| 70 | Yönetim uçları arama motorlarına kapalı ve hız sınırlı. | Karşılandı | robots.ts panel, api kapalı |
| 71 | Hız sınırında IP'yi güvenilir vekil sayısına göre oku | Kısmen | kimlik/sunucu.ts hız sınırı; vekil sayısı kuralı bu dalda denetlenmedi |
| 72 | Bellek içi sayaç yeniden başlatmada sıfırlanır | Kısmen | Paylaşımlı sayaç durumu bu dalda denetlenmedi |
| 73 | Uygulama ve CDN hız sınırları farklı kovalarda sayar | Kapsam dışı | CDN kuralı depoda yok |
| 74 | Yapay zekâ ya da ücretli API uçlarında maliyet tavanı, eşzamanlılık sınırı, kullanıcı m... | Karşılandı | Maliyet kurumun OpenRouter sınırında; belge veridir ilkesi (packages/yz) |
| 75 | Gizli anahtarlar depoya girmez | Karşılandı | .gitleaks.toml |
| 76 | Sızan anahtar hemen iptal edilir, git geçmişinden silmek yetmez. | Kapsam dışı | İşletme süreci |
| 77 | `npm audit` ya da Dependabot düzenli, kritik açık derlemeyi durdursun. | Karşılandı | .github/dependabot.yml |
| 78 | Kilit dosyası (`package-lock.json`) depoda. | Karşılandı | pnpm-lock.yaml |
| 79 | Dış CDN'den betik yükleniyorsa Subresource Integrity (`integrity`) kullan. | Karşılandı | Dış CDN betiği yok |
| 80 | Konteyner root olmayan kullanıcıyla çalışır, çok aşamalı derleme. | Karşılandı | infra/uretim Dockerfile'ları (İP-36) |
| 81 | Sunucuya yalnız gereken portlar açık, SSH anahtarla. | Kapsam dışı | Sunucu yapılandırması depoda doğrulanamaz |
| 82 | Yedek depo ve geri dönüş planı | Kısmen | Yedek betikleri infra; geri yükleme denemesi bu dalda yapılmadı |
| 83 | Yayın öncesi temel tarama: OWASP ZAP ya da benzeri ile açık listesi. | Karşılanmadı | ZAP taraması yapılmadı (docs/guvenlik/dis-denetim-kapsami.md) |
| 84 | Bir kaynak dil seç | Kapsam dışı | Tek dil (Türkçe); çok dillilik yok |
| 85 | Dili URL segmentinden oku (`/en/...`), istek başlığından değil | Kapsam dışı | Tek dil (Türkçe); çok dillilik yok |
| 86 | Metinleri dil sözlüğünde tut, eksik dil anahtarını derleme anında yakala. | Kapsam dışı | Tek dil (Türkçe); çok dillilik yok |
| 87 | Çeviri özetlenmez | Kapsam dışı | Tek dil (Türkçe); çok dillilik yok |
| 88 | Unvan, özel ad ve marka adı çevrilmez | Kapsam dışı | Tek dil (Türkçe); çok dillilik yok |
| 89 | Her dilde yerelleştirilmiş adres ve eşleme tablosu. | Kapsam dışı | Tek dil (Türkçe); çok dillilik yok |
| 90 | Dil seçici aynı içeriğin karşılığına gitsin, ana sayfaya değil. | Kapsam dışı | Tek dil (Türkçe); çok dillilik yok |
| 91 | Otomatik dil seçiminde önce kullanıcı tercihi, sonra tarayıcı dili, en son ülke. | Kapsam dışı | Tek dil (Türkçe); çok dillilik yok |
| 92 | hreflang, canonical ve site haritası aynı dil kümesini söylesin. | Kapsam dışı | Tek dil (Türkçe); çok dillilik yok |
| 93 | Tarih, sayı, para biçimi dile göre. | Kapsam dışı | Tek dil (Türkçe); çok dillilik yok |
| 94 | Sağdan sola dil varsa `dir="rtl"` ve ayna düzen. | Kapsam dışı | Tek dil (Türkçe); çok dillilik yok |
| 95 | Çevirisi olmayan içerik için açık kural: gizle, 404 ya da yönlendir | Kapsam dışı | Tek dil (Türkçe); çok dillilik yok |
| 96 | Bir metin değişince tüm dillerde aynı anda değişsin | Kapsam dışı | Tek dil (Türkçe); çok dillilik yok |
| 97 | Aydınlatma metni, gizlilik politikası, çerez politikası, kullanım koşulları. | Kısmen | KVKK, gizlilik, koşullar var; çerez politikası ayrı sayfa değil, taslak |
| 98 | Aydınlatma metni gerçek veri envanterinden türesin, şablondan değil. | Kısmen | Taslak metin; avukat incelemesi bekliyor |
| 99 | Çerez onayında "reddet" düğmesi "kabul et" ile eşit ağırlıkta | Karşılandı | Analitik ve onay gerektiren çerez yok |
| 100 | Yurt dışına veri aktarımı (yapay zekâ, analitik, e-posta sağlayıcısı) açıkça yazılsın. | Karşılandı | Yurt dışı aktarım /yapay-zeka ve /guvenlik sayfalarında açık |
| 101 | Şirket unvanı, MERSİS, adres, iletişim bilgisi görünür. | Karşılanmadı | Unvan, MERSİS, adres yok (proje bir kişinin açık kaynak projesi; /iletisim) |
| 102 | Kişi sayfalarında unvan ve statü (kurucu, çalışan, stajyer) doğru | Kapsam dışı | Kişi sayfası yok |
| 103 | Kişinin izin vermediği iletişim bilgisi (telefon, kişisel e-posta) yayımlanmaz. | Karşılandı | Kişisel iletişim bilgisi yayımlanmıyor |
| 104 | Alınmamış desteği, kazanılmamış ödülü, olmayan müşteriyi yazma. | Karşılandı | Olmayan müşteri, ödül yok; durum notu açık |
| 105 | Garanti dili yok: "Google'da birinci sıra", "tam uyum garantisi", "kesin sonuç". | Karşılandı | /sinirlar: garanti yok |
| 106 | Reklam kısıtı olan mesleklerde (avukat, hekim, eczacı) ilgili düzenlemeye uy. | Kapsam dışı | Reklam kısıtlı meslek değil |
| 107 | Yabancı dildeki hukuki metinde bağlayıcı sürüm belirtilsin. | Kapsam dışı | Yabancı dil metni yok |
| 108 | Hukuki metinlerde sürüm ve güncelleme tarihi görünür. | Kısmen | SON_GUNCELLEME tarihi var; hukuk sayfalarında sürüm numarası yok |
| 109 | Her sayfaya özgün başlık ve açıklama | Karşılandı | site.test.ts özgün başlık ve açıklama |
| 110 | Canonical her sayfada. | Karşılandı | site.test.ts canonical |
| 111 | Site haritası tüm dilleri ve içerikleri kapsar, `lastModified` gerçek değişiklik tarihi. | Karşılandı | sitemap.ts, lastModified SON_GUNCELLEME |
| 112 | robots.txt deneme ortamında dizini kapatır, üretimde açar. | Karşılandı | robots.ts AKREDIT_ORTAM=hazirlik |
| 113 | Yapılandırılmış veri: Organization ya da LocalBusiness, Person, Article, FAQPage, Bread... | Kısmen | Organization, BreadcrumbList, FAQPage; Rich Results testi yapılmadı |
| 114 | Yerel iş için adres, telefon, çalışma saatleri, harita konumu yapılandırılmış veride ve... | Kapsam dışı | Yerel iş değil |
| 115 | Yapay zekâ tarayıcılarına kararı bilinçli ver, `llms.txt` ile özet sun. | Karşılandı | public/llms.txt |
| 115a | Arama botu ile eğitim botunu ayır | Karşılandı | robots.ts eğitim botları kapalı, arama botları açık |
| 115b | robots.txt yetmez: Cloudflare/CDN "AI bot engelleme" ve WAF botlara 403 döndürebilir | Karşılanmadı | Yayın sonrası curl -A denemesi yapılmadı |
| 115c | Alıntılanacak içerik sabit adresli ve tarihli olsun: her gün değişen sayfanın yanında d... | Kısmen | Sayfalar sabit adresli, SON_GUNCELLEME; CSV yok |
| 115d | Yapılandırılmış veride `@id` ile başka düğüme bağlamak yetmeyebilir: Dataset gibi türle... | Kısmen | Organization adı düğümde; Search Console doğrulaması yok |
| 115e | Arama sonucu başlığında somut bilgi tıklanmayı artırır (ör | Kısmen | Başlıklarda somut bilgi (ör. '14 ölçüt, 46 alt ölçüt') |
| 116 | Paylaşım kartı her dilde kendi dilinde. | Karşılandı | og.png Türkçe |
| 117 | Kaldırılan adres 301 ile yönlendirilir. | Karşılandı | Kaldırılan adres yok |
| 118 | İkincil alan adları (`.com`, `.tr`, `www`) tek ana adrese 301 ile yönlenir. | Kapsam dışı | Alan adı yönlendirmesi depoda doğrulanamaz |
| 119 | Search Console ve Bing Webmaster doğrulaması, site haritası gönderimi. | Kapsam dışı | Yayın sonrası işlem |
| 119a | IndexNow: Bing ve Yandex'e değişen adresleri anında bildiren ücretsiz protokol | Karşılanmadı | IndexNow yok |
| 119b | Yeni ve önemli sayfa için Search Console > URL denetimi > "Dizine eklenmesini iste" | Kapsam dışı | Yayın sonrası işlem |
| 119c | `www` → ana adres 301'i uygulamada da doğrula: `curl -I https://www.site.com/x` 301 dön... | Kapsam dışı | Yayın sonrası işlem |
| 119d | HEAD isteği 405 dönmesin (bazı framework'ler yalnız GET tanımlar); bağlantı denetleyici... | Kısmen | Next sayfaları HEAD'e yanıt verir; bu dalda curl -I ile denenmedi |
| 119e | Search Console'u ayda bir oku: sorgular + ortalama konum | Kapsam dışı | Yayın sonrası işlem |
| 119f | AdSense: içeriği olmayan ekranda reklam yuvası basma (boş araç sayfası, 404, noindex in... | Kapsam dışı | Reklam yok |
| 120 | Görseller AVIF ya da WebP, boyutları belirtilmiş, ekran dışındakiler tembel yüklenir. | Karşılandı | Raster görsel sitede yok (SVG); og.png yalnız paylaşım |
| 121 | Fontlar yerel, alt kümeli, `font-display: swap`, ön yükleme yalnız ilk ekrandakine. | Karşılandı | Yerel, alt kümeli, font-display: optional (CLS için swap yerine; İP-31 gerekçesi) |
| 122 | Büyük medya yalnız kullanıcı isteyince iner. | Karşılandı | Büyük medya yok |
| 123 | HTML CDN'de önbelleklenebilir | Kısmen | CSP nonce için sayfalar dinamik; CDN önbelleği kısıtlı |
| 124 | Statik dosyalara uzun ömürlü, değişmez önbellek. | Karşılandı | Next _next/static değişmez önbellek |
| 125 | Üçüncü taraf betik sayısı en az | Karşılandı | Üçüncü taraf betik yok |
| 126 | Core Web Vitals hedefi: LCP 2,5 sn altı, CLS 0,1 altı, INP 200 ms altı | Kısmen | e2e/performans.spec.ts; LCP ve CLS bütçede. Yük altında TBT ölçümü dalgalı (bkz. rapor) |
| 127 | Önbelleğin çalıştığını başlıkla doğrula (`cf-cache-status: HIT`) | Kapsam dışı | CDN başlığı yayın sonrası |
| 128 | WCAG 2.1 AA hedefi. | Karşılandı | WCAG 2.2 AA hedefi |
| 129 | `prefers-reduced-motion` ile animasyon kapanır. | Karşılandı | globals.css prefers-reduced-motion |
| 130 | Her görselde anlamlı `alt`, süs görselinde boş `alt`. | Karşılandı | kurallar.test.ts alt metin ve adsız SVG testi |
| 131 | Klavyeyle tam gezinme, görünür odak halkası, "içeriğe atla" bağlantısı. | Karşılandı | İçeriğe geç bağlantısı, odak halkası, e2e/klavye.spec.ts |
| 132 | Renk kontrastı metinde 4.5:1, büyük metinde 3:1. | Karşılandı | src/marka/kontrast.test.ts (yalnız açık tema) |
| 133 | Form hataları canlı bölgeyle duyurulur, alan etiketi her zaman görünür. | Karşılandı | Form bileşenleri canlı bölge (form.tsx) |
| 134 | Dokunma hedefi en az 44×44 piksel. | Karşılandı | min-h-11 (44 px) bağlantı ve düğmeler |
| 135 | axe ile otomatik tarama CI'da, ekran okuyucuyla elle deneme yayından önce. | Kısmen | axe e2e'de; ekran okuyucuyla elle deneme yapılmadı |
| 136 | TypeScript sıkı mod, lint, biçimlendirici. | Karşılandı | tsconfig strict, Biome |
| 137 | Otomatik testler: dil anahtarı eşitliği, yasak ifade, em dash, unvan denetimi. | Kısmen | Yasak ifade, em dash, alt metin testli; dil anahtarı (tek dil) ve unvan denetimi yok |
| 138 | CI her push'ta tip, lint, derleme, test çalıştırır. | Karşılandı | .github/workflows/ci.yml |
| 139 | Her değişiklik üretim derlemesiyle doğrulanır, yalnız geliştirme sunucusuyla değil. | Karşılandı | Üretim derlemesiyle e2e |
| 140 | Eski geliştirme sunucusu süreçlerini kapat, yoksa eski kodu test edersin. | Karşılandı | Ekran görüntüsü sunucusu iş sonunda kapatıldı |
| 141 | Belgeler kodla birlikte güncellenir. | Karşılandı | docs/tasarim/README.md, docs/marka.md güncellendi |
| 141a | Veritabanı şeması (yeni sütun/tablo) uygulama açılışında güncellensin; arka plan işine ... | Kapsam dışı | Şema bu dalda değişmedi |
| 142 | Depoda yalnız site dosyaları | Karşılandı | Ham görsel yok; ekran görüntüleri docs altında belge olarak |
| 143 | Commit mesajları tek dilde ve açıklayıcı. | Karşılandı | Türkçe commit mesajları |
| 144 | Alan adının hangi kaydedicide ve hangi CDN hesabında olduğunu yazılı tut. | Kapsam dışı | DNS ve alan adı işletmesi; depoda doğrulanamaz |
| 145 | Hesap taşırken önce tüm DNS kayıtlarını (A, AAAA, MX, TXT, SPF, DKIM, DMARC) yeni hesab... | Kapsam dışı | DNS ve alan adı işletmesi; depoda doğrulanamaz |
| 146 | SSL modu "Full (strict)" | Kapsam dışı | DNS ve alan adı işletmesi; depoda doğrulanamaz |
| 147 | Zon aktifleşmeden önbellek ve güvenlik testleri yanıltıcıdır | Kapsam dışı | DNS ve alan adı işletmesi; depoda doğrulanamaz |
| 148 | E-posta alan adında SPF, DKIM ve DMARC kayıtları | Kapsam dışı | DNS ve alan adı işletmesi; depoda doğrulanamaz |
| 149 | Alan adı otomatik yenileme açık, kayıt kilidi (transfer lock) açık. | Kapsam dışı | DNS ve alan adı işletmesi; depoda doğrulanamaz |
| 149a | Cloudflare'de e-posta kayıtları (`mail`, `autoconfig`, `autodiscover`, MX hedefi) "DNS ... | Kapsam dışı | DNS ve alan adı işletmesi; depoda doğrulanamaz |
| 149b | Siteden e-posta gönderimi (doğrulama kodu, bildirim) için gönderim hizmetinde (ör | Kapsam dışı | DNS ve alan adı işletmesi; depoda doğrulanamaz |
| 149c | Gönderen adres için posta kutusu gerekmez (`bildirim@alanadi`) | Kapsam dışı | DNS ve alan adı işletmesi; depoda doğrulanamaz |
| 149d | Gönderim anahtarı yalnız sunucudaki ortam değişkeninde durur, depoya ve sohbete girmez | Kapsam dışı | DNS ve alan adı işletmesi; depoda doğrulanamaz |
| 149e | Ortam değişkeni eklenince uygulama yeniden yayımlanmalı | Kapsam dışı | DNS ve alan adı işletmesi; depoda doğrulanamaz |
| 150 | Sağlık ucu (`/api/health`) ve yapılandırma uyarısı. | Kısmen | İşçide sağlık ucu var; web için ayrı /api/health yok |
| 151 | Hata izleme ve sunucu logları | Kısmen | Günlükte gizli bilgi ayıklanır (İP-35); hata izleme hizmeti yok |
| 152 | Çalışma süresi izleme ve uyarı. | Kapsam dışı | İşletme |
| 153 | SSL ve alan adı süresi takibi. | Kapsam dışı | İşletme |
| 154 | Düzenli yedek, yedekten geri yükleme denemesi. | Kapsam dışı | İşletme |
| 154a | Sunucu disk doluluğu izlensin (%80 üstü uyarı) | Kapsam dışı | İşletme |
| 155 | Analitikte yalnız anlamlı olaylar (form gönderimi, arama, indirme). | Karşılandı | Analitik yok |
| 156 | Kırık bağlantı taraması periyodik. | Karşılanmadı | Periyodik kırık bağlantı taraması yok |
| 157 | Bağımlılık güncellemeleri ve güvenlik taraması aylık. | Karşılandı | Dependabot |
| 158 | Hukuki metinler yılda bir ve mevzuat değişince hemen gözden geçirilir. | Kapsam dışı | Yıllık süreç |
| 159 | İçerik takvimi | Kapsam dışı | Blog yok |
| 160 | Her yeni dil ya da sayfa türü eklendiğinde: rota, site haritası, hreflang, paylaşım kar... | Kısmen | Bu dalda yeni sayfa eklenmedi; 404 ve hata ekranı dizine kapalı |

Özet: Karşılandı 99, Kapsam dışı 48, Kısmen 24, Karşılanmadı 7 (toplam 178).
