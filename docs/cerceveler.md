# Çerçeve kütüphanesi (`@akredit/cerceveler`)

## Yapı

- `sema.ts`: çerçeve, ölçüt ağacı, olgunluk düzeyi, kanıt gereksinimi, rapor şablonu şemaları. Ölçüt metni üç durumdan birindedir: `resmi` (belgeden, kaynak sayfası zorunlu, kaynak belgenin SHA-256 özeti zorunlu), `ic` (Akredit iç çerçevesi), `dogrulanmadi` (metin tam olarak `DOĞRULANMADI`).
- `ice-aktarma.ts`: sayfa metinlerinden ölçüt ağacı taslağı (`olcutTaslagiCikar`, `taslakCerceve`) ve uzman onayı (`uzmanOnayi`). Özeti olmayan belge içe aktarılmaz; doğrulanmamış metin varken onay verilmez.
- `kutuphane.ts`: sürümlü kütüphane. Bir `kod@surum` bir kez eklenir, dondurulur; rapor `bagla` ile sürüme bağlanır ve `cozumle` hep o sürümü döner.
- `esleme.ts`: çerçeveler arası eşleme önerisi ve kişi kararı. Yalnız onaylanmış öneri geçerlidir.
- `dogrulamaRozeti`: arayüz rozeti ("Uzman doğrulaması bekliyor", "Akredit iç çerçevesi (resmî değil)").

## Resmî metin durumu (2026-10-27)

YÖKAK belgeleri kullanıcı tarafından tarayıcıyla indirildi ve `kaynaklar/resmi/yokak/` altına kondu (özetler `kaynaklar/resmi/kaynaklar.json`). Metin `@akredit/belge` ile çıkarıldı, `scripts/yokak-uret.ts` ile `src/veri-yokak.ts` üretildi; `src/veri-resmi.ts` çerçeveleri kurar. `test/resmi-metin.test.ts` her resmî başlık, metin, olgunluk düzeyi, örnek kanıt ve rapor bölüm başlığının belgenin kaynak sayfasında (ya da devamında) birebir geçtiğini ve dosya özetlerini denetler.

| Çerçeve | Kaynak | Durum |
|---|---|---|
| `yokak-kurumsal@3.3` | Değerlendirme Programları Kılavuzu 3.3 (2026) Ek-1 + Değerlendirme Ölçütleri 3.1 | 4 başlık, 14 ölçüt, 46 alt ölçüt: başlık ve metin resmî. 44 alt ölçütte 1–5 düzey metni ve örnek kanıtlar resmî. A.4.1 ve B.2.2'nin düzey metinleri `DOĞRULANMADI` (ayrıştırılamadı). Genel düzey adları (Şekil 1, görsel) `DOĞRULANMADI`. |
| `yokak-kidr@3.2.1` | KİDR Hazırlama Kılavuzu 3.2.1 (24/01/2025) Ek-1; ölçütler yukarıdaki belgelerden | 10 şablon bölüm başlığı resmî (8. sayfa); ölçüt ağacı `yokak-kurumsal@3.3` ile aynı. |
| `yokak-kurumsal@2020` | Alt Ölçütler Rehberi (web okuması) | Eski raporlar için korunur; başlık ve metin `DOĞRULANMADI`. |
| `yokak-kidr@taslak-2020` | — | Eski; bölüm adları `DOĞRULANMADI`. |
| `mudek` | — | Ağaç boş; belge yok. |
| `akredit-onlisans-ic@0.1`, `bologna-akts-ic@0.1` | — | İç çerçeve, resmî değil. |

Hiçbir çerçeve `dogrulandi: true` değil: metnin belgeyle örtüştüğü testle gösterildi, ama onay uzmanın (insan) kararıdır.

Başlık kuralı (bulgu D2-2): ölçütte `baslikDurumu` zorunludur; `resmi` başlık kaynak sayfası ve belge özeti ister. Ölçüt ana kaynaktan başka bir belgeden alındıysa `kaynakDosya` ile anılır ve o belge `ekKaynaklar` içinde olmalıdır.

## Uzmanın yapacağı

1. Belgeyi indir, `kaynaklar/resmi/<kurum>/<kurum>-<belge>-<tarih>.pdf` olarak koy, `sha256sum` ile özetini `kaynaklar.json`a yaz.
2. Sayfa metinlerini çıkar (`@akredit/belge`), `taslakCerceve` (ya da YÖKAK için `scripts/yokak-uret.ts`) ile içe aktar, uyarıları gözden geçir.
3. Metni belgeyle karşılaştır, `uzmanOnayi` ile adını ve zamanı yazarak onayla. Yeni sürüm yeni `surum` değeriyle eklenir.
