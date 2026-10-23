# İP-05: Bağlayıcılar I (Bologna ve OBS not aktarımı)

- **Durum:** hazır
- **Faz:** 1 (Temeller)
- **Bağımlılık:** yok (türler: `@akredit/cekirdek` `BolognaVerisi`, `OgrenciPuani`; `@akredit/belge` `TabloVerisi` türü)
- **Sahip olduğu yollar:** `packages/baglayicilar/**`, `docs/raporlar/IP-05.md`
- **Büyüklük:** orta

## Amaç

Kanıtı ve veriyi hocadan istemeden kaynağından almak. İlk iki kaynak: herkese açık Bologna Bilgi Paketi (Proliz OBS) ve OBS'den alınan soru bazlı not dökümleri.

## Kapsam

1. **Ortak arayüz** (`src/baglayici.ts`):
   ```ts
   interface DisBaglam { fetch: typeof fetch; bekle(ms: number): Promise<void>; simdi(): Date; ilerleme?(mesaj: string): void }
   interface Kaynak { adres: string; okunma: string /* ISO */; aciklama?: string }
   ```
   Ağ ve zaman her zaman bağlamdan gelir; testte sahte bağlam verilir.
2. **Bologna (Proliz)** (`src/bologna-proliz/`): `apps/cli/lib/bologna.mjs` içindeki `metin`, `tablolar`, `adresCoz`, program çıktıları, program matrisi, ders kimlikleri, `dersSayfasiCoz`, TYYÇ işaret sayısı ve `programiOku` işlevlerinin TypeScript'e **davranışı birebir koruyarak** taşınması. Çıktı `BolognaVerisi` (`@akredit/cekirdek`). İstekler sıralı ve aralıklı (varsayılan 350 ms), `User-Agent: Akredit (akreditasyon hazırlığı; salt okuma)`, zaman aşımı 20 sn. Denetim (`denetle`) bu pakette değil, `@akredit/cekirdek`'te (İP-01).
   - Testler: `apps/cli/test/bologna.test.mjs` içindeki ayrıştırma senaryolarının Vitest'e taşınması + `test/fixtures/bologna/` altında kurgu HTML sayfalarıyla (program çıktıları, matris, TYYÇ, ders listesi, iki ders sayfası, bir "Kayıt Yok" sayfası) sahte `fetch` üzerinden uçtan uca `programiOku`.
3. **OBS not aktarımı** (`src/not-aktarimi/`): `TabloVerisi` (Excel/CSV'nin ham hücreleri) → soru bazlı puanlar.
   - Başlık satırı tespiti (ilk 15 satırda): öğrenci numarası ("Öğrenci No", "Numara", "Öğr. No"), ad soyad ("Adı Soyadı", "Ad Soyad"), soru sütunları ("S1", "Soru 1", "1. Soru", "1", "1a"), toplam, harf notu, devamsızlık ("GR", "DZ", "Girmedi").
   - Soru tam puanları: başlıkta "S1 (10)" ya da "S1/10" gibi yazımdan, ayrı "Tam Puan" satırından ya da parametreyle.
   - Eşleme profili: tespit edilemeyen dökümler için kurum düzeyinde kaydedilebilir sütun eşlemesi (`NotAktarimProfili`, JSON).
   - Doğrulama: sayı olmayan hücre, tam puanı aşan puan, toplam tutarsızlığı, yinelenen öğrenci → `Bulgu` (Türkçe, satır ve hücre adresiyle).
   - Kişisel veri: öğrenci numarası ve adı çıktıya **hiç girmez**. Çağıran `takmaAd(ogrenciNo) => string` işlevi verir (HMAC çağıranın işi); ad sütunu okunmaz, yalnız yok sayılır.
   - Çıktı: `{ arac: { ad, tur, sorular: { no, tamPuan | null }[] }, puanlar: OgrenciPuani[], bulgular: Bulgu[], profil }`.
   - Testler: üç kurgu biçim (başlığı 3. satırda olan Excel benzeri tablo; noktalı virgüllü ve ondalık virgüllü CSV'den gelen metin hücreler; "Soru 1 (20)" başlıklı ve GR değerli tablo) ve hatalı girdiler.
4. **Belgeler:** her bağlayıcı için `README` bölümü: kaynak, hız sınırı, kullanım koşulları notu, bilinen sınırlar.

## Kabul ölçütleri

- [ ] Taşınan Bologna ayrıştırıcısı CLI testleriyle aynı sonuçları verir; CLI testleri hâlâ geçer.
- [ ] Uçtan uca `programiOku` testi ağsız, sahte `fetch` ile çalışır; istek sırası ve aralığı doğrulanır.
- [ ] Not aktarımı: üç biçim doğru okunur; hatalı hücreler bulgu olarak döner, süreç çökmez; çıktıda hiçbir öğrenci numarası ya da adı bulunmaz (test bunu metin taramasıyla doğrular).
- [ ] `pnpm verify` temiz.

## Kapsam dışı

AVESİS, YÖK Atlas, UBYS ve kimlik doğrulamalı OBS ekranları (İP-23). Bu kaynakların gerçek sayfa yapısı canlı erişimle doğrulanmadan ayrıştırıcı yazılmaz.

## Günlük

- 2026-10-23: İP tanımlandı.
