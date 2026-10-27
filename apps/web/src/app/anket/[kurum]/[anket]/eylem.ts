"use server";

// Yanıt gönderme. Yanıt kişiye bağlanmadan kaydedilir; bu işlem hiçbir şey günlüğe yazmaz.
// Açık bağlantılı ankette tekrar yanıt engeli için tarayıcıya rastgele, kimliksiz bir belirteç çerezi konur.

import { randomBytes } from "node:crypto";
import { rastgeleBelirtec } from "@akredit/anket/temel";
import { cookies } from "next/headers";
import { gercekVeriMi } from "../../../api/_ortak/sunucu.ts";
import { anketBaglami, ORNEK_KURUM } from "../../sunucu.ts";

export interface GonderimDurumu {
  durum: "bos" | "tamam" | "hata";
  ileti?: string;
}

/** Form verisini soru kodu → değer nesnesine çevirir (boşlar atlanır). */
function formuYanitaCevir(f: FormData, coklu: string[]): Record<string, unknown> {
  const y: Record<string, unknown> = {};
  for (const [k, v] of f.entries()) {
    if (!k.startsWith("s:") || typeof v !== "string" || v === "") continue;
    const kod = k.slice(2);
    if (coklu.includes(kod)) y[kod] = [...((y[kod] as string[] | undefined) ?? []), v];
    else y[kod] = v;
  }
  return y;
}

export async function yanitGonder(_onceki: GonderimDurumu, f: FormData): Promise<GonderimDurumu> {
  const kurumId = String(f.get("kurum") ?? "");
  const anketId = String(f.get("anket") ?? "");
  const coklu = String(f.get("coklu") ?? "")
    .split(",")
    .filter(Boolean);
  if (f.get("aydinlatma") !== "evet")
    return { durum: "hata", ileti: "Devam etmek için aydınlatma metnini okuduğunuzu işaretleyin." };
  const yanit = formuYanitaCevir(f, coklu);
  if (kurumId === ORNEK_KURUM || !gercekVeriMi())
    return { durum: "tamam", ileti: "Bu bir örnek anket; yanıtınız kaydedilmedi." };
  let belirtec = String(f.get("b") ?? "");
  if (!belirtec) {
    const c = await cookies();
    const ad = `akredit_anket_${anketId.replace(/[^0-9a-f-]/giu, "")}`;
    belirtec = c.get(ad)?.value ?? rastgeleBelirtec(randomBytes(24));
    c.set(ad, belirtec, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 31_536_000,
      path: "/anket",
    });
  }
  try {
    const { yanitKaydet, AnketHatasi } = await import("@akredit/anket/vt");
    try {
      await yanitKaydet(await anketBaglami(), { kurumId, anketId, belirtec, yanit });
    } catch (e) {
      if (e instanceof AnketHatasi) return { durum: "hata", ileti: e.message };
      throw e;
    }
    return { durum: "tamam", ileti: "Teşekkürler, yanıtınız kaydedildi." };
  } catch {
    return { durum: "hata", ileti: "Yanıtınız şu anda kaydedilemedi. Biraz sonra yeniden deneyin." };
  }
}
