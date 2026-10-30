"use server";

// Dil bulgularını rapor kaydına öneri olarak ekler (İP-44). Yetki servis katmanında (`rapor.duzenle`).

import { rapor, ServisHatasi } from "@akredit/servis";
import { revalidatePath } from "next/cache";
import { GERCEK_VERI, servisBaglami } from "../../../../veri/sunucu.ts";

export type DilEylemDurumu = { durum: "bos" } | { durum: "tamam"; ileti: string } | { durum: "hata"; ileti: string };

export async function dilBulgulariniKaydetEylem(_onceki: DilEylemDurumu, f: FormData): Promise<DilEylemDurumu> {
  if (!GERCEK_VERI) return { durum: "hata", ileti: "Örnek veriyle öneri kaydedilemez." };
  const id = f.get("raporId");
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/iu.test(id))
    return { durum: "hata", ileti: "Rapor bulunamadı. Sayfayı yenileyip yeniden deneyin." };
  try {
    const s = await rapor.dilBulgulariniKaydet(await servisBaglami(), id);
    revalidatePath(`/panel/raporlar/${id}`);
    return {
      durum: "tamam",
      ileti: s.eklenen
        ? `${s.eklenen} bulgu onay kutusuna öneri olarak eklendi.`
        : "Yeni bulgu yok. Önceki bulgular onay kutusunda.",
    };
  } catch (e) {
    if (e instanceof ServisHatasi && e.kod === "yetki_yok")
      return { durum: "hata", ileti: "Bu raporu düzenleme yetkiniz yok. Kalite biriminden yetki isteyin." };
    throw e;
  }
}
