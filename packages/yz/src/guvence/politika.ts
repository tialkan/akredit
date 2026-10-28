// Sağlayıcı politikası: yurt dışı sağlayıcı izni yoksa çağrı reddedilir; izin varsa maskeleme zorunludur.
// İP-40'tan beri bütün yollar çıkış kapısından (`cikis-kapisi.ts`) geçer; bu dosya geriye uyumlu adlardır.
import { type Saglayici, YzHatasi } from "../saglayici.ts";
import { type CikisAyari, cikisKapisi } from "./cikis-kapisi.ts";
import type { MaskeSecenegi } from "./kvkk.ts";

export interface KurumYzAyari extends Omit<CikisAyari, "kip"> {
  /** Kurum, verinin yurt dışındaki bir sağlayıcıya (maskeli olarak) gitmesine izin verdi mi? */
  yurtDisiIzin: boolean;
  /** Maskeleme seçenekleri (kişi adları, öğrenci numarası desenleri). */
  maske?: MaskeSecenegi;
}

const RED =
  "Kurumunuz verilerin yurt dışındaki yapay zekâ hizmetlerine gönderilmesine izin vermiyor. Yurt içi bir hizmet seçin ya da kurum ayarını yöneticinizle değiştirin.";

/** Sağlayıcıyı kurum politikasına göre çıkış kapısıyla sarar. Yurt içi sağlayıcı kurum içi kipte sarılır. */
export function politikaUygula(saglayici: Saglayici, ayar: KurumYzAyari): Saglayici {
  return cikisKapisi(saglayici, ayar);
}

/** Adaylardan politikaya uyan ilkini seçer; yurt içi öncelikli. */
export function saglayiciSec(adaylar: Saglayici[], ayar: KurumYzAyari): Saglayici {
  const yurtIci = adaylar.find((s) => s.yurtIci);
  if (yurtIci) return cikisKapisi(yurtIci, ayar);
  const disari = adaylar[0];
  if (!disari || !ayar.yurtDisiIzin) throw new YzHatasi("politika", RED);
  return cikisKapisi(disari, ayar);
}

/** Her istekte mesajları ve araç argümanlarını maskeler, yanıtta maskeyi kaldırır (yurt dışı kipte kapı). */
export function maskeleyen(saglayici: Saglayici, secenek: MaskeSecenegi): Saglayici {
  return cikisKapisi(saglayici, { yurtDisiIzin: true, maske: secenek, kip: "yurt_disi" });
}
