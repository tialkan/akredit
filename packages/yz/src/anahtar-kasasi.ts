// Kurumun getirdiği yapay zekâ hizmeti anahtarının (BYOK) şifreli saklanması.
// - Anahtar AES-256-GCM ile şifrelenir. Şifreleme anahtarı, sunucudaki ana anahtardan kuruma özgü HKDF ile
//   türetilir; kurum kimliği ek doğrulanmış veri (AAD) olarak bağlanır. Başka kuruma taşınan şifreli metin açılmaz.
// - Açık anahtar yalnız sağlayıcı çağrısı anında, sunucuda çözülür. İstemciye yalnız son dört karakteri gider.
// - Anahtar, şifreli metni dışında hiçbir yere (günlük, hata iletisi) yazılmaz.

import { createCipheriv, createDecipheriv, createHash, hkdfSync, randomBytes } from "node:crypto";
import { YzHatasi } from "./saglayici.ts";

export interface SaglayiciAnahtarKasasi {
  sifrele(anahtar: string, kurumId: string): string;
  coz(sifreli: string, kurumId: string): string;
}

const b64 = (b: Uint8Array) => Buffer.from(b).toString("base64url");
const b64c = (s: string) => new Uint8Array(Buffer.from(s, "base64url"));
const OKUNAMADI = "Kayıtlı anahtar okunamadı. Anahtarı yeniden girin.";

/** Ana anahtar 32 bayttır; ortam değişkeninden ya da KMS'den gelir, depoya girmez. */
export function saglayiciAnahtarKasasi(
  anaAnahtar: Uint8Array,
  rastgele: (n: number) => Uint8Array = (n) => randomBytes(n),
): SaglayiciAnahtarKasasi {
  if (anaAnahtar.length !== 32) throw new Error("Ana anahtar 32 bayt olmalı.");
  const turet = (kurumId: string) =>
    new Uint8Array(hkdfSync("sha256", anaAnahtar, new TextEncoder().encode(kurumId), "akredit-yz-anahtari", 32));
  const aad = (kurumId: string) => new TextEncoder().encode(`${kurumId}|yz`);
  return {
    sifrele(anahtar, kurumId) {
      const iv = rastgele(12);
      const c = createCipheriv("aes-256-gcm", turet(kurumId), iv);
      c.setAAD(aad(kurumId));
      const ct = Buffer.concat([c.update(anahtar, "utf8"), c.final()]);
      return `v1.${b64(iv)}.${b64(c.getAuthTag())}.${b64(ct)}`;
    },
    coz(sifreli, kurumId) {
      const p = sifreli.split(".");
      if (p.length !== 4 || p[0] !== "v1") throw new YzHatasi("anahtar", OKUNAMADI);
      try {
        const dc = createDecipheriv("aes-256-gcm", turet(kurumId), b64c(p[1] ?? ""));
        dc.setAAD(aad(kurumId));
        dc.setAuthTag(b64c(p[2] ?? ""));
        return Buffer.concat([dc.update(b64c(p[3] ?? "")), dc.final()]).toString("utf8");
      } catch {
        throw new YzHatasi("anahtar", OKUNAMADI);
      }
    },
  };
}

/**
 * `AKREDIT_ANAHTAR_KASASI` (base64, 32 bayt) ortam değişkeninden kasa kurar. Değişken yoksa ya da bozuksa
 * `null` döner; çağıran anahtar kaydını açık bir hatayla reddeder, sessizce düz metin saklamaz.
 */
export function ortamdanAnahtarKasasi(ortam: Record<string, string | undefined>): SaglayiciAnahtarKasasi | null {
  const ham = ortam.AKREDIT_ANAHTAR_KASASI;
  if (!ham) return null;
  const bayt = anahtarBaytlari(ham);
  if (!bayt) return null;
  return saglayiciAnahtarKasasi(bayt);
}

/**
 * Ortamdan gelen gizli değeri 32 baytlık anahtara çevirir. 32 baytlık base64 ise olduğu gibi kullanılır.
 * Değilse ve en az 32 karakterse (ör. Coolify'ın ürettiği rastgele değer) SHA-256 ile 32 bayta indirgenir.
 * Daha kısa değer reddedilir (null).
 */
export function anahtarBaytlari(ham: string): Uint8Array | null {
  const deger = ham.trim();
  if (/^[A-Za-z0-9+/]{43}=$/.test(deger)) {
    const b = Buffer.from(deger, "base64");
    if (b.length === 32) return new Uint8Array(b);
  }
  if (deger.length < 32) return null;
  return new Uint8Array(createHash("sha256").update(deger, "utf8").digest());
}

/** Ekranda gösterilecek kısa iz: yalnız son dört karakter. */
export function anahtarIzi(anahtar: string): string {
  return anahtar.trim().slice(-4);
}

/** OpenRouter anahtarı `sk-or-` ile başlar. Biçim denetimi yalnız yazım hatasını yakalar; geçerliliği bağlantı denemesi söyler. */
export function openrouterAnahtariBicimi(anahtar: string): boolean {
  return /^sk-or-[A-Za-z0-9_-]{16,200}$/.test(anahtar.trim());
}
