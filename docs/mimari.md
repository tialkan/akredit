# Akredit mimarisi

Bu belge sistemin bileşenlerini, veri modelini ve temel akışları tanımlar. İş paketleri bu sözleşmeye göre yazılır. Değişiklik gerekiyorsa önce `docs/adr/` altına bir karar kaydı eklenir, sonra bu belge güncellenir.

## 1. Bileşenler

```
                         akredit.org (kurum kiracıları: aybu, ornek, ...)
┌──────────────────────────────────────────────────────────────────────────────────┐
│ apps/web  (Next.js App Router)                                                  │
│  ├─ Tanıtım sitesi: /, /nasil-calisir, /guvenlik, /kvkk, /acik-kaynak            │
│  ├─ Panel: /panel (onay kutusu, kanıtlar, programlar, dersler, raporlar, süreçler)│
│  ├─ Değerlendirici portalı: /degerlendirici (salt okunur, süreli)                 │
│  └─ API: /api/v1 (OpenAPI; CLI eşitleme, MCP sunucusu, bağlayıcılar)             │
├──────────────────────────────────────────────────────────────────────────────────┤
│ servis katmanı (yetki denetimi + doğrulama + iş kuralları)                       │
│  @akredit/cekirdek  @akredit/olcme  @akredit/cerceveler  (saf mantık, IO yok)     │
│  @akredit/yz        @akredit/belge  @akredit/baglayicilar                         │
├──────────────────────────────────────────────────────────────────────────────────┤
│ apps/isci (pg-boss): kanıt hattı · OCR · gömme · sınıflama · bağlayıcı zamanlama  │
│                      · rapor üretimi · süreç zamanlayıcı · e-posta · hatırlatma   │
├──────────────────────────────────────────────────────────────────────────────────┤
│ PostgreSQL 17 + pgvector (satır güvenliği, yalnız-ekleme tabloları, özet zinciri) │
│ S3 uyumlu nesne deposu (içerik adresli, nesne kilidi)  ·  e-posta (SMTP)          │
│ YZ sağlayıcısı: EVREN | kurumun vLLM sunucusu | Ollama | izinliyse yurt dışı API   │
└──────────────────────────────────────────────────────────────────────────────────┘
apps/cli (Akreddit): çevrim dışı tek kullanıcı kipi + Claude Code eklentisi; API ile eşitlenir.
```

Dağıtım iki biçimdedir ve aynı kodu kullanır:

- **akredit.org (barındırılan):** çok kiracılı. Veri Türkiye'deki bir veri merkezinde tutulur.
- **Kurum içi kurulum:** tek kiracılı. Docker Compose ya da Kubernetes (Helm). İnternete kapalı ağda kurumun kendi modeliyle çalışabilir.

## 2. Kavramlar ve sözlük

| Terim | Anlam |
|---|---|
| Kurum | Kiracı. Bir üniversite ya da yükseköğretim kurumu |
| Birim | Fakülte, MYO, enstitü, yüksekokul, bölüm, idari birim |
| Program | Diploma programı (önlisans, lisans, yüksek lisans, doktora) |
| Ders, ders açılışı | Müfredattaki ders ve bir dönemdeki açılışı |
| Çerçeve | YÖKAK KAP, MÜDEK, FEDEK gibi bir değerlendirme ölçütleri seti |
| Ölçüt | Çerçevedeki madde (A.1.1, Ölçüt 3 gibi), ağaç yapısında |
| Kanıt | Değiştirilemez belge ya da veri anlık görüntüsü, SHA-256 özetiyle |
| Parça | Kanıtın sayfa, bölüm ya da satır çapalı metin parçası (arama ve atıf birimi) |
| Çıktı | Program çıktısı (PÇ), ders öğrenme çıktısı (ÇK/Ö), program eğitim amacı (PEA) |
| Öneri | Sistemin ya da YZ'nin ürettiği, karar bekleyen her şey |
| Karar | Bir öneri için verilen tek ve değişmez karar: onay, düzeltme, ret |
| Yetki politikası | Belirli düşük riskli önerilerin adı geçen kişi adına otomatik karara bağlanması |
| Süreç | Tanımlı kalite döngüsü (dönemlik ders dosyası, yıllık KİDR, anket döngüsü, PUKÖ eylemi) |
| Eylem | PUKÖ döngüsündeki iyileştirme adımı: plan, uygulama, kontrol, önlem |

## 3. Veri modeli

Bütün tablolar `kurum_id` taşır ve satır güvenliğiyle (RLS) kiracıya kapatılır. Kimlikler UUID v7'dir (zamana göre sıralı). Zamanlar `timestamptz`. Ayrıntılı şema `packages/vt` içindedir; aşağıdaki liste kavramsal sözleşmedir.

### 3.1 Kurum yapısı

- `kurum`: ad, kısa ad, alan adı, ayarlar (YZ sağlayıcısı, yurt dışı YZ izni, AKTS saat aralığı, eşik değerleri).
- `birim`: üst birim, tür (`fakulte`, `myo`, `enstitu`, `yuksekokul`, `bolum`, `anabilim_dali`, `idari`), ad, kod.
- `program`: birim, ad, düzey (`onlisans`, `lisans`, `yuksek_lisans`, `doktora`), dil, öğretim türü, Bologna adresi, YÖK Atlas kodu.
- `ders`: program, kod, ad, AKTS, T+U+L, yarıyıl, zorunlu/seçmeli, dil.
- `donem`, `ders_acilisi` (ders + dönem + sorumlu öğretim elemanları).
- `kisi`: ad soyad, unvan, e-posta, AVESİS adresi, oturum kimliği.
- `rol_atamasi`: kişi, rol, kapsam (`kurum` | `birim` | `program` | `ders`), geçerlilik aralığı.

Roller: `kurum_yoneticisi`, `kalite_komisyonu_baskani`, `kalite_komisyonu_uyesi`, `birim_kalite_sorumlusu`, `program_sorumlusu`, `ogretim_elemani`, `degerlendirici` (dış, salt okunur, süreli), `gozlemci`.

### 3.2 Çerçeveler

- `cerceve`: kod (`yokak-kap-<sürüm>`, `mudek-<sürüm>`), ad, sürüm, resmî kaynak adresi, kaynak dosya özeti, `dogrulandi` ve doğrulayan uzman.
- `olcut`: çerçeve, üst ölçüt, kod, başlık, resmî açıklama, sıra.
- `olgunluk_duzeyi`: ölçüt, düzey (1-5), tanım (rubrik).
- `kanit_gereksinimi`: ölçüt (ve gerekirse düzey), beklenen kanıt türü, otomatik kaynak (hangi bağlayıcı ya da süreç üretir).

### 3.3 Kanıt

- `kanit`: içerik özeti (SHA-256, kurum içinde tekil), dosya adı, MIME, boyut, depo anahtarı, kaynak türü (`yukleme`, `baglayici`, `eposta`, `uretilen`), kaynak ayrıntısı (adres, bağlayıcı, okunma zamanı), belge tarihi, kapsam (birim, program, ders, dönem), yükleyen, kişisel veri durumu. **Yalnız eklenir.**
- `kanit_isleme`: kanıt hattının durumu (metin çıkarıldı, OCR gerekli, gömme tamam, hata). Kanıt satırını değiştirmeden ilerler.
- `kanit_parcasi`: kanıt, sıra, çapa (`{sayfa, bolum, satir, hucre}`), metin, gömme (pgvector), dil.
- `kanit_olcut_baglantisi`: kanıt ya da parça ↔ ölçüt bağı. Yalnız onaylı bir karardan doğar.

### 3.4 Çıktılar ve ölçme

- `cikti`: tür (`pea`, `program`, `ders`, `tyyc`), sahibi (program ya da ders), kod, metin, sürüm, önceki sürüm, kaynak kanıt. Metin değişmez, değişiklik yeni sürümdür.
- `katki`: ders çıktısı × program çıktısı hücresi. Değer `1-5` | `iliskisiz` | `yetersiz_kanit`. Yalnız karardan doğar.
- `olcme_araci`: ders açılışı, tür (ara sınav, yarıyıl sonu, ödev, proje, kısa sınav, uygulama), ağırlık, tarih.
- `soru`: ölçme aracı, numara, tam puan, ÇK eşlemesi (`[{cikti_id, agirlik}]`).
- `ogrenci_puani`: ölçme aracı, soru, öğrenci takma adı (kurum anahtarıyla HMAC), puan. Kimlik açık tutulmaz.
- `olcme_sonucu`: hesap sürümü, girdi özeti, sonuç (JSON). Yeniden üretilebilir anlık görüntüdür.

### 3.5 Öneri, karar, politika

- `oneri`: tür (`kanit_etiketi`, `matris_katkisi`, `soru_cikti_eslemesi`, `bologna_taslagi`, `rapor_bolumu`, `olgunluk_duzeyi`, `eylem`, `toplanti_tutanagi`, `yazma_plani`, ...), hedef, içerik, gerekçe, kanıt atıfları (`[{kanit_id, parca_id, alinti}]`), güven (0-1), üretici (`yz` + model + istem özeti | `kural` + kural sürümü | `kisi`), risk düzeyi (`dusuk`, `orta`, `yuksek`). **Yalnız eklenir.**
- `karar`: öneri (tekil), sonuç (`onaylandi`, `duzeltildi`, `reddedildi`), düzeltme, karar veren kişi, dayanak (`dogrudan` | `politika`), politika, gerekçe, zaman. **Yalnız eklenir.**
- `yetki_politikasi`: kapsam (öneri türleri, en yüksek risk, en düşük güven, birim/program), imzalayan kişi, geçerlilik. İptal yeni kayıtla yapılır. `yuksek` risk hiçbir politikayla devredilemez.

### 3.6 Rapor, süreç, eylem

- `rapor`: tür (`kidr`, `bidr`, `odr`, `ders_dosyasi`, `olcme_raporu`, `anket_raporu`, `eylem_plani`, `ziyaret_paketi`), çerçeve, kapsam, dönem.
- `rapor_bolumu_surumu`: rapor, ölçüt, metin (atıflı Markdown), atıflar, denetim sonucu, üreten. Her sürüm yeni kayıttır; geçerli sürüm karardan belirlenir.
- `surec_tanimi`, `surec_ornegi`, `gorev`, `son_tarih`, `bildirim`.
- `eylem`: kaynak (bulgu, rapor, toplantı kararı, dış değerlendirme), tanım, sorumlu, hedef tarih, PUKÖ aşaması, kanıtlar.
- `toplanti`, `anket`, `anket_sorusu`, `anket_yaniti` (anonim), `gosterge`, `gosterge_olcumu`.

### 3.7 Günlük

`gunluk`: kurum, zaman, aktör (`kisi` | `sistem` | `yz` + kimlik), eylem, hedef türü ve kimliği, ayrıntı, `onceki_ozet`, `ozet`. Her kurumun günlüğü bir özet zinciridir: `ozet = SHA-256(onceki_ozet || kanonik JSON(kayıt))`. Zincir doğrulama işlevi her kaydı yeniden hesaplar. Günlük kökü her gün dışarıya (e-posta, depo, zaman damgası hizmeti) sabitlenebilir.

## 4. Güvenlik modeli

- **Kiracı yalıtımı:** Uygulama veritabanına `BYPASSRLS` yetkisi olmayan bir rolle bağlanır. Her işlem `SET LOCAL app.kurum_id` ile başlar. Tablolarda `FORCE ROW LEVEL SECURITY` açıktır. Testler, başka kiracının satırının görünmediğini ve yazılamadığını kanıtlar.
- **Değişmezlik:** `kanit`, `oneri`, `karar`, `gunluk`, `cikti`, `rapor_bolumu_surumu` için UPDATE ve DELETE tetikleyiciyle engellenir. Nesne deposunda içerik adresli anahtar ve mümkünse nesne kilidi kullanılır.
- **Yetki:** Rol ve kapsam tabanlı. Her servis işlevi yetkiyi kendisi denetler. Arayüzde gizlemek yetki sayılmaz.
- **YZ sınırları:** Model yalnız tanımlı araçları çağırır. Araçların yetki düzeyi vardır: `okuma`, `oneri`, `onay_gerektirir`, `yasak`. Model hiçbir zaman karar kaydı oluşturamaz.
- **Kişisel veri:** Öğrenci kimliği takma ada çevrilmeden saklanmaz. Dış sağlayıcıya giden metin maskelenir. Kurum ayarı izin vermiyorsa yurt dışı sağlayıcı hiç çağrılmaz.
- **Kurum sistemlerine yazma:** Onaylı ve süresi dolmamış bir yazma planı olmadan yazılmaz. Parola alanına yazılmaz. "Gönder", "Onayla", "Sun" gibi son düğmelere basılmaz.

## 5. Yapay zekâ katmanı

### 5.1 Görevler

| Görev | Girdi | Çıktı (öneri türü) | Risk |
|---|---|---|---|
| Kanıt sınıflama ve ölçüte bağlama | Kanıt parçaları, çerçeve | `kanit_etiketi` | düşük |
| Bilgi çıkarma (tutanaktan karar, tarih, katılımcı) | Kanıt | `toplanti_tutanagi`, `eylem` | düşük |
| Soru-ÇK eşlemesi | Sınav belgesi, ÇK listesi | `soru_cikti_eslemesi` | orta |
| Matris katkı önerisi | ÇK, PÇ, ölçme planı | `matris_katkisi` | orta |
| Bologna ders sayfası taslağı | Ders bilgisi, program | `bologna_taslagi` | orta |
| Rapor bölümü taslağı | Onaylı kanıtlar, ölçüt | `rapor_bolumu` | orta |
| Olgunluk düzeyi önerisi | Ölçüt, rubrik, kanıtlar | `olgunluk_duzeyi` | yüksek |
| Açık uçlu anket yanıtı özeti | Anonim yanıtlar | `anket_ozeti` | düşük |
| Eksik analizi ve eylem planı | Kapsama haritası | `eylem` | orta |
| Değerlendirici soru-cevap | Kanıt deposu | Atıflı yanıt (kayıtlı) | düşük |

### 5.2 Güvenceler

1. **Atıf doğrulama:** Üretilen her olgusal cümle `[K:<özet ilk 8> s.<sayfa> "<kısa alıntı>"]` biçiminde atıf taşır. Doğrulayıcı kanıtın varlığını, çapanın geçerliliğini ve alıntının parçada geçtiğini (Türkçe normalleştirmeyle) denetler. Geçmeyen cümle `EKSİK` olur.
2. **Sayı denetimi:** Metindeki her sayı ya atıf yapılan parçada ya da araca verilen hesap sonucunda bulunmalıdır.
3. **Yapılandırılmış çıktı:** Model çıktıları zod şemasıyla doğrulanır. Geçersiz çıktı en fazla iki kez onarılır, sonra görev "insan gerekli" olarak düşer.
4. **İstem enjeksiyonu kalkanı:** Belge metni sınırlayıcılar içinde, "veri" etiketiyle verilir. Araç çağrısına benzeyen içerik etkisizleştirilir. Belgede talimat görülürse günlüğe yazılır.
5. **KVKK maskeleme:** T.C. kimlik numarası (sağlama hanesiyle), öğrenci numarası (kurum desenleri), e-posta, telefon, IBAN ve kurumun kişi listesindeki adlar yer tutucuyla değiştirilir. Eşleme kurum içinde kalır.
6. **Ölçüm:** Her çağrının modeli, süresi, belirteç sayısı ve maliyeti kurum bazında kaydedilir.
7. **Değerlendirme:** Her görev için altın örnek seti vardır. Atıf geçerliliği %100'ün altına düşen sürüm yayımlanmaz.

### 5.3 Sağlayıcılar

OpenAI uyumlu `/chat/completions` (EVREN, vLLM, SGLang, Ollama, OpenAI, OpenRouter) ve Anthropic Messages API. Gömme için kurum içi model (ör. bge-m3) ya da sağlayıcının gömme ucu. Sağlayıcı ve model kurum ayarıdır.

## 6. Ana akışlar

### 6.1 Kanıt hattı

```
yükleme | e-posta | bağlayıcı | sistemin ürettiği belge
  → özet (SHA-256), tekilleştirme → nesne deposu (değişmez)
  → metin çıkarma (PDF, Word, Excel, PowerPoint, HTML) ya da OCR kuyruğu
  → kişisel veri taraması → parçalama (çapalı) → gömme
  → sınıflama + ölçüt önerileri (YZ) → onay kutusu
  → karar (kişi ya da yetki politikası) → kanıt-ölçüt bağı → kapsama haritası
```

### 6.2 Ders dosyası ve ölçme (dönem sonu, hocadan ek iş istemeden)

```
OBS not dökümü (soru bazlı) + sınav belgeleri + Bologna ÇK'ları
  → soru-ÇK eşlemesi önerisi (YZ, ilk dönem; sonra önceki dönemden taşınır) → onay
  → @akredit/olcme: ÇK ve PÇ sağlanma, not istatistikleri, madde analizi
  → ders dosyası (DOCX/PDF): izlence, sınavlar, cevap anahtarı, örnek kâğıt seçimi,
    sonuçlar, iyileştirme önerisi taslağı → hocaya tek onay
  → program düzeyi PÇ raporu → ÖDR ve KİDR kanıtı
```

### 6.3 Rapor üretimi (KİDR, BİDR, ÖDR)

```
çerçeve ölçüt ağacı + kapsama haritası (ölçüt × onaylı kanıt)
  → eksik analizi → eksikler için görev/eylem/süreç başlatma
  → bölüm taslakları (YZ, yalnız onaylı kanıtlarla, atıflı) → atıf ve sayı denetimi
  → olgunluk düzeyi önerisi (rubrik + kanıt) → komisyon kararı (yüksek risk, devredilemez)
  → resmî biçimde dışa aktarım (DOCX/PDF) ve kurum sistemine aktarım planı
  → son gönderim: insan
```

### 6.4 Onay kutusu

Öneriler risk düzeyine göre gruplanır. Düşük riskli öneriler toplu onaylanabilir ya da yetki politikasıyla otomatik karara bağlanır. Orta riskli öneriler satır satır gösterilir, toplu onay mümkündür. Yüksek riskli öneriler tek tek, kanıtları açık gösterilerek onaylanır ve devredilemez. Günlük ya da haftalık e-posta özetindeki imzalı bağlantılar düşük ve orta riskli kararları giriş yapmadan verdirebilir (süreli, tek kullanımlık, kişiye özel).

## 7. Teknoloji seçimleri

| Konu | Seçim | Gerekçe |
|---|---|---|
| Dil | TypeScript 6 (strict), Node.js 22.18+ | Tip güvenliği; Node tip ayıklamayla derlemesiz çalışır |
| Çalışma alanı | pnpm | Hızlı, katı bağımlılık çözümü |
| Biçim ve denetim | Biome | Tek araç, hızlı |
| Test | Vitest, Playwright, PGlite | TS'yi doğrudan çalıştırır; gerçek PostgreSQL davranışı |
| Web | Next.js 16 App Router, React 19, Tailwind 4 | Sunucu bileşenleri, tek dağıtım birimi |
| Veritabanı | PostgreSQL 17 + pgvector, Drizzle ORM | RLS, tetikleyici, vektör arama tek yerde |
| İş kuyruğu | pg-boss | Ek altyapı istemez (PostgreSQL üstünde) |
| Kimlik | Better Auth (e-posta bağlantısı, OIDC, SAML; YETKİM federasyonu hedefi) | Çok kiracı ve SSO eklentileri |
| Nesne deposu | S3 uyumlu (MinIO ya da yurt içi sağlayıcı) | Taşınabilir, nesne kilidi |
| Belge | unpdf, fflate, exceljs, docx | Ek sistem programı gerektirmez |
| Gözlem | OpenTelemetry, yapılandırılmış günlük (pino) | Sağlayıcıdan bağımsız |

Ayrıntılı gerekçeler: `docs/adr/`.
