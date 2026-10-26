// API anahtarları ve davet belirteçleri. Gizli değer yalnız bir kez kullanıcıya gösterilir;
// saklanan yalnız SHA-256 özetidir. Rastgelelik ve zaman parametre olarak verilir.

import { ozetHesapla } from "@akredit/cekirdek";
import { EYLEMLER, type Eylem, KURUM_DUZEYI_EYLEMLER } from "./matris.ts";

const ALFABE = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/** Baytları 62'lik alfabeyle metne çevirir (yanlılık önemsiz: 256 % 62 küçük, en az 32 bayt kullanılır). */
function metneCevir(baytlar: Uint8Array): string {
  let s = "";
  for (const b of baytlar) s += ALFABE[b % ALFABE.length];
  return s;
}

/** API anahtarı biçimi: `akr_<önek 8>_<gizli 40>`. */
export const API_ANAHTARI_DESENI = /^akr_([A-Za-z0-9]{8})_([A-Za-z0-9]{40})$/u;
/** Bir API anahtarının en uzun geçerlilik süresi: 365 gün. */
export const API_ANAHTARI_AZAMI_SURE_MS = 365 * 24 * 60 * 60 * 1000;

export interface UretilenAnahtar {
  /** Kullanıcıya bir kez gösterilecek tam anahtar. Saklanmaz, günlüğe yazılmaz. */
  anahtar: string;
  /** Aramada kullanılan, gizli olmayan önek. */
  onek: string;
  /** Saklanan SHA-256 özeti. */
  ozet: string;
}

/** 48 rastgele bayttan API anahtarı üretir. */
export function apiAnahtariUret(rastgele: Uint8Array): UretilenAnahtar {
  if (rastgele.length < 48) throw new RangeError("API anahtarı için en az 48 rastgele bayt gerekir.");
  const onek = metneCevir(rastgele.subarray(0, 8));
  const gizli = metneCevir(rastgele.subarray(8, 48));
  const anahtar = `akr_${onek}_${gizli}`;
  return { anahtar, onek, ozet: ozetHesapla(anahtar) };
}

/** Anahtar metnini ayrıştırır; biçim tutmazsa null. */
export function apiAnahtariAyristir(metin: string): { onek: string; ozet: string } | null {
  const m = API_ANAHTARI_DESENI.exec(metin.trim());
  if (!m?.[1]) return null;
  return { onek: m[1], ozet: ozetHesapla(metin.trim()) };
}

/** Saklanan API anahtarı kaydı (vt `kimlik_api_anahtari`). */
export interface ApiAnahtariKaydi {
  id: string;
  kurumId: string;
  /** Anahtarın adına çalıştığı kişi. Yetkiler bu kişinin rolleriyle kesişir. */
  kisiId: string;
  onek: string;
  ozet: string;
  kapsam: readonly Eylem[];
  bitis: Date;
  iptal: Date | null;
}

export type AnahtarDogrulama = { gecerli: true; kayit: ApiAnahtariKaydi } | { gecerli: false; neden: string };

/** Sabit süreli metin karşılaştırma (özetler aynı uzunlukta). */
function esit(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let fark = 0;
  for (let i = 0; i < a.length; i++) fark |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return fark === 0;
}

/** Sunulan anahtarı kayda karşı doğrular: özet, iptal ve süre. */
export function apiAnahtariDogrula(metin: string, kayit: ApiAnahtariKaydi | null, simdi: Date): AnahtarDogrulama {
  const a = apiAnahtariAyristir(metin);
  if (!a || !kayit || kayit.onek !== a.onek || !esit(kayit.ozet, a.ozet))
    return { gecerli: false, neden: "Anahtar tanınmadı." };
  if (kayit.iptal && kayit.iptal.getTime() <= simdi.getTime())
    return { gecerli: false, neden: "Anahtar iptal edilmiş." };
  if (kayit.bitis.getTime() <= simdi.getTime()) return { gecerli: false, neden: "Anahtarın süresi dolmuş." };
  return { gecerli: true, kayit };
}

/** Yeni anahtar talebini denetler: kapsam boş olamaz, bilinen eylemler, kurum düzeyi yönetim eylemleri verilmez. */
export function apiAnahtariTalebiDenetle(
  kapsam: readonly string[],
  baslangic: Date,
  bitis: Date,
): { tamam: true; kapsam: Eylem[] } | { tamam: false; neden: string } {
  if (kapsam.length === 0) return { tamam: false, neden: "Anahtar için en az bir izin seçin." };
  const bilinen = new Set<string>(EYLEMLER);
  for (const e of kapsam) if (!bilinen.has(e)) return { tamam: false, neden: "Tanınmayan bir izin seçildi." };
  const eylemler = [...new Set(kapsam)] as Eylem[];
  if (eylemler.some((e) => KURUM_DUZEYI_EYLEMLER.has(e)))
    return { tamam: false, neden: "Kurum yönetimi, beyan ve dış gönderim izinleri anahtara verilemez." };
  if (eylemler.includes("karar.ver"))
    return { tamam: false, neden: "Onay kararı anahtarla verilemez; onay kişinin kendisi tarafından verilir." };
  const sure = bitis.getTime() - baslangic.getTime();
  if (sure <= 0) return { tamam: false, neden: "Bitiş tarihi bugünden sonra olmalı." };
  if (sure > API_ANAHTARI_AZAMI_SURE_MS) return { tamam: false, neden: "Anahtar en çok bir yıl geçerli olabilir." };
  return { tamam: true, kapsam: eylemler };
}

/** Davet belirteci: 32 rastgele bayttan; saklanan yalnız özetidir. */
export function davetBelirteciUret(rastgele: Uint8Array): { belirtec: string; ozet: string } {
  if (rastgele.length < 32) throw new RangeError("Davet belirteci için en az 32 rastgele bayt gerekir.");
  const belirtec = metneCevir(rastgele.subarray(0, 32));
  return { belirtec, ozet: ozetHesapla(belirtec) };
}

/** Davet geçerliliği: 7 gün. */
export const DAVET_SURESI_MS = 7 * 24 * 60 * 60 * 1000;
