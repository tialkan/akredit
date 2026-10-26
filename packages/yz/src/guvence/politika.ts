// Sağlayıcı politikası: yurt dışı sağlayıcı izni yoksa çağrı reddedilir; izin varsa maskeleme zorunludur.
import { type AracCagrisi, type Saglayici, type SohbetIstegi, YzHatasi } from "../saglayici.ts";
import { type MaskeSecenegi, maskeleyici } from "./kvkk.ts";

export interface KurumYzAyari {
  /** Kurum, verinin yurt dışındaki bir sağlayıcıya (maskeli olarak) gitmesine izin verdi mi? */
  yurtDisiIzin: boolean;
  /** Maskeleme seçenekleri (kişi adları, öğrenci numarası desenleri). */
  maske?: MaskeSecenegi;
}

const RED =
  "Kurumunuz verilerin yurt dışındaki yapay zekâ hizmetlerine gönderilmesine izin vermiyor. Yurt içi bir hizmet seçin ya da kurum ayarını yöneticinizle değiştirin.";

/** Sağlayıcıyı kurum politikasına göre sarar. Yurt içi sağlayıcı olduğu gibi döner. */
export function politikaUygula(saglayici: Saglayici, ayar: KurumYzAyari): Saglayici {
  if (saglayici.yurtIci) return saglayici;
  if (!ayar.yurtDisiIzin) throw new YzHatasi("politika", RED);
  return maskeleyen(saglayici, ayar.maske ?? {});
}

/** Adaylardan politikaya uyan ilkini seçer; yurt içi öncelikli. */
export function saglayiciSec(adaylar: Saglayici[], ayar: KurumYzAyari): Saglayici {
  const yurtIci = adaylar.find((s) => s.yurtIci);
  if (yurtIci) return yurtIci;
  const disari = adaylar[0];
  if (!disari || !ayar.yurtDisiIzin) throw new YzHatasi("politika", RED);
  return maskeleyen(disari, ayar.maske ?? {});
}

/** Her istekte mesajları ve araç argümanlarını maskeler, yanıtta maskeyi kaldırır. */
export function maskeleyen(saglayici: Saglayici, secenek: MaskeSecenegi): Saglayici {
  const sarili: Saglayici = {
    ad: saglayici.ad,
    model: saglayici.model,
    yurtIci: saglayici.yurtIci,
    async sohbet(istek: SohbetIstegi) {
      const m = maskeleyici(secenek);
      const cagriMaskele = (c: AracCagrisi): AracCagrisi => {
        const yeni: AracCagrisi = { ...c, argumanlar: JSON.parse(m.maskele(JSON.stringify(c.argumanlar ?? null))) };
        if (c.ham !== undefined) yeni.ham = m.maskele(c.ham);
        return yeni;
      };
      const mesajlar = istek.mesajlar.map((x) => {
        const y = { ...x, icerik: m.maskele(x.icerik) };
        if (x.aracCagrilari) y.aracCagrilari = x.aracCagrilari.map(cagriMaskele);
        return y;
      });
      const yanit = await saglayici.sohbet({ ...istek, mesajlar });
      return {
        ...yanit,
        icerik: m.kaldir(yanit.icerik),
        aracCagrilari: yanit.aracCagrilari.map((c) => {
          const y: AracCagrisi = { ...c, argumanlar: JSON.parse(m.kaldir(JSON.stringify(c.argumanlar ?? null))) };
          if (c.ham !== undefined) y.ham = m.kaldir(c.ham);
          return y;
        }),
      };
    },
  };
  if (saglayici.yapilandirilmisCikti !== undefined) sarili.yapilandirilmisCikti = saglayici.yapilandirilmisCikti;
  return sarili;
}
