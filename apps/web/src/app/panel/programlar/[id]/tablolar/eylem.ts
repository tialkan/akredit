"use server";

// Eşleme onayı (İP-47). Kişinin seçtiği her satır için ayrı karar yazılır; dayanak ortaktır. Karar yalnız
// eklenir, adı, zamanı ve dayanağıyla günlüğe girer (servis katmanı). Örnek veri kipinde kaydedilmez.

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { kararIstekleri } from "./gorunum.ts";
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
