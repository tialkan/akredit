// Kurum kurulum sihirbazı ve birim/program yönetimi (İP-35).
//
// Sihirbaz adımları: (a) YZ anahtarı (politika.yzAnahtariKaydet), (b) yurt dışı aktarım kararı (açık metin,
// adıyla imzalı, günlüğe), (c) Bologna adresinden birim/program/PÇ/ders önerisi (onayla), (d) hocaların daveti
// (web katmanı: kimlik), (e) çerçeve seçimi.
//
// Birim ve program düzeltmesi yeni kayıtla yapılır: eski ve yeni değer `kayit_duzeltmesi` tablosuna eklenir
// (yalnız ekleme; değiştirilemez, silinemez) ve günlüğe girer; kaydın güncel değeri ondan sonra yazılır.
// Kimlik (kayıt kimliği) korunur, çünkü dersler, roller ve kanıtlar bu kimliğe bağlıdır.

import { randomUUID } from "node:crypto";
import { gercekBaglam, programiOku } from "@akredit/baglayicilar";
import { type BolognaVerisi, okunamadiMi, ozetHesapla } from "@akredit/cekirdek";
import { ILK_CERCEVELER } from "@akredit/cerceveler";
import { type Islem, sema } from "@akredit/vt";
import { and, asc, eq, gte, isNull, or } from "drizzle-orm";
import { z } from "zod";
import { gunluge, islem, type ServisBaglami } from "../baglam.ts";
import { bolognaKoprusu, okumaKaydet } from "../bologna/index.ts";
import { bulunamadi, ServisHatasi } from "../hata.ts";
import { adlarAyniMi } from "../yardimci.ts";

const kurumHedefi = (b: ServisBaglami) => ({ tur: "kurum" as const, id: b.aktor.kurumId });
const Kimlik = z.uuid("Geçersiz kimlik.");

export const BIRIM_TURLERI = ["fakulte", "myo", "enstitu", "yuksekokul", "bolum", "anabilim_dali", "idari"] as const;
export const PROGRAM_DUZEYLERI = ["onlisans", "lisans", "yuksek_lisans", "doktora"] as const;

// ---------- (b) Yurt dışı aktarım kararı ----------

export const YURT_DISI_METNI_SURUMU = "2026-10-28";
/** Yöneticinin imzaladığı açık metin. Metnin özeti karar kaydına ve günlüğe yazılır. */
export const YURT_DISI_METNI = [
  "Kurumumuz adına aşağıdaki kararı veriyorum.",
  "Akredit, belgelerden öneri üretmek için kurumun kendi anahtarıyla OpenRouter üzerinden yurt dışındaki yapay zekâ hizmetlerine istek gönderebilir.",
  "İzin verilirse istekler gönderilmeden önce kişisel veriler (ad, T.C. kimlik numarası, öğrenci numarası, telefon, e-posta, IBAN) maskelenir; maskesiz kişisel veri gönderilmez.",
  "İzin verilmezse yurt dışındaki hizmetlere hiç istek gitmez; yapay zekâ işleri yalnız kurum içi bir model tanımlıysa çalışır.",
  "Bu karar kurum ayarlarında ve değiştirilemez günlükte adımla ve zamanıyla saklanır. Kararı daha sonra yeni bir imzayla değiştirebilirim.",
].join("\n");
export const YURT_DISI_METNI_OZETI = ozetHesapla(YURT_DISI_METNI);

export const YurtDisiKarariGirdisi = z
  .object({
    izin: z.boolean(),
    imzaAdi: z.string().trim().min(3, "Adınızı ve soyadınızı yazın.").max(200),
    metinOzeti: z.string().regex(/^[0-9a-f]{64}$/u),
  })
  .strict();

export interface YurtDisiKarari {
  izin: boolean;
  imzalayan: string;
  imzalayanKisiId: string;
  zaman: string;
  metinSurumu: string;
  metinOzeti: string;
}

async function kurumAyarlari(tx: Islem, kurumId: string) {
  const [k] = await tx.select().from(sema.kurum).where(eq(sema.kurum.id, kurumId));
  if (!k) throw bulunamadi();
  return { kurum: k, ayar: (k.ayarlar ?? {}) as Record<string, unknown> };
}

export async function yurtDisiKarariImzala(b: ServisBaglami, girdi: unknown): Promise<YurtDisiKarari> {
  const g = YurtDisiKarariGirdisi.parse(girdi);
  if (b.aktor.tur !== "oturum")
    throw new ServisHatasi("yetki_yok", "Bu karar yalnız oturum açmış yönetici tarafından imzalanabilir.");
  if (g.metinOzeti !== YURT_DISI_METNI_OZETI)
    throw new ServisHatasi("kural_ihlali", "Karar metni değişti. Sayfayı yenileyip güncel metni okuyun.");
  return islem(b, async (tx, gerekli) => {
    await gerekli("kurum.ayar_yonet", kurumHedefi(b));
    const [kisi] = await tx.select().from(sema.kisi).where(eq(sema.kisi.id, b.aktor.kisiId));
    if (!kisi || !adlarAyniMi(kisi.adSoyad, g.imzaAdi))
      throw new ServisHatasi("kural_ihlali", "İmza için adınızı hesabınızdaki gibi yazın.", [
        { alan: "imzaAdi", ileti: `Hesabınızdaki ad: ${kisi?.adSoyad ?? ""}` },
      ]);
    const karar: YurtDisiKarari = {
      izin: g.izin,
      imzalayan: kisi.adSoyad,
      imzalayanKisiId: kisi.id,
      zaman: b.simdi().toISOString(),
      metinSurumu: YURT_DISI_METNI_SURUMU,
      metinOzeti: YURT_DISI_METNI_OZETI,
    };
    const { ayar } = await kurumAyarlari(tx, b.aktor.kurumId);
    const yeni = {
      ...ayar,
      yz: { ...((ayar.yz as Record<string, unknown>) ?? {}), yurtDisiIzin: g.izin },
      yurtDisiKarari: karar,
    };
    await tx.update(sema.kurum).set({ ayarlar: yeni }).where(eq(sema.kurum.id, b.aktor.kurumId));
    await gunluge(
      tx,
      b,
      "kurum.yurt_disi_karari_imzalandi",
      { tur: "kurum", id: b.aktor.kurumId },
      { izin: g.izin, imzalayan: kisi.adSoyad, metinSurumu: YURT_DISI_METNI_SURUMU, metinOzeti: YURT_DISI_METNI_OZETI },
    );
    return karar;
  });
}

// ---------- (e) Çerçeve seçimi ----------

export interface CerceveSecenegi {
  kod: string;
  ad: string;
  surum: string;
  resmi: boolean;
  dogrulandi: boolean;
}

/** Seçilebilir çerçeveler: `@akredit/cerceveler` kütüphanesindeki ilk çerçeveler. */
export function cerceveSecenekleri(): CerceveSecenegi[] {
  return ILK_CERCEVELER.map((c) => ({
    kod: `${c.kod}@${c.surum}`,
    ad: c.ad,
    surum: c.surum,
    resmi: c.resmi,
    dogrulandi: c.dogrulandi,
  }));
}

export const CerceveSecimiGirdisi = z
  .object({ kodlar: z.array(z.string().max(100)).min(1, "En az bir çerçeve seçin.").max(10) })
  .strict();

export async function cercevelerSec(b: ServisBaglami, girdi: unknown): Promise<string[]> {
  const g = CerceveSecimiGirdisi.parse(girdi);
  const gecerli = new Set(cerceveSecenekleri().map((c) => c.kod));
  const bilinmeyen = g.kodlar.filter((k) => !gecerli.has(k));
  if (bilinmeyen.length) throw new ServisHatasi("gecersiz_istek", "Listede olmayan bir çerçeve seçildi.");
  const kodlar = [...new Set(g.kodlar)];
  return islem(b, async (tx, gerekli) => {
    await gerekli("kurum.ayar_yonet", kurumHedefi(b));
    const { ayar } = await kurumAyarlari(tx, b.aktor.kurumId);
    await tx
      .update(sema.kurum)
      .set({ ayarlar: { ...ayar, cerceveler: kodlar } })
      .where(eq(sema.kurum.id, b.aktor.kurumId));
    await gunluge(tx, b, "kurum.cerceveler_secildi", { tur: "kurum", id: b.aktor.kurumId }, { kodlar });
    return kodlar;
  });
}

// ---------- Birim ve program yönetimi ----------

export const BirimGirdisi = z
  .object({
    ad: z.string().trim().min(2, "Birimin adını yazın.").max(200),
    tur: z.enum(BIRIM_TURLERI),
    kod: z.string().trim().max(50).nullable().optional(),
    ustBirimId: Kimlik.nullable().optional(),
  })
  .strict();
export const BirimDuzeltmesi = BirimGirdisi.partial().strict();

export const ProgramGirdisi = z
  .object({
    birimId: Kimlik,
    ad: z.string().trim().min(2, "Programın adını yazın.").max(200),
    duzey: z.enum(PROGRAM_DUZEYLERI),
    dil: z.string().trim().min(2).max(10).optional(),
    bolognaAdresi: z.string().trim().url("Bologna adresi geçersiz.").max(2000).nullable().optional(),
    yokAtlasKodu: z
      .string()
      .trim()
      .regex(/^\d{9}$/u, "YÖK Atlas kodu 9 rakamdır.")
      .nullable()
      .optional(),
  })
  .strict();
export const ProgramDuzeltmesi = ProgramGirdisi.partial().strict();

export interface BirimKaydi {
  id: string;
  ad: string;
  tur: string;
  kod: string | null;
  ustBirimId: string | null;
  programlar: {
    id: string;
    ad: string;
    duzey: string;
    dil: string;
    bolognaAdresi: string | null;
    yokAtlasKodu: string | null;
    dersSayisi: number;
  }[];
}

export async function birimler(b: ServisBaglami): Promise<BirimKaydi[]> {
  return islem(b, async (tx, gerekli) => {
    await gerekli("oneri.oku", kurumHedefi(b));
    const bs = await tx.select().from(sema.birim).orderBy(asc(sema.birim.ad));
    const ps = await tx.select().from(sema.program).orderBy(asc(sema.program.ad));
    const ds = await tx.select({ programId: sema.ders.programId }).from(sema.ders);
    const sayi = new Map<string, number>();
    for (const d of ds) sayi.set(d.programId, (sayi.get(d.programId) ?? 0) + 1);
    return bs.map((x) => ({
      id: x.id,
      ad: x.ad,
      tur: x.tur,
      kod: x.kod,
      ustBirimId: x.ustBirimId,
      programlar: ps
        .filter((p) => p.birimId === x.id)
        .map((p) => ({
          id: p.id,
          ad: p.ad,
          duzey: p.duzey,
          dil: p.dil,
          bolognaAdresi: p.bolognaAdresi,
          yokAtlasKodu: p.yokAtlasKodu,
          dersSayisi: sayi.get(p.id) ?? 0,
        })),
    }));
  });
}

async function birimVarMi(tx: Islem, id: string) {
  const [x] = await tx.select({ id: sema.birim.id }).from(sema.birim).where(eq(sema.birim.id, id));
  if (!x) throw new ServisHatasi("gecersiz_istek", "Seçilen üst birim bulunamadı.");
}

export async function birimEkle(b: ServisBaglami, girdi: unknown): Promise<{ id: string }> {
  const g = BirimGirdisi.parse(girdi);
  return islem(b, async (tx, gerekli) => {
    await gerekli("kurum.ayar_yonet", kurumHedefi(b));
    if (g.ustBirimId) await birimVarMi(tx, g.ustBirimId);
    const [x] = await tx
      .insert(sema.birim)
      .values({ kurumId: b.aktor.kurumId, ad: g.ad, tur: g.tur, kod: g.kod ?? null, ustBirimId: g.ustBirimId ?? null })
      .returning({ id: sema.birim.id });
    if (!x) throw new Error("Birim eklenemedi.");
    await gunluge(tx, b, "birim.eklendi", { tur: "birim", id: x.id }, { ad: g.ad, tur: g.tur });
    return x;
  });
}

type Deger = string | number | boolean | null;

async function duzeltmeYaz(
  tx: Islem,
  b: ServisBaglami,
  tur: "birim" | "program",
  id: string,
  onceki: Record<string, Deger>,
  yeni: Record<string, Deger>,
) {
  await tx.insert(sema.kayitDuzeltmesi).values({
    kurumId: b.aktor.kurumId,
    hedefTuru: tur,
    hedefId: id,
    onceki,
    yeni,
    duzeltenKisiId: b.aktor.kisiId,
  });
  await gunluge(tx, b, `${tur}.duzeltildi`, { tur, id }, { alanlar: Object.keys(yeni) });
}

/** Değişen alanlar: yalnız gerçekten farklı olanlar. Hiçbiri yoksa boş. */
function fark<T extends Record<string, unknown>>(eski: T, yeni: Partial<T>) {
  const onceki: Record<string, Deger> = {};
  const sonraki: Record<string, Deger> = {};
  for (const [k, v] of Object.entries(yeni)) {
    if (v === undefined) continue;
    const e = (eski[k] ?? null) as Deger;
    if (e !== v) {
      onceki[k] = e;
      sonraki[k] = v as Deger;
    }
  }
  return { onceki, sonraki };
}

export async function birimDuzelt(b: ServisBaglami, id: string, girdi: unknown): Promise<{ degisen: string[] }> {
  const birimId = Kimlik.parse(id);
  const g = BirimDuzeltmesi.parse(girdi);
  return islem(b, async (tx, gerekli) => {
    await gerekli("kurum.ayar_yonet", kurumHedefi(b));
    const [eski] = await tx.select().from(sema.birim).where(eq(sema.birim.id, birimId));
    if (!eski) throw bulunamadi();
    if (g.ustBirimId === birimId) throw new ServisHatasi("gecersiz_istek", "Birim kendi üst birimi olamaz.");
    if (g.ustBirimId) await birimVarMi(tx, g.ustBirimId);
    const { onceki, sonraki } = fark(eski, g);
    if (!Object.keys(sonraki).length) return { degisen: [] };
    await duzeltmeYaz(tx, b, "birim", birimId, onceki, sonraki);
    await tx.update(sema.birim).set(sonraki).where(eq(sema.birim.id, birimId));
    return { degisen: Object.keys(sonraki) };
  });
}

export async function programEkle(b: ServisBaglami, girdi: unknown): Promise<{ id: string }> {
  const g = ProgramGirdisi.parse(girdi);
  return islem(b, async (tx, gerekli) => {
    await gerekli("kurum.ayar_yonet", kurumHedefi(b));
    await birimVarMi(tx, g.birimId);
    const [x] = await tx
      .insert(sema.program)
      .values({
        kurumId: b.aktor.kurumId,
        birimId: g.birimId,
        ad: g.ad,
        duzey: g.duzey,
        dil: g.dil ?? "tr",
        bolognaAdresi: g.bolognaAdresi ?? null,
        yokAtlasKodu: g.yokAtlasKodu ?? null,
      })
      .returning({ id: sema.program.id });
    if (!x) throw new Error("Program eklenemedi.");
    await gunluge(tx, b, "program.eklendi", { tur: "program", id: x.id }, { ad: g.ad, duzey: g.duzey });
    return x;
  });
}

export async function programDuzelt(b: ServisBaglami, id: string, girdi: unknown): Promise<{ degisen: string[] }> {
  const programId = Kimlik.parse(id);
  const g = ProgramDuzeltmesi.parse(girdi);
  return islem(b, async (tx, gerekli) => {
    await gerekli("kurum.ayar_yonet", kurumHedefi(b));
    const [eski] = await tx.select().from(sema.program).where(eq(sema.program.id, programId));
    if (!eski) throw bulunamadi();
    if (g.birimId) await birimVarMi(tx, g.birimId);
    const { onceki, sonraki } = fark(eski, g);
    if (!Object.keys(sonraki).length) return { degisen: [] };
    await duzeltmeYaz(tx, b, "program", programId, onceki, sonraki);
    await tx.update(sema.program).set(sonraki).where(eq(sema.program.id, programId));
    return { degisen: Object.keys(sonraki) };
  });
}

export interface DuzeltmeKaydi {
  zaman: string;
  duzelten: string;
  onceki: Record<string, Deger>;
  yeni: Record<string, Deger>;
}

export async function duzeltmeGecmisi(
  b: ServisBaglami,
  tur: "birim" | "program",
  id: string,
): Promise<DuzeltmeKaydi[]> {
  const hedefId = Kimlik.parse(id);
  return islem(b, async (tx, gerekli) => {
    await gerekli("oneri.oku", { tur, id: hedefId });
    const r = await tx
      .select({ d: sema.kayitDuzeltmesi, ad: sema.kisi.adSoyad })
      .from(sema.kayitDuzeltmesi)
      .innerJoin(sema.kisi, eq(sema.kisi.id, sema.kayitDuzeltmesi.duzeltenKisiId))
      .where(and(eq(sema.kayitDuzeltmesi.hedefTuru, tur), eq(sema.kayitDuzeltmesi.hedefId, hedefId)))
      .orderBy(asc(sema.kayitDuzeltmesi.olusturma));
    return r.map((x) => ({
      zaman: x.d.olusturma.toISOString(),
      duzelten: x.ad,
      onceki: x.d.onceki as Record<string, Deger>,
      yeni: x.d.yeni as Record<string, Deger>,
    }));
  });
}

// ---------- Kişiler ve roller ----------

export interface KisiKaydi {
  id: string;
  adSoyad: string;
  eposta: string | null;
  roller: { rol: string; kapsamTuru: string; kapsamId: string; kapsamAdi: string; bitis: string | null }[];
}

export async function kisiler(b: ServisBaglami): Promise<KisiKaydi[]> {
  return islem(b, async (tx, gerekli) => {
    await gerekli("kurum.ayar_yonet", kurumHedefi(b));
    const simdi = b.simdi();
    const ks = await tx.select().from(sema.kisi).orderBy(asc(sema.kisi.adSoyad));
    const rs = await tx
      .select()
      .from(sema.rolAtamasi)
      .where(or(isNull(sema.rolAtamasi.bitis), gte(sema.rolAtamasi.bitis, simdi)));
    const adlar = new Map<string, string>([[b.aktor.kurumId, "Kurumun tamamı"]]);
    for (const x of await tx.select({ id: sema.birim.id, ad: sema.birim.ad }).from(sema.birim)) adlar.set(x.id, x.ad);
    for (const x of await tx.select({ id: sema.program.id, ad: sema.program.ad }).from(sema.program))
      adlar.set(x.id, x.ad);
    for (const x of await tx.select({ id: sema.ders.id, ad: sema.ders.ad, kod: sema.ders.kod }).from(sema.ders))
      adlar.set(x.id, `${x.kod} ${x.ad}`);
    return ks.map((k) => ({
      id: k.id,
      adSoyad: k.adSoyad,
      eposta: k.eposta,
      roller: rs
        .filter((r) => r.kisiId === k.id)
        .map((r) => ({
          rol: r.rol,
          kapsamTuru: r.kapsamTuru,
          kapsamId: r.kapsamId,
          kapsamAdi: adlar.get(r.kapsamId) ?? "Bilinmeyen kapsam",
          bitis: r.bitis?.toISOString() ?? null,
        })),
    }));
  });
}

// ---------- (c) Bologna'dan birim, program, PÇ ve ders önerisi ----------

export const BolognaOnizlemeGirdisi = z
  .object({ adres: z.string().trim().url("Bologna adresi geçersiz.").max(2000) })
  .strict();

/** Özel ağ adresleri ve yerel makine: sunucu bu adreslere istek göndermez (SSRF). */
export function icAgAdresiMi(ana: string): boolean {
  const h = ana.toLowerCase().replace(/^\[|\]$/gu, "");
  if (h === "localhost" || h.endsWith(".localhost") || h === "::1" || h === "0.0.0.0") return true;
  if (!h.includes(".") && !h.includes(":")) return true;
  if (/\.(local|internal|lan|home)$/u.test(h)) return true;
  const ip = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/u);
  if (ip) {
    const [a, b2] = [Number(ip[1]), Number(ip[2])];
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b2 === 254) ||
      (a === 172 && b2 >= 16 && b2 <= 31) ||
      (a === 192 && b2 === 168) ||
      (a === 100 && b2 >= 64 && b2 <= 127)
    );
  }
  return /^(f[cd][0-9a-f]{2}|fe80):/u.test(h);
}

/** Bologna program adresini denetler. `yerelIzin` yalnız testte (yerel örnek sunucu) açılır. */
export function bolognaAdresiSorunu(adres: string, yerelIzin = false): string | null {
  let u: URL;
  try {
    u = new URL(adres);
  } catch {
    return "Bologna adresi geçersiz.";
  }
  if (u.username || u.password) return "Adreste kullanıcı adı ya da parola olmamalı.";
  if (!yerelIzin && u.protocol !== "https:") return "Bologna adresi https:// ile başlamalı.";
  if (yerelIzin && u.protocol !== "https:" && u.protocol !== "http:") return "Bologna adresi geçersiz.";
  if (!yerelIzin && icAgAdresiMi(u.hostname)) return "Bu adres kurum dışından erişilebilen bir Bologna sayfası değil.";
  if (!u.pathname.toLowerCase().includes("/bologna/") || !u.searchParams.get("curSunit"))
    return "Programın Bologna sayfasının adresini yapıştırın (adreste /bologna/ ve curSunit geçmeli).";
  return null;
}

export interface BolognaOnizleme {
  onizlemeId: string;
  adres: string;
  okundu: string;
  programCiktilari: { kod: string; metin: string }[];
  dersler: {
    kod: string;
    ad: string;
    akts: number | null;
    yariyil: number | null;
    tul: string | null;
    zorunlu: boolean;
    dersiVerenler: string[];
  }[];
  okunamayanDersler: string[];
  /** Bologna'daki "Dersi Verenler" adları (yalnız ad; e-posta önerilmez, uydurulmaz). */
  dersiVerenler: { ad: string; dersler: string[] }[];
}

const onizlemeler = new Map<string, { kurumId: string; bitis: number; veri: BolognaVerisi; ozet: BolognaOnizleme }>();
const ONIZLEME_SURESI_MS = 60 * 60_000;

/** "Dersi Verenler" hücresini adlara böler. */
export function dersiVerenleriAyir(hucre: string | undefined): string[] {
  if (!hucre) return [];
  return hucre
    .split(/[,;\n]|\s{2,}/u)
    .map((x) => x.replace(/\[e-posta ayıklandı\]/gu, "").trim())
    .filter((x) => x.length >= 3 && /\p{L}/u.test(x));
}

/** Okunan Bologna verisinden öneri özetini çıkarır (saf). */
export function bolognaOnizlemesiKur(veri: BolognaVerisi, onizlemeId: string): BolognaOnizleme {
  const kisiler = new Map<string, string[]>();
  const dersler: BolognaOnizleme["dersler"] = [];
  const okunamayan: string[] = [];
  const adlar = new Map(veri.matris.dersler.map((d) => [d.kod, d]));
  for (const d of veri.dersler) {
    if (okunamadiMi(d)) {
      okunamayan.push(d.kod);
      continue;
    }
    if (d.bos) {
      okunamayan.push(d.kod);
      continue;
    }
    const verenler = dersiVerenleriAyir(
      d.bilgiler["Dersi Verenler"] ?? d.bilgiler["Dersi Veren"] ?? d.bilgiler["Dersi Veren Öğretim Elemanları"],
    );
    for (const v of verenler) kisiler.set(v, [...(kisiler.get(v) ?? []), d.kod]);
    const m = adlar.get(d.kod);
    dersler.push({
      kod: d.kod,
      ad: d.ad ?? m?.ad ?? d.kod,
      akts: d.akts,
      yariyil: d.yariyil ?? m?.yariyil ?? null,
      tul: d.tul ?? null,
      zorunlu: d.zorunlu,
      dersiVerenler: verenler,
    });
  }
  return {
    onizlemeId,
    adres: veri.adres,
    okundu: veri.okundu,
    programCiktilari: veri.programCiktilari.map((p) => ({ kod: p.kod, metin: p.metin })),
    dersler,
    okunamayanDersler: okunamayan,
    dersiVerenler: [...kisiler.entries()]
      .map(([ad, ds]) => ({ ad, dersler: ds }))
      .sort((a, c) => a.ad.localeCompare(c.ad, "tr")),
  };
}

function okuyucu(): (adres: string) => Promise<BolognaVerisi> {
  const k = bolognaKoprusu().oku;
  if (k) return k;
  return (adres) => programiOku(adres, gercekBaglam(), { aralikMs: 200 });
}

/** Bologna sayfalarını okur ve öneriyi döndürür; hiçbir şey kaydedilmez (onay bekler). */
export async function bolognaOnizle(
  b: ServisBaglami,
  girdi: unknown,
  secenek: { yerelIzin?: boolean } = {},
): Promise<BolognaOnizleme> {
  const g = BolognaOnizlemeGirdisi.parse(girdi);
  const sorun = bolognaAdresiSorunu(g.adres, secenek.yerelIzin ?? process.env.AKREDIT_BOLOGNA_YEREL_IZIN === "1");
  if (sorun) throw new ServisHatasi("gecersiz_istek", sorun, [{ alan: "adres", ileti: sorun }]);
  await islem(b, (_tx, gerekli) => gerekli("kurum.ayar_yonet", kurumHedefi(b)));
  let veri: BolognaVerisi;
  try {
    veri = await okuyucu()(g.adres);
  } catch {
    throw new ServisHatasi(
      "kural_ihlali",
      "Bologna sayfaları okunamadı. Adresi tarayıcıda açıp doğrulayın, sonra yeniden deneyin.",
    );
  }
  if (!veri.programCiktilari.length && !veri.dersler.length)
    throw new ServisHatasi("kural_ihlali", "Bu adreste program çıktısı ya da ders bulunamadı. Adresi denetleyin.");
  const simdi = b.simdi().getTime();
  for (const [k, v] of onizlemeler) if (v.bitis < simdi) onizlemeler.delete(k);
  const id = randomUUID();
  const ozet = bolognaOnizlemesiKur(veri, id);
  onizlemeler.set(id, { kurumId: b.aktor.kurumId, bitis: simdi + ONIZLEME_SURESI_MS, veri, ozet });
  return ozet;
}

export const BolognaUygulamaGirdisi = z
  .object({
    onizlemeId: Kimlik,
    birim: z.union([z.object({ id: Kimlik }).strict(), BirimGirdisi.pick({ ad: true, tur: true }).strict()]),
    program: z
      .object({ ad: z.string().trim().min(2, "Programın adını yazın.").max(200), duzey: z.enum(PROGRAM_DUZEYLERI) })
      .strict(),
    /** Onaylanan ders kodları; verilmezse hepsi. */
    dersKodlari: z.array(z.string().max(50)).max(500).optional(),
    /** Program çıktıları eklensin mi? */
    programCiktilari: z.boolean().default(true),
  })
  .strict();

export interface BolognaUygulamaSonucu {
  birimId: string;
  programId: string;
  dersSayisi: number;
  ciktiSayisi: number;
  okumaKaniti: string | null;
}

/** Yöneticinin onayladığı öneriyi kaydeder: birim (yoksa), program, program çıktıları ve dersler. */
export async function bolognaUygula(b: ServisBaglami, girdi: unknown): Promise<BolognaUygulamaSonucu> {
  const g = BolognaUygulamaGirdisi.parse(girdi);
  const o = onizlemeler.get(g.onizlemeId);
  if (!o || o.kurumId !== b.aktor.kurumId || o.bitis < b.simdi().getTime())
    throw new ServisHatasi("bulunamadi", "Önizlemenin süresi doldu. Bologna adresini yeniden okutun.");
  const secili = g.dersKodlari ? new Set(g.dersKodlari) : null;
  const sonuc = await islem(b, async (tx, gerekli) => {
    await gerekli("kurum.ayar_yonet", kurumHedefi(b));
    const kurumId = b.aktor.kurumId;
    let birimId: string;
    if ("id" in g.birim) {
      await birimVarMi(tx, g.birim.id);
      birimId = g.birim.id;
    } else {
      const [x] = await tx
        .insert(sema.birim)
        .values({ kurumId, ad: g.birim.ad, tur: g.birim.tur })
        .returning({ id: sema.birim.id });
      if (!x) throw new Error("Birim eklenemedi.");
      birimId = x.id;
      await gunluge(tx, b, "birim.eklendi", { tur: "birim", id: birimId }, { ad: g.birim.ad, kaynak: "bologna" });
    }
    const [p] = await tx
      .insert(sema.program)
      .values({ kurumId, birimId, ad: g.program.ad, duzey: g.program.duzey, bolognaAdresi: o.ozet.adres })
      .returning({ id: sema.program.id });
    if (!p) throw new Error("Program eklenemedi.");
    let ciktiSayisi = 0;
    if (g.programCiktilari && o.ozet.programCiktilari.length) {
      await tx.insert(sema.cikti).values(
        o.ozet.programCiktilari.map((c) => ({
          kurumId,
          tur: "program" as const,
          sahipId: p.id,
          kod: c.kod,
          metin: c.metin,
        })),
      );
      ciktiSayisi = o.ozet.programCiktilari.length;
    }
    const dersler = o.ozet.dersler.filter((d) => !secili || secili.has(d.kod));
    const tul = (t: string | null) => (t ?? "").split("+").map((x) => Number.parseInt(x, 10));
    if (dersler.length)
      await tx.insert(sema.ders).values(
        dersler.map((d) => {
          const [t, u, l] = tul(d.tul);
          return {
            kurumId,
            programId: p.id,
            kod: d.kod,
            ad: d.ad,
            akts: d.akts ?? 0,
            teorik: Number.isFinite(t) ? (t as number) : 0,
            uygulama: Number.isFinite(u) ? (u as number) : 0,
            laboratuvar: Number.isFinite(l) ? (l as number) : 0,
            yariyil: d.yariyil ?? 0,
            zorunlu: d.zorunlu,
          };
        }),
      );
    await gunluge(
      tx,
      b,
      "program.bolognadan_eklendi",
      { tur: "program", id: p.id },
      { ad: g.program.ad, dersSayisi: dersler.length, ciktiSayisi, adres: o.ozet.adres },
    );
    return { birimId, programId: p.id, dersSayisi: dersler.length, ciktiSayisi };
  });
  // Okuma, deposu bağlıysa kanıt olarak saklanır (özetli dosya). Depo yoksa öneriler yine kayıtlıdır.
  let okumaKaniti: string | null = null;
  if (bolognaKoprusu().depo) okumaKaniti = (await okumaKaydet(b, sonuc.programId, { veri: o.veri })).kanitId;
  onizlemeler.delete(g.onizlemeId);
  return { ...sonuc, okumaKaniti };
}

// ---------- Kurulum durumu ----------

export interface KurulumDurumu {
  kurumAdi: string;
  alanAdi: string | null;
  yzAnahtari: { son4: string; model: string } | null;
  yurtDisiKarari: YurtDisiKarari | null;
  birimSayisi: number;
  programSayisi: number;
  dersSayisi: number;
  cerceveler: string[];
  yoneticiAdi: string;
}

export async function kurulumDurumu(b: ServisBaglami): Promise<KurulumDurumu> {
  return islem(b, async (tx, gerekli) => {
    await gerekli("kurum.ayar_yonet", kurumHedefi(b));
    const { kurum, ayar } = await kurumAyarlari(tx, b.aktor.kurumId);
    const say = async (t: typeof sema.birim | typeof sema.program | typeof sema.ders) =>
      (await tx.select({ id: t.id }).from(t)).length;
    const [kisi] = await tx.select().from(sema.kisi).where(eq(sema.kisi.id, b.aktor.kisiId));
    const anahtar = ayar.yzAnahtar as { son4?: string; model?: string } | undefined;
    return {
      kurumAdi: kurum.ad,
      alanAdi: kurum.alanAdi,
      yzAnahtari: anahtar?.son4 ? { son4: anahtar.son4, model: anahtar.model ?? "" } : null,
      yurtDisiKarari: (ayar.yurtDisiKarari as YurtDisiKarari | undefined) ?? null,
      birimSayisi: await say(sema.birim),
      programSayisi: await say(sema.program),
      dersSayisi: await say(sema.ders),
      cerceveler: Array.isArray(ayar.cerceveler) ? (ayar.cerceveler as string[]) : [],
      yoneticiAdi: kisi?.adSoyad ?? "",
    };
  });
}
