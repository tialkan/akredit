// Saat dilimi yardımcıları ve test edilebilir saat. Takvim tarihleri kurumun saat diliminde
// "YYYY-MM-DD" olarak tutulur; motor bunları belirli bir yerel saatte ana çevirir.

export const GUN_MS = 86_400_000;
const TARIH = /^(\d{4})-(\d{2})-(\d{2})$/u;
const SAAT = /^([01]\d|2[0-3]):([0-5]\d)$/u;

/** Verilen anın `saatDilimi`ndeki yerel alanları. */
export function yerelAlanlar(an: Date, saatDilimi: string) {
  const parcalar = new Intl.DateTimeFormat("en-CA", {
    timeZone: saatDilimi,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(an);
  const al = (t: string) => Number(parcalar.find((p) => p.type === t)?.value ?? "0");
  return {
    yil: al("year"),
    ay: al("month"),
    gun: al("day"),
    saat: al("hour"),
    dakika: al("minute"),
    saniye: al("second"),
  };
}

/** Saat diliminin o andaki UTC farkı (ms). */
export function saatDilimiFarki(an: Date, saatDilimi: string): number {
  const y = yerelAlanlar(an, saatDilimi);
  const yerelUtc = Date.UTC(y.yil, y.ay - 1, y.gun, y.saat, y.dakika, y.saniye);
  return yerelUtc - Math.floor(an.getTime() / 1000) * 1000;
}

/** "YYYY-MM-DD" + gün farkı + "HH:MM" yerel saat → an. */
export function yerelZaman(tarih: string, saat: string, saatDilimi: string, gunFark = 0): Date {
  const t = TARIH.exec(tarih);
  const s = SAAT.exec(saat);
  if (!t || !s) throw new RangeError(`Geçersiz tarih ya da saat: ${tarih} ${saat}`);
  const tahmin = Date.UTC(Number(t[1]), Number(t[2]) - 1, Number(t[3]) + gunFark, Number(s[1]), Number(s[2]));
  // İki adımda düzelt: yaz saati geçişlerinde de doğru farkı bulur.
  let an = tahmin - saatDilimiFarki(new Date(tahmin), saatDilimi);
  an = tahmin - saatDilimiFarki(new Date(an), saatDilimi);
  return new Date(an);
}

/** Anın yerel tarihini "YYYY-MM-DD" olarak verir. */
export function yerelTarih(an: Date, saatDilimi: string): string {
  const y = yerelAlanlar(an, saatDilimi);
  return `${y.yil}-${String(y.ay).padStart(2, "0")}-${String(y.gun).padStart(2, "0")}`;
}

/** Zamanlayıcının kullandığı saat. Testte sahte saat verilir. */
export interface Saat {
  simdi(): Date;
  /** `ms` sonra `is`i çalıştırır; iptal işlevi döner. */
  zamanla(ms: number, is: () => void): () => void;
}

export const gercekSaat: Saat = {
  simdi: () => new Date(),
  zamanla(ms, is) {
    const t = setTimeout(is, ms);
    return () => clearTimeout(t);
  },
};

export interface SahteSaat extends Saat {
  /** Saati ilerletir; arada süresi dolan işleri sırayla çalıştırır ve her işin bitmesini bekler. */
  ilerlet(ms: number): Promise<void>;
  bekleyenIsSayisi(): number;
}

/** Elle ilerletilen saat. İşler zamanı gelince, zaman sırasıyla ve tek tek (await edilerek) çalışır. */
export function sahteSaat(baslangic: Date): SahteSaat {
  let simdi = baslangic.getTime();
  let sira = 0;
  const isler: { zaman: number; sira: number; is: () => void | Promise<void> }[] = [];
  return {
    simdi: () => new Date(simdi),
    zamanla(ms, is) {
      const kayit = { zaman: simdi + Math.max(0, ms), sira: sira++, is };
      isler.push(kayit);
      return () => {
        const i = isler.indexOf(kayit);
        if (i >= 0) isler.splice(i, 1);
      };
    },
    async ilerlet(ms) {
      const hedef = simdi + ms;
      for (;;) {
        isler.sort((a, b) => a.zaman - b.zaman || a.sira - b.sira);
        const ilk = isler[0];
        if (!ilk || ilk.zaman > hedef) break;
        isler.shift();
        simdi = ilk.zaman;
        await ilk.is();
      }
      simdi = hedef;
    },
    bekleyenIsSayisi: () => isler.length,
  };
}
