// Belge isteği işleri (İP-45). Süreç motorunun turunda (surec.tik, beş dakikada bir) her kurum için çalışır:
// 1) Hatırlatma: son tarihe 48 saatten az kalan, yüklenmemiş isteğe bir kez hatırlatma e-postası. Jeton
//    saklanmadığından hatırlatma bağlantı içermez. Sonuç (gönderildi ya da gönderilmedi) kayda geçer.
// 2) Kanıt hattı: web sunucusu yüklenen dosyayı "bekliyor" durumuyla kaydeder ama kuyruğa koymaz; burada henüz
//    işlenmeye başlanmamış dış birim kanıtları metin çıkarma kuyruğuna konur (tekil anahtarla, tekrar etmez).

import { belgeIstegi } from "@akredit/servis";
import type { EpostaTasiyici } from "@akredit/surec";
import { kiraciIslemi, type SorguSonucu, satirlar, type Vt } from "@akredit/vt";
import { sql } from "drizzle-orm";
import { type HatBaglami, KUYRUK } from "../kanit-hatti/index.ts";

export interface BelgeIstegiTuru {
  hatirlatilan: number;
  gonderilemeyen: number;
  kuyrugaKonan: number;
}

/** Hatırlatmaları gönderir. */
export async function hatirlatmalariGonder(
  db: Vt,
  tasiyici: EpostaTasiyici,
  kurumId: string,
  simdi: Date,
): Promise<{ hatirlatilan: number; gonderilemeyen: number }> {
  let hatirlatilan = 0;
  let gonderilemeyen = 0;
  for (const h of await belgeIstegi.hatirlatilacaklar(db, kurumId, simdi)) {
    let neden: string | null = null;
    try {
      await tasiyici.gonder({ alici: h.aliciEposta, ...belgeIstegi.hatirlatmaIletisi(h) });
      hatirlatilan++;
    } catch {
      neden = "Hatırlatma e-postası gönderilemedi.";
      gonderilemeyen++;
    }
    await belgeIstegi.gonderimYaz(db, kurumId, h.id, "hatirlatma", neden ? "gonderilmedi" : "gonderildi", neden, simdi);
  }
  return { hatirlatilan, gonderilemeyen };
}

/** Yalnız "bekliyor" durumunda kalmış dış birim kanıtlarını metin çıkarma kuyruğuna koyar. */
export async function bekleyenleriKuyrugaKoy(hat: HatBaglami, kurumId: string): Promise<number> {
  const idler = await kiraciIslemi(hat.db, kurumId, async (tx) =>
    satirlar(
      (await tx.execute(sql`
        select distinct y.kanit_id as id from belge_istegi_yuklemesi y
        where not exists (
          select 1 from kanit_isleme i where i.kanit_id = y.kanit_id and i.durum <> 'bekliyor'
        )`)) as unknown as SorguSonucu<{ id: string }>,
    ).map((x) => x.id),
  );
  for (const kanitId of idler)
    await hat.kuyruk.gonder(KUYRUK.cikar, { kurumId, kanitId }, { tekilAnahtar: `${KUYRUK.cikar}:${kanitId}` });
  return idler.length;
}

/** Bir kurum için belge isteği turu. */
export async function belgeIstegiTuru(
  hat: HatBaglami,
  tasiyici: EpostaTasiyici,
  kurumId: string,
  simdi: Date,
): Promise<BelgeIstegiTuru> {
  const h = await hatirlatmalariGonder(hat.db, tasiyici, kurumId, simdi);
  return { ...h, kuyrugaKonan: await bekleyenleriKuyrugaKoy(hat, kurumId) };
}
