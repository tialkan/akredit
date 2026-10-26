// Worker thread girişi: metin çıkarmayı ana iş parçacığından yalıtır. Ana taraf süre dolunca bu iş parçacığını
// `terminate()` ile keser; PDF.js eşzamanlı bir döngüde takılsa bile hat durmaz (İP-04 bilinen sınırı).
// Worker yeniden kullanılır (yükleme maliyeti bir kez ödenir); istekler sırayla işlenir.

import { parentPort } from "node:worker_threads";
import { type BelgeIpucu, type CikarmaSecenekleri, metinCikar } from "@akredit/belge";

interface Istek {
  no: number;
  veri: Uint8Array;
  ipucu?: BelgeIpucu;
  secenek?: CikarmaSecenekleri;
  /** Yalnız test: worker'ı bilerek kilitler. */
  kilitle?: boolean;
}

parentPort?.on("message", async (g: Istek) => {
  if (g.kilitle) for (;;);
  try {
    parentPort?.postMessage({ no: g.no, sonuc: await metinCikar(g.veri, g.ipucu, g.secenek) });
  } catch {
    parentPort?.postMessage({ no: g.no, hata: true });
  }
});
