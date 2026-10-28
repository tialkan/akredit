// Self-servis kurum açılışı (İP-35).
//
// Akış: (1) başvuru: kurum adı, kurumsal e-posta alan adı, ilk yöneticinin adı ve e-postası. E-posta, beyan
// edilen alan adında (ya da onun alt alan adında) olmalı; genel e-posta hizmetleri kabul edilmez.
// (2) Yöneticinin kurumsal e-postasına tek kullanımlık doğrulama bağlantısı gider (30 dakika).
// (3) Bağlantı açılınca kurum, ilk yönetici kişisi, kurum yöneticisi rolü ve giriş üyeliği tek işlemde oluşur.
//
// Kötüye kullanım: aynı ağ izinden saatte en çok 5, aynı alan adına saatte en çok 3 başvuru; sayaç
// veritabanındadır (süreç yeniden başlayınca sıfırlanmaz). Aynı alan adına (ya da üst/alt alan adına) ikinci
// kurum açılamaz. Belirtecin yalnız SHA-256 özeti saklanır; IP adresi saklanmaz.

import { randomBytes, randomUUID } from "node:crypto";
import { ozetHesapla } from "@akredit/cekirdek";
import { gunlugeYaz, sema, type Vt } from "@akredit/vt";
import { and, eq, gte, isNotNull, sql } from "drizzle-orm";
import { z } from "zod";
import { ServisHatasi } from "./hata.ts";

export const ACILIS_SURESI_MS = 30 * 60_000;
export const AG_SINIRI_SAATLIK = 5;
export const ALAN_SINIRI_SAATLIK = 3;

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

const ALAN_ADI = /^(?=.{4,200}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/u;

export const AcilisGirdisi = z
  .object({
    kurumAdi: z.string().trim().min(3, "Kurumun adını yazın.").max(200, "Kurum adı çok uzun."),
    alanAdi: z
      .string()
      .trim()
      .toLowerCase()
      .transform((x) =>
        x
          .replace(/^@/u, "")
          .replace(/^https?:\/\//u, "")
          .replace(/\/.*$/u, ""),
      )
      .pipe(z.string().regex(ALAN_ADI, "Alan adını ornek.edu.tr biçiminde yazın.")),
    yoneticiAdi: z.string().trim().min(3, "Adınızı ve soyadınızı yazın.").max(200),
    eposta: z.string().trim().toLowerCase().pipe(z.email("Geçerli bir e-posta adresi yazın.")),
  })
  .strict();
export type AcilisGirdisi = z.input<typeof AcilisGirdisi>;

/** E-postanın alan adı beyan edilen alan adıyla eşleşiyor mu? Sorun varsa kullanıcıya gösterilecek ileti. */
export function alanAdiSorunu(alanAdi: string, eposta: string): string | null {
  if (GENEL_EPOSTA.has(alanAdi))
    return "Genel e-posta hizmetleriyle kurum açılamaz. Kurumunuzun e-posta alan adını yazın.";
  const alan = eposta.split("@")[1] ?? "";
  if (alan !== alanAdi && !alan.endsWith(`.${alanAdi}`))
    return `Yönetici e-postası ${alanAdi} alan adında olmalı. Kurumsal e-posta adresinizi yazın.`;
  return null;
}

/** İki alan adı aynı kurumu mu gösteriyor (eşit ya da biri ötekinin alt alan adı)? */
export function alanAdlariCakisir(a: string, b: string): boolean {
  return a === b || a.endsWith(`.${b}`) || b.endsWith(`.${a}`);
}

async function alanAdiAlinmis(db: Vt, alanAdi: string): Promise<boolean> {
  const acik = await db
    .select({ alan: sema.kurumAcilisTalebi.alanAdi })
    .from(sema.kurumAcilisTalebi)
    .where(isNotNull(sema.kurumAcilisTalebi.acilanKurumId));
  return acik.some((x) => alanAdlariCakisir(x.alan, alanAdi));
}

const ALINMIS = "Bu alan adıyla açılmış bir kurum var. Kurumunuzun Akredit yöneticisinden davet isteyin.";

export interface BaslatSecenegi {
  simdi: Date;
  /** Tuzlu ağ izi (web katmanı hesaplar); hız sınırı için. */
  agIzi: string | null;
  rastgele?: (n: number) => Uint8Array;
}

/** Başvuruyu kaydeder ve doğrulama belirtecini döndürür (yalnız e-postayla gönderilir, saklanmaz). */
export async function acilisBaslat(
  db: Vt,
  girdi: unknown,
  s: BaslatSecenegi,
): Promise<{ talepId: string; belirtec: string; eposta: string; kurumAdi: string }> {
  const g = AcilisGirdisi.parse(girdi);
  const sorun = alanAdiSorunu(g.alanAdi, g.eposta);
  if (sorun) throw new ServisHatasi("gecersiz_istek", sorun, [{ alan: "eposta", ileti: sorun }]);
  const saatOnce = new Date(s.simdi.getTime() - 3600_000);
  const sayac = async (kosul: ReturnType<typeof eq>) =>
    (
      await db
        .select({ n: sql<number>`count(*)::int` })
        .from(sema.kurumAcilisTalebi)
        .where(and(kosul, gte(sema.kurumAcilisTalebi.olusturma, saatOnce)))
    )[0]?.n ?? 0;
  const COK = "Kısa sürede çok fazla başvuru yapıldı. Bir saat sonra yeniden deneyin.";
  if (s.agIzi && (await sayac(eq(sema.kurumAcilisTalebi.agIzi, s.agIzi))) >= AG_SINIRI_SAATLIK)
    throw new ServisHatasi("cok_fazla_istek", COK);
  if ((await sayac(eq(sema.kurumAcilisTalebi.alanAdi, g.alanAdi))) >= ALAN_SINIRI_SAATLIK)
    throw new ServisHatasi("cok_fazla_istek", COK);
  if (await alanAdiAlinmis(db, g.alanAdi)) throw new ServisHatasi("cakisma", ALINMIS);

  const ham = (s.rastgele ?? ((n: number) => randomBytes(n)))(32);
  const belirtec = Buffer.from(ham).toString("base64url");
  const [t] = await db
    .insert(sema.kurumAcilisTalebi)
    .values({
      kurumAdi: g.kurumAdi,
      alanAdi: g.alanAdi,
      yoneticiAdi: g.yoneticiAdi,
      eposta: g.eposta,
      belirtecOzeti: ozetHesapla(belirtec),
      agIzi: s.agIzi,
      sonGecerlilik: new Date(s.simdi.getTime() + ACILIS_SURESI_MS),
      olusturma: s.simdi,
    })
    .returning({ id: sema.kurumAcilisTalebi.id });
  if (!t) throw new Error("Başvuru kaydedilemedi.");
  return { talepId: t.id, belirtec, eposta: g.eposta, kurumAdi: g.kurumAdi };
}

export interface AcilisSonucu {
  kurumId: string;
  kisiId: string;
  eposta: string;
  kurumAdi: string;
}

const GECERSIZ = "Doğrulama bağlantısı geçersiz ya da süresi doldu. Başvuruyu yeniden yapın.";

/**
 * Doğrulama bağlantısıyla kurumu açar. Tek işlemde: talep işaretlenir, kurum (`kurum_olustur`), ilk yönetici
 * kişisi, kurum yöneticisi rolü, günlük kaydı ve giriş üyeliği oluşur. Belirteç bir kez kullanılabilir.
 */
export async function acilisTamamla(db: Vt, belirtec: string, s: { simdi: Date }): Promise<AcilisSonucu> {
  if (!/^[A-Za-z0-9_-]{20,100}$/u.test(belirtec)) throw new ServisHatasi("bulunamadi", GECERSIZ);
  const ozet = ozetHesapla(belirtec);
  try {
    return await db.transaction(async (tx) => {
      const [t] = await tx
        .select()
        .from(sema.kurumAcilisTalebi)
        .where(eq(sema.kurumAcilisTalebi.belirtecOzeti, ozet))
        .for("update");
      if (!t || t.dogrulama || t.sonGecerlilik.getTime() <= s.simdi.getTime())
        throw new ServisHatasi("bulunamadi", GECERSIZ);
      const acik = await tx
        .select({ alan: sema.kurumAcilisTalebi.alanAdi })
        .from(sema.kurumAcilisTalebi)
        .where(isNotNull(sema.kurumAcilisTalebi.acilanKurumId));
      if (acik.some((x) => alanAdlariCakisir(x.alan, t.alanAdi))) throw new ServisHatasi("cakisma", ALINMIS);

      const kurumId = randomUUID();
      await tx
        .update(sema.kurumAcilisTalebi)
        .set({ dogrulama: s.simdi, acilanKurumId: kurumId })
        .where(eq(sema.kurumAcilisTalebi.id, t.id));
      await tx.execute(sql`select kurum_olustur(${kurumId}::uuid, ${t.kurumAdi}, ${t.alanAdi})`);

      // Kiracı verisi uygulama rolüyle yazılır (satır güvenliği altında).
      await tx.execute(sql`select set_config('app.kurum_id', ${kurumId}, true)`);
      await tx.execute(sql.raw("set local role akredit_uygulama"));
      const [kisi] = await tx
        .insert(sema.kisi)
        .values({ kurumId, adSoyad: t.yoneticiAdi, eposta: t.eposta })
        .returning({ id: sema.kisi.id });
      if (!kisi) throw new Error("Yönetici eklenemedi.");
      await tx.insert(sema.rolAtamasi).values({
        kurumId,
        kisiId: kisi.id,
        rol: "kurum_yoneticisi",
        kapsamTuru: "kurum",
        kapsamId: kurumId,
        baslangic: s.simdi,
      });
      await gunlugeYaz(tx, {
        aktor: { tur: "kisi", id: kisi.id },
        eylem: "kurum.acildi",
        hedef: { tur: "kurum", id: kurumId },
        ayrinti: { alanAdi: t.alanAdi, yol: "self_servis" },
        zaman: s.simdi,
      });
      await tx.execute(sql.raw("reset role"));
      await tx.insert(sema.kimlikUyelik).values({ eposta: t.eposta, bagliKurumId: kurumId, kisiId: kisi.id });
      return { kurumId, kisiId: kisi.id, eposta: t.eposta, kurumAdi: t.kurumAdi };
    });
  } catch (e) {
    if (e instanceof ServisHatasi) throw e;
    const kod = (e as { cause?: { code?: string }; code?: string })?.cause?.code ?? (e as { code?: string })?.code;
    if (kod === "23505") throw new ServisHatasi("cakisma", ALINMIS);
    throw e;
  }
}
