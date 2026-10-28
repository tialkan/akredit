// İstek bağlamı ve yetki denetimi. İstek ya oturum çereziyle ya da `Authorization: Bearer akr_...` API
// anahtarıyla gelir. Bağlam her zaman tek bir kuruma bağlıdır; kiracı verisi yalnız `kiraciIslemi` içinde,
// satır güvenliğiyle okunur. Hedefin kapsam zinciri veritabanından kurulur, istemciden alınmaz.

import { gunlugeYaz, type Islem, kiraciIslemi, sema } from "@akredit/vt";
import {
  type ApiAnahtariKaydi,
  apiAnahtariAyristir,
  apiAnahtariDogrula,
  csrfDenetle,
  type Eylem,
  type KapsamTuru,
  kimlikOlayi,
  type RolAtamasi,
  type YetkiHedefi,
  type YetkiKisisi,
  yetkiliMi,
} from "@akredit/yetki";
import { and, eq } from "drizzle-orm";
import { DEMO_EYLEMLERI } from "../demo/roller.ts";
import type { KimlikSunucusu } from "./sunucu.ts";

export class ErisimHatasi extends Error {
  readonly durum: 401 | 403 | 404;
  constructor(durum: 401 | 403 | 404, ileti: string) {
    super(ileti);
    this.durum = durum;
  }
}

export interface IstekBaglami {
  tur: "oturum" | "anahtar";
  kullaniciId: string | null;
  kisi: YetkiKisisi;
  /**
   * İzin üst sınırı: API anahtarıyla gelindiyse anahtarın izinleri, demo oturumunda `DEMO_EYLEMLERI`.
   * Yetki, kişinin rolleriyle bunun kesişimidir.
   */
  anahtarKapsami: readonly Eylem[] | null;
  anahtarId: string | null;
  /** Demo oturumu (İP-41): sentetik Örnek Üniversitesi, seçilen rol ve bitiş. Gerçek kurumda hiçbir zaman dolu değil. */
  demo?: { rol: string; bitis: Date } | null;
}

/** Kişinin rol atamalarını kiracı işleminde okur. */
export async function atamalariOku(tx: Islem, kisiId: string): Promise<RolAtamasi[]> {
  const satirlar = await tx.select().from(sema.rolAtamasi).where(eq(sema.rolAtamasi.kisiId, kisiId));
  return satirlar.map((r) => ({
    rol: r.rol,
    kapsam: { tur: r.kapsamTuru, id: r.kapsamId },
    baslangic: r.baslangic,
    bitis: r.bitis,
  }));
}

async function kisiYukle(k: KimlikSunucusu, kurumId: string, kisiId: string): Promise<YetkiKisisi> {
  const atamalar = await kiraciIslemi(k.db, kurumId, (tx) => atamalariOku(tx, kisiId));
  return { kisiId, kurumId, atamalar };
}

/**
 * İstekten bağlam çıkarır. Birden çok kurumda üyeliği olan kullanıcı `x-akredit-kurum` başlığıyla kurum seçer;
 * seçtiği kurumda üyeliği yoksa erişim reddedilir.
 */
export async function istekBaglami(k: KimlikSunucusu, istek: Request): Promise<IstekBaglami> {
  const yetkilendirme = istek.headers.get("authorization");
  if (yetkilendirme?.startsWith("Bearer ")) return anahtarBaglami(k, yetkilendirme.slice(7));

  const oturum = await k.auth.api.getSession({ headers: istek.headers });
  if (!oturum) throw new ErisimHatasi(401, "Oturumunuz yok ya da süresi doldu. Lütfen yeniden giriş yapın.");
  const uyelikler = await k.db
    .select()
    .from(sema.kimlikUyelik)
    .where(eq(sema.kimlikUyelik.kullaniciId, oturum.user.id));
  const secilen = istek.headers.get("x-akredit-kurum");
  const uyelik = secilen ? uyelikler.find((u) => u.bagliKurumId === secilen) : uyelikler[0];
  if (!uyelik) throw new ErisimHatasi(403, "Hesabınız bu kuruma bağlı değil. Kurum yöneticinizden davet isteyin.");
  if (uyelik.demoBitis) {
    // Demo oturumu: süre üyelikte tutulur (oturum yenilense bile uzamaz) ve izinler demo sınırıyla kesişir.
    if (uyelik.demoBitis.getTime() <= k.simdi().getTime())
      throw new ErisimHatasi(401, "Örnek oturumunuzun süresi doldu. Deneyin sayfasından yeniden başlayabilirsiniz.");
    return {
      tur: "oturum",
      kullaniciId: oturum.user.id,
      kisi: await kisiYukle(k, uyelik.bagliKurumId, uyelik.kisiId),
      anahtarKapsami: DEMO_EYLEMLERI,
      anahtarId: null,
      demo: { rol: uyelik.demoRolu ?? "", bitis: uyelik.demoBitis },
    };
  }
  return {
    tur: "oturum",
    kullaniciId: oturum.user.id,
    kisi: await kisiYukle(k, uyelik.bagliKurumId, uyelik.kisiId),
    anahtarKapsami: null,
    anahtarId: null,
    demo: null,
  };
}

async function anahtarBaglami(k: KimlikSunucusu, metin: string): Promise<IstekBaglami> {
  const a = apiAnahtariAyristir(metin);
  const [satir] = a
    ? await k.db.select().from(sema.kimlikApiAnahtari).where(eq(sema.kimlikApiAnahtari.onek, a.onek))
    : [];
  const kayit: ApiAnahtariKaydi | null = satir
    ? {
        id: satir.id,
        kurumId: satir.bagliKurumId,
        kisiId: satir.kisiId,
        onek: satir.onek,
        ozet: satir.ozet,
        kapsam: satir.kapsam as Eylem[],
        bitis: satir.bitis,
        iptal: satir.iptal,
      }
    : null;
  const simdi = k.simdi();
  const d = apiAnahtariDogrula(metin, kayit, simdi);
  if (!d.gecerli) throw new ErisimHatasi(401, `${d.neden} Yeni bir anahtar oluşturun.`);
  await k.db
    .update(sema.kimlikApiAnahtari)
    .set({ sonKullanim: simdi })
    .where(eq(sema.kimlikApiAnahtari.id, d.kayit.id));
  return {
    tur: "anahtar",
    kullaniciId: null,
    kisi: await kisiYukle(k, d.kayit.kurumId, d.kayit.kisiId),
    anahtarKapsami: d.kayit.kapsam,
    anahtarId: d.kayit.id,
  };
}

/** Hedefin kapsam zinciri. Kiracı işleminde çalışır: başka kurumun kaydı görünmez, `null` döner. */
export async function hedefZinciri(
  tx: Islem,
  kurumId: string,
  tur: KapsamTuru,
  id: string,
): Promise<YetkiHedefi | null> {
  const kok = { tur: "kurum" as const, id: kurumId };
  if (tur === "kurum") {
    const [k] = await tx.select({ id: sema.kurum.id }).from(sema.kurum).where(eq(sema.kurum.id, id));
    return k ? { kurumId, zincir: [kok] } : null;
  }
  const birimZinciri = async (birimId: string) => {
    const zincir: { tur: "birim"; id: string }[] = [];
    let simdiki: string | null = birimId;
    for (let i = 0; simdiki && i < 10; i++) {
      const [b] = await tx
        .select({ id: sema.birim.id, ust: sema.birim.ustBirimId })
        .from(sema.birim)
        .where(eq(sema.birim.id, simdiki));
      if (!b) return null;
      zincir.unshift({ tur: "birim", id: b.id });
      simdiki = b.ust;
    }
    return zincir;
  };
  if (tur === "birim") {
    const z = await birimZinciri(id);
    return z ? { kurumId, zincir: [kok, ...z] } : null;
  }
  const programZinciri = async (programId: string) => {
    const [p] = await tx
      .select({ id: sema.program.id, birimId: sema.program.birimId })
      .from(sema.program)
      .where(eq(sema.program.id, programId));
    if (!p) return null;
    const z = await birimZinciri(p.birimId);
    return z ? [kok, ...z, { tur: "program" as const, id: p.id }] : null;
  };
  if (tur === "program") {
    const z = await programZinciri(id);
    return z ? { kurumId, zincir: z } : null;
  }
  const [d] = await tx
    .select({ id: sema.ders.id, programId: sema.ders.programId })
    .from(sema.ders)
    .where(eq(sema.ders.id, id));
  if (!d) return null;
  const z = await programZinciri(d.programId);
  return z ? { kurumId, zincir: [...z, { tur: "ders", id: d.id }] } : null;
}

/** Bağlam bu eylemi bu hedefte yapabilir mi? Anahtarla gelindiyse anahtarın kapsamı da izin vermeli. */
export function baglamYetkiliMi(b: IstekBaglami, eylem: Eylem, hedef: YetkiHedefi, simdi: Date): boolean {
  if (b.anahtarKapsami && !b.anahtarKapsami.includes(eylem)) return false;
  return yetkiliMi(b.kisi, eylem, hedef, simdi);
}

/**
 * Yetkili iş: hedefi kiracı işleminde bulur, yetkiyi denetler, işi aynı işlemde çalıştırır.
 * Başka kurumun ya da var olmayan hedef 404; yetkisiz 403 (ve günlüğe "erişim reddedildi" yazılır).
 */
export async function yetkiliIs<T>(
  k: KimlikSunucusu,
  b: IstekBaglami,
  eylem: Eylem,
  hedef: { tur: KapsamTuru; id: string },
  is: (tx: Islem, hedef: YetkiHedefi) => Promise<T>,
): Promise<T> {
  const kurumId = b.kisi.kurumId;
  const sonuc = await kiraciIslemi(k.db, kurumId, async (tx) => {
    const h = await hedefZinciri(tx, kurumId, hedef.tur, hedef.id);
    if (!h) return { durum: 404 as const };
    if (!baglamYetkiliMi(b, eylem, h, k.simdi())) return { durum: 403 as const };
    return { durum: 200 as const, deger: await is(tx, h) };
  });
  if (sonuc.durum === 404) throw new ErisimHatasi(404, "Aradığınız kayıt bulunamadı.");
  if (sonuc.durum === 403) {
    await kiraciIslemi(k.db, kurumId, (tx) =>
      gunlugeYaz(
        tx,
        kimlikOlayi({
          aktor: { tur: "kisi", id: b.kisi.kisiId },
          eylem: "kimlik.erisim_reddedildi",
          hedef: { tur: hedef.tur, id: hedef.id },
          ayrinti: { istenen: eylem, yol: b.tur },
        }),
      ),
    );
    throw new ErisimHatasi(403, "Bu işlem için yetkiniz yok. Gerekirse kalite komisyonuna başvurun.");
  }
  return sonuc.deger as T;
}

/** Yanıt: hata iletisi Türkçe ve sade; giriş bilgisi hiçbir zaman yanıta konmaz. */
export function hataYaniti(e: unknown): Response {
  if (e instanceof ErisimHatasi) return Response.json({ hata: e.message }, { status: e.durum });
  return Response.json({ hata: "Beklenmeyen bir sorun oluştu. Biraz sonra yeniden deneyin." }, { status: 500 });
}

/** Korumalı uç noktaları sarar: CSRF (çerezli durum değiştiren istekler), bağlam, hata yanıtı. */
export function korumali(
  k: KimlikSunucusu,
  isleyici: (istek: Request, baglam: IstekBaglami) => Promise<Response>,
): (istek: Request) => Promise<Response> {
  return async (istek) => {
    try {
      const anahtarla = istek.headers.get("authorization")?.startsWith("Bearer ") ?? false;
      const koken =
        istek.headers.get("origin") ??
        (istek.headers.get("referer") ? new URL(istek.headers.get("referer") as string).origin : null);
      const izinli = [k.ayar.temelAdres, ...k.ayar.izinliKokenler];
      if (
        !csrfDenetle(
          { yontem: istek.method, koken, fetchSite: istek.headers.get("sec-fetch-site"), apiAnahtariyla: anahtarla },
          izinli,
        )
      )
        return Response.json({ hata: "İstek bu siteden gelmedi. Sayfayı yenileyip yeniden deneyin." }, { status: 403 });
      return await isleyici(istek, await istekBaglami(k, istek));
    } catch (e) {
      return hataYaniti(e);
    }
  };
}

/** Kurum içi bir kişinin üyeliğini bulur (davet ve içe aktarmada). */
export async function uyelikBul(k: KimlikSunucusu, kurumId: string, eposta: string) {
  const [u] = await k.db
    .select()
    .from(sema.kimlikUyelik)
    .where(and(eq(sema.kimlikUyelik.bagliKurumId, kurumId), eq(sema.kimlikUyelik.eposta, eposta.toLowerCase())));
  return u ?? null;
}
