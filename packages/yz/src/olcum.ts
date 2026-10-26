// Çağrı ölçümü: model, süre, belirteç, tahmini maliyet. Olay olarak döner; kaydetmek çağıranın işidir.
import type { Saglayici, SohbetIstegi, SohbetYaniti } from "./saglayici.ts";

/** Milyon belirteç başına fiyat (para birimi çağıranın seçimi). */
export interface Fiyat {
  giris: number;
  cikis: number;
}

export type FiyatTablosu = Record<string, Fiyat>;

export interface OlcumOlayi {
  saglayici: string;
  model: string;
  kurumId: string | null;
  sureMs: number;
  girisBelirteci: number;
  cikisBelirteci: number;
  /** Fiyat tablosunda model yoksa null. */
  tahminiMaliyet: number | null;
  basarili: boolean;
}

export function maliyetHesapla(model: string, giris: number, cikis: number, tablo: FiyatTablosu): number | null {
  const f = tablo[model];
  if (!f) return null;
  // Örnek: giriş 1.000.000 belirteç × 3 + çıkış 500.000 × 15 → 3 + 7,5 = 10,5
  return (giris * f.giris + cikis * f.cikis) / 1_000_000;
}

/** Sağlayıcıyı sarar; her çağrı için olay üretir. */
export function olcen(
  saglayici: Saglayici,
  ayar: { kurumId?: string | null; fiyatlar?: FiyatTablosu; olay: (o: OlcumOlayi) => void; simdi?: () => number },
): Saglayici {
  const simdi = ayar.simdi ?? Date.now;
  return {
    ...saglayici,
    async sohbet(istek: SohbetIstegi): Promise<SohbetYaniti> {
      const bas = simdi();
      const temel = { saglayici: saglayici.ad, model: saglayici.model, kurumId: ayar.kurumId ?? null };
      try {
        const yanit = await saglayici.sohbet(istek);
        const g = yanit.kullanim?.giris ?? 0;
        const c = yanit.kullanim?.cikis ?? 0;
        ayar.olay({
          ...temel,
          sureMs: simdi() - bas,
          girisBelirteci: g,
          cikisBelirteci: c,
          tahminiMaliyet: maliyetHesapla(saglayici.model, g, c, ayar.fiyatlar ?? {}),
          basarili: true,
        });
        return yanit;
      } catch (e) {
        ayar.olay({
          ...temel,
          sureMs: simdi() - bas,
          girisBelirteci: 0,
          cikisBelirteci: 0,
          tahminiMaliyet: null,
          basarili: false,
        });
        throw e;
      }
    },
  };
}
