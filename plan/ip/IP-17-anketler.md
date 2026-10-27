# İP-17: Anket modülü

- **Durum:** inceleme
- **Faz:** 3
- **Bağımlılık:** İP-02, İP-03, İP-09, İP-14
- **Sahip olduğu yollar:** `packages/anket/**`, `apps/web/src/app/anket/**`, `apps/web/src/app/panel/anketler/**`, `docs/raporlar/IP-17.md`
- **Büyüklük:** orta

## Amaç

Paydaş geri bildirimini (öğrenci, mezun, işveren, iç paydaş, AKTS iş yükü) sistemin kendisinin toplaması ve analiz etmesi.

## Kapsam

1. Anket tasarımı (hazır şablonlar: ders değerlendirme, AKTS iş yükü, mezun izleme, işveren, danışma kurulu, iç paydaş memnuniyeti).
2. Anonim bağlantı ve QR, yanıt kotası, tekrar yanıt engeli (kimliksiz belirteç), KVKK aydınlatma metni, erişilebilir form.
3. Süreç motoruyla gönderim ve hatırlatma; yanıt oranı izleme.
4. Analiz: deterministik istatistikler; açık uçlu yanıtların atıflı özeti (YZ, yanıt kimliklerine atıf); rapor ve kanıt üretimi.
5. Google Forms / LimeSurvey CSV içe aktarma.

## Kabul ölçütleri

- [x] Anonimlik: yanıt ile kişi arasında bağ saklanmaz (test). `packages/anket/test/vt.test.ts` › "ANONİMLİK: yanıt ile kişi arasında bağ saklanmaz" ve uçtan uca testteki tüm-tablolar taraması.
- [x] AKTS iş yükü anketi sonucu Bologna iş yükü denetimine girdi olur. `saf.test.ts` › "anket sonucu Bologna iş yükü denetimine girer" (`bolognaDenetle` üzerinden).
- [x] `pnpm verify` temiz.

## Günlük

- 2026-10-23: İP tanımlandı. Başlamadan önce kapsamı güncel mimariye göre ayrıntılandır.
- 2026-10-27: Uygulandı (dal `ip/17-anketler`). `@akredit/anket` paketi: 6 hazır şablon, zod tanım/yanıt doğrulama, deterministik istatistik (eşik altı gizleme), AKTS iş yükü → `bolognaDenetle`, atıflı açık uçlu özet (maskeli, sayısız, `[Y:kimlik]`), Google Forms/LimeSurvey içe aktarma (kimlik sütunları atılır), Markdown rapor + SHA-256, QR, süreç motoru kurallarıyla (sessiz saat, tekil eylem anahtarı, bastırma) davet/hatırlatma/kapanış ve yanıt oranı. Göç `0007_anket` (belirteç tablosu, yanıt saatinin güne yuvarlanması, kişi alanı reddi, yanıt değiştirilemez/silinemez). Web: `/anket/[kurum]/[anket]` erişilebilir form + aydınlatma, `/panel/anketler` (örnek veri). Kalan: panelin gerçek veri kipi, işçide zamanlayıcı bağlantısı, raporun kanıt hattına kaydı (rapor `docs/raporlar/IP-17.md`).
