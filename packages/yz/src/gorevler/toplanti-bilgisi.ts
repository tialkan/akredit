// Toplantı bilgisi: tutanak metni → tarih, tür, katılımcı sayısı, atıflı kararlar, eylem adayları.
// Kişi adları modele gitmeden maskelenir. Model sayısı ve tarihi ancak tutanakta geçiyorsa kabul edilir.
import { atiflariAyristir } from "@akredit/cekirdek";
import { z } from "zod";
import { type AtifKaynagi, atifDogrula } from "../guvence/atif.ts";
import { type Esleme, maskeleyici } from "../guvence/kvkk.ts";
import { sayilariCikar } from "../guvence/sayi.ts";
import { type Gorev, type KuralSorunu, kanitBlogu, ORTAK_KURALLAR } from "./gorev.ts";

export const TOPLANTI_TURLERI = [
  "kurul",
  "komisyon",
  "danisma_kurulu",
  "bolum_toplantisi",
  "paydas_toplantisi",
  "diger",
] as const;

export interface ToplantiBilgisiGirdisi {
  kanit: AtifKaynagi;
  /** Tutanakta geçen kişi adları (maskelenir). */
  adlar?: string[];
}

const Atif = z.string().regex(/\[K:[0-9a-fA-F]{6,64}[^\]]*\]/u, "atıf [K:…] biçiminde olmalı");

export const ToplantiBilgisiSemasi = z.object({
  tarih: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/u)
    .nullable(),
  tarihAtif: Atif.nullable(),
  toplantiTuru: z.enum(TOPLANTI_TURLERI),
  katilimciSayisi: z.number().int().min(0).nullable(),
  katilimciAtif: Atif.nullable(),
  kararlar: z.array(z.object({ metin: z.string().min(1), atif: Atif })),
  eylemAdaylari: z.array(z.object({ metin: z.string().min(1), sorumlu: z.string().nullable(), atif: Atif })),
});

export type ToplantiBilgisiCiktisi = z.infer<typeof ToplantiBilgisiSemasi>;

/** Tutanağı modele göndermeden önce adları maskeler. */
export function tutanagiMaskele(g: ToplantiBilgisiGirdisi): { kanit: AtifKaynagi; eslemeler: Esleme[] } {
  const m = maskeleyici({ adlar: g.adlar ?? [] });
  const kanit = { ozet: g.kanit.ozet, parcalar: g.kanit.parcalar.map((p) => ({ ...p, metin: m.maskele(p.metin) })) };
  return { kanit, eslemeler: m.eslemeler };
}

function atifParcalari(atif: string, kanit: AtifKaynagi): string[] {
  const a = atiflariAyristir(atif)[0];
  if (!a) return [];
  const sayfa = a.capa?.sayfa;
  return kanit.parcalar.filter((p) => sayfa === undefined || p.capa.sayfa === sayfa).map((p) => p.metin);
}

export const toplantiBilgisi: Gorev<ToplantiBilgisiGirdisi, typeof ToplantiBilgisiSemasi> = {
  ad: "toplanti-bilgisi",
  sema: ToplantiBilgisiSemasi,
  istem(g) {
    const { kanit } = tutanagiMaskele(g);
    return [
      {
        rol: "sistem",
        icerik: `Sen bir toplantı tutanağı okuyucususun. Tutanaktan tarihi (YYYY-AA-GG), toplantı türünü, katılımcı sayısını (yalnız tutanakta yazıyorsa ya da adlar sayılabiliyorsa), alınan kararları ve eylem adaylarını çıkar. Her karar ve eylem atıflı olmalı. Kişi adları [KİŞİ-n] biçiminde maskelidir; maskeyi çözmeye çalışma.\n${ORTAK_KURALLAR}`,
      },
      { rol: "kullanici", icerik: `Tutanak:\n${kanitBlogu(kanit, "tutanak")}` },
    ];
  },
  denetle(c, g) {
    const { kanit } = tutanagiMaskele(g);
    const sorunlar: KuralSorunu[] = [];
    const atifDenetle = (alan: string, atif: string | null) => {
      if (!atif) return;
      for (const a of atiflariAyristir(atif))
        for (const s of atifDogrula(a, [kanit]))
          if (s.tur !== "taninmayan_konum") sorunlar.push({ alan, aciklama: s.aciklama });
    };
    if (c.tarih) {
      if (!c.tarihAtif) sorunlar.push({ alan: "tarih", aciklama: "Tarih atıfsız." });
      else {
        atifDenetle("tarihAtif", c.tarihAtif);
        const metinler = atifParcalari(c.tarihAtif, kanit);
        if (!metinler.some((m) => sayilariCikar(m).some((s) => s.tur === "tarih" && s.deger === c.tarih)))
          sorunlar.push({ alan: "tarih", aciklama: "Tarih atıf yapılan yerde geçmiyor." });
      }
    }
    if (c.katilimciSayisi !== null) {
      if (!c.katilimciAtif) sorunlar.push({ alan: "katilimciSayisi", aciklama: "Katılımcı sayısı atıfsız." });
      else {
        atifDenetle("katilimciAtif", c.katilimciAtif);
        const metinler = atifParcalari(c.katilimciAtif, kanit);
        const yazili = metinler.some((m) =>
          sayilariCikar(m).some((s) => s.tur === "sayi" && s.deger === c.katilimciSayisi),
        );
        const sayilan = metinler.some((m) => new Set(m.match(/\[KİŞİ-\d+\]/gu) ?? []).size === c.katilimciSayisi);
        if (!yazili && !sayilan)
          sorunlar.push({
            alan: "katilimciSayisi",
            aciklama: "Katılımcı sayısı tutanakta yazılı değil ve sayılamıyor.",
          });
      }
    }
    for (const [i, k] of c.kararlar.entries()) atifDenetle(`kararlar.${i}.atif`, k.atif);
    for (const [i, e] of c.eylemAdaylari.entries()) atifDenetle(`eylemAdaylari.${i}.atif`, e.atif);
    return sorunlar;
  },
};
