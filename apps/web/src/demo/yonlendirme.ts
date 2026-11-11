// Oturumsuz ya da süresi dolmuş panel isteğinin gideceği yer (inceleme, kurucu kararı madde 8).
// Barındırma kapalıyken (ADR 0008) `/giris` askıdadır ve panele yalnız demo oturumuyla girilir; süresi dolan
// demo ziyaretçisi yeni rol seçebileceği `/kurum-demosu`'na döner. Barındırma açıkken gerçek giriş akışı değişmez.

import { barindirmaAcik, type Ortam } from "../site/barindirma.ts";
// `demoAcikMi` (uc.ts) ile aynı kural; uc.ts sunucu paketlerini çektiği için burada içe aktarılmaz.

export function oturumsuzYonlendirme(ortam: Ortam = process.env): "/giris" | "/kurum-demosu" {
  if (barindirmaAcik(ortam)) return "/giris";
  return ortam.AKREDIT_DEMO === "1" ? "/kurum-demosu" : "/giris";
}
