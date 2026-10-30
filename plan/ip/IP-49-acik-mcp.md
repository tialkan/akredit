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
- [ ] npm yayını (kurucu kararı).

## Günlük

- 2026-10-30: İP dosyası yazıldı ve uygulandı, durum inceleme. Ayrıntı: `docs/raporlar/IP-49.md`.
- 2026-10-30 (kapanış): npm yayınına hazır derleme eklendi (`scripts/derle.ts`, `tsconfig.build.json`; iş alanı paketleri `dist`e gömülür, dış bağımlılık SDK ve zod; `publishConfig` ile `bin`/`exports` `dist`e). `pnpm pack` paketi `npx` ile stdio el sıkışması, araç listesi ve çağrıyla denendi; yayın yapılmadı. Ters vekilde hız sınırı notu: `docs/isletim/acik-mcp-hiz-siniri.md`. Kalan, insan işi: canlı istemcilerle bağlantı denemesi, npm kapsamı ve yayın kararı, vekil sınırının sunucuda kurulması. Durum inceleme.
