// Süreç motorunun veritabanı tarafı. Saf motor (`@akredit/surec`) ne yapılacağını söyler; burada
// eylemler kiracı işleminde uygulanır: görev ve son tarih açılır, uygulama içi bildirim yazılır,
// durum değiştiren her adım değiştirilemez günlüğe girer.
//
// Örnek durumu: `surec_ornegi.kapsam` = { kapsam, atamalar, motor: { baslangic, olaylar, gonderilenler } }.
// Adım durumu görev satırlarından kurulur (`gorev.ayrinti.adim`). Görev kanıtsız kapanmaz.

import type { JsonDegeri } from "@akredit/cekirdek";
import {
  type AdimDurumu,
  baslatmaZamani,
  bastirilanAnahtarlar,
  type EpostaTasiyici,
  type Eylem,
  epostaZamani,
  HAZIR_SURECLER,
  ilerlet,
  kalanGun,
  kapatilabilirMi,
  kisiTercihi,
  type MotorBaglami,
  type OrnekDurumu,
  ozetEposta,
  type Saat,
  type SurecAyari,
  SurecTanimi,
  sonrakiUyanma,
  surecAyariOku,
} from "@akredit/surec";
import { gunlugeYaz, type Islem, kiraciIslemi, sema, type Vt } from "@akredit/vt";
import { and, asc, eq, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";

export interface SurecBaglami {
  db: Vt;
  saat: Saat;
  eposta: EpostaTasiyici;
  /** Çerçeve verisinden gelen takvim tarihleri (ör. çerçevenin ilan ettiği son tarihler). Kurum ayarı önceliklidir. */
  cerceveTakvimi?: (kurumId: string) => Promise<Record<string, string>>;
}

export type Aktor = { tur: "kisi"; id: string } | { tur: "sistem"; id: null };
export const SISTEM: Aktor = { tur: "sistem", id: null };

/** Kullanıcıya gösterilebilir iş kuralı hatası. */
export class SurecHatasi extends Error {
  override name = "SurecHatasi";
}

const Rol = z.string();
const OrnekKapsami = z.object({
  kapsam: z.record(z.string(), z.unknown()).default({}),
  atamalar: z.record(Rol, z.string().uuid()).default({}),
  /** Kendiliğinden başlatılan örneklerin tekil anahtarı (tanım kodu + başlama tarihi). */
  otomatik: z.string().optional(),
  motor: z.object({
    baslangic: z.string(),
    olaylar: z.array(z.string()).default([]),
    gonderilenler: z.record(z.string(), z.array(z.string())).default({}),
  }),
});
type OrnekKapsami = z.infer<typeof OrnekKapsami>;

const GorevAyrintisi = z.object({
  adim: z.string(),
  aciklama: z.string().optional(),
  kanitIdleri: z.array(z.string().uuid()).default([]),
  sonTarih: z.string().optional(),
  tamamlayanKisiId: z.string().uuid().optional(),
  tamamlanma: z.string().optional(),
});

const BildirimIcerigi = z.object({
  baslik: z.string(),
  metin: z.string(),
  eposta: z
    .object({
      durum: z.enum(["bekliyor", "gonderildi", "yok"]),
      zaman: z.string().optional(),
      deneme: z.number().int().default(0),
    })
    .default({ durum: "yok", deneme: 0 }),
});

function json(v: unknown): JsonDegeri {
  return JSON.parse(JSON.stringify(v)) as JsonDegeri;
}

async function kurumAyari(tx: Islem, kurumId: string): Promise<{ ayar: SurecAyari; ham: Record<string, unknown> }> {
  const [k] = await tx.select({ a: sema.kurum.ayarlar }).from(sema.kurum).where(eq(sema.kurum.id, kurumId));
  if (!k) throw new SurecHatasi("Kurum bulunamadı.");
  const ham = (k.a ?? {}) as Record<string, unknown>;
  return { ayar: surecAyariOku(ham), ham };
}

async function motorBaglami(b: SurecBaglami, kurumId: string, ayar: SurecAyari): Promise<MotorBaglami> {
  const cerceve = b.cerceveTakvimi ? await b.cerceveTakvimi(kurumId) : {};
  return {
    simdi: b.saat.simdi(),
    takvim: { ...cerceve, ...ayar.takvim },
    saatDilimi: ayar.saatDilimi,
    gunSaati: ayar.gunSaati,
  };
}

// ---------- Tanımlar ----------

/** Tanımı yeni sürüm olarak kaydeder (eski sürümler kalır; açık örnekler kendi sürümleriyle sürer). */
export async function tanimKaydet(b: SurecBaglami, kurumId: string, girdi: unknown, aktor: Aktor) {
  const tanim = SurecTanimi.parse(girdi);
  return kiraciIslemi(b.db, kurumId, async (tx) => {
    const onceki = await tx
      .select({ surum: sema.surecTanimi.surum })
      .from(sema.surecTanimi)
      .where(eq(sema.surecTanimi.kod, tanim.kod));
    const surum = Math.max(0, ...onceki.map((x) => x.surum)) + 1;
    const [s] = await tx
      .insert(sema.surecTanimi)
      .values({ kurumId, kod: tanim.kod, ad: tanim.ad, tanim: json(tanim) as object, surum })
      .returning({ id: sema.surecTanimi.id });
    if (!s) throw new Error("Süreç tanımı eklenemedi.");
    await gunlugeYaz(tx, {
      aktor,
      eylem: "surec.tanim_kaydedildi",
      hedef: { tur: "surec_tanimi", id: s.id },
      ayrinti: { kod: tanim.kod, surum },
      zaman: b.saat.simdi(),
    });
    return { id: s.id, surum };
  });
}

/** Kurumda olmayan hazır süreçleri ekler. */
export async function hazirSurecleriYukle(b: SurecBaglami, kurumId: string, aktor: Aktor = SISTEM) {
  const var_ = await kiraciIslemi(b.db, kurumId, (tx) =>
    tx.select({ kod: sema.surecTanimi.kod }).from(sema.surecTanimi),
  );
  const kodlar = new Set(var_.map((x) => x.kod));
  const eklenen: string[] = [];
  for (const t of HAZIR_SURECLER)
    if (!kodlar.has(t.kod)) {
      await tanimKaydet(b, kurumId, t, aktor);
      eklenen.push(t.kod);
    }
  return eklenen;
}

async function enSonTanimlar(tx: Islem) {
  const satirlar = await tx.select().from(sema.surecTanimi).orderBy(asc(sema.surecTanimi.surum));
  const son = new Map<string, (typeof satirlar)[number]>();
  for (const s of satirlar) son.set(s.kod, s);
  return [...son.values()];
}

// ---------- Örnek ----------

export interface BaslatmaGirdisi {
  kod: string;
  /** Kapsam (ör. `{ tur: "program", id }`, dönem). Görevlerin ve bildirimlerin bağlamıdır. */
  kapsam?: Record<string, unknown>;
  /** Rol → kişi kimliği. Verilmeyen rol için kurumdaki etkin rol ataması aranır. */
  atamalar?: Record<string, string>;
}

async function ornekEkle(
  tx: Islem,
  b: SurecBaglami,
  kurumId: string,
  tanimId: string,
  kod: string,
  g: BaslatmaGirdisi,
  aktor: Aktor,
  otomatik?: string,
) {
  const kapsam: OrnekKapsami = {
    kapsam: g.kapsam ?? {},
    atamalar: g.atamalar ?? {},
    ...(otomatik ? { otomatik } : {}),
    motor: { baslangic: b.saat.simdi().toISOString(), olaylar: [], gonderilenler: {} },
  };
  OrnekKapsami.parse(kapsam);
  const [o] = await tx
    .insert(sema.surecOrnegi)
    .values({ kurumId, surecTanimiId: tanimId, kapsam: json(kapsam) as object, durum: "acik" })
    .returning({ id: sema.surecOrnegi.id });
  if (!o) throw new Error("Süreç örneği eklenemedi.");
  await gunlugeYaz(tx, {
    aktor,
    eylem: "surec.baslatildi",
    hedef: { tur: "surec_ornegi", id: o.id },
    ayrinti: { kod, ...(otomatik ? { otomatik } : {}) },
    zaman: b.saat.simdi(),
  });
  return o.id;
}

/** Süreci elle başlatır ve ilk adımları açar. */
export async function surecBaslat(b: SurecBaglami, kurumId: string, g: BaslatmaGirdisi, aktor: Aktor) {
  const id = await kiraciIslemi(b.db, kurumId, async (tx) => {
    const t = (await enSonTanimlar(tx)).find((x) => x.kod === g.kod);
    if (!t) throw new SurecHatasi("Bu süreç kurumunuzda tanımlı değil. Önce süreci ekleyin.");
    for (const k of Object.values(g.atamalar ?? {})) await kisiDogrula(tx, k);
    return ornekEkle(tx, b, kurumId, t.id, t.kod, g, aktor);
  });
  await ornekIlerlet(b, kurumId, id);
  return id;
}

async function kisiDogrula(tx: Islem, kisiId: string) {
  const [k] = await tx.select({ id: sema.kisi.id }).from(sema.kisi).where(eq(sema.kisi.id, kisiId));
  if (!k) throw new SurecHatasi("Atanan kişi kurumunuzda bulunamadı.");
}

/** Bir olayı açık örneklere bildirir ve olayla başlayan tanımları başlatır. */
export async function olayYayinla(
  b: SurecBaglami,
  kurumId: string,
  olay: string,
  aktor: Aktor,
  g: { ornekId?: string; kapsam?: Record<string, unknown>; atamalar?: Record<string, string> } = {},
) {
  z.string()
    .regex(/^[a-z0-9_]{2,64}$/u)
    .parse(olay);
  const etkilenen = await kiraciIslemi(b.db, kurumId, async (tx) => {
    const ornekler = await tx
      .select()
      .from(sema.surecOrnegi)
      .where(and(eq(sema.surecOrnegi.durum, "acik"), g.ornekId ? eq(sema.surecOrnegi.id, g.ornekId) : undefined));
    const ids: string[] = [];
    for (const o of ornekler) {
      const k = OrnekKapsami.parse(o.kapsam);
      if (k.motor.olaylar.includes(olay)) continue;
      k.motor.olaylar.push(olay);
      await tx
        .update(sema.surecOrnegi)
        .set({ kapsam: json(k) as object })
        .where(eq(sema.surecOrnegi.id, o.id));
      ids.push(o.id);
    }
    if (!g.ornekId)
      for (const t of await enSonTanimlar(tx)) {
        const tanim = SurecTanimi.parse(t.tanim);
        if (tanim.baslatma.tur === "olay" && tanim.baslatma.olay === olay)
          ids.push(await ornekEkle(tx, b, kurumId, t.id, t.kod, { ...g, kod: t.kod }, aktor));
      }
    await gunlugeYaz(tx, { aktor, eylem: "surec.olay", ayrinti: { olay, ornekler: ids }, zaman: b.saat.simdi() });
    return ids;
  });
  for (const id of etkilenen) await ornekIlerlet(b, kurumId, id);
  return etkilenen;
}

// ---------- Görev: kanıt ve kapanış ----------

async function gorevOku(tx: Islem, gorevId: string) {
  const [g] = await tx.select().from(sema.gorev).where(eq(sema.gorev.id, gorevId));
  if (!g) throw new SurecHatasi("Görev bulunamadı.");
  return { g, ayrinti: GorevAyrintisi.parse(g.ayrinti) };
}

/** Kanıtı göreve bağlar. Kanıt kurumda bulunmalı; bağ yalnız eklenir. */
export async function kanitBagla(b: SurecBaglami, kurumId: string, gorevId: string, kanitId: string, aktor: Aktor) {
  await kiraciIslemi(b.db, kurumId, async (tx) => {
    const { g, ayrinti } = await gorevOku(tx, gorevId);
    if (g.durum !== "acik") throw new SurecHatasi("Kapanmış göreve kanıt eklenemez. Yeni bir görev açın.");
    const [k] = await tx.select({ id: sema.kanit.id }).from(sema.kanit).where(eq(sema.kanit.id, kanitId));
    if (!k) throw new SurecHatasi("Kanıt bulunamadı. Önce belgeyi yükleyin.");
    if (ayrinti.kanitIdleri.includes(kanitId)) return;
    ayrinti.kanitIdleri.push(kanitId);
    await tx
      .update(sema.gorev)
      .set({ ayrinti: json(ayrinti) as object })
      .where(eq(sema.gorev.id, gorevId));
    await gunlugeYaz(tx, {
      aktor,
      eylem: "surec.kanit_baglandi",
      hedef: { tur: "gorev", id: gorevId },
      ayrinti: { kanitId },
      zaman: b.saat.simdi(),
    });
  });
}

/** Görevi kapatır. Tanımın istediği sayıda kanıt bağlı değilse kapanmaz. */
export async function gorevTamamla(b: SurecBaglami, kurumId: string, gorevId: string, aktor: Aktor) {
  const ornekId = await kiraciIslemi(b.db, kurumId, async (tx) => {
    const { g, ayrinti } = await gorevOku(tx, gorevId);
    if (g.durum !== "acik") throw new SurecHatasi("Görev zaten kapanmış.");
    if (!g.surecOrnegiId) throw new SurecHatasi("Görev bir sürece bağlı değil.");
    const { tanim } = await ornekVeTanim(tx, g.surecOrnegiId);
    const adim = tanim.adimlar.find((a) => a.kod === ayrinti.adim);
    if (!adim) throw new SurecHatasi("Görevin adımı süreç tanımında yok.");
    const k = kapatilabilirMi(adim, { durum: "acik", kanitSayisi: ayrinti.kanitIdleri.length, gonderilenler: [] });
    if (!k.tamam)
      throw new SurecHatasi(
        `Bu görev kanıtsız kapanamaz. ${k.eksikKanit} kanıt daha bağlayın (ör. tutanak, çizelge, rapor).`,
      );
    const simdi = b.saat.simdi();
    const yeni = {
      ...ayrinti,
      tamamlanma: simdi.toISOString(),
      ...(aktor.tur === "kisi" ? { tamamlayanKisiId: aktor.id } : {}),
    };
    await tx
      .update(sema.gorev)
      .set({ durum: "tamam", ayrinti: json(yeni) as object })
      .where(eq(sema.gorev.id, gorevId));
    await gunlugeYaz(tx, {
      aktor,
      eylem: "surec.gorev_tamamlandi",
      hedef: { tur: "gorev", id: gorevId },
      ayrinti: { adim: adim.kod, kanitIdleri: ayrinti.kanitIdleri },
      zaman: simdi,
    });
    return g.surecOrnegiId;
  });
  await ornekIlerlet(b, kurumId, ornekId);
}

// ---------- İlerletme ----------

async function ornekVeTanim(tx: Islem, ornekId: string) {
  const [o] = await tx.select().from(sema.surecOrnegi).where(eq(sema.surecOrnegi.id, ornekId));
  if (!o) throw new SurecHatasi("Süreç bulunamadı.");
  const [t] = await tx.select().from(sema.surecTanimi).where(eq(sema.surecTanimi.id, o.surecTanimiId));
  if (!t) throw new Error("Süreç tanımı bulunamadı.");
  return { o, t, tanim: SurecTanimi.parse(t.tanim), kapsam: OrnekKapsami.parse(o.kapsam) };
}

async function ornekDurumu(tx: Islem, ornekId: string) {
  const r = await ornekVeTanim(tx, ornekId);
  const gorevler = await tx.select().from(sema.gorev).where(eq(sema.gorev.surecOrnegiId, ornekId));
  const adimlar: Record<string, AdimDurumu> = {};
  const gorevIdleri: Record<string, string> = {};
  for (const a of r.tanim.adimlar)
    adimlar[a.kod] = { durum: "bekliyor", kanitSayisi: 0, gonderilenler: r.kapsam.motor.gonderilenler[a.kod] ?? [] };
  for (const g of gorevler) {
    const ay = GorevAyrintisi.parse(g.ayrinti);
    const ad = adimlar[ay.adim];
    if (!ad) continue;
    ad.durum = g.durum === "tamam" ? "tamam" : "acik";
    ad.acilis = g.olusturma;
    if (ay.sonTarih) ad.sonTarih = new Date(ay.sonTarih);
    ad.kanitSayisi = ay.kanitIdleri.length;
    gorevIdleri[ay.adim] = g.id;
  }
  const d: OrnekDurumu = {
    baslangic: new Date(r.kapsam.motor.baslangic),
    olaylar: r.kapsam.motor.olaylar,
    adimlar,
    durum: r.o.durum === "kapali" ? "kapali" : "acik",
  };
  return { ...r, d, gorevIdleri };
}

/** Rol için kişi: önce örneğin ataması, sonra kurumdaki etkin rol ataması (en eski). */
async function rolKisisi(tx: Islem, kapsam: OrnekKapsami, rol: string, simdi: Date): Promise<string | null> {
  const atanan = kapsam.atamalar[rol];
  if (atanan) return atanan;
  const satirlar = await tx
    .select({ kisiId: sema.rolAtamasi.kisiId, bitis: sema.rolAtamasi.bitis, baslangic: sema.rolAtamasi.baslangic })
    .from(sema.rolAtamasi)
    .where(
      and(
        eq(sema.rolAtamasi.rol, rol as "ogretim_elemani"),
        or(isNull(sema.rolAtamasi.bitis), sql`${sema.rolAtamasi.bitis} > ${simdi.toISOString()}`),
      ),
    )
    .orderBy(asc(sema.rolAtamasi.baslangic));
  return satirlar.find((s) => s.baslangic <= simdi)?.kisiId ?? null;
}

async function bildirimYaz(
  tx: Islem,
  kurumId: string,
  ayar: SurecAyari,
  kisiId: string,
  tur: string,
  icerik: { baslik: string; metin: string; [k: string]: unknown },
  simdi: Date,
) {
  const zaman = epostaZamani(simdi, kisiTercihi(ayar, kisiId));
  const tam = {
    ...icerik,
    eposta: zaman ? { durum: "bekliyor", zaman: zaman.toISOString(), deneme: 0 } : { durum: "yok", deneme: 0 },
  };
  await tx.insert(sema.bildirim).values({ kurumId, kisiId, tur, icerik: json(tam) as object, olusturma: simdi });
}

const tarihMetni = (d: Date, tz: string) => d.toLocaleDateString("tr-TR", { timeZone: tz });

/** Örneği motorla ilerletir; eylemleri uygular. Sonraki uyanma anını döndürür. */
export async function ornekIlerlet(b: SurecBaglami, kurumId: string, ornekId: string): Promise<Date | null> {
  return kiraciIslemi(b.db, kurumId, async (tx) => {
    const { ayar } = await kurumAyari(tx, kurumId);
    const mb = await motorBaglami(b, kurumId, ayar);
    const r = await ornekDurumu(tx, ornekId);
    const { tanim, kapsam, d } = r;
    const simdi = mb.simdi;
    const eylemler: Eylem[] = ilerlet(tanim, d, mb);
    let kapsamDegisti = false;
    const isaretle = (adim: string, anahtarlar: string[]) => {
      const l = kapsam.motor.gonderilenler[adim] ?? [];
      for (const a of anahtarlar) if (!l.includes(a)) l.push(a);
      kapsam.motor.gonderilenler[adim] = l;
      const ad = d.adimlar[adim];
      if (ad) ad.gonderilenler = l;
      kapsamDegisti = true;
    };
    const yonetici = async () => rolKisisi(tx, kapsam, "kalite_komisyonu_baskani", simdi);

    for (const e of eylemler) {
      if (e.tur === "kapat") {
        await tx.update(sema.surecOrnegi).set({ durum: "kapali" }).where(eq(sema.surecOrnegi.id, ornekId));
        d.durum = "kapali";
        await gunlugeYaz(tx, {
          aktor: SISTEM,
          eylem: "surec.kapandi",
          hedef: { tur: "surec_ornegi", id: ornekId },
          ayrinti: { kod: tanim.kod },
          zaman: simdi,
        });
        continue;
      }
      const adim = tanim.adimlar.find((a) => a.kod === e.adim);
      if (!adim) continue;
      if (e.tur === "gorev_ac") {
        const kisi = await rolKisisi(tx, kapsam, adim.gorev.rol, simdi);
        const ayrinti = {
          adim: adim.kod,
          ...(adim.gorev.aciklama ? { aciklama: adim.gorev.aciklama } : {}),
          kanitIdleri: [],
          sonTarih: e.sonTarih.toISOString(),
        };
        const [g] = await tx
          .insert(sema.gorev)
          .values({
            kurumId,
            surecOrnegiId: ornekId,
            baslik: adim.gorev.baslik,
            atananKisiId: kisi,
            durum: "acik",
            ayrinti,
            olusturma: simdi,
          })
          .returning({ id: sema.gorev.id });
        if (!g) throw new Error("Görev eklenemedi.");
        await tx.insert(sema.sonTarih).values({ kurumId, gorevId: g.id, ad: adim.ad, tarih: e.sonTarih });
        r.gorevIdleri[adim.kod] = g.id;
        const ad = d.adimlar[adim.kod];
        if (ad) Object.assign(ad, { durum: "acik", acilis: simdi, sonTarih: e.sonTarih });
        await gunlugeYaz(tx, {
          aktor: SISTEM,
          eylem: "surec.gorev_acildi",
          hedef: { tur: "gorev", id: g.id },
          ayrinti: { ornekId, adim: adim.kod, sonTarih: e.sonTarih.toISOString(), atandi: kisi !== null },
          zaman: simdi,
        });
        const metin = `${adim.gorev.baslik}. Son tarih: ${tarihMetni(e.sonTarih, ayar.saatDilimi)}.`;
        if (kisi)
          await bildirimYaz(
            tx,
            kurumId,
            ayar,
            kisi,
            "gorev_acildi",
            { baslik: "Yeni görev", metin, gorevId: g.id, ornekId },
            simdi,
          );
        else {
          const y = await yonetici();
          if (y)
            await bildirimYaz(
              tx,
              kurumId,
              ayar,
              y,
              "atanamadi",
              {
                baslik: "Görev kimseye atanamadı",
                metin: `${metin} Bu rol için kimse tanımlı değil; bir kişi atayın.`,
                gorevId: g.id,
                ornekId,
              },
              simdi,
            );
        }
        continue;
      }
      // Zamanlı eylemler
      isaretle(adim.kod, [e.anahtar, ...bastirilanAnahtarlar(tanim, d, e, simdi)]);
      const gorevId = r.gorevIdleri[adim.kod];
      if (e.tur === "eksik_tarih") {
        const adlar = e.takvimAnahtarlari.map((k) => tanim.takvimAnahtarlari[k] ?? k).join(", ");
        await gunlugeYaz(tx, {
          aktor: SISTEM,
          eylem: "surec.tarih_eksik",
          hedef: { tur: "surec_ornegi", id: ornekId },
          ayrinti: { adim: adim.kod, takvimAnahtarlari: e.takvimAnahtarlari },
          zaman: simdi,
        });
        const y = await yonetici();
        if (y)
          await bildirimYaz(
            tx,
            kurumId,
            ayar,
            y,
            "tarih_eksik",
            {
              baslik: "Takvimde tarih eksik",
              metin: `"${tanim.ad}" sürecindeki "${adim.ad}" adımı başlayamıyor: ${adlar} tarihi girilmemiş. Kurum takvimine ekleyin.`,
              ornekId,
            },
            simdi,
          );
        continue;
      }
      const ad = d.adimlar[adim.kod];
      const sonTarih = ad?.sonTarih ?? simdi;
      let kisi: string | null;
      let baslik: string;
      let metin: string;
      if (e.tur === "hatirlat") {
        kisi = await rolKisisi(tx, kapsam, adim.gorev.rol, simdi);
        baslik = "Hatırlatma";
        const kalan = kalanGun(simdi, sonTarih);
        metin = `${adim.gorev.baslik}. Son tarihe ${kalan} gün kaldı (${tarihMetni(sonTarih, ayar.saatDilimi)}).`;
      } else if (e.tur === "gecikti") {
        kisi = await rolKisisi(tx, kapsam, adim.gorev.rol, simdi);
        baslik = "Son tarih geçti";
        metin = `${adim.gorev.baslik}. Son tarih ${tarihMetni(sonTarih, ayar.saatDilimi)} idi. Kanıtı bağlayıp görevi kapatın.`;
      } else {
        kisi = await rolKisisi(tx, kapsam, e.rol, simdi);
        baslik = "Geciken görev size iletildi";
        metin = `"${adim.gorev.baslik}" görevi ${tarihMetni(sonTarih, ayar.saatDilimi)} tarihinden beri tamamlanmadı. Sorumluyla görüşün ya da görevi yeniden atayın.`;
      }
      await gunlugeYaz(tx, {
        aktor: SISTEM,
        eylem: `surec.${e.tur === "hatirlat" ? "hatirlatildi" : e.tur === "gecikti" ? "gecikti" : "yukseltildi"}`,
        hedef: gorevId ? { tur: "gorev", id: gorevId } : { tur: "surec_ornegi", id: ornekId },
        ayrinti: { anahtar: e.anahtar, alici: kisi },
        zaman: simdi,
      });
      if (kisi)
        await bildirimYaz(tx, kurumId, ayar, kisi, e.tur, { baslik, metin, gorevId: gorevId ?? null, ornekId }, simdi);
    }
    if (kapsamDegisti)
      await tx
        .update(sema.surecOrnegi)
        .set({ kapsam: json(kapsam) as object })
        .where(eq(sema.surecOrnegi.id, ornekId));
    return sonrakiUyanma(tanim, d, { ...mb, simdi });
  });
}

// ---------- Tik: kendiliğinden başlatma, ilerletme, e-posta ----------

/** Takvim tarihi gelmiş tanımları başlatır (aynı takvim tarihi için bir kez). Sonraki başlatma anını döndürür. */
async function kendiligindenBaslat(b: SurecBaglami, kurumId: string): Promise<Date | null> {
  return kiraciIslemi(b.db, kurumId, async (tx) => {
    const { ayar } = await kurumAyari(tx, kurumId);
    const mb = await motorBaglami(b, kurumId, ayar);
    const ornekler = await tx.select({ kapsam: sema.surecOrnegi.kapsam }).from(sema.surecOrnegi);
    const otomatikler = new Set(ornekler.map((o) => (o.kapsam as { otomatik?: string }).otomatik).filter(Boolean));
    let sonraki: Date | null = null;
    for (const t of await enSonTanimlar(tx)) {
      const tanim = SurecTanimi.parse(t.tanim);
      const z_ = baslatmaZamani(tanim, mb);
      if (!z_) continue;
      const anahtar = `${tanim.kod}:${z_.toISOString()}`;
      if (otomatikler.has(anahtar)) continue;
      if (z_ <= mb.simdi) await ornekEkle(tx, b, kurumId, t.id, t.kod, { kod: t.kod }, SISTEM, anahtar);
      else if (!sonraki || z_ < sonraki) sonraki = z_;
    }
    return sonraki;
  });
}

/** Zamanı gelmiş e-postaları kişi başına tek iletide gönderir. Sonraki e-posta anını döndürür. */
export async function epostalariGonder(b: SurecBaglami, kurumId: string): Promise<Date | null> {
  const simdi = b.saat.simdi();
  const bekleyen = await kiraciIslemi(b.db, kurumId, (tx) =>
    tx
      .select({
        id: sema.bildirim.id,
        kisiId: sema.bildirim.kisiId,
        icerik: sema.bildirim.icerik,
        olusma: sema.bildirim.olusturma,
        eposta: sema.kisi.eposta,
      })
      .from(sema.bildirim)
      .innerJoin(sema.kisi, eq(sema.kisi.id, sema.bildirim.kisiId))
      .where(sql`${sema.bildirim.icerik}->'eposta'->>'durum' = 'bekliyor'`),
  );
  const gruplar = new Map<string, typeof bekleyen>();
  let sonraki: Date | null = null;
  for (const s of bekleyen) {
    const ic = BildirimIcerigi.parse(s.icerik);
    const z_ = ic.eposta.zaman ? new Date(ic.eposta.zaman) : simdi;
    if (z_ > simdi) {
      if (!sonraki || z_ < sonraki) sonraki = z_;
      continue;
    }
    const l = gruplar.get(s.kisiId) ?? [];
    l.push(s);
    gruplar.set(s.kisiId, l);
  }
  for (const [, l] of gruplar) {
    const adres = l[0]?.eposta;
    const ogeler = l.map((s) => {
      const ic = BildirimIcerigi.parse(s.icerik);
      return { baslik: ic.baslik, metin: ic.metin, olusma: s.olusma };
    });
    let durum: "gonderildi" | "yok" | "bekliyor" = "gonderildi";
    if (!adres) durum = "yok";
    else
      try {
        const o = ozetEposta(ogeler);
        await b.eposta.gonder({ alici: adres, konu: o.konu, metin: o.metin });
      } catch {
        durum = "bekliyor";
      }
    await kiraciIslemi(b.db, kurumId, async (tx) => {
      for (const s of l) {
        const ic = BildirimIcerigi.parse(s.icerik);
        const deneme = ic.eposta.deneme + (durum === "bekliyor" ? 1 : 0);
        // Başarısız gönderim 15 dakika sonra, en çok 5 kez yeniden denenir.
        const yeni =
          durum === "bekliyor"
            ? deneme >= 5
              ? { durum: "yok", deneme }
              : { durum, deneme, zaman: new Date(simdi.getTime() + 15 * 60_000).toISOString() }
            : { durum, deneme, zaman: simdi.toISOString() };
        await tx
          .update(sema.bildirim)
          .set({ icerik: json({ ...(s.icerik as object), eposta: yeni }) as object })
          .where(eq(sema.bildirim.id, s.id));
      }
    });
    if (durum === "bekliyor") {
      const tekrar = new Date(simdi.getTime() + 15 * 60_000);
      if (!sonraki || tekrar < sonraki) sonraki = tekrar;
    }
  }
  return sonraki;
}

const enErken = (...l: (Date | null)[]) => l.reduce<Date | null>((a, x) => (x && (!a || x < a) ? x : a), null);

/** Kurum için bir tur: kendiliğinden başlat, açık örnekleri ilerlet, e-postaları gönder. */
export async function tik(b: SurecBaglami, kurumId: string): Promise<Date | null> {
  const baslama = await kendiligindenBaslat(b, kurumId);
  const acik = await kiraciIslemi(b.db, kurumId, (tx) =>
    tx.select({ id: sema.surecOrnegi.id }).from(sema.surecOrnegi).where(eq(sema.surecOrnegi.durum, "acik")),
  );
  let sonraki = baslama;
  for (const o of acik) sonraki = enErken(sonraki, await ornekIlerlet(b, kurumId, o.id));
  return enErken(sonraki, await epostalariGonder(b, kurumId));
}

/** Kişinin uygulama içi bildirimleri (en yeni önce). */
export async function bildirimler(b: SurecBaglami, kurumId: string, kisiId: string) {
  return kiraciIslemi(b.db, kurumId, async (tx) => {
    const l = await tx.select().from(sema.bildirim).where(eq(sema.bildirim.kisiId, kisiId));
    return l
      .sort((x, y) => y.olusturma.getTime() - x.olusturma.getTime())
      .map((s) => {
        const ic = BildirimIcerigi.parse(s.icerik);
        return { id: s.id, tur: s.tur, baslik: ic.baslik, metin: ic.metin, okundu: s.okundu, zaman: s.olusturma };
      });
  });
}
