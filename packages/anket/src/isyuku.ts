// AKTS iş yükü anketi → Bologna iş yükü denetimi. Öğrencilerin bildirdiği sürelerin ortancası, ders
// sayfasındaki iş yükü tablosunun yerine konur ve `bolognaDenetle` (`@akredit/cekirdek`) aynı kuralla
// (AKTS başına 25-30 saat) çalıştırılır. Ayrıca beyan edilen ile ölçülen toplam karşılaştırılır.

import {
  type BolognaDenetimSecenekleri,
  type BolognaIsYukuKalemi,
  type BolognaVerisi,
  type Bulgu,
  bolognaDenetle,
  okunamadiMi,
} from "@akredit/cekirdek";
import type { AnketSonucu } from "./istatistik.ts";
import type { AnketTanimi } from "./sema.ts";

/**
 * Anket sonucundan iş yükü kalemleri: her etkinlik için öğrenci başına ortanca saat.
 * Ortanca kullanılır; tek bir uç yanıt toplamı bozmasın. Gizli (eşik altı) soru kalem üretmez.
 */
export function anketIsyukuKalemleri(tanim: AnketTanimi, sonuc: AnketSonucu): BolognaIsYukuKalemi[] {
  const kalemler: BolognaIsYukuKalemi[] = [];
  for (const s of tanim.sorular) {
    if (s.tur !== "isyuku" || !s.etkinlik) continue;
    const r = sonuc.sorular.find((x) => x.kod === s.kod);
    if (!r || r.gizli || !r.ozet) continue;
    kalemler.push({ ad: s.etkinlik, sayi: 1, sure: r.ozet.ortanca, toplam: r.ozet.ortanca });
  }
  return kalemler;
}

/** Bologna verisinde dersin iş yükü tablosunu anket kalemleriyle değiştirir (kopya döner). */
export function bolognaVerisineIsle(veri: BolognaVerisi, dersKodu: string, kalemler: BolognaIsYukuKalemi[]): BolognaVerisi {
  let bulundu = false;
  const dersler = veri.dersler.map((d) => {
    if (d.kod !== dersKodu || okunamadiMi(d)) return d;
    bulundu = true;
    return { ...d, isyuku: kalemler };
  });
  if (!bulundu) throw new RangeError(`Bologna verisinde ${dersKodu} dersi bulunamadı.`);
  return { ...veri, dersler };
}

export interface IsyukuDenetimi {
  /** Ders sayfasında beyan edilen toplam saat (yoksa null). */
  beyan: number | null;
  /** Anketten ölçülen toplam saat (öğrenci başına ortancaların toplamı). */
  olculen: number;
  akts: number | null;
  bulgular: Bulgu[];
}

/**
 * Anket sonucunu Bologna iş yükü denetimine girdi yapar. Dönen bulgular:
 * - `akts-isyuku` (kaynak: anket): ölçülen toplamın AKTS başına saati aralık dışında;
 * - `anket-isyuku-fark`: ölçülen toplam beyandan %`farkEsigi`'nden çok sapıyor.
 */
export function anketIsyukuDenetle(
  veri: BolognaVerisi,
  dersKodu: string,
  tanim: AnketTanimi,
  sonuc: AnketSonucu,
  secenek: BolognaDenetimSecenekleri & { farkEsigi?: number } = {},
): IsyukuDenetimi {
  const ders = veri.dersler.find((d) => d.kod === dersKodu);
  if (!ders || okunamadiMi(ders)) throw new RangeError(`Bologna verisinde ${dersKodu} dersi okunamadı.`);
  const kalemler = anketIsyukuKalemleri(tanim, sonuc);
  const olculen = kalemler.reduce((t, k) => t + (k.toplam ?? 0), 0);
  const beyanToplam = (ders.isyuku ?? []).reduce((t, k) => t + (k.toplam ?? 0), 0);
  const beyan = beyanToplam > 0 ? beyanToplam : null;
  const bulgular: Bulgu[] = [];
  if (!kalemler.length) {
    bulgular.push({
      duzey: "uyari",
      kural: "anket-isyuku",
      konu: dersKodu,
      aciklama: "İş yükü anketinde yeterli yanıt yok; denetim yapılamadı.",
    });
    return { beyan, olculen, akts: ders.akts, bulgular };
  }
  const { simdi: _s, farkEsigi: _f, ...kurallar } = secenek;
  const denetim = bolognaDenetle(bolognaVerisineIsle(veri, dersKodu, kalemler), kurallar).filter(
    (b) => b.konu === dersKodu && b.kural === "akts-isyuku",
  );
  for (const b of denetim) bulgular.push({ ...b, aciklama: `Öğrenci anketine göre: ${b.aciklama}` });
  const esik = secenek.farkEsigi ?? 0.2;
  if (beyan !== null && Math.abs(olculen - beyan) / beyan > esik)
    bulgular.push({
      duzey: "uyari",
      kural: "anket-isyuku-fark",
      konu: dersKodu,
      aciklama: `Ders sayfasında beyan edilen iş yükü ${beyan} saat, öğrencilerin bildirdiği ${olculen} saat.`,
    });
  return { beyan, olculen, akts: ders.akts, bulgular };
}
