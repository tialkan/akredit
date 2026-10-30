# İP-33: Mobil onay ve bildirim

- **Durum:** tamam
- **Faz:** 6
- **Bağımlılık:** İP-13
- **Sahip olduğu yollar:** `apps/web/src/app/panel/onaylar/**` (PWA), `docs/raporlar/IP-33.md`
- **Büyüklük:** küçük

## Amaç

Kararın telefondan, saniyeler içinde verilmesi.

## Kapsam

1. PWA, çevrim dışı önbellek (yalnız onay listesi), web anlık bildirimleri.
2. Tek elle kullanılabilir onay akışı.

## Kabul ölçütleri

- [x] Telefon testleri; bildirim izni reddedilince e-posta yolu. (`e2e/telefon.spec.ts`: 10 test; `mobil.test.ts`: 12 test)
- [x] Yüksek risk mobilde de toplu onaylanamaz; tek elle çubukta yüksek risk için onay düğmesi yok.
- [x] WCAG 2.2 AA (telefonda axe, açık/koyu tema).
- [x] `pnpm verify` temiz.

## Günlük

- 2026-10-23: İP tanımlandı. Başlamadan önce kapsamı güncel mimariye göre ayrıntılandır.
- 2026-10-27: Uygulandı (inceleme). PWA (manifest, simge, servis çalışanı `/panel/onaylar` kapsamlı), çevrim dışı önbellek yalnız onay listesi, çevrim dışı karar engeli (kuyruk yok), anlık bildirim izni/aboneliği ve izin yoksa e-posta özeti yolu, tek elle karar çubuğu (yüksek riskte yalnız "Kanıtı gör"). Kalan: aboneliğin kalıcı saklanması (göç 0070) ve VAPID gönderimi sahip olunmayan yollarda, sonraki İP'ye. Ayrıntı: `docs/raporlar/IP-33.md`.
- 2026-10-30 (inceleme kapanışı, dal `inceleme/kapanis`): Bağımsız inceleme. `apps/web/e2e/telefon.spec.ts`, `apps/web/src/app/panel/onaylar/mobil.test.ts`; dalga 3 #3 (oturum kapanınca önbellek) `oturum-kapanis.test.ts` ile kapalı. `pnpm check` ve `pnpm typecheck` temiz, bütün paket testleri sıralı koşuda geçti. Durum tamam. Kalan (ölçüt dışı): abonelik saklama ve VAPID gönderimi.
