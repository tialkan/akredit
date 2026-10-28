// Self-servis kurum açılışının web katmanı (İP-35): başvuru, doğrulama ve hocaların daveti.
// İş kuralları `@akredit/servis` (kurumAcilisi); burada köken denetimi, bal küpü alanı, gönderim süresi,
// ağ izi ve e-posta gönderimi yapılır. Belirteçler yalnız e-postaya yazılır; günlüğe ve yanıta girmez.

import { kurumAcilisi, ServisHatasi } from "@akredit/servis";
import { kiraciIslemi, sema } from "@akredit/vt";
import { agParmakIzi } from "@akredit/yetki";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { ErisimHatasi, type IstekBaglami } from "./erisim.ts";
import type { KimlikSunucusu } from "./sunucu.ts";
import { davetOlustur } from "./yonetim.ts";

/** Formun açılıp gönderilmesi arasında en az bu kadar süre geçmeli (bot denetimi). */
export const EN_AZ_DOLDURMA_MS = 2000;

const BasvuruGovdesi = z
  .object({
    kurumAdi: z.string(),
    alanAdi: z.string(),
    yoneticiAdi: z.string(),
    eposta: z.string(),
    /** Bal küpü: gerçek kullanıcı görmez, boş kalmalı. */
    webSitesi: z.string().max(500).optional(),
    /** Formun açıldığı an (ms). */
    acilis: z.number().int().nonnegative(),
  })
  .strict();

export function kokenGecerliMi(k: KimlikSunucusu, istek: Request): boolean {
  const koken = istek.headers.get("origin");
  return koken === new URL(k.ayar.temelAdres).origin || k.ayar.izinliKokenler.includes(koken ?? "");
}

function istemciIp(istek: Request): string | null {
  // Güvenilir vekil (nginx/Coolify) `x-real-ip` yazar; `x-forwarded-for` ilk değeri istemci tarafından yazılabilir.
  return istek.headers.get("x-real-ip") ?? istek.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ?? null;
}

export type Yanit = { durum: number; govde: Record<string, unknown> };

function servisYaniti(e: unknown): Yanit {
  if (e instanceof ServisHatasi) return { durum: e.durum, govde: { hata: e.message, kod: e.kod, alanlar: e.alanlar } };
  if (e instanceof z.ZodError)
    return {
      durum: 400,
      govde: {
        hata: "Bilgiler eksik ya da hatalı. Alanları düzeltip yeniden deneyin.",
        alanlar: e.issues.map((i) => ({ alan: i.path.join("."), ileti: i.message })),
      },
    };
  if (e instanceof ErisimHatasi) return { durum: e.durum, govde: { hata: e.message } };
  return { durum: 500, govde: { hata: "Beklenmeyen bir sorun oluştu. Biraz sonra yeniden deneyin." } };
}

/** Başvuru: doğrulama bağlantısı yöneticinin kurumsal e-postasına gider. */
export async function basvuruIsle(k: KimlikSunucusu, istek: Request, ham: unknown): Promise<Yanit> {
  if (!kokenGecerliMi(k, istek))
    return { durum: 403, govde: { hata: "İstek bu siteden gelmedi. Sayfayı yenileyip yeniden deneyin." } };
  const g = BasvuruGovdesi.safeParse(ham);
  if (!g.success) return { durum: 400, govde: { hata: "Form eksik gönderildi. Sayfayı yenileyip yeniden deneyin." } };
  const simdi = k.simdi();
  // Bal küpü dolu ya da form insan hızından hızlı gönderilmişse aynı yanıt döner, hiçbir şey yapılmaz.
  const SAHTE_TAMAM = { durum: 202, govde: { tamam: true } };
  if (g.data.webSitesi || simdi.getTime() - g.data.acilis < EN_AZ_DOLDURMA_MS) return SAHTE_TAMAM;
  try {
    const { webSitesi: _b, acilis: _a, ...girdi } = g.data;
    const r = await kurumAcilisi.acilisBaslat(k.db, girdi, {
      simdi,
      agIzi: agParmakIzi(istemciIp(istek), k.ayar.gizli),
    });
    await k.eposta.kurumAcilisi(r.eposta, {
      kurumAdi: r.kurumAdi,
      baglanti: `${k.ayar.temelAdres}/kurum-ac/dogrula?b=${r.belirtec}`,
    });
    return { durum: 202, govde: { tamam: true } };
  } catch (e) {
    return servisYaniti(e);
  }
}

const DogrulamaGovdesi = z.object({ belirtec: z.string().min(20).max(100) }).strict();

/** Doğrulama: kurum ve ilk yönetici oluşur, ardından giriş bağlantısı yöneticinin e-postasına gider. */
export async function dogrulamaIsle(k: KimlikSunucusu, istek: Request, ham: unknown): Promise<Yanit> {
  if (!kokenGecerliMi(k, istek))
    return { durum: 403, govde: { hata: "İstek bu siteden gelmedi. Sayfayı yenileyip yeniden deneyin." } };
  const g = DogrulamaGovdesi.safeParse(ham);
  if (!g.success)
    return { durum: 400, govde: { hata: "Doğrulama bağlantısı geçersiz. E-postadaki bağlantıyı yeniden açın." } };
  try {
    const r = await kurumAcilisi.acilisTamamla(k.db, g.data.belirtec, { simdi: k.simdi() });
    let girisGonderildi = true;
    try {
      await k.auth.api.signInMagicLink({
        body: { email: r.eposta, callbackURL: "/kurulum" },
        headers: istek.headers,
      });
    } catch {
      // Kurum açıldı; giriş bağlantısı gönderilemediyse kullanıcı giriş sayfasından isteyebilir.
      girisGonderildi = false;
    }
    return { durum: 201, govde: { tamam: true, kurumAdi: r.kurumAdi, girisGonderildi } };
  } catch (e) {
    return servisYaniti(e);
  }
}

export const HocaDaveti = z
  .object({
    programId: z.uuid(),
    hocalar: z
      .array(
        z
          .object({
            adSoyad: z.string().trim().min(3, "Adı ve soyadı yazın.").max(200),
            eposta: z.string().trim().toLowerCase().pipe(z.email("Geçerli bir e-posta adresi yazın.")),
          })
          .strict(),
      )
      .min(1, "En az bir kişi ekleyin.")
      .max(300),
  })
  .strict();

export interface DavetRaporu {
  gonderilen: number;
  hatalar: { eposta: string; ileti: string }[];
}

/**
 * Hocaları program kapsamında öğretim elemanı olarak davet eder ve davet e-postasını gönderir. Ad ve e-posta
 * yöneticiden gelir; Bologna'daki adlardan e-posta üretilmez.
 */
export async function hocalariDavetEt(k: KimlikSunucusu, b: IstekBaglami, ham: unknown): Promise<DavetRaporu> {
  const g = HocaDaveti.parse(ham);
  const { kurumAdi, davetEden } = await adlar(k, b);
  const rapor: DavetRaporu = { gonderilen: 0, hatalar: [] };
  const gorulen = new Set<string>();
  for (const h of g.hocalar) {
    if (gorulen.has(h.eposta)) continue;
    gorulen.add(h.eposta);
    try {
      const d = await davetOlustur(k, b, {
        adSoyad: h.adSoyad,
        eposta: h.eposta,
        rol: "ogretim_elemani",
        kapsam: { tur: "program", id: g.programId },
      });
      await k.eposta.davet(h.eposta, {
        kurumAdi,
        davetEden,
        baglanti: d.baglanti,
      });
      rapor.gonderilen++;
    } catch (e) {
      rapor.hatalar.push({
        eposta: h.eposta,
        ileti: e instanceof ErisimHatasi ? e.message : "Davet gönderilemedi. Biraz sonra yeniden deneyin.",
      });
    }
  }
  return rapor;
}

async function adlar(k: KimlikSunucusu, b: IstekBaglami): Promise<{ kurumAdi: string; davetEden: string }> {
  return kiraciIslemi(k.db, b.kisi.kurumId, async (tx) => {
    const [kurum] = await tx.select({ ad: sema.kurum.ad }).from(sema.kurum).where(eq(sema.kurum.id, b.kisi.kurumId));
    const [kisi] = await tx.select({ ad: sema.kisi.adSoyad }).from(sema.kisi).where(eq(sema.kisi.id, b.kisi.kisiId));
    return { kurumAdi: kurum?.ad ?? "Kurumunuz", davetEden: kisi?.ad ?? "Kurum yöneticiniz" };
  });
}
