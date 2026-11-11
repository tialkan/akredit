# Paketler (`packages/**`)

Başlangıç: `060ac7e`. İnceleme sırasında taban: 15 paketin testi yeşil (1.299 test).

## Kapsam (dürüst döküm)

| Paket | Satır | Okuma |
|---|---|---|
| `olcme` | 1.320 | **Tam** (kaynak + testler), sınır durumları ayrıca betikle denendi |
| `cekirdek` | 3.887 | **Tam** (kaynak); testlerden `taslak`, `saflik`, `cli.ts` okundu, kalanı tarandı |
| `cerceveler` | 10.939 | Mantık dosyaları **tam** (`sema`, `kutuphane`, `esleme`, `ice-aktarma`, `veri`, `veri-resmi`, `yokak-anahtar`, `program-tablolari/{cerceveler,kaynaklar,donustur}`). Veri dosyaları (`veri-yokak`, `olcut-ham`, `ozgu-ham`, 7.350 satır) **okunmadı**, yalnız betikle yapısal denetlendi. `ozgu.ts`, `tablolar.ts` örneklem |
| `belge` | 3.006 | Kaynak **tam**, `docx-uret.ts` ve `turler.ts` hariç (taranmadı) |
| `baglayicilar` | 5.236 | `bologna-proliz/**`, `baglayici.ts`, `index.ts` **tam**. Geri kalanı (avesis, ebys, ubys, eposta, bulut, web-tarama, yokatlas, not-aktarimi) **okunmadı**, yalnız desen taraması |
| `gosterge` | 685 | `hesap.ts` tam, kalanı okunmadı |
| `vt` | 3.365 | `gunluk.ts` tam, kalanı okunmadı |
| `servis` | 26.483 | **Okunmadı.** Yalnız desen taraması (JSON.parse, `as unknown as`, skip/todo, ölü dışa aktarım, Biome) ve 5 noktada örnek okuma |
| `yz`, `depo`, `yetki`, `anket`, `ornek-veri`, `kiyaslama`, `surec` | 14.555 | **Okunmadı.** Yalnız desen taraması ve bağımlılık denetimi |

Bütün paketlerde betikle yapılanlar: bildirilen/kullanılan bağımlılık karşılaştırması, paketler arası derin içe aktarma,
`skip/todo/only`, `any`, `as unknown as`, `@ts-ignore`, `biome-ignore`, `TODO/FIXME`, `JSON.parse`, test dışında hiç
kullanılmayan dışa aktarımlar (`apps/` dahil depo genelinde).

## Düzeltildi

- `packages/cekirdek/src/bologna/taslak.ts:53-60` (canlı MCP, "guncel" kural seti) Türkçe karakter denetimi doğru yazılmış
  kelimeleri hata sayıyordu. İki ayrı neden: (1) düzenli ifadedeki `\b` ASCII dışı harfi kelime sınırı sayıyor; bu yüzden
  "devamını" içinde `devamı`, "notlarının" içinde `notlarını` eşleşiyordu; (2) listedeki `incelenmesi` zaten doğru yazılmış
  bir Türkçe kelime. "Ders notlarının incelenmesi" yazan hoca `Türkçe karakteri düşürülmüş kelimeler` hatası alıyordu.
  → "guncel" set için Türkçe harfleri de sayan sınırlarla ayrı ifade (`ASCII_TURKCE_GUNCEL`): `devami`, `notlarini` yalnız
  "i" ile aranır, `incelenmesi` listeden çıktı. "cli" seti CLI ile birebir kalsın diye **dokunulmadı** (eşdeğerlik testi
  bunu sınıyor). Doğrulama: `test/taslak.test.ts` yeni test (doğru yazım geçer, düşürülmüş yazım yakalanır, "cli" seti eski
  davranışta); `pnpm --filter @akredit/cekirdek test` 128/128, `pnpm --filter @akredit/acik-mcp test` 121/121.
- `packages/baglayicilar/src/bologna-proliz/ayristir.ts:21` (canlı MCP'ye gömülü) `metin()` geçersiz sayısal karakter
  başvurusunda (`&#99999999;`, `&#x110000;`) `String.fromCodePoint` yüzünden `RangeError` atıyor, bütün sayfa ayrıştırması
  düşüyordu. → Geçersiz kod noktası olduğu gibi bırakılıyor (`@akredit/belge` `varlikCoz` ile aynı davranış). Doğrulama:
  `test/bologna.test.ts` yeni iddia; 98/98.
- `packages/belge/src/parcala.ts:103` tek dolu satırlı tabloda çapa her zaman 1. satırı gösteriyordu; dolu satır 3.
  sıradaysa atıf boş satıra gidiyordu (ilke 1: kanıt yeri). → Satırın kendi sırası kullanılıyor. Doğrulama:
  `test/parcala.test.ts` yeni test; 57/57.
- `packages/belge/src/xml.ts` `yerelAd`: hiçbir yerden çağrılmıyordu, paket dışına da açık değil (ölü kod) → silindi.
- `packages/cekirdek/src/turkce.ts` `buyukHarf`: depoda (apps, packages, testler) hiç kullanılmıyordu → silindi.
- `packages/servis/src/bologna/index.ts:40` kullanılmayan `okunanDers` içe aktarımı (Biome `noUnusedImports`) → kaldırıldı;
  `export * from "./saf.ts"` aynı adı dışa açmaya devam ediyor. Doğrulama: `pnpm --filter @akredit/servis typecheck`.
- Yanlış yorumlar:
  - `packages/cekirdek/src/bologna/taslak.ts:1` "K1-K12" yazıyordu; K1 ve K11 kodda yok → "K2-K10, K12; K1 ve K11 tek
    taslaktan denetlenemez" diye düzeltildi.
  - `packages/cekirdek/src/karar/katman.ts:120` `zorunluKararDenetle` yorumu "kartta geçen süre bulunmalıdır" diyordu;
    işlev süreyi denetlemiyor → yorum koda uyduruldu.
  - `packages/belge/src/csv.ts:5` "BOM'lu ya da geçerli UTF-8 değilse Windows-1254" tersini söylüyordu → düzeltildi.

## Kurucu kararı gerekiyor

### Canlı üründe (MCP'ye gömülü kod)

- [önem: yüksek] `packages/olcme/src/ders.ts:157-164` `dersiOlc` girdi tutarlılığını denetlemiyor; aşağıdaki durumların
  hepsi **sessizce** sayıya dönüşüyor (betikle doğrulandı, `apps/acik-mcp/src/araclar.ts:386-436` şeması da yakalamıyor):
  1. Puan tam puandan büyük (10 üzerinden 15): ÇK başarısı %150, ders notu 150, histogramda hiçbir aralığa girmez.
  2. Aynı öğrenci/araç/soru için iki puan satırı: sonuncusu kazanır, uyarı yok.
  3. Bilinmeyen araç ya da soru numarasına yazılmış puan satırı: puan atılır, ama öğrenci sayılır ve ders notu 0 olur
     (ortalama, geçme oranı ve "az öğrenci" sayısı bozulur).
  4. Aynı ÇK kodu iki kez: ÇK iki kez raporlanır ve PÇ hesabına iki kez girer (`ckSayisi` 2).
  5. Negatif puan (MCP şeması `min(0)` ile kesiyor; `servis` yolu kesmiyor).
  Seçenekler: (a) `dersiOlc` bunlar için `hata`/`uyari` bulgusu üretsin, sayıya dokunmasın; (b) puan > tam puan ve yinelenen
  ÇK için hesap reddedilsin (`RangeError`); (c) yalnız MCP şemasında reddet. Öneri: (a) + MCP'de (b). Düzeltmedim çünkü
  aynı girdi için çıktı değişir; `HESAP_SURUMU` ("olcme-1.0.0") yükseltmesi gerekir, sürüm yükseltme kurucu kararı.
- [önem: orta] `packages/olcme/src/ders.ts:368` matris hücresi `{tur:"puan", puan:0}` gelirse `0/0 = NaN` döner
  (`deger: NaN`, `ckSayisi: 1`). Tip 1-5 dediği için yalnız doğrulanmamış girdide olur (MCP 0'ı `iliskisiz` yapıyor,
  güvenli). Öneri: `katkiToplami > 0` koşulu; yukarıdaki sürüm kararıyla birlikte.
- [önem: orta] K kuralları ile `apps/acik-mcp/src/bologna.ts` açıklamaları (çelişki listesi; acik-mcp yalnız okundu):
  1. **K1 ve K11** rehberde kural olarak anlatılıyor (`bologna.ts:77`, `:102`) ama `taslakDenetle` içinde yok; hoca "denetimden
     geçti" sonucunu bu iki kural için de geçerli sanabilir. Seçenek: rehberde "araç denetlemez, hoca bakar" notu ya da
     çok dersli denetimde gerçek karşılaştırma.
  2. **K10**: rehber "koordinatör ve dersi veren hocanın kendisidir" diyor; kod ad ve e-posta doluluğuna bakıyor. MCP bu
     bulguyu kişisel veri nedeniyle zaten atıyor (`bologna.ts:577`); yani K10 MCP'de hiç denetlenmiyor ama rehberde duruyor.
  3. **K4 "farkındalık"**: rehber yasaklar listesinde "farkındalık kazanır" ölçülemeyen fiil (`bologna.ts:139`); kod yalnız
     uyarı veriyor (`taslak.ts` `ZAYIF`), hata değil.
  4. **Hafta sayısı**: taslak denetimi ve MCP sayfa özeti 14-16 dışını işaretliyor (`taslak.ts:189`, `bologna.ts:804`);
     yayımlanmış sayfa denetimi `denetim.ts:115` yalnız 14'ten azı uyarıyor, 16'dan fazlasına bakmıyor.
  5. **Çıktı sayısı**: 4-10 kuralı yalnız taslakta; yayımlanmış sayfa denetiminde (`bolognaDenetle`) çıktı sayısı kuralı yok
     (yalnız "hiç çıktı yok").
  6. **"cli" seti hâlâ 8-12 çıktı ve tam AKTS×30** istiyor (`taslak.ts:162`, `:122`); "guncel" 4-10 ve 25-30. İki set bilerek
     ayrı, ama `apps/cli` kullanıcıları ile MCP kullanıcıları aynı taslak için farklı sonuç alıyor.
  K2, K3, K5, K6, K7, K8, K9, K12 sınırları kodla **tutarlı** (60-120/120-250/40-90 kelime, 4-10 ve 5-8, 25-30 saat,
  %100, 2-4 SKA, 1-5 katkı).
- [önem: orta] `packages/cekirdek/src/bologna/taslak.ts:110,122,133,157` tam eşitlik karşılaştırmaları (`!== 100`,
  `isToplam !== hedef`) kayan nokta toplamıyla yapılıyor. Ondalıklı süre (14 × 1,1 = 15,400000000000002) kurum değeri
  verildiğinde yanlış K8 hatası üretir ve iletide "15.400000000000002 saat" yazar. Yüzde toplamlarında denenen örneklerde
  sorun çıkmadı. Seçenek: 1e-9 tolerans ve iletide yuvarlama. Davranış değişikliği; "cli" eşdeğerliği de etkilenir.
- [önem: orta] `packages/baglayicilar/src/bologna-proliz/ayristir.ts:11` yalnız altı adlandırılmış HTML varlığı çözülüyor.
  OBS `&ccedil; &ouml; &uuml; &Ccedil; &Ouml; &Uuml;` gönderirse metinde öyle kalır; ayrıca `a.toLowerCase()` büyük/küçük
  ayrımını siliyor. Canlı Proliz'in bunları gönderip göndermediği DOĞRULANMADI (kayıtlı örneklerde yalnız sayısal varlık
  var). Öneri: altı Türkçe harfi büyük/küçük duyarlı ekle. CLI ile "birebir" notu olduğu için dokunmadım.
- [önem: orta] `packages/baglayicilar/src/bologna-proliz/oku.ts:63` matriste olup ders listesinde kimliği bulunamayan
  dersler sessizce atlanıyor; denetimde ne "okunamadı" ne "boş" görünüyor. Öneri: `{ kod, hata: "Ders sayfası bağlantısı
  bulunamadı" }` olarak eklensin (ilke 1: eksik, yapılmış gibi görünmemeli).
- [önem: düşük] `packages/cekirdek/src/bologna/denetim.ts:81` iş yükü toplamı sayfadaki "toplam" sütunundan alınıyor;
  sayı × süre ile toplam sütunu çelişirse yakalanmıyor.
- [önem: düşük] `packages/cekirdek/src/rapor/denetim.ts:39` paragrafları `\n{2,}` ile, `dil.ts:230` `\n\s*\n` ile bölüyor.
  Boşluk içeren boş satırda iki denetimin paragraf numaraları kayar.
- [önem: düşük] `packages/cekirdek/src/ozet.ts:5` `node:crypto` kullanıyor. IO değil ama saflık testinin yasak listesinde
  yok ve paketi tarayıcıda çalışmaz kılar. `olcme` ve `cerceveler` için saflık testi hiç yok (yalnız `cekirdek/test/saflik.test.ts`).
  Öneri: aynı testi iki pakete de koy. Bulunan ihlal: **yok** (`Date.now`, `Math.random`, parametresiz `new Date()`, `fetch`,
  `node:fs` üç pakette de geçmiyor; `Date.parse` ve `Date.UTC` saf).
- [önem: düşük] `packages/olcme` ile `packages/cekirdek/src/olcum.ts:78` aynı adlı iki `ortanca`: biri boş girdide `null`,
  diğeri `0` döner. İkisini birlikte içe aktaran yanlışını seçebilir.

### Çerçeve verisi (`cerceveler`): yalnız yapısal, metne dokunulmadı

Betikle 13 çerçeve denetlendi: yinelenen ölçüt kodu **yok**, boş başlık **yok**, kırık üst-alt ilişkisi **yok**; depodaki
11 resmî belgenin SHA-256 özeti kaynak kaydıyla **uyuşuyor**. Hepsi `dogrulandi: false`.

- [önem: orta] Özeti ve dosyası olmayan üç kayıt: `yokak-kurumsal@2020`, `yokak-kidr@taslak-2020`, `mudek@DOĞRULANMADI`
  (`veri.ts:146-213`; `sha256: null`, `dosya: null`, 85 ölçütün hepsi `dogrulanmadi`). Güncel sürümleri resmî belgeyle var
  (`yokak-kurumsal@3.3`, `yokak-kidr@3.2.1`, `mudek-lisans@3.1`). `MUDEK_TASLAK` boş ağaç ve sürümü "DOĞRULANMADI".
  Seçenek: (a) geçmiş rapor bağlantısı için kalsın ama MCP listelerinden gizlensin; (b) `MUDEK_TASLAK` kaldırılsın
  (hiç ölçütü yok, yerine geçen var). Öneri: (b) + (a).
- [önem: orta] `yokak-kurumsal@2020` içinde `B.1.6` ve `B.3.2` aynı başlığı taşıyor ("Ölçme ve değerlendirme"); `B.1.2`
  başlığının sonu okunamamış ve başlığın içine "DOĞRULANMADI" yazılmış (`veri.ts:37,41,47`). Belge elde olmadığı için hangisinin
  doğru olduğu DOĞRULANMADI; düzeltmedim.
- [önem: düşük] `yokak-kurumsal@3.3`: sürüm 3.3 ama üst ölçütler "Ölçütler 3.1" belgesinden; `yayimTarihi: null`. İki alt
  ölçütte (`A.4.1`, `B.2.2`) olgunluk düzeyi metinleri ayrıştırılamadı (`YOKAK_ANAHTAR_3_3_UYARILAR`), bu ikisinde
  `olgunlukTanimlari` yok.
- [önem: düşük] `epdad-rpd`: sürüm alanı dosya adındaki tarih kodu ("241216"), `yayimTarihi: null`, ÖDR şablonu yok
  (`cerceveler.ts:157`). `epdad-ogretmen@1.1`: 39 yaprak ölçütte metin ile başlık aynı (belge tek satır veriyor olabilir;
  DOĞRULANMADI).
- [önem: düşük] Ağaç kurucu üç kez yazılmış (`veri.ts:116`, `veri-resmi.ts:37`, `program-tablolari/cerceveler.ts:24`);
  "1-5 DOĞRULANMADI rubrik" iki kez (`veri.ts:144`, `veri-resmi.ts:85`).

### Test ve CI

- [önem: orta] `packages/baglayicilar/src/bologna-proliz/yazma.test.ts:173` Playwright uçtan uca bloğu. CI'da
  (`.github/workflows/ci.yml:60`) `dogrula` işi `pnpm --filter @akredit/web exec playwright install --with-deps chromium`
  ile tarayıcıyı kuruyor; test `playwright-core`'un varsayılan önbelleğinden buluyor. Bu makinede tarayıcı kurulu
  (`~/Library/Caches/ms-playwright/chromium-1248`), test **yeşil** (98/98); tarayıcısı olmayan makinede `beforeAll` düşer
  ve dört test kırmızı olur. İki kırılganlık: (1) `web`'in `@playwright/test`'i ile `baglayicilar`'ın `playwright-core`'u
  ayrı bildirilmiş (ikisi de `^1.64.1`); sürümler ayrışırsa CI'da tarayıcı revizyonu tutmaz; (2) `chromiumYolu()` yalnız
  `chrome-linux64/chrome` yolunu biliyor, macOS'ta hep varsayılana düşüyor.
  "Tarayıcı yoksa atla" test zayıflatma sayılır mı? Görüşüm: **koşulsuz** `skip` evet (CLAUDE.md "atla bırakma"). Koşullu
  atlama ancak CI'da atlanamıyorsa zayıflatma olmaz. Seçenekler:
  (a) Olduğu gibi bırak; yerelde `playwright install chromium` şartını `docs/gelistirme.md`'ye yaz.
  (b) `describe.skipIf(!tarayiciVar && !process.env.CI)`: yerelde anlamlı atlanır, CI'da tarayıcı yoksa yine kırmızı.
  (c) Uçtan uca bloğu ayrı dosyaya (`yazma.e2e.test.ts`) ve ayrı betiğe (`test:e2e`) al; `pnpm test` tarayıcısız yeşil,
  CI ikisini de koşar.
  Öneri: (c); en az (b). Ayrıca bu kod askıdaki barındırmaya ait (`VARSAYILAN_PROLIZ_SECICILERI` DOĞRULANMADI).
- [önem: düşük] `packages/servis/src/toplanti/toplanti.test.ts:9` paket testi `apps/isci/src/surec/motor.ts` dosyasını
  göreli yoldan içe aktarıyor (paket → uygulama, ters yön). Seçenek: motoru `@akredit/surec`'e taşı ya da testi `apps/isci`'ye al.
- [önem: düşük] `packages/cekirdek/src/rapor/dil.test.ts` `src/` altında; paketin öteki testleri `test/` altında.
- Bırakılmış `skip`/`todo`/`only`: **yok** (15 paket). `@ts-ignore`/`@ts-expect-error`: **yok**. `any`: yalnız iki testte
  CLI modülü için, `biome-ignore` gerekçeli.

### Paket sınırları ve ölü kod

- [önem: düşük] `packages/cerceveler/package.json` `@akredit/cekirdek` bağımlılığı bildirilmiş ama `src` ve `test` içinde hiç
  içe aktarılmıyor (kullanılmayan bağımlılık; lockfile'a dokunmadım). Öteki 14 pakette bildirilen ve kullanılan bağımlılıklar
  uyuşuyor. Döngüsel bağımlılık **yok**. `exports` ile kullanım uyumlu (kullanılan alt yollar: `anket/temel`, `anket/vt`,
  `baglayicilar/bologna-ayristir`, `ornek-veri/yukle`; hepsi bildirilmiş).
- [önem: orta] `packages/kiyaslama` hiçbir uygulama ya da paket tarafından içe aktarılmıyor ve hiçbir `package.json`'da
  bağımlılık değil (yetim paket, 542 satır, 15 test). ADR-0008 kapsamında mı (askıda) yoksa terk mi, karar gerek.
- [önem: düşük] Yalnız testlerin kullandığı modüller (uygulamalar ve öteki paketler içe aktarmıyor):
  - `cekirdek`: `matrisOlustur`, `matrisHedefi`, `matrisOnerisiIncelemesi` (`matris.ts` bütünüyle), `uuidv7Zamani`, `ozetMi`,
    `oneriRiski`, `sureliOnayUygunMu`, `topluOnayaUygunMu`, `yuksekOnemliSayisi`. Hiç kullanılmayan türler: `BirimTuru`,
    `ProgramDuzeyi` (`turler.ts:33-34`).
  - `cerceveler`: `esleme.ts` (bütünüyle), `ice-aktarma.ts` (`olcutTaslagiCikar`, `taslakCerceve`, `uzmanOnayi`),
    `kutuphane.ts` (`CerceveKutuphanesi`), `tabloTanimiYukle`.
  - `baglayicilar`: `avesisPaneliOku`, `eypOku`, `evrakListesiOku`, `zipYaz`, `profilOku`, `obsDisaAktarimiOku`;
    hiç kullanılmayan sabitler `EBYS_KOSULU`, `OBS_KOSULU`.
  - `yz`: `ajanCalistir`, `aracTanimla`, `saglayiciSec`, `olcen`, `kasetYaz/kasetOku/oynatan`; hiç kullanılmayan `VERI_TURLERI`.
  - `vt`: `kriptografikSil` ve ailesi (4 işlev), `zinciriDisaridanDogrula`; hiç kullanılmayan `olgunlukDuzeyi` tablosu.
  - `servis`: `bellekTekrarDeposu` ve `ROL_ADLARI` hiç kullanılmıyor; 11 işlev yalnız testte.
  Çoğu askıdaki barındırmanın parçası; ADR-0008 gereği **silmedim**. `cekirdek/matris.ts` ve `cerceveler/esleme.ts` canlı
  pakete gömülüyor ama kullanılmıyor: MCP paketinden çıkarılabilir.
- [önem: düşük] Yinelenen yardımcılar: `const json = (v) => JSON.parse(JSON.stringify(v))` dokuz dosyada (`servis` 7,
  `anket`, `ornek-veri`); imzalı jeton üret/çöz çifti iki kez (`servis/src/onay/eposta.ts:40`, `belge-istegi/index.ts:60`);
  sütun harfi iki kez (`belge/src/parcala.ts:83`, `xlsx.ts:58`); kod birimi sıralaması üç kez (`olcme/istatistik.ts:4`,
  `cekirdek/matris.ts:43`, `cekirdek/karar/kart.ts:34`).

### Askıdaki kod (örneklemden)

- [önem: orta] `packages/servis/src/bologna/index.ts:439` insanın düzelttiği taslak `JSON.parse(metin) as BolognaTaslagi`
  ile alınıyor; tek denetim `Array.isArray(t.ciktilar)`. Dış veri zod şemasından geçmiyor (CLAUDE.md "Doğrulama").
- [önem: orta] `packages/belge/src/odf.ts:100-105` ODS'de `number-columns-repeated` ve `number-rows-repeated` ayrı ayrı
  10.000 ile sınırlı; ikisi birlikte dolu bir satırda 10⁸ hücreye kadar bellek ayrılabilir (küçük dosya, büyük bellek).
  Öneri: toplam hücre sınırı. `belge` MCP'ye gömülmüyor (`GOMULU` haritasında yok), panel ve işçi kullanıyor.
- [önem: düşük] `packages/belge/src/csv.ts:95` ayraç `;` iken ondalık virgül varsayılıyor; "85.5" metin kalır, "12.345"
  12345 olur. Noktalı ondalıkla dışa aktarılmış not tablosunda notlar sayı sayılmaz. Öneri: sütun bazında karar ya da uyarı.
- [önem: düşük] `packages/vt`, `servis`, `ornek-veri`: ham SQL sonuçları 30'dan fazla yerde `as unknown as SorguSonucu<…>`
  ile tiplendiriliyor (drizzle `execute` tipi yüzünden). Satır biçimi derleme anında denetlenmiyor.
- [önem: düşük] Biome `packages` üzerinde hata vermiyor; kalan 12 uyarı biçimsel (testlerde `!`, `useLiteralKeys`,
  `useOptionalChain`, `useTemplate`). Dokunmadım.

## Başka alan

- `apps/cli/lib/bologna-taslak.mjs:9` aynı Türkçe karakter ifadesi: "devamını", "notlarının" ve doğru yazılmış
  "incelenmesi" kelimelerini hata sayıyor. `cekirdek` "cli" seti eşdeğerlik için aynı hatayı taşıyor; CLI düzelirse
  `cekirdek/src/bologna/taslak.ts` `ASCII_TURKCE` ve yeni test birlikte güncellenmeli.
- `apps/acik-mcp/src/bologna.ts:77,102,139,244` K1, K11, K10 ve "farkındalık" açıklamaları kodla örtüşmüyor (yukarıdaki liste).
- `apps/acik-mcp/src/araclar.ts:386-436` `ck_pc_hesapla` şeması puan ≤ tam puan, yinelenen ÇK kodu, yinelenen puan satırı ve
  bilinmeyen araç/soru denetimi yapmıyor.
- `apps/acik-mcp/src/not-tablosu.ts:27` kendi tablo ayrıştırıcısını taşıyor; `packages/belge/src/csv.ts` ile aynı işi yapıyor
  (`belge` MCP'ye gömülmediği için). Görev tanımındaki "belge MCP'ye gömülüyor" bilgisi `scripts/derle.ts` `GOMULU` haritasıyla
  uyuşmuyor: gömülenler `cekirdek`, `cerceveler`, `olcme`, `yz` ve `baglayicilar/bologna-ayristir`.
- `.github/workflows/ci.yml:60` tarayıcı kurulumu `web` paketinin Playwright sürümüyle yapılıyor, testi `baglayicilar`
  koşuyor (sürüm ayrışması riski).

## Bakıldı, sorun yok

- `olcme`: boş liste, tek öğrenci, sabit puan, tam puanı 0 soru, ağırlık toplamı 0, girmeyen öğrenci, yuvarlama (yok: ham
  değer döner), yüzdelik (R tür 7), örneklem varyansı (n − 1), Cronbach alfa, %27 alt-üst grup, madde-toplam korelasyonu.
  Sıfıra bölme yolları `null` ile korunuyor (geçerli tipte girdide). Testler elle doğrulama yorumlu.
- `olcme/program.ts`: eşit, AKTS ve katkı ağırlığı; AKTS yoksa anlaşılır hata; ağırlık toplamı 0 ise `null`.
- `cekirdek`: `oneri.ts` (politika aralığı, yüksek risk devredilemez), `kimlik.ts` (UUID v7), `ozet.ts` (kanonik JSON),
  `atif.ts`, `karar/kart.ts`, `karar/katman.ts`, `rapor/*`. Zaman her yerde parametre.
- `cerceveler/sema.ts`: yinelenen kod, resmî metinde özet ve sayfa zorunluluğu, doğrulanmamış metnin `DOĞRULANMADI`
  olması şemayla zorlanıyor. `donustur.ts`: eksik veriyle toplam yazılmıyor.
- `belge`: ZIP sınırları ve CRC denetimi, DTD/varlık reddi, sayısal varlık koruması, PDF zaman aşımı.
- `baglayicilar/bologna-proliz/yazma.ts`: giriş bilgisi rapora ve hata iletisine girmiyor, kuru çalıştırma yazmıyor.
- `vt/gunluk.ts`: zincir hesabı ve dışarıdan doğrulama.
- `gosterge/hesap.ts`: payda 0 ve çelişen kaynak `EKSIK`.

## Doğrulama

- `pnpm --filter './packages/*' test` (taban, değişiklikten önce): 15 paket yeşil, 1.299 test.
- Değişiklikten sonra `pnpm --filter './packages/*' test`: 15 paket yeşil, 1.301 test (cekirdek 128, olcme 32, cerceveler 93,
  belge 57, baglayicilar 98, yz 163, vt 80, servis 488, anket 27, ornek-veri 21, yetki 43, gosterge 15, kiyaslama 15,
  depo 11, surec 30). Atlanan test yok.
- `pnpm --filter './packages/*' typecheck`: 15 paket temiz.
- `pnpm --filter @akredit/acik-mcp test`: 121/121 (cekirdek değişikliği MCP'yi bozmadı). `pnpm --filter @akredit/acik-mcp typecheck`
  ve `pnpm --filter @akredit/web typecheck`: temiz (`buyukHarf` kaldırılması kimseyi etkilemedi).
- `npx biome check packages`: hata yok, 12 uyarı ve 6 bilgi (hepsi önceden vardı; 13'ten 12'ye indi).
