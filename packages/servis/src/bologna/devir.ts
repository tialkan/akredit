// Sessiz devir motoru (İP-38). Yeni dönem başlayınca her açılan ders için geçen dönemin onaylı Bologna paketi,
// o derste kapanmış ya da seçilmiş PÜKÖ önlemleri ve son okumanın eksik giderme bulguları birleştirilir;
// `bologna_devri` önerisi açılır ve ders sorumlusuna kısa bir fark özeti bildirilir.
//
// Süreli varsayılan onay (danışmanlık 2026-10-28, katman 1):
//   - yalnız kurumun `bologna_devri` türünü kapsayan imzalı ve yürürlükteki yetki devri politikası varsa,
//   - yalnız öneri düşük riskliyse (akademik değişiklik ve denetim hatası yok),
//   - yalnız itiraz süresi (politikadaki iş günü, varsayılan 5) dolduğunda,
//   - öğretim elemanı bu arada karar vermemiş ya da dersin yeni bir taslağını açmamışsa
// karar `sure_dolumu` dayanağıyla, politikayı imzalayan kişi adına yazılır; günlükte "süre dolumuyla, politika X
// dayanağıyla" olarak ayrı görünür (ilke 3). Veritabanı tetikleyicisi bu koşulları ayrıca uygular.
//
// Devir modelsizdir: metin ve sayı üretilmez; değişiklikler kaynağıyla fark listesindedir.

import { type BolognaTaslagi, type Bulgu, etkinRisk, okunamadiMi } from "@akredit/cekirdek";
import { yerelTarih } from "@akredit/surec";
import { gunlugeYaz, type Islem, kiraciIslemi, sema, type Vt } from "@akredit/vt";
import { and, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { aktorYetkiliMi, atamalariOku, hedefZinciri, islem, type ServisBaglami } from "../baglam.ts";
import { bulunamadi, ServisHatasi } from "../hata.ts";
import * as oneriServisi from "../oneri.ts";
import { uygulanabilirPolitikalar } from "../politika.ts";
import {
  type DevirOnlemi,
  DUZELTILEBILIR_ALANLAR,
  devirTaslagiKur,
  farkOzetiMetni,
  type IsGunuAyari,
  isGunuEkle,
  kalanIsGunu,
  VARSAYILAN_ITIRAZ_IS_GUNU,
  VARSAYILAN_SAAT_DILIMI,
} from "./devir-saf.ts";
import { dersBulgulari } from "./eksik-giderme.ts";
import { gecerliTaslak, okumalar } from "./index.ts";

const json = (v: unknown) => JSON.parse(JSON.stringify(v)) as object;

// ---------- Şemalar ----------

const KurumDevirAyari = z
  .object({
    sessizDevir: z
      .object({
        /** Kurumun girdiği tatil günleri; iş günü hesabında sayılmaz. */
        tatiller: z
          .array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/u))
          .max(100)
          .optional(),
        saatDilimi: z.string().max(60).optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export const DevirIcerigi = z.object({
  baslik: z.string(),
  metin: z.string(),
  dersKodu: z.string(),
  donemId: z.string(),
  donemAdi: z.string(),
  oncekiOneriId: z.string(),
  taslak: z.custom<BolognaTaslagi>((v) => typeof v === "object" && v !== null && "ciktilar" in v),
  fark: z.array(z.object({ alan: z.string(), onceki: z.string(), yeni: z.string(), neden: z.string() })),
  onlemler: z.array(z.object({ eylemId: z.string(), tanim: z.string(), uygulandi: z.boolean() })),
  bulgular: z.array(z.object({ duzey: z.string(), kural: z.string(), aciklama: z.string() })),
  riskNedenleri: z.array(z.string()),
  denetim: z.object({ hata: z.number(), uyari: z.number() }),
  /** İtiraz süresinin sonu; politika yoksa ya da risk orta ise `null` (varsayılan onay yok). */
  sureSonu: z.string().nullable(),
  politikaId: z.string().nullable(),
  politikaAdi: z.string().nullable(),
  itirazSuresiIsGunu: z.number().nullable(),
  bildirilen: z.array(z.string()),
});
export type DevirIcerigi = z.infer<typeof DevirIcerigi>;

const OnlemKaynagi = z
  .object({
    secildi: z.boolean().optional(),
    bolognaDuzeltmesi: z
      .object({
        alan: z.enum(DUZELTILEBILIR_ALANLAR),
        dil: z.enum(["tr", "en"]),
        metin: z.string().max(20_000),
        kip: z.enum(["degistir", "ekle"]).optional(),
      })
      .optional(),
  })
  .passthrough();

export const DevirBaslatSonucu = z.object({
  acilan: z.array(z.object({ oneriId: z.string(), dersKodu: z.string(), risk: z.enum(["dusuk", "orta"]) })),
  atlanan: z.array(z.object({ dersKodu: z.string(), neden: z.string() })),
});
export type DevirBaslatSonucu = z.infer<typeof DevirBaslatSonucu>;

export const VarsayilanOnaySonucu = z.object({
  onaylanan: z.array(z.object({ oneriId: z.string(), kararId: z.string(), politikaId: z.string() })),
  bekleyen: z.array(z.object({ oneriId: z.string(), neden: z.string() })),
});
export type VarsayilanOnaySonucu = z.infer<typeof VarsayilanOnaySonucu>;

export const YazmaDurumu = z.enum(["bekliyor", "kuru", "yazildi", "hata", "izin_yok"]);

export const DevirDurumu = z.object({
  oneriId: z.string(),
  dersKodu: z.string(),
  donemAdi: z.string(),
  durum: z.enum(["taslak_hazir", "hoca_degistiriyor", "onaylandi", "duzeltildi", "reddedildi", "varsayilan_onaylandi"]),
  ozet: z.string(),
  risk: z.enum(["dusuk", "orta", "yuksek"]),
  riskNedenleri: z.array(z.string()),
  fark: DevirIcerigi.shape.fark,
  onlemler: DevirIcerigi.shape.onlemler,
  bulgular: DevirIcerigi.shape.bulgular,
  sureSonu: z.string().nullable(),
  kalanIsGunu: z.number().nullable(),
  politikaAdi: z.string().nullable(),
  karar: z.object({ sonuc: z.string(), dayanak: z.string(), kararVeren: z.string(), zaman: z.string() }).nullable(),
  yazma: z.object({ durum: YazmaDurumu, zaman: z.string().nullable(), ileti: z.string() }).nullable(),
});
export type DevirDurumu = z.infer<typeof DevirDurumu>;

export const DevirKarariGirdisi = z
  .object({
    sonuc: z.enum(["onaylandi", "reddedildi"]),
    gerekce: z.string().trim().max(2000).optional(),
    sureMs: z.number().int().min(0).max(3_600_000).optional(),
  })
  .strict();

// ---------- Yardımcılar ----------

async function devirAyari(tx: Islem, kurumId: string): Promise<IsGunuAyari & { saatDilimi: string }> {
  const [k] = await tx.select({ a: sema.kurum.ayarlar }).from(sema.kurum).where(eq(sema.kurum.id, kurumId));
  const a = KurumDevirAyari.safeParse(k?.a ?? {});
  const s = a.success ? a.data.sessizDevir : undefined;
  return { tatiller: s?.tatiller ?? [], saatDilimi: s?.saatDilimi ?? VARSAYILAN_SAAT_DILIMI };
}

/** Dersin en son onaylanmış (ya da düzeltilerek onaylanmış) Bologna taslağı: elle, eksik giderme ya da devir. */
export async function sonOnayliTaslak(
  tx: Islem,
  dersId: string,
): Promise<{ oneriId: string; taslak: BolognaTaslagi } | null> {
  const satir = await tx
    .select({ o: sema.oneri, k: sema.karar })
    .from(sema.oneri)
    .innerJoin(sema.karar, eq(sema.karar.oneriId, sema.oneri.id))
    .where(
      and(
        inArray(sema.oneri.tur, ["bologna_taslagi", "bologna_devri"]),
        eq(sema.oneri.hedefTuru, "ders"),
        eq(sema.oneri.hedefId, dersId),
        inArray(sema.karar.sonuc, ["onaylandi", "duzeltildi"]),
      ),
    )
    .orderBy(desc(sema.karar.zaman), desc(sema.karar.id));
  for (const { o, k } of satir) {
    const ic = o.icerik as { taslak?: unknown };
    if (!ic || typeof ic.taslak !== "object" || ic.taslak === null) continue;
    try {
      return { oneriId: o.id, taslak: gecerliTaslak(ic as never, k) };
    } catch {
      // Okunamayan düzeltme: bir öncekine bakılır.
    }
  }
  return null;
}

/** Geçen dönemde o derse bağlı kapanmış ya da seçilmiş PÜKÖ önlemleri (İP-39 seçimi `eylem` olarak gelir). */
export async function donemOnlemleri(
  tx: Islem,
  dersId: string,
  aralik: { bas: Date | null; son: Date },
): Promise<DevirOnlemi[]> {
  const satir = await tx
    .select()
    .from(sema.eylem)
    .where(
      sql`(${sema.eylem.kaynak} ->> 'dersId' = ${dersId} or (${sema.eylem.kaynak} ->> 'tur' = 'ders' and ${sema.eylem.kaynak} ->> 'id' = ${dersId}))`,
    )
    .orderBy(sema.eylem.olusturma, sema.eylem.id);
  const liste: DevirOnlemi[] = [];
  for (const e of satir) {
    if (e.olusturma >= aralik.son || (aralik.bas && e.olusturma < aralik.bas)) continue;
    const k = OnlemKaynagi.safeParse(e.kaynak);
    const kapandi = e.pukoAsamasi === "onlem_al" || e.pukoAsamasi === "kontrol_et";
    if (!kapandi && !(k.success && k.data.secildi)) continue;
    liste.push({
      eylemId: e.id,
      tanim: e.tanim,
      asama: e.pukoAsamasi,
      ...(k.success && k.data.bolognaDuzeltmesi ? { bolognaDuzeltmesi: k.data.bolognaDuzeltmesi } : {}),
    });
  }
  return liste;
}

/** Politikanın imzalayanı karar anında hâlâ o derste karar yetkisine sahip mi (İP-13 motoruyla aynı kural). */
async function imzalayanYetkili(tx: Islem, kurumId: string, kisiId: string, dersId: string, simdi: Date) {
  const zincir = await hedefZinciri(tx, kurumId, "ders", dersId);
  if (!zincir) return false;
  const atamalar = await atamalariOku(tx, kisiId);
  return aktorYetkiliMi({ kisiId, kurumId, atamalar, tur: "oturum", anahtarKapsami: null }, "karar.ver", zincir, simdi);
}

async function devirPolitikasi(tx: Islem, kurumId: string, dersId: string, simdi: Date) {
  const uygun = await uygulanabilirPolitikalar(
    tx,
    kurumId,
    { tur: "bologna_devri", risk: "dusuk", guven: 1 },
    { tur: "ders", id: dersId },
    simdi,
  );
  if (!uygun.length) return null;
  const politikalar = await tx
    .select()
    .from(sema.yetkiPolitikasi)
    .where(inArray(sema.yetkiPolitikasi.id, uygun))
    .orderBy(sema.yetkiPolitikasi.baslangic, sema.yetkiPolitikasi.id);
  for (const p of politikalar) if (await imzalayanYetkili(tx, kurumId, p.imzalayanKisiId, dersId, simdi)) return p;
  return null;
}

const tarihAni = (gun: string) => new Date(`${gun}T00:00:00Z`);

// ---------- 1. Devri başlat ----------

/**
 * Başlamış ve sürmekte olan dönemlerde (ya da yalnız `donemId`) açılan her ders için devir önerisi açar.
 * Aynı ders ve dönem için ikinci öneri açılmaz; tekrar çalıştırmak bir şey değiştirmez. Sistem işidir (işçi,
 * süreç motoru); aktör günlükte "sistem"dir.
 */
export async function devirBaslat(
  db: Vt,
  kurumId: string,
  simdi: Date,
  secenek: { donemId?: string } = {},
): Promise<DevirBaslatSonucu> {
  return kiraciIslemi(db, kurumId, async (tx) => {
    const ayar = await devirAyari(tx, kurumId);
    const bugun = yerelTarih(simdi, ayar.saatDilimi);
    const donemler = await tx.select().from(sema.donem).orderBy(sema.donem.baslangic, sema.donem.id);
    const hedefler = secenek.donemId
      ? donemler.filter((d) => d.id === secenek.donemId)
      : donemler.filter((d) => d.baslangic <= bugun && d.bitis >= bugun);
    const sonuc: DevirBaslatSonucu = { acilan: [], atlanan: [] };
    for (const donem of hedefler) {
      const onceki = [...donemler].reverse().find((d) => d.baslangic < donem.baslangic) ?? null;
      const acilislar = await tx.select().from(sema.dersAcilisi).where(eq(sema.dersAcilisi.donemId, donem.id));
      const goruldu = new Set<string>();
      for (const acilis of acilislar) {
        if (goruldu.has(acilis.dersId)) continue; // Aynı dersin şubeleri tek pakettir.
        goruldu.add(acilis.dersId);
        const [ders] = await tx.select().from(sema.ders).where(eq(sema.ders.id, acilis.dersId));
        if (!ders) continue;
        const [varolan] = await tx
          .select({ id: sema.oneri.id })
          .from(sema.oneri)
          .where(
            and(
              eq(sema.oneri.tur, "bologna_devri"),
              eq(sema.oneri.hedefTuru, "ders"),
              eq(sema.oneri.hedefId, ders.id),
              sql`${sema.oneri.icerik} ->> 'donemId' = ${donem.id}`,
            ),
          );
        if (varolan) continue;
        const prev = await sonOnayliTaslak(tx, ders.id);
        if (!prev) {
          sonuc.atlanan.push({
            dersKodu: ders.kod,
            neden: "Geçen dönemden onaylı ders paketi yok; ilk paket Bologna asistanıyla hazırlanmalı.",
          });
          continue;
        }
        const onlemler = await donemOnlemleri(tx, ders.id, {
          bas: onceki ? tarihAni(onceki.baslangic) : null,
          son: tarihAni(donem.baslangic),
        });
        const [okuma] = await okumalar(tx, ders.programId, 1);
        const okunan = okuma?.veri.dersler.find((x) => x.kod === ders.kod);
        const bulgular: Bulgu[] =
          okuma && okunan && !okunamadiMi(okunan) ? dersBulgulari(okuma.veri, ders.kod, simdi.getTime()) : [];
        const s = devirTaslagiKur(prev.taslak, {
          ders,
          programCiktilari: okuma ? okuma.veri.programCiktilari.map((p) => p.kod) : null,
          onlemler,
        });
        const bildirilen = [
          ...new Set(acilislar.filter((a) => a.dersId === ders.id).flatMap((a) => a.sorumluKisiIdleri)),
        ];
        // Fark özeti kimseye gitmiyorsa itiraz edecek kimse yoktur: süreli varsayılan onay açılmaz (ilke 3).
        const p =
          s.risk === "dusuk" && bildirilen.length > 0 ? await devirPolitikasi(tx, kurumId, ders.id, simdi) : null;
        const sureGun = p ? (p.itirazSuresiIsGunu ?? VARSAYILAN_ITIRAZ_IS_GUNU) : null;
        const sureSonu = sureGun ? isGunuEkle(simdi, sureGun, ayar) : null;
        const metin = farkOzetiMetni(s, bulgular, { son: sureSonu, saatDilimi: ayar.saatDilimi });
        const icerik: DevirIcerigi = {
          baslik: `${donem.ad} ders paketi: ${ders.kod} ${ders.ad}`,
          metin,
          dersKodu: ders.kod,
          donemId: donem.id,
          donemAdi: donem.ad,
          oncekiOneriId: prev.oneriId,
          taslak: s.taslak,
          fark: s.fark,
          onlemler: s.onlemler,
          bulgular: bulgular.map((b) => ({ duzey: b.duzey, kural: b.kural, aciklama: b.aciklama })),
          riskNedenleri: s.riskNedenleri,
          denetim: s.denetim,
          sureSonu: sureSonu?.toISOString() ?? null,
          politikaId: p?.id ?? null,
          politikaAdi: p?.ad ?? null,
          itirazSuresiIsGunu: sureGun,
          bildirilen,
        };
        const [o] = await tx
          .insert(sema.oneri)
          .values({
            kurumId,
            tur: "bologna_devri",
            hedefTuru: "ders",
            hedefId: ders.id,
            icerik: json(icerik),
            gerekce: `Geçen dönemin onaylı paketi (öneri ${prev.oneriId}) ${onlemler.length} önlem ve ${bulgular.length} bulguyla birleştirildi.`,
            atiflar: json([{ oneriId: prev.oneriId }, ...onlemler.map((x) => ({ eylemId: x.eylemId }))]),
            guven: 1,
            ureticiTuru: "kural",
            uretici: { kural: "bologna-sessiz-devir", surum: "1" },
            risk: s.risk,
            olusturma: simdi,
          })
          .returning({ id: sema.oneri.id });
        if (!o) throw new Error("Öneri eklenemedi.");
        for (const kisiId of bildirilen)
          await tx.insert(sema.bildirim).values({
            kurumId,
            kisiId,
            tur: "bologna_devri",
            icerik: json({
              baslik: `${ders.kod} ders paketi yeni döneme hazır`,
              metin,
              oneriId: o.id,
              dersId: ders.id,
              baglanti: `/panel/dersler/${ders.id}`,
              eposta: { durum: "bekliyor", zaman: simdi.toISOString(), deneme: 0 },
            }),
            olusturma: simdi,
          });
        await gunlugeYaz(tx, {
          aktor: { tur: "sistem", id: null },
          eylem: "bologna.devir_taslagi_acildi",
          hedef: { tur: "oneri", id: o.id },
          ayrinti: {
            ders: ders.id,
            donem: donem.id,
            onceki: prev.oneriId,
            risk: s.risk,
            fark: s.fark.map((f) => f.alan),
            onlem: onlemler.length,
            bulgu: bulgular.length,
            sureSonu: icerik.sureSonu,
            politika: icerik.politikaId,
            bildirilen: bildirilen.length,
          },
          zaman: simdi,
        });
        sonuc.acilan.push({ oneriId: o.id, dersKodu: ders.kod, risk: s.risk });
      }
    }
    return sonuc;
  });
}

// ---------- 2. Süre dolumuyla varsayılan onay ----------

/** Hoca devir önerisinden sonra dersin yeni bir taslağını açtıysa itiraz sayılır. */
async function hocaDegistiriyor(tx: Islem, o: typeof sema.oneri.$inferSelect): Promise<boolean> {
  const [x] = await tx
    .select({ id: sema.oneri.id })
    .from(sema.oneri)
    .where(
      and(
        eq(sema.oneri.tur, "bologna_taslagi"),
        eq(sema.oneri.hedefTuru, "ders"),
        eq(sema.oneri.hedefId, o.hedefId),
        sql`${sema.oneri.olusturma} > ${o.olusturma.toISOString()}::timestamptz`,
      ),
    )
    .limit(1);
  return Boolean(x);
}

/**
 * İtiraz süresi dolmuş, düşük riskli ve karar bekleyen devir önerilerine varsayılan onay verir. Politika artık
 * geçerli değilse, imzalayan yetkisini yitirdiyse ya da hoca yeni taslak açtıysa karar verilmez (insan bekler).
 */
export async function varsayilanOnaylariUygula(db: Vt, kurumId: string, simdi: Date): Promise<VarsayilanOnaySonucu> {
  return kiraciIslemi(db, kurumId, async (tx) => {
    const satir = await tx
      .select({ o: sema.oneri })
      .from(sema.oneri)
      .leftJoin(sema.karar, eq(sema.karar.oneriId, sema.oneri.id))
      .where(and(eq(sema.oneri.tur, "bologna_devri"), isNull(sema.karar.id)))
      .orderBy(sema.oneri.olusturma, sema.oneri.id);
    const sonuc: VarsayilanOnaySonucu = { onaylanan: [], bekleyen: [] };
    for (const { o } of satir) {
      const ic = DevirIcerigi.safeParse(o.icerik);
      if (!ic.success) continue;
      const bekle = (neden: string) => sonuc.bekleyen.push({ oneriId: o.id, neden });
      if (!ic.data.sureSonu || !ic.data.politikaId || ic.data.bildirilen.length === 0) {
        bekle("Süreli onay yok; kararı öğretim elemanı verir.");
        continue;
      }
      if (new Date(ic.data.sureSonu) > simdi) {
        bekle("İtiraz süresi sürüyor.");
        continue;
      }
      if (etkinRisk(o) !== "dusuk") {
        bekle("Düşük riskli değil.");
        continue;
      }
      if (await hocaDegistiriyor(tx, o)) {
        bekle("Öğretim elemanı yeni taslak hazırlıyor.");
        continue;
      }
      const uygun = await uygulanabilirPolitikalar(
        tx,
        kurumId,
        { tur: "bologna_devri", risk: o.risk, guven: o.guven },
        { tur: "ders", id: o.hedefId },
        simdi,
      );
      const [p] = uygun.includes(ic.data.politikaId)
        ? await tx.select().from(sema.yetkiPolitikasi).where(eq(sema.yetkiPolitikasi.id, ic.data.politikaId))
        : [];
      if (!p || !(await imzalayanYetkili(tx, kurumId, p.imzalayanKisiId, o.hedefId, simdi))) {
        bekle("Yetki devri politikası artık geçerli değil; kararı öğretim elemanı verir.");
        continue;
      }
      const [imzalayan] = await tx
        .select({ ad: sema.kisi.adSoyad })
        .from(sema.kisi)
        .where(eq(sema.kisi.id, p.imzalayanKisiId));
      try {
        const k = await tx.transaction(async (ic2) => {
          const [k] = await ic2
            .insert(sema.karar)
            .values({
              kurumId,
              oneriId: o.id,
              sonuc: "onaylandi",
              kararVerenKisiId: p.imzalayanKisiId,
              dayanak: "sure_dolumu",
              politikaId: p.id,
              gerekce: `Süre dolumuyla, "${p.ad}" politikası dayanağıyla varsayılan onay: ${ic.data.itirazSuresiIsGunu ?? VARSAYILAN_ITIRAZ_IS_GUNU} iş günlük itiraz süresinde öğretim elemanı karar vermedi.`,
              zaman: simdi,
            })
            .returning();
          if (!k) throw new Error("Karar eklenemedi.");
          await gunlugeYaz(ic2, {
            aktor: { tur: "sistem", id: null },
            eylem: "karar.verildi",
            hedef: { tur: "karar", id: k.id },
            ayrinti: {
              oneri: o.id,
              oneriTuru: o.tur,
              risk: "dusuk",
              sonuc: "onaylandi",
              dayanak: "sure_dolumu",
              politika: p.id,
              politikaAdi: p.ad,
              imzalayan: p.imzalayanKisiId,
              imzalayanAd: imzalayan?.ad ?? null,
              sureSonu: ic.data.sureSonu,
              aciklama: `Süre dolumuyla, politika "${p.ad}" dayanağıyla, ${imzalayan?.ad ?? "imzalayan"} adına.`,
              toplu: false,
              yol: "sure_dolumu",
            },
            zaman: simdi,
          });
          return k;
        });
        sonuc.onaylanan.push({ oneriId: o.id, kararId: k.id, politikaId: p.id });
      } catch {
        // Tetikleyici reddetti ya da eşzamanlı karar: öneri insan kararını bekler.
        bekle("Veritabanı varsayılan onayı reddetti.");
      }
    }
    return sonuc;
  });
}

// ---------- 3. Panel: durum ve hocanın kararı ----------

async function sonDevir(tx: Islem, dersId: string) {
  const [r] = await tx
    .select({ o: sema.oneri, k: sema.karar })
    .from(sema.oneri)
    .leftJoin(sema.karar, eq(sema.karar.oneriId, sema.oneri.id))
    .where(and(eq(sema.oneri.tur, "bologna_devri"), eq(sema.oneri.hedefTuru, "ders"), eq(sema.oneri.hedefId, dersId)))
    .orderBy(desc(sema.oneri.olusturma), desc(sema.oneri.id))
    .limit(1);
  return r ?? null;
}

/** Kaynağa yazmanın son durumu (günlükten; kayıtlar yalnız eklenir). */
export async function yazmaDurumuOku(
  tx: Islem,
  oneriId: string,
): Promise<{ durum: z.infer<typeof YazmaDurumu>; zaman: string | null; ileti: string }> {
  const [g] = await tx
    .select({ eylem: sema.gunluk.eylem, zaman: sema.gunluk.zaman, ayrinti: sema.gunluk.ayrinti })
    .from(sema.gunluk)
    .where(
      and(
        eq(sema.gunluk.hedefTuru, "oneri"),
        eq(sema.gunluk.hedefId, oneriId),
        inArray(sema.gunluk.eylem, [
          "bologna.kaynaga_yazildi",
          "bologna.kaynak_kuru_calisma",
          "bologna.kaynaga_yazma_hatasi",
          "bologna.kaynaga_yazma_izni_yok",
        ]),
      ),
    )
    .orderBy(desc(sema.gunluk.sira))
    .limit(1);
  if (!g) return { durum: "bekliyor", zaman: null, ileti: "Kaynağa yazılmayı bekliyor." };
  const zaman = g.zaman.toISOString();
  const a = g.ayrinti as { ileti?: string };
  switch (g.eylem) {
    case "bologna.kaynaga_yazildi":
      return { durum: "yazildi", zaman, ileti: "Bologna sistemine yazıldı ve geri okunarak doğrulandı." };
    case "bologna.kaynak_kuru_calisma":
      return {
        durum: "kuru",
        zaman,
        ileti: "Deneme çalıştırması yapıldı; kurum gerçek yazmayı açınca yazılacak.",
      };
    case "bologna.kaynaga_yazma_izni_yok":
      return { durum: "izin_yok", zaman, ileti: "Kurumun yazılı izni olmadığı için kaynağa yazılmadı." };
    default:
      return { durum: "hata", zaman, ileti: a.ileti ?? "Kaynağa yazılamadı. Kalite birimi bilgilendirildi." };
  }
}

/** Ders sayfasındaki devir kartı: son devir önerisi, süre, karar ve kaynağa yazma durumu. */
export async function devirDurumu(b: ServisBaglami, dersId: string): Promise<DevirDurumu | null> {
  const id = z.string().uuid("Geçersiz kimlik.").parse(dersId);
  return islem(b, async (tx, gerekli) => {
    await gerekli("oneri.oku", { tur: "ders", id });
    const r = await sonDevir(tx, id);
    if (!r) return null;
    const ic = DevirIcerigi.safeParse(r.o.icerik);
    if (!ic.success) return null;
    const ayar = await devirAyari(tx, b.aktor.kurumId);
    const simdi = b.simdi();
    let durum: DevirDurumu["durum"] = "taslak_hazir";
    if (r.k) {
      if (r.k.dayanak === "sure_dolumu") durum = "varsayilan_onaylandi";
      else durum = r.k.sonuc;
    } else if (await hocaDegistiriyor(tx, r.o)) durum = "hoca_degistiriyor";
    const karar = r.k
      ? {
          sonuc: r.k.sonuc,
          dayanak: r.k.dayanak,
          kararVeren:
            (
              await tx.select({ ad: sema.kisi.adSoyad }).from(sema.kisi).where(eq(sema.kisi.id, r.k.kararVerenKisiId))
            )[0]?.ad ?? "",
          zaman: r.k.zaman.toISOString(),
        }
      : null;
    const onayli = r.k && r.k.sonuc !== "reddedildi";
    return {
      oneriId: r.o.id,
      dersKodu: ic.data.dersKodu,
      donemAdi: ic.data.donemAdi,
      durum,
      ozet: ic.data.metin,
      risk: etkinRisk(r.o),
      riskNedenleri: ic.data.riskNedenleri,
      fark: ic.data.fark,
      onlemler: ic.data.onlemler,
      bulgular: ic.data.bulgular,
      sureSonu: ic.data.sureSonu,
      kalanIsGunu: ic.data.sureSonu && !r.k ? kalanIsGunu(simdi, new Date(ic.data.sureSonu), ayar) : null,
      politikaAdi: ic.data.politikaAdi,
      karar,
      yazma: onayli ? await yazmaDurumuOku(tx, r.o.id) : null,
    };
  });
}

/** Hocanın devir önerisine kararı (onay ya da ret). Değiştirmek için Bologna asistanıyla yeni taslak açılır. */
export async function devirKarari(b: ServisBaglami, dersId: string, girdi: unknown) {
  const id = z.string().uuid("Geçersiz kimlik.").parse(dersId);
  const g = DevirKarariGirdisi.parse(girdi);
  const oneriId = await islem(b, async (tx, gerekli) => {
    await gerekli("oneri.oku", { tur: "ders", id });
    const r = await sonDevir(tx, id);
    if (!r) throw bulunamadi();
    if (r.k) throw new ServisHatasi("cakisma", "Bu taslağa zaten karar verilmiş. Sayfayı yenileyin.");
    return r.o.id;
  });
  return oneriServisi.kararVer(b, {
    oneriId,
    sonuc: g.sonuc,
    ...(g.gerekce ? { gerekce: g.gerekce } : {}),
    ...(g.sureMs !== undefined ? { sureMs: g.sureMs } : {}),
  });
}

/** Onaylanmış (öğretim elemanınca, düzeltilerek ya da süre dolumuyla) devir taslakları. */
export async function onayliDevirler(
  tx: Islem,
): Promise<{ oneriId: string; dersId: string; taslak: BolognaTaslagi }[]> {
  const satir = await tx
    .select({ o: sema.oneri, k: sema.karar })
    .from(sema.oneri)
    .innerJoin(sema.karar, eq(sema.karar.oneriId, sema.oneri.id))
    .where(
      and(
        eq(sema.oneri.tur, "bologna_devri"),
        isNotNull(sema.karar.id),
        inArray(sema.karar.sonuc, ["onaylandi", "duzeltildi"]),
      ),
    )
    .orderBy(sema.karar.zaman, sema.karar.id);
  const liste: { oneriId: string; dersId: string; taslak: BolognaTaslagi }[] = [];
  for (const { o, k } of satir) {
    const ic = DevirIcerigi.safeParse(o.icerik);
    if (!ic.success) continue;
    try {
      liste.push({ oneriId: o.id, dersId: o.hedefId, taslak: gecerliTaslak(ic.data as never, k) });
    } catch {
      // Okunamayan düzeltme yazılmaz.
    }
  }
  return liste;
}
