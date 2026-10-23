# İP-01: Çekirdek alan mantığı

- **Durum:** hazır
- **Faz:** 1 (Temeller)
- **Bağımlılık:** yok
- **Sahip olduğu yollar:** `packages/cekirdek/**`, `docs/raporlar/IP-01.md`
- **Büyüklük:** orta

## Amaç

Akreddit'in (`apps/cli`) saf iş kurallarını TypeScript'e, davranışı birebir koruyarak taşımak ve öneri/karar/yetki politikası kurallarını eklemek. Diğer bütün paketler bu mantığı kullanacak; hata burada her yere yayılır.

## Hazır olanlar (değiştirirken dikkat)

- `src/turler.ts`, `src/bologna/turler.ts`, `src/olcme-turleri.ts`: paketler arası tür sözleşmesi. Paralel çalışan İP'ler bunlara dayanıyor. Alan **ekleyebilirsin**; var olan alanı silme ya da yeniden adlandırma.
- `src/atif.ts`, `src/turkce.ts`: atıf sözdizimi ve Türkçe normalleştirme (testli).

## Kapsam

1. **Bologna paket denetimi** (`src/bologna/denetim.ts`): `apps/cli/lib/bologna.mjs` içindeki `denetle` işlevinin taşınması. Girdi `BolognaVerisi`, çıktı `Bulgu[]` (`konu` = ders kodu, kural kodları ve Türkçe açıklamalar aynen). Seçenekler: `aktsSaat`, `guncellikAy`, `simdi` (zaman parametre olarak gelir, `Date.now()` çağrılmaz).
2. **Ders sayfası taslak denetimi** (`src/bologna/taslak.ts`): `apps/cli/lib/bologna-taslak.mjs` içindeki `taslakDenetle` (K1-K12 ve diğer kurallar). Girdi `BolognaTaslagi`. Çıktı `{ bulgular: Bulgu[], isToplam, hedef }`. Mesajlar aynen korunur.
3. **Rapor atıf denetimi** (`src/rapor/denetim.ts`): `apps/cli/bin/akreddit` içindeki `raporDenetle` mantığının saf hali. Girdi: Markdown metni + kanıt listesi (`{ ozet, ad }[]`) + isteğe bağlı parça erişimi (`(ozetOneki, capa) => string | null`). Denetimler:
   - her atıf tek bir kanıta çıkmalı (yok ya da birden çok eşleşme → hata),
   - alıntı varsa parçada geçmeli (`alintiGeciyorMu`) → geçmezse hata,
   - tanınmayan konum yazımı → uyarı,
   - sayı içeren ama atıf ya da `[EKSİK]` taşımayan paragraf → uyarı (yıl ve yıl aralıkları sayılmaz, mevcut kural),
   - başlık, tablo ve kod blokları paragraf sayılmaz.
   Çıktı: `{ bulgular, kullanilanKanitlar, eksikler }`.
4. **Matris** (`src/matris.ts`): onaylı ya da düzeltilmiş kararlardan ders çıktısı × program çıktısı tablosu (son karar geçerli), Markdown ve CSV üretimi (`apps/cli/bin/akreddit` `matrisOlustur` ile aynı biçim), ayrıca yapısal sonuç (`{ satirlar, sutunlar, hucreler, bekleyen }`).
5. **Öneri ve karar kuralları** (`src/oneri.ts`):
   - `oneriRiski(tur)`: `ONERI_RISKI` tablosundan.
   - `kararDogrula(oneri, karar)`: tek karar kuralı, `duzeltildi` için düzeltme zorunlu, `reddedildi` için düzeltme yok, karar veren zorunlu, politika dayanağında politika kimliği zorunlu.
   - `politikaUygulanirMi(oneri, politika, simdi)`: tür kapsamda mı, risk ≤ politika eşiği mi (yüksek asla), güven ≥ eşik mi (null güven → uygulanmaz), zaman aralığı geçerli mi, birim/program kapsamı tutuyor mu. Gerekçeli sonuç döndür: `{ uygulanir: boolean; neden: string }`.
   - `gecerliKarar(kararlar)`: bir hedef için en son geçerli kararı seçer.
   - Matris önerisi kuralı: 4 ve 5 puan için ölçme planı kanıtı yoksa inceleme notu (CLI'deki "4 ve 5 puan ölçme planından bir kanıtla desteklenmeli." davranışı).
6. **İş yükü ölçümü** (`src/olcum.ts`): CLI'deki pilot raporu hesabının saf hali: zaman damgalı adımlardan oturumlar (arada 2 saatten uzun boşluk yeni oturum), etkin süre, karar oranları (onay, düzeltme, ret yüzdeleri). Ek: kişi bazında "insan dakikası" (karar verme süreleri listesinden toplam ve ortanca).
7. ~~Kimlik üretimi~~ (`src/kimlik.ts`, hazır): `uuidv7(simdiMs, rastgele)`, `uuidv7Zamani`.
8. ~~Kanonik JSON ve özet~~ (`src/ozet.ts`, hazır): `kanonikJson` (RFC 8785 uyumlu), `ozetHesapla`, `degerOzeti`, `ozetMi`.

## Arayüz sözleşmesi

`src/index.ts` her şeyi adlı olarak dışa açar. Örnek kullanım:

```ts
import { bolognaDenetle, taslakDenetle, raporDenetle, matrisOlustur, politikaUygulanirMi, uuidv7, ozetHesapla } from "@akredit/cekirdek";
```

## Kabul ölçütleri

- [ ] `apps/cli/test/bologna.test.mjs` ve `apps/cli/test/bologna-taslak.test.mjs` içindeki denetim senaryoları Vitest'e taşınmış ve aynı sonucu veriyor (eşdeğerlik). CLI testleri de hâlâ geçiyor.
- [ ] `apps/cli/bilgi/bologna-taslak-ornek.json` taslak denetiminden hatasız geçiyor (CLI'de olduğu gibi).
- [ ] Rapor denetimi: geçerli, geçersiz, belirsiz (çok eşleşen) atıf; alıntı doğrulama; eksik işareti; sayı uyarısı; başlık/tablo atlama testleri.
- [ ] Politika kuralları: yüksek risk hiçbir koşulda uygulanmaz; sınır değerleri (güven eşiği eşit, bitiş zamanı) testli.
- [ ] `src/` altında `node:fs`, `node:net`, `fetch`, `Date.now()`, `Math.random()` kullanımı yok (bir test bunu dosyaları tarayarak doğrular).
- [ ] Satır kapsamı ≥ %90 (`vitest run --coverage`; gerekirse `@vitest/coverage-v8` bu pakete geliştirme bağımlılığı olarak eklenir).
- [ ] `pnpm verify` temiz.

## Kapsam dışı

HTML ayrıştırma (İP-05), veritabanı (İP-02), YZ çağrısı (İP-03).

## Günlük

- 2026-10-23: Tür sözleşmesi, atıf ayrıştırıcı ve Türkçe yardımcılar iskelette yazıldı.
