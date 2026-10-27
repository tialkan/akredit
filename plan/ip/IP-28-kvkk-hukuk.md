# İP-28: KVKK ve hukuk paketi

- **Durum:** inceleme
- **Faz:** 5
- **Bağımlılık:** araştırma
- **Sahip olduğu yollar:** `docs/hukuk/**`, `apps/web/src/app/(site)/{kvkk,gizlilik,kosullar}/**`, `docs/raporlar/IP-28.md`
- **Büyüklük:** orta

## Amaç

Kurumların hukuk birimlerinin onaylayabileceği belge seti ve ürün içi uyum.

## Kapsam

1. Roller: kurum veri sorumlusu, işletmeci veri işleyen; veri işleme sözleşmesi şablonu.
2. Aydınlatma metinleri (kullanıcı, öğrenci verisi, anket katılımcısı), çerez politikası, kullanım koşulları.
3. Saklama ve imha politikası; kişisel veri envanteri; VERBİS değerlendirmesi.
4. Yurt dışı aktarım değerlendirmesi (YZ sağlayıcıları), kurum ayarlarında açık seçim ve kayıt.
5. Ürün içi: veri dışa aktarma, silme talebi akışı (takma ad eşlemesinin silinmesi), erişim günlüğü.

## Kabul ölçütleri

- [ ] Belgeler bir hukukçu tarafından incelenmiş (insan işi).
- [ ] Silme talebi değişmez günlük bütünlüğünü bozmadan uygulanır (test).
- [ ] `pnpm verify` temiz.

## Notlar

Hukuki metinlerin son hali avukat onayı gerektirir; Akredit taslak üretir.

## Günlük

- 2026-10-23: İP tanımlandı. Başlamadan önce kapsamı güncel mimariye göre ayrıntılandır.
- 2026-10-27: `docs/hukuk/` altında taslak hukuk paketi yazıldı (kaynaklar, uyum analizi, veri işleme sözleşmesi şablonu, aydınlatma metinleri, gizlilik, çerez, kullanım koşulları, saklama-imha, envanter, VERBİS, yurt dışı aktarım). Mevzuat bilgileri web kaynaklarından erişim tarihiyle alındı; resmî metni okunamayanlar `DOĞRULANMADI`. Site: `/kvkk` güncellendi, `/gizlilik` ve `/kosullar` eklendi (taslak uyarılı). Karar: silme talebi = takma ad eşlemesi ve anahtarın silinmesi + günlüğe yeni kayıt. Kalan: avukat incelemesi; silme akışı kodu ve testi (`packages/vt`), kurum YZ ayarı ve kaydı, dışa aktarma, erişim günlüğü ekranı (İP yolları dışında, sonraki İP).
