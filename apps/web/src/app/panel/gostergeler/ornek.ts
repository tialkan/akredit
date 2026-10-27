// Gösterge panosu için uydurma örnek veri. Değerler burada yazılmaz; yalnız ham veri noktaları ve kaynakları
// yazılır, gösterge değerleri @akredit/gosterge ile hesaplanır. Yalnız örnek veri kipinde kullanılır; gerçek
// kipte veri `@akredit/servis gosterge.gostergePanosu` ile kayıtlardan gelir (veri/sunucu.ts, D3-4).

import { type GostergeTanimi, gostergeTanimiOku, type VeriNoktasi } from "@akredit/gosterge";

export const ORNEK_DONEMLER = ["2024", "2025", "2026"] as const;

export const ORNEK_TANIMLAR: GostergeTanimi[] = [
  gostergeTanimiOku({
    kod: "PG-1.1",
    ad: "Lisans programı doluluk oranı",
    birim: "%",
    plan: "stratejik_plan",
    planHedefi: "A1.H1",
    yontem: { tur: "oran", pay: "yerlesen", payda: "kontenjan", carpan: 100 },
    kaynaklar: ["baglayici", "elle"],
    donemTuru: "yil",
    yon: "artan",
    hedefler: [
      { donem: "2025", deger: 95 },
      { donem: "2026", deger: 100 },
    ],
  }),
  gostergeTanimiOku({
    kod: "PG-2.3",
    ad: "Öğrenci memnuniyeti ortalaması",
    birim: "/5",
    plan: "faaliyet_raporu",
    planHedefi: "A2.H3",
    yontem: { tur: "deger", anahtar: "memnuniyet" },
    kaynaklar: ["anket"],
    donemTuru: "yil",
    yon: "artan",
    hedefler: [{ donem: "2026", deger: 4 }],
  }),
  gostergeTanimiOku({
    kod: "PG-3.2",
    ad: "Program çıktısı sağlanma oranı",
    birim: "%",
    plan: "stratejik_plan",
    planHedefi: "A3.H2",
    yontem: { tur: "oran", pay: "saglanan_pc", payda: "toplam_pc", carpan: 100 },
    kaynaklar: ["olcme"],
    donemTuru: "yil",
    yon: "artan",
    hedefler: [{ donem: "2026", deger: 80 }],
  }),
];

const atlas = (yil: string) =>
  ({
    tur: "baglayici",
    baglayici: "YÖK Atlas",
    adres: "https://yokatlas.example/lisans/1",
    okunma: `${yil}-09-01T00:00:00Z`,
    kanitId: `kanit-atlas-${yil}`,
  }) as const;

export const ORNEK_VERILER: VeriNoktasi[] = [
  { anahtar: "kontenjan", donem: "2024", deger: 80, kaynak: atlas("2024") },
  { anahtar: "yerlesen", donem: "2024", deger: 70, kaynak: atlas("2024") },
  { anahtar: "kontenjan", donem: "2025", deger: 80, kaynak: atlas("2025") },
  { anahtar: "yerlesen", donem: "2025", deger: 76, kaynak: atlas("2025") },
  { anahtar: "kontenjan", donem: "2026", deger: 80, kaynak: atlas("2026") },
  {
    anahtar: "yerlesen",
    donem: "2026",
    deger: 72,
    kaynak: { tur: "elle", kisiId: "kisi-1", kanitId: "kanit-kayit-2026", zaman: "2026-09-20T00:00:00Z" },
  },
  { anahtar: "memnuniyet", donem: "2025", deger: 3.8, kaynak: { tur: "anket", anketId: "anket-2025", soru: "S1" } },
  { anahtar: "memnuniyet", donem: "2026", deger: 3.9, kaynak: { tur: "anket", anketId: "anket-2026", soru: "S1" } },
  { anahtar: "toplam_pc", donem: "2026", deger: 10, kaynak: { tur: "olcme", sonucId: "olcme-2026" } },
];
