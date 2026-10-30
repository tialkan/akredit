"use server";

// Prova işareti (İP-48): "Hazırım" ya da "Eksik var". Eksik var işareti komisyona görev açar. Örnek veri
// kipinde hiçbir şey kaydedilmez.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { GERCEK_VERI, servisBaglami } from "./sunucu.ts";

export async function provaKaydet(f: FormData): Promise<void> {
  const programId = String(f.get("program") ?? "");
  const cerceveKod = String(f.get("cerceve") ?? "");
  const rol = String(f.get("rol") ?? "");
  const soruId = String(f.get("soru") ?? "");
  const durum = String(f.get("durum") ?? "");
  const adres = new URLSearchParams({ program: programId, cerceve: cerceveKod, rol });
  if (!GERCEK_VERI) {
    adres.set("ileti", "ornek");
    redirect(`/panel/saha-ziyareti?${adres.toString()}#soru-${soruId}`);
  }
  const { sahaZiyareti, ServisHatasi } = await import("@akredit/servis");
  try {
    const r = await sahaZiyareti.provaIsaretle(await servisBaglami(), { programId, cerceveKod, soruId, rol, durum });
    adres.set("ileti", r.durum === "eksik_var" ? (r.zatenVardi ? "gorev-var" : "gorev") : "hazir");
  } catch (e) {
    if (!(e instanceof ServisHatasi)) throw e;
    adres.set("ileti", e.kod === "yetki_yok" ? "yetki" : "hata");
  }
  revalidatePath("/panel/saha-ziyareti");
  redirect(`/panel/saha-ziyareti?${adres.toString()}#soru-${soruId}`);
}
