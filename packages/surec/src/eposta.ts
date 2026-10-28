// Gerçek e-posta gönderici (SMTP, nodemailer). Kimlik katmanının `EpostaGonderici` arayüzünü
// (sihirli bağlantı, şüpheli giriş) ve süreç bildirimlerini karşılar. SMTP parolası ortamdan gelir;
// ne bağlantı ne parola günlüğe yazılır. Hata iletisinde alıcı ve içerik yer almaz.

import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport/index.js";
import { z } from "zod";

export interface EpostaIletisi {
  alici: string;
  konu: string;
  metin: string;
}

/** Ham gönderim; testte yakalayıcı, üretimde SMTP. */
export interface EpostaTasiyici {
  gonder(i: EpostaIletisi): Promise<void>;
}

/** Kimlik katmanının beklediği arayüzle aynı biçim (`apps/web/src/kimlik/sunucu.ts`). */
export interface EpostaGonderici {
  sihirliBaglanti(alici: string, baglanti: string): Promise<void>;
  supheliGiris(alici: string, ayrinti: { zaman: Date; cihaz: string }): Promise<void>;
  /** Kurum açılışı doğrulama bağlantısı (İP-35). Bağlantı gizlidir. */
  kurumAcilisi(alici: string, ayrinti: { kurumAdi: string; baglanti: string }): Promise<void>;
  /** Kuruma davet (İP-35). Bağlantı gizlidir. */
  davet(alici: string, ayrinti: { kurumAdi: string; davetEden: string; baglanti: string }): Promise<void>;
}

export const EpostaAyari = z.object({
  sunucu: z.string().min(1),
  port: z.coerce.number().int().min(1).max(65535).default(587),
  /** 465 için doğrudan TLS; diğerlerinde STARTTLS zorunlu. */
  guvenli: z.boolean().default(false),
  kullanici: z.string().optional(),
  parola: z.string().optional(),
  gonderen: z.string().min(3),
});
export type EpostaAyari = z.infer<typeof EpostaAyari>;

/**
 * Ortamdan ayar: AKREDIT_SMTP_SUNUCU, AKREDIT_SMTP_PORT, AKREDIT_SMTP_KULLANICI, AKREDIT_SMTP_PAROLA,
 * AKREDIT_EPOSTA_GONDEREN. Sunucu yoksa `null` (gönderici yapılandırılmamış).
 */
export function ortamdanEpostaAyari(env: Record<string, string | undefined>): EpostaAyari | null {
  if (!env.AKREDIT_SMTP_SUNUCU) return null;
  const port = Number(env.AKREDIT_SMTP_PORT ?? 587);
  return EpostaAyari.parse({
    sunucu: env.AKREDIT_SMTP_SUNUCU,
    port,
    guvenli: port === 465,
    kullanici: env.AKREDIT_SMTP_KULLANICI,
    parola: env.AKREDIT_SMTP_PAROLA,
    gonderen: env.AKREDIT_EPOSTA_GONDEREN ?? "Akredit <bildirim@akredit.org>",
  });
}

export class EpostaGonderilemediHatasi extends Error {
  override name = "EpostaGonderilemediHatasi";
}

const ADRES = z.email();

/** SMTP taşıyıcı. `secenek` testte nodemailer'ın akış/JSON taşıyıcısını vermek içindir. */
export function smtpTasiyici(ayar: EpostaAyari, secenek?: { transport?: unknown }): EpostaTasiyici {
  const opts: SMTPTransport.Options = {
    host: ayar.sunucu,
    port: ayar.port,
    secure: ayar.guvenli,
    requireTLS: !ayar.guvenli,
    ...(ayar.kullanici ? { auth: { user: ayar.kullanici, pass: ayar.parola ?? "" } } : {}),
    logger: false,
    debug: false,
  };
  const t = nodemailer.createTransport((secenek?.transport ?? opts) as SMTPTransport.Options);
  return {
    async gonder(i) {
      if (!ADRES.safeParse(i.alici).success) throw new EpostaGonderilemediHatasi("Alıcı adresi geçersiz.");
      try {
        await t.sendMail({ from: ayar.gonderen, to: i.alici, subject: i.konu, text: i.metin });
      } catch (e) {
        // Ayrıntı (sunucu yanıtı alıcıyı içerebilir) iletiye konmaz.
        throw new EpostaGonderilemediHatasi(
          `E-posta gönderilemedi (${e instanceof Error ? e.name : "bilinmeyen"}). Biraz sonra yeniden denenecek.`,
        );
      }
    },
  };
}

/** Kimlik e-postaları (sihirli bağlantı, şüpheli giriş) için gönderici. */
export function kimlikEpostaGondericisi(t: EpostaTasiyici, saatDilimi = "Europe/Istanbul"): EpostaGonderici {
  return {
    sihirliBaglanti: (alici, baglanti) =>
      t.gonder({
        alici,
        konu: "Akredit giriş bağlantınız",
        metin:
          `Akredit'e girmek için aşağıdaki bağlantıyı açın. Bağlantı 10 dakika geçerlidir ve bir kez kullanılabilir.\n\n` +
          `${baglanti}\n\nBu isteği siz yapmadıysanız bu iletiyi silebilirsiniz.\n`,
      }),
    supheliGiris: (alici, a) =>
      t.gonder({
        alici,
        konu: "Akredit: yeni bir cihazdan giriş",
        metin:
          `Hesabınıza ${a.zaman.toLocaleString("tr-TR", { timeZone: saatDilimi })} tarihinde yeni bir cihazdan ` +
          `(${a.cihaz}) giriş yapıldı. Siz değilseniz kurumunuzun Akredit yöneticisine haber verin.\n`,
      }),
    kurumAcilisi: (alici, a) =>
      t.gonder({
        alici,
        konu: "Akredit: kurum açılışını doğrulayın",
        metin:
          `${a.kurumAdi} için Akredit'te kurum açma başvurusu yapıldı. Başvuruyu siz yaptıysanız aşağıdaki ` +
          `bağlantıyı açın. Bağlantı 30 dakika geçerlidir ve bir kez kullanılabilir.\n\n${a.baglanti}\n\n` +
          `Başvuruyu siz yapmadıysanız bu iletiyi silin; kurum açılmaz.\n`,
      }),
    davet: (alici, a) =>
      t.gonder({
        alici,
        konu: `Akredit: ${a.kurumAdi} sizi davet ediyor`,
        metin:
          `${a.davetEden}, sizi ${a.kurumAdi} kurumunun Akredit hesabına davet etti. Katılmak için aşağıdaki ` +
          `bağlantıyı açın ve bu e-posta adresiyle giriş yapın. Bağlantı 7 gün geçerlidir.\n\n${a.baglanti}\n`,
      }),
  };
}

/** Testler ve geliştirme için gönderilenleri bellekte tutan taşıyıcı. */
export function bellekTasiyici(): EpostaTasiyici & { kutu: EpostaIletisi[] } {
  const kutu: EpostaIletisi[] = [];
  return {
    kutu,
    async gonder(i) {
      kutu.push(i);
    },
  };
}
