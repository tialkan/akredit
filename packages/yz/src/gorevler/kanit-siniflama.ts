// Kanıt sınıflama: belge parçaları + ölçüt listesi → belge türü ve en çok 5 ölçüt önerisi.
import { atiflariAyristir } from "@akredit/cekirdek";
import { z } from "zod";
import { type AtifKaynagi, atifDogrula } from "../guvence/atif.ts";
import { type Gorev, type KuralSorunu, kanitBlogu, ORTAK_KURALLAR } from "./gorev.ts";

export const BELGE_TURLERI = [
  "tutanak",
  "izlence",
  "anket_raporu",
  "faaliyet_raporu",
  "yonerge",
  "plan",
  "sinav_belgesi",
  "yazisma",
  "sunum",
  "tablo",
  "diger",
] as const;

export interface KanitSiniflamaGirdisi {
  kanit: AtifKaynagi;
  olcutler: { kod: string; ad: string }[];
}

export const KanitSiniflamaSemasi = z.object({
  belgeTuru: z.enum(BELGE_TURLERI),
  olcutOnerileri: z
    .array(
      z.object({
        olcutKod: z.string(),
        gerekce: z.string().min(1),
        atif: z.string().regex(/\[K:[0-9a-fA-F]{6,64}[^\]]*\]/u, "atıf [K:…] biçiminde olmalı"),
        guven: z.number().min(0).max(1),
      }),
    )
    .max(5),
});

export type KanitSiniflamaCiktisi = z.infer<typeof KanitSiniflamaSemasi>;

export const kanitSiniflama: Gorev<KanitSiniflamaGirdisi, typeof KanitSiniflamaSemasi> = {
  ad: "kanit-siniflama",
  sema: KanitSiniflamaSemasi,
  istem(g) {
    const olcutler = g.olcutler.map((o) => `- ${o.kod}: ${o.ad}`).join("\n");
    return [
      {
        rol: "sistem",
        icerik: `Sen bir kalite güvencesi kanıt sınıflayıcısısın. Belgenin türünü belirle ve belgenin kanıt olabileceği en çok 5 ölçüt öner. Her öneri için gerekçe, belgeden atıf ve 0-1 arası güven ver. Yalnız listedeki ölçüt kodlarını kullan.\n${ORTAK_KURALLAR}`,
      },
      { rol: "kullanici", icerik: `Ölçütler:\n${olcutler}\n\nBelge:\n${kanitBlogu(g.kanit)}` },
    ];
  },
  denetle(c, g) {
    const sorunlar: KuralSorunu[] = [];
    const kodlar = new Set(g.olcutler.map((o) => o.kod));
    const gorulen = new Set<string>();
    c.olcutOnerileri.forEach((o, i) => {
      const alan = `olcutOnerileri.${i}`;
      if (!kodlar.has(o.olcutKod)) sorunlar.push({ alan, aciklama: `Listede olmayan ölçüt: ${o.olcutKod}` });
      if (gorulen.has(o.olcutKod)) sorunlar.push({ alan, aciklama: `Ölçüt iki kez önerilmiş: ${o.olcutKod}` });
      gorulen.add(o.olcutKod);
      const atiflar = atiflariAyristir(o.atif);
      if (!atiflar.length) sorunlar.push({ alan: `${alan}.atif`, aciklama: "Atıf okunamadı." });
      for (const a of atiflar)
        for (const s of atifDogrula(a, [g.kanit]))
          if (s.tur !== "taninmayan_konum") sorunlar.push({ alan: `${alan}.atif`, aciklama: s.aciklama });
    });
    return sorunlar;
  },
};
