// Bologna Bilgi Paketi (Proliz OBS) okuyucu. Yalnız herkese açık sayfaları okur, giriş gerekmez.
// Sunucuyu yormamak için istekler sıralı ve aralıklıdır.

import type { BolognaDersi, BolognaVerisi } from "@akredit/cekirdek";
import type { DisBaglam } from "../baglayici.ts";
import {
  adresCoz,
  dersKimlikleri,
  dersSayfasiCoz,
  metin,
  programCiktilari,
  programMatrisi,
  tyycIsaretSayisi,
} from "./ayristir.ts";

/** HTTP başlıkları Latin-1 olmak zorunda olduğundan metin ASCII yazılır. */
export const KULLANICI_AJANI = "Akredit (akreditasyon hazirligi; salt okuma)";
export const VARSAYILAN_ARALIK_MS = 350;
export const ZAMAN_ASIMI_MS = 20_000;

export interface ProgramOkumaSecenekleri {
  /** Yalnız bu ders kodları okunur. */
  dersler?: string[] | null;
  /** İki istek arasındaki bekleme (ms). */
  aralikMs?: number;
  zamanAsimiMs?: number;
}

async function sayfa(
  baglam: DisBaglam,
  taban: string,
  yol: string,
  aralikMs: number,
  zamanAsimiMs: number,
): Promise<string> {
  if (aralikMs > 0) await baglam.bekle(aralikMs);
  const y = await baglam.fetch(taban + yol, {
    headers: { "User-Agent": KULLANICI_AJANI },
    signal: AbortSignal.timeout(zamanAsimiMs),
  });
  if (!y.ok) throw new Error(`${yol}: HTTP ${y.status}`);
  return y.text();
}

/** Programın bütün Bologna verisini okur. */
export async function programiOku(
  adres: string,
  baglam: DisBaglam,
  secenek: ProgramOkumaSecenekleri = {},
): Promise<BolognaVerisi> {
  const istenen = secenek.dersler ?? null;
  const aralikMs = secenek.aralikMs ?? VARSAYILAN_ARALIK_MS;
  const zaman = secenek.zamanAsimiMs ?? ZAMAN_ASIMI_MS;
  const ilerleme = (m: string) => baglam.ilerleme?.(m);
  const { taban, sunit, dil } = adresCoz(adres);
  const q = `lang=${dil}&curSunit=${sunit}`;
  ilerleme("Program çıktıları okunuyor");
  const pc = programCiktilari(await sayfa(baglam, taban, `progLearnOutcomes.aspx?${q}`, 0, zaman));
  ilerleme("Ders-program çıktısı matrisi okunuyor");
  const matris = programMatrisi(await sayfa(baglam, taban, `progCourseMatrix.aspx?${q}`, aralikMs, zaman));
  const tyyc = tyycIsaretSayisi(await sayfa(baglam, taban, `progTYYCMatrix.aspx?${q}`, aralikMs, zaman), pc.length);
  const kimlikler = dersKimlikleri(await sayfa(baglam, taban, `progCourses.aspx?${q}`, aralikMs, zaman));
  const hedef = matris.dersler.filter(
    (d) => !d.grupBasligi && kimlikler[d.kod] && (!istenen || istenen.includes(d.kod)),
  );
  const dersler: BolognaDersi[] = [];
  for (const [i, d] of hedef.entries()) {
    ilerleme(`Ders ${i + 1}/${hedef.length}: ${d.kod}`);
    try {
      const html = await sayfa(
        baglam,
        taban,
        `progCourseDetails.aspx?curCourse=${kimlikler[d.kod]}&lang=${dil}`,
        aralikMs,
        zaman,
      );
      const c = dersSayfasiCoz(html);
      dersler.push({
        ...c,
        kod: c.kod || d.kod,
        ad: c.ad || d.ad,
        zorunlu: d.zorunlu,
        bos: !c.kod && /Kayıt Yok|No Record/i.test(metin(html)),
        kaynak: `${taban}progCourseDetails.aspx?curCourse=${kimlikler[d.kod]}`,
      });
    } catch (e) {
      dersler.push({ kod: d.kod, hata: e instanceof Error ? e.message : String(e) });
    }
  }
  return { adres, okundu: baglam.simdi().toISOString(), programCiktilari: pc, matris, tyycIsaret: tyyc, dersler };
}
