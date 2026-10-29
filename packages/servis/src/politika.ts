// Yetki devri politikası ve kurum ayarları servisi.
//
// Politika iki adımlıdır: taslak (kurum ayarlarında tutulur, henüz hiçbir şeye yetki vermez) ve imza.
// İmzada kişi adını hesabındaki gibi yazar; politika `yetki_politikasi` tablosuna imzalayan kişiyle eklenir ve
// günlüğe girer. İptal yeni kayıtla yapılır (`iptal_ettigi_id`), eski kayıt değişmez.

import { randomUUID } from "node:crypto";
import { type OneriTuru, politikaUygulanirMi, type YetkiPolitikasi } from "@akredit/cekirdek";
import { type Islem, sema } from "@akredit/vt";
import {
  anahtarIzi,
  cikisKapisi,
  type FetchIslevi,
  openaiUyumlu,
  openrouterAnahtariBicimi,
  ortamdanAnahtarKasasi,
  type SaglayiciAnahtarKasasi,
  YzHatasi,
} from "@akredit/yz";
import { desc, eq, isNotNull } from "drizzle-orm";
import { z } from "zod";
import { gunluge, type Hedef, hedefZinciri, islem, type ServisBaglami } from "./baglam.ts";
import { bulunamadi, ServisHatasi } from "./hata.ts";
import {
  AyarDegisikligi,
  type Ayarlar,
  ImzaGirdisi,
  PolitikaGirdisi,
  type PolitikaKaydi,
  YzAnahtarGirdisi,
  YzSaglayici,
} from "./semalar.ts";
import { adlarAyniMi } from "./yardimci.ts";

type Kayit = z.infer<typeof PolitikaKaydi>;

const Taslak = z.object({
  id: z.uuid(),
  ad: z.string(),
  oneriTurleri: z.array(z.string()),
  enYuksekRisk: z.enum(["dusuk", "orta"]),
  enDusukGuven: z.number(),
  birimIdleri: z.array(z.string()).optional(),
  programIdleri: z.array(z.string()).optional(),
  itirazSuresiIsGunu: z.number().int().optional(),
  olusturanAd: z.string(),
  olusturma: z.string(),
});
type Taslak = z.infer<typeof Taslak>;

const KurumAyarlari = z
  .object({
    yz: z
      .object({
        yurtDisiIzin: z.boolean().optional(),
        webArama: z
          .object({ acik: z.boolean().optional(), enCokSonuc: z.number().int().min(1).max(10).optional() })
          .passthrough()
          .optional(),
      })
      .passthrough()
      .optional(),
    yzSaglayici: YzSaglayici.optional(),
    yzAnahtar: z
      .object({
        saglayici: z.literal("openrouter"),
        sifreli: z.string(),
        son4: z.string(),
        model: z.string(),
        kayitZamani: z.string(),
        kaydeden: z.string(),
      })
      .optional(),
    politikaTaslaklari: z.array(Taslak).optional(),
  })
  .passthrough();

async function kurumOku(tx: Islem, kurumId: string) {
  const [k] = await tx.select().from(sema.kurum).where(eq(sema.kurum.id, kurumId));
  if (!k) throw bulunamadi();
  const a = KurumAyarlari.safeParse(k.ayarlar ?? {});
  return { kurum: k, ayar: a.success ? a.data : {} };
}

async function kisiAdi(tx: Islem, kisiId: string): Promise<string> {
  const [k] = await tx.select({ ad: sema.kisi.adSoyad }).from(sema.kisi).where(eq(sema.kisi.id, kisiId));
  return k?.ad ?? "Bilinmeyen kişi";
}

async function politikaKayitlari(tx: Islem, kurumId: string): Promise<Kayit[]> {
  const { ayar } = await kurumOku(tx, kurumId);
  const satir = await tx.select().from(sema.yetkiPolitikasi).orderBy(desc(sema.yetkiPolitikasi.olusturma));
  const iptalEdilen = new Set(satir.flatMap((p) => (p.iptalEttigiId ? [p.iptalEttigiId] : [])));
  const imzali = new Set(satir.map((p) => p.id));
  const adlar = new Map<string, string>();
  const ad = async (id: string) => {
    if (!adlar.has(id)) adlar.set(id, await kisiAdi(tx, id));
    return adlar.get(id) as string;
  };
  const taslaklar = new Map((ayar.politikaTaslaklari ?? []).map((t) => [t.id, t]));
  const liste: Kayit[] = [];
  for (const p of satir) {
    if (p.iptalEttigiId) continue; // iptal kaydının kendisi listelenmez; iptal edilen "iptal" görünür.
    const t = taslaklar.get(p.id);
    liste.push({
      id: p.id,
      ad: p.ad,
      kapsam: {
        oneriTurleri: p.oneriTurleri,
        enYuksekRisk: p.enYuksekRisk === "yuksek" ? "orta" : p.enYuksekRisk,
        enDusukGuven: p.enDusukGuven,
        ...(p.birimIdleri?.length ? { birimIdleri: p.birimIdleri } : {}),
        ...(p.programIdleri?.length ? { programIdleri: p.programIdleri } : {}),
        ...(p.itirazSuresiIsGunu ? { itirazSuresiIsGunu: p.itirazSuresiIsGunu } : {}),
      },
      durum: iptalEdilen.has(p.id) ? "iptal" : "imzali",
      olusturan: t?.olusturanAd ?? (await ad(p.imzalayanKisiId)),
      olusturma: t?.olusturma ?? p.olusturma.toISOString(),
      imzalayan: await ad(p.imzalayanKisiId),
      imzaZamani: p.baslangic.toISOString(),
    });
  }
  for (const t of taslaklar.values()) {
    if (imzali.has(t.id)) continue;
    liste.push({
      id: t.id,
      ad: t.ad,
      kapsam: {
        oneriTurleri: t.oneriTurleri as OneriTuru[],
        enYuksekRisk: t.enYuksekRisk,
        enDusukGuven: t.enDusukGuven,
        ...(t.birimIdleri?.length ? { birimIdleri: t.birimIdleri } : {}),
        ...(t.programIdleri?.length ? { programIdleri: t.programIdleri } : {}),
        ...(t.itirazSuresiIsGunu ? { itirazSuresiIsGunu: t.itirazSuresiIsGunu } : {}),
      },
      durum: "imza_bekliyor",
      olusturan: t.olusturanAd,
      olusturma: t.olusturma,
      imzalayan: null,
      imzaZamani: null,
    });
  }
  return liste;
}

const kurumHedefi = (b: ServisBaglami): Hedef => ({ tur: "kurum", id: b.aktor.kurumId });

export async function politikalar(b: ServisBaglami): Promise<Kayit[]> {
  return islem(b, async (tx, gerekli) => {
    await gerekli("oneri.oku", kurumHedefi(b));
    return politikaKayitlari(tx, b.aktor.kurumId);
  });
}

/** Birim ve program kapsamındaki kimlikler bu kuruma ait olmalı (başka kurumun kimliği yazılamaz). */
async function kapsamDenetle(tx: Islem, kurumId: string, g: PolitikaGirdisi) {
  for (const id of g.birimIdleri ?? [])
    if (!(await hedefZinciri(tx, kurumId, "birim", id)))
      throw new ServisHatasi("gecersiz_istek", "Seçilen birimlerden biri bulunamadı.", [
        { alan: "birimIdleri", ileti: "Birim bulunamadı." },
      ]);
  for (const id of g.programIdleri ?? [])
    if (!(await hedefZinciri(tx, kurumId, "program", id)))
      throw new ServisHatasi("gecersiz_istek", "Seçilen programlardan biri bulunamadı.", [
        { alan: "programIdleri", ileti: "Program bulunamadı." },
      ]);
}

/** İmza bekleyen taslak. Yüksek risk ve yüksek riskli tür şemada reddedilir. */
export async function politikaTaslagiOlustur(b: ServisBaglami, girdi: unknown): Promise<Kayit> {
  const g = PolitikaGirdisi.parse(girdi);
  return islem(b, async (tx, gerekli) => {
    await gerekli("politika.imzala", kurumHedefi(b));
    await kapsamDenetle(tx, b.aktor.kurumId, g);
    const { kurum, ayar } = await kurumOku(tx, b.aktor.kurumId);
    const taslak: Taslak = {
      id: randomUUID(),
      ad: g.ad,
      oneriTurleri: g.oneriTurleri,
      enYuksekRisk: g.enYuksekRisk as "dusuk" | "orta",
      enDusukGuven: g.enDusukGuven,
      ...(g.birimIdleri?.length ? { birimIdleri: g.birimIdleri } : {}),
      ...(g.programIdleri?.length ? { programIdleri: g.programIdleri } : {}),
      ...(g.itirazSuresiIsGunu ? { itirazSuresiIsGunu: g.itirazSuresiIsGunu } : {}),
      olusturanAd: await kisiAdi(tx, b.aktor.kisiId),
      olusturma: b.simdi().toISOString(),
    };
    await tx
      .update(sema.kurum)
      .set({
        ayarlar: { ...(kurum.ayarlar as object), politikaTaslaklari: [...(ayar.politikaTaslaklari ?? []), taslak] },
      })
      .where(eq(sema.kurum.id, b.aktor.kurumId));
    await gunluge(tx, b, "politika.taslak_olusturuldu", { tur: "yetki_politikasi", id: taslak.id }, { ad: g.ad });
    return (await politikaKayitlari(tx, b.aktor.kurumId)).find((p) => p.id === taslak.id) as Kayit;
  });
}

/** Taslağı imzalar: imzalayan oturumdaki kişidir; adını hesabındaki gibi yazmalı. */
export async function politikaImzala(b: ServisBaglami, id: string, girdi: unknown): Promise<Kayit> {
  if (b.aktor.tur !== "oturum")
    throw new ServisHatasi("yetki_yok", "Yetki devri politikası yalnız oturum açmış kişi tarafından imzalanır.");
  const g = ImzaGirdisi.parse(girdi);
  return islem(b, async (tx, gerekli) => {
    await gerekli("politika.imzala", kurumHedefi(b));
    const { ayar } = await kurumOku(tx, b.aktor.kurumId);
    const t = (ayar.politikaTaslaklari ?? []).find((x) => x.id === id);
    if (!t) throw bulunamadi();
    const [var_] = await tx
      .select({ id: sema.yetkiPolitikasi.id })
      .from(sema.yetkiPolitikasi)
      .where(eq(sema.yetkiPolitikasi.id, id));
    if (var_) throw new ServisHatasi("cakisma", "Bu politika zaten imzalanmış.");
    const ad = await kisiAdi(tx, b.aktor.kisiId);
    if (!adlarAyniMi(g.imzalayanAd, ad))
      throw new ServisHatasi("kural_ihlali", "İmzalamak için adınızı hesabınızdaki gibi yazın.");
    // Taslak eski bir sürümde yazılmış olabilir: kurallar imzada yeniden denetlenir.
    const p = PolitikaGirdisi.parse({
      ad: t.ad,
      oneriTurleri: t.oneriTurleri,
      enYuksekRisk: t.enYuksekRisk,
      enDusukGuven: t.enDusukGuven,
      ...(t.birimIdleri ? { birimIdleri: t.birimIdleri } : {}),
      ...(t.programIdleri ? { programIdleri: t.programIdleri } : {}),
      ...(t.itirazSuresiIsGunu ? { itirazSuresiIsGunu: t.itirazSuresiIsGunu } : {}),
    });
    await kapsamDenetle(tx, b.aktor.kurumId, p);
    await tx.insert(sema.yetkiPolitikasi).values({
      id,
      kurumId: b.aktor.kurumId,
      ad: p.ad,
      oneriTurleri: p.oneriTurleri,
      enYuksekRisk: p.enYuksekRisk,
      enDusukGuven: p.enDusukGuven,
      birimIdleri: p.birimIdleri ?? null,
      programIdleri: p.programIdleri ?? null,
      itirazSuresiIsGunu: p.itirazSuresiIsGunu ?? null,
      imzalayanKisiId: b.aktor.kisiId,
      baslangic: b.simdi(),
    });
    await gunluge(
      tx,
      b,
      "politika.imzalandi",
      { tur: "yetki_politikasi", id },
      {
        ad: p.ad,
        imzalayan: ad,
        oneriTurleri: p.oneriTurleri,
        enYuksekRisk: p.enYuksekRisk,
        enDusukGuven: p.enDusukGuven,
        ...(p.itirazSuresiIsGunu ? { itirazSuresiIsGunu: p.itirazSuresiIsGunu } : {}),
      },
    );
    return (await politikaKayitlari(tx, b.aktor.kurumId)).find((x) => x.id === id) as Kayit;
  });
}

/** Politikayı iptal eder: yeni bir kayıt eskisini gösterir; eski kayıt değişmez. */
export async function politikaIptal(b: ServisBaglami, id: string): Promise<Kayit> {
  if (b.aktor.tur !== "oturum")
    throw new ServisHatasi("yetki_yok", "Yetki devri politikası yalnız oturum açmış kişi tarafından iptal edilir.");
  return islem(b, async (tx, gerekli) => {
    await gerekli("politika.imzala", kurumHedefi(b));
    const [p] = /^[0-9a-f-]{36}$/iu.test(id)
      ? await tx.select().from(sema.yetkiPolitikasi).where(eq(sema.yetkiPolitikasi.id, id))
      : [];
    if (!p || p.iptalEttigiId) throw bulunamadi();
    const [onceki] = await tx
      .select({ id: sema.yetkiPolitikasi.id })
      .from(sema.yetkiPolitikasi)
      .where(eq(sema.yetkiPolitikasi.iptalEttigiId, id));
    if (onceki) throw new ServisHatasi("cakisma", "Bu politika zaten iptal edilmiş.");
    const simdi = b.simdi();
    await tx.insert(sema.yetkiPolitikasi).values({
      kurumId: b.aktor.kurumId,
      ad: `${p.ad} (iptal)`,
      oneriTurleri: p.oneriTurleri,
      enYuksekRisk: p.enYuksekRisk,
      enDusukGuven: p.enDusukGuven,
      itirazSuresiIsGunu: p.itirazSuresiIsGunu,
      imzalayanKisiId: b.aktor.kisiId,
      baslangic: simdi,
      bitis: simdi,
      iptalEttigiId: id,
    });
    await gunluge(tx, b, "politika.iptal_edildi", { tur: "yetki_politikasi", id }, { ad: p.ad });
    return (await politikaKayitlari(tx, b.aktor.kurumId)).find((x) => x.id === id) as Kayit;
  });
}

/**
 * Bir öneriye uygulanabilecek politikalar (İP-13 otomatik karar için hazır). İptal edilmiş politikalar ve iptal
 * kayıtları dışarıda kalır (inceleme bulgu 3); birim/program kapsamı önerinin veritabanındaki yerinden
 * hesaplanır (bulgu 2). Kural `@akredit/cekirdek politikaUygulanirMi`'dir.
 */
export async function uygulanabilirPolitikalar(
  tx: Islem,
  kurumId: string,
  oneri: { tur: OneriTuru; risk: "dusuk" | "orta" | "yuksek"; guven: number | null },
  konum: Hedef,
  simdi: Date,
): Promise<string[]> {
  const satir = await tx.select().from(sema.yetkiPolitikasi);
  const iptal = new Set(
    (
      await tx
        .select({ id: sema.yetkiPolitikasi.iptalEttigiId })
        .from(sema.yetkiPolitikasi)
        .where(isNotNull(sema.yetkiPolitikasi.iptalEttigiId))
    )
      .filter((x) => x.id !== null)
      .map((x) => x.id as string),
  );
  const z_ = await hedefZinciri(tx, kurumId, konum.tur, konum.id);
  const birimler = z_?.zincir.filter((d) => d.tur === "birim").map((d) => d.id) ?? [];
  const program = z_?.zincir.find((d) => d.tur === "program")?.id;
  const uygun: string[] = [];
  for (const p of satir) {
    if (p.iptalEttigiId || iptal.has(p.id)) continue;
    const politika: YetkiPolitikasi = {
      id: p.id as YetkiPolitikasi["id"],
      kurumId: p.kurumId as YetkiPolitikasi["kurumId"],
      ad: p.ad,
      kapsam: {
        oneriTurleri: p.oneriTurleri,
        enYuksekRisk: p.enYuksekRisk === "yuksek" ? "orta" : p.enYuksekRisk,
        enDusukGuven: p.enDusukGuven,
        ...(p.birimIdleri?.length ? { birimIdleri: p.birimIdleri as never[] } : {}),
        ...(p.programIdleri?.length ? { programIdleri: p.programIdleri as never[] } : {}),
      },
      imzalayan: p.imzalayanKisiId as YetkiPolitikasi["imzalayan"],
      baslangic: p.baslangic.toISOString(),
      bitis: p.bitis?.toISOString() ?? null,
      olusturma: p.olusturma.toISOString(),
    };
    // Önerinin birden çok üst birimi olabilir: politikanın birimi zincirdeki herhangi biriyse uygulanır.
    const adaylar = birimler.length ? birimler : [undefined];
    const uygulanir = adaylar.some(
      (birimId) =>
        politikaUygulanirMi(
          { kurumId: kurumId as YetkiPolitikasi["kurumId"], tur: oneri.tur, risk: oneri.risk, guven: oneri.guven },
          politika,
          simdi.getTime(),
          {
            ...(birimId ? { birimId: birimId as never } : {}),
            ...(program ? { programId: program as never } : {}),
            iptalEdilenler: iptal,
          },
        ).uygulanir,
    );
    if (uygulanir) uygun.push(p.id);
  }
  return uygun;
}

// ---------- Kurum ayarları ----------

export async function ayarlar(b: ServisBaglami): Promise<z.infer<typeof Ayarlar>> {
  return islem(b, async (tx, gerekli) => {
    await gerekli("oneri.oku", kurumHedefi(b));
    const { kurum, ayar } = await kurumOku(tx, b.aktor.kurumId);
    return {
      kurumAdi: kurum.ad,
      kurumKisaAdi: kurum.kisaAd ?? "",
      yzSaglayici: ayar.yzSaglayici ?? "kurum_sunucusu",
      yurtDisiIzni: ayar.yz?.yurtDisiIzin === true,
      // Web araması (İP-37): varsayılan kapalı, istek başına 5 sonuç (`@akredit/yz` webAramaPolitikasi ile aynı).
      webArama: {
        acik: ayar.yz?.webArama?.acik === true,
        enCokSonuc: ayar.yz?.webArama?.enCokSonuc ?? 5,
      },
      yzAnahtar: ayar.yzAnahtar
        ? {
            saglayici: ayar.yzAnahtar.saglayici,
            son4: ayar.yzAnahtar.son4,
            model: ayar.yzAnahtar.model,
            kayitZamani: ayar.yzAnahtar.kayitZamani,
            kaydeden: ayar.yzAnahtar.kaydeden,
          }
        : null,
      politikalar: await politikaKayitlari(tx, b.aktor.kurumId),
    };
  });
}

export async function ayarlariGuncelle(b: ServisBaglami, girdi: unknown): Promise<z.infer<typeof Ayarlar>> {
  const g = AyarDegisikligi.parse(girdi);
  await islem(b, async (tx, gerekli) => {
    await gerekli("kurum.ayar_yonet", kurumHedefi(b));
    // Yurt dışı izni yalnız adıyla imzalanan karar ile açılır (kurulum/yurtDisiKarariImzala, ilke 3 ve 7).
    // Bu yol yalnız kapatabilir: kapatmak her zaman güvenli yöndedir.
    if (g.yurtDisiIzni === true)
      throw new ServisHatasi(
        "kural_ihlali",
        "Yurt dışı izni ayarlardan açılamaz. Kurulum sayfasındaki yurt dışı aktarım kararını adınızla imzalayın.",
      );
    const { kurum, ayar } = await kurumOku(tx, b.aktor.kurumId);
    const eski = (kurum.ayarlar ?? {}) as Record<string, unknown>;
    const yeni: Record<string, unknown> = { ...eski };
    if (g.yzSaglayici !== undefined) yeni.yzSaglayici = g.yzSaglayici;
    if (g.yurtDisiIzni !== undefined)
      yeni.yz = { ...((eski.yz as Record<string, unknown>) ?? {}), yurtDisiIzin: g.yurtDisiIzni };
    if (g.webArama !== undefined) {
      // Web araması soruyu yurt dışındaki sağlayıcıya gönderir: izin yokken açılamaz (kapatmak her zaman serbest).
      const izin = g.yurtDisiIzni === false ? false : ayar.yz?.yurtDisiIzin === true;
      if (g.webArama.acik === true && !izin)
        throw new ServisHatasi(
          "kural_ihlali",
          "Web araması yurt dışındaki hizmeti kullanır. Önce yurt dışı yapay zekâ hizmetine izin verin.",
        );
      const yz = (yeni.yz as Record<string, unknown>) ?? {};
      yeni.yz = {
        ...yz,
        webArama: { ...((yz.webArama as Record<string, unknown>) ?? {}), ...g.webArama },
      };
    }
    await tx
      .update(sema.kurum)
      .set({
        ayarlar: yeni,
        ...(g.kurumAdi !== undefined ? { ad: g.kurumAdi } : {}),
        ...(g.kurumKisaAdi !== undefined ? { kisaAd: g.kurumKisaAdi || null } : {}),
      })
      .where(eq(sema.kurum.id, b.aktor.kurumId));
    const degisen = Object.keys(g).filter((k) => g[k as keyof typeof g] !== undefined);
    await gunluge(
      tx,
      b,
      "kurum.ayar_guncellendi",
      { tur: "kurum", id: b.aktor.kurumId },
      {
        alanlar: degisen,
        ...(g.yurtDisiIzni !== undefined ? { yurtDisiIzni: g.yurtDisiIzni } : {}),
        ...(g.yzSaglayici !== undefined ? { yzSaglayici: g.yzSaglayici } : {}),
        ...(g.webArama?.acik !== undefined ? { webAramaAcik: g.webArama.acik } : {}),
        ...(g.webArama?.enCokSonuc !== undefined ? { webAramaEnCokSonuc: g.webArama.enCokSonuc } : {}),
      },
    );
  });
  return ayarlar(b);
}

export type { AyarDegisikligi };

// ---------- Kurumun yapay zekâ anahtarı (BYOK) ----------
//
// Anahtarı yalnız `kurum.ayar_yonet` yetkisi olan kişi (kurum yöneticisi) girer. Anahtar sunucuda AES-256-GCM
// ile, kuruma bağlı türetilmiş anahtarla şifrelenip kurum ayarlarında saklanır. Hiçbir yanıtta anahtarın
// kendisi dönmez; yalnız son dört karakteri gösterilir. Günlüğe anahtar ya da izi yazılmaz.

/** OpenRouter'ın kendi yönlendiricisi; kurum isterse başka model adı verir. */
export const VARSAYILAN_OPENROUTER_MODELI = "openrouter/auto";

const KASA_YOK = "Sunucuda anahtar saklama ayarı yapılmamış. Anahtar kaydedilmedi. Sistem yöneticinize bildirin.";

function kasaGerekli(kasa: SaglayiciAnahtarKasasi | null): SaglayiciAnahtarKasasi {
  if (!kasa) throw new ServisHatasi("kural_ihlali", KASA_YOK);
  return kasa;
}

export async function yzAnahtariKaydet(
  b: ServisBaglami,
  girdi: unknown,
  kasa: SaglayiciAnahtarKasasi | null = ortamdanAnahtarKasasi(process.env),
): Promise<z.infer<typeof Ayarlar>> {
  const g = YzAnahtarGirdisi.parse(girdi);
  if (!openrouterAnahtariBicimi(g.anahtar))
    throw new ServisHatasi("gecersiz_istek", "Bu bir OpenRouter anahtarına benzemiyor. Anahtar sk-or- ile başlar.", [
      { alan: "anahtar", ileti: "Anahtar sk-or- ile başlamalı." },
    ]);
  const k = kasaGerekli(kasa);
  await islem(b, async (tx, gerekli) => {
    await gerekli("kurum.ayar_yonet", kurumHedefi(b));
    const { kurum } = await kurumOku(tx, b.aktor.kurumId);
    const eski = (kurum.ayarlar ?? {}) as Record<string, unknown>;
    const yeni = {
      ...eski,
      yzSaglayici: "openrouter",
      yzAnahtar: {
        saglayici: "openrouter",
        sifreli: k.sifrele(g.anahtar.trim(), b.aktor.kurumId),
        son4: anahtarIzi(g.anahtar),
        model: g.model ?? VARSAYILAN_OPENROUTER_MODELI,
        kayitZamani: b.simdi().toISOString(),
        kaydeden: await kisiAdi(tx, b.aktor.kisiId),
      },
    };
    await tx.update(sema.kurum).set({ ayarlar: yeni }).where(eq(sema.kurum.id, b.aktor.kurumId));
    await gunluge(
      tx,
      b,
      "kurum.yz_anahtari_kaydedildi",
      { tur: "kurum", id: b.aktor.kurumId },
      { saglayici: "openrouter" },
    );
  });
  return ayarlar(b);
}

export async function yzAnahtariKaldir(b: ServisBaglami): Promise<z.infer<typeof Ayarlar>> {
  await islem(b, async (tx, gerekli) => {
    await gerekli("kurum.ayar_yonet", kurumHedefi(b));
    const { kurum } = await kurumOku(tx, b.aktor.kurumId);
    const { yzAnahtar: _silinen, ...kalan } = (kurum.ayarlar ?? {}) as Record<string, unknown>;
    await tx.update(sema.kurum).set({ ayarlar: kalan }).where(eq(sema.kurum.id, b.aktor.kurumId));
    await gunluge(
      tx,
      b,
      "kurum.yz_anahtari_kaldirildi",
      { tur: "kurum", id: b.aktor.kurumId },
      { saglayici: "openrouter" },
    );
  });
  return ayarlar(b);
}

/**
 * Kayıtlı anahtarla çok kısa bir istek gönderir (en çok 1 belirteç) ve sonucu sade dille döndürür.
 * Bu istekte kurum verisi yoktur. Anahtar yalnız bu işlev içinde çözülür.
 */
export async function yzBaglantiDene(
  b: ServisBaglami,
  secenek: { kasa?: SaglayiciAnahtarKasasi | null; fetch?: FetchIslevi } = {},
): Promise<{ tamam: boolean; ileti: string; model: string }> {
  const kasa = kasaGerekli(secenek.kasa === undefined ? ortamdanAnahtarKasasi(process.env) : secenek.kasa);
  const kayit = await islem(b, async (tx, gerekli) => {
    await gerekli("kurum.ayar_yonet", kurumHedefi(b));
    return (await kurumOku(tx, b.aktor.kurumId)).ayar.yzAnahtar ?? null;
  });
  if (!kayit) throw new ServisHatasi("kural_ihlali", "Kayıtlı anahtar yok. Önce anahtarı girin.");
  // Çıkış kapısı (İP-40): sabit deneme metni kurum verisi değildir; yine de kapıdan, maskeli ve kayıtlı geçer.
  const saglayici = cikisKapisi(
    openaiUyumlu({
      hazir: "openrouter",
      anahtar: kasa.coz(kayit.sifreli, b.aktor.kurumId),
      model: kayit.model,
      ...(secenek.fetch ? { fetch: secenek.fetch } : {}),
      http: { denemeSayisi: 1, zamanAsimiMs: 15_000 },
    }),
    { yurtDisiIzin: true, amac: "baglanti_denemesi" },
  );
  try {
    await saglayici.sohbet({ mesajlar: [{ rol: "kullanici", icerik: "Yalnız: tamam" }], enCokBelirtec: 1 });
    return { tamam: true, ileti: "Bağlantı çalışıyor. Anahtar geçerli.", model: kayit.model };
  } catch (e) {
    const ileti = e instanceof YzHatasi ? e.message : "Hizmete ulaşılamadı. Biraz sonra yeniden deneyin.";
    return { tamam: false, ileti, model: kayit.model };
  }
}
