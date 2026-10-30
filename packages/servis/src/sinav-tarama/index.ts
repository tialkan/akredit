// Toplu sınav kâğıdı taraması ve soru bazlı puan (İP-43).
//
// Akış: şablon (hoca bir kez işaretler) → tarama (kanıt hattına girmiş PDF/ZIP; kâğıtlara bölünür, her kutu
// kurum içi modelle okunur) → hücreler (otomatik ya da Katman 2 onay kartı) → kişi kararı → puanların ölçme
// aracına aktarımı → `@akredit/olcme` ile ÇK/PÇ.
//
// Güvenceler:
// - Yalnız kurum içi model (`yerel-model.ts`); yoksa iş başlamaz. Kurumun yurt dışı izni ve anahtarı okunmaz.
// - Öğrenci numarası okunur okunmaz HMAC takma ada çevrilir (`takmaAdUret`); veritabanına, günlüğe ve model
//   istemine açık hâlde yazılmaz. Numara kutusu modele hiç gönderilmez; kırpıntı kanıt deposunda kalır.
// - Toplam tutarsızlığı ve azami puan aşımı eşikten bağımsız olarak her zaman onaya (Katman 2) düşer.
// - Okuma, güven, durum ve karar değiştirilemez günlüğe yazılır; tablolar yalnız eklenir.

import { zorunluKararDenetle } from "@akredit/cekirdek";
import { type DersOlcmeSonucu, dersiOlc } from "@akredit/olcme";
import { sema } from "@akredit/vt";
import type { CikisKaydi, FetchIslevi } from "@akredit/yz";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { gunluge, islem, type ServisBaglami } from "../baglam.ts";
import { takmaAdUret } from "../ders-dosyasi/index.ts";
import { bulunamadi, ServisHatasi } from "../hata.ts";
import {
  binde,
  type DegerlendirilmisHucre,
  hucreKatmani,
  KagitSiniriHatasi,
  kagidiDegerlendir,
  kagitlaraBol,
  metindeSayiVarMi,
  numarayiOku,
  type OkunanHucre,
} from "./saf.ts";
import { type HucreNedeni, NUMARA_ALANI, Sablon, type TaramaKaynagi, TOPLAM_ALANI } from "./turler.ts";
import { type AdCozucu, type YerelOkuyucu, yerelOkuyucuKur } from "./yerel-model.ts";

export * from "./saf.ts";
export * from "./turler.ts";
export * from "./yerel-model.ts";

/** Varsayılan güven eşiği. Yerel modelin el yazısı doğruluğu DOĞRULANMADI; pilotta ölçülüp ayarlanacak. */
export const VARSAYILAN_ESIK = 0.9;

const uuid = z.string().uuid();

async function aracDersi(tx: Parameters<Parameters<typeof islem>[1]>[0], aracId: string) {
  const [r] = await tx
    .select({ arac: sema.olcmeAraci, dersId: sema.dersAcilisi.dersId })
    .from(sema.olcmeAraci)
    .innerJoin(sema.dersAcilisi, eq(sema.dersAcilisi.id, sema.olcmeAraci.dersAcilisiId))
    .where(eq(sema.olcmeAraci.id, aracId));
  if (!r) throw bulunamadi();
  return r;
}

export const SablonGirdisi = z.object({ olcmeAraciId: uuid, sablon: Sablon }).strict();

/** Şablonu kaydeder. Şablondaki her soru, ölçme aracında kayıtlı bir soru olmalı. Yeni sürüm yeni kayıttır. */
export async function sablonKaydet(b: ServisBaglami, girdi: unknown): Promise<{ id: string }> {
  const g = SablonGirdisi.parse(girdi);
  return islem(b, async (tx, gerekli) => {
    const { dersId } = await aracDersi(tx, g.olcmeAraciId);
    await gerekli("olcme.veri_gir", { tur: "ders", id: dersId });
    const sorular = await tx
      .select({ numara: sema.soru.numara })
      .from(sema.soru)
      .where(eq(sema.soru.olcmeAraciId, g.olcmeAraciId));
    const kayitli = new Set(sorular.map((q) => q.numara));
    const yok = g.sablon.sorular.filter((q) => !kayitli.has(q.soruNo)).map((q) => q.soruNo);
    if (yok.length)
      throw new ServisHatasi(
        "kural_ihlali",
        `Şablondaki ${yok.map((n) => `S${n}`).join(", ")} bu sınavda kayıtlı değil. Önce soruları ve azami puanlarını girin.`,
      );
    const [s] = await tx
      .insert(sema.sinavSablonu)
      .values({
        kurumId: b.aktor.kurumId,
        olcmeAraciId: g.olcmeAraciId,
        sablon: g.sablon,
        olusturanKisiId: b.aktor.kisiId,
      })
      .returning({ id: sema.sinavSablonu.id });
    if (!s) throw new Error("Şablon eklenemedi.");
    await gunluge(
      tx,
      b,
      "sinav.sablon_kaydedildi",
      { tur: "sinav_sablonu", id: s.id },
      {
        olcmeAraciId: g.olcmeAraciId,
        soruSayisi: g.sablon.sorular.length,
      },
    );
    return { id: s.id };
  });
}

export const TaramaGirdisi = z
  .object({ olcmeAraciId: uuid, kanitId: uuid, esik: z.number().min(0.5).max(1).optional() })
  .strict();

export interface TaramaBagimliliklari {
  kaynak: TaramaKaynagi;
  /** Sunucu kurulumundaki yerel model ayarı (`ortamdanYerelModel`). Yoksa iş başlamaz. */
  yerelModel: unknown;
  /** Kurumun takma ad anahtarı (en az 32 bayt). */
  takmaAdAnahtari: string;
  /** Kırpıntıyı kanıt deposuna koyar, içerik özetini döndürür. */
  kirpintiKoy?: (kurumId: string, veri: Uint8Array) => Promise<{ ozet: string }>;
  fetch?: FetchIslevi;
  /** Model sunucusu adının çözücüsü (testte sahte). Verilmezse işletim sisteminin çözücüsü. */
  coz?: AdCozucu;
  /** Yalnız testler: yerel okuyucu yerine verilen okuyucu (yine de yurt içi olmalı). */
  okuyucu?: YerelOkuyucu;
}

export interface TaramaSonucu {
  taramaId: string;
  kagitSayisi: number;
  otomatik: number;
  onayBekleyen: number;
}

/**
 * Taranmış kâğıtları okur ve hücreleri yazar. Okuma işlem dışında yapılır (uzun sürer); yazım tek işlemdedir.
 * Yerel model yoksa ilk adımda durur; hiçbir şey okunmaz ve yazılmaz.
 */
export async function taramayiIsle(b: ServisBaglami, girdi: unknown, d: TaramaBagimliliklari): Promise<TaramaSonucu> {
  const g = TaramaGirdisi.parse(girdi);
  const cikislar: CikisKaydi[] = [];
  const okuyucu =
    d.okuyucu ??
    yerelOkuyucuKur(d.yerelModel, {
      ...(d.fetch ? { fetch: d.fetch } : {}),
      ...(d.coz ? { coz: d.coz } : {}),
      kaydet: (k) => cikislar.push(k),
    });
  if (Buffer.byteLength(d.takmaAdAnahtari) < 32)
    throw new ServisHatasi("beklenmeyen", "Öğrenci takma ad anahtarı tanımlı değil. Sistem yöneticisine bildirin.");
  const esik = g.esik ?? VARSAYILAN_ESIK;

  // 1. Yetki, şablon, sorular, kanıt.
  const hazirlik = await islem(b, async (tx, gerekli) => {
    const { dersId } = await aracDersi(tx, g.olcmeAraciId);
    await gerekli("olcme.veri_gir", { tur: "ders", id: dersId });
    const [k] = await tx.select({ id: sema.kanit.id }).from(sema.kanit).where(eq(sema.kanit.id, g.kanitId));
    if (!k) throw bulunamadi();
    const [s] = await tx
      .select()
      .from(sema.sinavSablonu)
      .where(eq(sema.sinavSablonu.olcmeAraciId, g.olcmeAraciId))
      .orderBy(desc(sema.sinavSablonu.olusturma), desc(sema.sinavSablonu.id))
      .limit(1);
    if (!s) throw new ServisHatasi("kural_ihlali", "Önce ilk kâğıt üzerinde soru kutularını işaretleyin.");
    const sorular = await tx
      .select({ numara: sema.soru.numara, tamPuan: sema.soru.tamPuan })
      .from(sema.soru)
      .where(eq(sema.soru.olcmeAraciId, g.olcmeAraciId));
    return {
      sablonId: s.id,
      sablon: Sablon.parse(s.sablon),
      azami: new Map(sorular.map((q) => [q.numara, Number(q.tamPuan)])),
    };
  });
  const { sablon, azami } = hazirlik;

  // 2. Kâğıt sınırları.
  const metinler: string[] = [];
  for (let i = 0; i < d.kaynak.sayfaSayisi; i++) metinler.push(await d.kaynak.sayfaMetni(i));
  let kagitlar: number[][];
  try {
    kagitlar = kagitlaraBol(sablon.sinir, metinler);
  } catch (e) {
    if (e instanceof KagitSiniriHatasi) throw new ServisHatasi("kural_ihlali", e.message);
    throw e;
  }

  // 3. Okuma. Numara deterministik okunur ve hemen takma ada çevrilir; numara kutusu modele gitmez.
  interface Kagit {
    takmaAd: string | null;
    kirpintiOzeti: string | null;
    hucreler: DegerlendirilmisHucre[];
  }
  const okunan: Kagit[] = [];
  const sayfa = (k: number[], s: number) => {
    const p = k[s - 1];
    if (p === undefined) throw new ServisHatasi("kural_ihlali", "Şablondaki bir kutu kâğıdın sayfa sayısını aşıyor.");
    return p;
  };
  for (const k of kagitlar) {
    const nb = await d.kaynak.bolge(sayfa(k, sablon.numara.sayfa), sablon.numara, NUMARA_ALANI);
    const no = numarayiOku(nb.metin, sablon.numaraUzunlugu);
    const takmaAd = no === null ? null : takmaAdUret(d.takmaAdAnahtari, b.aktor.kurumId, no);
    const kirpintiOzeti =
      nb.kirpinti && d.kirpintiKoy ? (await d.kirpintiKoy(b.aktor.kurumId, nb.kirpinti)).ozet : null;
    const sorular: OkunanHucre[] = [];
    for (const q of sablon.sorular) {
      const bo = await d.kaynak.bolge(sayfa(k, q.kutu.sayfa), q.kutu, q.soruNo);
      const o = await okuyucu.oku({ alan: q.soruNo, azami: azami.get(q.soruNo) ?? null, metin: bo.metin });
      sorular.push({ alan: q.soruNo, ...o, metinde: metindeSayiVarMi(bo.metin, o.deger) });
    }
    let toplam: OkunanHucre | null = null;
    if (sablon.toplam) {
      const bo = await d.kaynak.bolge(sayfa(k, sablon.toplam.sayfa), sablon.toplam, TOPLAM_ALANI);
      const o = await okuyucu.oku({ alan: TOPLAM_ALANI, azami: null, metin: bo.metin });
      toplam = { alan: TOPLAM_ALANI, ...o, metinde: metindeSayiVarMi(bo.metin, o.deger) };
    }
    okunan.push({
      takmaAd,
      kirpintiOzeti,
      hucreler: kagidiDegerlendir({ sorular, toplam, numaraOkundu: takmaAd !== null, azami, esik }),
    });
  }

  // 4. Yazım: tarama, hücreler, günlük.
  return islem(b, async (tx, gerekli) => {
    const { dersId } = await aracDersi(tx, g.olcmeAraciId);
    await gerekli("olcme.veri_gir", { tur: "ders", id: dersId });
    const [t] = await tx
      .insert(sema.sinavTaramasi)
      .values({
        kurumId: b.aktor.kurumId,
        olcmeAraciId: g.olcmeAraciId,
        sablonId: hazirlik.sablonId,
        kanitId: g.kanitId,
        saglayici: okuyucu.ad,
        model: okuyucu.model,
        esik,
        kagitSayisi: okunan.length,
        baslatanKisiId: b.aktor.kisiId,
      })
      .returning({ id: sema.sinavTaramasi.id });
    if (!t) throw new Error("Tarama eklenemedi.");
    await gunluge(
      tx,
      b,
      "sinav.tarama_yapildi",
      { tur: "sinav_taramasi", id: t.id },
      {
        kanitId: g.kanitId,
        kagitSayisi: okunan.length,
        saglayici: okuyucu.ad,
        model: okuyucu.model,
        kip: "kurum_ici",
        yzCagrisi: cikislar.length,
        esik,
      },
    );
    let otomatik = 0;
    let onayBekleyen = 0;
    for (const [i, k] of okunan.entries()) {
      for (const h of k.hucreler) {
        const [satir] = await tx
          .insert(sema.sinavHucresi)
          .values({
            kurumId: b.aktor.kurumId,
            taramaId: t.id,
            kagitSira: i + 1,
            ogrenciTakmaAd: k.takmaAd,
            alan: h.alan,
            deger: h.deger === null ? null : (binde(h.deger) / 1000).toFixed(3),
            guven: h.guven,
            durum: h.durum,
            katman: h.katman,
            nedenler: h.nedenler,
            kirpintiOzeti: h.alan === NUMARA_ALANI ? k.kirpintiOzeti : null,
          })
          .returning({ id: sema.sinavHucresi.id });
        if (!satir) throw new Error("Hücre eklenemedi.");
        if (h.durum === "otomatik") otomatik++;
        else onayBekleyen++;
        // Günlükte numara yoktur: yalnız kâğıt sırası, alan, okunan puan, güven, durum, katman, nedenler.
        await gunluge(
          tx,
          b,
          "sinav.hucre_okundu",
          { tur: "sinav_hucresi", id: satir.id },
          {
            taramaId: t.id,
            kagit: i + 1,
            alan: h.alan,
            deger: h.deger === null ? null : (binde(h.deger) / 1000).toFixed(3),
            guven: h.guven,
            durum: h.durum === "otomatik" ? "otomatik_okundu" : "onay_bekliyor",
            katman: h.katman,
            nedenler: h.nedenler,
          },
        );
      }
    }
    return { taramaId: t.id, kagitSayisi: okunan.length, otomatik, onayBekleyen };
  });
}

export interface HucreKarti {
  hucreId: string;
  kagitSira: number;
  alan: string;
  deger: number | null;
  azami: number | null;
  guven: number;
  nedenler: HucreNedeni[];
  katman: ReturnType<typeof hucreKatmani>;
  kirpintiOzeti: string | null;
  karar: { sonuc: "onaylandi" | "duzeltildi"; deger: number | null; zaman: string } | null;
}

export interface TaramaGorunumu {
  taramaId: string;
  olcmeAraciId: string;
  kagitSayisi: number;
  saglayici: string;
  model: string;
  esik: number;
  /** Onay bekleyen ve henüz karara bağlanmamış kartlar (Katman 2). */
  kartlar: HucreKarti[];
  /** Bütün hücreler; otomatik okunanlar da her zaman görülebilir. */
  hucreler: HucreKarti[];
  aktarildi: boolean;
}

const sayi = (v: string | null) => (v === null ? null : Number(v));

/** Taramanın hücrelerini ve onay kartlarını verir. Numara gösterilmez. */
export async function taramaGorunumu(b: ServisBaglami, taramaId: string): Promise<TaramaGorunumu> {
  uuid.parse(taramaId);
  return islem(b, async (tx, gerekli) => {
    const [t] = await tx.select().from(sema.sinavTaramasi).where(eq(sema.sinavTaramasi.id, taramaId));
    if (!t) throw bulunamadi();
    const { dersId } = await aracDersi(tx, t.olcmeAraciId);
    await gerekli("olcme.oku", { tur: "ders", id: dersId });
    const sorular = await tx.select().from(sema.soru).where(eq(sema.soru.olcmeAraciId, t.olcmeAraciId));
    const azami = new Map(sorular.map((q) => [q.numara, Number(q.tamPuan)]));
    const satirlar = await tx
      .select({ h: sema.sinavHucresi, k: sema.sinavHucreKarari })
      .from(sema.sinavHucresi)
      .leftJoin(sema.sinavHucreKarari, eq(sema.sinavHucreKarari.hucreId, sema.sinavHucresi.id))
      .where(eq(sema.sinavHucresi.taramaId, taramaId))
      .orderBy(asc(sema.sinavHucresi.kagitSira), asc(sema.sinavHucresi.id));
    const hucreler: HucreKarti[] = satirlar.map(({ h, k }) => {
      const nedenler = h.nedenler as HucreNedeni[];
      return {
        hucreId: h.id,
        kagitSira: h.kagitSira,
        alan: h.alan,
        deger: sayi(h.deger),
        azami: azami.get(h.alan) ?? null,
        guven: h.guven,
        nedenler,
        katman:
          h.durum === "onay_bekliyor"
            ? hucreKatmani(nedenler)
            : { katman: 0, kural: "K0-otomatik-okundu", gerekce: "Otomatik okundu.", devredilemez: false },
        kirpintiOzeti: h.kirpintiOzeti,
        karar: k
          ? { sonuc: k.sonuc as "onaylandi" | "duzeltildi", deger: sayi(k.deger), zaman: k.zaman?.toISOString() ?? "" }
          : null,
      };
    });
    const [aktarim] = await tx
      .select({ id: sema.gunluk.id })
      .from(sema.gunluk)
      .where(and(eq(sema.gunluk.eylem, "sinav.puanlar_aktarildi"), eq(sema.gunluk.hedefId, taramaId)))
      .limit(1);
    return {
      taramaId,
      olcmeAraciId: t.olcmeAraciId,
      kagitSayisi: t.kagitSayisi,
      saglayici: t.saglayici,
      model: t.model,
      esik: t.esik,
      kartlar: hucreler.filter((h) => h.katman.katman === 2 && h.karar === null),
      hucreler,
      aktarildi: Boolean(aktarim),
    };
  });
}

export const HucreKarariGirdisi = z
  .object({
    hucreId: uuid,
    sonuc: z.enum(["onaylandi", "duzeltildi"]),
    deger: z.number().finite().min(0).max(100000).nullable().optional(),
    /** Yalnız numara kutusunda: kişinin kâğıttan okuduğu numara. Hemen takma ada çevrilir. */
    ogrenciNo: z
      .string()
      .trim()
      .regex(/^\d{4,14}$/u)
      .optional(),
    toplu: z.boolean().optional(),
  })
  .strict();

/**
 * Onay kartına kişinin kararı. Katman 2: yalnız doğrudan, tek tek. Düzeltilen puan azami puanı aşamaz;
 * okunamayan ya da tutarsız hücre düzeltmeden onaylanamaz. Numara kartı numara girilmeden kapanmaz.
 */
export async function hucreKarari(
  b: ServisBaglami,
  girdi: unknown,
  takmaAdAnahtari: string,
): Promise<{ kararId: string }> {
  const g = HucreKarariGirdisi.parse(girdi);
  return islem(b, async (tx, gerekli) => {
    const [h] = await tx.select().from(sema.sinavHucresi).where(eq(sema.sinavHucresi.id, g.hucreId));
    if (!h) throw bulunamadi();
    const [t] = await tx.select().from(sema.sinavTaramasi).where(eq(sema.sinavTaramasi.id, h.taramaId));
    if (!t) throw bulunamadi();
    const { dersId } = await aracDersi(tx, t.olcmeAraciId);
    await gerekli("olcme.veri_gir", { tur: "ders", id: dersId });
    if (h.durum !== "onay_bekliyor") throw new ServisHatasi("kural_ihlali", "Bu hücre onay beklemiyor.");
    const nedenler = h.nedenler as HucreNedeni[];
    const katman = hucreKatmani(nedenler);
    const denet = zorunluKararDenetle(katman, {
      dayanak: "dogrudan",
      kararVeren: b.aktor.kisiId,
      ...(g.toplu ? { toplu: true } : {}),
    });
    if (!denet.gecerli) throw new ServisHatasi("kural_ihlali", denet.hatalar.join(" "));
    let deger: number | null = null;
    let takmaAd: string | null = null;
    if (h.alan === NUMARA_ALANI) {
      if (!g.ogrenciNo) throw new ServisHatasi("gecersiz_istek", "Kâğıttaki öğrenci numarasını yazın.");
      takmaAd = takmaAdUret(takmaAdAnahtari, b.aktor.kurumId, g.ogrenciNo);
    } else {
      deger = g.sonuc === "duzeltildi" ? (g.deger ?? null) : sayi(h.deger);
      if (deger === null) throw new ServisHatasi("gecersiz_istek", "Puan okunamadı. Kâğıttaki puanı yazarak düzeltin.");
      if (h.alan !== TOPLAM_ALANI) {
        const [q] = await tx
          .select({ tamPuan: sema.soru.tamPuan })
          .from(sema.soru)
          .where(and(eq(sema.soru.olcmeAraciId, t.olcmeAraciId), eq(sema.soru.numara, h.alan)));
        if (q && binde(deger) > binde(Number(q.tamPuan)))
          throw new ServisHatasi(
            "kural_ihlali",
            `S${h.alan} için en çok ${Number(q.tamPuan)} puan verilebilir. Puanı düzeltin.`,
          );
      }
    }
    const [k] = await tx
      .insert(sema.sinavHucreKarari)
      .values({
        kurumId: b.aktor.kurumId,
        hucreId: h.id,
        sonuc: g.sonuc,
        deger: deger === null ? null : (binde(deger) / 1000).toFixed(3),
        ogrenciTakmaAd: takmaAd,
        kararVerenKisiId: b.aktor.kisiId,
        dayanak: "dogrudan",
        zaman: b.simdi(),
      })
      .returning({ id: sema.sinavHucreKarari.id });
    if (!k) throw new Error("Karar eklenemedi.");
    await gunluge(
      tx,
      b,
      "sinav.hucre_karari",
      { tur: "sinav_hucresi", id: h.id },
      {
        kararId: k.id,
        taramaId: t.id,
        kagit: h.kagitSira,
        alan: h.alan,
        sonuc: g.sonuc,
        deger: deger === null ? null : (binde(deger) / 1000).toFixed(3),
        katman: 2,
        kural: katman.kural,
        dayanak: "dogrudan",
      },
    );
    return { kararId: k.id };
  });
}

/**
 * Bütün kartlar kapandıysa kâğıtların soru puanlarını ölçme aracına (`ogrenci_puani`) aktarır. Kâğıttaki toplam
 * aktarılmaz (ölçme motoru toplamı kendisi hesaplar). Aynı öğrenci için ikinci kâğıt ya da daha önce aktarılmış
 * puan varsa durur.
 */
export async function puanlariAktar(
  b: ServisBaglami,
  taramaId: string,
): Promise<{ ogrenciSayisi: number; puanSayisi: number }> {
  uuid.parse(taramaId);
  return islem(b, async (tx, gerekli) => {
    const [t] = await tx.select().from(sema.sinavTaramasi).where(eq(sema.sinavTaramasi.id, taramaId));
    if (!t) throw bulunamadi();
    const { dersId } = await aracDersi(tx, t.olcmeAraciId);
    await gerekli("olcme.veri_gir", { tur: "ders", id: dersId });
    const satirlar = await tx
      .select({ h: sema.sinavHucresi, k: sema.sinavHucreKarari })
      .from(sema.sinavHucresi)
      .leftJoin(sema.sinavHucreKarari, eq(sema.sinavHucreKarari.hucreId, sema.sinavHucresi.id))
      .where(eq(sema.sinavHucresi.taramaId, taramaId));
    const bekleyen = satirlar.filter(({ h, k }) => h.durum === "onay_bekliyor" && !k).length;
    if (bekleyen)
      throw new ServisHatasi(
        "kural_ihlali",
        `${bekleyen} hücre onayınızı bekliyor. Önce onları onaylayın ya da düzeltin.`,
      );
    const sorular = await tx.select().from(sema.soru).where(eq(sema.soru.olcmeAraciId, t.olcmeAraciId));
    const soruId = new Map(sorular.map((q) => [q.numara, q.id]));
    const kagitlar = new Map<number, typeof satirlar>();
    for (const s of satirlar) kagitlar.set(s.h.kagitSira, [...(kagitlar.get(s.h.kagitSira) ?? []), s]);
    const ogrenciler = new Set<string>();
    const puanlar: (typeof sema.ogrenciPuani.$inferInsert)[] = [];
    for (const [sira, hs] of [...kagitlar].sort((a, c) => a[0] - c[0])) {
      const n = hs.find((x) => x.h.alan === NUMARA_ALANI);
      const takmaAd = n?.k?.ogrenciTakmaAd ?? n?.h.ogrenciTakmaAd ?? null;
      if (!takmaAd) throw new ServisHatasi("kural_ihlali", `${sira}. kâğıdın öğrenci numarası belirlenmedi.`);
      if (ogrenciler.has(takmaAd))
        throw new ServisHatasi(
          "kural_ihlali",
          `${sira}. kâğıt aynı öğrenciye ait ikinci kâğıt görünüyor. Numarayı kontrol edin.`,
        );
      ogrenciler.add(takmaAd);
      for (const { h, k } of hs) {
        const id = soruId.get(h.alan);
        if (!id) continue;
        const deger = k ? k.deger : h.deger;
        puanlar.push({
          kurumId: b.aktor.kurumId,
          olcmeAraciId: t.olcmeAraciId,
          soruId: id,
          ogrenciTakmaAd: takmaAd,
          puan: deger,
        });
      }
    }
    const varolan = ogrenciler.size
      ? await tx
          .select({ id: sema.ogrenciPuani.id })
          .from(sema.ogrenciPuani)
          .where(
            and(
              eq(sema.ogrenciPuani.olcmeAraciId, t.olcmeAraciId),
              inArray(sema.ogrenciPuani.ogrenciTakmaAd, [...ogrenciler]),
            ),
          )
          .limit(1)
      : [];
    if (varolan.length) throw new ServisHatasi("cakisma", "Bu öğrencilerin puanları bu sınav için zaten aktarılmış.");
    for (let i = 0; i < puanlar.length; i += 500) await tx.insert(sema.ogrenciPuani).values(puanlar.slice(i, i + 500));
    await gunluge(
      tx,
      b,
      "sinav.puanlar_aktarildi",
      { tur: "sinav_taramasi", id: taramaId },
      {
        olcmeAraciId: t.olcmeAraciId,
        ogrenciSayisi: ogrenciler.size,
        puanSayisi: puanlar.length,
      },
    );
    return { ogrenciSayisi: ogrenciler.size, puanSayisi: puanlar.length };
  });
}

/**
 * Aracın puanlarından ÇK/PÇ sağlanmasını `@akredit/olcme` ile deterministik hesaplar. Soru-çıktı eşlemesi
 * soruda kayıtlı onaylı eşlemedir (`soru.cikti_eslemesi`). Model hiçbir sayıya dokunmaz.
 */
export async function olcmeHesapla(b: ServisBaglami, olcmeAraciId: string): Promise<DersOlcmeSonucu> {
  uuid.parse(olcmeAraciId);
  return islem(b, async (tx, gerekli) => {
    const { arac, dersId } = await aracDersi(tx, olcmeAraciId);
    await gerekli("olcme.oku", { tur: "ders", id: dersId });
    const [ders] = await tx.select().from(sema.ders).where(eq(sema.ders.id, dersId));
    const sorular = await tx
      .select()
      .from(sema.soru)
      .where(eq(sema.soru.olcmeAraciId, olcmeAraciId))
      .orderBy(asc(sema.soru.numara));
    const ciktiIdleri = [
      ...new Set(sorular.flatMap((q) => (q.ciktiEslemesi as { ciktiId: string }[]).map((e) => e.ciktiId))),
    ];
    const ciktilar = ciktiIdleri.length
      ? await tx
          .select({ id: sema.cikti.id, kod: sema.cikti.kod })
          .from(sema.cikti)
          .where(inArray(sema.cikti.id, ciktiIdleri))
      : [];
    const kod = new Map(ciktilar.map((c) => [c.id, c.kod]));
    const soruNo = new Map(sorular.map((q) => [q.id, q.numara]));
    const puanlar = await tx.select().from(sema.ogrenciPuani).where(eq(sema.ogrenciPuani.olcmeAraciId, olcmeAraciId));
    return dersiOlc({
      dersKodu: ders?.kod ?? "",
      donem: "",
      ciktilar: [...new Set(ciktilar.map((c) => c.kod))].sort().map((k) => ({ kod: k })),
      araclar: [
        {
          id: arac.id,
          tur: arac.tur,
          ad: arac.ad ?? arac.tur,
          agirlik: 100,
          sorular: sorular.map((q) => ({
            no: q.numara,
            tamPuan: Number(q.tamPuan),
            eslemeler: (q.ciktiEslemesi as { ciktiId: string; agirlik: number }[])
              .filter((e) => kod.has(e.ciktiId))
              .map((e) => ({ ciktiKod: kod.get(e.ciktiId) as string, agirlik: e.agirlik })),
          })),
        },
      ],
      puanlar: puanlar.map((p) => ({
        ogrenci: p.ogrenciTakmaAd,
        aracId: arac.id,
        soruNo: p.soruId ? (soruNo.get(p.soruId) ?? "*") : "*",
        puan: p.puan === null ? null : Number(p.puan),
      })),
    });
  });
}
