// Süreç zamanlayıcısı: her kurum için `tik` çalıştırır, sonraki uyanmayı motorun söylediği ana
// (en geç `aralikMs` sonrasına) kurar. Saat dışarıdan verilir; testte sahte saatle günler saniyede geçer.

import { type SurecBaglami, tik } from "./motor.ts";

export interface ZamanlayiciAyari {
  /** Zamanlayıcının dolaşacağı kurumlar (ör. kurum tablosunu sahip bağlantıyla okuyan işlev). */
  kurumlar: () => Promise<string[]>;
  /** İki tur arası en uzun süre. Varsayılan 1 saat (takvim ayarı değişirse en geç bu kadar sonra görülür). */
  aralikMs?: number;
  /** Bir kurumdaki hata diğerlerini durdurmaz; buraya bildirilir (iletide kişisel veri yok). */
  hata?: (kurumId: string, e: unknown) => void;
}

export function surecZamanlayicisi(b: SurecBaglami, ayar: ZamanlayiciAyari) {
  const aralik = ayar.aralikMs ?? 3_600_000;
  let iptal: (() => void) | null = null;
  let calisiyor = false;
  let durdu = true;

  async function tur(): Promise<Date> {
    const simdi = b.saat.simdi();
    let sonraki = new Date(simdi.getTime() + aralik);
    for (const k of await ayar.kurumlar()) {
      try {
        const s = await tik(b, k);
        if (s && s < sonraki) sonraki = s;
      } catch (e) {
        ayar.hata?.(k, e);
      }
    }
    return sonraki;
  }

  function kur(an: Date) {
    if (durdu) return;
    const ms = Math.max(0, an.getTime() - b.saat.simdi().getTime());
    iptal = b.saat.zamanla(ms, async () => {
      iptal = null;
      if (calisiyor) return;
      calisiyor = true;
      try {
        kur(await tur());
      } finally {
        calisiyor = false;
      }
    });
  }

  return {
    /** İlk turu hemen çalıştırır ve zamanlamayı başlatır. */
    async baslat() {
      durdu = false;
      kur(await tur());
    },
    durdur() {
      durdu = true;
      iptal?.();
      iptal = null;
    },
    /** Takvim ya da olay değişince turu öne almak için. */
    async simdiCalistir() {
      iptal?.();
      iptal = null;
      kur(await tur());
    },
  };
}
