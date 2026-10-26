// Nesne deposu sözleşmesi. Anahtar içerik adreslidir: `kurumId/ozet` (ozet = SHA-256, küçük harf onaltılık).
// Depo üzerine yazmaz ve silmez: aynı anahtar ikinci kez gelirse içerik doğrulanır, yazılmaz.

import { createHmac, timingSafeEqual } from "node:crypto";
import { ozetHesapla } from "@akredit/cekirdek";

export interface KoyulanNesne {
  anahtar: string;
  ozet: string;
  boyut: number;
  /** Nesne bu çağrıyla mı yazıldı (false: zaten vardı). */
  yeni: boolean;
}

export interface NesneDeposu {
  readonly ad: string;
  /** Sürücü nesne kilidini (WORM) destekliyor ve uyguluyor mu? */
  readonly kilitli: boolean;
  koy(kurumId: string, veri: Uint8Array, secenek?: { mime?: string }): Promise<KoyulanNesne>;
  al(anahtar: string): Promise<Uint8Array>;
  varMi(anahtar: string): Promise<boolean>;
  /** Süreli indirme bağlantısı. `simdi` saniye cinsinden UNIX zamanı. */
  baglanti(anahtar: string, sureSn: number, simdi?: number): Promise<string>;
}

export class DepoHatasi extends Error {
  constructor(ileti: string) {
    super(ileti);
    this.name = "DepoHatasi";
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const OZET = /^[0-9a-f]{64}$/u;

/** İçerik adresli anahtar: `kurumId/ozet`. */
export function nesneAnahtari(kurumId: string, ozet: string): string {
  if (!UUID.test(kurumId)) throw new DepoHatasi("Kurum kimliği geçerli değil.");
  if (!OZET.test(ozet)) throw new DepoHatasi("Dosya özeti geçerli değil.");
  return `${kurumId.toLowerCase()}/${ozet}`;
}

/** Anahtarı ayrıştırır; biçim dışı anahtarı (yol gezinme dahil) reddeder. */
export function anahtarCoz(anahtar: string): { kurumId: string; ozet: string } {
  const [kurumId, ozet, fazla] = anahtar.split("/");
  if (fazla !== undefined || !kurumId || !ozet || !UUID.test(kurumId) || !OZET.test(ozet))
    throw new DepoHatasi("Dosya anahtarı geçerli değil.");
  return { kurumId, ozet };
}

/** Okunan içeriğin anahtardaki özetle uyuştuğunu denetler (bozulma ya da kurcalama). */
export function butunlukDenetle(anahtar: string, veri: Uint8Array): void {
  if (ozetHesapla(veri) !== anahtarCoz(anahtar).ozet)
    throw new DepoHatasi("Saklanan dosya bozulmuş görünüyor. Yöneticinize bildirin.");
}

// ---------- Uygulamanın kendi imzalı bağlantısı (yerel ve bellek sürücüleri) ----------

function imza(anahtar: string, bitis: number, gizli: string): string {
  return createHmac("sha256", gizli).update(`${anahtar}\n${bitis}`).digest("hex");
}

/** `onEk?a=<anahtar>&b=<bitiş>&i=<imza>` biçiminde bağlantı üretir. */
export function imzaliBaglantiUret(onEk: string, anahtar: string, bitis: number, gizli: string): string {
  anahtarCoz(anahtar);
  const q = new URLSearchParams({ a: anahtar, b: String(bitis), i: imza(anahtar, bitis, gizli) });
  return `${onEk}?${q.toString()}`;
}

/** Bağlantıdaki imzayı ve süreyi doğrular; geçerliyse anahtarı döndürür. */
export function imzaliBaglantiDogrula(adres: string, gizli: string, simdi: number): string {
  const q = new URL(adres, "http://yerel").searchParams;
  const anahtar = q.get("a") ?? "";
  const bitis = Number(q.get("b"));
  const verilen = q.get("i") ?? "";
  anahtarCoz(anahtar);
  const beklenen = imza(anahtar, bitis, gizli);
  const a = Buffer.from(verilen, "utf8");
  const b = Buffer.from(beklenen, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) throw new DepoHatasi("İndirme bağlantısı geçersiz.");
  if (!Number.isFinite(bitis) || simdi > bitis)
    throw new DepoHatasi("İndirme bağlantısının süresi dolmuş. Sayfayı yenileyip yeniden deneyin.");
  return anahtar;
}

export function sureDenetle(sureSn: number): void {
  if (!Number.isInteger(sureSn) || sureSn <= 0 || sureSn > 7 * 24 * 3600)
    throw new DepoHatasi("Bağlantı süresi 1 saniye ile 7 gün arasında olmalı.");
}

export const simdiSn = () => Math.floor(Date.now() / 1000);
