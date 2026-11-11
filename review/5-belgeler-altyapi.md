# Belgeler, plan, altyapı, kök

Başlangıç: `060ac7e`. Bu alanda 12 dosyada 12 düzeltme yapıldı; commit yok.

## Düzeltildi

- `docs/adr/README.md:14` dizinde ADR 0009 yoktu → satır eklendi (doğrulama: bağlantı denetimi betiği).
- `docs/raporlar/README.md` yalnız iki satırdı → İP-30 ve İP-46 raporunun neden olmadığı (ikisine de başlanmadı, ADR 0008 ile askıda; kanıt: İP dosyalarının günlükleri) ve İP raporu olmayan yedi dosyanın dizini eklendi.
- `docs/hukuk/README.md` dizininde `veri-akis-envanteri.csv` ve `yetki-devri-yonergesi-taslagi.md` yoktu → eklendi.
- `docs/tasarim/README.md` `gorseller.md` ve `yayin-kilavuzu.md` dosyalarını anmıyordu → sona kısa liste eklendi (§10.1 atfıyla).
- `docs/isletim/README.md:5` klasör `infra/uretim` (Caddy, `dagit.sh`) düzenini canlı yayın gibi anlatıyordu → "bugün yayın Coolify ile `infra/coolify/docker-compose.yml`'den" notu eklendi (kanıt: o dosyanın başlığı, `docs/tasarim/yayin-kilavuzu.md`).
- `docs/mimari.md:5` belgede `apps/acik-mcp`, `apps/mcp`, ADR 0008 ve askı hiç geçmiyordu → en üste "Güncel durum" notu (gövde değişmedi).
- `README.md` "Durum" yalnız "Geliştirme sürüyor" diyordu, açık MCP ve askı kararı yoktu → yayında/askıda ayrımı, ADR bağlantısı; depo tablosuna `apps/acik-mcp` ve `apps/mcp`; komutlara `verify:canli`.
- `CLAUDE.md` depo haritası (`AGENTS.md` bu dosyaya sembolik bağdır, ayrı içerik yok; fark olamaz): `apps/acik-mcp`, `apps/mcp` ve haritada hiç olmayan sekiz paket (`servis`, `depo`, `yetki`, `surec`, `anket`, `gosterge`, `kiyaslama`, `ornek-veri`) eklendi. Üç satır; ilkeler ve kurallar değişmedi.
- `docs/gelistirme.md:36` `verify:canli` yoktu → eklendi. `:59-62` CI anlatımı eskiydi ("`pnpm verify`", "iki imaj derlenir") → gerçek davranış (ayrı `check`/`typecheck`/`test`, yol süzgeçleri, yalnız değişen imaj) yazıldı.
- `docs/raporlar/IP-49.md` 0.5.0'da bitiyordu → "Ek: 0.5.1 – 0.8.0" tablosu; yalnız `plan/ip/IP-49-acik-mcp.md` günlüğünün özeti, güncel sürüm ve araç sayısı (0.8.0, 22) depodan.
- `docs/strateji-raporu-2026-11.md` → en üste "Uygulama durumu (2026-11-11)" tablosu: 4 yapıldı (#4, #5, #7 ve belge olarak #6), 3 kısmen (#1, #3, #9), 3 yapılmadı (#2, #8, #10). Gövde değişmedi.
- `package.json:21` `verify:canli` süzgecinde açık MCP'nin gömdüğü `@akredit/baglayicilar` ve `@akredit/yz` yoktu (`apps/acik-mcp/scripts/derle.ts:16` `GOMULU`, `apps/acik-mcp/package.json:43-47`) → ikisi eklendi (doğrulama: bu iki pakette `typecheck` temiz, testler 98 + 163 geçti).

Geri alınan bir deneme: `docs/hukuk/kurum-paketi/00-okuyun.md:5` `kaynaklar.md` bağlantısı depoda kırık görünür ama `apps/web/src/site/hukuk-paketi.ts` paketi tek .zip'te düzleştirir ve orada doğrudur; dokunulmadı.

## Kurucu kararı gerekiyor

- [önem: yüksek] `plan.md:137-185` ile `plan/ip/IP-*.md:3` çelişiyor: 22 İP tabloda **tamam**, kendi dosyasında **inceleme** (01-07, 09, 10, 12-18, 21, 22, 24, 25, 31). Kapanış incelemesi (`docs/raporlar/inceleme-kapanis.md`) yalnız 08, 11, 19, 20, 23, 26-29, 32-43, 45, 48'i karara bağladı; bu 22'si için "tamam" kararının kaydı bulunamadı. Seçenekler: (a) İP dosyalarını tabloya eşitle, günlüğe tarihli satır ekle; (b) tabloyu "inceleme"ye geri al. Öneri: (a), ama kararın sahibi kurucu; günlüğe dayanak yazılmalı.
- [önem: yüksek] `infra/coolify/docker-compose.yml` canlı dağıtım hâlâ `isci`, `vt`, `goc` hizmetlerini kaldırıyor ve `web` bunlara `depends_on` ile bağlı; `AKREDIT_DEMO` varsayılanı 1. ADR 0008 ve strateji raporu canlı ürünü "durumsuz, tek VPS" diye anlatıyor. Veritabanı ya da göç düşerse açık MCP ve site de açılmaz. Seçenekler: askıdaki hizmetleri Compose profiline almak ya da olduğu gibi bırakıp belgeye yazmak. Öneri: profil; davranış değişikliği olduğu için dokunulmadı.
- [önem: orta] `.github/workflows/yayin.yml` her `main` itmesinde (yalnız belge değişse de) web imajını derleyip GHCR'ye yollar; canlı yayın ise Coolify'da kaynaktan derlenir. `HAZIRLIK_SUNUCU` tanımlı mı DOĞRULANMADI; tanımlı değilse bu imajları kimse çekmiyor. İş CI'ı da beklemiyor. Öneri: web için de yol süzgeci ya da iş akışını yalnız etikete bağlamak.
- [önem: orta] `.github/workflows/ci.yml:62-78` tam `check`, `typecheck`, `test` çalışır; `verify:canli` CI'da kullanılmıyor. Her çalıştırmada iki Node sürümünde Playwright tarayıcısı kurulur (yalnız `baglayicilar` testi için). Öneri: çekme isteğinde `verify:canli`, `main`'de tam set (strateji raporu §6.1). Not: `baglayicilar` artık `verify:canli` içinde olduğundan tarayıcısız makinede o test kırılabilir; istenmezse süzgeçten çıkarılır.
- [önem: orta] npm: `npm view @akredit/acik-mcp version` bugün `0.6.0` döndü; görev notundaki ve strateji raporundaki "0.5.0" eskimiş. Depo 0.8.0. Yayın insan işi (`npm login`).
- [önem: orta] `pnpm audit --prod`: 2 orta, 1 düşük. `esbuild <=0.24.2` (GHSA-67mh-4wv8-2f99; yol `apps/web > better-auth > drizzle-kit > @esbuild-kit/*`), `uuid <11.1.1` (GHSA-w5hq-g745-h8pq; `packages/belge > exceljs`), düşük: `fast-xml-parser <=5.11.2` (GHSA-474x-hrwr-fgx4; `apps/web > @better-auth/sso`). Üçü de geçişli; ikisi askıdaki panel kimlik yolundan. Yükseltme yapılmadı. Seçenek: `pnpm.overrides` ya da üst paketlerin yeni sürümü.
- [önem: orta] `.github/dependabot.yml:26` Docker güncellemesi yalnız `/infra/gelistirme`'yi izler; canlıda kullanılan `infra/coolify/*.Dockerfile` ve `infra/uretim/isci.Dockerfile` izlenmiyor.
- [önem: düşük] Taban imaj `node:22-alpine` dört Dockerfile'da yalnız ana sürümle sabit (`engines` 22.18 ister). `infra/gelistirme/docker-compose.yml:12,43,60,105` `pgvector:pg17`, `minio:latest`, `mc:latest`, `mailpit:latest`. CI'daki `gitleaks:v8.28.0` ve `pgvector:0.8.0-pg17` etiketle sabit, özetle değil (eylemlerin hepsi SHA ile sabit).
- [önem: düşük] `infra/gelistirme/isci.Dockerfile` ile `infra/uretim/isci.Dockerfile` tek satır dışında aynı; üretimdekinin başlık yorumu eskimiş ("o imaj `pnpm deploy` kullanır", artık kullanmıyor). `goc.ts` de iki kopya. Öneri: teke indirmek (CI, Coolify ve `yayin.yml` yolları değişir).
- [önem: düşük] `docs/danismanlik/2026-11-05-dis-inceleme-1.md` ve `-2.md` içinde 236 bağlantı yerel mutlak yol (`/Users/<kullanıcı>/Documents/GitHub/akredit/...:satır`); GitHub'da kırık ve yerel kullanıcı adını gösterir. Tarihsel kayıt olduğu için dokunulmadı. Öneri: önek depo köküne göreli yola çevrilsin.
- [önem: düşük] `plan.md:115,266` ve `plan/ip/IP-11-cerceveler.md:5,30` `docs/arastirma/` klasörünü anar; klasör git geçmişinde hiç olmamış. `plan/ip/IP-40-sifir-kisisel-veri.md:6` `packages/yz/src/envanter.ts` ve testini anar; dosyalar yok (envanter `apps/web/scripts/veri-akis-envanteri.ts` üretir).
- [önem: düşük] İzlenen ikililer: `kaynaklar/` 24 MB (29 resmî belge; `kaynaklar.json` ile birebir, SHA-256'lar tutuyor, ilke 6 gereği kalmalı), `docs/tasarim/ekranlar/` 12 MB (51 PNG; "v2-once" ve "ip42" takımları tarihsel), `docs/marka/` 2,6 MB. Silme `git rm` ister; öneri: eski ekran takımlarını ayıklamak.
- [önem: düşük] Kökteki `review.md` ve `review/` izlenmiyor. Öneri: kalıcı olacaksa `docs/raporlar/inceleme-2026-11-11.md` altına taşınsın, olmayacaksa `.gitignore`'a eklensin.

## Başka alan

- `packages/cerceveler/_incele.ts` izlenmeyen geçici dosya; ilk ölçümdeki Biome hatalarının çoğu ondandı (son ölçümde dosya yok, hata 0).
- `apps/web`: `/araclar` adresi açılmadı (strateji raporu #1 bunu da öneriyordu); araçlar `/deneyin`'de.
- `apps/acik-mcp/scripts/derle.ts:34` Biome uyarısı (kullanılmayan parametre).

## Bakıldı, sorun yok

- `infra/uretim/ornek.env` ve `infra/kurum-ici/ornek.env`: bütün parola, anahtar ve gizli alanları boş; gerçek sır yok.
- `git ls-files`: `tsbuildinfo`, `.DS_Store`, `.env` izlenmiyor (eşleşenler yalnız `ornek.env` ve `surumler.env`).
- `docs/**`, `plan/**`, kök `.md`: göreli bağlantılar (danışmanlık notları ve yukarıdaki zip içi bağlantı dışında) sağlam. `/deneyin#kurum-demosu`, eski araç sayısı ya da eski sürüm tarihsel kayıtlar dışında geçmiyor.
- Araç sayısı 22 ve sürüm 0.8.0 depoyla tutarlı. Her "tamam" İP'nin raporu var.
- `.github/workflows/*.yml`: bütün eylemler SHA ile sabit; yol süzgeci `apps/acik-mcp` değişince web derlemesi, uçtan uca ve web imajını çalıştırır.
- `biome.json`, `.gitignore`, `pnpm-workspace.yaml`, `SECURITY.md`, `NOTICE`: sorun görülmedi. `infra/uretim/denetle.sh`: BAŞARILI.

## Doğrulama

- `npx biome check .`: başta 8 hata, 18 uyarı; hepsi başka alanların dosyalarında. Sayı diğer ajanların süren düzenlemeleriyle oynuyor (bir ara 0, son ölçümde 12; hepsi `apps/acik-mcp/src/promptlar.ts` ve `bologna.ts`, başka alan). Bu alanın yolları (`package.json`, `biome.json`, `infra`, `.github`) ayrı denetlendi: 0 hata, yalnız önceden var olan 2 uyarı (`infra/kurum-ici/vt-kullanici.test.ts`).
- `pnpm -r --filter @akredit/baglayicilar --filter @akredit/yz typecheck` temiz; `test` 98 + 163 geçti. `verify:canli`'nin tamamı çalıştırılmadı (başka ajanlar aynı anda `apps/web` ve `apps/acik-mcp`'yi değiştiriyor).
- Bağlantı denetimi (izlenen `.md` dosyalarındaki göreli bağlantılar ve ters tırnaklı yollar, `ls` karşılığı): yeni kırık yok.
- `pnpm audit --prod`: çalıştı, 3 bulgu (yukarıda). `npm view @akredit/acik-mcp version`: 0.6.0.
- `kaynaklar/resmi/kaynaklar.json`: 29 dosya, 29 kayıt, özetler eşleşiyor.
