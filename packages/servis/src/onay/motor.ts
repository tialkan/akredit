// Politika motoru (İP-13). Karar bekleyen bir öneri, imzalı ve geçerli bir yetki devri politikasının kapsamına
// giriyorsa onaylanır. Karar `dayanak: politika` ile, karar veren politikayı imzalayan kişi olarak yazılır;
// günlükte aktör "sistem"dir, imzalayan ve politika ayrıntıda durur (ilke 3).
//
// Güvenceler, içten dışa: (1) yüksek etkin riskli öneri burada atlanır, (2) uygulanabilirlik
// `politika.uygulanabilirPolitikalar` (çekirdek kural, iptal ve kapsam dahil), (3) imzalayan kişinin karar
// anında hâlâ o hedefte karar yetkisi olmalı, (4) veritabanı `karar_denetle` tetikleyicisi (risk, tür, güven,
// süre, iptal, birim/program kapsamı) son savunma hattıdır. Tetikleyici reddederse öneri bekler, iş sürer.

import { etkinRisk } from "@akredit/cekirdek";
import { gunlugeYaz, type Islem, kiraciIslemi, sema, type Vt } from "@akredit/vt";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { aktorYetkiliMi, atamalariOku, hedefZinciri } from "../baglam.ts";
import { hedefVeKonum } from "../oneri.ts";
import { uygulanabilirPolitikalar } from "../politika.ts";

export interface OtomatikKarar {
  oneriId: string;
  kararId: string;
  politikaId: string;
  imzalayanKisiId: string;
}

export interface MotorSonucu {
  kararlar: OtomatikKarar[];
  /** Politikaya girmeyen ya da reddedilen öneriler (insan bekler). */
  bekleyen: number;
}

type OneriSatiri = typeof sema.oneri.$inferSelect;

async function bekleyenler(tx: Islem, secim?: readonly string[]): Promise<OneriSatiri[]> {
  if (secim && !secim.length) return [];
  const satir = await tx
    .select({ o: sema.oneri })
    .from(sema.oneri)
    .leftJoin(sema.karar, eq(sema.karar.oneriId, sema.oneri.id))
    .where(secim ? and(isNull(sema.karar.id), inArray(sema.oneri.id, [...secim])) : isNull(sema.karar.id))
    .orderBy(asc(sema.oneri.olusturma), asc(sema.oneri.id));
  return satir.map((x) => x.o);
}

/** Tek öneriye politika uygular (işlem içinde). Karar verildiyse kaydı döndürür. */
export async function oneriyePolitikaUygula(
  tx: Islem,
  kurumId: string,
  o: OneriSatiri,
  simdi: Date,
): Promise<OtomatikKarar | null> {
  if (etkinRisk(o) === "yuksek") return null; // ilke 3: hiçbir politika yüksek riski karara bağlayamaz.
  const { hedef } = await hedefVeKonum(tx, kurumId, o);
  const uygun = await uygulanabilirPolitikalar(tx, kurumId, { tur: o.tur, risk: o.risk, guven: o.guven }, hedef, simdi);
  if (!uygun.length) return null;
  const politikalar = await tx
    .select()
    .from(sema.yetkiPolitikasi)
    .where(inArray(sema.yetkiPolitikasi.id, uygun))
    .orderBy(asc(sema.yetkiPolitikasi.baslangic), asc(sema.yetkiPolitikasi.id));
  const zincir = await hedefZinciri(tx, kurumId, hedef.tur, hedef.id);
  if (!zincir) return null;
  for (const p of politikalar) {
    // İmzalayan kişi yetkisini yitirdiyse politikası da işlemez.
    const atamalar = await atamalariOku(tx, p.imzalayanKisiId);
    const imzalayan = { kisiId: p.imzalayanKisiId, kurumId, atamalar, tur: "oturum" as const, anahtarKapsami: null };
    if (!aktorYetkiliMi(imzalayan, "karar.ver", zincir, simdi)) continue;
    try {
      return await tx.transaction(async (ic) => {
        const [k] = await ic
          .insert(sema.karar)
          .values({
            kurumId,
            oneriId: o.id,
            sonuc: "onaylandi",
            kararVerenKisiId: p.imzalayanKisiId,
            dayanak: "politika",
            politikaId: p.id,
            gerekce: `Yetki devri politikası: ${p.ad}`,
            zaman: simdi,
          })
          .returning();
        if (!k) throw new Error("Karar eklenemedi.");
        await gunlugeYaz(ic, {
          aktor: { tur: "sistem", id: null },
          eylem: "karar.verildi",
          hedef: { tur: "karar", id: k.id },
          ayrinti: {
            oneri: o.id,
            oneriTuru: o.tur,
            risk: etkinRisk(o),
            sonuc: "onaylandi",
            dayanak: "politika",
            politika: p.id,
            imzalayan: p.imzalayanKisiId,
            toplu: false,
            yol: "politika",
          },
          zaman: simdi,
        });
        return { oneriId: o.id, kararId: k.id, politikaId: p.id, imzalayanKisiId: p.imzalayanKisiId };
      });
    } catch {
      // Tetikleyici reddetti (ör. eşzamanlı karar ya da kapsam): sıradaki politikayı dene, olmazsa insan bekler.
    }
  }
  return null;
}

/**
 * Kurumun karar bekleyen önerilerine (ya da yalnız `secim`dekilere) politikaları uygular. İşçi ve yeni öneri
 * yazımı bu işlevi çağırır.
 */
export async function politikalariUygula(
  db: Vt,
  kurumId: string,
  simdi: Date,
  secim?: readonly string[],
): Promise<MotorSonucu> {
  return kiraciIslemi(db, kurumId, async (tx) => {
    const liste = await bekleyenler(tx, secim);
    const kararlar: OtomatikKarar[] = [];
    for (const o of liste) {
      const k = await oneriyePolitikaUygula(tx, kurumId, o, simdi);
      if (k) kararlar.push(k);
    }
    return { kararlar, bekleyen: liste.length - kararlar.length };
  });
}
