// Örnek veri kipi için karar kartları. Ders kodları, değerler ve kişiler uydurmadır.
// Kartlar gerçek PÜKÖ servisiyle (`@akredit/servis` puko) üretilir; yalnız girdiler örnektir.

import { type GostergeDegisimi, type PukoDurumu, yoneticiOzeti } from "@akredit/cekirdek";
import { puko } from "@akredit/servis";

const DONEM = "2026-2027 Güz";
const olc = (dersKodu: string, kod: string, deger: number, olcumTuru: "ck" | "pc" = "pc") => ({
  olcumTuru,
  kod,
  dersKodu,
  donem: DONEM,
  deger,
  esik: 60,
  kaynak: { hesapSurumu: "olcme-1.0.0", kanitId: `ornek-olcme-${dersKodu.toLowerCase()}` },
});

const OLCUMLER = [
  olc("BP101", "PÇ3", 48.5),
  olc("BP102", "PÇ3", 55),
  olc("BP203", "PÇ3", 57.2),
  olc("BP104", "PÇ3", 72),
  olc("BP101", "ÇK2", 41, "ck"),
  olc("BP102", "PÇ1", 66),
];

const KOK: Record<string, { soruNo: string; p: number }> = {
  BP101: { soruNo: "S4", p: 0.31 },
  BP102: { soruNo: "S2", p: 0.42 },
  BP203: { soruNo: "S5", p: 0.47 },
};

export async function ornekKararKartlari() {
  let n = 0;
  return puko.kartlariUret(OLCUMLER, {
    kimlik: () => `ornek-${++n}`,
    zaman: "2027-02-01T09:00:00.000Z",
    kokNeden: (o) => {
      const k = KOK[o.dersKodu];
      return k
        ? [
            {
              tur: "zor_soru",
              aracId: "F",
              soruNo: k.soruNo,
              deger: k.p,
              aciklama: `${k.soruNo} numaralı soruda öğrenciler puanın ancak %${Math.round(k.p * 100)} kadarını aldı.`,
            },
          ]
        : [];
    },
  });
}

const GOSTERGELER: GostergeDegisimi[] = [
  { kod: "PÇ1", ad: "PÇ1 sağlanma düzeyi", onceki: 61, simdiki: 66, kaynak: "Ölçme hesabı" },
  { kod: "PÇ3", ad: "PÇ3 sağlanma düzeyi", onceki: 62, simdiki: 58.1, kaynak: "Ölçme hesabı" },
  { kod: "G-ANK", ad: "Öğrenci memnuniyeti", onceki: 3.6, simdiki: 3.7, kaynak: "Anket sonuçları" },
];
const PUKO: PukoDurumu[] = ["acik", "acik", "onlem_secildi", "kapandi_iyilesti", "kapandi_iyilesmedi"];

export function ornekYoneticiOzeti() {
  return yoneticiOzeti(GOSTERGELER, ["Dış paydaşların program değerlendirmesine katılımı"], PUKO);
}
