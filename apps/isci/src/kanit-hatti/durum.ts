// İşleme durumu: `kanit_isleme` tablosuna her adımda yeni satır eklenir (yalnız ekleme; eski durum silinmez).
// Bir kanıtın güncel durumu son satırdır. Panel `durumOzeti` ile kurumun bütün kanıtlarını izler.

import { type Islem, kiraciIslemi, type SorguSonucu, satirlar, sema, type Vt } from "@akredit/vt";
import { sql } from "drizzle-orm";

export type IslemeDurumu = "bekliyor" | "metin_cikarildi" | "ocr_gerekli" | "gomme_tamam" | "hata";

/** Hattın adımları; `kanit_isleme.ayrinti.asama` alanında tutulur. */
export type Asama = "alindi" | "cikarma" | "ocr" | "kvkk" | "gomme" | "siniflama" | "tamam";

export interface DurumAyrintisi {
  asama: Asama;
  /** Kullanıcıya gösterilebilir Türkçe ileti. */
  ileti?: string;
  [anahtar: string]: unknown;
}

export async function durumYaz(
  tx: Islem,
  kurumId: string,
  kanitId: string,
  durum: IslemeDurumu,
  ayrinti: DurumAyrintisi,
): Promise<void> {
  await tx.insert(sema.kanitIsleme).values({ kurumId, kanitId, durum, ayrinti });
}

export interface KanitDurumu {
  kanitId: string;
  dosyaAdi: string;
  durum: IslemeDurumu;
  asama: Asama;
  ileti: string | null;
  /** Kişisel veri taraması sonucu (son tarama). */
  kisiselVeri: "var" | "yok" | "bilinmiyor";
  zaman: Date;
}

export interface DurumOzeti {
  kanitlar: KanitDurumu[];
  sayac: Record<"isleniyor" | "tamam" | "hata" | "ocr_bekliyor" | "kisisel_veri", number>;
}

interface Satir {
  kanit_id: string;
  dosya_adi: string;
  durum: IslemeDurumu;
  ayrinti: DurumAyrintisi;
  olusturma: string | Date;
  kv: string | null;
}

/** Kurumun kanıtlarının güncel işleme durumu (panel için). En yeni kanıt önce. */
export async function durumOzeti(db: Vt, kurumId: string, sinir = 500): Promise<DurumOzeti> {
  const rows = await kiraciIslemi(db, kurumId, async (tx) =>
    satirlar(
      (await tx.execute(sql`
        select k.id as kanit_id, k.dosya_adi, s.durum, s.ayrinti, s.olusturma,
          (select i.ayrinti->>'kisiselVeri' from kanit_isleme i
             where i.kanit_id = k.id and i.ayrinti ? 'kisiselVeri'
             order by i.olusturma desc, i.id desc limit 1) as kv
        from kanit k
        join lateral (
          select i.durum, i.ayrinti, i.olusturma from kanit_isleme i
          where i.kanit_id = k.id order by i.olusturma desc, i.id desc limit 1
        ) s on true
        order by k.olusturma desc, k.id desc
        limit ${sinir}`)) as unknown as SorguSonucu<Satir>,
    ),
  );
  const sayac = { isleniyor: 0, tamam: 0, hata: 0, ocr_bekliyor: 0, kisisel_veri: 0 };
  const kanitlar = rows.map((r): KanitDurumu => {
    const asama = r.ayrinti.asama;
    if (r.durum === "hata") sayac.hata++;
    else if (asama === "tamam") sayac.tamam++;
    else if (r.durum === "ocr_gerekli") sayac.ocr_bekliyor++;
    else sayac.isleniyor++;
    const kisiselVeri = r.kv === "var" || r.kv === "yok" ? r.kv : "bilinmiyor";
    if (kisiselVeri === "var") sayac.kisisel_veri++;
    return {
      kanitId: r.kanit_id,
      dosyaAdi: r.dosya_adi,
      durum: r.durum,
      asama,
      ileti: typeof r.ayrinti.ileti === "string" ? r.ayrinti.ileti : null,
      kisiselVeri,
      zaman: new Date(r.olusturma),
    };
  });
  return { kanitlar, sayac };
}

/** Tek kanıtın bütün durum geçmişi (eskiden yeniye). */
export async function durumGecmisi(db: Vt, kurumId: string, kanitId: string) {
  return kiraciIslemi(db, kurumId, async (tx) =>
    satirlar(
      (await tx.execute(sql`
        select durum, ayrinti, olusturma from kanit_isleme where kanit_id = ${kanitId}
        order by olusturma, id`)) as unknown as SorguSonucu<{
        durum: IslemeDurumu;
        ayrinti: DurumAyrintisi;
        olusturma: string;
      }>,
    ),
  );
}
