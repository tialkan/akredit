// UBYS ve diğer OBS sağlayıcılarının ders not listesi dışa aktarımları (Excel/CSV) için içe aktarıcı.
// Girdi `@akredit/belge` tabloOku çıktısıdır (TabloVerisi). Soru bazlı döküm için not-aktarimi kullanılır;
// bu modül değerlendirme bazlı (vize, final, ödev, bütünleme, ortalama, harf) listeyi okur.
// Kişisel veri: öğrenci numarası yalnız takmaAd'a gider; ad, soyad, T.C. kimlik, e-posta sütunları okunmaz.
// Sağlayıcı imzaları (başlık adları) kurgu örneklerden çıkarıldı; gerçek dışa aktarımlarla DOĞRULANMADI.

import type { HucreDegeri, TabloVerisi } from "@akredit/belge";
import { z } from "zod";
import type { KullanimKosulu } from "../avesis/istek.ts";

export const OBS_KOSULU: KullanimKosulu = {
  kaynak: "Kurum OBS/UBYS dışa aktarımları (dosya yükleme)",
  durum: "DOĞRULANMADI",
  not: "Ağ isteği yapılmaz; kullanıcının kendi indirdiği dosya okunur. Dosyanın paylaşılmasına ilişkin kurum içi yetki DOĞRULANMADI.",
  enAzAralikMs: 0,
};

export type ObsSaglayici = "ubys" | "proliz" | "genel";

export interface ObsSutunu {
  sira: number;
  baslik: string;
  tur: "no" | "kisisel" | "degerlendirme" | "ortalama" | "harf" | "devam" | "diger";
  /** Başlıktaki yüzde ağırlık: "Vize (%40)" → 40. */
  agirlik: number | null;
}

export const ObsSonucuSemasi = z.object({
  saglayici: z.enum(["ubys", "proliz", "genel"]),
  ders: z.object({ kod: z.string().nullable(), donem: z.string().nullable() }),
  degerlendirmeler: z.array(z.object({ ad: z.string(), agirlik: z.number().nullable() })),
  ogrenciler: z.array(
    z.object({
      ogrenci: z.string(),
      notlar: z.record(z.string(), z.union([z.number(), z.literal("devamsiz"), z.null()])),
      ortalama: z.number().nullable(),
      harf: z.string().nullable(),
    }),
  ),
  bulgular: z.array(z.object({ kod: z.string(), ileti: z.string(), hucre: z.string().optional() })),
});
export type ObsSonucu = z.infer<typeof ObsSonucuSemasi>;

const duz = (h: HucreDegeri | undefined) =>
  String(h ?? "")
    .toLocaleLowerCase("tr")
    .replace(/\s+/g, " ")
    .trim();

const NO = /^(öğrenci ?no|öğrenci numarası|ogrenci no|öğr\.? ?no|numara|no)$/;
const KISISEL = /(ad[ıi]? ?soyad|^ad[ıi]?$|^soyad|t\.?c\.?|kimlik|e-?posta|telefon|uyruk|doğum)/;
const ORTALAMA = /^(ortalama|başarı notu|basari notu|ham not|dönem sonu notu|ort\.?)$/;
const HARF = /^(harf( notu)?|hn|not harfi)$/;
const DEVAM = /^(devam( durumu)?|devamsızlık|dvz)$/;
const DEGERLENDIRME =
  /^(vize|ara sınav|arasınav|ara sinav|final|yarıyıl sonu|yy sonu|bütünleme|butunleme|büt|ödev|odev|proje|kısa sınav|quiz|uygulama|laboratuvar|lab|sözlü|mazeret)/;

export function sutunTuru(baslik: string): ObsSutunu["tur"] {
  const b = baslik.replace(/\s*[(\[].*$/, "").trim();
  if (NO.test(b)) return "no";
  if (KISISEL.test(b)) return "kisisel";
  if (HARF.test(b)) return "harf";
  if (ORTALAMA.test(b)) return "ortalama";
  if (DEVAM.test(b)) return "devam";
  if (DEGERLENDIRME.test(b)) return "degerlendirme";
  return "diger";
}

/** Başlık satırındaki imzalara göre sağlayıcıyı tahmin eder. DOĞRULANMADI. */
export function saglayiciTahmin(basliklar: string[], ustMetin: string): ObsSaglayici {
  const tum = `${basliklar.join("|")}|${ustMetin}`;
  if (/ubys|ders not listesi.*ubys|başarı notu/.test(tum)) return "ubys";
  if (/proliz|yarıyıl sonu|dönem sonu notu/.test(tum)) return "proliz";
  return "genel";
}

function notOku(h: HucreDegeri | undefined): { tur: "sayi"; d: number } | { tur: "devamsiz" } | { tur: "bos" } | { tur: "gecersiz" } {
  if (h === null || h === undefined || duz(h) === "") return { tur: "bos" };
  if (typeof h === "number") return Number.isFinite(h) ? { tur: "sayi", d: h } : { tur: "gecersiz" };
  const t = duz(h);
  if (/^(gr|dz|girmedi|g|dvz|devamsız)$/.test(t)) return { tur: "devamsiz" };
  if (/^-?\d+([.,]\d+)?$/.test(t)) return { tur: "sayi", d: Number(t.replace(",", ".")) };
  return { tur: "gecersiz" };
}

const harfSutun = (i: number): string => {
  let s = "";
  let n = i + 1;
  while (n > 0) {
    s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

/** Ders not listesi dışa aktarımını okur. */
export function obsDisaAktarimiOku(
  tablo: TabloVerisi,
  secenek: { takmaAd(ogrenciNo: string): string; sayfa?: string; saglayici?: ObsSaglayici },
): ObsSonucu {
  const bulgular: ObsSonucu["bulgular"] = [];
  const sayfa = secenek.sayfa ? tablo.sayfalar.find((s) => s.ad === secenek.sayfa) : tablo.sayfalar[0];
  const bos: ObsSonucu = {
    saglayici: secenek.saglayici ?? "genel",
    ders: { kod: null, donem: null },
    degerlendirmeler: [],
    ogrenciler: [],
    bulgular,
  };
  if (!sayfa) {
    bulgular.push({ kod: "sayfa_yok", ileti: "Dosyada okunacak sayfa bulunamadı." });
    return bos;
  }
  const satirlar = sayfa.satirlar;
  const basSira = satirlar.slice(0, 20).findIndex((r) => r.some((h) => NO.test(duz(h))));
  if (basSira < 0) {
    bulgular.push({ kod: "baslik_yok", ileti: "Öğrenci numarası sütunu bulunamadı. Dosyanın not listesi olduğunu denetleyin." });
    return bos;
  }
  const ustMetin = satirlar
    .slice(0, basSira)
    .flat()
    .map((h) => String(h ?? ""))
    .join(" ");
  const ders = {
    kod: ustMetin.match(/ders kodu\s*:?\s*([A-ZÇĞİÖŞÜ]{2,}\s?\d{3}[A-Z]?)/i)?.[1] ?? null,
    donem: ustMetin.match(/(20\d{2}\s*[-/]\s*20\d{2}\s*(?:güz|bahar|yaz)?)/i)?.[1]?.replace(/\s+/g, " ") ?? null,
  };
  const sutunlar: ObsSutunu[] = (satirlar[basSira] ?? []).map((h, sira) => {
    const baslik = String(h ?? "").trim();
    const a = baslik.match(/%\s*(\d+(?:[.,]\d+)?)|(\d+(?:[.,]\d+)?)\s*%/);
    const ag = a ? (a[1] ?? a[2]) : undefined;
    return { sira, baslik, tur: sutunTuru(duz(baslik)), agirlik: ag ? Number(ag.replace(",", ".")) : null };
  });
  const saglayici = secenek.saglayici ?? saglayiciTahmin(sutunlar.map((s) => duz(s.baslik)), duz(ustMetin));
  const noS = sutunlar.find((s) => s.tur === "no");
  const degS = sutunlar.filter((s) => s.tur === "degerlendirme");
  const ortS = sutunlar.find((s) => s.tur === "ortalama");
  const harfS = sutunlar.find((s) => s.tur === "harf");
  if (!degS.length) bulgular.push({ kod: "degerlendirme_yok", ileti: "Not sütunu (vize, final, ödev…) bulunamadı." });
  const agToplam = degS.reduce((t, s) => t + (s.agirlik ?? 0), 0);
  if (degS.some((s) => s.agirlik !== null) && Math.abs(agToplam - 100) > 0.01 && !degS.some((s) => /büt/i.test(s.baslik)))
    bulgular.push({ kod: "agirlik_toplami", ileti: `Değerlendirme ağırlıklarının toplamı %${agToplam}, %100 olmalı.` });

  const gorulen = new Set<string>();
  const ogrenciler: ObsSonucu["ogrenciler"] = [];
  for (let i = basSira + 1; i < satirlar.length; i++) {
    const r = satirlar[i] ?? [];
    const satirNo = i + 1;
    const no = String(r[noS?.sira ?? 0] ?? "").trim();
    if (!no) {
      if (r.some((h) => duz(h) !== "")) bulgular.push({ kod: "numarasiz", ileti: "Öğrenci numarası olmayan satır atlandı.", hucre: `${harfSutun(noS?.sira ?? 0)}${satirNo}` });
      continue;
    }
    if (!/^[0-9A-Za-z-]{3,20}$/.test(no)) {
      bulgular.push({ kod: "numara_gecersiz", ileti: "Öğrenci numarası geçersiz; satır atlandı.", hucre: `${harfSutun(noS?.sira ?? 0)}${satirNo}` });
      continue;
    }
    const ogrenci = secenek.takmaAd(no);
    if (gorulen.has(ogrenci)) {
      bulgular.push({ kod: "yinelenen", ileti: "Aynı öğrenci birden çok kez var; ilki alındı.", hucre: `${harfSutun(noS?.sira ?? 0)}${satirNo}` });
      continue;
    }
    gorulen.add(ogrenci);
    const notlar: ObsSonucu["ogrenciler"][number]["notlar"] = {};
    for (const s of degS) {
      const n = notOku(r[s.sira]);
      const hucre = `${harfSutun(s.sira)}${satirNo}`;
      if (n.tur === "sayi") {
        if (n.d < 0 || n.d > 100) bulgular.push({ kod: "aralik_disi", ileti: "Not 0-100 aralığında değil.", hucre });
        notlar[s.baslik] = n.d;
      } else if (n.tur === "devamsiz") notlar[s.baslik] = "devamsiz";
      else {
        if (n.tur === "gecersiz") bulgular.push({ kod: "sayi_degil", ileti: "Not hücresi sayı değil.", hucre });
        notlar[s.baslik] = null;
      }
    }
    const o = ortS ? notOku(r[ortS.sira]) : { tur: "bos" as const };
    const harf = harfS ? String(r[harfS.sira] ?? "").trim().toUpperCase() || null : null;
    ogrenciler.push({ ogrenci, notlar, ortalama: o.tur === "sayi" ? o.d : null, harf });
  }
  return ObsSonucuSemasi.parse({
    saglayici,
    ders,
    degerlendirmeler: degS.map((s) => ({ ad: s.baslik, agirlik: s.agirlik })),
    ogrenciler,
    bulgular,
  });
}
