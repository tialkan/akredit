# ADR 0008: Herkese açık MCP odağı, barındırılan kurum hizmetinin askıya alınması

- **Tarih:** 2026-11-01
- **Durum:** kabul edildi (kurucu kararı)

## Bağlam

Platformun yazılımı tamamlandı ve Apache-2.0 lisansıyla açık kaynaktır. Kurumlara akredit.org üzerinden
barındırılan hizmet vermek ise sürekli gider ve insan emeği ister: sunucu, yedek, e-posta, yapay zekâ kullanımı,
bağımsız güvenlik denetimi, KVKK ve sözleşme süreçleri, pilot kurumlarla destek. Bu giderleri karşılayacak bir
sponsor bugün yok. Herkese açık MCP (akredit.org/mcp, `apps/acik-mcp`) ise hesapsız, salt okumadır, kurum
verisi tutmaz ve işletme gideri düşüktür.

## Karar

1. Asıl odak herkese açık MCP'dir: YÖKAK, MÜDEK, FEDEK, EPDAD, SABAK ölçütleri, Bologna denetimi, ÇK/PÇ hesabı,
   rapor dil denetimi. Site ilk ekranda bunu anlatır.
2. Barındırılan kurum hizmeti (kurum açma, pilot başvurusu, kurum girişi ve paneli) sponsor bulunana kadar askıdadır.
   Kod silinmez; `AKREDIT_BARINDIRMA` bayrağıyla kapatılır (`apps/web/src/site/barindirma.ts`). Varsayılan kapalıdır,
   `1` açar. Kapalıyken `/api/kurum-acilisi`, `/api/kurum-acilisi/dogrula` ve `/api/pilot` 503 döner; `/kurum-ac`,
   `/pilot` ve `/giris` sayfaları durumu ve sponsor çağrısını gösterir; başlıktaki "Giriş" gizlenir.
3. Demo (/deneyin, sentetik Örnek Üniversitesi) ve MCP bayraktan etkilenmez.
4. Barındırmaya ve insan işine bağlı İP'ler (23, 26, 27, 28, 29, 30, 34, 46) `plan.md` §8'de "askıda (sponsor)"
   durumuna alınır.
5. Site vaatleri dürüstleştirilir: "hizmet veriyoruz, başvurun" yerine "yazılım hazır, barındırma askıda".

## Gerekçe

Barındırılan hizmetin gideri ve sorumluluğu (kişisel veri, sürekli erişim, destek) karşılanmadan kurum kaydı almak,
verilemeyecek bir hizmeti vaat etmek olur. MCP kurum verisi tutmadan değer üretir ve sürdürülebilirdir.

## Geri açma koşulu

Barındırma giderlerini ve bağımsız güvenlik denetimini karşılayan bir sponsor ya da kurum anlaşması yapıldığında:
İP-26 (üretim altyapısı) ve İP-27 (güvenlik denetimi) kapanır, İP-28'in hukuk paketi kurumla imzalanır, sonra
dağıtımda `AKREDIT_BARINDIRMA=1` verilir ve site metni yeniden güncellenir. Karar kurucunundur ve yeni bir ADR ile kayda geçer.
