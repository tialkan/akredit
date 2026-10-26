// Oturum güvenliği yardımcıları: çerez ayarları, CSRF denetimi, şüpheli giriş tespiti ve
// kimlik olaylarını günlüğe yazmadan önce giriş bilgisini ayıklama (değişmez ilke 8).

import { ozetHesapla } from "@akredit/cekirdek";

/** Oturum süresi: 8 saat; her 1 saatte bir kullanımda yenilenir; mutlak üst sınır 7 gün. */
export const OTURUM_SURESI_SN = 8 * 60 * 60;
export const OTURUM_YENILEME_SN = 60 * 60;
/** Sihirli bağlantının geçerlilik süresi: 10 dakika, tek kullanımlık. */
export const SIHIRLI_BAGLANTI_SURESI_SN = 10 * 60;

export interface CerezAyari {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax" | "strict";
  path: "/";
}

/** Oturum çerezi: her zaman HttpOnly; üretimde Secure ve `__Secure-` önekli. */
export function oturumCereziAyari(uretim: boolean): CerezAyari {
  return { httpOnly: true, secure: uretim, sameSite: "lax", path: "/" };
}

export interface CsrfIstegi {
  yontem: string;
  /** `Origin` başlığı; yoksa `Referer`'in kökeni. */
  koken: string | null;
  /** `Sec-Fetch-Site` başlığı (varsa). */
  fetchSite?: string | null;
  /** Bearer API anahtarıyla gelen istekler çerez taşımaz, CSRF denetimi gerekmez. */
  apiAnahtariyla?: boolean;
}

const GUVENLI_YONTEMLER = new Set(["GET", "HEAD", "OPTIONS"]);

/** Durum değiştiren çerezli isteklerde köken izinli kökenlerden biri olmalı. */
export function csrfDenetle(istek: CsrfIstegi, izinliKokenler: readonly string[]): boolean {
  if (GUVENLI_YONTEMLER.has(istek.yontem.toUpperCase())) return true;
  if (istek.apiAnahtariyla) return true;
  if (istek.fetchSite && istek.fetchSite !== "same-origin" && istek.fetchSite !== "none") return false;
  if (!istek.koken) return false;
  let koken: string;
  try {
    koken = new URL(istek.koken).origin;
  } catch {
    return false;
  }
  return izinliKokenler.some((k) => new URL(k).origin === koken);
}

/** IP adresinden kaba ağ parmak izi: IPv4'te /24, IPv6'da /48; adresin kendisi saklanmaz. */
export function agParmakIzi(ip: string | null | undefined, tuz: string): string | null {
  if (!ip) return null;
  const v4 = /^(?:::ffff:)?(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.\d{1,3}$/u.exec(ip);
  let ag: string;
  if (v4) ag = `${v4[1]}.${v4[2]}.${v4[3]}.0/24`;
  else if (ip.includes(":")) ag = `${ip.split(":").slice(0, 3).join(":")}::/48`;
  else return null;
  return ozetHesapla(`${tuz}|${ag}`).slice(0, 16);
}

/** Tarayıcı ailesi ve işletim sistemi (sürüm ayrıntısı olmadan). */
export function cihazParmakIzi(userAgent: string | null | undefined): string {
  const ua = userAgent ?? "";
  const tarayici = /Edg\//u.test(ua)
    ? "edge"
    : /Firefox\//u.test(ua)
      ? "firefox"
      : /Chrome\//u.test(ua)
        ? "chrome"
        : /Safari\//u.test(ua)
          ? "safari"
          : "diger";
  const isletim = /Windows/u.test(ua)
    ? "windows"
    : /Android/u.test(ua)
      ? "android"
      : /iPhone|iPad/u.test(ua)
        ? "ios"
        : /Mac OS X/u.test(ua)
          ? "macos"
          : /Linux/u.test(ua)
            ? "linux"
            : "diger";
  return `${tarayici}/${isletim}`;
}

export interface GirisIzi {
  ag: string | null;
  cihaz: string;
}

/**
 * Şüpheli giriş: daha önce giriş yapılmış bir hesapta hem ağ hem cihaz ilk kez görülüyorsa.
 * İlk giriş şüpheli sayılmaz (karşılaştıracak geçmiş yok).
 */
export function supheliGirisMi(onceki: readonly GirisIzi[], yeni: GirisIzi): boolean {
  if (onceki.length === 0) return false;
  const agBilinen = yeni.ag !== null && onceki.some((o) => o.ag === yeni.ag);
  const cihazBilinen = onceki.some((o) => o.cihaz === yeni.cihaz);
  return !agBilinen && !cihazBilinen;
}

/** Günlüğe ve modele girmemesi gereken anahtar adları. */
const GIZLI_ANAHTAR =
  /parola|sifre|password|passwd|token|belirtec|cookie|cerez|secret|gizli|otp|kod$|code|authorization|bearer|session|oturum|anahtar|key|assertion|samlresponse|state|verifier/iu;
/** Değer içinde görünebilecek giriş bilgisi kalıpları. */
const GIZLI_DEGER = [
  /akr_[A-Za-z0-9]{8}_[A-Za-z0-9]{40}/gu,
  /(?:token|code|state|SAMLResponse)=[^&\s"]+/giu,
  /Bearer\s+[A-Za-z0-9._~+/=-]+/giu,
  /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/gu,
];
export const GIZLENDI = "[gizlendi]";

/** Bir değerden giriş bilgisini ayıklar: gizli anahtarlı alanlar düşer, metinlerde kalıplar gizlenir. */
export function gizliAyikla(deger: unknown, derinlik = 0): unknown {
  if (derinlik > 8) return GIZLENDI;
  if (typeof deger === "string") {
    let s = deger;
    for (const d of GIZLI_DEGER) s = s.replace(d, GIZLENDI);
    return s;
  }
  if (Array.isArray(deger)) return deger.map((x) => gizliAyikla(x, derinlik + 1));
  if (deger && typeof deger === "object") {
    const sonuc: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(deger)) {
      if (GIZLI_ANAHTAR.test(k)) continue;
      sonuc[k] = gizliAyikla(v, derinlik + 1);
    }
    return sonuc;
  }
  return deger;
}

export const KIMLIK_OLAYLARI = [
  "kimlik.giris",
  "kimlik.cikis",
  "kimlik.supheli_giris",
  "kimlik.davet_olusturuldu",
  "kimlik.davet_kabul_edildi",
  "kimlik.rol_atandi",
  "kimlik.rol_sonlandirildi",
  "kimlik.toplu_ice_aktarma",
  "kimlik.api_anahtari_olusturuldu",
  "kimlik.api_anahtari_iptal_edildi",
  "kimlik.erisim_reddedildi",
] as const;
export type KimlikOlayi = (typeof KIMLIK_OLAYLARI)[number];

export interface KimlikOlayiGirdisi {
  aktor: { tur: "kisi" | "sistem"; id: string | null };
  eylem: KimlikOlayi;
  hedef?: { tur: string; id: string } | null;
  ayrinti?: Record<string, unknown>;
  zaman?: Date;
}

/** Günlük girdisi üretir; ayrıntıdaki giriş bilgisi her durumda ayıklanır. */
export function kimlikOlayi(girdi: KimlikOlayiGirdisi) {
  return {
    aktor: girdi.aktor,
    eylem: girdi.eylem,
    hedef: girdi.hedef ?? null,
    ayrinti: gizliAyikla(girdi.ayrinti ?? {}) as Record<string, never>,
    ...(girdi.zaman ? { zaman: girdi.zaman } : {}),
  };
}
