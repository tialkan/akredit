"use server";

// Eşleme onayı (İP-47). Kişinin seçtiği her satır için ayrı karar yazılır; dayanak ortaktır. Karar yalnız
// eklenir, adı, zamanı ve dayanağıyla günlüğe girer (servis katmanı). Örnek veri kipinde kaydedilmez.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { kararIstekleri, ozguSecimleri } from "./gorunum.ts";
import { GERCEK_VERI, servisBaglami } from "./sunucu.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

export async function eslemeKaydet(f: FormData): Promise<void> {
  const programId = String(f.get("program") ?? "");
  const cerceveKod = String(f.get("cerceve") ?? "");
  const dayanak = String(f.get("dayanak") ?? "").trim();
  if (!UUID.test(programId) && GERCEK_VERI) redirect("/panel");
  const yol = `/panel/programlar/${programId}/tablolar`;
  const git = (ileti: string) => redirect(`${yol}?${new URLSearchParams({ cerceve: cerceveKod, ileti })}#eslemeler`);
  if (!GERCEK_VERI) git("ornek");
  if (dayanak.length < 3) git("dayanak");
  const { odrTablolari, ServisHatasi } = await import("@akredit/servis");
  const b = await servisBaglami();
  let ileti = "kaydedildi";
  try {
    const d = await odrTablolari.programTablolari(b, { programId, cerceveKod });
    const istekler = kararIstekleri(f, d);
    if (!istekler.length) ileti = "degisiklik";
    for (const k of istekler) await odrTablolari.eslemeKarariVer(b, { programId, cerceveKod, ...k, dayanak });
  } catch (e) {
    if (!(e instanceof ServisHatasi)) throw e;
    ileti = e.kod === "yetki_yok" ? "yetki" : "hata";
  }
  revalidatePath(yol);
  git(ileti);
}

/** "Öneri iste" (İP-47): istek günlüğe yazılır, işçi yapay zekâ önerisini hazırlar. Öneri karar değildir. */
export async function oneriIste(f: FormData): Promise<void> {
  const programId = String(f.get("program") ?? "");
  const cerceveKod = String(f.get("cerceve") ?? "");
  if (!UUID.test(programId) && GERCEK_VERI) redirect("/panel");
  const yol = `/panel/programlar/${programId}/tablolar`;
  const git = (ileti: string) => redirect(`${yol}?${new URLSearchParams({ cerceve: cerceveKod, ileti })}#eslemeler`);
  if (!GERCEK_VERI) git("oneri_ornek");
  const { odrTablolari, ServisHatasi } = await import("@akredit/servis");
  let ileti = "oneri_istendi";
  try {
    await odrTablolari.yzOnerisi.oneriIste(await servisBaglami(), { programId, cerceveKod });
  } catch (e) {
    if (!(e instanceof ServisHatasi)) throw e;
    ileti = e.kod === "yetki_yok" ? "yetki" : "oneri_hata";
  }
  revalidatePath(yol);
  git(ileti);
}

/**
 * Disiplin ya da program seçimi (İP-47): MÜDEK EK-1 ve FEDEK programa özgü ölçütler için hangi bölümün
 * geçerli olduğunu kurum seçer; Akredit tahmin etmez. Karar adıyla, zamanıyla ve dayanağıyla günlüğe girer.
 */
export async function ozguSecimKaydet(f: FormData): Promise<void> {
  const programId = String(f.get("program") ?? "");
  const cerceveKod = String(f.get("cerceve") ?? "");
  const dayanak = String(f.get("dayanak") ?? "").trim();
  if (!UUID.test(programId) && GERCEK_VERI) redirect("/panel");
  const yol = `/panel/programlar/${programId}/tablolar`;
  const git = (ileti: string) => redirect(`${yol}?${new URLSearchParams({ cerceve: cerceveKod, ileti })}#ozgu`);
  if (!GERCEK_VERI) git("ornek");
  if (dayanak.length < 3) git("dayanak");
  const { odrTablolari, ServisHatasi } = await import("@akredit/servis");
  const ozet = odrTablolari.tabloCerceveleri().find((c) => c.kod === cerceveKod);
  const secim = ozguSecimleri(f, ozet?.ozgu?.bolumler.map((b) => b.kod) ?? []);
  if (!secim.length) git("ozgu_secim");
  let ileti = "ozgu_kaydedildi";
  try {
    await odrTablolari.eslemeKarariVer(await servisBaglami(), {
      programId,
      cerceveKod,
      tur: "ozgu_bolum",
      anahtar: odrTablolari.OZGU_ANAHTARI,
      deger: secim,
      dayanak,
    });
  } catch (e) {
    if (!(e instanceof ServisHatasi)) throw e;
    ileti = e.kod === "yetki_yok" ? "yetki" : "ozgu_hata";
  }
  revalidatePath(yol);
  git(ileti);
}
