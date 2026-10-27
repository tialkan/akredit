// Bildirim tercihleri: sessiz saatler ve e-posta özeti. Uygulama içi bildirim her zaman hemen yazılır;
// e-posta sessiz saatte bekletilir, "gunluk" tercihinde günlük özete toplanır.

import type { SurecAyari } from "./tanim.ts";
import { GUN_MS, yerelAlanlar, yerelTarih, yerelZaman } from "./zaman.ts";

export type EpostaTercihi = "aninda" | "gunluk" | "kapali";

export interface KisiTercihi {
  eposta: EpostaTercihi;
  sessizBaslangic: string;
  sessizBitis: string;
  ozetSaati: string;
  saatDilimi: string;
}

export function kisiTercihi(ayar: SurecAyari, kisiId: string): KisiTercihi {
  const b = ayar.bildirim;
  const k = b.kisiler[kisiId] ?? {};
  const saatMi = (s: string | undefined) => (s && /^([01]\d|2[0-3]):[0-5]\d$/u.test(s) ? s : undefined);
  return {
    eposta: k.eposta ?? b.eposta,
    sessizBaslangic: saatMi(k.sessizBaslangic) ?? b.sessizBaslangic,
    sessizBitis: saatMi(k.sessizBitis) ?? b.sessizBitis,
    ozetSaati: b.ozetSaati,
    saatDilimi: ayar.saatDilimi,
  };
}

const dakika = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));

/** Yerel saat sessiz aralıkta mı? Aralık gece yarısını aşabilir (20:00–08:00). */
export function sessizMi(an: Date, t: Pick<KisiTercihi, "sessizBaslangic" | "sessizBitis" | "saatDilimi">): boolean {
  const y = yerelAlanlar(an, t.saatDilimi);
  const d = y.saat * 60 + y.dakika;
  const bas = dakika(t.sessizBaslangic);
  const bit = dakika(t.sessizBitis);
  if (bas === bit) return false;
  return bas < bit ? d >= bas && d < bit : d >= bas || d < bit;
}

/** Sessiz saat bittiği ilk an (sessiz değilse `an`). */
export function sessizSonrasi(an: Date, t: Pick<KisiTercihi, "sessizBaslangic" | "sessizBitis" | "saatDilimi">): Date {
  if (!sessizMi(an, t)) return an;
  const bugun = yerelTarih(an, t.saatDilimi);
  const aday = yerelZaman(bugun, t.sessizBitis, t.saatDilimi);
  return aday > an ? aday : yerelZaman(bugun, t.sessizBitis, t.saatDilimi, 1);
}

/**
 * Bir e-postanın ne zaman gönderileceği. `null`: e-posta gönderilmez (kapalı).
 * "aninda": hemen, sessiz saatteyse sessizlik bitince. "gunluk": sıradaki özet saatinde (sessizse sonrası).
 */
export function epostaZamani(olusma: Date, t: KisiTercihi): Date | null {
  if (t.eposta === "kapali") return null;
  if (t.eposta === "aninda") return sessizSonrasi(olusma, t);
  const bugun = yerelTarih(olusma, t.saatDilimi);
  let ozet = yerelZaman(bugun, t.ozetSaati, t.saatDilimi);
  if (ozet <= olusma) ozet = new Date(yerelZaman(bugun, t.ozetSaati, t.saatDilimi, 1).getTime());
  return sessizSonrasi(ozet, t);
}

export interface BildirimOgesi {
  baslik: string;
  metin: string;
  olusma: Date;
}

/** Birden çok bildirimi tek e-postaya toplar (tek bildirimse olduğu gibi). */
export function ozetEposta(ogeler: readonly BildirimOgesi[]): { konu: string; metin: string } {
  const sirali = [...ogeler].sort((a, b) => a.olusma.getTime() - b.olusma.getTime());
  const ilk = sirali[0];
  if (!ilk) throw new RangeError("Özet için en az bir bildirim gerekir.");
  if (sirali.length === 1) return { konu: `Akredit: ${ilk.baslik}`, metin: `${ilk.metin}\n` };
  const satirlar = sirali.map((o) => `- ${o.baslik}: ${o.metin}`);
  return {
    konu: `Akredit: ${sirali.length} yeni bildirim`,
    metin: `Bekleyen işleriniz:\n\n${satirlar.join("\n")}\n`,
  };
}

/** Bir son tarihe kalan tam gün (yuvarlanmış yukarı); geçmişse 0. */
export function kalanGun(simdi: Date, sonTarih: Date): number {
  return Math.max(0, Math.ceil((sonTarih.getTime() - simdi.getTime()) / GUN_MS));
}
