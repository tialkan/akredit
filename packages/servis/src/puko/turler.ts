// Kendini kapatan PÜKÖ türleri (İP-39). Kayıtlar yalnız eklenir: durum olaylardan türetilir.

import type { EsikAltiOlcum, IstisnaKumesi, KatmanSonucu, PukoDurumu } from "@akredit/cekirdek";
import type { KokNeden } from "@akredit/olcme";

export interface OnlemSecenegi {
  id: string;
  metin: string;
  /** "yz": modelin önerdiği metin (rakamsız). "kural": hazır şablon. "kisi": karar verenin kendi yazdığı. */
  uretici: "yz" | "kural" | "kisi";
}

export interface KararKarti {
  id: string;
  pukoId: string;
  kume: IstisnaKumesi;
  katman: KatmanSonucu;
  /** Ders kodu → kök nedenler (soru bazlı, `@akredit/olcme`). */
  kokNedenler: Record<string, KokNeden[]>;
  secenekler: OnlemSecenegi[];
  /** Aynı kümede önceki döngü iyileşmeden kapandıysa onun kimliği. */
  oncekiPukoId: string | null;
  olusturma: string;
}

/**
 * İP-38 sessiz devir girdisi. İP-38 bu türü kendi paketinde tanımladığında bu arayüz onunla değiştirilir;
 * o zamana kadar seçilen önlem, gelecek dönemin Bologna taslağına bu biçimde verilir.
 */
export interface SessizDevirGirdisi {
  dersKodu: string;
  hedefDonem: string;
  alan: "ogretim_yontemi_ve_onlem";
  metin: string;
  dayanak: { tur: "puko"; pukoId: string; kararVeren: string; zaman: string };
}

/** Süreç motoruna (İP-14) düşen eylem. */
export interface SurecEylemi {
  tur: "puko_eylemi";
  pukoId: string;
  baslik: string;
  dersKodlari: string[];
  hedefDonem: string;
}

export interface OtomatikKayit {
  /** Günlüğe girecek açıklama: "otomatik, dayanak: kaynak sistem". */
  aciklama: string;
  olcum: Omit<EsikAltiOlcum, "esik"> & { esik: number };
  katman: KatmanSonucu;
}

export type PukoOlayi =
  | { tur: "acildi"; pukoId: string; kart: KararKarti; zaman: string }
  | {
      tur: "onlem_secildi";
      pukoId: string;
      kartId: string;
      onlem: OnlemSecenegi;
      kararVeren: string;
      hedefDonem: string;
      sureMs: number;
      zaman: string;
    }
  | {
      tur: "kapandi";
      pukoId: string;
      durum: "kapandi_iyilesti" | "kapandi_iyilesmedi";
      karsilastirma: import("@akredit/cekirdek").PukoKarsilastirmasi[];
      kanitId: string;
      zaman: string;
    };

export interface PukoKaydi {
  pukoId: string;
  durum: PukoDurumu;
  kart: KararKarti;
  onlem: Extract<PukoOlayi, { tur: "onlem_secildi" }> | null;
  kapanis: Extract<PukoOlayi, { tur: "kapandi" }> | null;
}

/** Yalnız ekleyen depo. Veritabanı bağlantısı sonraki işte; testler ve örnek kip bellek deposunu kullanır. */
export interface PukoDeposu {
  ekle(olay: PukoOlayi): Promise<void>;
  olaylar(): Promise<readonly PukoOlayi[]>;
}

export function bellekPukoDeposu(): PukoDeposu {
  const liste: PukoOlayi[] = [];
  return {
    async ekle(o) {
      liste.push(structuredClone(o));
    },
    async olaylar() {
      return liste.map((o) => structuredClone(o));
    },
  };
}
