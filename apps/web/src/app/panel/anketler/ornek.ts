// Panelin örnek kipi için uydurma anket verisi. Yanıtlar sabit tohumlu bir sözde rastgele üreteçle
// üretilir (her derlemede aynı); gerçek kişi ya da kurum verisi değildir.

import {
  type AnketSonucu,
  type AnketTanimi,
  anketIsyukuDenetle,
  anketSonucu,
  type IsyukuDenetimi,
  sablon,
  type Yanit,
} from "@akredit/anket/temel";
import type { BolognaVerisi } from "@akredit/cekirdek";

/** Park-Miller üreteci: belirlenimci. */
function uretec(tohum: number) {
  let s = tohum;
  return () => {
    s = (s * 48271) % 2147483647;
    return s / 2147483647;
  };
}

export interface OrnekAnket {
  id: string;
  baslik: string;
  ders: string | null;
  erisim: "davet" | "baglanti";
  durum: "yayinda" | "kapali";
  bitis: string;
  davetSayisi: number;
  tanim: AnketTanimi;
  sonuc: AnketSonucu;
}

function likertYanitlari(tanim: AnketTanimi, n: number, tohum: number): Yanit[] {
  const r = uretec(tohum);
  return Array.from({ length: n }, (_, i) => {
    const y: Yanit = {};
    for (const s of tanim.sorular) {
      if (s.tur === "likert")
        y[s.kod] = 2 + Math.floor(r() * 4); // 2..5
      else if (s.tur === "tek_secim") y[s.kod] = s.secenekler?.[Math.floor(r() * (s.secenekler?.length ?? 1))] ?? null;
      else if (s.tur === "sayi") y[s.kod] = Math.floor(r() * 12);
      else y[s.kod] = i % 7 === 0 ? "Örnek olay çalışmaları artırılsın." : null;
    }
    return y;
  });
}

function isyukuYanitlari(n: number, tohum: number): Yanit[] {
  const r = uretec(tohum);
  return Array.from({ length: n }, () => ({
    ders_suresi: 42,
    sinif_disi: 40 + Math.round(r() * 50),
    odev: 10 + Math.round(r() * 30),
    proje: 0,
    ara_sinav: 8 + Math.round(r() * 14),
    final: 10 + Math.round(r() * 20),
    not: null,
  }));
}

const dd = sablon("ders_degerlendirme") as AnketTanimi;
const ay = sablon("akts_isyuku") as AnketTanimi;
const mz = sablon("mezun_izleme") as AnketTanimi;

export const ORNEK_ANKETLER: readonly OrnekAnket[] = [
  {
    id: "ders-degerlendirme-huk101",
    baslik: "HUK101 ders değerlendirme",
    ders: "HUK101",
    erisim: "davet",
    durum: "kapali",
    bitis: "2026-01-20T06:00:00Z",
    davetSayisi: 60,
    tanim: dd,
    sonuc: anketSonucu(dd, likertYanitlari(dd, 38, 17), { davetSayisi: 60 }),
  },
  {
    id: "akts-isyuku-huk101",
    baslik: "HUK101 AKTS iş yükü",
    ders: "HUK101",
    erisim: "davet",
    durum: "kapali",
    bitis: "2026-01-20T06:00:00Z",
    davetSayisi: 60,
    tanim: ay,
    sonuc: anketSonucu(ay, isyukuYanitlari(24, 29), { davetSayisi: 60 }),
  },
  {
    id: "mezun-izleme-2026",
    baslik: "Mezun izleme 2026",
    ders: null,
    erisim: "baglanti",
    durum: "yayinda",
    bitis: "2026-12-31T06:00:00Z",
    davetSayisi: 0,
    tanim: mz,
    sonuc: anketSonucu(mz, likertYanitlari(mz, 3, 5)),
  },
];

/** Örnek ders sayfası: beyan edilen iş yükü 150 saat, 5 AKTS (uydurma). */
const ORNEK_BOLOGNA: BolognaVerisi = {
  adres: "https://ornek.invalid/bologna",
  okundu: "2026-01-01T00:00:00Z",
  programCiktilari: [{ kod: "P1", metin: "Uydurma program çıktısı" }],
  matris: { pkodlar: ["P1"], dersler: [] },
  tyycIsaret: 1,
  dersler: [
    {
      kod: "HUK101",
      ad: "Hukuka Giriş (örnek)",
      zorunlu: true,
      bos: false,
      kaynak: "örnek",
      yariyil: 1,
      kredi: 3,
      akts: 5,
      bilgiler: {},
      degerlendirme: [{ ad: "Final", sayi: 1, katki: 100 }],
      isyuku: [
        { ad: "Ders süresi", sayi: 14, sure: 3, toplam: 42 },
        { ad: "Sınıf dışı ders çalışma süresi", sayi: 14, sure: 5, toplam: 70 },
        { ad: "Ödevler", sayi: 2, sure: 10, toplam: 20 },
        { ad: "Yarıyıl sonu sınavı", sayi: 1, sure: 18, toplam: 18 },
      ],
      dersYapisi: [],
      ciktilar: [{ kod: "Ö1", metin: "Uydurma çıktı" }],
      haftalar: 14,
      katki: {},
    },
  ],
};

export function ornekIsyukuDenetimi(): IsyukuDenetimi {
  const a = ORNEK_ANKETLER[1] as OrnekAnket;
  return anketIsyukuDenetle(ORNEK_BOLOGNA, "HUK101", a.tanim, a.sonuc);
}
