// /deneyin ölçüt ve kanıt aramasının saf mantığı. Tarayıcıda çalışır; ağ yok.
// Arama ve getirme herkese açık MCP'nin olcut_ara ve olcut_getir araçlarıdır (apps/acik-mcp/src/araclar.ts, yalnız
// içe aktarılır). Metin yalnız resmî belgeden çıkarılmış çerçeve verisinden gelir (ilke 6); alınamayan metin
// DOĞRULANMADI döner. Kanıt gereksinimleri Akredit'in iç önerisidir, resmî metin değildir.

import { PROGRAM_CERCEVELERI, tumOlcutler, YOKAK_KURUMSAL_3_3 } from "@akredit/cerceveler";
import { ACIK_ARACLAR } from "../../../acik-mcp/src/araclar.ts";
import type { Kaynak } from "../../../acik-mcp/src/temel.ts";

export const CERCEVE_SECENEKLERI = [YOKAK_KURUMSAL_3_3, ...PROGRAM_CERCEVELERI].map((c) => ({
  kod: c.kod,
  ad: `${c.ad} ${c.surum}`,
}));

export interface AramaSonucu {
  kod: string;
  baslik: string;
  ozet: string;
}

export interface OlcutAyrintisi {
  cerceve: string;
  kod: string;
  baslik: string;
  metin: string;
  dogrulanmadi: boolean;
  uzmanOnayiBekliyor: boolean;
  kaynak: Kaynak | null;
  kanitlar: { tur: string; aciklama: string }[];
}

function calistir(ad: string, girdi: unknown): unknown {
  const a = ACIK_ARACLAR.find((x) => x.ad === ad);
  if (!a) throw new Error(`${ad} bulunamadı.`);
  const r = a.calistir(a.girdi.parse(girdi), { simdi: () => new Date(0) });
  if (r instanceof Promise) throw new Error("Beklenmeyen eşzamansız sonuç.");
  return r;
}

export function olcutAra(sorgu: string, cerceve: string, enFazla = 15): { toplam: number; sonuclar: AramaSonucu[] } {
  const q = sorgu.trim();
  if (!q) return { toplam: 0, sonuclar: [] };
  const r = calistir("olcut_ara", { sorgu: q.slice(0, 200), cerceve, en_fazla: enFazla }) as {
    sonuc: { toplamEslesme: number; olcutler: AramaSonucu[] };
  };
  return {
    toplam: r.sonuc.toplamEslesme,
    sonuclar: r.sonuc.olcutler.map((o) => ({ kod: o.kod, baslik: o.baslik, ozet: o.ozet })),
  };
}

export function olcutGetir(kod: string, cerceve: string): OlcutAyrintisi {
  const r = calistir("olcut_getir", { kod, cerceve }) as {
    sonuc: {
      cerceve: string;
      kod: string;
      baslik: string;
      metin: string;
      metinDurumu: string;
      uzmanDogrulamasi: string;
    };
    kaynak: Kaynak[];
  };
  const c = [YOKAK_KURUMSAL_3_3, ...PROGRAM_CERCEVELERI].find((x) => x.kod === cerceve);
  const o = c ? tumOlcutler(c.olcutler).find((x) => x.kod === r.sonuc.kod) : undefined;
  return {
    cerceve: r.sonuc.cerceve,
    kod: r.sonuc.kod,
    baslik: r.sonuc.baslik,
    metin: r.sonuc.metin,
    dogrulanmadi: r.sonuc.metinDurumu === "dogrulanmadi",
    uzmanOnayiBekliyor: r.sonuc.uzmanDogrulamasi !== "yapıldı",
    kaynak: r.kaynak[0] ?? null,
    kanitlar: (o?.kanitGereksinimleri ?? []).map((k) => ({ tur: k.tur, aciklama: k.aciklama })),
  };
}
