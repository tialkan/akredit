// Çerçeve sayfasının sayıları çerçeve verisinden hesaplanır; elle yazılmaz.
import { YOKAK_KURUMSAL_3_3 } from "@akredit/cerceveler";

export function yokakOzeti() {
  const c = YOKAK_KURUMSAL_3_3;
  const basliklar = c.olcutler;
  const olcutler = basliklar.flatMap((b) => b.altOlcutler);
  const altOlcutler = olcutler.flatMap((o) => o.altOlcutler);
  const dogrulanmamisDuzey = altOlcutler.filter((a) => !a.olgunlukTanimlari || a.olgunlukTanimlari.length === 0).length;
  return { c, basliklar, olcutSayisi: olcutler.length, altOlcutSayisi: altOlcutler.length, dogrulanmamisDuzey };
}
