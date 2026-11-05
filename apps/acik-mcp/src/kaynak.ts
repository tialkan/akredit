// Kaynak künyesi biçimlendirme: APA 7'ye benzer, Türkçe kısaltmalı, deterministik. Yalnız verilen bilgiyi dizer;
// eksik bilgi tahmin edilmez, künyede [EKSİK: ...] olarak görünür. Yazar adları yayımlanmış künyedir; bu araçta
// kişi adı deseni aranmaz (künye kuralı), e-posta ve telefon yine reddedilir.

import { z } from "zod";
import { arac, KOD_KAYNAGI } from "./temel.ts";

const Kaynak = z.object({
  tur: z.enum(["kitap", "makale", "kitap_bolumu", "web", "tez"]).default("kitap"),
  yazarlar: z
    .array(z.string().trim().min(2).max(120))
    .max(25)
    .default([])
    .describe("'Soyad, Ad' ya da 'Ad Soyad'; kurum adı da olabilir"),
  kurumYazar: z.boolean().default(false).describe("Yazar bir kurumsa (ör. Kurgu Bakanlığı) true"),
  yil: z.union([z.number().int().min(1400).max(2100), z.string().trim().max(20)]).optional(),
  baslik: z.string().trim().min(2).max(400),
  baski: z.number().int().min(2).max(50).optional(),
  yayinevi: z.string().trim().max(200).optional(),
  dergi: z.string().trim().max(200).optional(),
  cilt: z.string().trim().max(20).optional(),
  sayi: z.string().trim().max(20).optional(),
  sayfalar: z.string().trim().max(30).optional().describe("ör. '12-30'"),
  editorler: z.array(z.string().trim().min(2).max(120)).max(10).optional(),
  kitapBasligi: z.string().trim().max(400).optional(),
  kurum: z.string().trim().max(200).optional().describe("Tezde üniversite"),
  tezTuru: z.enum(["yuksek_lisans", "doktora"]).optional(),
  site: z.string().trim().max(200).optional(),
  doi: z.string().trim().max(200).optional(),
  url: z.string().trim().max(500).optional(),
});
type KaynakT = z.infer<typeof Kaynak>;

const bas = (s: string) => {
  const h = [...s.trim()][0] ?? "";
  return h ? `${h.toLocaleUpperCase("tr")}.` : "";
};

/** "Soyad, Ad İkinci" ya da "Ad İkinci Soyad" → "Soyad, A. İ." */
export function yazarBicimle(ad: string, kurum = false): string {
  const a = ad.trim().replace(/\s+/gu, " ");
  if (kurum) return a;
  if (a.includes(",")) {
    const [soyad, ...ilk] = a.split(",");
    const adlar = ilk
      .join(" ")
      .trim()
      .split(/[\s-]+/u)
      .filter(Boolean);
    return [soyad?.trim(), adlar.map(bas).join(" ")].filter(Boolean).join(", ");
  }
  const p = a.split(" ");
  if (p.length === 1) return a;
  const soyad = p.at(-1) ?? "";
  return `${soyad}, ${p.slice(0, -1).map(bas).join(" ")}`;
}

/** APA 7: 1 yazar "A"; 2 yazar "A, & B"; 3-20 yazar virgülle, sonuncudan önce "&"; 21+ ilk 19, "...", son. */
export function yazarListesi(yazarlar: string[], kurum = false): string {
  const b = yazarlar.map((y) => yazarBicimle(y, kurum));
  if (b.length === 0) return "";
  if (b.length === 1) return b[0] ?? "";
  if (b.length <= 20) return `${b.slice(0, -1).join(", ")}, & ${b.at(-1)}`;
  return `${b.slice(0, 19).join(", ")}, ... ${b.at(-1)}`;
}

const nokta = (s: string) => (/[.?!]$/u.test(s) ? s : `${s}.`);
const doiBagi = (d: string) => (/^https?:\/\//u.test(d) ? d : `https://doi.org/${d.replace(/^doi:\s*/iu, "")}`);
const editorKisa = (e: string) => {
  const b = yazarBicimle(e);
  const [soyad, bas] = b.split(", ");
  return bas ? `${bas} ${soyad}` : b;
};

/** Tek künye. Eksik zorunlu bilgi [EKSİK: ...] olarak yazılır ve ayrıca listelenir. */
export function kunyeBicimle(k: KaynakT): { kunye: string; eksikler: string[] } {
  const eksikler: string[] = [];
  const eksik = (ad: string) => {
    eksikler.push(ad);
    return `[EKSİK: ${ad}]`;
  };
  const yazar = k.yazarlar.length ? yazarListesi(k.yazarlar, k.kurumYazar) : eksik("yazar");
  const yil = k.yil === undefined || k.yil === "" ? "t.y." : String(k.yil);
  if (yil === "t.y.") eksikler.push("yıl (t.y. yazıldı)");
  const parcalar: string[] = [`${nokta(yazar)} (${yil}).`];
  const baski = k.baski ? ` (${k.baski}. bs.)` : "";
  switch (k.tur) {
    case "kitap":
      parcalar.push(nokta(`${k.baslik}${baski}`), nokta(k.yayinevi || eksik("yayınevi")));
      break;
    case "makale": {
      parcalar.push(nokta(k.baslik));
      const dergi = k.dergi || eksik("dergi adı");
      const cilt = k.cilt ? `, ${k.cilt}${k.sayi ? `(${k.sayi})` : ""}` : "";
      const sayfa = k.sayfalar ? `, ${k.sayfalar}` : "";
      parcalar.push(nokta(`${dergi}${cilt}${sayfa}`));
      if (!k.cilt) eksikler.push("cilt");
      if (!k.sayfalar) eksikler.push("sayfalar");
      break;
    }
    case "kitap_bolumu": {
      parcalar.push(nokta(k.baslik));
      const ed = k.editorler?.length
        ? `${k.editorler.map(editorKisa).join(", ")} (${k.editorler.length > 1 ? "Ed'ler" : "Ed."}), `
        : "";
      const kitap = k.kitapBasligi || eksik("kitap adı");
      const ss = k.sayfalar ? ` (ss. ${k.sayfalar})` : "";
      parcalar.push(nokta(`İçinde ${ed}${kitap}${baski}${ss}`), nokta(k.yayinevi || eksik("yayınevi")));
      break;
    }
    case "tez": {
      const tur =
        k.tezTuru === "doktora"
          ? "Doktora tezi"
          : k.tezTuru === "yuksek_lisans"
            ? "Yüksek lisans tezi"
            : eksik("tez türü");
      parcalar.push(`${k.baslik} [${tur}, ${k.kurum || eksik("üniversite")}].`);
      break;
    }
    case "web":
      parcalar.push(nokta(k.baslik));
      if (k.site) parcalar.push(nokta(k.site));
      if (!k.url) parcalar.push(eksik("adres"));
      break;
  }
  if (k.doi) parcalar.push(doiBagi(k.doi));
  else if (k.url) parcalar.push(k.url);
  return { kunye: parcalar.join(" ").replace(/\s+/gu, " ").trim(), eksikler };
}

export const kaynakBicimleAraci = arac({
  ad: "kaynak_bicimle",
  baslik: "Kaynak künyesi biçimle",
  aciklama:
    "Hocanın verdiği kitap, makale, kitap bölümü, tez ya da web kaynağını APA 7'ye benzer Türkçe künyeye çevirir. Yalnız verilen bilgiyi dizer; eksik bilgi [EKSİK] olarak görünür, uydurulmaz.",
  sonrakiAdim:
    "Künyeleri hocaya gösterin. Eserin varlığını kaynak_dogrula ile doğrulayın; doğrulanamayanı yazmayın. EKSİK bilgiyi tahmin etmeyin. Sonra künyeleri kaynaklar alanına koyun.",
  kunyeAlanlari: ["kaynaklar"],
  girdi: z.object({
    kaynaklar: z.array(Kaynak).min(1).max(30),
  }),
  calistir: ({ kaynaklar }) => {
    const sonuclar = kaynaklar.map((k, i) => ({ no: i + 1, ...kunyeBicimle(k) }));
    return {
      sonuc: {
        kunyeler: sonuclar,
        tamamlanan: sonuclar.filter((s) => !s.eksikler.length).length,
        not: "Biçim APA 7'ye benzer bir Akredit biçimidir; kurumunuzun yazım kılavuzu farklıysa o önceliklidir. Eser bilgisinin doğruluğunu hoca denetler.",
        uydurmaYok:
          "Bu araç yalnız verilen bilgiyi biçimlendirir. Asistan, kaynak_dogrula ile doğrulanmamış bir eseri önermez.",
      },
      kaynak: [KOD_KAYNAGI("apps/acik-mcp/src/kaynak.ts", "Akredit künye biçimleyici")],
    };
  },
});
