# İP-17: Anket modülü

- **Durum:** bekliyor
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

- [ ] Anonimlik: yanıt ile kişi arasında bağ saklanmaz (test).
- [ ] AKTS iş yükü anketi sonucu Bologna iş yükü denetimine girdi olur.
- [ ] `pnpm verify` temiz.

## Günlük

- 2026-10-23: İP tanımlandı. Başlamadan önce kapsamı güncel mimariye göre ayrıntılandır.
