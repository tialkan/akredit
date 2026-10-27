# İP-23: Bağlayıcılar II

- **Durum:** inceleme
- **Faz:** 4
- **Bağımlılık:** İP-05, İP-10
- **Sahip olduğu yollar:** `packages/baglayicilar/src/{avesis,yokatlas,ubys,ebys,eposta,bulut}/**`, `docs/raporlar/IP-23.md`
- **Büyüklük:** büyük

## Amaç

Hocadan veri istememek için kurum sistemlerinin ve açık veri kaynaklarının genişletilmesi.

## Kapsam

1. AVESİS: herkese açık profil ve etkinlik sayfaları; kimlik doğrulamalı panel için tarayıcı ajanı (kullanıcı girişiyle).
2. YÖK Atlas: program istatistikleri (kontenjan, doluluk, yerleşme) — canlı sayfa yapısı doğrulanarak.
3. UBYS ve diğer OBS sağlayıcıları için dışa aktarım içe aktarıcıları.
4. EBYS dışa aktarımları, IMAP e-posta kutusu, Google Drive / OneDrive klasör eşitleme.
5. Her bağlayıcı: hız sınırı, kullanım koşulu notu, kayıtlı örneklerle test.

## Kabul ölçütleri

- [ ] Her bağlayıcı canlı yapıdan alınmış (anonimleştirilmiş) örneklerle sınanır. **Karşılanmadı:** bulut ortamında ağ kapalı (vekil 403); bütün bağlayıcılar kayıtlı ama kurgu örneklerle sınandı, canlı yapı DOĞRULANMADI. Kullanıcının bilgisayarından canlı örnek alınması gerekiyor.
- [x] Kimlik bilgisi depolanmaz; OAuth belirteçleri şifreli. (`bulut.test.ts` › "OAuth belirteç kasası"; `eposta.test.ts` › IMAP XOAUTH2, belirteç kayda/iletiye girmez; AVESİS paneli tarayıcı oturumuyla, `avesis.test.ts` › "panel tarayıcı oturumuyla okunur")
- [x] `pnpm verify` temiz.

## Notlar

Canlı sayfa yapısına erişim gerekir; bulut ortamında ağ kısıtlıysa kullanıcının bilgisayarı üzerinden doğrulanır.

## Günlük

- 2026-10-23: İP tanımlandı. Başlamadan önce kapsamı güncel mimariye göre ayrıntılandır.
- 2026-10-27: Uygulandı (dal `ip/23-baglayicilar-2`). AVESİS (açık profil + tarayıcı ajanı arayüzü), YÖK Atlas (genel bilgiler paneli, doluluk deterministik), UBYS/OBS not listesi, EBYS (e-Yazışma paketi + evrak listesi), ham MIME ayrıştırıcı + IMAP (XOAUTH2, EXAMINE, BODY.PEEK), Google Drive / OneDrive eşitleme, AES-256-GCM belirteç kasası ve yenileme. Ortak hız sınırlayıcı ve kullanım koşulu notu (`avesis/istek.ts`). 43 yeni test, ağsız. Testler ve kayıtlı örnekler sahiplik kuralı gereği `src/<bağlayıcı>/` altında. Kurumların kullanım koşulları ve sayfa yapıları DOĞRULANMADI; canlı örnek ölçütü açık. Ayrıntı: `docs/raporlar/IP-23.md`.
