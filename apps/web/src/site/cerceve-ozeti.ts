// Çerçeve sayfasının sayıları çerçeve verisinden hesaplanır; elle yazılmaz.
import { type Cerceve, ILK_CERCEVELER, tumOlcutler, YOKAK_KURUMSAL_3_3 } from "@akredit/cerceveler";

export function yokakOzeti() {
  const c = YOKAK_KURUMSAL_3_3;
  const basliklar = c.olcutler;
  const olcutler = basliklar.flatMap((b) => b.altOlcutler);
  const altOlcutler = olcutler.flatMap((o) => o.altOlcutler);
  const dogrulanmamisDuzey = altOlcutler.filter((a) => !a.olgunlukTanimlari || a.olgunlukTanimlari.length === 0).length;
  return { c, basliklar, olcutSayisi: olcutler.length, altOlcutSayisi: altOlcutler.length, dogrulanmamisDuzey };
}

export interface CerceveSatiri {
  kod: string;
  ad: string;
  surum: string;
  /** Ağaçtaki bütün düğümler (başlık, ölçüt, alt ölçüt). */
  olcutSayisi: number;
  /** Metni belgeden alınmış düğüm sayısı. */
  resmiMetin: number;
  kaynakAdres: string;
  sha256: string;
  erisim: string;
  dogrulandi: boolean;
}

const satir = (c: Cerceve): CerceveSatiri | null => {
  if (!c.resmi || !c.kaynak?.sha256) return null;
  const hepsi = tumOlcutler(c.olcutler);
  return {
    kod: c.kod,
    ad: c.ad,
    surum: c.surum,
    olcutSayisi: hepsi.length,
    resmiMetin: hepsi.filter((o) => o.metinDurumu === "resmi").length,
    kaynakAdres: c.kaynak.adres,
    sha256: c.kaynak.sha256,
    erisim: c.kaynak.erisimTarihi,
    dogrulandi: c.dogrulandi,
  };
};

/**
 * Resmî belgesi indirilmiş ve özeti kayıtlı program akreditasyonu çerçeveleri (YÖKAK dışındakiler).
 * Kütüphaneye yeni çerçeve eklenince sayfa kendiliğinden güncellenir.
 */
export function programCerceveleri(): CerceveSatiri[] {
  return ILK_CERCEVELER.filter((c) => !c.kod.startsWith("yokak")).flatMap((c) => satir(c) ?? []);
}
