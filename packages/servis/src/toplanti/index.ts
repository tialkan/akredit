// Toplantı ve karar asistanı servisi (İP-18): planlama ve gündem, davet, kayıttan tutanak taslağı, insan onayıyla
// kesinleştirme, kararların PUKÖ eylemine dönüşmesi ve süreç motoruna verilmesi, EBYS çıktısı, ölçüt bağı önerisi.
//
// Tutanak taslağı bir öneridir (`toplanti_tutanagi`, yüksek risk: toplu onaylanamaz). Kesinleşme yalnız o öneriye
// oturumdaki bir kişinin verdiği onay ya da düzeltme kararıyla olur; karar adı, zamanı ve dayanağıyla günlüktedir.

import { icsUret } from "@akredit/surec";
import { type Islem, sema } from "@akredit/vt";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { gunluge, type Hedef, islem, type ServisBaglami } from "../baglam.ts";
import { bulunamadi, ServisHatasi } from "../hata.ts";
import { kanitHedefi } from "../kanit.ts";
import { type AcikEylem, ebysTutanagi, type GundemMaddesi, gundemTaslagi } from "./gundem.ts";
import { type TutanakTaslagi, taslakMetni, tutanakTaslagiKur } from "./tutanak.ts";

export * from "./gundem.ts";
export * from "./tutanak.ts";

/** Süreç motoruna köprü (apps/isci `olayYayinla`). Servis süreç motorunu doğrudan çağırmaz; çağıran bağlar. */
export type SurecKoprusu = (
  kurumId: string,
  olay: string,
  aktorKisiId: string,
  g: { kapsam: Record<string, unknown>; atamalar: Record<string, string> },
) => Promise<string[]>;

const Kimlik = z.string().uuid("Geçersiz kimlik.");
const HedefSemasi = z.object({ tur: z.enum(["kurum", "birim", "program"]), id: Kimlik });

export const PlanlaGirdisi = z
  .object({
    baslik: z.string().trim().min(3, "Başlık en az 3 karakter olmalı.").max(200),
    zaman: z.string().datetime({ offset: true, message: "Toplantı zamanı geçersiz." }),
    sureDakika: z.number().int().min(15).max(600).default(90),
    katilimciKisiIdleri: z.array(Kimlik).min(1, "En az bir katılımcı seçin.").max(200),
    hedef: HedefSemasi.optional(),
  })
  .strict();

export const TaslakGirdisi = z
  .object({
    toplantiId: Kimlik,
    kanitId: Kimlik,
    /** İsteğe bağlı model adayları (ör. `toplanti-bilgisi` görevinin `kararlar` alanı). */
    adaylar: z.array(z.unknown()).max(200).optional(),
    uretici: z.record(z.string(), z.string()).optional(),
  })
  .strict();

const GundemKaydi = z.object({
  hedef: HedefSemasi,
  sureDakika: z.number().int(),
  maddeler: z.array(
    z.object({
      sira: z.number(),
      baslik: z.string(),
      kaynak: z.object({ tur: z.enum(["eylem", "gorev", "acilis", "dilek"]), id: z.string().nullable() }),
      gecikmis: z.boolean(),
      olcutKodlari: z.array(z.string()),
    }),
  ),
});
type GundemKaydi = z.infer<typeof GundemKaydi>;

const TaslakIcerigi = z.object({
  baslik: z.string(),
  metin: z.string(),
  toplantiId: Kimlik,
  kanitId: Kimlik,
  taslak: z.custom<TutanakTaslagi>((v) => typeof v === "object" && v !== null && "kararlar" in v),
});

export interface ToplantiGorunumu {
  id: string;
  baslik: string;
  zaman: string;
  hedef: Hedef;
  katilimciSayisi: number;
  gundem: GundemMaddesi[];
  tutanakKanitId: string | null;
  durum: "planlandi" | "taslak_onayda" | "kesinlesti";
}

const json = (v: unknown) => JSON.parse(JSON.stringify(v)) as object;

async function toplantiYukle(tx: Islem, id: string) {
  const [t] = await tx.select().from(sema.toplanti).where(eq(sema.toplanti.id, id));
  if (!t) throw bulunamadi();
  const g = GundemKaydi.safeParse(t.gundem);
  if (!g.success) throw bulunamadi();
  return { t, g: g.data };
}

async function kisiler(tx: Islem, idler: readonly string[]) {
  if (idler.length === 0) return [];
  const s = await tx
    .select({ kisiId: sema.kisi.id, ad: sema.kisi.adSoyad })
    .from(sema.kisi)
    .where(inArray(sema.kisi.id, [...idler]));
  const m = new Map(s.map((k) => [k.kisiId, k]));
  return idler.flatMap((i) => (m.has(i) ? [m.get(i) as { kisiId: string; ad: string }] : []));
}

/** Toplantıyı planlar; gündem taslağı açık eylemlerden ve açık görevlerden kurulur. */
export async function planla(b: ServisBaglami, girdi: unknown): Promise<ToplantiGorunumu> {
  const g = PlanlaGirdisi.parse(girdi);
  const hedef: Hedef = g.hedef ?? { tur: "kurum", id: b.aktor.kurumId };
  return islem(b, async (tx, gerekli) => {
    await gerekli("surec.yonet", hedef);
    const ids = [...new Set(g.katilimciKisiIdleri)];
    if ((await kisiler(tx, ids)).length !== ids.length)
      throw new ServisHatasi("gecersiz_istek", "Seçilen katılımcılardan biri kurumunuzda bulunamadı.");
    const eylemler: AcikEylem[] = (await tx.select().from(sema.eylem)).map((e) => {
      const k = e.kaynak as { olcutKodlari?: unknown };
      return {
        id: e.id,
        tanim: e.tanim,
        pukoAsamasi: e.pukoAsamasi,
        hedefTarih: e.hedefTarih,
        olcutKodlari: Array.isArray(k.olcutKodlari) ? k.olcutKodlari.filter((x) => typeof x === "string") : [],
      };
    });
    const gorevSatirlari = await tx
      .select({ id: sema.gorev.id, baslik: sema.gorev.baslik, son: sql<Date | null>`min(${sema.sonTarih.tarih})` })
      .from(sema.gorev)
      .leftJoin(sema.sonTarih, eq(sema.sonTarih.gorevId, sema.gorev.id))
      .where(eq(sema.gorev.durum, "acik"))
      .groupBy(sema.gorev.id, sema.gorev.baslik);
    const maddeler = gundemTaslagi({
      eylemler,
      gorevler: gorevSatirlari.map((r) => ({ id: r.id, baslik: r.baslik, sonTarih: r.son ? new Date(r.son) : null })),
      simdi: b.simdi(),
    });
    const kayit: GundemKaydi = { hedef: hedef as GundemKaydi["hedef"], sureDakika: g.sureDakika, maddeler };
    const [t] = await tx
      .insert(sema.toplanti)
      .values({
        kurumId: b.aktor.kurumId,
        baslik: g.baslik,
        zaman: new Date(g.zaman),
        katilimciKisiIdleri: ids,
        gundem: json(kayit),
      })
      .returning();
    if (!t) throw new Error("Toplantı eklenemedi.");
    await gunluge(tx, b, "toplanti.planlandi", { tur: "toplanti", id: t.id }, { katilimci: ids.length });
    return gorunum(t, kayit, "planlandi");
  });
}

function gorunum(
  t: typeof sema.toplanti.$inferSelect,
  g: GundemKaydi,
  durum: ToplantiGorunumu["durum"],
): ToplantiGorunumu {
  return {
    id: t.id,
    baslik: t.baslik,
    zaman: t.zaman.toISOString(),
    hedef: g.hedef,
    katilimciSayisi: t.katilimciKisiIdleri.length,
    gundem: g.maddeler,
    tutanakKanitId: t.tutanakKanitId,
    durum,
  };
}

async function taslakOnerileri(tx: Islem) {
  return tx
    .select({ o: sema.oneri, k: sema.karar })
    .from(sema.oneri)
    .leftJoin(sema.karar, eq(sema.karar.oneriId, sema.oneri.id))
    .where(eq(sema.oneri.tur, "toplanti_tutanagi"));
}

/** Aktörün görebildiği toplantılar (en yeni önce). */
export async function toplantilar(b: ServisBaglami): Promise<ToplantiGorunumu[]> {
  return islem(b, async (tx, _g, d) => {
    const satirlar = await tx.select().from(sema.toplanti);
    const oneriler = await taslakOnerileri(tx);
    const sonuc: ToplantiGorunumu[] = [];
    for (const t of satirlar) {
      const g = GundemKaydi.safeParse(t.gundem);
      if (!g.success || !(await d.izinliMi("oneri.oku", g.data.hedef))) continue;
      const ilgili = oneriler.filter((r) => (r.o.icerik as { toplantiId?: string }).toplantiId === t.id);
      const durum = t.tutanakKanitId ? "kesinlesti" : ilgili.some((r) => !r.k) ? "taslak_onayda" : "planlandi";
      sonuc.push(gorunum(t, g.data, durum));
    }
    return sonuc.sort((a, c) => c.zaman.localeCompare(a.zaman));
  });
}

/** Takvim daveti (.ics). Katılımcı adları dosyaya yazılmaz (en az kişisel veri); davet e-postası alıcılara gider. */
export async function davet(b: ServisBaglami, toplantiId: string): Promise<string> {
  return islem(b, async (tx, gerekli) => {
    const { t, g } = await toplantiYukle(tx, Kimlik.parse(toplantiId));
    await gerekli("oneri.oku", g.hedef);
    const bitis = new Date(t.zaman.getTime() + g.sureDakika * 60_000);
    return icsUret(
      [
        {
          uid: `toplanti-${t.id}`,
          baslik: t.baslik,
          aciklama: `Gündem:\n${g.maddeler.map((m) => `${m.sira}. ${m.baslik}`).join("\n")}`,
          baslangic: t.zaman,
          bitis,
          alarmGunOnce: [1],
          durum: "CONFIRMED",
        },
      ],
      { ad: t.baslik, damga: b.simdi() },
    );
  });
}

/**
 * Kayıttan (not ya da kurum içi döküm, kanıt olarak yüklenmiş) tutanak taslağı önerisi üretir. Kararlar yalnız
 * kayda atıflı olabilir; atıfsız ya da kayıtta geçmeyen karar reddedilir ve taslağa girmez.
 */
export async function tutanakTaslagi(
  b: ServisBaglami,
  girdi: unknown,
): Promise<{ oneriId: string; taslak: TutanakTaslagi }> {
  const g = TaslakGirdisi.parse(girdi);
  return islem(b, async (tx, gerekli) => {
    const { t, g: gk } = await toplantiYukle(tx, g.toplantiId);
    await gerekli("surec.yonet", gk.hedef);
    if (t.tutanakKanitId) throw new ServisHatasi("cakisma", "Bu toplantının tutanağı zaten kesinleşmiş.");
    const [k] = await tx.select().from(sema.kanit).where(eq(sema.kanit.id, g.kanitId));
    if (!k) throw bulunamadi();
    await gerekli("kanit.oku", kanitHedefi(b.aktor.kurumId, k.kapsamlar));
    const parcalar = await tx
      .select({ capa: sema.kanitParcasi.capa, metin: sema.kanitParcasi.metin, sira: sema.kanitParcasi.sira })
      .from(sema.kanitParcasi)
      .where(eq(sema.kanitParcasi.kanitId, k.id))
      .orderBy(sema.kanitParcasi.sira);
    if (parcalar.length === 0)
      throw new ServisHatasi("gecersiz_istek", "Kaydın metni henüz çıkarılmadı. İşlenince yeniden deneyin.");
    const taslak = tutanakTaslagiKur({
      kayit: { ozet: k.ozet, parcalar: parcalar.map((p) => ({ capa: (p.capa ?? {}) as object, metin: p.metin })) },
      katilimcilar: await kisiler(tx, t.katilimciKisiIdleri),
      ...(g.adaylar ? { adaylar: g.adaylar } : {}),
      gundemOlcutKodlari: gk.maddeler.flatMap((m) => m.olcutKodlari),
    });
    const metin = taslakMetni(t.baslik, t.zaman.toISOString().slice(0, 10), taslak);
    const [o] = await tx
      .insert(sema.oneri)
      .values({
        kurumId: b.aktor.kurumId,
        tur: "toplanti_tutanagi",
        hedefTuru: gk.hedef.tur,
        hedefId: gk.hedef.id,
        icerik: json({ baslik: `Tutanak taslağı: ${t.baslik}`, metin, toplantiId: t.id, kanitId: k.id, taslak }),
        gerekce: `Kayıttan ${taslak.kararlar.length} atıflı karar; ${taslak.reddedilenler.length} aday reddedildi; ${taslak.eksikler.length} eksik.`,
        atiflar: json(taslak.kararlar.map((x) => ({ kanitId: k.id, atif: x.atif }))),
        ureticiTuru: g.adaylar ? "yz" : "kural",
        uretici: g.adaylar
          ? (g.uretici ?? { gorev: "toplanti-bilgisi" })
          : { kural: "tutanak-karar-satiri", surum: "1" },
        // Tutanak kurum adına resmî kayıttır: tek tek incelenir, toplu onaylanamaz.
        risk: "yuksek",
      })
      .returning({ id: sema.oneri.id });
    if (!o) throw new Error("Öneri eklenemedi.");
    await gunluge(
      tx,
      b,
      "toplanti.tutanak_taslagi",
      { tur: "oneri", id: o.id },
      { toplanti: t.id, kanit: k.id, karar: taslak.kararlar.length, reddedilen: taslak.reddedilenler.length },
    );
    return { oneriId: o.id, taslak };
  });
}

export interface KesinlesmeSonucu {
  toplantiId: string;
  eylemIdleri: string[];
  olcutOneriId: string | null;
  surecOrnekleri: string[];
}

/**
 * Onaylanmış (ya da düzeltilerek onaylanmış) tutanak taslağını kesinleştirir: toplantıya tutanak kanıtını bağlar,
 * her karar için PUKÖ eylemi açar, ölçüt bağı önerisi ekler ve eylemleri süreç motoruna verir.
 */
export async function kesinlestir(b: ServisBaglami, oneriId: string, kopru?: SurecKoprusu): Promise<KesinlesmeSonucu> {
  const id = Kimlik.parse(oneriId);
  const sonuc = await islem(b, async (tx, gerekli) => {
    const [r] = await tx
      .select({ o: sema.oneri, k: sema.karar })
      .from(sema.oneri)
      .leftJoin(sema.karar, eq(sema.karar.oneriId, sema.oneri.id))
      .where(and(eq(sema.oneri.id, id), eq(sema.oneri.tur, "toplanti_tutanagi")));
    if (!r) throw bulunamadi();
    const ic = TaslakIcerigi.safeParse(r.o.icerik);
    if (!ic.success) throw bulunamadi();
    const { t, g } = await toplantiYukle(tx, ic.data.toplantiId);
    await gerekli("surec.yonet", g.hedef);
    if (!r.k || r.k.sonuc === "reddedildi")
      throw new ServisHatasi("kural_ihlali", "Tutanak insan onayı olmadan kesinleşmez. Önce taslağı onaylayın.");
    if (t.tutanakKanitId) throw new ServisHatasi("cakisma", "Bu toplantının tutanağı zaten kesinleşmiş.");
    const duzeltme = r.k.sonuc === "duzeltildi" ? ((r.k.duzeltme as { metin?: string } | null)?.metin ?? "") : null;
    // Düzeltmede insanın sildiği karar eyleme dönüşmez; insanın eklediği metin tutanakta kalır ama eylem önerisi
    // yalnız kayda atıflı kararlardan çıkar.
    const kararlar = ic.data.taslak.kararlar.filter((k) => duzeltme === null || duzeltme.includes(k.metin));
    await tx
      .update(sema.toplanti)
      .set({ tutanakKanitId: ic.data.kanitId })
      .where(and(eq(sema.toplanti.id, t.id), sql`${sema.toplanti.tutanakKanitId} is null`));
    const eylemIdleri: string[] = [];
    for (const k of kararlar) {
      const [e] = await tx
        .insert(sema.eylem)
        .values({
          kurumId: b.aktor.kurumId,
          kaynak: json({
            tur: "toplanti_karari",
            id: t.id,
            oneriId: r.o.id,
            kararId: r.k.id,
            kararNo: k.no,
            atif: k.atif,
            olcutKodlari: k.eylem.olcutKodlari,
          }),
          tanim: k.eylem.tanim,
          sorumluKisiId: k.eylem.sorumluKisiId,
          hedefTarih: k.eylem.hedefTarih ? new Date(`${k.eylem.hedefTarih}T00:00:00Z`) : null,
          pukoAsamasi: "planla",
          kanitIdleri: [ic.data.kanitId],
        })
        .returning({ id: sema.eylem.id });
      if (e) eylemIdleri.push(e.id);
    }
    let olcutOneriId: string | null = null;
    const kodlar = ic.data.taslak.olcutKodlari;
    if (kodlar.length) {
      const [kn] = await tx.select().from(sema.kanit).where(eq(sema.kanit.id, ic.data.kanitId));
      const [o] = await tx
        .insert(sema.oneri)
        .values({
          kurumId: b.aktor.kurumId,
          tur: "kanit_etiketi",
          hedefTuru: "kanit",
          hedefId: ic.data.kanitId,
          icerik: json({
            baslik: `Toplantı kanıtını ölçütlere bağla: ${t.baslik}`,
            metin: `Önerilen ölçütler: ${kodlar.join(", ")}`,
            olcutKodlari: kodlar,
          }),
          gerekce: "Ölçüt kodları toplantının gündeminde ya da onaylı kararlarında geçiyor.",
          atiflar: json(kn ? [{ kanitId: kn.id }] : []),
          ureticiTuru: "kural",
          uretici: { kural: "toplanti-olcut-bagi", surum: "1" },
          risk: "dusuk",
        })
        .returning({ id: sema.oneri.id });
      olcutOneriId = o?.id ?? null;
    }
    await gunluge(
      tx,
      b,
      "toplanti.tutanak_kesinlesti",
      { tur: "toplanti", id: t.id },
      { oneri: r.o.id, karar: r.k.id, eylemler: eylemIdleri },
    );
    const sorumlular = new Map(kararlar.map((k, i) => [eylemIdleri[i], k.eylem.sorumluKisiId]));
    return { toplantiId: t.id, eylemIdleri, olcutOneriId, sorumlular };
  });
  const surecOrnekleri: string[] = [];
  if (kopru)
    for (const eylemId of sonuc.eylemIdleri) {
      const s = sonuc.sorumlular.get(eylemId);
      surecOrnekleri.push(
        ...(await kopru(b.aktor.kurumId, "eylem_acildi", b.aktor.kisiId, {
          kapsam: { tur: "eylem", id: eylemId, toplantiId: sonuc.toplantiId },
          atamalar: s ? { birim_kalite_sorumlusu: s } : {},
        })),
      );
    }
  return {
    toplantiId: sonuc.toplantiId,
    eylemIdleri: sonuc.eylemIdleri,
    olcutOneriId: sonuc.olcutOneriId,
    surecOrnekleri,
  };
}

/** EBYS'ye yüklenecek tutanak metni; yalnız onaylı ve kesinleşmiş tutanak için. */
export async function ebysCiktisi(b: ServisBaglami, toplantiId: string): Promise<string> {
  return islem(b, async (tx, gerekli) => {
    const { t, g } = await toplantiYukle(tx, Kimlik.parse(toplantiId));
    await gerekli("oneri.oku", g.hedef);
    if (!t.tutanakKanitId)
      throw new ServisHatasi("kural_ihlali", "Tutanak henüz onaylanıp kesinleşmedi. Önce taslağı onaylayın.");
    const r = (await taslakOnerileri(tx)).find(
      (x) => (x.o.icerik as { toplantiId?: string }).toplantiId === t.id && x.k !== null && x.k.sonuc !== "reddedildi",
    );
    const ic = r ? TaslakIcerigi.safeParse(r.o.icerik) : null;
    if (!r?.k || !ic?.success) throw bulunamadi();
    const [onaylayan] = await kisiler(tx, [r.k.kararVerenKisiId]);
    const [kurum] = await tx.select({ ad: sema.kurum.ad }).from(sema.kurum).where(eq(sema.kurum.id, t.kurumId));
    return ebysTutanagi({
      kurumAdi: kurum?.ad ?? "",
      baslik: t.baslik,
      zaman: t.zaman,
      gundem: g.maddeler,
      katilimcilar: ic.data.taslak.katilimcilar,
      kararlar: ic.data.taslak.kararlar,
      onay: {
        onaylayan: onaylayan?.ad ?? r.k.kararVerenKisiId,
        zaman: r.k.zaman,
        sonuc: r.k.sonuc === "duzeltildi" ? "duzeltildi" : "onaylandi",
      },
      duzeltilmisMetin:
        r.k.sonuc === "duzeltildi" ? ((r.k.duzeltme as { metin?: string } | null)?.metin ?? null) : null,
    });
  });
}
