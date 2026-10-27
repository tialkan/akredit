// Gösterge panosu verisi (İP-21 devamı, inceleme dalga 3 #4). Örnek veri yerine kayıtlardan:
//   * Tanımlar: `gosterge` tablosu (kod, ad, birim + `hesap_tanimi`), @akredit/gosterge şemasıyla doğrulanır.
//   * Ham veri noktaları: `gosterge_olcumu` (kaynak = { anahtar, kaynak: KaynakIzi }), dönem `donem` tablosundan.
//     Elle girilen değer yalnız kanıtı ONAYLI ise (kararla bağlanmış kanıt etiketi) hesaba girer; değilse
//     reddedilenler listesinde nedeniyle görünür ve gösterge EKSİK kalır (ilke 1).
//   * Ölçme kaynaklı noktalar: `saglanan_pc` / `toplam_pc`, derslerin son ölçme sonuçlarından
//     `@akredit/olcme programPcHesapla` ile (eşit ağırlık) program düzeyinde hesaplanır. Sayılar modelden gelmez.
// Gösterge değerinin kendisi burada hesaplanmaz; panel `@akredit/gosterge` ile hesaplar.

import {
  type GostergeTanimi,
  gostergeTanimiOku,
  type KaynakIzi,
  kaynakIziSemasi,
  type VeriNoktasi,
} from "@akredit/gosterge";
import { type DersOlcmeSonucu, type ProgramDersGirdisi, programPcHesapla } from "@akredit/olcme";
import { type Islem, sema } from "@akredit/vt";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { islem, type ServisBaglami } from "./baglam.ts";

/** Ölçme motorundan türetilen veri anahtarları. Gösterge tanımı bu adlarla başvurur. */
export const OLCME_ANAHTARLARI = { saglananPc: "saglanan_pc", toplamPc: "toplam_pc" } as const;

/** Kurum ayarında eşik yoksa kullanılan PÇ sağlanma eşiği (0-100). @akredit/olcme varsayılanıyla aynı. */
export const VARSAYILAN_PC_ESIGI = 60;

export interface ReddedilenVeri {
  gostergeKod: string;
  anahtar: string | null;
  donem: string | null;
  neden: string;
}

export interface GostergePanosu {
  donemler: string[];
  tanimlar: GostergeTanimi[];
  veriler: VeriNoktasi[];
  reddedilenler: ReddedilenVeri[];
}

const OlcumKaynagi = z.object({ anahtar: z.string().min(1), kaynak: kaynakIziSemasi });

/** Kararla (onay ya da düzeltme) bağlanmış kanıt etiketi olan kanıtlar: "onaylı kanıt". */
async function onayliKanitIdleri(tx: Islem): Promise<Set<string>> {
  const satir = await tx
    .select({ id: sema.oneri.hedefId, sonuc: sema.karar.sonuc })
    .from(sema.oneri)
    .innerJoin(sema.karar, eq(sema.karar.oneriId, sema.oneri.id))
    .where(and(eq(sema.oneri.tur, "kanit_etiketi"), eq(sema.oneri.hedefTuru, "kanit")));
  return new Set(satir.filter((s) => s.sonuc !== "reddedildi").map((s) => s.id));
}

async function pcEsigi(tx: Islem, kurumId: string): Promise<number> {
  const [k] = await tx.select({ a: sema.kurum.ayarlar }).from(sema.kurum).where(eq(sema.kurum.id, kurumId));
  const e = (k?.a as { esikler?: { ckBasari?: unknown } } | undefined)?.esikler?.ckBasari;
  return typeof e === "number" && e >= 0 && e <= 100 ? e : VARSAYILAN_PC_ESIGI;
}

/**
 * Dönem başına program düzeyi PÇ sağlanması: her programda her ders için o dönemin son ölçme sonucu,
 * `programPcHesapla` (eşit ağırlık). toplam_pc = değeri hesaplanabilen PÇ sayısı (bütün programlar),
 * saglanan_pc = bunlardan değeri eşiğe eşit ya da üstünde olanlar.
 */
export async function olcmeVeriNoktalari(tx: Islem, kurumId: string): Promise<VeriNoktasi[]> {
  const satir = await tx
    .select({ os: sema.olcmeSonucu, d: sema.ders, donem: sema.donem })
    .from(sema.olcmeSonucu)
    .innerJoin(sema.dersAcilisi, eq(sema.dersAcilisi.id, sema.olcmeSonucu.dersAcilisiId))
    .innerJoin(sema.ders, eq(sema.ders.id, sema.dersAcilisi.dersId))
    .innerJoin(sema.donem, eq(sema.donem.id, sema.dersAcilisi.donemId))
    .orderBy(desc(sema.olcmeSonucu.olusturma), desc(sema.olcmeSonucu.id));
  if (!satir.length) return [];
  const esik = await pcEsigi(tx, kurumId);
  // dönem → program → ders → son sonuç (sıralama en yeni önce; ilk görülen kalır)
  const donemler = new Map<string, Map<string, Map<string, (typeof satir)[number]>>>();
  for (const s of satir) {
    const p = donemler.get(s.donem.ad) ?? new Map();
    donemler.set(s.donem.ad, p);
    const dersler = p.get(s.d.programId) ?? new Map();
    p.set(s.d.programId, dersler);
    if (!dersler.has(s.d.id)) dersler.set(s.d.id, s);
  }
  const noktalar: VeriNoktasi[] = [];
  for (const [donem, programlar] of [...donemler].sort(([a], [b]) => a.localeCompare(b, "tr"))) {
    let toplam = 0;
    let saglanan = 0;
    const sonucIdleri: string[] = [];
    for (const dersler of programlar.values()) {
      const girdiler: ProgramDersGirdisi[] = [...dersler.values()].map((x) => {
        const s = x.os.sonuc as Partial<DersOlcmeSonucu>;
        sonucIdleri.push(x.os.id);
        return {
          dersKodu: x.d.kod,
          ogrenciSayisi: s.notIstatistikleri?.n ?? 0,
          pcSaglanmasi: s.pcSaglanmasi ?? [],
        };
      });
      for (const pc of programPcHesapla(girdiler, { agirlik: "esit" })) {
        if (pc.deger === null) continue;
        toplam += 1;
        if (pc.deger >= esik) saglanan += 1;
      }
    }
    if (!toplam) continue;
    const kaynak: KaynakIzi = { tur: "olcme", sonucId: sonucIdleri.sort().join(",") };
    noktalar.push({ anahtar: OLCME_ANAHTARLARI.toplamPc, donem, deger: toplam, kaynak });
    noktalar.push({ anahtar: OLCME_ANAHTARLARI.saglananPc, donem, deger: saglanan, kaynak });
  }
  return noktalar;
}

/** Kurum geneli gösterge panosu verisi. Kurum kapsamında ölçme okuma yetkisi gerekir. */
export async function gostergePanosu(b: ServisBaglami): Promise<GostergePanosu> {
  return islem(b, async (tx, gerekli) => {
    const kurumId = b.aktor.kurumId;
    await gerekli("olcme.oku", { tur: "kurum", id: kurumId });
    const reddedilenler: ReddedilenVeri[] = [];
    const gostergeler = await tx.select().from(sema.gosterge).orderBy(asc(sema.gosterge.kod));
    const tanimlar: GostergeTanimi[] = [];
    const tanimId = new Map<string, GostergeTanimi>();
    for (const g of gostergeler) {
      try {
        const t = gostergeTanimiOku({
          ...(g.hesapTanimi as Record<string, unknown>),
          kod: g.kod,
          ad: g.ad,
          birim: g.birim ?? "",
        });
        tanimlar.push(t);
        tanimId.set(g.id, t);
      } catch {
        reddedilenler.push({
          gostergeKod: g.kod,
          anahtar: null,
          donem: null,
          neden: "Gösterge tanımı eksik ya da hatalı.",
        });
      }
    }

    const olcumler = await tx
      .select({ o: sema.gostergeOlcumu, donem: sema.donem.ad })
      .from(sema.gostergeOlcumu)
      .leftJoin(sema.donem, eq(sema.donem.id, sema.gostergeOlcumu.donemId))
      .orderBy(asc(sema.gostergeOlcumu.olusturma), asc(sema.gostergeOlcumu.id));
    const onayli = await onayliKanitIdleri(tx);
    const kanitIdleri = olcumler
      .map((x) => OlcumKaynagi.safeParse(x.o.kaynak).data?.kaynak)
      .flatMap((k) => (k?.tur === "elle" || (k?.tur === "baglayici" && k.kanitId) ? [k.kanitId as string] : []))
      .filter((id) => z.uuid().safeParse(id).success);
    const varOlanKanit = new Set(
      kanitIdleri.length
        ? (await tx.select({ id: sema.kanit.id }).from(sema.kanit).where(inArray(sema.kanit.id, kanitIdleri))).map(
            (k) => k.id,
          )
        : [],
    );

    const veriler: VeriNoktasi[] = [];
    for (const { o, donem } of olcumler) {
      const t = tanimId.get(o.gostergeId);
      const kod = t?.kod ?? "?";
      const k = OlcumKaynagi.safeParse(o.kaynak);
      const red = (neden: string) =>
        reddedilenler.push({ gostergeKod: kod, anahtar: k.data?.anahtar ?? null, donem, neden });
      if (!t) continue; // tanımı reddedilmiş gösterge: neden zaten listede
      if (!k.success) {
        red("Verinin kaynağı belirtilmemiş.");
        continue;
      }
      if (!donem) {
        red("Verinin dönemi belirtilmemiş.");
        continue;
      }
      const deger = o.deger === null ? Number.NaN : Number(o.deger);
      if (!Number.isFinite(deger)) {
        red("Değer sayı değil.");
        continue;
      }
      const kaynak = k.data.kaynak;
      if (kaynak.tur === "elle") {
        if (!varOlanKanit.has(kaynak.kanitId)) {
          red("Elle girilen değerin kanıtı bulunamadı.");
          continue;
        }
        if (!onayli.has(kaynak.kanitId)) {
          red("Elle girilen değerin kanıtı henüz onaylanmadı. Kanıt onaylanınca değer hesaba girer.");
          continue;
        }
      }
      if (kaynak.tur === "olcme") {
        // Ölçme kaynaklı noktalar yalnız ölçme motorundan türetilir; elle "ölçme" diye yazılan değer kabul edilmez.
        red("Ölçme verisi elle girilemez; ölçme sonuçlarından hesaplanır.");
        continue;
      }
      veriler.push({ anahtar: k.data.anahtar, donem, deger, kaynak });
    }
    veriler.push(...(await olcmeVeriNoktalari(tx, kurumId)));

    const donemler = [...new Set(veriler.map((v) => v.donem))].sort((a, b) => a.localeCompare(b, "tr"));
    return { donemler, tanimlar, veriler, reddedilenler };
  });
}
