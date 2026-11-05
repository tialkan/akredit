# İP-49: Herkese açık Akredit MCP sunucusu ve tanıtımı

- **Durum:** inceleme
- **Faz:** 8
- **Bağımlılık:** İP-25, İP-42
- **Sahip olduğu yollar:** `apps/acik-mcp/**`, `apps/web/src/app/mcp/**`, `apps/web/src/app/(site)/mcp-kullan/**`, ana sayfanın MCP bölümü, `apps/web/src/site/icerik.ts` (SAYFALAR.mcpKullan, YOL_HARITASI 49), `apps/web/public/llms.txt`, `docs/raporlar/IP-49.md`
- **Büyüklük:** orta

## Amaç

Herkes, hesap açmadan ve ücretsiz, kendi yapay zekâ asistanıyla (Claude, ChatGPT, Cursor, VS Code) Akredit'in kurum verisi gerektirmeyen araçlarını kullanabilsin. Stratejik karar (plan.md): MCP yalnız okuma ve öneri kanalıdır; karar, imza ve dış gönderim MCP'de yoktur. Açık sunucu bunun da dar hâlidir: öneri bile yazmaz, durum tutmaz.

## Kapsam

1. **Uzak sunucu** `https://akredit.org/mcp`: durumsuz Streamable HTTP (JSON yanıt), resmî TypeScript SDK ile. Hesap, anahtar, çerez yok. Araçlar salt okuma ve deterministik; sunucuda model çağrısı ve kurum verisine erişim yok.
2. **Araçlar:** `olcut_ara`, `olcut_getir` (resmî metin, kaynak adresi, sayfa, belge SHA-256; doğrulanmamış metin DOĞRULANMADI), `olgunluk_duzeyleri` (1-5 düzey metni, örnek kanıtlar), `oz_degerlendirme_iskeleti` (KİDR 3.2.1 yapısı; her alt ölçüt EKSİK, metin yazılmaz), `bologna_denetle` (`@akredit/cekirdek` kuralları), `ck_pc_hesapla` (`@akredit/olcme`, yalnız toplu sonuç), `rapor_dil_denetle` (`rapor/dil.ts`).
3. **Kişisel veri:** gelen her metin `@akredit/yz` KVKK desenleriyle taranır; desen varsa çağrı hesap yapılmadan reddedilir ve maskeleme istenir. Öğrenci alanı yalnız takma ad kabul eder.
4. **Günlük:** istek içeriği yazılmaz; yalnız yöntem, araç adı, süre, boyut, durum.
5. **Sınırlar:** gövde 512 KB, adres başına kova (60 istek, saniyede 1), CORS `*` (kimlik bilgisi yok), GET 405.
6. **Yerel paket:** `akredit-acik-mcp` (stdio; `--http` ile yerel HTTP). Yayınlama adımı raporda; yayınlanmadı.
7. **Site:** ana sayfada kısa bölüm, `/mcp-kullan` sayfası (araç listesi koddan okunur), alt menü, llms.txt, sitemap (SAYFALAR'dan kendiliğinden), yol haritası.

## Kabul ölçütleri

- [x] SDK istemcisiyle uçtan uca: bağlanma, araç listesi, araç çağrısı (test).
- [x] Bütün araçlar `readOnlyHint`; karar, imza, gönderim aracı yok (test).
- [x] Her yanıtta kaynak ve "YÖKAK ile bağı yoktur" notu (test).
- [x] Kişisel veri reddi; günlükte içerik yok (test).
- [x] Hesaplar elle doğrulanmış örnekle (test).
- [x] Boyut, hız, CORS, GET davranışı (test).
- [x] Site kuralları (em dash, yasak ifade, sol şerit) ve yol haritası testi geçer.
- [ ] Canlı ortamda gerçek istemcilerle (Claude, ChatGPT, Cursor, VS Code) bağlantı denemesi.
- [x] npm yayını (`@akredit/acik-mcp`).
- [x] Hoca akışı: MCP istemleri (`akredit` ve beş odak) ve Bologna doldurma araçları, SDK istemcisiyle uçtan uca (test).

## Günlük

- 2026-10-30: İP dosyası yazıldı ve uygulandı, durum inceleme. Ayrıntı: `docs/raporlar/IP-49.md`.
- 2026-10-30 (kapanış): npm yayınına hazır derleme eklendi (`scripts/derle.ts`, `tsconfig.build.json`; iş alanı paketleri `dist`e gömülür, dış bağımlılık SDK ve zod; `publishConfig` ile `bin`/`exports` `dist`e). `pnpm pack` paketi `npx` ile stdio el sıkışması, araç listesi ve çağrıyla denendi; yayın yapılmadı. Ters vekilde hız sınırı notu: `docs/isletim/acik-mcp-hiz-siniri.md`. Kalan, insan işi: canlı istemcilerle bağlantı denemesi, npm kapsamı ve yayın kararı, vekil sınırının sunucuda kurulması. Durum inceleme.
- 2026-10-31: npm sayfası için kısa Türkçe `apps/acik-mcp/README.md` yazıldı (araçlar, salt okuma notu, Claude, Claude Code, Cursor, VS Code ve yerel çalıştırma adımları, YÖKAK ile bağı olmadığı). Adımlar IP-49 raporundaki doğrulanmış belgelere dayanır; ChatGPT adımı tam doğrulanmadığı için README'ye alınmadı. Pakette `files` zaten `README.md` içerir.
- 2026-11-04: Hoca gözünden eleştiri yazıldı (`docs/raporlar/mcp-hoca-deneyimi.md`). Sürüm 0.2.0: altı istem (`baslangic`, `bologna_doldur`, `cikti_yaz`, `ck_pc_hesabi`, `olcut_rehberi`, `dil_denetimi`); yeni araçlar `bologna_ayristir` (yapıştırılan Proliz HTML'i, ağsız), `bologna_alan_rehberi`, `bologna_taslak_denetle`, `bologna_kopya_metni`; `bologna_denetle` alan listesi; her yanıtta `sonrakiAdim`; kısa araç açıklamaları. Seçenekleri asistan üretir, sunucu kural verir, denetler, sayıları hesaplar. `@akredit/baglayicilar` yalnız `./bologna-ayristir` alt yoluyla dışa açıldı ve npm derlemesine gömüldü. /mcp-kullan ve README'ye İlk 2 dakika ve örnek konuşma eklendi; npm paketinin yayımlandığı yazıldı. Kalan: istemlerin ChatGPT ve Cursor'da canlı denenmesi.
- 2026-11-04: Sürüm 0.3.0. Ana istem `basla` (`baslangic` geriye uyum için, "basla ile aynı"). OBS tarayıcı akışı istemlerde: hoca kendi OBS'sine girer, giriş bilgisini yalnız OBS ekranına kendisi yazar; CAPTCHA ve Kaydet hocada. Yeni araçlar: `kurulum_yardimi`, `engel_coz`, `bologna_durum`, `is_yuku_oner`, `kaynak_bicimle`, `not_tablosu_ayristir`. `bologna_ayristir` Proliz dışı sayfalar için genel ayrıştırıcı (HTML ya da düz metin, TR/EN etiketler, güven düzeyi). Kaynak künyesi taşınır (künye kuralı: yazar adı serbest, e-posta ve telefon yine reddedilir). Parola, doğrulama kodu, çerez içeren girdi reddedilir. Ayrıntı: `docs/raporlar/mcp-hoca-deneyimi.md`. Kalan: canlı istemcilerde tarayıcı akışının denenmesi, menü adlarının doğrulanması.
- 2026-11-05: Ana istem `akredit` oldu (`basla` ve `baslangic` aynı istem). İstem önce hangi aracın kullanılacağını sorar, seçimden önce hiçbir akışa (OBS girişi dahil) başlamaz; altıncı seçenek araç listesidir. Site sadeleştirildi: ana sayfa yalnız iki adım (Akredit'i yapay zekânıza ekleyin, akredit yazın), kurulum adımları `yardim.ts`ten okunur; diğer sayfalar /proje altında "Çalışıyor, Askıda, Taslak" durum etiketleriyle toplandı. Kullanılmayan `onay-onizleme.tsx` silindi; e2e tsconfig tip denetimine alındı (`types: node`, `baseUrl` kaldırıldı). npm: 0.1.0 yayında; 0.3.0 paketi kurucunun bilgisayarında yayımlanmayı bekliyor. Kalan: gerçek istemcilerde (Claude, ChatGPT) kurulum adımlarının menü adlarıyla doğrulanması, ilk kez kullanan bir hocayla deneme.
- 2026-11-05 (0.4.0): `basla` ve `baslangic` kaldırıldı. Her menüde "4) Hepsini akıllıca doldur": asistan doldurur, araçla denetler, tek özet gösterir. Bologna görev satırları (Dersi Verenler, Koordinatör) korunur, yalnız giriş bilgisi reddedilir; kişisel veri taraması araca göre kapsamlı. Yeni `kaynak_dogrula` (Crossref, Open Library, Google Books; sabit hostlar, zaman aşımı, boyut sınırı); doğrulanamayan kaynak önerilmez. OBS'ye yazmada açık izinle kaydetme. Site: tek iletişim LinkedIn, demo notu ve kapalı demo görünümü, 404/500/bakım sayfaları, bütün iç bağlantıları tarayan e2e. Ayrıntı: `docs/raporlar/IP-49.md`. Kalan: `kaynak_dogrula`nın canlı kataloglarla denenmesi, 0.4.0 npm yayını.
- 2026-11-05: Siteye Midjourney gravür görselleri (ana sayfa, /mcp-kullan, /proje, hata sayfaları), bir kez belirme hareketi ve kapanış sloganı eklendi; küçültülmüş kopyalar kullanılıyor, kaynak docs/tasarim/gorseller.md. e2e 238/238.

- 2026-11-05: Yazı tipi Oswald (başlık) + Lato (gövde), kendi sunucumuzdan. Ana sayfa başlığı "Akreditasyon ve Bologna yardımcısı"; ana sayfa, /mcp-kullan, /proje, /iletisim ve hata sayfası metinleri kısaltıldı. Güvenlik başlıkları (HSTS yalnız max-age, nosniff, Referrer-Policy, Permissions-Policy), /.well-known/security.txt, x-app-version başlığı ve app-version meta (SOURCE_COMMIT), alt bilgide KVKK/Gizlilik/Koşullar, <title> 60 karakter sınırı testi, Claude indirme bağlantısı resmî belgeye, herkese açık sayfalarda Cache-Control: public, s-maxage=300, stale-while-revalidate=600 (sayfalar istek başına işlenmeye devam eder; nonce ve barındırma bayrağı çalışma anında).
- 2026-11-05: İki dış incelemenin bulguları uygulandı: MCP güvenlik (adres, gövde akışı, kaynak kotası, kişisel veri), teyitli akıllı doldurma, akredit_basla ve obs_karsilastir araçları, imzalı kaynak doğrulaması, güncel Bologna kural seti (0.5.0); site tutarlılığı (çerçeveler, tek kaynaklı kurulum adımları, önce/sonra örneği, CSP önbellek çelişkisi, yol filtreli CI); /deneyin tarayıcı içi üç araç (ağ isteği yok). Ayrıntı: docs/raporlar/mcp-hoca-deneyimi.md.
