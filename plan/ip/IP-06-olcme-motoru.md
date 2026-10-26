# İP-06: Ölçme motoru (ÇK ve PÇ sağlanma düzeyi)

- **Durum:** inceleme
- **Faz:** 1 (Temeller)
- **Bağımlılık:** yok (girdi türü `@akredit/cekirdek` `DersOlcmeVerisi`)
- **Sahip olduğu yollar:** `packages/olcme/**`, `docs/olcme-yontemi.md`, `docs/raporlar/IP-06.md`
- **Büyüklük:** orta

## Amaç

Program akreditasyonunda öğretim elemanının en çok zamanını alan işlerden biri, ders öğrenme çıktılarının (ÇK) ve program çıktılarının (PÇ) sağlanma düzeyini sınav verisinden elle hesaplamaktır. Bu paket bunu deterministik, belgelenmiş ve yeniden üretilebilir biçimde yapar. Sayılar raporlara yalnız buradan girer; YZ sayı üretmez.

## Kapsam

1. **ÇK başarısı (soru bazlı)**: her öğrenci ve her ÇK için
   `başarı(ö, ÇK) = Σ puan(ö, s) × w(s, ÇK) / Σ tamPuan(s) × w(s, ÇK)` (ÇK'ya eşlenen sorular üzerinden; `w` eşleme ağırlığı; isteğe bağlı olarak ölçme aracının ders notundaki ağırlığıyla çarpılır: `aracAgirligiKullan`).
   Girmeyen öğrencinin (`puan: null`) o araçtaki soruları paydaya katılmaz. Ders düzeyinde: ortalama, ortanca, standart sapma ve **eşiği geçen öğrenci oranı** (varsayılan eşik %60, parametre).
2. **Araç düzeyi yedek yöntem**: soru verisi yoksa (yalnız araç toplamı varsa) araç-ÇK eşlemesiyle aynı hesap. Sonuçta hangi yöntemin kullanıldığı yazılır.
3. **PÇ sağlanması (ders içi)**: ÇK × PÇ katkı matrisi (1-5, `iliskisiz` hücreler hariç) ile
   `PÇ_ders = Σ_ÇK başarı(ÇK) × katkı(ÇK, PÇ) / Σ_ÇK katkı(ÇK, PÇ)`.
4. **PÇ sağlanması (program)**: derslerin PÇ değerlerinin ağırlıklı ortalaması; ağırlık seçenekleri: eşit, AKTS, katkı toplamı. Hangi derslerden geldiği ve kapsamı (kaç ders, kaç öğrenci) sonuçla birlikte verilir.
5. **Not istatistikleri**: araç ağırlıklarıyla ders başarı notu (100 üzerinden), ortalama, ortanca, standart sapma, en küçük/büyük, çeyrekler, histogram (aralıklar parametre), harf notu dağılımı (harf tablosu parametre; varsayılan tablo "örnek" diye adlandırılır, hiçbir kurumun resmî tablosu diye sunulmaz), geçme oranı.
6. **Madde analizi**: güçlük indeksi `p = ort(puan)/tamPuan`, ayırt edicilik (üst ve alt %27 grupları: `D = (ort_üst − ort_alt)/tamPuan`), düzeltilmiş madde-toplam korelasyonu, araç için Cronbach alfa (iki puanlı maddelerde KR-20'ye eşdeğer).
7. **Bulgular** (`Bulgu[]`, kural kodlarıyla): ölçülmemiş ÇK, tek soruyla ölçülen ÇK, eşik altında ÇK, hiçbir ÇK'ya eşlenmemiş soru, araç ağırlıkları toplamı ≠ 100, çok kolay (p > 0,90) ya da çok zor (p < 0,20) soru, negatif ayırt edicilik, düşük güvenirlik (α < 0,60), az öğrenci (n < 10: istatistikler "yorumlanmamalı" uyarısı). Bulgular yargı değil işarettir.
8. **Örnek kâğıt seçimi**: ders dosyası için en yüksek, ortanca ve en düşük başarı notlu öğrencilerin takma adları (eşitlikte takma ad sırası, deterministik).
9. **Yeniden üretilebilirlik**: sonuç `hesapSurumu` (sabit) ve `girdiOzeti` (`@akredit/cekirdek` `degerOzeti`) taşır. Aynı girdi her zaman aynı çıktıyı verir.
10. **Yöntem belgesi** (`docs/olcme-yontemi.md`): formüller, parametreler, küçük bir elle hesaplanmış örnek, yorumlama sınırları ("matris tasarım uyumunu gösterir, başarı ölçmez" ayrımı), kurumların farklı yöntemleri için parametreler.

## Arayüz

```ts
import { dersiOlc, programPcHesapla } from "@akredit/olcme";
const sonuc = dersiOlc(veri /* DersOlcmeVerisi */, { esik: 60, aracAgirligiKullan: true, matris /* ÇK→PÇ→1-5 */ });
// sonuc: { yontem, ckBasarilari, pcSaglanmasi, notIstatistikleri, maddeAnalizi, bulgular, ornekKagitlar, hesapSurumu, girdiOzeti }
```

## Kabul ölçütleri

- [x] 5 öğrenci, 2 araç, 6 soru, 3 ÇK, 4 PÇ'lik elle hesaplanmış örnek: bütün değerler testte, hesap adımları yorumda.
- [x] Uç durumlar: girmeyen öğrenci, tam puanı 0 olan soru (bulgu + paydadan çıkar), eşlemesiz soru, tek öğrenci, herkesin aynı puanı (sd 0, alfa tanımsız → null + bulgu), ağırlıklar toplamı ≠ 100.
- [x] Sonuçlar girdi sırasından bağımsız (öğrenci ve soru sırası karıştırılınca aynı `girdiOzeti` ve aynı sonuç).
- [x] Satır ve dal kapsamı ≥ %95.
- [x] `pnpm verify` temiz.

## Kapsam dışı

Not dökümünün okunması (İP-05), ders dosyası belgesinin üretimi (İP-16), soru-ÇK eşleme önerisi (İP-03 görevi, İP-16).

## Günlük

- 2026-10-23: İP tanımlandı.
- 2026-10-27: Uygulandı. `dersiOlc` (soru/araç/karma yöntem, ÇK başarısı, ders içi PÇ, not istatistikleri, madde analizi, 13 kurallı bulgular, örnek kâğıtlar, `hesapSurumu` + `girdiOzeti`), `programPcHesapla` (eşit/AKTS/katkı), `docs/olcme-yontemi.md`. 30 test; kapsam satır %100, dal %97,75 (eşik %95 `vitest.config.ts` ile zorunlu). Kararlar: sd örneklem (n−1); araç ağırlığı varsayılan kapalı; girilmeyen araç ders notunda 0; ağırlıklar ≠ 100 ise not 100'e oranlanır; sorusuz araç `"*"` numaralı sanal soru; varsayılan harf tablosu ve geçme notu 60 "örnek". Yeni geliştirme bağımlılığı: `@vitest/coverage-v8` (MIT, kapsam ölçümü için). Rapor: `docs/raporlar/IP-06.md`.
