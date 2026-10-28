// İşçi yapılandırması: ortam değişkenleri zod ile doğrulanır. Eksik zorunlu değişken açık bir Türkçe hatayla
// bildirilir; isteğe bağlı ama önemli eksikler (anahtar kasası, SMTP, nesne deposu geliştirmede) uyarı olur ve
// sağlık ucunda görünür. Gizli değerler hiçbir iletiye yazılmaz.

import { z } from "zod";

const bos = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const metin = () => z.preprocess(bos, z.string().optional());

export const OrtamSemasi = z.object({
  NODE_ENV: metin(),
  AKREDIT_VT_ADRES: z.preprocess(
    bos,
    z
      .string({ error: "AKREDIT_VT_ADRES tanımlı değil (ayrıcalıksız uygulama kullanıcısının bağlantı adresi)." })
      .regex(/^postgres(ql)?:\/\//u, "AKREDIT_VT_ADRES postgres:// ile başlamalı."),
  ),
  AKREDIT_ISCI_PORT: z.preprocess(bos, z.coerce.number().int().min(0).max(65535).default(8080)),
  AKREDIT_ISCI_ZAMANLAMA: z.preprocess(bos, z.enum(["0", "1"]).default("1")),
  AKREDIT_ISCI_EZAMANLI: z.preprocess(bos, z.coerce.number().int().min(1).max(32).default(2)),
  AKREDIT_SAAT_DILIMI: z.preprocess(bos, z.string().default("Europe/Istanbul")),
  AKREDIT_ANAHTAR_KASASI: metin(),
  // Nesne deposu: S3 (üretim) ya da yerel dizin (geliştirme, kurum içi tek makine).
  S3_UC_NOKTASI: metin(),
  S3_BOLGE: metin(),
  S3_KOVA: metin(),
  S3_ERISIM_ANAHTARI: metin(),
  S3_GIZLI_ANAHTAR: metin(),
  S3_KILIT_GUN: z.preprocess(bos, z.coerce.number().int().positive().optional()),
  AKREDIT_DEPO_DIZINI: metin(),
  AKREDIT_DEPO_IMZA_GIZLISI: metin(),
  // E-posta (bildirimler): @akredit/surec ortamdanEpostaAyari bu adları okur.
  AKREDIT_SMTP_SUNUCU: metin(),
  // Kurum içi model sunucusu (infra/kurum-ici): verilirse anahtarı olmayan kurumlar bunu kullanır.
  AKREDIT_YZ_HAZIR: metin(),
  AKREDIT_YZ_ADRES: metin(),
  AKREDIT_YZ_MODEL: metin(),
  AKREDIT_YZ_YURT_DISI_IZIN: metin(),
  // Bulut ve posta bağlayıcıları (OAuth): belirteç kasasının ana anahtarı ve uygulama istemci bilgileri.
  AKREDIT_BAGLAYICI_ANAHTARI: metin(),
  AKREDIT_GOOGLE_ISTEMCI_KIMLIGI: metin(),
  AKREDIT_GOOGLE_ISTEMCI_SIRRI: metin(),
  AKREDIT_MICROSOFT_ISTEMCI_KIMLIGI: metin(),
  AKREDIT_MICROSOFT_ISTEMCI_SIRRI: metin(),
});

export type Ortam = z.infer<typeof OrtamSemasi>;

export type DepoAyari =
  | {
      tur: "s3";
      ucNokta: string;
      bolge: string;
      kova: string;
      erisimAnahtari: string;
      gizliAnahtar: string;
      kilitGun?: number;
    }
  | { tur: "yerel"; kok: string; imzaGizlisi: string };

export interface Yapilandirma {
  ortam: Ortam;
  uretim: boolean;
  depo: DepoAyari | null;
  baglayiciAnahtari: Uint8Array | null;
}

export type YapilandirmaSonucu =
  | { tamam: true; yapilandirma: Yapilandirma; uyarilar: string[] }
  | { tamam: false; hatalar: string[]; uyarilar: string[] };

/** Ortamı doğrular. Hata iletileri değişken adını ve ne yapılacağını söyler, değerini yazmaz. */
export function yapilandirmaOku(env: Record<string, string | undefined>): YapilandirmaSonucu {
  const hatalar: string[] = [];
  const uyarilar: string[] = [];
  const s = OrtamSemasi.safeParse(env);
  if (!s.success) {
    for (const i of s.error.issues) hatalar.push(`${i.path.join(".") || "ortam"}: ${i.message}`);
    return { tamam: false, hatalar, uyarilar };
  }
  const o = s.data;
  const uretim = o.NODE_ENV === "production";

  let depo: DepoAyari | null = null;
  const s3 = [o.S3_UC_NOKTASI, o.S3_KOVA, o.S3_ERISIM_ANAHTARI, o.S3_GIZLI_ANAHTAR];
  if (s3.every(Boolean))
    depo = {
      tur: "s3",
      ucNokta: o.S3_UC_NOKTASI as string,
      bolge: o.S3_BOLGE ?? "us-east-1",
      kova: o.S3_KOVA as string,
      erisimAnahtari: o.S3_ERISIM_ANAHTARI as string,
      gizliAnahtar: o.S3_GIZLI_ANAHTAR as string,
      ...(o.S3_KILIT_GUN ? { kilitGun: o.S3_KILIT_GUN } : {}),
    };
  else if (s3.some(Boolean) && o.S3_UC_NOKTASI)
    hatalar.push("S3_UC_NOKTASI, S3_KOVA, S3_ERISIM_ANAHTARI ve S3_GIZLI_ANAHTAR birlikte tanımlanmalı.");
  else if (o.AKREDIT_DEPO_DIZINI) {
    if (!o.AKREDIT_DEPO_IMZA_GIZLISI || o.AKREDIT_DEPO_IMZA_GIZLISI.length < 32)
      hatalar.push("AKREDIT_DEPO_IMZA_GIZLISI en az 32 karakter olmalı (yerel nesne deposu için).");
    else depo = { tur: "yerel", kok: o.AKREDIT_DEPO_DIZINI, imzaGizlisi: o.AKREDIT_DEPO_IMZA_GIZLISI };
  } else if (uretim)
    hatalar.push(
      "Nesne deposu tanımlı değil: S3_UC_NOKTASI, S3_KOVA, S3_ERISIM_ANAHTARI, S3_GIZLI_ANAHTAR (ya da AKREDIT_DEPO_DIZINI) verin.",
    );
  else uyarilar.push("Nesne deposu tanımlı değil; kanıt dosyaları işlenemez (geliştirme).");

  if (!o.AKREDIT_ANAHTAR_KASASI && !o.AKREDIT_YZ_HAZIR)
    uyarilar.push("AKREDIT_ANAHTAR_KASASI tanımlı değil: kurum anahtarları çözülemez, yapay zekâ adımları atlanır.");
  if (!o.AKREDIT_SMTP_SUNUCU)
    uyarilar.push("AKREDIT_SMTP_SUNUCU tanımlı değil: bildirim e-postaları gönderilemez, bekletilir.");
  if ((o.AKREDIT_YZ_ADRES || o.AKREDIT_YZ_MODEL) && !o.AKREDIT_YZ_HAZIR)
    hatalar.push("AKREDIT_YZ_ADRES/AKREDIT_YZ_MODEL verildiyse AKREDIT_YZ_HAZIR da verilmeli.");

  let baglayiciAnahtari: Uint8Array | null = null;
  if (o.AKREDIT_BAGLAYICI_ANAHTARI) {
    const b = Buffer.from(o.AKREDIT_BAGLAYICI_ANAHTARI, "base64");
    if (b.length !== 32) hatalar.push("AKREDIT_BAGLAYICI_ANAHTARI 32 baytlık base64 olmalı.");
    else baglayiciAnahtari = new Uint8Array(b);
  } else uyarilar.push("AKREDIT_BAGLAYICI_ANAHTARI tanımlı değil: e-posta ve Drive eşitlemesi çalışmaz.");

  if (hatalar.length) return { tamam: false, hatalar, uyarilar };
  return { tamam: true, yapilandirma: { ortam: o, uretim, depo, baglayiciAnahtari }, uyarilar };
}
