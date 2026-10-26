// Kayıt/oynatma: gerçek yanıtları JSON kasete yazar, testte ağsız oynatır.
import { readFile, writeFile } from "node:fs/promises";
import { z } from "zod";
import type { Saglayici, SohbetIstegi, SohbetYaniti } from "../saglayici.ts";

export interface KasetKaydi {
  istek: Omit<SohbetIstegi, "sinyal">;
  yanit: SohbetYaniti;
}

export interface Kaset {
  saglayici: string;
  model: string;
  kayitlar: KasetKaydi[];
}

const KasetSemasi = z.object({
  saglayici: z.string(),
  model: z.string(),
  kayitlar: z.array(
    z.object({
      istek: z.object({ mesajlar: z.array(z.unknown()) }).passthrough(),
      yanit: z.object({ icerik: z.string(), aracCagrilari: z.array(z.unknown()) }).passthrough(),
    }),
  ),
});

/** Gerçek sağlayıcıyı sarar; her çağrıyı kasete ekler. Anahtar kasete girmez (yalnız istek gövdesi). */
export function kaydeden(gercek: Saglayici): { saglayici: Saglayici; kaset: Kaset } {
  const kaset: Kaset = { saglayici: gercek.ad, model: gercek.model, kayitlar: [] };
  const saglayici: Saglayici = {
    ...gercek,
    async sohbet(istek) {
      const yanit = await gercek.sohbet(istek);
      const { sinyal: _s, ...kopya } = istek;
      kaset.kayitlar.push(structuredClone({ istek: kopya, yanit }));
      return yanit;
    },
  };
  return { saglayici, kaset };
}

/** Kasetteki yanıtları sırayla oynatır. İstek mesajları kayıttakinden farklıysa hata verir. */
export function oynatan(kaset: Kaset, ayar: { yurtIci?: boolean; sikiEslesme?: boolean } = {}): Saglayici {
  let sira = 0;
  return {
    ad: kaset.saglayici,
    model: kaset.model,
    yurtIci: ayar.yurtIci ?? true,
    async sohbet(istek) {
      const kayit = kaset.kayitlar[sira];
      if (!kayit) throw new Error(`Kasette ${sira + 1}. istek için kayıt yok.`);
      if (ayar.sikiEslesme !== false && JSON.stringify(kayit.istek.mesajlar) !== JSON.stringify(istek.mesajlar))
        throw new Error(`Kasetteki ${sira + 1}. istek bu istekle uyuşmuyor.`);
      sira++;
      return structuredClone(kayit.yanit);
    },
  };
}

export async function kasetYaz(yol: string, kaset: Kaset): Promise<void> {
  await writeFile(yol, `${JSON.stringify(kaset, null, 2)}\n`);
}

export async function kasetOku(yol: string): Promise<Kaset> {
  return KasetSemasi.parse(JSON.parse(await readFile(yol, "utf8"))) as Kaset;
}
