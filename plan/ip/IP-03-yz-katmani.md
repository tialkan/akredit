# İP-03: Yapay zekâ katmanı ve güvenceler

- **Durum:** hazır
- **Faz:** 1 (Temeller)
- **Bağımlılık:** yok (atıf ayrıştırıcı `@akredit/cekirdek` içinde hazır)
- **Sahip olduğu yollar:** `packages/yz/**`, `docs/raporlar/IP-03.md`
- **Büyüklük:** büyük

## Amaç

Sağlayıcıdan bağımsız, güvenceleri kodla uygulayan, test edilebilir bir YZ katmanı. Ürünün "uydurmaz" sözü bu paketin doğruluğuna dayanır.

## Kapsam

1. **Sağlayıcı arayüzü** (`src/saglayici.ts`):
   ```ts
   interface Saglayici {
     ad: string;            // "evren", "vllm", "anthropic", ...
     model: string;
     yurtIci: boolean;      // veri yurt içinde mi kalıyor (kurum ayarıyla karşılaştırılır)
     sohbet(istek: SohbetIstegi): Promise<SohbetYaniti>;           // araç çağrısı destekli
     gomme?(metinler: string[]): Promise<number[][]>;
   }
   ```
   Mesaj ve araç biçimi sağlayıcıdan bağımsız iç biçimdir; bağdaştırıcılar çevirir.
2. **Bağdaştırıcılar** (`src/saglayicilar/`): `openai-uyumlu.ts` (EVREN, vLLM, SGLang, Ollama, OpenAI, OpenRouter; hazır ayarlar `apps/cli/lib/model.mjs` `HAZIRLAR` ile aynı adresler), `anthropic.ts` (Messages API, `fetch` ile), `sahte.ts` (senaryolu yanıtlar), `kayit.ts` (kayıt/oynatma: gerçek yanıtları JSON kasete yazar, testte oynatır). `fetch` enjekte edilir. 429 ve 5xx'te `retry-after`'a uyan üstel bekleme, zaman aşımı, Türkçe hata iletileri (401/403 anahtar, 429 yoğunluk, ağ hatası).
3. **Yapılandırılmış çıktı** (`src/yapilandirilmis.ts`): zod şeması → JSON şema (`z.toJSONSchema`), sağlayıcı destekliyorsa `response_format`/araç yoluyla, desteklemiyorsa istem + ayrıştırma. Geçersiz çıktıda hata iletisiyle en çok 2 onarım denemesi; sonra `InsanGerekliHatasi`.
4. **Ajan döngüsü** (`src/ajan.ts`): `apps/cli/lib/ajan.mjs` düzeninin genelleştirilmiş hali. Araç kaydı: her araç `{ ad, aciklama, sema (zod), yetki: "okuma" | "oneri" | "onay_gerektirir" | "yasak", calistir }`. `onay_gerektirir` araçlar döngüde çalıştırılmaz, "bekleyen onay" olarak döner. Tur sınırı, araç çıktısı kısaltma, iptal sinyali, her adım için olay geri çağrısı (günlük için).
5. **Güvenceler** (`src/guvence/`):
   - `atif.ts`: üretilen metni cümlelere böler (Türkçe kısaltmalara dikkat: "Prof.", "Dr.", "vb.", "s.", "No."), her olgusal cümlenin atıf taşıyıp taşımadığını, atıfların kanıta çıkıp çıkmadığını ve alıntının parçada geçtiğini (`@akredit/cekirdek` `atiflariAyristir`, `alintiGeciyorMu`) denetler. Geçmeyen cümleyi `[EKSİK: …]` ile değiştirebilen `atifsizlariIsaretle` işlevi.
   - `sayi.ts`: metindeki sayıları (Türkçe ondalık virgül, yüzde, tarih) çıkarır; atıf yapılan parçalarda ya da verilen hesap sonuçlarında geçmeyenleri raporlar.
   - `kvkk.ts`: T.C. kimlik no (sağlama algoritmasıyla), telefon (+90, 0 5xx), e-posta, IBAN (TR, mod-97), kurum öğrenci numarası desenleri (parametre), verilen ad listesindeki kişi adları (Türkçe büyük/küçük harf duyarsız) → `[KİŞİ-1]`, `[TCKN-1]` gibi yer tutucular; geri çevirme eşlemesi. `maskele(metin, secenek) → { metin, eslemeler }`, `maskeKaldir`.
   - `istem-kalkani.ts`: güvenilmeyen metni sınırlayıcı etiketler içine alır, sınırlayıcı taklidini etkisizleştirir, talimat kalıplarını (ör. "önceki talimatları yok say", "ignore previous instructions", araç çağrısı JSON'u) tespit edip işaretler.
   - `politika.ts`: kurum ayarına göre sağlayıcı seçimi: yurt dışı sağlayıcı izni yoksa çağrıyı reddeder; izin varsa maskelemeyi zorunlu kılar.
6. **Ölçüm** (`src/olcum.ts`): her çağrı için model, süre, giriş/çıkış belirteci, tahmini maliyet (yapılandırılabilir fiyat tablosu), kurum kimliği. Olay olarak döner, kaydetmek çağıranın işidir.
7. **İlk görevler** (`src/gorevler/`): her görev = istem şablonu + zod çıktı şeması + kural denetimi.
   - `kanit-siniflama`: belge parçaları + ölçüt listesi → belge türü (tutanak, izlence, anket raporu, ...) ve en çok 5 ölçüt önerisi, her biri gerekçe + atıf + güven.
   - `toplanti-bilgisi`: tutanak metni → tarih, toplantı türü, katılımcı sayısı (adlar maskeli), kararlar listesi (her biri atıflı), eylem adayları.
   Gerçek Türkçe örnek belgeler yerine kurgu örnekler kullanılır.
8. **Değerlendirme düzeneği** (`src/degerlendirme/`): görev + altın örnekler + puanlayıcılar (şema geçerliliği, atıf geçerliliği, beklenen alanların eşleşmesi). `pnpm --filter @akredit/yz degerlendir --gorev kanit-siniflama --saglayici sahte` betiği. Sonuç tablosu ve eşik (atıf geçerliliği %100).

## Kabul ölçütleri

- [ ] Hiçbir test gerçek ağa çıkmaz; HTTP bağdaştırıcıları sahte `fetch` ile istek biçimi, yeniden deneme ve hata eşlemesi açısından sınanır.
- [ ] Atıf güvencesi: geçerli, var olmayan kanıt, alıntısı uyuşmayan, atıfsız olgusal cümle ve kısaltma içeren cümle örnekleri.
- [ ] KVKK: geçerli ve geçersiz T.C. kimlik numaraları (sağlama), IBAN sağlaması, Türkçe ad eşleşmesi ("İLKNUR", "ılgın"), geri çevirme kaybı olmaması.
- [ ] Ajan döngüsü: `onay_gerektirir` araç çalıştırılmaz; `yasak` araç çağrısı reddedilir; tur sınırı aşılınca durur.
- [ ] Yapılandırılmış çıktı: geçersiz JSON → onarım → başarı; iki onarımdan sonra `InsanGerekliHatasi`.
- [ ] Yurt dışı sağlayıcı, izin yokken çağrılamaz (test).
- [ ] `src/guvence` satır kapsamı ≥ %90; `pnpm verify` temiz.

## Kapsam dışı

Veritabanına yazma (çağıran yapar), gerçek EVREN/Anthropic çağrısıyla değerlendirme (anahtar gerektirir, ayrı ve isteğe bağlı).

## Günlük

- 2026-10-23: İP tanımlandı.
