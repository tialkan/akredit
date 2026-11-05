// Ana sayfadaki önce/sonra örneği (İP-49). Girdi KURGUDUR: uydurma bir ders sayfası. Bulgular elle yazılmaz;
// @akredit/cekirdek bolognaDenetle ile hesaplanır. Sayfadaki her sayı bu hesaptan gelir.

import { type BolognaOkunanDers, type BolognaVerisi, type Bulgu, bolognaDenetle } from "@akredit/cekirdek";

const PROGRAM_CIKTILARI = [{ kod: "P1", metin: "Kurgu program çıktısı" }];

/** Kurgu ders: iş yükü 5 AKTS için az, değerlendirme toplamı 100 değil, haftalık konu eksik. */
export const ORNEK_DERS_ONCE: BolognaOkunanDers = {
  kod: "KRG101",
  ad: "Kurgu Dersi",
  zorunlu: true,
  bos: false,
  kaynak: "kurgu",
  yariyil: 1,
  tul: "3+0+0",
  kredi: 3,
  akts: 5,
  bilgiler: {},
  degerlendirme: [
    { ad: "Ara sınav", sayi: 1, katki: 40 },
    { ad: "Final", sayi: 1, katki: 50 },
  ],
  isyuku: [
    { ad: "Ders saati", sayi: 14, sure: 3, toplam: 42 },
    { ad: "Bireysel çalışma", sayi: 14, sure: 4, toplam: 56 },
    { ad: "Sınavlar", sayi: 2, sure: 2, toplam: 4 },
  ],
  dersYapisi: [],
  ciktilar: [{ kod: "Ö1", metin: "Kurgu öğrenme çıktısı" }],
  haftalar: 12,
  katki: {},
};

/** Aynı ders düzeltilmiş hâliyle. */
export const ORNEK_DERS_SONRA: BolognaOkunanDers = {
  ...ORNEK_DERS_ONCE,
  degerlendirme: [
    { ad: "Ara sınav", sayi: 1, katki: 40 },
    { ad: "Final", sayi: 1, katki: 60 },
  ],
  isyuku: [
    { ad: "Ders saati", sayi: 14, sure: 3, toplam: 42 },
    { ad: "Bireysel çalışma", sayi: 14, sure: 6, toplam: 84 },
    { ad: "Sınavlar", sayi: 2, sure: 2, toplam: 4 },
    { ad: "Ödev", sayi: 2, sure: 5, toplam: 10 },
  ],
  haftalar: 14,
};

const veri = (ders: BolognaOkunanDers): BolognaVerisi => ({
  adres: "kurgu",
  okundu: "2026-01-01T00:00:00Z",
  programCiktilari: PROGRAM_CIKTILARI,
  matris: { pkodlar: ["P1"], dersler: [] },
  tyycIsaret: null,
  dersler: [ders],
});

export function ornekDenetim(): { once: Bulgu[]; sonra: Bulgu[] } {
  return { once: bolognaDenetle(veri(ORNEK_DERS_ONCE)), sonra: bolognaDenetle(veri(ORNEK_DERS_SONRA)) };
}
