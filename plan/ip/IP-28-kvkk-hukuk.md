# İP-28: KVKK ve hukuk paketi

- **Durum:** bekliyor
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
