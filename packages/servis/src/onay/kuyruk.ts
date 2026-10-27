// Öneri kuyruğu (İP-13): öneri yazımı (ör. İP-21 göstergelerinin `EylemAlicisi`), bekleyen sayacı ve risk
// gruplaması. Yeni öneri yazılınca politika motoru hemen çalışır; politikaya girmeyen öneri insanı bekler.

import { etkinRisk, type Oneri, type RiskDuzeyi } from "@akredit/cekirdek";
import { kiraciIslemi, sema, type Vt } from "@akredit/vt";
import { eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { islem, type ServisBaglami } from "../baglam.ts";
import { hedefVeKonum } from "../oneri.ts";
import { type OtomatikKarar, oneriyePolitikaUygula } from "./motor.ts";

const OneriSemasi = z.object({
  tur: z.enum([
    "kanit_etiketi",
    "toplanti_tutanagi",
    "anket_ozeti",
    "matris_katkisi",
    "soru_cikti_eslemesi",
    "bologna_taslagi",
    "rapor_bolumu",
    "eylem",
    "olgunluk_duzeyi",
    "yazma_plani",
    "dis_gonderim",
  ]),
  hedef: z.object({ tur: z.string().min(1).max(64), id: z.string().min(1).max(200) }),
  icerik: z.unknown(),
  gerekce: z.string().min(1).max(5_000),
  atiflar: z.array(z.record(z.string(), z.unknown())).max(200),
  guven: z.number().min(0).max(1).nullable(),
  uretici: z.discriminatedUnion("tur", [
    z.object({ tur: z.literal("yz"), model: z.string(), istemOzeti: z.string() }),
    z.object({ tur: z.literal("kural"), kural: z.string(), surum: z.string() }),
    z.object({ tur: z.literal("kisi"), kisiId: z.string() }),
  ]),
  risk: z.enum(["dusuk", "orta", "yuksek"]),
});

export interface YazilanOneri {
  oneriId: string;
  /** Politika karara bağladıysa. */
  otomatik: OtomatikKarar | null;
}

/**
 * Çekirdek `Oneri`yi `oneri` tablosuna yazar ve politika motorunu çalıştırır. Önerinin kurumu `kurumId` ile
 * aynı olmalı. Risk, türün riskinden düşük yazılamaz (etkin risk yazılır; tetikleyici de denetler).
 */
export async function oneriYaz(db: Vt, kurumId: string, oneri: Oneri<unknown>, simdi: Date): Promise<YazilanOneri> {
  if (oneri.kurumId !== kurumId) throw new Error("Öneri başka bir kuruma ait.");
  const o = OneriSemasi.parse(oneri);
  const { tur: ureticiTuru, ...uretici } = o.uretici;
  return kiraciIslemi(db, kurumId, async (tx) => {
    const [s] = await tx
      .insert(sema.oneri)
      .values({
        ...(z.uuid().safeParse(oneri.id).success ? { id: oneri.id } : {}),
        kurumId,
        tur: o.tur,
        hedefTuru: o.hedef.tur,
        hedefId: o.hedef.id,
        icerik: o.icerik ?? {},
        gerekce: o.gerekce,
        atiflar: o.atiflar,
        guven: o.guven,
        ureticiTuru,
        uretici,
        risk: etkinRisk({ tur: o.tur, risk: o.risk }),
      })
      .returning();
    if (!s) throw new Error("Öneri eklenemedi.");
    const otomatik = await oneriyePolitikaUygula(tx, kurumId, s, simdi);
    return { oneriId: s.id, otomatik };
  });
}

/** İP-21 `EylemAlicisi` ile aynı biçim: göstergelerin eylem önerilerini kuyruğa yazar. */
export function oneriAlicisi(db: Vt, kurumId: string, saat: () => Date = () => new Date()) {
  const yazilan: YazilanOneri[] = [];
  return {
    yazilan,
    async eylemOner(oneri: Oneri<unknown>): Promise<void> {
      yazilan.push(await oneriYaz(db, kurumId, oneri, saat()));
    },
  };
}

/** Aktörün görebildiği karar bekleyen öneri sayısı (kenar çubuğu sayacı), etkin riske göre. */
export async function bekleyenSayisi(b: ServisBaglami): Promise<{ toplam: number; risk: Record<RiskDuzeyi, number> }> {
  return islem(b, async (tx, _gerekli, d) => {
    const satir = await tx
      .select({ o: sema.oneri })
      .from(sema.oneri)
      .leftJoin(sema.karar, eq(sema.karar.oneriId, sema.oneri.id))
      .where(isNull(sema.karar.id));
    const risk: Record<RiskDuzeyi, number> = { dusuk: 0, orta: 0, yuksek: 0 };
    for (const { o } of satir) {
      const { hedef } = await hedefVeKonum(tx, b.aktor.kurumId, o);
      if (await d.izinliMi("oneri.oku", hedef)) risk[etkinRisk(o)]++;
    }
    return { toplam: risk.dusuk + risk.orta + risk.yuksek, risk };
  });
}

/** Risk gruplaması: yüksek önce; yalnız düşük ve orta gruplar toplu onaylanabilir. */
export function riskGruplari<T extends Pick<Oneri, "tur" | "risk">>(liste: readonly T[]) {
  const sira: RiskDuzeyi[] = ["yuksek", "orta", "dusuk"];
  return sira
    .map((risk) => ({ risk, topluOnay: risk !== "yuksek", ogeler: liste.filter((o) => etkinRisk(o) === risk) }))
    .filter((g) => g.ogeler.length);
}
