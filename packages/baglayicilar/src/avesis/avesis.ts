// AVESİS (Akademik Veri Yönetim Sistemi) bağlayıcısı.
// 1) Herkese açık profil ve etkinlik sayfaları: giriş gerekmez, hız sınırlı okunur.
// 2) Kimlik doğrulamalı panel: kullanıcı kendi tarayıcısında giriş yapar; bu modül parola, kod ya da çerez almaz,
//    yalnız tarayıcı ajanının döndürdüğü sayfa HTML'ini aynı ayrıştırıcıdan geçirir.
// Sayfa yapısı canlı sayfadan doğrulanamadı (ağ erişimi yok); seçiciler esnek tutuldu. DOĞRULANMADI.

import { z } from "zod";
import type { DisBaglam, Kaynak } from "../baglayici.ts";
import { metin } from "../bologna-proliz/ayristir.ts";
import { adresDenetle, BaglayiciHatasi, istek, type KullanimKosulu, sinirlayici } from "./istek.ts";

export const AVESIS_KOSULU: KullanimKosulu = {
  kaynak: "AVESİS (kurumların akademik veri yönetim sistemi)",
  durum: "DOĞRULANMADI",
  not: "Herkese açık profil sayfaları okunur. Her kurumun AVESİS kullanım koşulları ve robots.txt kuralları kurum yöneticisince okunup onaylanmadan bağlayıcı açılmamalıdır. DOĞRULANMADI.",
  enAzAralikMs: 1000,
};

export const AvesisEtkinlikSemasi = z.object({
  tur: z.enum(["makale", "bildiri", "kitap", "proje", "odul", "tez", "diger"]),
  baslik: z.string().min(1).max(1000),
  yil: z.number().int().min(1900).max(2100).nullable(),
  /** Kaynaktaki ham tür başlığı (ör. "Makaleler"). */
  bolum: z.string(),
});
export type AvesisEtkinligi = z.infer<typeof AvesisEtkinlikSemasi>;

export const AvesisProfilSemasi = z.object({
  ad: z.string().min(1),
  unvan: z.string().nullable(),
  birim: z.string().nullable(),
  arastirmaAlanlari: z.array(z.string()),
  etkinlikler: z.array(AvesisEtkinlikSemasi),
});
export type AvesisProfili = z.infer<typeof AvesisProfilSemasi>;

const TUR_ANAHTAR: [RegExp, AvesisEtkinligi["tur"]][] = [
  [/makale|article/i, "makale"],
  [/bildiri|proceeding|kongre/i, "bildiri"],
  [/kitap|book/i, "kitap"],
  [/proje|project/i, "proje"],
  [/ödül|odul|award/i, "odul"],
  [/tez|thesis/i, "tez"],
];

export function turBul(bolum: string): AvesisEtkinligi["tur"] {
  for (const [re, tur] of TUR_ANAHTAR) if (re.test(bolum)) return tur;
  return "diger";
}

/** Metindeki dört basamaklı yılı (1900-2100) alır; birden çoksa sonuncusunu (yayın yılı çoğunlukla sondadır). */
export function yilBul(s: string): number | null {
  const m = [...s.matchAll(/\b(19\d{2}|20\d{2}|2100)\b/g)];
  const son = m.at(-1);
  return son ? Number(son[1]) : null;
}

function ilk(html: string, re: RegExp): string | null {
  const m = html.match(re);
  const t = m ? metin(m[1] ?? "") : "";
  return t || null;
}

/**
 * Profil ya da etkinlik sayfasını ayrıştırır. Bölüm başlıkları (h2/h3) etkinlik türünü belirler;
 * başlığın altındaki liste öğeleri ya da tablo satırları etkinliktir.
 */
export function avesisSayfaCoz(html: string): AvesisProfili {
  const temiz = html.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, "");
  const ad =
    ilk(temiz, /<h1\b[^>]*>([\s\S]*?)<\/h1>/i) ??
    ilk(temiz, /<meta\s+property="og:title"\s+content="([^"]*)"/i) ??
    ilk(temiz, /<title>([\s\S]*?)<\/title>/i);
  if (!ad)
    throw new BaglayiciHatasi("Sayfada akademisyen adı bulunamadı; adresin bir profil sayfası olduğunu denetleyin.");
  const unvan = ilk(temiz, /class="[^"]*\b(?:unvan|title-name|academic-title)\b[^"]*"[^>]*>([\s\S]*?)</i);
  const birim = ilk(temiz, /class="[^"]*\b(?:birim|unit|department)\b[^"]*"[^>]*>([\s\S]*?)</i);
  const alanBlok = temiz.match(
    /class="[^"]*\b(?:arastirma-alanlari|research-areas)\b[^"]*"[^>]*>([\s\S]*?)<\/(?:ul|div)>/i,
  );
  const arastirmaAlanlari = alanBlok
    ? [...(alanBlok[1] ?? "").matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi)].map((m) => metin(m[1] ?? "")).filter(Boolean)
    : [];

  const etkinlikler: AvesisEtkinligi[] = [];
  const parcalar = temiz.split(/(?=<h[23]\b)/i);
  for (const p of parcalar) {
    const bas = p.match(/^<h[23]\b[^>]*>([\s\S]*?)<\/h[23]>/i);
    if (!bas) continue;
    const bolum = metin(bas[1] ?? "");
    const tur = turBul(bolum);
    if (tur === "diger" && !/yayın|yayin|etkinlik|faaliyet/i.test(bolum)) continue;
    const ogeler = [...p.matchAll(/<(li|tr)\b[^>]*>([\s\S]*?)<\/\1>/gi)].map((m) => metin(m[2] ?? ""));
    for (const o of ogeler) {
      if (!o || o.length < 3) continue;
      etkinlikler.push(AvesisEtkinlikSemasi.parse({ tur, baslik: o.slice(0, 1000), yil: yilBul(o), bolum }));
    }
  }
  return AvesisProfilSemasi.parse({ ad, unvan, birim, arastirmaAlanlari, etkinlikler });
}

/** AVESİS ana makinesi: avesis.<kurum>.edu.tr */
export const avesisMakinesiMi = (m: string) => /^avesis\.[a-z0-9-]+(\.[a-z0-9-]+)*\.edu\.tr$/.test(m);

export interface AvesisOkumaSonucu {
  profil: AvesisProfili;
  kaynaklar: Kaynak[];
}

/** Herkese açık profil sayfasını ve verilen etkinlik alt sayfalarını sırayla, hız sınırıyla okur. */
export async function avesisProfiliOku(
  adres: string,
  baglam: DisBaglam,
  secenek: { altSayfalar?: string[]; aralikMs?: number } = {},
): Promise<AvesisOkumaSonucu> {
  const u = adresDenetle(adres, avesisMakinesiMi);
  const sinir = sinirlayici(
    baglam,
    Math.max(secenek.aralikMs ?? AVESIS_KOSULU.enAzAralikMs, AVESIS_KOSULU.enAzAralikMs),
  );
  const kaynaklar: Kaynak[] = [];
  const oku = async (a: string) => {
    const y = await istek(baglam, sinir, a);
    kaynaklar.push({ adres: a, okunma: baglam.simdi().toISOString(), aciklama: "AVESİS herkese açık sayfa" });
    return avesisSayfaCoz(await y.text());
  };
  const profil = await oku(u.toString());
  for (const alt of secenek.altSayfalar ?? []) {
    const a = new URL(alt, u).toString();
    adresDenetle(a, (m) => m === u.hostname);
    baglam.ilerleme?.("Etkinlik sayfası okunuyor");
    profil.etkinlikler.push(...(await oku(a)).etkinlikler);
  }
  return { profil, kaynaklar };
}

// ---------- Kimlik doğrulamalı panel (tarayıcı ajanı) ----------

/**
 * Kullanıcının kendi tarayıcısında açtığı oturum. Giriş kullanıcı tarafından yapılır;
 * bu arayüz parola, doğrulama kodu ya da çerez taşımaz, yalnız sayfa metnini döndürür.
 */
export interface TarayiciOturumu {
  /** Kullanıcıdan giriş yapmasını ister ve giriş tamamlanınca döner. Giriş bilgisi bu tarafa gelmez. */
  girisiBekle(baslangicAdresi: string): Promise<void>;
  sayfaHtml(adres: string): Promise<string>;
}

/** Paneldeki (giriş gerektiren) sayfaları tarayıcı ajanı üzerinden okur. */
export async function avesisPaneliOku(
  oturum: TarayiciOturumu,
  panelAdresi: string,
  sayfalar: string[],
  baglam: DisBaglam,
): Promise<AvesisOkumaSonucu> {
  const u = adresDenetle(panelAdresi, avesisMakinesiMi);
  await oturum.girisiBekle(u.toString());
  const sinir = sinirlayici(baglam, AVESIS_KOSULU.enAzAralikMs);
  const kaynaklar: Kaynak[] = [];
  let profil: AvesisProfili | null = null;
  for (const s of [u.toString(), ...sayfalar.map((x) => new URL(x, u).toString())]) {
    adresDenetle(s, (m) => m === u.hostname);
    await sinir.bekle();
    const p = avesisSayfaCoz(await oturum.sayfaHtml(s));
    kaynaklar.push({ adres: s, okunma: baglam.simdi().toISOString(), aciklama: "AVESİS panel (kullanıcı oturumu)" });
    if (profil) profil.etkinlikler.push(...p.etkinlikler);
    else profil = p;
  }
  if (!profil) throw new BaglayiciHatasi("Panel okunamadı.");
  return { profil, kaynaklar };
}
