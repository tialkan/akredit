// Rapor okuyucusunun sunucu tarafı (İP-44). Gerçek veri kipinde kanıtlar ve dil denetimi servisten, okuyanın
// yetkisiyle okunur. Örnek veri kipinde kanıtlar veri kaynağından gelir, dil denetimi aynı saf kurallarla
// sayfada hesaplanır.

import { dilDenetle } from "@akredit/cekirdek";
import { rapor as raporServisi, type ServisBaglami } from "@akredit/servis";
import type { Rapor, VeriKaynagi } from "../../../veri/kaynak.ts";
import type { DilOzetiBulgusu } from "./dil-denetimi.tsx";
import { type OkuyucuBolumu, type OkuyucuKaniti, okuyucuModeli } from "./okuyucu-modeli.ts";

export interface OkuyucuVerisi {
  bolumler: OkuyucuBolumu[];
  kanitlar: OkuyucuKaniti[];
  erisilemeyen: string[];
  dil: DilOzetiBulgusu[];
  yayimUyarisi: string | null;
}

function atifliKimlikler(r: Rapor): string[] {
  return [...new Set(r.bolumler.flatMap((b) => b.paragraflar.flatMap((p) => p.atiflar.map((a) => a.kanitId))))];
}

/** Servis bağlamıyla (gerçek veri, panel ya da portal). `dilDahil: false`: kurum içi dil bulguları gösterilmez (değerlendirici portalı). */
export async function okuyucuVerisiServisten(b: ServisBaglami, r: Rapor, dilDahil = true): Promise<OkuyucuVerisi> {
  const [panel, dil] = await Promise.all([
    raporServisi.kanitPaneli(b, atifliKimlikler(r)),
    dilDahil ? raporServisi.dilDenetimi(b, r.id) : Promise.resolve({ bulgular: [], yayimUyarisi: null }),
  ]);
  return {
    bolumler: okuyucuModeli(r.bolumler, panel.kanitlar, dil.bulgular),
    kanitlar: panel.kanitlar,
    erisilemeyen: panel.erisilemeyen,
    dil: dil.bulgular,
    yayimUyarisi: dil.yayimUyarisi,
  };
}

/** Örnek veri kipi: kanıtlar veri kaynağından, dil denetimi saf kurallarla. Öneri kaydı yoktur. */
export async function okuyucuVerisiKaynaktan(kaynak: VeriKaynagi, r: Rapor): Promise<OkuyucuVerisi> {
  const kanitlar: OkuyucuKaniti[] = [];
  const erisilemeyen: string[] = [];
  for (const id of atifliKimlikler(r)) {
    const a = await kaynak.kanit(id);
    if (!a) {
      erisilemeyen.push(id);
      continue;
    }
    kanitlar.push({
      id: a.kanit.id,
      baslik: a.kanit.baslik,
      dosyaAdi: a.kanit.dosyaAdi,
      ozet: a.kanit.ozet,
      parcalar: a.parcalar.map((p) => ({ id: p.id, sira: p.sira, metin: p.metin, capa: p.capa })),
      onay: null,
    });
  }
  const dil = r.bolumler.flatMap((b) =>
    dilDenetle(b.paragraflar.map((p) => p.metin).join("\n\n"), r.donem ? { donem: r.donem } : {}).map((x) => ({
      ...x,
      bolumId: b.id,
      bolumBasligi: b.baslik,
      acik: true,
    })),
  );
  const yuksek = dil.filter((x) => x.onem === "yuksek").length;
  return {
    bolumler: okuyucuModeli(r.bolumler, kanitlar, dil),
    kanitlar,
    erisilemeyen,
    dil,
    yayimUyarisi: yuksek
      ? `Raporda kararı verilmemiş ${yuksek} yüksek önemli dil bulgusu var. Yayımlamadan önce bulguları inceleyin.`
      : null,
  };
}
