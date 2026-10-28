// Kullanıcı yönetimi: davet, davet kabulü, rol atama, toplu içe aktarma ve API anahtarları.
// Her işlem yetki matrisinden geçer ve günlüğe yazılır. Belirteç ve anahtarların yalnız özeti saklanır;
// açık değerleri yalnız bir kez döndürülür, günlüğe girmez.

import { randomBytes } from "node:crypto";
import { ozetHesapla } from "@akredit/cekirdek";
import { gunlugeYaz, type Islem, kiraciIslemi, sema } from "@akredit/vt";
import {
  apiAnahtariTalebiDenetle,
  apiAnahtariUret,
  atamaYapabilirMi,
  DAVET_SURESI_MS,
  davetBelirteciUret,
  type Eylem,
  type KapsamTuru,
  kimlikOlayi,
  kullaniciCsvDogrula,
  kurumHedefi,
  type Rol,
  yetkiliMi,
} from "@akredit/yetki";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { ErisimHatasi, hedefZinciri, type IstekBaglami } from "./erisim.ts";
import type { KimlikSunucusu } from "./sunucu.ts";

const ROLLER = [
  "kurum_yoneticisi",
  "kalite_komisyonu_baskani",
  "kalite_komisyonu_uyesi",
  "birim_kalite_sorumlusu",
  "program_sorumlusu",
  "ogretim_elemani",
  "degerlendirici",
  "gozlemci",
] as const;

export const DavetGirdisi = z.object({
  adSoyad: z.string().trim().min(3).max(200),
  eposta: z.string().trim().toLowerCase().pipe(z.email()),
  rol: z.enum(ROLLER),
  kapsam: z.object({ tur: z.enum(["kurum", "birim", "program", "ders"]), id: z.uuid() }),
  rolBitis: z.coerce.date().nullable().default(null),
});
export type DavetGirdisi = z.input<typeof DavetGirdisi>;

function oturumlaOlmali(b: IstekBaglami) {
  // Kullanıcı ekleme ve anahtar yönetimi kişinin kendisi tarafından yapılır, API anahtarıyla yapılamaz.
  if (b.tur !== "oturum") throw new ErisimHatasi(403, "Bu işlem yalnız oturum açarak yapılabilir.");
  // Demo oturumu (İP-41) kullanıcı eklemez, rol atamaz, anahtar yönetmez.
  if (b.demo) throw new ErisimHatasi(403, "Örnek kurumda bu işlem yapılamaz.");
}

async function atamaDenetle(
  tx: Islem,
  b: IstekBaglami,
  rol: Rol,
  kapsam: { tur: KapsamTuru; id: string },
  rolBitis: Date | null,
  eylem: "kullanici.davet_et" | "rol.ata",
  simdi: Date,
) {
  const hedef = await hedefZinciri(tx, b.kisi.kurumId, kapsam.tur, kapsam.id);
  if (!hedef) throw new ErisimHatasi(404, "Seçilen birim, program ya da ders bulunamadı.");
  const s = atamaYapabilirMi(b.kisi, { rol, kapsam, hedef, baslangic: simdi, bitis: rolBitis }, eylem, simdi);
  if (!s.tamam) throw new ErisimHatasi(403, s.neden);
}

/** Davet oluşturur; açık belirteci (e-postayla gönderilecek) döndürür. */
export async function davetOlustur(k: KimlikSunucusu, b: IstekBaglami, girdi: DavetGirdisi) {
  oturumlaOlmali(b);
  const g = DavetGirdisi.parse(girdi);
  const simdi = k.simdi();
  const kurumId = b.kisi.kurumId;
  await kiraciIslemi(k.db, kurumId, (tx) =>
    atamaDenetle(tx, b, g.rol, g.kapsam, g.rolBitis, "kullanici.davet_et", simdi),
  );
  const { belirtec, ozet } = davetBelirteciUret(randomBytes(32));
  const [davet] = await k.db
    .insert(sema.kimlikDavet)
    .values({
      bagliKurumId: kurumId,
      eposta: g.eposta,
      adSoyad: g.adSoyad,
      rol: g.rol,
      kapsamTuru: g.kapsam.tur,
      kapsamId: g.kapsam.id,
      rolBitis: g.rolBitis,
      belirtecOzeti: ozet,
      sonGecerlilik: new Date(simdi.getTime() + DAVET_SURESI_MS),
      davetEdenKisiId: b.kisi.kisiId,
    })
    .returning();
  if (!davet) throw new Error("Davet eklenemedi.");
  await kiraciIslemi(k.db, kurumId, (tx) =>
    gunlugeYaz(
      tx,
      kimlikOlayi({
        aktor: { tur: "kisi", id: b.kisi.kisiId },
        eylem: "kimlik.davet_olusturuldu",
        hedef: { tur: "davet", id: davet.id },
        ayrinti: { rol: g.rol, kapsamTuru: g.kapsam.tur, kapsamId: g.kapsam.id },
      }),
    ),
  );
  return { davetId: davet.id, belirtec, baglanti: `${k.ayar.temelAdres}/davet?b=${belirtec}` };
}

/** Oturum açmış kullanıcı daveti kabul eder: kişi, üyelik ve rol ataması oluşur. */
export async function davetKabulEt(k: KimlikSunucusu, istek: Request, belirtec: string) {
  const oturum = await k.auth.api.getSession({ headers: istek.headers });
  if (!oturum) throw new ErisimHatasi(401, "Daveti kabul etmek için önce giriş yapın.");
  const simdi = k.simdi();
  const [davet] = await k.db
    .select()
    .from(sema.kimlikDavet)
    .where(and(eq(sema.kimlikDavet.belirtecOzeti, ozetHesapla(belirtec)), isNull(sema.kimlikDavet.kabulZamani)));
  if (!davet || davet.sonGecerlilik.getTime() <= simdi.getTime())
    throw new ErisimHatasi(404, "Davet bulunamadı ya da süresi doldu. Yeni bir davet isteyin.");
  if (davet.eposta !== oturum.user.email.toLowerCase())
    throw new ErisimHatasi(403, "Bu davet başka bir e-posta adresine gönderilmiş.");

  // Daveti önce atomik olarak sahiplen: eşzamanlı ikinci kabul burada boş döner ve hiçbir şey yazmaz.
  // Tekillik kısıtına dayanmak yetmez; var olan üyenin ikinci kabulü yeni bir rol ataması daha yazardı.
  const [sahiplenilen] = await k.db
    .update(sema.kimlikDavet)
    .set({ kabulZamani: simdi, kabulEdenKullaniciId: oturum.user.id })
    .where(and(eq(sema.kimlikDavet.id, davet.id), isNull(sema.kimlikDavet.kabulZamani)))
    .returning({ id: sema.kimlikDavet.id });
  if (!sahiplenilen) throw new ErisimHatasi(404, "Davet bulunamadı ya da süresi doldu. Yeni bir davet isteyin.");
  try {
    return await davetiUygula(k, davet, oturum.user.id, simdi);
  } catch (e) {
    // Uygulama başarısızsa sahiplenmeyi geri bırak ki davet yeniden denenebilsin.
    await k.db
      .update(sema.kimlikDavet)
      .set({ kabulZamani: null, kabulEdenKullaniciId: null })
      .where(and(eq(sema.kimlikDavet.id, davet.id), eq(sema.kimlikDavet.kabulZamani, simdi)));
    throw e;
  }
}

async function davetiUygula(
  k: KimlikSunucusu,
  davet: typeof sema.kimlikDavet.$inferSelect,
  kullaniciId: string,
  simdi: Date,
) {
  const oturum = { user: { id: kullaniciId } };
  const kurumId = davet.bagliKurumId;
  const mevcut = await k.db
    .select()
    .from(sema.kimlikUyelik)
    .where(and(eq(sema.kimlikUyelik.bagliKurumId, kurumId), eq(sema.kimlikUyelik.eposta, davet.eposta)));
  const kisiId = await kiraciIslemi(k.db, kurumId, async (tx) => {
    let kisiId = mevcut[0]?.kisiId;
    if (!kisiId) {
      const [kisi] = await tx
        .insert(sema.kisi)
        .values({ kurumId, adSoyad: davet.adSoyad, eposta: davet.eposta, oturumKullaniciId: oturum.user.id })
        .returning();
      if (!kisi) throw new Error("Kişi eklenemedi.");
      kisiId = kisi.id;
    }
    const [atama] = await tx
      .insert(sema.rolAtamasi)
      .values({
        kurumId,
        kisiId,
        rol: davet.rol,
        kapsamTuru: davet.kapsamTuru,
        kapsamId: davet.kapsamId,
        baslangic: simdi,
        bitis: davet.rolBitis,
      })
      .returning();
    await gunlugeYaz(
      tx,
      kimlikOlayi({
        aktor: { tur: "kisi", id: kisiId },
        eylem: "kimlik.davet_kabul_edildi",
        hedef: { tur: "davet", id: davet.id },
        ayrinti: { davetEden: davet.davetEdenKisiId },
      }),
    );
    await gunlugeYaz(
      tx,
      kimlikOlayi({
        aktor: { tur: "kisi", id: davet.davetEdenKisiId },
        eylem: "kimlik.rol_atandi",
        hedef: { tur: "rol_atamasi", id: atama?.id ?? "" },
        ayrinti: { kisi: kisiId, rol: davet.rol, kapsamTuru: davet.kapsamTuru, kapsamId: davet.kapsamId },
      }),
    );
    return kisiId;
  });
  if (!mevcut[0])
    await k.db
      .insert(sema.kimlikUyelik)
      .values({ kullaniciId: oturum.user.id, eposta: davet.eposta, bagliKurumId: kurumId, kisiId });
  return { kurumId, kisiId };
}

/** Var olan bir kişiye doğrudan rol atar. */
export async function rolAta(
  k: KimlikSunucusu,
  b: IstekBaglami,
  kisiId: string,
  rol: Rol,
  kapsam: { tur: KapsamTuru; id: string },
  rolBitis: Date | null,
) {
  oturumlaOlmali(b);
  const simdi = k.simdi();
  return kiraciIslemi(k.db, b.kisi.kurumId, async (tx) => {
    await atamaDenetle(tx, b, rol, kapsam, rolBitis, "rol.ata", simdi);
    const [kisi] = await tx.select({ id: sema.kisi.id }).from(sema.kisi).where(eq(sema.kisi.id, kisiId));
    if (!kisi) throw new ErisimHatasi(404, "Kişi bulunamadı.");
    const [atama] = await tx
      .insert(sema.rolAtamasi)
      .values({
        kurumId: b.kisi.kurumId,
        kisiId,
        rol,
        kapsamTuru: kapsam.tur,
        kapsamId: kapsam.id,
        baslangic: simdi,
        bitis: rolBitis,
      })
      .returning();
    if (!atama) throw new Error("Rol ataması eklenemedi.");
    await gunlugeYaz(
      tx,
      kimlikOlayi({
        aktor: { tur: "kisi", id: b.kisi.kisiId },
        eylem: "kimlik.rol_atandi",
        hedef: { tur: "rol_atamasi", id: atama.id },
        ayrinti: { kisi: kisiId, rol, kapsamTuru: kapsam.tur, kapsamId: kapsam.id },
      }),
    );
    return atama;
  });
}

/** Kapsam kodunu kimliğe çevirir: birim → birim kodu, program → program adı, ders → ders kodu. */
async function kapsamCoz(tx: Islem, kurumId: string, tur: KapsamTuru, kod: string): Promise<string | null> {
  if (tur === "kurum") return kurumId;
  if (tur === "birim") {
    const r = await tx.select({ id: sema.birim.id }).from(sema.birim).where(eq(sema.birim.kod, kod));
    return r.length === 1 ? (r[0]?.id ?? null) : null;
  }
  if (tur === "program") {
    const r = await tx.select({ id: sema.program.id }).from(sema.program).where(eq(sema.program.ad, kod));
    return r.length === 1 ? (r[0]?.id ?? null) : null;
  }
  const r = await tx.select({ id: sema.ders.id }).from(sema.ders).where(eq(sema.ders.kod, kod));
  return r.length === 1 ? (r[0]?.id ?? null) : null;
}

export interface IceAktarmaRaporu {
  eklenenKisi: number;
  eklenenAtama: number;
  hatalar: { satir: number; ileti: string }[];
}

/**
 * Toplu içe aktarma. Önce bütün dosya doğrulanır; tek bir hata varsa hiçbir şey kaydedilmez.
 * Kullanıcılar ilk girişlerinde (sihirli bağlantı ya da kurumsal giriş) e-postayla üyeliklerine bağlanır.
 */
export async function topluIceAktar(k: KimlikSunucusu, b: IstekBaglami, csv: string): Promise<IceAktarmaRaporu> {
  oturumlaOlmali(b);
  const simdi = k.simdi();
  const kurumId = b.kisi.kurumId;
  if (!yetkiliMi(b.kisi, "kullanici.ice_aktar", kurumHedefi(kurumId), simdi))
    throw new ErisimHatasi(403, "Toplu kullanıcı ekleme yetkiniz yok.");
  const d = kullaniciCsvDogrula(csv);
  if (d.hatalar.length > 0) return { eklenenKisi: 0, eklenenAtama: 0, hatalar: d.hatalar };

  const mevcutUyelikler = await k.db
    .select()
    .from(sema.kimlikUyelik)
    .where(eq(sema.kimlikUyelik.bagliKurumId, kurumId));
  const kisiByEposta = new Map(mevcutUyelikler.map((u) => [u.eposta, u.kisiId]));
  const yeniUyelikler: { eposta: string; kisiId: string }[] = [];

  const sonuc = await kiraciIslemi(k.db, kurumId, async (tx) => {
    const hatalar: { satir: number; ileti: string }[] = [];
    const cozulen: { satir: number; kapsamId: string }[] = [];
    for (const s of d.satirlar) {
      const kapsamId = await kapsamCoz(tx, kurumId, s.veri.kapsam_turu, s.veri.kapsam_kodu);
      if (!kapsamId) {
        hatalar.push({ satir: s.satir, ileti: "Kapsam kodu bulunamadı ya da birden çok kayıtla eşleşiyor." });
        continue;
      }
      const hedef = await hedefZinciri(tx, kurumId, s.veri.kapsam_turu, kapsamId);
      if (!hedef) {
        hatalar.push({ satir: s.satir, ileti: "Kapsam kodu bulunamadı ya da birden çok kayıtla eşleşiyor." });
        continue;
      }
      const t = atamaYapabilirMi(
        b.kisi,
        {
          rol: s.veri.rol,
          kapsam: { tur: s.veri.kapsam_turu, id: kapsamId },
          hedef,
          baslangic: simdi,
          bitis: s.veri.bitis ?? null,
        },
        "rol.ata",
        simdi,
      );
      if (!t.tamam) hatalar.push({ satir: s.satir, ileti: t.neden });
      else cozulen.push({ satir: s.satir, kapsamId });
    }
    if (hatalar.length > 0) return { eklenenKisi: 0, eklenenAtama: 0, hatalar };

    let eklenenKisi = 0;
    for (const [i, s] of d.satirlar.entries()) {
      let kisiId = kisiByEposta.get(s.veri.eposta);
      if (!kisiId) {
        const [kisi] = await tx
          .insert(sema.kisi)
          .values({ kurumId, adSoyad: s.veri.ad_soyad, unvan: s.veri.unvan ?? null, eposta: s.veri.eposta })
          .returning();
        if (!kisi) throw new Error("Kişi eklenemedi.");
        kisiId = kisi.id;
        kisiByEposta.set(s.veri.eposta, kisiId);
        yeniUyelikler.push({ eposta: s.veri.eposta, kisiId });
        eklenenKisi++;
      }
      await tx.insert(sema.rolAtamasi).values({
        kurumId,
        kisiId,
        rol: s.veri.rol,
        kapsamTuru: s.veri.kapsam_turu,
        kapsamId: cozulen[i]?.kapsamId ?? "",
        baslangic: simdi,
        bitis: s.veri.bitis ?? null,
      });
    }
    await gunlugeYaz(
      tx,
      kimlikOlayi({
        aktor: { tur: "kisi", id: b.kisi.kisiId },
        eylem: "kimlik.toplu_ice_aktarma",
        ayrinti: { kisi: eklenenKisi, atama: d.satirlar.length },
      }),
    );
    return { eklenenKisi, eklenenAtama: d.satirlar.length, hatalar };
  });
  if (yeniUyelikler.length > 0)
    await k.db.insert(sema.kimlikUyelik).values(yeniUyelikler.map((u) => ({ ...u, bagliKurumId: kurumId })));
  return sonuc;
}

/** API anahtarı oluşturur. Açık anahtar yalnız bu yanıtta döner; saklanan önek ve SHA-256 özetidir. */
export async function apiAnahtariOlustur(
  k: KimlikSunucusu,
  b: IstekBaglami,
  girdi: { ad: string; kapsam: string[]; bitis: Date },
) {
  oturumlaOlmali(b);
  const simdi = k.simdi();
  const kurumId = b.kisi.kurumId;
  if (!yetkiliMi(b.kisi, "api_anahtari.yonet", kurumHedefi(kurumId), simdi))
    throw new ErisimHatasi(403, "Anahtar oluşturma yetkiniz yok.");
  const t = apiAnahtariTalebiDenetle(girdi.kapsam, simdi, girdi.bitis);
  if (!t.tamam) throw new ErisimHatasi(403, t.neden);
  const ad = z.string().trim().min(1).max(100).parse(girdi.ad);
  const u = apiAnahtariUret(randomBytes(48));
  const [kayit] = await k.db
    .insert(sema.kimlikApiAnahtari)
    .values({
      bagliKurumId: kurumId,
      kisiId: b.kisi.kisiId,
      ad,
      onek: u.onek,
      ozet: u.ozet,
      kapsam: t.kapsam,
      bitis: girdi.bitis,
    })
    .returning();
  if (!kayit) throw new Error("Anahtar eklenemedi.");
  await kiraciIslemi(k.db, kurumId, (tx) =>
    gunlugeYaz(
      tx,
      kimlikOlayi({
        aktor: { tur: "kisi", id: b.kisi.kisiId },
        eylem: "kimlik.api_anahtari_olusturuldu",
        hedef: { tur: "api_anahtari", id: kayit.id },
        ayrinti: { ad, onek: u.onek, izinler: t.kapsam as Eylem[], bitis: girdi.bitis.toISOString() },
      }),
    ),
  );
  return { id: kayit.id, anahtar: u.anahtar };
}

/** API anahtarını iptal eder (kayıt silinmez, iptal zamanı yazılır). */
export async function apiAnahtariIptal(k: KimlikSunucusu, b: IstekBaglami, id: string) {
  oturumlaOlmali(b);
  const simdi = k.simdi();
  const kurumId = b.kisi.kurumId;
  const [kayit] = await k.db
    .select()
    .from(sema.kimlikApiAnahtari)
    .where(and(eq(sema.kimlikApiAnahtari.id, id), eq(sema.kimlikApiAnahtari.bagliKurumId, kurumId)));
  if (!kayit) throw new ErisimHatasi(404, "Anahtar bulunamadı.");
  const kendi = kayit.kisiId === b.kisi.kisiId;
  if (!kendi && !yetkiliMi(b.kisi, "api_anahtari.yonet", kurumHedefi(kurumId), simdi))
    throw new ErisimHatasi(403, "Bu anahtarı iptal etme yetkiniz yok.");
  await k.db.update(sema.kimlikApiAnahtari).set({ iptal: simdi }).where(eq(sema.kimlikApiAnahtari.id, id));
  await kiraciIslemi(k.db, kurumId, (tx) =>
    gunlugeYaz(
      tx,
      kimlikOlayi({
        aktor: { tur: "kisi", id: b.kisi.kisiId },
        eylem: "kimlik.api_anahtari_iptal_edildi",
        hedef: { tur: "api_anahtari", id },
      }),
    ),
  );
}
