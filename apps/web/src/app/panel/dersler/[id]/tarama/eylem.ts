"use server";

// Sınav taraması ekranının sunucu eylemleri (İP-43). Yetki, doğrulama ve bütün kurallar servis katmanındadır;
// burada yalnız oturumdan bağlam kurulur ve sonuç ekranın biçimine çevrilir. Numara hiçbir yanıtta yoktur.

import { ServisHatasi, sinavTarama } from "@akredit/servis";
import { revalidatePath } from "next/cache";
import { GERCEK_VERI, servisBaglami } from "../../../../../veri/sunucu.ts";
import { ortamdanDepo } from "../../../../api/_ortak/kopruler.ts";
import { ORNEK_KIP_ILETISI } from "../../_bologna/istemci.ts";
import type { Hucre, Tarama } from "./veri.ts";

export type EylemSonucu<T = null> = { tamam: true; veri: T } | { tamam: false; ileti: string };

const GENEL = "İşlem tamamlanamadı. Sayfayı yenileyip yeniden deneyin; sorun sürerse yöneticinize bildirin.";

async function calistir<T>(is: () => Promise<T>): Promise<EylemSonucu<T>> {
  if (!GERCEK_VERI) return { tamam: false, ileti: ORNEK_KIP_ILETISI };
  try {
    return { tamam: true, veri: await is() };
  } catch (e) {
    if (e instanceof ServisHatasi) return { tamam: false, ileti: e.message };
    if (e && typeof e === "object" && "issues" in e)
      return { tamam: false, ileti: "Bilgiler eksik ya da hatalı. Alanları düzeltip yeniden deneyin." };
    // Yönlendirme (oturum yok) gibi Next denetim hataları yukarı geçer.
    if (e && typeof e === "object" && "digest" in e) throw e;
    console.error("[sinav-tarama]", e instanceof Error ? e.message : String(e));
    return { tamam: false, ileti: GENEL };
  }
}

function ekranBicimi(g: sinavTarama.TaramaGorunumu): Tarama {
  return {
    taramaId: g.taramaId,
    kagitSayisi: g.kagitSayisi,
    saglayici: g.saglayici,
    model: g.model,
    esik: g.esik,
    aktarildi: g.aktarildi,
    otomatikOzet: g.otomatikOzet,
    sahip: g.sahip,
    hucreler: g.hucreler.map(
      (h): Hucre => ({
        hucreId: h.hucreId,
        kagitSira: h.kagitSira,
        alan: h.alan,
        deger: h.deger,
        azami: h.azami,
        guven: h.guven,
        nedenler: h.nedenler,
        katman: h.katman,
        karar: h.karar,
        kirpinti: h.kirpintiOzeti !== null,
      }),
    ),
  };
}

export async function taramaGetirEylem(taramaId: string): Promise<EylemSonucu<Tarama>> {
  return calistir(async () => ekranBicimi(await sinavTarama.taramaGorunumu(await servisBaglami(), taramaId)));
}

export async function sablonKaydetEylem(dersId: string, olcmeAraciId: string, sablon: unknown): Promise<EylemSonucu> {
  return calistir(async () => {
    await sinavTarama.sablonKaydet(await servisBaglami(), { olcmeAraciId, sablon });
    revalidatePath(`/panel/dersler/${dersId}/tarama`);
    return null;
  });
}

/** Hücre kararı; yanıt taramanın güncel görünümüdür (özet de yeniden hesaplanır). */
export async function hucreKarariEylem(
  taramaId: string,
  g: { hucreId: string; sonuc: "onaylandi" | "duzeltildi"; deger?: number | null; ogrenciNo?: string },
): Promise<EylemSonucu<Tarama>> {
  return calistir(async () => {
    const b = await servisBaglami();
    const anahtar = process.env.AKREDIT_TAKMA_AD_ANAHTARI ?? "";
    if (Buffer.byteLength(anahtar) < 32)
      throw new ServisHatasi("beklenmeyen", "Öğrenci takma ad anahtarı tanımlı değil. Sistem yöneticisine bildirin.");
    await sinavTarama.hucreKarari(b, g, anahtar);
    return ekranBicimi(await sinavTarama.taramaGorunumu(b, taramaId));
  });
}

export async function aktarEylem(
  dersId: string,
  taramaId: string,
  ozet: string,
): Promise<EylemSonucu<{ ogrenciSayisi: number; puanSayisi: number; otomatikSayisi: number }>> {
  return calistir(async () => {
    const s = await sinavTarama.puanlariAktar(await servisBaglami(), taramaId, { ozet });
    revalidatePath(`/panel/dersler/${dersId}/tarama`);
    return s;
  });
}

/** Numara kutusunun görüntüsü için kısa süreli bağlantı (yalnız tarama sahibi ve onay yetkilisi; günlüğe girer). */
export async function kirpintiEylem(hucreId: string): Promise<EylemSonucu<{ adres: string; bitis: string }>> {
  return calistir(async () => {
    const depo = ortamdanDepo(process.env);
    if (!depo) throw new ServisHatasi("kural_ihlali", "Kanıt deposu tanımlı değil. Yöneticinize bildirin.");
    return sinavTarama.kirpintiBaglantisi(await servisBaglami(), hucreId, { depo });
  });
}
