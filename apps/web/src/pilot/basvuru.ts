// Pilot kurum başvurusu (İP-42). Kontrol listesi madde 59-63: sunucuda şema doğrulaması, köken (Origin)
// denetimi, hız sınırı, bal küpü alanı, gönderim süresi denetimi, e-posta başlık enjeksiyonuna karşı satır sonu
// temizliği. Başvuru veritabanına yalnız eklenir. SMTP ve alıcı tanımlıysa kurucuya bildirim gider; tanımlı
// değilse başvuru yine kaydedilir, "alındı" döner ve sunucu günlüğüne uyarı yazılır.

import type { EpostaTasiyici } from "@akredit/surec";
import { type SorguSonucu, satirlar, type Vt } from "@akredit/vt";
import { agParmakIzi } from "@akredit/yetki";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { PILOT_ROLLERI, PILOT_SURECLERI } from "../site/icerik.ts";

/** Formun açılıp gönderilmesi arasında en az bu kadar süre geçmeli (bot denetimi). */
export const EN_AZ_DOLDURMA_MS = 3000;
/** Aynı ağ izinden bir saatte en çok bu kadar başvuru. */
export const AG_SINIRI_SAATLIK = 5;
/** Aynı e-postadan bir günde en çok bu kadar başvuru. */
export const EPOSTA_SINIRI_GUNLUK = 3;

/** Kurumsal sayılmayan, herkese açık e-posta hizmetleri. */
const GENEL_EPOSTA = new Set([
  "gmail.com",
  "googlemail.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "msn.com",
  "yahoo.com",
  "yandex.com",
  "yandex.com.tr",
  "icloud.com",
  "me.com",
  "proton.me",
  "protonmail.com",
  "gmx.com",
  "mail.com",
  "aol.com",
  "mynet.com",
]);

/** Tek satırlık alan: denetim karakteri (satır sonu dahil) içeremez. */
const tekSatir = (ad: string, enAz: number, enCok: number) =>
  z
    .string()
    .trim()
    .min(enAz, `${ad} yazın.`)
    .max(enCok, `${ad} çok uzun.`)
    .refine((x) => !/\p{Cc}/u.test(x), `${ad} tek satır olmalı.`);

const degerler = <T extends readonly { deger: string }[]>(l: T) =>
  l.map((x) => x.deger) as unknown as [T[number]["deger"], ...T[number]["deger"][]];

export const PilotGirdisi = z
  .object({
    kurum: tekSatir("Kurumun adını", 3, 200),
    birim: tekSatir("Birimin adını", 2, 200),
    rol: z.enum(degerler(PILOT_ROLLERI), "Rolünüzü seçin."),
    eposta: z
      .string()
      .trim()
      .toLowerCase()
      .pipe(z.email("Geçerli bir e-posta adresi yazın."))
      .refine(
        (e) => !GENEL_EPOSTA.has(e.split("@")[1] ?? ""),
        "Kurumsal e-posta adresinizi yazın. Genel e-posta hizmetleri kabul edilmez.",
      ),
    surec: z.enum(degerler(PILOT_SURECLERI), "Başlamak istediğiniz süreci seçin."),
    aciklama: z.string().trim().max(1000, "Not en çok 1000 karakter olabilir.").optional(),
    kvkk: z.literal(true, "Devam etmek için bilgilendirmeyi onaylayın."),
    /** Bal küpü: gerçek kullanıcı görmez, boş kalmalı. */
    webSitesi: z.string().max(500).optional(),
    /** Formun açıldığı an (ms). */
    acilis: z.number().int().nonnegative(),
  })
  .strict();
export type PilotGirdisi = z.input<typeof PilotGirdisi>;

export interface PilotOrtami {
  db: Vt;
  simdi: () => Date;
  /** Sitenin adresi; köken denetimi bununla yapılır. */
  temelAdres: string;
  izinliKokenler: string[];
  /** Ağ izini tuzlayan gizli değer. */
  gizli: string;
  /** SMTP taşıyıcısı; yoksa bildirim gönderilmez. */
  tasiyici: EpostaTasiyici | null;
  /** Bildirimin gideceği adres (AKREDIT_PILOT_ALICI). */
  alici: string | null;
  uyar: (ileti: string) => void;
}

export type PilotYaniti = { durum: number; govde: Record<string, unknown> };

const ALINDI: PilotYaniti = { durum: 201, govde: { tamam: true } };

function kokenGecerli(o: PilotOrtami, istek: Request): boolean {
  const koken = istek.headers.get("origin");
  if (!koken) return false;
  return koken === new URL(o.temelAdres).origin || o.izinliKokenler.includes(koken);
}

function istemciIp(istek: Request): string | null {
  // Güvenilir vekil (Coolify) `x-real-ip` yazar; `x-forwarded-for` ilk değeri istemci tarafından yazılabilir.
  return istek.headers.get("x-real-ip") ?? istek.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ?? null;
}

async function sayi(db: Vt, sorgu: ReturnType<typeof sql>): Promise<number> {
  const s = satirlar((await db.execute(sorgu)) as unknown as SorguSonucu<{ n: number }>);
  return Number(s[0]?.n ?? 0);
}

const ad = (l: readonly { deger: string; ad: string }[], d: string) => l.find((x) => x.deger === d)?.ad ?? d;

/** Bildirim metni. Konu sabittir; kullanıcı girdisi yalnız gövdeye, tek satırlık alanlar temizlenmiş olarak girer. */
export function bildirimMetni(g: z.output<typeof PilotGirdisi>, zaman: Date): { konu: string; metin: string } {
  return {
    konu: "Akredit: yeni pilot başvurusu",
    metin: [
      "akredit.org üzerinden yeni bir pilot başvurusu geldi.",
      "",
      `Kurum: ${g.kurum}`,
      `Birim: ${g.birim}`,
      `Rol: ${ad(PILOT_ROLLERI, g.rol)}`,
      `E-posta: ${g.eposta}`,
      `Süreç: ${ad(PILOT_SURECLERI, g.surec)}`,
      `Not: ${g.aciklama ? g.aciklama : "yok"}`,
      `Zaman: ${zaman.toISOString()}`,
      "",
      "Başvuru veritabanında kayıtlıdır.",
    ].join("\n"),
  };
}

/** Pilot başvurusunu işler: denetler, kaydeder, varsa bildirim gönderir. */
export async function pilotBasvurusuIsle(o: PilotOrtami, istek: Request, ham: unknown): Promise<PilotYaniti> {
  if (!kokenGecerli(o, istek))
    return { durum: 403, govde: { hata: "İstek bu siteden gelmedi. Sayfayı yenileyip yeniden deneyin." } };
  const g = PilotGirdisi.safeParse(ham);
  if (!g.success) {
    const alanlar = g.error.issues.map((i) => ({ alan: i.path.join("."), ileti: i.message }));
    return { durum: 400, govde: { hata: "Bilgiler eksik ya da hatalı. Alanları düzeltip yeniden deneyin.", alanlar } };
  }
  const simdi = o.simdi();
  // Bal küpü dolu ya da form insan hızından hızlı gönderilmişse aynı yanıt döner, hiçbir şey yapılmaz.
  if (g.data.webSitesi || simdi.getTime() - g.data.acilis < EN_AZ_DOLDURMA_MS) return ALINDI;

  const agIzi = agParmakIzi(istemciIp(istek), o.gizli);
  const COK = { durum: 429, govde: { hata: "Kısa sürede çok fazla başvuru yapıldı. Bir saat sonra yeniden deneyin." } };
  const saatOnce = new Date(simdi.getTime() - 3600_000).toISOString();
  const gunOnce = new Date(simdi.getTime() - 86_400_000).toISOString();
  if (
    agIzi &&
    (await sayi(
      o.db,
      sql`select count(*)::int as n from pilot_basvurusu where ag_izi = ${agIzi} and olusturma >= ${saatOnce}::timestamptz`,
    )) >= AG_SINIRI_SAATLIK
  )
    return COK;
  if (
    (await sayi(
      o.db,
      sql`select count(*)::int as n from pilot_basvurusu where eposta = ${g.data.eposta} and olusturma >= ${gunOnce}::timestamptz`,
    )) >= EPOSTA_SINIRI_GUNLUK
  )
    return COK;

  try {
    await o.db.execute(sql`insert into pilot_basvurusu
      (kurum, birim, rol, eposta, surec, aciklama, kvkk_onayi, ag_izi, olusturma)
      values (${g.data.kurum}, ${g.data.birim}, ${g.data.rol}, ${g.data.eposta}, ${g.data.surec},
        ${g.data.aciklama || null}, ${simdi.toISOString()}::timestamptz, ${agIzi}, ${simdi.toISOString()}::timestamptz)`);
  } catch (e) {
    o.uyar(`Pilot başvurusu kaydedilemedi (${e instanceof Error ? e.name : "bilinmeyen"}).`);
    return { durum: 500, govde: { hata: "Başvuru kaydedilemedi. Biraz sonra yeniden deneyin." } };
  }

  if (!o.tasiyici || !o.alici) {
    // Kişisel veri günlüğe yazılmaz; yalnız yapılandırma eksikliği.
    o.uyar(
      "Pilot başvurusu kaydedildi ama bildirim gönderilmedi: AKREDIT_SMTP_SUNUCU ya da AKREDIT_PILOT_ALICI tanımlı değil.",
    );
    return ALINDI;
  }
  try {
    const b = bildirimMetni(g.data, simdi);
    await o.tasiyici.gonder({ alici: o.alici, konu: b.konu, metin: b.metin });
  } catch (e) {
    o.uyar(`Pilot başvurusu kaydedildi, bildirim gönderilemedi (${e instanceof Error ? e.name : "bilinmeyen"}).`);
  }
  return ALINDI;
}

/** Ortamdan bildirim alıcısı; geçersizse `null`. */
export function ortamdanPilotAlicisi(env: Record<string, string | undefined>): string | null {
  const a = env.AKREDIT_PILOT_ALICI?.trim();
  if (!a) return null;
  return z.email().safeParse(a).success ? a : null;
}
