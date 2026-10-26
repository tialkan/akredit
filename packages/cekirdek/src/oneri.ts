// Öneri, karar ve yetki politikası kuralları. Saf işlevler; zaman parametre olarak verilir.

import {
  type BirimId,
  type IsoZaman,
  type Karar,
  type MatrisDegeri,
  ONERI_RISKI,
  type Oneri,
  type OneriTuru,
  type ProgramId,
  type RiskDuzeyi,
  type YetkiPolitikasi,
} from "./turler.ts";

const RISK_SIRASI: Readonly<Record<RiskDuzeyi, number>> = { dusuk: 0, orta: 1, yuksek: 2 };

/** Öneri türünün varsayılan risk düzeyi. */
export function oneriRiski(tur: OneriTuru): RiskDuzeyi {
  return ONERI_RISKI[tur];
}

/** Önerinin kendi riski ile türünün riskinden yüksek olanı. Tür riski hiçbir zaman düşürülemez. */
export function etkinRisk(oneri: Pick<Oneri, "tur" | "risk">): RiskDuzeyi {
  const tur = oneriRiski(oneri.tur);
  return RISK_SIRASI[oneri.risk] > RISK_SIRASI[tur] ? oneri.risk : tur;
}

export interface DogrulamaSonucu {
  gecerli: boolean;
  hatalar: string[];
}

/**
 * Bir kararın kurallara uygunluğu. Bir öneriye tek karar verilir; değişiklik yeni öneriyle yapılır.
 * `oncekiKararlar` aynı öneri için daha önce kaydedilmiş kararlardır.
 */
export function kararDogrula(
  oneri: Pick<Oneri, "id" | "tur" | "risk">,
  karar: Karar,
  oncekiKararlar: readonly Karar[] = [],
): DogrulamaSonucu {
  const hatalar: string[] = [];
  if (karar.oneriId !== oneri.id) hatalar.push("Karar bu öneriye ait değil.");
  if (oncekiKararlar.some((k) => k.oneriId === oneri.id && k.id !== karar.id))
    hatalar.push("Bu öneri için zaten karar verilmiş. Değişiklik için yeni öneri aç.");
  if (!String(karar.kararVeren ?? "").trim())
    hatalar.push("Kararı kimin verdiği yazılmalı. Kararı yapay zekâ veremez.");
  if (karar.sonuc === "duzeltildi" && (karar.duzeltme === null || karar.duzeltme === undefined))
    hatalar.push("Düzeltme kararında düzeltilmiş içerik verilmeli.");
  if (karar.sonuc !== "duzeltildi" && karar.duzeltme !== null && karar.duzeltme !== undefined)
    hatalar.push("Düzeltilmiş içerik yalnız düzeltme kararında verilir.");
  if (karar.dayanak.tur === "politika") {
    if (!String(karar.dayanak.politikaId ?? "").trim())
      hatalar.push("Politikaya dayanan kararda politika belirtilmeli.");
    if (etkinRisk(oneri) === "yuksek")
      hatalar.push("Yüksek riskli öneri politikayla karara bağlanamaz; kişi karar vermeli.");
  }
  return { gecerli: hatalar.length === 0, hatalar };
}

export interface PolitikaSonucu {
  uygulanir: boolean;
  neden: string;
}

/** Önerinin kurum yapısındaki yeri; politikanın birim ya da program kapsamı varsa gerekir. */
export interface OneriKonumu {
  birimId?: BirimId;
  programId?: ProgramId;
}

const zamanMs = (z: IsoZaman | number): number => (typeof z === "number" ? z : Date.parse(z));

/**
 * Yetki devri politikası bu öneriye uygulanır mı? Yüksek risk hiçbir koşulda uygulanmaz.
 * Güven eşiğe eşitse uygulanır. Zaman aralığı [başlangıç, bitiş): bitiş anında politika artık geçerli değildir.
 */
export function politikaUygulanirMi(
  oneri: Pick<Oneri, "kurumId" | "tur" | "risk" | "guven">,
  politika: YetkiPolitikasi,
  simdi: IsoZaman | number,
  konum: OneriKonumu = {},
): PolitikaSonucu {
  const hayir = (neden: string): PolitikaSonucu => ({ uygulanir: false, neden });
  const risk = etkinRisk(oneri);
  if (risk === "yuksek") return hayir("Yüksek riskli öneriler politikayla karara bağlanmaz.");
  if (oneri.kurumId !== politika.kurumId) return hayir("Politika başka bir kuruma ait.");
  if (!String(politika.imzalayan ?? "").trim()) return hayir("Politikayı imzalayan kişi yok.");
  const k = politika.kapsam;
  if (!k.oneriTurleri.includes(oneri.tur)) return hayir("Öneri türü politikanın kapsamında değil.");
  if ((k.enYuksekRisk as RiskDuzeyi) === "yuksek" || RISK_SIRASI[risk] > RISK_SIRASI[k.enYuksekRisk])
    return hayir("Önerinin riski politikanın izin verdiği düzeyin üstünde.");
  if (oneri.guven === null || !Number.isFinite(oneri.guven)) return hayir("Önerinin güven değeri yok.");
  if (oneri.guven < k.enDusukGuven) return hayir("Önerinin güveni politikanın eşiğinin altında.");
  const t = zamanMs(simdi);
  if (!Number.isFinite(t)) return hayir("Karar zamanı geçersiz.");
  if (t < zamanMs(politika.baslangic)) return hayir("Politika henüz başlamadı.");
  if (politika.bitis !== null && t >= zamanMs(politika.bitis)) return hayir("Politikanın süresi doldu.");
  if (k.birimIdleri?.length && !(konum.birimId && k.birimIdleri.includes(konum.birimId)))
    return hayir("Öneri politikanın kapsadığı birimlerde değil.");
  if (k.programIdleri?.length && !(konum.programId && k.programIdleri.includes(konum.programId)))
    return hayir("Öneri politikanın kapsadığı programlarda değil.");
  return { uygulanir: true, neden: "Politikanın bütün koşulları sağlanıyor." };
}

/**
 * Bir hedef için geçerli karar: onaylanan ya da düzeltilen kararların zamanca en sonuncusu.
 * Ret kararı önceki geçerli kararı silmez. Eşit zamanda listede sonra gelen kazanır.
 */
export function gecerliKarar<T>(kararlar: readonly Karar<T>[]): Karar<T> | null {
  let son: Karar<T> | null = null;
  for (const k of kararlar) {
    if (k.sonuc === "reddedildi") continue;
    if (!son || zamanMs(k.zaman) >= zamanMs(son.zaman)) son = k;
  }
  return son;
}

/** Kararın kabul ettiği içerik: düzeltildiyse düzeltme, onaylandıysa önerinin içeriği. */
export function kararIcerigi<T>(oneri: Pick<Oneri<T>, "icerik">, karar: Karar<T>): T | null {
  if (karar.sonuc === "duzeltildi") return karar.duzeltme;
  if (karar.sonuc === "onaylandi") return oneri.icerik;
  return null;
}

/** Matris önerisi için inceleme notu (CLI `oner-matris` davranışı). */
export function matrisOnerisiIncelemesi(deger: MatrisDegeri, kanitVar: boolean): string | null {
  if (deger.tur !== "puan" || kanitVar) return null;
  if (deger.puan >= 4) return "4 ve 5 puan ölçme planından bir kanıtla desteklenmeli.";
  return "Kaynak kanıt belirtilmedi.";
}
