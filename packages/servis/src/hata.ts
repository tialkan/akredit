// Servis hataları. İleti kullanıcıya gösterilir: Türkçe, sade, ne olduğunu ve ne yapılacağını söyler.

import type { z } from "zod";

export type HataKodu =
  | "gecersiz_istek"
  | "oturum_yok"
  | "yetki_yok"
  | "bulunamadi"
  | "cakisma"
  | "kural_ihlali"
  | "cok_fazla_istek"
  | "beklenmeyen";

const DURUM: Record<HataKodu, number> = {
  gecersiz_istek: 400,
  oturum_yok: 401,
  yetki_yok: 403,
  bulunamadi: 404,
  cakisma: 409,
  kural_ihlali: 422,
  cok_fazla_istek: 429,
  beklenmeyen: 500,
};

export interface AlanHatasi {
  alan: string;
  ileti: string;
}

export class ServisHatasi extends Error {
  readonly kod: HataKodu;
  readonly alanlar: AlanHatasi[];
  constructor(kod: HataKodu, ileti: string, alanlar: AlanHatasi[] = []) {
    super(ileti);
    this.kod = kod;
    this.alanlar = alanlar;
  }
  get durum(): number {
    return DURUM[this.kod];
  }
}

export const bulunamadi = () => new ServisHatasi("bulunamadi", "Aradığınız kayıt bulunamadı.");
export const yetkiYok = () =>
  new ServisHatasi("yetki_yok", "Bu işlem için yetkiniz yok. Gerekirse kalite komisyonuna başvurun.");

/** zod hatasını alan alan Türkçe bir servis hatasına çevirir. */
export function dogrulamaHatasi(e: z.ZodError): ServisHatasi {
  const alanlar = e.issues.map((i) => ({ alan: i.path.join(".") || "(gövde)", ileti: turkceIleti(i) }));
  return new ServisHatasi(
    "gecersiz_istek",
    "Gönderilen bilgiler eksik ya da hatalı. Alanları düzeltip yeniden deneyin.",
    alanlar,
  );
}

function turkceIleti(i: z.core.$ZodIssue): string {
  // Şemalarda kendi iletimiz varsa (Türkçe) onu kullan; yoksa türüne göre sade bir ileti.
  if (i.code === "custom" || /[çğıöşüÇĞİÖŞÜ]/u.test(i.message)) return i.message;
  switch (i.code) {
    case "invalid_type":
      return "Bu alan eksik ya da türü yanlış.";
    case "too_small":
      return "Değer çok kısa ya da çok küçük.";
    case "too_big":
      return "Değer çok uzun ya da çok büyük.";
    case "invalid_format":
      return "Biçimi geçersiz.";
    case "invalid_value":
      return "İzin verilen değerlerden biri olmalı.";
    case "unrecognized_keys":
      return "Tanınmayan alan var.";
    default:
      return "Değer geçersiz.";
  }
}

/** Veritabanı kısıt ihlallerini (tetikleyici iletileri Türkçedir) kural ihlaline çevirir. */
export function vtHatasiCevir(e: unknown): unknown {
  const kok = (e as { cause?: unknown })?.cause ?? e;
  const kod = (kok as { code?: string })?.code;
  const ileti = (kok as { message?: string })?.message;
  if (kod === "23514" && ileti) return new ServisHatasi("kural_ihlali", ileti);
  if (kod === "23505") return new ServisHatasi("cakisma", "Bu kayıt zaten var. Sayfayı yenileyip yeniden deneyin.");
  return e;
}
