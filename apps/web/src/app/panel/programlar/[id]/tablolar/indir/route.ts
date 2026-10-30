// Program tablolarını Word ya da Excel olarak indirir (İP-47). Gerçek veri kipinde oturumdaki kişinin
// yetkisiyle; örnek kipte kurgu veriden. EKSİK hücre belgede EKSİK yazılır.

import { tabloSablonuDocx, tabloSablonuXlsx } from "@akredit/belge";
import { sablonTablosu } from "@akredit/cerceveler";
import { GERCEK_VERI, servisBaglami, tabloDurumu } from "../sunucu.ts";

const MIME = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
} as const;

export async function GET(istek: Request, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const { id } = await params;
  const u = new URL(istek.url);
  const bicim = u.searchParams.get("bicim") === "xlsx" ? "xlsx" : "docx";
  const cerceveKod = u.searchParams.get("cerceve") ?? "";
  const metin = (ileti: string, durum: number) =>
    new Response(ileti, { status: durum, headers: { "content-type": "text/plain; charset=utf-8" } });
  let icerik: Uint8Array;
  if (GERCEK_VERI) {
    const { odrTablolari, ServisHatasi } = await import("@akredit/servis");
    try {
      icerik = (await odrTablolari.tabloBelgesi(await servisBaglami(), { programId: id, cerceveKod, bicim })).icerik;
    } catch (e) {
      if (e instanceof ServisHatasi) return metin(e.message, e.kod === "yetki_yok" ? 403 : 400);
      if (e && typeof e === "object" && "issues" in e) return metin("İstek geçersiz. Sayfadan yeniden indirin.", 400);
      throw e;
    }
  } else {
    const r = await tabloDurumu(id, "Örnek program", cerceveKod);
    if (!r.tamam) return metin(r.ileti, 400);
    const belge = {
      baslik: `${r.durum.cerceve.ad}: ÖDR tabloları`,
      altBaslik: r.durum.program.ad,
      tablolar: r.durum.tablolar.map(sablonTablosu),
    };
    icerik = bicim === "docx" ? await tabloSablonuDocx(belge) : await tabloSablonuXlsx(belge);
  }
  return new Response(new Uint8Array(icerik), {
    headers: {
      "content-type": MIME[bicim],
      "content-disposition": `attachment; filename="${cerceveKod.replace(/[^a-z0-9-]/giu, "")}-tablolar.${bicim}"`,
      "cache-control": "no-store",
    },
  });
}
