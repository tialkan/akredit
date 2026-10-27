# İP-27: Güvenlik sertleştirme ve bağımsız denetim

- **Durum:** inceleme
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
- 2026-10-27: Kapsam güncel mimariye göre ayrıntılandırıldı ve uygulandı (dal `ip/27-guvenlik`).
  Yapılanlar: `docs/guvenlik/` (tehdit modeli STRIDE + YZ riskleri, ASVS 4.0.3 L2 kontrol listesi, bulgu
  tablosu, dış denetim kapsamı ve teklif isteme taslağı); dalga 3 #1 (yüksek) barındırılan üretimde kapandı:
  göç `0008_oturum_rolu` (`akredit_oturum`), `infra/uretim/postgres/02-uygulama-kullanicilari.sh`, compose
  bağlantıları; gerçek PostgreSQL 16'da sınandı. Testle kapananlar: yazıyla sayı, sabit hat maskesi, ZIP
  CRC, S3 409, SigV4 boşluk, davet atomikliği, SAML imzasız/XSW/değiştirme/yeniden gönderim, OIDC kod
  enjeksiyonu/yeniden oynatma. gitleaks izin listesi ve CI eylem SHA sabitlemesi zaten vardı (doğrulandı).
  Kalanlar: kurum içi kurulumda süper kullanıcı bağlantısı (G-27-2, **yüksek**, üretime engel), CSP
  (G-27-1), imaj özetleri (G-27-3), dalga 3 #2–#8, dalga 2 #1–#2, bağımsız sızma testi (insan işi).
  Karar: OIDC nonce kütüphanede yok; PKCE + state + tek kullanımlık kodun aynı saldırıları karşıladığı
  testle gösterildi, bilgi düzeyinde kabul edildi. Kabul ölçütlerinden "kritik/yüksek bulgu kalmadan
  üretime çıkılmaz" kural olarak `docs/guvenlik/README.md`'ye yazıldı; "kiracı yalıtımı sızma testinde
  ayrıca sınanır" dış denetim kapsamına zorunlu bölüm olarak kondu, sınama insan işine bağlı.
