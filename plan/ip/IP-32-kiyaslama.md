# İP-32: Kurumlar arası kıyaslama

- **Durum:** tamam
- **Faz:** 6
- **Bağımlılık:** İP-20, İP-21
- **Sahip olduğu yollar:** `packages/kiyaslama/**`, `docs/raporlar/IP-32.md`
- **Büyüklük:** orta

## Amaç

Kurumların kendilerini açık verilerle ve (izinli) diğer kurumlarla kıyaslayabilmesi.

## Kapsam

1. Herkese açık KİDR'ler ve YÖK Atlas verisiyle kıyas.
2. İzinli, anonim, toplulaştırılmış kiracılar arası göstergeler.
3. En az grup büyüklüğü kuralı (yeniden tanımlamaya karşı).

## Kabul ölçütleri

- [x] Hiçbir kurumun verisi izinsiz görünmez. (`kiyaslama.test.ts` › "izni olmayan, süresi geçen ya da geri alan…", "sonuç başka kurumun kimliğini…", "en az grup…")
- [x] `pnpm verify` temiz.

## Günlük

- 2026-10-23: İP tanımlandı. Başlamadan önce kapsamı güncel mimariye göre ayrıntılandır.
- 2026-10-27: Saf `@akredit/kiyaslama` paketi yazıldı. `havuzKiyasla`: yalnız `an` anında geçerli izinli (süre, geri alma, gösterge kapsamı) kurumların değerleri; isteyen hariç en az 5 kurum (alt sınır düşürülemez), kurum kimliği/min/max yok, çelişen katkı dışlanır, yuvarlı ve sıradan bağımsız sonuç. `atlasKiyasla` (YÖK Atlas, kaynak zorunlu) ve `kidrKiyasla` (kamuya açık KİDR, adres + SHA-256 + sayfa zorunlu; kendi tarafta yalnız komisyonun kesin düzeyi). Kalan: vt tablosu (izin, katkı), servis/API ucu, panel sayfası, izin kaydının günlüğe yazılması, üyelik değişiminden fark saldırısına ek önlem. Göç gerekmedi (vt bu İP'nin yolu değil).
- 2026-10-30 (inceleme kapanışı, dal `inceleme/kapanis`): Bağımsız inceleme. `packages/kiyaslama/test/kiyaslama.test.ts` › "izni olmayan, süresi geçen ya da geri alan kurumun verisi hesaba girmez", en az grup ve kimlik testleri. Açık inceleme bulgusu yok. `pnpm check` ve `pnpm typecheck` temiz, bütün paket testleri sıralı koşuda geçti. Durum tamam. Kalan (ölçüt dışı): vt tablosu, servis ucu, panel.
