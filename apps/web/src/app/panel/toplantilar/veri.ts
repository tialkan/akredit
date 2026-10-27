// Toplantılar sayfasının veri kaynağı. Gerçek veri kipinde oturumdan servis bağlamını kurar ve toplantı
// servisini çağırır; örnek kipte örnek toplantılar döner (adlar ve tarihler uydurmadır).

import type { toplanti } from "@akredit/servis";
import { GERCEK_VERI } from "../../../veri/sunucu.ts";

export type Toplanti = toplanti.ToplantiGorunumu;

const acilis = {
  sira: 1,
  baslik: "Açılış ve önceki toplantı kararlarının izlenmesi",
  kaynak: { tur: "acilis" as const, id: null },
  gecikmis: false,
  olcutKodlari: [],
};

export const ORNEK_TOPLANTILAR: Toplanti[] = [
  {
    id: "ornek-toplanti-1",
    baslik: "Kalite komisyonu ekim toplantısı",
    zaman: "2026-10-30T07:00:00.000Z",
    hedef: { tur: "kurum", id: "ornek" },
    katilimciSayisi: 6,
    durum: "taslak_onayda",
    tutanakKanitId: null,
    gundem: [
      acilis,
      {
        sira: 2,
        baslik: "Eksik iş: Ders dosyasını tamamla",
        kaynak: { tur: "gorev", id: "g1" },
        gecikmis: true,
        olcutKodlari: [],
      },
      { sira: 3, baslik: "Dilek ve temenniler", kaynak: { tur: "dilek", id: null }, gecikmis: false, olcutKodlari: [] },
    ],
  },
  {
    id: "ornek-toplanti-2",
    baslik: "Danışma kurulu bahar toplantısı",
    zaman: "2026-04-15T08:00:00.000Z",
    hedef: { tur: "kurum", id: "ornek" },
    katilimciSayisi: 9,
    durum: "kesinlesti",
    tutanakKanitId: "ornek-kanit",
    gundem: [
      acilis,
      { sira: 2, baslik: "Dilek ve temenniler", kaynak: { tur: "dilek", id: null }, gecikmis: false, olcutKodlari: [] },
    ],
  },
];

export async function toplantilariGetir(): Promise<Toplanti[]> {
  if (!GERCEK_VERI) return ORNEK_TOPLANTILAR;
  const [{ headers }, { redirect }, { tekiller }, { aktorOlustur }, erisim, servis] = await Promise.all([
    import("next/headers"),
    import("next/navigation"),
    import("../../api/_ortak/sunucu.ts"),
    import("../../api/_ortak/v1.ts"),
    import("../../../kimlik/erisim.ts"),
    import("@akredit/servis"),
  ]);
  const basliklar = new Headers(await headers());
  const { kimlik, db } = await tekiller();
  try {
    const b = await erisim.istekBaglami(kimlik, new Request(kimlik.ayar.temelAdres, { headers: basliklar }));
    return await servis.toplanti.toplantilar({ db, aktor: aktorOlustur(b), simdi: () => new Date() });
  } catch (e) {
    if (e instanceof erisim.ErisimHatasi) redirect("/giris");
    throw e;
  }
}
