// Elle hesaplanmış örnek: 5 öğrenci (o1-o5, uydurma takma adlar), 2 araç, 6 soru, 3 ÇK, 4 PÇ.
//
//   Araç V (ara sınav, %40): S1 tam 10 → ÇK1 · S2 tam 10 → ÇK2 · S3 tam 20 → ÇK1 (1), ÇK3 (1) (normalleşince 0,5 + 0,5)
//   Araç F (yarıyıl sonu, %60): S1 tam 20 → ÇK2 · S2 tam 20 → ÇK3 · S3 tam 10 → ÇK1
//
//   Puanlar      V.S1 V.S2 V.S3 | F.S1 F.S2 F.S3
//   o1            10   10   20  |  20   20   10
//   o2             8    6   14  |  16   12    8
//   o3             5    5   10  |  10   10    5
//   o4             2    4    6  |   8    6    4
//   o5          (V'ye girmedi) |  12   14    6

import type { DersOlcmeVerisi, MatrisDegeri, OgrenciPuani } from "@akredit/cekirdek";
import type { CkPcMatrisi } from "../src/turler.ts";

const tablo: Record<string, [number | null, number | null, number | null, number, number, number]> = {
  o1: [10, 10, 20, 20, 20, 10],
  o2: [8, 6, 14, 16, 12, 8],
  o3: [5, 5, 10, 10, 10, 5],
  o4: [2, 4, 6, 8, 6, 4],
  o5: [null, null, null, 12, 14, 6],
};

const yer: [string, string][] = [
  ["V", "S1"],
  ["V", "S2"],
  ["V", "S3"],
  ["F", "S1"],
  ["F", "S2"],
  ["F", "S3"],
];

export function ornekVeri(): DersOlcmeVerisi {
  const puanlar: OgrenciPuani[] = [];
  for (const [ogrenci, satir] of Object.entries(tablo))
    satir.forEach((puan, i) => {
      const [aracId, soruNo] = yer[i] as [string, string];
      puanlar.push({ ogrenci, aracId, soruNo, puan });
    });
  return {
    dersKodu: "ORN101",
    donem: "2026-2027 Güz",
    ciktilar: [{ kod: "CK1" }, { kod: "CK2" }, { kod: "CK3" }],
    araclar: [
      {
        id: "V",
        tur: "ara_sinav",
        ad: "Ara sınav",
        agirlik: 40,
        sorular: [
          { no: "S1", tamPuan: 10, eslemeler: [{ ciktiKod: "CK1", agirlik: 1 }] },
          { no: "S2", tamPuan: 10, eslemeler: [{ ciktiKod: "CK2", agirlik: 1 }] },
          {
            no: "S3",
            tamPuan: 20,
            eslemeler: [
              { ciktiKod: "CK1", agirlik: 1 },
              { ciktiKod: "CK3", agirlik: 1 },
            ],
          },
        ],
      },
      {
        id: "F",
        tur: "yariyil_sonu",
        ad: "Yarıyıl sonu sınavı",
        agirlik: 60,
        sorular: [
          { no: "S1", tamPuan: 20, eslemeler: [{ ciktiKod: "CK2", agirlik: 1 }] },
          { no: "S2", tamPuan: 20, eslemeler: [{ ciktiKod: "CK3", agirlik: 1 }] },
          { no: "S3", tamPuan: 10, eslemeler: [{ ciktiKod: "CK1", agirlik: 1 }] },
        ],
      },
    ],
    puanlar,
  };
}

const p = (puan: 1 | 2 | 3 | 4 | 5): MatrisDegeri => ({ tur: "puan", puan });
const yok: MatrisDegeri = { tur: "iliskisiz" };

/** PÇ1: ÇK1=5, ÇK2=3 · PÇ2: ÇK2=4, ÇK3=2 · PÇ3: ÇK3=5 · PÇ4: hiçbir ÇK katkı vermiyor. */
export const ornekMatris: CkPcMatrisi = {
  CK1: { PC1: p(5), PC2: yok, PC3: yok, PC4: yok },
  CK2: { PC1: p(3), PC2: p(4), PC3: yok, PC4: yok },
  CK3: { PC1: yok, PC2: p(2), PC3: p(5), PC4: { tur: "yetersiz_kanit" } },
};
