# ADR 0007: Sessiz devir ve süreli varsayılan onay

- **Tarih:** 2026-10-28
- **Durum:** önerildi (İP-38)

## Bağlam

Danışmanlık kararı (üç katmanlı karar modeli, katman 1): önceki dönemden devreden Bologna paketi hocaya iş
çıkarmamalı. Değişmez ilke 3 kararın insanda, adıyla ve dayanağıyla kaydını ister.

## Karar

1. Yeni öneri türü `bologna_devri` (tür riski düşük) ve yeni karar dayanağı `sure_dolumu`.
2. `sure_dolumu` kararı yalnız: `bologna_devri` türünde, `onaylandi` sonucunda, etkin risk düşükken, öneri içeriğindeki
   `sureSonu` geçtikten sonra, kapsayan imzalı politika varken ve karar veren politikayı imzalayan kişiyken yazılır.
   Bu kurallar servis kodunda ve `karar_denetle` tetikleyicisinde (göç 0020) ayrı ayrı uygulanır.
3. `bologna_devri` politikayla hemen onaylanamaz (İP-13 motoru atlar, tetikleyici reddeder).
4. İtiraz süresi politikanın imzalı kaydındadır (`itiraz_suresi_is_gunu`, boşsa 5).
5. Devir birleştirmesi modelsizdir; yalnız ders kaydı, okuma ve yapılandırılmış PÜKÖ önlemi metni değiştirir.
6. Kaynağa geri yazma yalnız kurumun yazılı izin kaydıyla, kuru çalıştırma varsayılan, gerçek yazma izinde ayrıca
   açık olmalı; İP-15'teki "kaydet insanda" kuralı bu yolda kurumun yazılı izniyle (insan kararı, adıyla kayıtlı)
   yerini alır. İP-15 yazma planı akışı değişmedi.

## Sonuçlar

Hocanın kararı her zaman önce gelir; varsayılan onay günlükte ayrı dayanakla görünür. Hukuki dayanak Senato
yönergesine bağlıdır (`docs/hukuk/yetki-devri-yonergesi-taslagi.md`, taslak).
