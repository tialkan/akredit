// Akredit işareti: "A" harfinin iki kolu ve ortasından geçen onay imi. Kaynak çizim QuiverAI ile üretildi;
// arka plan dikdörtgeni ve gölge yolu çıkarıldı, görünüm kutusu çizimin sınırına sıkılaştırıldı.

export const ISARET_YOLLARI = {
  solKol: "m39.96 9.8-35.34 60.25h12.67c7.01-13.96 15.25-29.69 22.65-42.71l8.64 16.27 7.38-6.31-16-27.5z",
  sagKol: "m61.26 46.38-7.68 6.91 8.69 16.76h13.04l-14.05-23.67z",
  onay: "m56.69 38.84-18.31 15.59-8.36-5.79-2.93 5.71 11.39 10.8 21.98-20.06-3.77-6.25z",
} as const;

/** Yolların sınır kutusu: x 4.62–75.31, y 9.8–70.05. */
export const ISARET_KUTUSU = { x: 4.62, y: 9.8, g: 70.69, h: 60.25 } as const;

export const MARKA_RENK = {
  lacivert: "#10325B",
  petrol: "#157C80",
  /** Koyu zeminde işaretin "A" rengi. */
  acikA: "#E8EEF6",
  /** Koyu zeminde onay iminin rengi. */
  acikOnay: "#5CC6C6",
} as const;
