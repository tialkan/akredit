// EBYS dışa aktarımları:
// 1) e-Yazışma paketi (.eyp): ZIP; içinde üst yazı, ekler ve üstveri XML'i bulunur.
//    Paket yapısı ve üstveri öğe adları (Konu, Tarih, BelgeNo/Sayi) resmî e-Yazışma Teknik Rehberi'nden
//    doğrulanmadı; ad eşlemesi esnek tutuldu. DOĞRULANMADI.
// 2) Evrak listesi (Excel/CSV): sayı, tarih, konu, birim. Kişi adı içeren sütunlar (imzalayan, gönderen kişi) okunmaz.
// Çıktı kanıt hattına (apps/isci kanitAl, kaynakTuru "baglayici") verilecek girdilerdir.

import type { HucreDegeri, TabloVerisi } from "@akredit/belge";
import { z } from "zod";
import type { KullanimKosulu } from "../avesis/istek.ts";
import { BaglayiciHatasi } from "../avesis/istek.ts";
import type { BaglayiciKanitGirdisi } from "./kanit.ts";
import { zipOku } from "./zip.ts";

export const EBYS_KOSULU: KullanimKosulu = {
  kaynak: "Kurum EBYS dışa aktarımları (dosya yükleme)",
  durum: "DOĞRULANMADI",
  not: "Ağ isteği yapılmaz. Gizli ya da kişisel veri içeren yazıların sisteme alınmasına ilişkin kurum içi yetki DOĞRULANMADI; kanıt hattı kişisel veri taraması yapar.",
  enAzAralikMs: 0,
};

export const UstveriSemasi = z.object({
  konu: z.string().nullable(),
  tarih: z.string().nullable(),
  sayi: z.string().nullable(),
  gizlilik: z.string().nullable(),
});
export type Ustveri = z.infer<typeof UstveriSemasi>;

const xmlMetin = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

/** Ad alanı önekinden bağımsız ilk öğe metni. */
function oge(xml: string, adlar: string[]): string | null {
  for (const ad of adlar) {
    const m = xml.match(new RegExp(`<(?:[\\w-]+:)?${ad}\\b[^>]*>([\\s\\S]*?)</(?:[\\w-]+:)?${ad}>`, "i"));
    const t = m ? xmlMetin(m[1] ?? "") : "";
    if (t) return t;
  }
  return null;
}

/** ISO tarihe çevirir: "2025-03-14T…" ya da "14.03.2025". */
export function tarihNormal(s: string | null): string | null {
  if (!s) return null;
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const tr = s.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/);
  if (tr) return `${tr[3]}-${tr[2]?.padStart(2, "0")}-${tr[1]?.padStart(2, "0")}`;
  return null;
}

export function ustveriCoz(xml: string): Ustveri {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new BaglayiciHatasi("Üstveri dosyası güvensiz içerik barındırıyor.");
  return UstveriSemasi.parse({
    konu: oge(xml, ["Konu"]),
    tarih: tarihNormal(oge(xml, ["Tarih", "BelgeTarihi"])),
    sayi: oge(xml, ["BelgeNo", "SayisalNo", "Sayi"]),
    gizlilik: oge(xml, ["GuvenlikKodu", "Gizlilik"]),
  });
}

const MIME: Record<string, string> = {
  pdf: "application/pdf",
  xml: "application/xml",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  jpg: "image/jpeg",
  png: "image/png",
};

export interface EypSonucu {
  ustveri: Ustveri;
  girdiler: BaglayiciKanitGirdisi[];
  uyarilar: string[];
}

/**
 * e-Yazışma paketini açar. Üst yazı ve ekler kanıt girdisi olur; paket iç dosyaları ([Content_Types].xml,
 * _rels, imza dosyaları) alınmaz. Gizlilik derecesi "Gizli"/"Çok Gizli" ise paket reddedilir.
 */
export function eypOku(veri: Uint8Array, paketAdi: string): EypSonucu {
  const icerik = zipOku(veri);
  const ustAd = [...icerik.keys()].find((a) => /(^|\/)(ust|üst)veri[^/]*\.xml$/i.test(a));
  const uyarilar: string[] = [];
  const ustveri: Ustveri = ustAd
    ? ustveriCoz(new TextDecoder().decode(icerik.get(ustAd)))
    : { konu: null, tarih: null, sayi: null, gizlilik: null };
  if (!ustAd) uyarilar.push("Pakette üstveri bulunamadı; tarih ve sayı boş bırakıldı.");
  if (ustveri.gizlilik && /gizli/i.test(ustveri.gizlilik) && !/tasnif d[ıi][sş][ıi]/i.test(ustveri.gizlilik))
    throw new BaglayiciHatasi("Gizlilik dereceli yazılar sisteme alınmaz. Yazının gizliliği kaldırıldıktan sonra yükleyin.");
  const girdiler: BaglayiciKanitGirdisi[] = [];
  for (const [ad, d] of icerik) {
    if (ad === ustAd || /^\[content_types\]\.xml$|(^|\/)_rels\/|\.rels$|imza|signature|\.p7s$|nihaiozet|paketozeti/i.test(ad))
      continue;
    const uz = ad.split(".").pop()?.toLowerCase() ?? "";
    const dosyaAdi = ad.split("/").pop() ?? ad;
    const g: BaglayiciKanitGirdisi = {
      veri: d,
      dosyaAdi,
      kaynakTuru: "baglayici",
      kaynakAyrinti: {
        baglayici: "ebys",
        paket: paketAdi.slice(0, 200),
        yol: ad.slice(0, 400),
        ...(ustveri.sayi ? { sayi: ustveri.sayi } : {}),
        ...(ustveri.konu ? { konu: ustveri.konu.slice(0, 200) } : {}),
      },
    };
    if (MIME[uz]) g.mime = MIME[uz];
    if (ustveri.tarih) g.belgeTarihi = ustveri.tarih;
    girdiler.push(g);
  }
  if (!girdiler.length) uyarilar.push("Pakette belge bulunamadı.");
  return { ustveri, girdiler, uyarilar };
}

// ---------- Evrak listesi ----------

export interface EvrakKaydi {
  sayi: string | null;
  tarih: string | null;
  konu: string;
  birim: string | null;
  satir: number;
}

const d = (h: HucreDegeri | undefined) =>
  String(h ?? "")
    .toLocaleLowerCase("tr")
    .trim();

/** EBYS evrak listesi dışa aktarımını okur. Kişi adı sütunları (imzalayan, gönderen kişi, hazırlayan) atlanır. */
export function evrakListesiOku(tablo: TabloVerisi): { kayitlar: EvrakKaydi[]; uyarilar: string[] } {
  const s = tablo.sayfalar[0];
  if (!s) return { kayitlar: [], uyarilar: ["Dosyada sayfa yok."] };
  const bas = s.satirlar.findIndex((r) => r.some((h) => d(h) === "konu"));
  if (bas < 0) return { kayitlar: [], uyarilar: ["Konu sütunu bulunamadı; dosyanın evrak listesi olduğunu denetleyin."] };
  const b = (s.satirlar[bas] ?? []).map(d);
  const sira = (re: RegExp) => b.findIndex((x) => re.test(x));
  const iSayi = sira(/^(sayı|sayi|evrak sayısı|belge no)$/);
  const iTarih = sira(/^(tarih|evrak tarihi|belge tarihi)$/);
  const iKonu = sira(/^konu$/);
  const iBirim = sira(/^(birim|gönderen birim|oluşturan birim)$/);
  const kayitlar: EvrakKaydi[] = [];
  for (let i = bas + 1; i < s.satirlar.length; i++) {
    const r = s.satirlar[i] ?? [];
    const konu = String(r[iKonu] ?? "").trim();
    if (!konu) continue;
    const t = r[iTarih];
    kayitlar.push({
      sayi: iSayi >= 0 ? String(r[iSayi] ?? "").trim() || null : null,
      tarih: iTarih >= 0 ? tarihNormal(String(t ?? "").trim()) : null,
      konu: konu.slice(0, 500),
      birim: iBirim >= 0 ? String(r[iBirim] ?? "").trim() || null : null,
      satir: i + 1,
    });
  }
  return { kayitlar, uyarilar: [] };
}
