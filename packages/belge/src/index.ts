// @akredit/belge: belge işleme. Kapsam ve kabul ölçütleri: plan/ip/IP-04-belge-isleme.md
// İmzalar paketler arası sözleşmedir; değiştirmek gerekirse ADR yaz.

import { ozetHesapla } from "@akredit/cekirdek";
import { csvOku, metneCevir } from "./csv.ts";
import { docxYaz } from "./docx-uret.ts";
import { htmlOku, metinOku } from "./html.ts";
import { odpOku, odsSayfalari, odtOku } from "./odf.ts";
import { docxOku, type OkumaSonucu, pptxOku } from "./ooxml.ts";
import { parcalaUygula } from "./parcala.ts";
import { pdfOku, ZamanAsimi } from "./pdf.ts";
import { odfMi, oleMi, turTahminEt as turTahmini, uzanti } from "./tur.ts";
import type {
  BelgeIpucu,
  BelgeMetni,
  BelgeTuru,
  CikarmaSecenekleri,
  DocxModeli,
  HucreDegeri,
  Parca,
  ParcalamaSecenekleri,
  Tablo,
  TabloVerisi,
  XlsxSayfasi,
} from "./turler.ts";
import { sutunHarfi, xlsxSayfalari, xlsxYaz } from "./xlsx.ts";
import { XmlHatasi } from "./xml.ts";
import { GuvenlikHatasi, VARSAYILAN_ZIP, type ZipSinirlari, zipAc } from "./zip.ts";

export * from "./paket.ts";
export * from "./tablo-sablon.ts";
export type * from "./turler.ts";
export { crc32, zipCrcUyusmayanlar } from "./zip.ts";

const VARSAYILAN_BOYUT = 100 * 1024 * 1024;
const VARSAYILAN_ZAMAN = 30_000;

/** Baytların başından ve ipucundan belge türünü tahmin eder. */
export function turTahminEt(veri: Uint8Array, ipucu?: BelgeIpucu): BelgeTuru {
  return turTahmini(veri, ipucu);
}

function sinirlar(s?: CikarmaSecenekleri): ZipSinirlari {
  return {
    enBuyukAcilmisBoyut: s?.enBuyukAcilmisBoyut ?? VARSAYILAN_ZIP.enBuyukAcilmisBoyut,
    enBuyukDosyaSayisi: s?.enBuyukDosyaSayisi ?? VARSAYILAN_ZIP.enBuyukDosyaSayisi,
    enBuyukOran: s?.enBuyukSikistirmaOrani ?? VARSAYILAN_ZIP.enBuyukOran,
  };
}

const ESKI_BICIM: Record<string, string> = {
  doc: "Bu dosya eski Word biçiminde (.doc) ve doğrudan okunamıyor. Word'de açıp .docx ya da PDF olarak kaydedin, sonra yeniden yükleyin.",
  xls: "Bu dosya eski Excel biçiminde (.xls) ve doğrudan okunamıyor. Excel'de açıp .xlsx ya da CSV olarak kaydedin, sonra yeniden yükleyin.",
  ppt: "Bu dosya eski PowerPoint biçiminde (.ppt) ve doğrudan okunamıyor. PowerPoint'te açıp .pptx ya da PDF olarak kaydedin, sonra yeniden yükleyin.",
};
const ESKI_GENEL =
  "Bu dosya eski bir Office biçiminde ve doğrudan okunamıyor. Dosyayı açıp yeni biçimde (.docx, .xlsx, .pptx) ya da PDF olarak kaydedin, sonra yeniden yükleyin.";

function hataUyarisi(e: unknown): string {
  if (e instanceof GuvenlikHatasi)
    return `${e.message} Güvenlik nedeniyle dosya açılmadı; dosyanın kaynağını denetleyin.`;
  if (e instanceof XmlHatasi) return `Dosya okunamadı: ${e.message} Dosyayı yeniden kaydedip tekrar yükleyin.`;
  if (e instanceof ZamanAsimi)
    return "Dosyayı okumak çok uzun sürdü ve yarıda bırakıldı. Dosyayı küçültüp ya da yeniden kaydedip tekrar yükleyin.";
  return "Dosya okunamadı, bozuk olabilir. Dosyayı yeniden kaydedip tekrar yükleyin.";
}

/** Elektronik tablo sayfalarını `Tablo` ve okunabilir metin bölümüne çevirir. */
function sayfalardanSonuc(sayfalar: { ad: string; satirlar: HucreDegeri[][] }[], tekSayfa = false): OkumaSonucu {
  const tablolar: Tablo[] = [];
  const bolumler: OkumaSonucu["bolumler"] = [];
  for (const s of sayfalar) {
    if (s.satirlar.length === 0) continue;
    const sutun = Math.max(1, ...s.satirlar.map((r) => r.length));
    const aralik = `A1:${sutunHarfi(sutun)}${s.satirlar.length}`;
    const hucre = tekSayfa ? aralik : `${s.ad}!${aralik}`;
    tablolar.push({ capa: { hucre }, ad: s.ad, satirlar: s.satirlar });
    const metin = s.satirlar
      .map((r) => r.map((h) => (h === null ? "" : String(h))).join(" | "))
      .join("\n")
      .trim();
    bolumler.push({ capa: { hucre }, baslik: s.ad, metin });
  }
  return { bolumler, tablolar, uyarilar: [] };
}

async function oku(
  veri: Uint8Array,
  tur: BelgeTuru,
  ipucu: BelgeIpucu | undefined,
  secenek: CikarmaSecenekleri | undefined,
): Promise<OkumaSonucu & { ocrGerekli?: boolean }> {
  const sinir = sinirlar(secenek);
  switch (tur) {
    case "pdf":
      return pdfOku(veri, secenek?.zamanAsimiMs ?? VARSAYILAN_ZAMAN);
    case "docx":
      return docxOku(zipAc(veri, sinir, (a) => a.startsWith("word/") && a.endsWith(".xml")));
    case "pptx":
      if (odfMi(veri)) return odpOku(zipAc(veri, sinir, (a) => a === "content.xml"));
      return pptxOku(zipAc(veri, sinir, (a) => a.startsWith("ppt/") && (a.endsWith(".xml") || a.endsWith(".rels"))));
    case "odt":
      return odtOku(zipAc(veri, sinir, (a) => a === "content.xml"));
    case "ods":
      return sayfalardanSonuc(odsSayfalari(zipAc(veri, sinir, (a) => a === "content.xml")));
    case "xlsx":
      zipAc(veri, sinir, () => false); // yalnız sınır denetimi
      return sayfalardanSonuc(await xlsxSayfalari(veri));
    case "csv": {
      const c = csvOku(veri);
      return sayfalardanSonuc([{ ad: "CSV", satirlar: c.satirlar }], true);
    }
    case "html":
      return htmlOku(metneCevir(veri).metin);
    case "json":
      return metinOku(metneCevir(veri).metin, false);
    case "metin": {
      const u = uzanti(ipucu?.ad);
      return metinOku(metneCevir(veri).metin, u === "md" || u === "markdown" || ipucu?.mime === "text/markdown");
    }
    case "gorsel":
      return {
        bolumler: [],
        tablolar: [],
        uyarilar: ["Bu bir görsel; içindeki yazı ancak metin tanıma (OCR) ile okunabilir. OCR sırasına alınmalı."],
        ocrGerekli: true,
      };
    case "bilinmiyor": {
      if (oleMi(veri)) return { bolumler: [], tablolar: [], uyarilar: [ESKI_BICIM[uzanti(ipucu?.ad)] ?? ESKI_GENEL] };
      const eski = ESKI_BICIM[uzanti(ipucu?.ad)];
      return {
        bolumler: [],
        tablolar: [],
        uyarilar: [eski ?? "Bu dosya türü tanınmadı. PDF, Word, Excel, PowerPoint, CSV ya da metin dosyası yükleyin."],
      };
    }
  }
}

/** Belgeden çapalı metin, tablolar ve uyarılar çıkarır. Taranmış belgede `ocrGerekli` true döner. */
export async function metinCikar(
  veri: Uint8Array,
  ipucu?: BelgeIpucu,
  secenek?: CikarmaSecenekleri,
): Promise<BelgeMetni> {
  const ozet = ozetHesapla(veri);
  const enBuyuk = secenek?.enBuyukBoyut ?? VARSAYILAN_BOYUT;
  if (veri.byteLength > enBuyuk) {
    return {
      tur: "bilinmiyor",
      ozet,
      bolumler: [],
      tablolar: [],
      ocrGerekli: false,
      uyarilar: [
        `Dosya çok büyük (en çok ${Math.floor(enBuyuk / (1024 * 1024))} MB). Dosyayı bölerek ya da küçülterek yükleyin.`,
      ],
    };
  }
  let tur: BelgeTuru = "bilinmiyor";
  try {
    tur = turTahmini(veri, ipucu);
    const s = await oku(veri, tur, ipucu, secenek);
    const sonuc: BelgeMetni = {
      tur,
      ozet,
      bolumler: s.bolumler,
      tablolar: s.tablolar,
      ocrGerekli: s.ocrGerekli ?? false,
      uyarilar: s.uyarilar,
    };
    if (s.sayfaSayisi !== undefined) sonuc.sayfaSayisi = s.sayfaSayisi;
    if (
      !sonuc.ocrGerekli &&
      sonuc.uyarilar.length === 0 &&
      sonuc.bolumler.length === 0 &&
      sonuc.tablolar.length === 0
    ) {
      sonuc.uyarilar.push("Dosyada okunabilir metin bulunamadı.");
    }
    return sonuc;
  } catch (e) {
    return { tur, ozet, bolumler: [], tablolar: [], ocrGerekli: false, uyarilar: [hataUyarisi(e)] };
  }
}

/** XLSX, ODS ya da CSV dosyasını ham hücre tablosu olarak okur. */
export async function tabloOku(
  veri: Uint8Array,
  ipucu?: BelgeIpucu,
  secenek?: CikarmaSecenekleri,
): Promise<TabloVerisi> {
  const enBuyuk = secenek?.enBuyukBoyut ?? VARSAYILAN_BOYUT;
  if (veri.byteLength > enBuyuk) return { sayfalar: [], uyarilar: ["Dosya çok büyük. Dosyayı bölerek yükleyin."] };
  try {
    const tur = turTahmini(veri, ipucu);
    if (tur === "xlsx") {
      zipAc(veri, sinirlar(secenek), () => false);
      return { sayfalar: await xlsxSayfalari(veri) };
    }
    if (tur === "ods") return { sayfalar: odsSayfalari(zipAc(veri, sinirlar(secenek), (a) => a === "content.xml")) };
    if (tur === "csv" || tur === "metin") return { sayfalar: [{ ad: "CSV", satirlar: csvOku(veri).satirlar }] };
    if (oleMi(veri) || uzanti(ipucu?.ad) === "xls") return { sayfalar: [], uyarilar: [ESKI_BICIM.xls as string] };
    return {
      sayfalar: [],
      uyarilar: ["Bu dosya bir tablo değil. Excel (.xlsx), LibreOffice (.ods) ya da CSV dosyası yükleyin."],
    };
  } catch (e) {
    return { sayfalar: [], uyarilar: [hataUyarisi(e)] };
  }
}

/** Belge metnini arama ve atıf için çapalı parçalara böler. */
export function parcala(belge: BelgeMetni, secenek?: ParcalamaSecenekleri): Parca[] {
  return parcalaUygula(belge, secenek);
}

/** Rapor modelinden Word (.docx) dosyası üretir. */
export async function docxUret(model: DocxModeli): Promise<Uint8Array> {
  return docxYaz(model);
}

/** Tablolardan Excel (.xlsx) dosyası üretir. */
export async function xlsxUret(sayfalar: XlsxSayfasi[]): Promise<Uint8Array> {
  return xlsxYaz(sayfalar);
}
