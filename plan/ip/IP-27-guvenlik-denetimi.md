# İP-27: Güvenlik sertleştirme ve bağımsız denetim

- **Durum:** bekliyor
- **Faz:** 5
- **Bağımlılık:** İP-09 … İP-26
- **Sahip olduğu yollar:** `docs/guvenlik/**`, ilgili paketlerde düzeltmeler, `docs/raporlar/IP-27.md`
- **Büyüklük:** orta

## Amaç

Üniversite verisine yakışan güvenlik düzeyi ve bunun bağımsız doğrulanması.

## Kapsam

1. Tehdit modeli (STRIDE), OWASP ASVS 4 düzey 2 kontrol listesi, YZ'ye özgü riskler (istem enjeksiyonu, veri sızıntısı).
2. İçerik güvenlik politikası, hız sınırları, dosya yükleme sertleştirmesi, bağımlılık ve imaj taraması.
3. Bağımsız sızma testi (dış firma) ve bulguların kapatılması; SECURITY.md ve sorumlu bildirim süreci.

## Kabul ölçütleri

- [ ] Kritik ve yüksek bulgu kalmadan üretime çıkılmaz.
- [ ] Kiracı yalıtımı sızma testinde ayrıca sınanır.
- [ ] `pnpm verify` temiz.

## Notlar

Sızma testi bir hizmet alımıdır (kullanıcı listesi).

## Günlük

- 2026-10-23: İP tanımlandı. Başlamadan önce kapsamı güncel mimariye göre ayrıntılandır.
