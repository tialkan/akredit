// AVESİS (Akademik Veri Yönetim Sistemi) bağlayıcısı.
// 1) Herkese açık profil ve yayın sayfaları: giriş gerekmez, hız sınırlı okunur.
// 2) Kimlik doğrulamalı panel: kullanıcı kendi tarayıcısında giriş yapar; bu modül parola, kod ya da çerez almaz,
//    yalnız tarayıcı ajanının döndürdüğü sayfa HTML'ini aynı ayrıştırıcıdan geçirir.
// Yapı 2026-10-27'de canlı sayfadan doğrulandı (kurum: EBYÜ; docs/baglayicilar/canli-dogrulama-2026-10-27/avesis-yapi.md).
// Profil `/<kullanici>` (h1.title, .metrics-title/.metrics-count), yayınlar `/<kullanici>/yayinlar`
// (akordeon bölümleri .item-head > span, .pub-item). Araştırma alanları sunucu HTML'inde boş gelir
// (istemci tarafında POST ile yüklenir); okunmaz, DOĞRULANMADI olarak bildirilir. Kullanım koşulları DOĞRULANMADI.

import { z } from "zod";
import type { DisBaglam, Kaynak } from "../baglayici.ts";
import { metin } from "../bologna-proliz/ayristir.ts";
import { adresDenetle, BaglayiciHatasi, istek, type KullanimKosulu, sinirlayici } from "./istek.ts";

export const AVESIS_KOSULU: KullanimKosulu = {
  kaynak: "AVESİS (kurumların akademik veri yönetim sistemi)",
  durum: "DOĞRULANMADI",
  not: "Yapı 2026-10-27'de canlı sayfadan doğrulandı (kurum: EBYÜ). Herkese açık profil ve yayın sayfaları okunur. Her kurumun AVESİS kullanım koşulları ve robots.txt kuralları kurum yöneticisince okunup onaylanmadan bağlayıcı açılmamalıdır. Kullanım koşulları DOĞRULANMADI.",
  enAzAralikMs: 1000,
};

export const ARASTIRMA_ALANLARI_NOTU = "DOĞRULANMADI: istemci tarafında yükleniyor";

export const AvesisEtkinlikSemasi = z.object({
  tur: z.enum(["makale", "bildiri", "kitap", "proje", "odul", "tez", "diger"]),
  baslik: z.string().min(1).max(1000),
  yil: z.number().int().min(1900).max(2100).nullable(),
  /** Kaynaktaki akordeon bölüm adı (ör. "Makaleler"). */
  bolum: z.string(),
  yazarlar: z.array(z.string()),
  dergi: z.string().nullable(),
  /** Dergi adından sonra kalan atıf metni (cilt, sayı, sayfa, yıl, dizin). */
  atif: z.string(),
  /** `data-filters` değerleri ("other" dışında): sci_ssci_ahci, sci_ssci_ahci_esci, scopus, trdizin. */
  dizinler: z.array(z.string()),
  /** Yayın ayrıntı yolu (/yayin/<uuid>/<slug>). */
  yol: z.string().nullable(),
});
export type AvesisEtkinligi = z.infer<typeof AvesisEtkinlikSemasi>;

export const AvesisProfilSemasi = z.object({
  ad: z.string().min(1),
  unvan: z.string().nullable(),
  /** Metrik başlığı → sayı ("Yayın (WoS)" → 1). Sayı değilse ("-") null. */
  metrikler: z.record(z.string(), z.number().nullable()),
  arastirmaAlanlari: z.object({ durum: z.literal("DOĞRULANMADI"), not: z.string() }),
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

const UNVAN = /^(?:(?:Prof\.|Doç\.|Dr\.|Öğr\.|Üyesi|Gör\.|Arş\.|Uzm\.|Okt\.)\s+)+/u;

/** Script ve style içeriğini atar (içlerindeki HTML benzeri dizeler ayrıştırılmaz). */
const betiksiz = (html: string) => html.replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, "");

/** `class` özniteliğinde verilen sınıfı içeren açılış etiketi deseni. */
const sinif = (ad: string) => String.raw`class="(?:[^"]*\s)?${ad}(?:\s[^"]*)?"`;
const ic = (etiket: string, ad: string, bayrak = "i") =>
  new RegExp(String.raw`<${etiket}\b[^>]*${sinif(ad)}[^>]*>([\s\S]*?)<\/${etiket}>`, bayrak);
const bol = (html: string, ad: string) => html.split(new RegExp(String.raw`(?=<div\b[^>]*${sinif(ad)})`, "i")).slice(1);

/** "1.234" → 1234; sayı değilse null. */
function metrikSayisi(s: string): number | null {
  const t = s.replace(/\s/g, "");
  return /^\d{1,3}(\.\d{3})*$|^\d+$/.test(t) ? Number(t.replace(/\./g, "")) : null;
}

function yayinlariCoz(temiz: string): AvesisEtkinligi[] {
  const sonuc: AvesisEtkinligi[] = [];
  for (const b of bol(temiz, "item-head")) {
    const bolum = metin(b.match(/<span\b[^>]*>([\s\S]*?)<\/span>/i)?.[1] ?? "");
    const tur = turBul(bolum);
    for (const o of bol(b, "pub-item")) {
      const baslik = metin(o.match(/<h3\b[^>]*>[\s\S]*?<strong\b[^>]*>([\s\S]*?)<\/strong>/i)?.[1] ?? "");
      if (!baslik) continue;
      const yazarlar = [...o.matchAll(ic("a", "authorsRichText", "gi"))].map((m) => metin(m[1] ?? "")).filter(Boolean);
      const dergiM = o.match(ic("a", "journalDetailModalLink"));
      const dergi = dergiM ? metin(dergiM[1] ?? "") || null : null;
      // İkinci .citation bloğu: dergi bağlantısı + kalan atıf metni (bildiride yalnız metin).
      const atifBlok = [...o.matchAll(ic("div", "citation", "gi"))][1]?.[1] ?? "";
      const atif = metin(dergiM ? atifBlok.replace(dergiM[0], "") : atifBlok).replace(/^[\s,]+/, "");
      const dizinler = (o.match(/data-filters="([^"]*)"/i)?.[1] ?? "")
        .split(",")
        .map((x) => x.trim())
        .filter((x) => x && x !== "other");
      const yol = o.match(/<h3\b[^>]*>[\s\S]*?<a\b[^>]*href="(\/yayin\/[^"]+)"/i)?.[1] ?? null;
      sonuc.push(
        AvesisEtkinlikSemasi.parse({
          tur,
          baslik: baslik.slice(0, 1000),
          yil: yilBul(atif),
          bolum,
          yazarlar,
          dergi,
          atif,
          dizinler,
          yol,
        }),
      );
    }
  }
  return sonuc;
}

/** Profil ya da yayınlar sayfasını ayrıştırır. Araştırma alanları okunmaz (bkz. ARASTIRMA_ALANLARI_NOTU). */
export function avesisSayfaCoz(html: string): AvesisProfili {
  const temiz = betiksiz(html);
  const tamAd =
    metin(temiz.match(ic("h1", "title"))?.[1] ?? "") ||
    metin(temiz.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/\s*\|\s*AVES[İI]S\s*$/i, "");
  if (!tamAd)
    throw new BaglayiciHatasi("Sayfada akademisyen adı bulunamadı; adresin bir profil sayfası olduğunu denetleyin.");
  const unvan = tamAd.match(UNVAN)?.[0]?.trim() ?? "";
  const ad = tamAd.slice(unvan.length).trim() || tamAd;
  const metrikler: Record<string, number | null> = {};
  // İlk kutuda strong doğrudan h4'ün kardeşi, sonrakilerde bir div içinde; ikisi de aynı desenle yakalanır.
  const metrikRe = new RegExp(
    String.raw`<h4\b[^>]*${sinif("metrics-title")}[^>]*>([\s\S]*?)<\/h4>[\s\S]*?<strong\b[^>]*${sinif("metrics-count")}[^>]*>([\s\S]*?)<\/strong>`,
    "gi",
  );
  for (const m of temiz.matchAll(metrikRe)) {
    const baslik = metin(m[1] ?? "");
    if (baslik && !(baslik in metrikler)) metrikler[baslik] = metrikSayisi(metin(m[2] ?? ""));
  }
  return AvesisProfilSemasi.parse({
    ad,
    unvan: unvan || null,
    metrikler,
    arastirmaAlanlari: { durum: "DOĞRULANMADI", not: ARASTIRMA_ALANLARI_NOTU },
    etkinlikler: yayinlariCoz(temiz),
  });
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
  // Varsayılan alt sayfa: /<kullanici>/yayinlar
  for (const alt of secenek.altSayfalar ?? [`${u.pathname.replace(/\/+$/, "")}/yayinlar`]) {
    const a = new URL(alt, u).toString();
    adresDenetle(a, (m) => m === u.hostname);
    baglam.ilerleme?.("Yayın sayfası okunuyor");
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
