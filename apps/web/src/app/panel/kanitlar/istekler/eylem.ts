"use server";

// Belge isteği oluşturma (İP-45). Yetki ve doğrulama servis katmanında. Bağlantı yalnız bu yanıtta bir kez
// döner (e-posta gönderilemediyse elle iletilebilsin); hiçbir yerde saklanmaz.

import { belgeIstegi, ServisHatasi } from "@akredit/servis";
import { ortamdanEpostaAyari, smtpTasiyici } from "@akredit/surec";
import { revalidatePath } from "next/cache";
import { GERCEK_VERI, servisBaglami } from "../../../../veri/sunucu.ts";
import { tekiller } from "../../../api/_ortak/sunucu.ts";
import { istekGizlisi } from "../../../api/istek/_ortak.ts";

export type IstekEylemDurumu =
  | { durum: "bos" }
  | { durum: "tamam"; baglanti: string; gonderildi: boolean; neden: string | null }
  | { durum: "hata"; ileti: string; alanlar: Record<string, string> };

export async function istekOlusturEylem(_onceki: IstekEylemDurumu, f: FormData): Promise<IstekEylemDurumu> {
  if (!GERCEK_VERI) return { durum: "hata", ileti: "Örnek veriyle istek oluşturulamaz.", alanlar: {} };
  const gizli = istekGizlisi();
  if (!gizli)
    return {
      durum: "hata",
      ileti: "Belge isteği bu sunucuda kapalı. Yöneticinizden bağlantı anahtarını tanımlamasını isteyin.",
      alanlar: {},
    };
  const al = (ad: string) => {
    const v = f.get(ad);
    return typeof v === "string" && v.trim() ? v.trim() : undefined;
  };
  const gun = Number(al("sonGun") ?? belgeIstegi.VARSAYILAN_GUN);
  const b = await servisBaglami();
  const { kimlik } = await tekiller();
  const smtp = ortamdanEpostaAyari(process.env);
  try {
    const s = await belgeIstegi.istekOlustur(
      b,
      {
        istenen: al("istenen"),
        aliciEposta: al("aliciEposta"),
        birimAdi: al("birimAdi"),
        sonGun: Number.isFinite(gun) ? Math.trunc(gun) : belgeIstegi.VARSAYILAN_GUN,
      },
      { gizli, temelAdres: kimlik.ayar.temelAdres, tasiyici: smtp ? smtpTasiyici(smtp) : null },
    );
    revalidatePath("/panel/kanitlar/istekler");
    return { durum: "tamam", baglanti: s.baglanti, gonderildi: s.gonderim === "gonderildi", neden: s.neden };
  } catch (e) {
    if (e instanceof ServisHatasi)
      return {
        durum: "hata",
        ileti: e.message,
        alanlar: Object.fromEntries(e.alanlar.map((a) => [a.alan, a.ileti])),
      };
    if (e && typeof e === "object" && "issues" in e) {
      const alanlar: Record<string, string> = {};
      for (const i of (e as { issues: { path: PropertyKey[]; message: string }[] }).issues)
        alanlar[String(i.path[0] ?? "")] = i.message;
      return { durum: "hata", ileti: "Bilgiler eksik ya da hatalı. Alanları düzeltip yeniden deneyin.", alanlar };
    }
    throw e;
  }
}
