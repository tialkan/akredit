// Rapor atıf denetimi. apps/cli/bin/akreddit `raporDenetle` mantığının saf hali; alıntı doğrulaması eklendi.
// Her [K:…] atfı tek bir kanıta çıkmalı, alıntı parçada geçmeli, sayı içeren paragraf kaynaksız kalmamalı.

import { atiflariAyristir, eksikleriAyristir } from "../atif.ts";
import { alintiGeciyorMu } from "../turkce.ts";
import type { Bulgu, Capa } from "../turler.ts";

export interface RaporKaniti {
  /** Tam içerik özeti (SHA-256, onaltılık). */
  ozet: string;
  /** Kanıtın görünen adı. */
  ad: string;
}

/** Bir kanıtın belirtilen konumundaki metni döndürür; bulunamazsa null. */
export type ParcaErisimi = (ozetOneki: string, capa: Capa | null) => string | null;

export interface RaporDenetimSonucu {
  bulgular: Bulgu[];
  /** Atıfla gösterilen kanıtların adları (tekil, ilk görülme sırasıyla). */
  kullanilanKanitlar: string[];
  /** [EKSİK: …] işaretlerinin açıklamaları. */
  eksikler: string[];
}

// Yıl ve yıl aralıkları sayı sayılmaz (CLI kuralı).
const YIL = /\b(19|20)\d{2}(-(19|20)\d{2})?\b/g;

export function raporDenetle(
  metin: string,
  kanitlar: readonly RaporKaniti[],
  parca?: ParcaErisimi,
): RaporDenetimSonucu {
  const bulgular: Bulgu[] = [];
  const kullanilan = new Set<string>();
  const ekle = (duzey: Bulgu["duzey"], kural: string, no: number, aciklama: string) =>
    bulgular.push({ duzey, kural, konu: String(no), aciklama: `Paragraf ${no}: ${aciklama}` });

  metin.split(/\n{2,}/).forEach((paragraf, i) => {
    const no = i + 1;
    // Başlık, tablo ve kod blokları paragraf sayılmaz.
    if (/^\s*(#|\||```)/.test(paragraf)) return;
    const atiflar = atiflariAyristir(paragraf);
    for (const a of atiflar) {
      const eslesen = kanitlar.filter((k) => k.ozet.toLowerCase().startsWith(a.ozetOneki));
      const tek = eslesen.length === 1 ? eslesen[0] : undefined;
      if (!tek) {
        ekle(
          "hata",
          eslesen.length ? "atif-belirsiz" : "atif-gecersiz",
          no,
          `[K:${a.ozetOneki}] ${eslesen.length ? "birden fazla kanıta uyuyor" : "hiçbir kanıta karşılık gelmiyor"}.`,
        );
        continue;
      }
      kullanilan.add(tek.ad);
      if (a.taninmayan)
        ekle("uyari", "konum-taninmadi", no, `[K:${a.ozetOneki}] konum yazımı tanınmadı: "${a.taninmayan}".`);
      if (a.alinti) {
        const parcaMetni = parca ? parca(a.ozetOneki, a.capa) : null;
        if (parcaMetni === null)
          ekle(
            "hata",
            "alinti-dogrulanamadi",
            no,
            `[K:${a.ozetOneki}] alıntısı doğrulanamadı: kanıtın bu konumunda metin yok. Konumu düzelt ya da alıntıyı kaldır.`,
          );
        else if (!alintiGeciyorMu(a.alinti, parcaMetni))
          ekle(
            "hata",
            "alinti-gecmiyor",
            no,
            `[K:${a.ozetOneki}] alıntısı kanıtta geçmiyor: "${a.alinti}". Alıntıyı kanıttan birebir al.`,
          );
      }
    }
    const eksik = eksikleriAyristir(paragraf).length > 0;
    if (!atiflar.length && !eksik && /\d/.test(paragraf.replace(YIL, ""))) {
      ekle(
        "uyari",
        "sayi-kaynaksiz",
        no,
        `sayı içeriyor ama kaynak göstergesi yok: "${paragraf.trim().slice(0, 80)}…"`,
      );
    }
  });
  const eksikler = eksikleriAyristir(metin).map((e) => e.aciklama);
  return { bulgular, kullanilanKanitlar: [...kullanilan], eksikler };
}

// İP-44: cümle ayrıştırma, dil denetimi ve kanıt paneli eşlemesi (paket dışına bu dosya üzerinden açılır).
export * from "./cumle.ts";
export * from "./dil.ts";
export * from "./kanit-paneli.ts";
