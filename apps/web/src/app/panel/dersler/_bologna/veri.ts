// Bologna sayfalarının sunucu tarafı veri kaynağı (İP-15). Gerçek veri kipinde oturumdan servis bağlamını kurar
// ve Bologna servisini çağırır; örnek kipte kurgu kayıtlar döner (adlar, kodlar ve sayılar uydurmadır).

import type { bologna } from "@akredit/servis";
import { GERCEK_VERI } from "../../../../veri/sunucu.ts";

export type GecmisKaydi = bologna.GecmisKaydi;
export type ProgramDenetimi = bologna.ProgramDenetimi;
export interface ProgramOzeti {
  id: string;
  ad: string;
  denetim: ProgramDenetimi;
}

export const ORNEK_GECMIS: GecmisKaydi[] = [
  {
    oneriId: "ornek-taslak-1",
    zaman: "2026-10-20T09:00:00.000Z",
    karar: "onaylandi",
    kararZamani: "2026-10-20T09:12:00.000Z",
    hata: 0,
    uyari: 1,
    fark: [{ alan: "isyuku", neden: ["K8: Toplam iş yükü 164 saat, AKTS 5 × 30 = 150 olmalı."] }],
    yazmaPlaniId: "ornek-plan-1",
  },
  {
    oneriId: "ornek-taslak-2",
    zaman: "2026-10-26T10:00:00.000Z",
    karar: null,
    kararZamani: null,
    hata: 0,
    uyari: 0,
    fark: [{ alan: "ska", neden: ["Hoca beyanı ya da yeniden üretim."] }],
    yazmaPlaniId: null,
  },
];

export const ORNEK_DENETIM: ProgramOzeti[] = [
  {
    id: "ornek-program",
    ad: "Bilgisayar Programcılığı",
    denetim: {
      programId: "ornek-program",
      okuma: { kanitId: "ornek-okuma-2", okundu: "2026-10-20T08:00:00.000Z" },
      oncekiOkuma: { kanitId: "ornek-okuma-1", okundu: "2026-10-01T08:00:00.000Z" },
      bulgular: [
        { duzey: "uyari", kural: "akts-isyuku", konu: "BP104", aciklama: "İş yükü AKTS ile tutarsız." },
        { duzey: "hata", kural: "matris-bos", konu: "BP106", aciklama: "Zorunlu dersin matris satırı boş." },
      ],
      dersler: [
        { kod: "BP102", once: { hata: 2, uyari: 1 }, sonra: { hata: 0, uyari: 0 }, degisim: "iyilesti" },
        { kod: "BP104", once: { hata: 0, uyari: 1 }, sonra: { hata: 0, uyari: 1 }, degisim: "ayni" },
        { kod: "BP106", once: null, sonra: { hata: 1, uyari: 0 }, degisim: "yeni" },
      ],
    },
  },
];

async function baglam() {
  const [{ headers }, { redirect }, { tekiller }, { aktorOlustur }, erisim] = await Promise.all([
    import("next/headers"),
    import("next/navigation"),
    import("../../../api/_ortak/sunucu.ts"),
    import("../../../api/_ortak/v1.ts"),
    import("../../../../kimlik/erisim.ts"),
  ]);
  const { kimlik, db } = await tekiller();
  try {
    const b = await erisim.istekBaglami(
      kimlik,
      new Request(kimlik.ayar.temelAdres, { headers: new Headers(await headers()) }),
    );
    return { db, aktor: aktorOlustur(b), simdi: () => new Date() };
  } catch (e) {
    if (e instanceof erisim.ErisimHatasi) redirect("/giris");
    throw e;
  }
}

export async function taslakGecmisi(dersId: string): Promise<GecmisKaydi[]> {
  if (!GERCEK_VERI) return ORNEK_GECMIS;
  const { bologna } = await import("@akredit/servis");
  return bologna.taslakGecmisi(await baglam(), dersId);
}

/** Aktörün görebildiği programların Bologna denetimi. */
export async function programDenetimleri(): Promise<ProgramOzeti[]> {
  if (!GERCEK_VERI) return ORNEK_DENETIM;
  const { akademik, bologna, ServisHatasi } = await import("@akredit/servis");
  const b = await baglam();
  const sonuc: ProgramOzeti[] = [];
  for (const p of await akademik.programlar(b)) {
    try {
      sonuc.push({ id: p.id, ad: p.ad, denetim: await bologna.programDenetimi(b, p.id) });
    } catch (e) {
      if (!(e instanceof ServisHatasi)) throw e;
    }
  }
  return sonuc;
}
