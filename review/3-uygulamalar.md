# Uygulamalar (panel, API, işçi, kurum MCP, CLI)

Kapsam: `apps/web/src/**` (site, deneyin, kök yerleşim hariç), `apps/web` kök yapılandırması, `apps/isci`,
`apps/mcp`, `apps/cli`. Başlangıç: `060ac7e`.

## Düzeltildi

- `apps/web/src/demo/uc.ts:48,65` Demo ucu hata ve hız sınırı durumunda eski `/deneyin?hata=...` adresine
  yönlendiriyordu; rol formu ve `HATALAR` iletileri artık `/kurum-demosu` sayfasında, yani ileti hiç
  görünmüyordu → `/kurum-demosu?hata=rol|cok|hazir`. Dosya başı yorumu da güncellendi.
  (doğrulama: `src/demo/demo.test.ts` içindeki üç beklenti yeni adrese çevrildi, geçiyor)
- `apps/web/src/demo/rehber-turu.tsx:22` Panel üstündeki demo şeridinde "Başka bir rol seçin" bağlantısı
  `/deneyin`'e gidiyordu (orada rol düğmesi yok) → `/kurum-demosu`.
- `apps/web/src/kimlik/erisim.ts:81` Süresi dolan demo oturumunun iletisi "Deneyin sayfasından yeniden
  başlayabilirsiniz" diyordu → "Kurum demosu sayfasından…".
- `apps/web/src/demo/oturum.ts:1` Yorumdaki sayfa adı `/kurum-demosu` yapıldı.
- `apps/web/src/kimlik/erisim.ts:243` (`korumali`) Origin yokken bozuk bir `Referer` başlığı `new URL()`
  hatasıyla 500 döndürüyordu (okuma isteklerinde bile). Ham değer `csrfDenetle`'ye veriliyor; o zaten güvenli
  ayrıştırıp kökene indirger → yazma isteğinde 403, okuma isteğinde etkisiz.
  (doğrulama: `src/kimlik/yalitim.test.ts` içine yeni test: bozuk Referer 403, yabancı Referer 403, kendi
  Referer'ı 200, GET'te bozuk Referer 200)
- `apps/web/src/app/onay/eposta/route.ts` E-postadaki onay sayfası satır içi `<style>` kullanıyor; sayfa CSP'si
  (`style-src 'self' 'nonce-…'`, `src/proxy.ts`) nonce'suz `<style>`'ı engellediği için sayfa zorlayan kipte
  biçimsiz açılıyordu. `<style>` artık proxy'nin istek başlığına koyduğu nonce'u (`x-nonce`) taşıyor; başlık
  yoksa/bozuksa öznitelik yazılmaz. (doğrulama: tip denetimi + Biome; tarayıcıda DOĞRULANMADI, yerelde Playwright yok;
  bu rota için birim testi de yok, bkz. karar listesi)
- `apps/web/src/app/panel/onaylar/mobil.ts` `servisCalisaniKaynagi`'nın belge yorumu yanlışlıkla
  `cikisYanitiniSertlestir`'in üstünde duruyordu → doğru işlevin üstüne taşındı (davranış yok).
- `apps/web/src/app/api/_ortak/kopruler.ts:21` Biome `useOptionalChain` uyarısı: `v && v.trim() ? …` →
  `v?.trim() || undefined` (eşdeğer).
- `apps/mcp/src/index.ts` Paket başına not: bu paket kurum içi (API anahtarlı, askıda) MCP'dir; akredit.org/mcp'yi
  sunan `apps/acik-mcp`'dir. (yalnız yorum)

Toplam: 9 düzeltme (5'i `/deneyin` → `/kurum-demosu` taşınmasının artığı, 2 gerçek hata, 2 temizlik/yorum).

## Kurucu kararı gerekiyor

- [önem: orta] `apps/web/src/demo/uc.ts:24`, `kimlik/sunucu.ts:86`, `kimlik/kurum-acilisi.ts:35`,
  `pilot/basvuru.ts:103`, `app/api/istek/_ortak.ts:49` İstemci adresi beş ayrı yerde `x-real-ip` → `x-forwarded-for`
  son öğe diye okunuyor; `cf-connecting-ip` hiç okunmuyor. `apps/acik-mcp/src/http.ts` (`istemciAdresi`) ise önce
  `cf-connecting-ip`'ye bakıyor. Site Cloudflare arkasındaysa (DOĞRULANMADI: depoda yalnız
  `docs/strateji-raporu-2026-11.md` Cloudflare'den söz ediyor) `x-real-ip` Cloudflare kenar adresi olur: demo hız
  sınırı ve ağ izi gerçek ziyaretçiye göre değil kenar sunucuya göre sayılır. Seçenekler: (a) beş kopyayı tek
  yardımcıda toplayıp acik-mcp ile aynı sıraya getirmek, (b) olduğu gibi bırakmak (Cloudflare yoksa doğru). Öneri: (a);
  ayrıca `??` / `||` farkı var (boş `x-real-ip` üç kopyada boş dize döndürür).
- [önem: orta] `/api/**` barındırma bayrağı. Kapalıyken 503 dönenler: `/api/kurum-acilisi`,
  `/api/kurum-acilisi/dogrula`, `/api/pilot` (ADR-0008 madde 2 ile uyumlu, doğru). Bayrağa BAKMAYANLAR:
  `/api/kimlik/*` (sihirli bağlantı ve SSO girişi dahil), `/api/davet`, `/api/kurulum/*`, `/api/v1/*`,
  `/api/istek/yukle`, ayrıca `/onay/eposta`, `/anket/*`, `/degerlendirici/*`, `/panel/**`, `/kurulum`. Hepsi oturum,
  üyelik ya da imzalı jeton ister; üyeliği olmayan e-postaya hesap açılmaz (`hesapAcilabilirMi`), yani yeni kayıt
  yolu açık değil. Demo oturumu `/api/kimlik` (oturum, çıkış) ve `/api/v1`'e muhtaç, bu yüzden topluca kapatılamaz.
  Karar: kapalıyken `/api/kimlik/sign-in/*`, `/api/davet`, `/api/kurulum`, `/api/istek/yukle` da 503 dönsün mü?
  Öneri: en azından giriş (`sign-in/magic-link`, `sign-in/sso`) kapansın; `/giris` formu zaten gizli, uç açık.
- [önem: orta] `/api/deneyin` `AKREDIT_DEMO` kapalıyken JSON 404 döner (`app/api/deneyin/route.ts:13`); `/kurum-demosu`
  bu durumda düğme göstermediği için pratikte ulaşılmaz. Tutarlı. Ancak beklenmeyen hatada JSON 500 dönüyor; form
  betiksiz gönderildiği için ziyaretçi ham JSON görür. Öneri: `/kurum-demosu?hata=hazir`'a 303.
- [önem: orta] Demo oturumu bitince panel `redirect("/giris")` yapıyor (`veri/sunucu.ts:76`,
  `degerlendirici/_portal/sunucu.ts:26`, `saha-ziyareti/sunucu.ts:26`, `toplantilar/veri.ts:69`,
  `dersler/_bologna/veri.ts:75`). Barındırma kapalıyken `/giris` "askıda" sayfasıdır: demo ziyaretçisi iki saat sonra
  açıklamasız oraya düşer. Seçenek: `AKREDIT_DEMO=1` ve barındırma kapalıyken `/kurum-demosu`'na yönlendirmek. Demo
  şeridinde "demodan çık" bağlantısı da yok (yalnız "Başka bir rol seçin"); çıkış ucu `/api/kimlik/sign-out` var.
- [önem: orta] `apps/isci/src/ana.ts` + `calisma/isci.ts` Üretim işçisine bağlanmamış, yalnız testte çalışan parçalar:
  `politikaIscisi` (İP-13 yetki devri politikalarının uygulanması ve onay özeti e-postası), `dersDosyasiIscisi`
  (İP-16), `clamdTarayici` (virüs taraması), `tesseractOcr` (OCR; yokken taranmış belge `ocr_gerekli`'de kalır),
  `surecZamanlayicisi` (yerine `surec.tik` cron'u var, bu ölü sayılabilir). `onay.politikalariUygula` ve
  `dersDosyasi.bekleyenleriUret` depoda başka hiçbir üretim yolundan çağrılmıyor. Askıdaki kod; geri açmadan önce
  bağlanmalı ya da İP raporlarında "bağlı değil" diye yazılmalı.
- [önem: düşük] `apps/web/src/proxy.ts:25` Eşleştiricideki `sw.js` ve `manifest.webmanifest` istisnaları yalnız kök
  yolu (`/sw.js`) dışlar; gerçek rotalar `/panel/onaylar/sw.js` ve `/panel/onaylar/manifest.webmanifest` olduğu için
  istisna hiçbir şeyi dışlamıyor. Sonuç: bu durağan yanıtlar (ve `/gorsel/*`, `/marka/*`, `/panel/onaylar/simge.svg`,
  `/panel/ayarlar/veri-akisi/csv`, robots/sitemap) nonce'lu CSP başlığıyla gider ve önbelleklenebilir. Zararsız (aşağıya
  bakın) ama ölü desen. Öneri: istisnayı `.*\.(?:png|svg|webp|ico|js|webmanifest|txt|xml)$` gibi uzantıya çevirmek ya
  da ölü iki adı silmek.
- [önem: düşük] `app/panel/layout.tsx:15-21` Her panel sayfasında oturum iki kez çözülüyor (`panelVeriKaynagi` →
  `istekBaglami`, sonra `panelDemoBilgisi` → `istekBaglami`; sayfa da kendi `panelVeriKaynagi`'nı çağırıyor) ve
  yalnız sayı için bütün bekleyen öneriler sayfa sayfa çekiliyor (`bekleyen.length`). Öneri: `React.cache` ile
  istek başına tek bağlam; sayaç için sayı döndüren servis çağrısı.
- [önem: düşük] `app/panel/dersler/[id]/tarama/yukle/route.ts:38-52` Oturum denetimi 100 MB'a kadar gövde okunduktan
  SONRA yapılıyor (yalnız köken denetimi önce). Oturumsuz biri sunucuya 100 MB tamponlatabilir. Öneri:
  `servisBaglami()` gövde okunmadan önce.
- [önem: düşük] `apps/mcp/src/cli.ts:25-38` `--http` kipinde gövde sınırsız okunuyor ve `isle` hatası yakalanmıyor
  (yalnız 127.0.0.1'e bağlı). `apps/mcp/src/tasima.ts:57` `istek.json()` da sınırsız. acik-mcp'deki `govdeOku`
  (512 KB) örnek alınabilir.
- [önem: düşük] `app/onay/eposta/route.ts` (karar etkileyen uç) için rota düzeyinde test yok; servis katmanı
  (`onay.baglantiKullan`) sınanıyor. Öneri: GET tüketmez / POST tüketir / nonce var testleri.
- [önem: düşük] Kullanılmayan dışa aktarımlar (askıdaki kod olduğu için silinmedi): `kimlik/erisim.ts` `uyelikBul`,
  `bilesenler/temel.tsx` `Iskelet`, `degerlendirici/_portal/sunucu.ts` `portalSaglayicisiAyarla` (hiç çağrılmadığı için
  değerlendirici soru-cevabı her zaman 503 "henüz açık değil"), `apps/isci/src/index.ts` `PAKET`,
  `calisma/isci.ts` `IsciDurumu.kapaniyor` ve `sonHata` (yazılıyor, sağlık raporunda okunmuyor).
- [önem: düşük] Yinelenen yardımcılar: `kokenGecerli` dört kopya (`kurum-acilisi.ts`, `pilot/basvuru.ts`,
  `istek/_ortak.ts`, `demo/uc.ts`, ayrıca `api/davet/route.ts` ve `tarama/yukle/route.ts` satır içi);
  "Sunucuya ulaşılamadı…" fetch sarmalayıcısı üç panelde (`odr-paneli.tsx`, `ders-dosyasi-paneli.tsx`,
  `arastirma-paneli.tsx`); API anahtarından kayıt kurma `kimlik/erisim.ts:anahtarBaglami` ile
  `apps/mcp/src/kimlik.ts:anahtarAktoru`'nda aynı.
- [önem: düşük] `apps/web/playwright.config.ts:7,17` `PLAYWRIGHT_BROWSERS_PATH` varsayılanı `/opt/pw-browsers` ve
  `chrome-linux64` yolu: macOS'ta tarayıcı kurulu olsa bile e2e çalışmaz (ortam değişkeni elle verilmedikçe).
- [önem: düşük] `apps/isci/src/ana.ts:21` İşçi `../../../infra/kurum-ici/yz-ayari.ts` dosyasını paket sınırı dışından
  içe aktarıyor; Docker imajında `infra/` kopyalanmazsa açılmaz (DOĞRULANMADI: Dockerfile 5. alanın).
- [önem: düşük] `kimlik/erisim.ts:73` Birden çok kurumda üyeliği olan kullanıcıda `x-akredit-kurum` yoksa
  `uyelikler[0]` sırasız sorgudan gelir; hangi kurumun açılacağı belirsiz.
- Kullanılmayan bağımlılık: yok. `apps/web`, `apps/isci`, `apps/mcp` `package.json` bağımlılıklarının hepsi içe
  aktarılıyor (`@fontsource/*` `yazi-tipi.css`'ten, `postcss`/`@tailwindcss/postcss` `postcss.config.mjs`'ten,
  `jose`/`samlify` testlerden).

### CSP nonce ile CDN önbelleği çakışıyor mu? (kesin yanıt: hayır)

- Nonce yalnız `src/proxy.ts`'te, her istekte `nonceUret()` ile üretilir; CSP yanıt başlığı da orada yazılır.
- Depoda `s-maxage` hiç geçmiyor. Açıkça uzun önbellek verilen yollar yalnız `next.config.ts` → `DURAGAN_YOLLAR`:
  `/gorsel/:yol*` ve `/marka/:yol*` (`public, max-age=31536000, immutable`), ve Next'in kendi `_next/static`'i
  (proxy eşleştiricisi dışlıyor). `/panel/onaylar/simge.svg` `max-age=86400`.
- Bütün HTML sayfaları kök yerleşimdeki `await connection()` (`app/layout.tsx:43`) yüzünden istek anında işlenir;
  Next bu yanıtlara `private, no-cache, no-store` verir. `/onay/eposta` kendi `no-store` başlığını yazar.
- Kalan tek örtüşme: durağan, HTML olmayan yanıtlar (görseller, favicon SVG, robots/sitemap, `force-static` rota
  işleyicileri) proxy'den geçtiği için önbelleklenebilir yanıtta eski bir nonce'lu CSP başlığı taşıyabilir. Bu
  yanıtlarda betik ya da nonce'lu öğe olmadığından nonce'un yeniden kullanılması bir açık doğurmaz.
- DOĞRULANMADI: `force-static` rota işleyicilerine Next'in çalışma anında verdiği varsayılan `Cache-Control`
  değeri (koddan değil, çatıdan gelir) ve CDN'in bunu nasıl yorumladığı canlıda ölçülmedi.

### `/mcp` rotası ile `apps/acik-mcp/src/http.ts`

- `app/mcp/route.ts` yalnız `acikMcpIsleyici()`'yi varsayılanlarla çağırır: hız sınırı (60 istek, saniyede 1; ayrıca
  `kaynak_dogrula` dakikada 5), gövde sınırı (512 KB, akışta sayılarak), istemci adresi (`cf-connecting-ip` →
  `x-real-ip` → XFF son öğe) hepsi `http.ts`'ten gelir; rota kendi kuralını eklemiyor, tutarsızlık yok.
- İşleyici modül düzeyinde bir kez kurulur; kova süreç başınadır (çok kopyalı dağıtımda sınır kopya sayısıyla çarpılır).
- `DELETE` dışa aktarılmıyor: Next 405 döner, CORS başlıksız (işleyicinin kendi 405'i CORS'lu). Zararsız.
- `cf-connecting-ip`'ye güven, köken sunucuya yalnız Cloudflare üzerinden erişilebiliyorsa geçerlidir (`http.ts`
  yorumu da söylüyor). DOĞRULANMADI: köken sunucunun doğrudan erişime kapalı olup olmadığı.

## Başka alan

- `apps/web/src/site/barindirma.ts:4` yorum "Demo (/deneyin)" diyor; demo artık `/kurum-demosu`.
- `apps/web/src/site/llms.test.ts:20` ve `apps/acik-mcp/src/promptlar.ts:197` doğrulama sırasında bir kez kırık
  görüldü (1. ve 2. alanın süren değişiklikleri); son çalıştırmada ikisi de düzelmişti.
- `apps/web/e2e/pilot.spec.ts:106` Biome `useDomNodeTextContent`; `apps/acik-mcp/scripts/derle.ts:34` kullanılmayan
  parametre uyarısı.
- `apps/web/e2e/**` içinde `/deneyin?hata=` ya da demo şeridi bağlantısını sınayan test görmedim; `/kurum-demosu`
  hata iletisi ve "Başka bir rol seçin" hedefi için e2e eklenebilir.
- `docs/raporlar/IP-25.md:52` "`apps/web`'de `/mcp` rotası yok" diyor; artık var ama açık MCP'yi sunuyor (kurum
  MCP'si hâlâ bağlı değil). Karışıklık kaynağı.
- `plan.md` üst notu ve ADR-0008 madde 3 "Demo (/deneyin, sentetik Örnek Üniversitesi)" diyor; adres `/kurum-demosu` oldu.
- `packages/servis` `HizSiniri` 50.000 anahtara kadar büyür, dolunca yeni anahtarı reddetmez (acik-mcp `AdresKovasi`
  reddeder); iki ayrı kova uygulaması var.

## Bakıldı, sorun yok

- `guvenlik/basliklar.ts`, `guvenlik/csp.ts`: HSTS, nosniff, Referrer-Policy, Permissions-Policy bütün yollara;
  CSP `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`.
- `next.config.ts`, `vitest.config.ts`, tsconfig: tutarlı; `transpilePackages` ile bağımlılık listesi eşleşiyor.
- `/api/kurum-acilisi`, `/api/kurum-acilisi/dogrula`, `/api/pilot`: kapalıyken 503, köken denetimi, bal küpü, hız sınırı.
- `/api/istek/yukle`: köken, akışta gövde sınırı, jeton dosyadan önce doğrulanıyor.
- `/api/kimlik`: çıkışta `Clear-Site-Data`; `/api/v1` ve `/api/kurulum`: `korumali` (CSRF + bağlam), demo oturumu
  `DEMO_EYLEMLERI` ile sınırlı, `oturumlaOlmali` demo'yu reddediyor.
- `demo/oturum.ts`: çerez imzası, `.invalid` adres, süre üyelikte; `kimlik/yonetim.ts` davet kabulünde atomik sahiplenme.
- `onay/eposta`: GET tüketmiyor, POST tüketiyor, HTML kaçışı var, `no-store`, `noindex`.
- `"use client"` dosyaları: hepsi kanca ya da olay işleyici kullanıyor; gereksiz olan yok.
- `apps/isci`: kuyruk tanımları ve cron çizelgesi (`ZAMANLAMA`) tutarlı, tekil anahtarlar var, kurum başına hata
  yalıtımı var, sağlık ucu gizli bilgi sızdırmıyor.
- `apps/mcp`: sunucu adı `akredit` (açık MCP `akredit-acik`), karar aracı yok, yasak eylemler kapsamdan düşüyor.
- `apps/cli`: dokunulmadı.

## Doğrulama

- `pnpm --filter @akredit/web test`: son çalıştırmada 47 dosya / 382 test, hepsi geçti (381 eski + 1 yeni Referer
  testi). Arada bir kez `src/site/llms.test.ts` (2. alan) kırık görüldü; bekleyip yeniden denenince geçti.
- `pnpm --filter @akredit/web typecheck` (`tsc -p .` ve `tsc -p e2e`): son çalıştırmada temiz. Arada bir kez
  `apps/acik-mcp/src/promptlar.ts:197` (1. alan, süren değişiklik) yüzünden kırıldı; yeniden denenince geçti.
- `pnpm --filter @akredit/isci test`: 13 dosya / 70 test geçti. `pnpm --filter @akredit/isci typecheck`: temiz.
- `pnpm --filter @akredit/mcp test`: 1 dosya / 23 test geçti. `pnpm --filter @akredit/mcp typecheck`: temiz.
- `apps/cli` `node --test`: 38 test, 38 geçti (dosyalarına dokunulmadı).
- `npx biome check apps`: benim alanımda temiz. Kalan tek tanı `apps/web/e2e/pilot.spec.ts:106`
  (`useDomNodeTextContent`, 2. alan).
- e2e (Playwright) çalıştırılmadı: yerelde tarayıcı yok. `/onay/eposta` nonce düzeltmesi tarayıcıda DOĞRULANMADI.
