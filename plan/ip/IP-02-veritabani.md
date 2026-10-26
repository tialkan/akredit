# İP-02: Veritabanı şeması, kiracı yalıtımı ve değiştirilemez kayıt

- **Durum:** inceleme
- **Faz:** 1 (Temeller)
- **Bağımlılık:** yok (türler için `@akredit/cekirdek` sözleşmesi hazır)
- **Sahip olduğu yollar:** `packages/vt/**`, `docs/raporlar/IP-02.md`
- **Büyüklük:** büyük

## Amaç

`docs/mimari.md` §3'teki veri modelini PostgreSQL 17 + pgvector üzerinde, kiracılar arası sızıntıyı ve kayıt değiştirmeyi veritabanı düzeyinde imkânsız kılacak biçimde kurmak.

## Kapsam

1. **Drizzle şeması** (`src/sema/*.ts`): kurum yapısı (kurum, birim, program, ders, donem, ders_acilisi, kisi, rol_atamasi), çerçeveler (cerceve, olcut, olgunluk_duzeyi, kanit_gereksinimi), kanıt (kanit, kanit_isleme, kanit_parcasi + `vector(1024)` gömme, kanit_olcut_baglantisi), çıktılar ve ölçme (cikti, katki, olcme_araci, soru, ogrenci_puani, olcme_sonucu), öneri/karar/yetki_politikasi, rapor ve rapor_bolumu_surumu, süreç (surec_tanimi, surec_ornegi, gorev, son_tarih, bildirim), eylem, toplanti, anket (anket, anket_sorusu, anket_yaniti), gosterge ve gosterge_olcumu, gunluk, takma_ad (öğrenci takma ad eşlemesi; silinebilir, KVKK için ayrı).
   - Sütun adları `snake_case` Türkçe ASCII, TypeScript alanları `camelCase` (Drizzle eşlemesi).
   - Kimlikler UUID (v7 uygulama tarafında `@akredit/cekirdek` `uuidv7` ile ya da SQL işleviyle).
2. **Göçler** (`src/gocler/`): drizzle-kit ile üretilen şema göçü + elle yazılmış SQL göçleri:
   - `vector` eklentisi (ve gerekirse `pgcrypto`),
   - roller: `akredit_sahip` (göçler), `akredit_uygulama` (NOBYPASSRLS, yalnız gereken DML yetkileri), 
   - her kiracı tablosunda `ENABLE` + `FORCE ROW LEVEL SECURITY` ve `kurum_id = current_setting('app.kurum_id', true)::uuid` ilkesi (okuma ve yazma; `WITH CHECK`),
   - yalnız-ekleme tetikleyicileri: kanit, kanit_parcasi, oneri, karar, cikti, rapor_bolumu_surumu, gunluk, olcme_sonucu, yetki_politikasi (UPDATE/DELETE → Türkçe hata),
   - `karar.oneri_id` tekil; karar `politika` dayanaklıysa politika kimliği zorunlu; `yetki_politikasi` kapsamında `yuksek` risk olamaz (CHECK), politikayla verilen karar yüksek riskli öneriye bağlanamaz (tetikleyici),
   - günlük özet zinciri: ekleme tetikleyicisi kurum başına danışma kilidiyle (advisory lock) sıralanır, `onceki_ozet` ve `ozet = sha256(onceki_ozet || kanonik)` hesaplar; `gunluk_zinciri_dogrula(kurum uuid)` ilk bozuk kaydın kimliğini ya da NULL döndürür. Önerilen yol: uygulama kaydı `@akredit/cekirdek` `kanonikJson` ile kanonik metne çevirir, bu metin `kanonik` sütununda saklanır, tetikleyici özeti bu metin üzerinden hesaplar. Böylece zincir hem SQL'de hem dışarıda (dışa aktarılan satırlardan) birebir doğrulanabilir. PostgreSQL `jsonb` metni kanonik değildir, özet girdisi olarak kullanılmaz.
3. **Bağlantı yardımcıları** (`src/baglanti.ts`): `postgres` sürücüsüyle üretim bağlantısı, PGlite ile test/geliştirme bağlantısı (vector eklentisiyle). `kiraciIslemi(db, kurumId, async (tx) => …)`: işlemi açar, `SET LOCAL app.kurum_id` ve `SET LOCAL ROLE akredit_uygulama` uygular.
4. **Günlük yardımcısı** (`src/gunluk.ts`): `gunlugeYaz(tx, { aktor, eylem, hedef, ayrinti })`, `zinciriDogrula(db, kurumId)`.
5. **Tohum verisi** (`src/tohum.ts`): kurgu "Örnek Üniversitesi", bir MYO, "Bilgisayar Programcılığı" önlisans programı, 6 ders, program ve ders çıktıları, bir dönem. Gerçek kişi adı yok.
6. **Belgeler:** `packages/vt/README.md` içinde tablo listesi, güvenlik modeli, yerel PostgreSQL ile göç çalıştırma (`docker compose` örneği; altyapı dosyası İP-08'de).

## Kabul ölçütleri (PGlite testleri)

- [x] Bütün göçler boş veritabanına hatasız uygulanır, ikinci kez uygulamak bir şey değiştirmez.
- [x] Kiracı yalıtımı: `akredit_uygulama` rolüyle A kurumu bağlamında B'nin satırları görünmez; B'ye ait `kurum_id` ile ekleme reddedilir; `app.kurum_id` ayarlanmadan hiçbir satır görünmez. Her kiracı tablosu için otomatik test (tablo listesi şemadan okunur, elle liste tutulmaz).
- [x] Yalnız-ekleme tabloları için UPDATE ve DELETE reddedilir (her tablo için).
- [x] Karar tekilliği, politika yüksek risk yasağı, politika dayanağında kimlik zorunluluğu testli.
- [x] Günlük zinciri: 100 kayıt sonrası doğrulama NULL; sahip rolüyle tetikleyici kapatılıp bir kayıt değiştirildiğinde doğrulama o kaydın kimliğini döndürür. Uygulama tarafı özet hesabı SQL'inkiyle aynı.
- [x] Vektör sütunu ve benzerlik sorgusu (`<=>`) PGlite'ta çalışır.
- [x] `pnpm verify` temiz.

## Notlar

- PGlite tek kullanıcılıdır ama `CREATE ROLE` ve `SET ROLE` desteklenir; satır güvenliğini sınamak için süper kullanıcı dışı role geçmek şarttır (süper kullanıcı RLS'i atlar).
- Better Auth tabloları İP-09'da eklenecek; `kisi` tablosunda `oturum_kullanici_id` sütunu şimdiden bulunsun (NULL olabilir).
- Öğrenci puanları yalnız takma adla tutulur. `takma_ad` tablosu (gerçek numara → takma ad) ayrı, şifreli alanlı ve silinebilir olmalı; değişmez tablolar ona yabancı anahtarla bağlanmaz.

## Günlük

- 2026-10-23: İP tanımlandı.
- 2026-10-27: Uygulandı (inceleme). 41 tablolu Drizzle şeması; göçler 0000 (vector, roller), 0001 (drizzle-kit), 0002 (yetkiler, şemadan döngüyle RLS, yalnız-ekleme tetikleyicileri, karar/politika kuralları, günlük özet zinciri ve `gunluk_zinciri_dogrula`). `kiraciIslemi`, `gunlugeYaz`, `zinciriDogrula`, `zinciriDisaridanDogrula`, `gocleriUygula`, `tohumla`. 39 PGlite testi; bütün kabul ölçütleri karşılandı. Kararlar: çerçeve tabloları kurumlar arası ortak (yalnız okuma); politika kararında karar veren = imzalayan; yeni bağımlılık `@electric-sql/pglite-pgvector@0.0.12`. Kalan: eşzamanlı günlük eklemesinin gerçek PostgreSQL'de sınanması (İP-08). Rapor: `docs/raporlar/IP-02.md`.
