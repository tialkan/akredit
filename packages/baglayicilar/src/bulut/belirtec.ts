// OAuth belirteçlerinin şifreli saklanması ve yenilenmesi.
// - Parola hiçbir bağlayıcıda alınmaz ya da saklanmaz; bulut ve e-posta yalnız OAuth ile bağlanır.
// - Belirteç AES-256-GCM ile şifrelenir. Anahtar, ana anahtardan kurum ve sağlayıcıya özgü HKDF ile türetilir;
//   kurum kimliği ve sağlayıcı ek doğrulanmış veri (AAD) olarak bağlanır, başka kuruma taşınan şifreli metin açılmaz.
// - Şifreli metin dışında hiçbir şey (belirteç, yenileme belirteci) günlüğe ya da hata iletisine girmez.

import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { z } from "zod";
import { BaglayiciHatasi, istek, sinirlayici } from "../avesis/istek.ts";
import type { DisBaglam } from "../baglayici.ts";

export type OAuthSaglayici = "google" | "microsoft";

export const BelirtecSemasi = z.object({
  erisim: z.string().min(1),
  yenileme: z.string().min(1).nullable(),
  /** Erişim belirtecinin bitiş zamanı (ISO). */
  bitis: z.string(),
  kapsam: z.string(),
});
export type Belirtec = z.infer<typeof BelirtecSemasi>;

export interface BelirtecKasasi {
  sifrele(b: Belirtec, kurumId: string, saglayici: OAuthSaglayici): string;
  coz(sifreli: string, kurumId: string, saglayici: OAuthSaglayici): Belirtec;
}

const b64 = (b: Uint8Array) => Buffer.from(b).toString("base64url");
const b64c = (s: string) => new Uint8Array(Buffer.from(s, "base64url"));

/**
 * Ana anahtarla (32 bayt, ortam değişkeninden ya da KMS'den; depoya girmez) kasa oluşturur.
 * `rastgele` testte belirlenimci IV vermek içindir.
 */
export function belirtecKasasi(
  anaAnahtar: Uint8Array,
  rastgele: (n: number) => Uint8Array = (n) => randomBytes(n),
): BelirtecKasasi {
  if (anaAnahtar.length !== 32) throw new Error("Ana anahtar 32 bayt olmalı.");
  const anahtar = (kurumId: string, s: OAuthSaglayici) =>
    new Uint8Array(hkdfSync("sha256", anaAnahtar, new TextEncoder().encode(kurumId), `akredit-oauth-${s}`, 32));
  const aad = (kurumId: string, s: OAuthSaglayici) => new TextEncoder().encode(`${kurumId}|${s}`);
  return {
    sifrele(b, kurumId, s) {
      const d = BelirtecSemasi.parse(b);
      const iv = rastgele(12);
      const c = createCipheriv("aes-256-gcm", anahtar(kurumId, s), iv);
      c.setAAD(aad(kurumId, s));
      const ct = Buffer.concat([c.update(JSON.stringify(d), "utf8"), c.final()]);
      return `v1.${b64(iv)}.${b64(c.getAuthTag())}.${b64(ct)}`;
    },
    coz(sifreli, kurumId, s) {
      const p = sifreli.split(".");
      if (p.length !== 4 || p[0] !== "v1")
        throw new BaglayiciHatasi("Bağlantı bilgisi okunamadı; hesabı yeniden bağlayın.");
      try {
        const dc = createDecipheriv("aes-256-gcm", anahtar(kurumId, s), b64c(p[1] ?? ""));
        dc.setAAD(aad(kurumId, s));
        dc.setAuthTag(b64c(p[2] ?? ""));
        const acik = Buffer.concat([dc.update(b64c(p[3] ?? "")), dc.final()]).toString("utf8");
        return BelirtecSemasi.parse(JSON.parse(acik));
      } catch {
        throw new BaglayiciHatasi("Bağlantı bilgisi okunamadı; hesabı yeniden bağlayın.");
      }
    },
  };
}

export const TOKEN_ADRESI: Record<OAuthSaglayici, string> = {
  google: "https://oauth2.googleapis.com/token",
  microsoft: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
};

const TokenYanitiSemasi = z.object({
  access_token: z.string().min(1),
  refresh_token: z.string().min(1).optional(),
  expires_in: z.number().int().positive(),
  scope: z.string().optional(),
});

export interface IstemciBilgisi {
  istemciKimligi: string;
  /** Uygulamanın istemci sırrı; ortamdan gelir, depoya ve günlüğe girmez. */
  istemciSirri: string;
}

/**
 * Süresi dolmak üzere olan (60 sn pay) belirteci yeniler ve yeni şifreli metni döndürür.
 * Yenilenmesi gerekmiyorsa aynı metin döner. Sağlayıcı yeni yenileme belirteci vermezse eskisi korunur.
 */
export async function gecerliBelirtec(
  kasa: BelirtecKasasi,
  sifreli: string,
  kurumId: string,
  saglayici: OAuthSaglayici,
  istemci: IstemciBilgisi,
  baglam: DisBaglam,
): Promise<{ belirtec: Belirtec; sifreli: string; yenilendi: boolean }> {
  const b = kasa.coz(sifreli, kurumId, saglayici);
  const simdi = baglam.simdi().getTime();
  if (Date.parse(b.bitis) - 60_000 > simdi) return { belirtec: b, sifreli, yenilendi: false };
  if (!b.yenileme) throw new BaglayiciHatasi("Bağlantının süresi doldu; hesabı yeniden bağlayın.");
  const govde = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: b.yenileme,
    client_id: istemci.istemciKimligi,
    client_secret: istemci.istemciSirri,
  }).toString();
  let y: Response;
  try {
    y = await istek(baglam, sinirlayici(baglam, 0), TOKEN_ADRESI[saglayici], {
      yontem: "POST",
      govde,
      basliklar: { "content-type": "application/x-www-form-urlencoded" },
    });
  } catch {
    throw new BaglayiciHatasi("Bağlantı yenilenemedi; hesabı yeniden bağlayın.");
  }
  const t = TokenYanitiSemasi.safeParse(await y.json().catch(() => null));
  if (!t.success) throw new BaglayiciHatasi("Bağlantı yenilenemedi; hesabı yeniden bağlayın.");
  const yeni: Belirtec = {
    erisim: t.data.access_token,
    yenileme: t.data.refresh_token ?? b.yenileme,
    bitis: new Date(simdi + t.data.expires_in * 1000).toISOString(),
    kapsam: t.data.scope ?? b.kapsam,
  };
  return { belirtec: yeni, sifreli: kasa.sifrele(yeni, kurumId, saglayici), yenilendi: true };
}
