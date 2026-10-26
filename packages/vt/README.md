# @akredit/vt

PostgreSQL şeması (Drizzle), çok kiracılı satır güvenliği, değiştirilemez günlük ve göçler (İP-02).

## Tablolar

| Alan | Tablolar |
|---|---|
| Kurum yapısı | `kurum`, `birim`, `program`, `ders`, `donem`, `ders_acilisi`, `kisi` (`oturum_kullanici_id` İP-09 için), `rol_atamasi` |
| Çerçeveler (kurumlar arası ortak, uygulama yalnız okur) | `cerceve`, `olcut`, `olgunluk_duzeyi`, `kanit_gereksinimi` |
| Kanıt | `kanit`\*, `kanit_isleme`, `kanit_parcasi`\* (`gomme vector(1024)`), `kanit_olcut_baglantisi` |
| Çıktı ve ölçme | `cikti`\*, `katki`, `olcme_araci`, `soru`, `ogrenci_puani` (yalnız takma ad), `olcme_sonucu`\* |
| Öneri ve karar | `oneri`\*, `karar`\*, `yetki_politikasi`\* |
| Rapor ve süreç | `rapor`, `rapor_bolumu_surumu`\*, `surec_tanimi`, `surec_ornegi`, `gorev`, `son_tarih`, `bildirim`, `eylem`, `toplanti`, `anket`, `anket_sorusu`, `anket_yaniti` (anonim), `gosterge`, `gosterge_olcumu` |
| Günlük ve KVKK | `gunluk`\* (özet zinciri), `takma_ad` (şifreli numara, silinebilir) |

\* Yalnız eklenir: UPDATE, DELETE ve TRUNCATE tetikleyiciyle reddedilir (sahip rolünde de).

## Güvenlik modeli

- **Roller.** `akredit_sahip` göçleri çalıştırır ve tabloların sahibidir. `akredit_uygulama` NOBYPASSRLS'tir; yalnız-ekleme tablolarında yalnız SELECT/INSERT, öteki kiracı tablolarında SELECT/INSERT/UPDATE/DELETE, çerçevelerde yalnız SELECT, `kurum`da SELECT/UPDATE yetkisi vardır.
- **Kiracı yalıtımı.** `kurum_id` taşıyan her tabloda `ENABLE` + `FORCE ROW LEVEL SECURITY` ve `kurum_id = etkin_kurum()` ilkesi (USING ve WITH CHECK). `etkin_kurum()` = `nullif(current_setting('app.kurum_id', true), '')::uuid`; ayarlanmamışsa hiçbir satır görünmez. İlke, göçte `kurum_id` sütunu olan bütün tablolara döngüyle uygulanır; testler de listeyi şemadan okur.
- **Kiracı işlemi.** `kiraciIslemi(db, kurumId, async (tx) => …)` işlemi açar, `set_config('app.kurum_id', …, true)` ve `SET LOCAL ROLE akredit_uygulama` uygular.
- **Karar kuralları.** `karar.oneri_id` tekil; `dayanak = 'politika'` ise `politika_id` zorunlu (CHECK + tetikleyici); `yetki_politikasi.en_yuksek_risk <> 'yuksek'` (CHECK); politika kararı yüksek riskli öneriye, kapsam dışı öneriye (tür, risk, güven), geçerlilik dışı zamana ya da imzalayandan başka karar verene bağlanamaz (tetikleyici).
- **Günlük zinciri.** Uygulama kaydı `@akredit/cekirdek` `kanonikJson` ile `kanonik` metne çevirir. Ekleme tetikleyicisi kurum başına danışma kilidi alır, sütunların kanonik metinle uyuştuğunu denetler, `sira`, `onceki_ozet` ve `ozet = sha256(UTF-8(coalesce(onceki_ozet,'') || kanonik))` alanlarını doldurur. `gunluk_zinciri_dogrula(kurum)` ilk bozuk kaydın kimliğini ya da NULL döndürür; `zinciriDisaridanDogrula` aynı hesabı dışa aktarılmış satırlarda yapar.

## Göçler

`src/gocler/`: `0000_eklentiler.sql` (elle: vector, roller), `0001_sema.sql` (drizzle-kit), `0002_guvenlik.sql` (elle: yetkiler, RLS, tetikleyiciler, zincir). Şema değişince `pnpm --filter @akredit/vt goc:uret` yeni göç üretir; elle göç için `npx drizzle-kit generate --custom --name=<ad>`. Uygulanmış göç dosyası değiştirilmez (çalıştırıcı özet uyuşmazlığında durur).

```ts
import { gocleriUygula, postgresBaglantisi, tohumla } from "@akredit/vt";
const { db, kapat } = postgresBaglantisi(process.env.VT_ADRESI!);
await gocleriUygula(db); // akredit_sahip olarak
await tohumla(db);       // isteğe bağlı: kurgu "Örnek Üniversitesi"
await kapat();
```

Yerel PostgreSQL (altyapı dosyası İP-08'de):

```yaml
services:
  vt:
    image: pgvector/pgvector:pg17
    environment: { POSTGRES_USER: akredit_sahip, POSTGRES_PASSWORD: yerel, POSTGRES_DB: akredit }
    ports: ["5432:5432"]
```

Testler PGlite (PostgreSQL 18, pgvector) ile ağsız çalışır: `pnpm --filter @akredit/vt test`.
