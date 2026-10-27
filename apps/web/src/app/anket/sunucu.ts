// Anket sayfalarının sunucu tarafı bağlamı (yalnız gerçek veri kipinde).
// Ortam: AKREDIT_ANKET_GIZLI (davet belirteçlerinin HMAC anahtarı, en az 16 karakter), AKREDIT_ADRES.

import type { AnketBaglami } from "@akredit/anket/vt";
import { gercekSaat, ortamdanEpostaAyari, smtpTasiyici } from "@akredit/surec";
import { tekiller } from "../api/_ortak/sunucu.ts";

export const ORNEK_KURUM = "ornek";

export async function anketBaglami(): Promise<AnketBaglami> {
  const gizli = process.env.AKREDIT_ANKET_GIZLI;
  if (!gizli || gizli.length < 16) throw new Error("Anket gizli anahtarı yapılandırılmadı (AKREDIT_ANKET_GIZLI).");
  const smtp = ortamdanEpostaAyari(process.env);
  const { db } = await tekiller();
  return {
    db,
    saat: gercekSaat,
    gizli,
    adres: process.env.AKREDIT_ADRES ?? "https://akredit.org",
    eposta: smtp
      ? smtpTasiyici(smtp)
      : {
          async gonder() {
            throw new Error("E-posta gönderici yapılandırılmadı (AKREDIT_SMTP_SUNUCU).");
          },
        },
  };
}
