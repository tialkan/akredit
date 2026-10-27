// Anketin veritabanı tarafı: oluşturma, yayımlama, gönderim/hatırlatma turu, anonim yanıt kaydı, sonuçlar.
//
// Anonimlik (kabul ölçütü):
// - `anket_yaniti` satırında kişi, e-posta, belirteç ya da saat yoktur (saat güne yuvarlanır, 0007 göçü).
// - `anket_belirteci` yalnız özet + "kullanıldı" bayrağı tutar; yanıta ya da kişiye bağlanmaz, zaman yoktur.
// - Davet belirteci HMAC(gizli, anket + e-posta) ile her seferinde yeniden üretilir; eşleme saklanmaz.
// - Alıcı e-postaları yalnız gönderim süresince `anket.kapsam.gonderim.alicilar`da durur, kapanışta silinir.
// - Yanıt kaydı günlüğe yazılmaz (günlük kaydının saati yanıtla eşleştirilebilirdi).

import { type Saat, type EpostaTasiyici, surecAyariOku } from "@akredit/surec";
import { gunlugeYaz, type Islem, kiraciIslemi, sema, type Vt } from "@akredit/vt";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { belirtecGecerliMi, belirtecOzeti, davetBelirteci } from "./belirtec.ts";
import { AnketAyari, type AnketAyariGirdisi, gonderimPlani } from "./gonderim.ts";
import { type AnketSonucu, anketSonucu } from "./istatistik.ts";
import { sablon } from "./sablonlar.ts";
import { AnketTanimi, type AnketTanimiGirdisi, type Yanit, YanitHatasi, yanitDogrula } from "./sema.ts";

export interface AnketBaglami {
  db: Vt;
  saat: Saat;
  eposta: EpostaTasiyici;
  /** Davet belirteçlerinin HMAC anahtarı (kurum başına gizli). Depoya ve günlüğe girmez. */
  gizli: string;
  /** Genel adres, ör. https://akredit.org */
  adres: string;
  /** Süreç motoruna olay bildirimi (ör. `olayYayinla`); "anket_yayimlandi", "anket_kapandi". */
  olay?: (kurumId: string, olay: string, kapsam: { anketId: string }) => Promise<void>;
}

export type Aktor = { tur: "kisi"; id: string } | { tur: "sistem"; id: null };
export const SISTEM: Aktor = { tur: "sistem", id: null };

export class AnketHatasi extends Error {
  override name = "AnketHatasi";
}

const AnketKapsami = z.object({
  tanim: AnketTanimi,
  ayar: AnketAyari,
  durum: z.enum(["taslak", "yayinda", "kapali"]),
  /** Ders, program gibi bağlam (ör. { ders: "HUK101" }). */
  baglam: z.record(z.string(), z.string()).default({}),
  gonderim: z
    .object({
      alicilar: z.array(z.string()).default([]),
      davetSayisi: z.number().int().min(0).default(0),
      yapilanlar: z.array(z.string()).default([]),
    })
    .prefault({}),
});
type AnketKapsami = z.infer<typeof AnketKapsami>;

const json = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

async function oku(tx: Islem, anketId: string) {
  if (!z.uuid().safeParse(anketId).success) throw new AnketHatasi("Anket bulunamadı.");
  const [a] = await tx.select().from(sema.anket).where(eq(sema.anket.id, anketId));
  if (!a) throw new AnketHatasi("Anket bulunamadı.");
  return { a, k: AnketKapsami.parse(a.kapsam) };
}

async function yaz(tx: Islem, anketId: string, k: AnketKapsami) {
  await tx
    .update(sema.anket)
    .set({ kapsam: json(k) as object })
    .where(eq(sema.anket.id, anketId));
}

export interface AnketGirdisi {
  sablon?: string;
  tanim?: AnketTanimiGirdisi;
  ayar: AnketAyariGirdisi;
  baglam?: Record<string, string>;
}

/** Şablondan ya da tanımdan taslak anket oluşturur. */
export async function anketOlustur(b: AnketBaglami, kurumId: string, g: AnketGirdisi, aktor: Aktor): Promise<string> {
  const tanim = g.tanim ? AnketTanimi.parse(g.tanim) : g.sablon ? sablon(g.sablon) : undefined;
  if (!tanim) throw new AnketHatasi("Şablon bulunamadı. Listeden bir şablon seçin.");
  const ayar = AnketAyari.parse(g.ayar);
  const kapsam: AnketKapsami = AnketKapsami.parse({ tanim, ayar, durum: "taslak", baglam: g.baglam ?? {} });
  return kiraciIslemi(b.db, kurumId, async (tx) => {
    const [a] = await tx
      .insert(sema.anket)
      .values({
        kurumId,
        baslik: tanim.baslik,
        kapsam: json(kapsam) as object,
        baslangic: new Date(ayar.baslangic),
        bitis: new Date(ayar.bitis),
      })
      .returning({ id: sema.anket.id });
    if (!a) throw new AnketHatasi("Anket oluşturulamadı.");
    await tx.insert(sema.anketSorusu).values(
      tanim.sorular.map((s, i) => ({
        kurumId,
        anketId: a.id,
        sira: i + 1,
        metin: s.metin,
        tur: s.tur,
        secenekler: s.secenekler ?? null,
      })),
    );
    await gunlugeYaz(tx, {
      aktor,
      eylem: "anket.olusturuldu",
      hedef: { tur: "anket", id: a.id },
      ayrinti: { sablon: tanim.sablon ?? null, soruSayisi: tanim.sorular.length },
      zaman: b.saat.simdi(),
    });
    return a.id;
  });
}

const Alicilar = z.array(z.email()).max(20_000);

/**
 * Anketi yayımlar. Davetli ankette her alıcının belirteç özeti kaydedilir (özetin sırasıyla, liste sırası
 * değil); e-postalar süreç turunda (`anketTik`) gider.
 */
export async function anketYayimla(
  b: AnketBaglami,
  kurumId: string,
  anketId: string,
  g: { alicilar?: string[] },
  aktor: Aktor,
): Promise<{ davetSayisi: number }> {
  const sonuc = await kiraciIslemi(b.db, kurumId, async (tx) => {
    const { k } = await oku(tx, anketId);
    if (k.durum !== "taslak") throw new AnketHatasi("Anket zaten yayımlanmış.");
    let alicilar: string[] = [];
    if (k.ayar.erisim === "davet") {
      const p = Alicilar.safeParse((g.alicilar ?? []).map((x) => x.trim().toLowerCase()));
      if (!p.success) throw new AnketHatasi("Alıcı listesinde geçersiz e-posta adresi var. Listeyi düzeltin.");
      alicilar = [...new Set(p.data)].sort();
      if (!alicilar.length) throw new AnketHatasi("Davetli ankette en az bir alıcı gerekli.");
      const ozetler = alicilar.map((e) => belirtecOzeti(davetBelirteci(b.gizli, anketId, e))).sort();
      for (let i = 0; i < ozetler.length; i += 500)
        await tx
          .insert(sema.anketBelirteci)
          .values(ozetler.slice(i, i + 500).map((ozet) => ({ kurumId, anketId, ozet, kaynak: "davet" })));
    }
    k.durum = "yayinda";
    k.gonderim = { alicilar, davetSayisi: alicilar.length, yapilanlar: [] };
    await yaz(tx, anketId, k);
    await gunlugeYaz(tx, {
      aktor,
      eylem: "anket.yayimlandi",
      hedef: { tur: "anket", id: anketId },
      ayrinti: { erisim: k.ayar.erisim, davetSayisi: alicilar.length },
      zaman: b.saat.simdi(),
    });
    return { davetSayisi: alicilar.length };
  });
  await b.olay?.(kurumId, "anket_yayimlandi", { anketId });
  return sonuc;
}

export function anketBaglantisi(adres: string, kurumId: string, anketId: string, belirtec?: string): string {
  const u = new URL(`/anket/${kurumId}/${anketId}`, adres);
  if (belirtec) u.searchParams.set("b", belirtec);
  return u.toString();
}

function davetMetni(baslik: string, baglanti: string, bitis: Date, hatirlatma: boolean): { konu: string; metin: string } {
  const tarih = bitis.toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" });
  return {
    konu: `${hatirlatma ? "Hatırlatma: " : ""}${baslik}`,
    metin: [
      hatirlatma ? "Ankete henüz yanıt vermediyseniz son gün yaklaşıyor." : "Görüşünüzü almak istiyoruz.",
      "",
      `Ankete katılmak için: ${baglanti}`,
      `Son gün: ${tarih}`,
      "",
      "Yanıtlarınız anonimdir: kimliğiniz yanıtlarınızla birlikte kaydedilmez. Bağlantı yalnız bir kez yanıt vermenizi sağlar.",
    ].join("\n"),
  };
}

/** Bir anketin vadesi gelmiş gönderim eylemlerini uygular; sonraki uyanma anını döndürür. */
async function anketTuru(b: AnketBaglami, kurumId: string, anketId: string): Promise<Date | null> {
  const simdi = b.saat.simdi();
  const is = await kiraciIslemi(b.db, kurumId, async (tx) => {
    const { a, k } = await oku(tx, anketId);
    if (k.durum !== "yayinda") return null;
    const [kurum] = await tx.select({ a: sema.kurum.ayarlar }).from(sema.kurum).where(eq(sema.kurum.id, kurumId));
    const sa = surecAyariOku(kurum?.a ?? {});
    const plan = gonderimPlani(k.ayar, k.gonderim.yapilanlar, simdi, {
      sessizBaslangic: sa.bildirim.sessizBaslangic,
      sessizBitis: sa.bildirim.sessizBitis,
      saatDilimi: sa.saatDilimi,
    });
    const iletiler: { alici: string; konu: string; metin: string }[] = [];
    let kapandi = false;
    for (const e of plan.eylemler) {
      if (e === "kapanis") {
        kapandi = true;
        continue;
      }
      let alicilar = k.gonderim.alicilar;
      if (e !== "davet") {
        // Yalnız yanıtlamamışlara: özet kullanılmış mı? (kim olduğu yalnız bu anda, bellekte bilinir)
        const kullanilan = new Set(
          (
            await tx
              .select({ o: sema.anketBelirteci.ozet })
              .from(sema.anketBelirteci)
              .where(and(eq(sema.anketBelirteci.anketId, anketId), eq(sema.anketBelirteci.kullanildi, true)))
          ).map((r) => r.o),
        );
        alicilar = alicilar.filter((x) => !kullanilan.has(belirtecOzeti(davetBelirteci(b.gizli, anketId, x))));
      }
      for (const alici of alicilar) {
        const bag = anketBaglantisi(b.adres, kurumId, anketId, davetBelirteci(b.gizli, anketId, alici));
        iletiler.push({ alici, ...davetMetni(a.baslik, bag, new Date(k.ayar.bitis), e !== "davet") });
      }
      await gunlugeYaz(tx, {
        aktor: SISTEM,
        eylem: e === "davet" ? "anket.davet_gonderildi" : "anket.hatirlatma_gonderildi",
        hedef: { tur: "anket", id: anketId },
        ayrinti: { eylem: e, alici: alicilar.length },
        zaman: simdi,
      });
    }
    k.gonderim.yapilanlar.push(...plan.bastirilan, ...plan.eylemler);
    if (kapandi) {
      k.durum = "kapali";
      k.gonderim.alicilar = []; // kişisel veri gönderim bitince tutulmaz
      await gunlugeYaz(tx, {
        aktor: SISTEM,
        eylem: "anket.kapandi",
        hedef: { tur: "anket", id: anketId },
        ayrinti: {},
        zaman: simdi,
      });
    }
    await yaz(tx, anketId, k);
    return { iletiler, kapandi, sonraki: plan.sonraki };
  });
  if (!is) return null;
  // E-posta işlem dışında gider; eylem yapılmış sayılmıştır (tekrar yağmuru olmasın). Başarısız ileti
  // için yeniden deneme süreç motorunun e-posta kuyruğuna bırakılır (bkz. rapor).
  for (const i of is.iletiler) await b.eposta.gonder(i);
  if (is.kapandi) await b.olay?.(kurumId, "anket_kapandi", { anketId });
  return is.sonraki;
}

/** Kurumdaki yayındaki anketlerin gönderim turu. Zamanlayıcı bunu süreç motorunun `tik`iyle birlikte çağırır. */
export async function anketTik(b: AnketBaglami, kurumId: string): Promise<Date | null> {
  const ids = await kiraciIslemi(b.db, kurumId, async (tx) =>
    (await tx.select({ id: sema.anket.id, k: sema.anket.kapsam }).from(sema.anket).orderBy(asc(sema.anket.olusturma)))
      .filter((r) => (r.k as { durum?: string }).durum === "yayinda")
      .map((r) => r.id),
  );
  let enYakin: Date | null = null;
  for (const id of ids) {
    const s = await anketTuru(b, kurumId, id);
    if (s && (!enYakin || s < enYakin)) enYakin = s;
  }
  return enYakin;
}

/** Katılımcının gördüğü anket (yanıt formu için). Yayında değilse hata. */
export async function anketFormu(b: AnketBaglami, kurumId: string, anketId: string) {
  return kiraciIslemi(b.db, kurumId, async (tx) => {
    const { k } = await oku(tx, anketId);
    const simdi = b.saat.simdi();
    const acik =
      k.durum === "yayinda" && simdi >= new Date(k.ayar.baslangic) && simdi < new Date(k.ayar.bitis);
    return { tanim: k.tanim, erisim: k.ayar.erisim, acik, bitis: k.ayar.bitis };
  });
}

/**
 * Anonim yanıtı kaydeder. Belirteç doğrulanır ve "kullanıldı" yapılır; yanıt satırı belirtece, kişiye ya
 * da saate bağlanmadan eklenir. Günlüğe yazılmaz.
 */
export async function yanitKaydet(
  b: AnketBaglami,
  g: { kurumId: string; anketId: string; belirtec: unknown; yanit: unknown },
): Promise<void> {
  if (!belirtecGecerliMi(g.belirtec))
    throw new AnketHatasi("Anket bağlantısı geçersiz. E-postadaki bağlantıyı yeniden açın.");
  const ozet = belirtecOzeti(g.belirtec);
  await kiraciIslemi(b.db, g.kurumId, async (tx) => {
    const { k } = await oku(tx, g.anketId);
    const simdi = b.saat.simdi();
    if (k.durum !== "yayinda" || simdi < new Date(k.ayar.baslangic) || simdi >= new Date(k.ayar.bitis))
      throw new AnketHatasi("Bu anket şu anda yanıt kabul etmiyor.");
    let yanit: Yanit;
    try {
      yanit = yanitDogrula(k.tanim, g.yanit);
    } catch (e) {
      if (e instanceof YanitHatasi) throw new AnketHatasi(e.message);
      throw e;
    }
    // Kota: aynı anda gelen yanıtlar sırayla sayılsın.
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`anket:${g.anketId}`}, 0))`);
    if (k.ayar.kota) {
      const [say] = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(sema.anketYaniti)
        .where(eq(sema.anketYaniti.anketId, g.anketId));
      if ((say?.n ?? 0) >= k.ayar.kota) throw new AnketHatasi("Anket yeterli yanıta ulaştı, yeni yanıt alınmıyor.");
    }
    if (k.ayar.erisim === "davet") {
      const r = await tx
        .update(sema.anketBelirteci)
        .set({ kullanildi: true })
        .where(
          and(
            eq(sema.anketBelirteci.anketId, g.anketId),
            eq(sema.anketBelirteci.ozet, ozet),
            eq(sema.anketBelirteci.kullanildi, false),
          ),
        )
        .returning({ id: sema.anketBelirteci.id });
      if (!r.length) throw new AnketHatasi("Bu bağlantıyla daha önce yanıt verilmiş ya da bağlantı geçersiz.");
    } else {
      const r = await tx
        .insert(sema.anketBelirteci)
        .values({ kurumId: g.kurumId, anketId: g.anketId, ozet, kaynak: "baglanti", kullanildi: true })
        .onConflictDoNothing()
        .returning({ id: sema.anketBelirteci.id });
      if (!r.length) throw new AnketHatasi("Bu ankete bu cihazdan daha önce yanıt verilmiş.");
    }
    await tx.insert(sema.anketYaniti).values({ kurumId: g.kurumId, anketId: g.anketId, yanitlar: json(yanit) });
  });
}

export interface AnketSonuclari {
  baslik: string;
  durum: AnketKapsami["durum"];
  tanim: AnketTanimi;
  baglam: Record<string, string>;
  sonuc: AnketSonucu;
  /** Kullanılan davet belirteci sayısı / davet sayısı (yanıt oranı izleme). */
  davetSayisi: number;
  /** Açık uçlu yanıtlar: soru kodu → { id, metin } (özetleme ve atıf için). */
  acikYanitlar: Record<string, { id: string; metin: string }[]>;
}

export async function anketSonuclari(b: AnketBaglami, kurumId: string, anketId: string): Promise<AnketSonuclari> {
  return kiraciIslemi(b.db, kurumId, async (tx) => {
    const { a, k } = await oku(tx, anketId);
    const satirlar = await tx
      .select({ id: sema.anketYaniti.id, y: sema.anketYaniti.yanitlar })
      .from(sema.anketYaniti)
      .where(eq(sema.anketYaniti.anketId, anketId))
      .orderBy(asc(sema.anketYaniti.id));
    const yanitlar = satirlar.map((r) => r.y as Yanit);
    const sonuc = anketSonucu(k.tanim, yanitlar, {
      esik: k.ayar.esik,
      ...(k.gonderim.davetSayisi ? { davetSayisi: k.gonderim.davetSayisi } : {}),
    });
    const acikYanitlar: AnketSonuclari["acikYanitlar"] = {};
    for (const s of k.tanim.sorular.filter((x) => x.tur === "acik"))
      acikYanitlar[s.kod] = satirlar
        .map((r) => ({ id: r.id, metin: String((r.y as Yanit)[s.kod] ?? "") }))
        .filter((x) => x.metin.trim());
    return {
      baslik: a.baslik,
      durum: k.durum,
      tanim: k.tanim,
      baglam: k.baglam,
      sonuc,
      davetSayisi: k.gonderim.davetSayisi,
      acikYanitlar,
    };
  });
}

/** İçe aktarılan (Google Forms / LimeSurvey) yanıtları kapalı bir ankete ekler. */
export async function yanitlariIceAktar(
  b: AnketBaglami,
  kurumId: string,
  anketId: string,
  yanitlar: readonly unknown[],
  aktor: Aktor,
): Promise<number> {
  return kiraciIslemi(b.db, kurumId, async (tx) => {
    const { k } = await oku(tx, anketId);
    const temiz = yanitlar.map((y) => yanitDogrula(k.tanim, y));
    for (let i = 0; i < temiz.length; i += 500)
      await tx
        .insert(sema.anketYaniti)
        .values(temiz.slice(i, i + 500).map((y) => ({ kurumId, anketId, yanitlar: json(y) })));
    await gunlugeYaz(tx, {
      aktor,
      eylem: "anket.ice_aktarildi",
      hedef: { tur: "anket", id: anketId },
      ayrinti: { yanit: temiz.length },
      zaman: b.saat.simdi(),
    });
    return temiz.length;
  });
}

/** Kurumdaki anketlerin listesi (panel). */
export async function anketListesi(b: AnketBaglami, kurumId: string) {
  return kiraciIslemi(b.db, kurumId, async (tx) => {
    const anketler = await tx.select().from(sema.anket).orderBy(asc(sema.anket.olusturma));
    const ids = anketler.map((a) => a.id);
    const sayilar = ids.length
      ? await tx
          .select({ id: sema.anketYaniti.anketId, n: sql<number>`count(*)::int` })
          .from(sema.anketYaniti)
          .where(inArray(sema.anketYaniti.anketId, ids))
          .groupBy(sema.anketYaniti.anketId)
      : [];
    return anketler.map((a) => {
      const k = AnketKapsami.parse(a.kapsam);
      const n = sayilar.find((s) => s.id === a.id)?.n ?? 0;
      return {
        id: a.id,
        baslik: a.baslik,
        durum: k.durum,
        sablon: k.tanim.sablon ?? null,
        bitis: k.ayar.bitis,
        yanitSayisi: n,
        davetSayisi: k.gonderim.davetSayisi,
        yanitOrani: k.gonderim.davetSayisi ? n / k.gonderim.davetSayisi : null,
      };
    });
  });
}
