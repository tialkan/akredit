# Çerçeve kütüphanesi (`@akredit/cerceveler`)

## Yapı

- `sema.ts`: çerçeve, ölçüt ağacı, olgunluk düzeyi, kanıt gereksinimi, rapor şablonu şemaları. Ölçüt metni üç durumdan birindedir: `resmi` (belgeden, kaynak sayfası zorunlu, kaynak belgenin SHA-256 özeti zorunlu), `ic` (Akredit iç çerçevesi), `dogrulanmadi` (metin tam olarak `DOĞRULANMADI`).
- `ice-aktarma.ts`: sayfa metinlerinden ölçüt ağacı taslağı (`olcutTaslagiCikar`, `taslakCerceve`) ve uzman onayı (`uzmanOnayi`). Özeti olmayan belge içe aktarılmaz; doğrulanmamış metin varken onay verilmez.
- `kutuphane.ts`: sürümlü kütüphane. Bir `kod@surum` bir kez eklenir, dondurulur; rapor `bagla` ile sürüme bağlanır ve `cozumle` hep o sürümü döner.
- `esleme.ts`: çerçeveler arası eşleme önerisi ve kişi kararı. Yalnız onaylanmış öneri geçerlidir.
- `dogrulamaRozeti`: arayüz rozeti ("Uzman doğrulaması bekliyor", "Akredit iç çerçevesi (resmî değil)").

## Resmî metin durumu (2026-10-27)

Hiçbir resmî çerçeve resmî dosyadan doğrulanmadı: yokak.gov.tr ve mudek.org.tr bu ortamın ağ vekilinde engelli. Adresler `kaynaklar/resmi/kaynaklar.json` içinde.

| Çerçeve | Durum |
|---|---|
| `yokak-kurumsal@2020` | Kod ve başlıklar Alt Ölçütler Rehberi'nin web okumasından; metin ve rubrik `DOĞRULANMADI` |
| `yokak-kidr@taslak-2020` | Bölümler geçici olarak A–E'ye bağlı; adlar `DOĞRULANMADI` |
| `mudek` | Ağaç boş; hiçbir metin yazılmadı |
| `akredit-onlisans-ic@0.1`, `bologna-akts-ic@0.1` | İç çerçeve, resmî değil |

## Uzmanın yapacağı

1. Belgeyi indir, `kaynaklar/resmi/<kurum>-<belge>-<tarih>.pdf` olarak koy, `sha256sum` ile özetini `kaynaklar.json`a yaz.
2. Sayfa metinlerini çıkar (`@akredit/belge`), `taslakCerceve` ile içe aktar, uyarıları gözden geçir.
3. Metni belgeyle karşılaştır, `uzmanOnayi` ile adını ve zamanı yazarak onayla. Yeni sürüm yeni `surum` değeriyle eklenir.
