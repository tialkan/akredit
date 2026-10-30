// Belge isteği işleri (İP-45). Süreç motorunun turunda (surec.tik, beş dakikada bir) her kurum için çalışır:
// 1) Hatırlatma: son tarihe 48 saatten az kalan, yüklenmemiş isteğe bir kez hatırlatma e-postası. Jeton
//    saklanmadığından hatırlatma bağlantı içermez. Sonuç (gönderildi ya da gönderilmedi) kayda geçer.
// 2) Kanıt hattı: web sunucusu yüklenen dosyayı "bekliyor" durumuyla kaydeder ama kuyruğa koymaz; burada henüz
//    işlenmeye başlanmamış dış birim kanıtları metin çıkarma kuyruğuna konur (tekil anahtarla, tekrar etmez).

import { belgeIstegi } from "@akredit/servis";
import type { EpostaTasiyici } from "@akredit/surec";
import { gunlugeYaz, kiraciIslemi, type SorguSonucu, satirlar, sema, type Vt } from "@akredit/vt";
import { eq, sql } from "drizzle-orm";
import { type HatBaglami, KUYRUK, type VirusTarayici } from "../kanit-hatti/index.ts";

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

/**
 * Hesapsız yüklenen dosyayı `kanitAl` ile aynı tarayıcıdan geçirir (inceleme dalga 8, bulgu 2). Bulgu varsa
 * kanıt silinmez (ilke 4); işleme kaydı `hata` olarak eklenir, günlüğe yazılır ve dosya kuyruğa girmez.
 * Tarayıcıya ulaşılamazsa dosya bekler ve sonraki turda yeniden denenir. Tarayıcı kurulmamışsa (ClamAV yok)
 * davranış `kanitAl` ile aynıdır: tarama yapılmaz.
 */
async function taramadanGecti(hat: HatBaglami, virus: VirusTarayici, kurumId: string, kanitId: string) {
  const [k] = await kiraciIslemi(hat.db, kurumId, (tx) =>
    tx.select({ anahtar: sema.kanit.depoAnahtari }).from(sema.kanit).where(eq(sema.kanit.id, kanitId)),
  );
  if (!k) return false;
  let t: Awaited<ReturnType<VirusTarayici["tara"]>>;
  try {
    t = await virus.tara(await hat.depo.al(k.anahtar));
  } catch {
    return false;
  }
  if (t.temiz) return true;
  await kiraciIslemi(hat.db, kurumId, async (tx) => {
    await tx.insert(sema.kanitIsleme).values({
      kurumId,
      kanitId,
      durum: "hata",
      ayrinti: { asama: "virus_taramasi", ileti: "Dosyada zararlı yazılım bulundu; işlenmedi." },
    });
    await gunlugeYaz(tx, {
      aktor: { tur: "sistem", id: null },
      eylem: "kanit.zararli_bulundu",
      hedef: { tur: "kanit", id: kanitId },
      ayrinti: { tarayici: virus.ad, bulgu: t.bulgu.slice(0, 200), yol: "belge_istegi" },
    });
  });
  return false;
}

/** Yalnız "bekliyor" durumunda kalmış dış birim kanıtlarını (taramadan geçtiyse) metin çıkarma kuyruğuna koyar. */
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
  let konan = 0;
  for (const kanitId of idler) {
    if (hat.virus && !(await taramadanGecti(hat, hat.virus, kurumId, kanitId))) continue;
    await hat.kuyruk.gonder(KUYRUK.cikar, { kurumId, kanitId }, { tekilAnahtar: `${KUYRUK.cikar}:${kanitId}` });
    konan++;
  }
  return konan;
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
