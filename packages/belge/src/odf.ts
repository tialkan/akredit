// OpenDocument (LibreOffice) okuma: ODT, ODS, ODP. Hepsi ZIP içinde content.xml taşır.

import type { OkumaSonucu } from "./ooxml.ts";
import type { BelgeBolumu, HucreDegeri, Tablo } from "./turler.ts";
import { altlar, cocuklar, ilkCocuk, type XmlDugum, xmlAyristir } from "./xml.ts";
import { utf8, type ZipIcerik } from "./zip.ts";

/** Tekrarlanan boş satır/sütunlarda (ODS'nin sonsuz boş alanı) üst sınır. */
const EN_COK_TEKRAR = 10_000;

function icerik(zip: ZipIcerik): XmlDugum | undefined {
  const s = utf8(zip["content.xml"]);
  return s === undefined ? undefined : xmlAyristir(s);
}

/** text:p / text:h içindeki metni boşluk, sekme ve satır sonlarıyla çıkarır. */
export function odfMetin(d: XmlDugum): string {
  let s = "";
  for (const c of d.cocuklar) {
    if (typeof c === "string") s += c;
    else if (c.ad === "text:s") s += " ".repeat(Math.min(Number(c.oz["text:c"] ?? 1) || 1, 1000));
    else if (c.ad === "text:tab") s += "\t";
    else if (c.ad === "text:line-break") s += "\n";
    else if (c.ad === "office:annotation" || c.ad === "text:note-citation") continue;
    else if (c.ad === "text:note") {
      const govde = ilkCocuk(c, "text:note-body");
      if (govde) s += ` [${altlar(govde, "text:p").map(odfMetin).join(" ")}]`;
    } else s += odfMetin(c);
  }
  return s;
}

function odfTabloMetin(t: XmlDugum): string[][] {
  return odsTablo(t).map((s) => s.map((h) => (h === null ? "" : String(h))));
}

// ---------------- ODT ----------------

export function odtOku(zip: ZipIcerik): OkumaSonucu {
  const x = icerik(zip);
  if (!x) return { bolumler: [], tablolar: [], uyarilar: ["Belgenin içeriği bulunamadı. Dosya bozuk olabilir."] };
  const metinKok = altlar(x, "office:text")[0];
  const bolumler: BelgeBolumu[] = [];
  const tablolar: Tablo[] = [];
  let simdiki: BelgeBolumu = { capa: { bolum: "§1" }, metin: "" };
  const ekle = (m: string) => {
    simdiki.metin = simdiki.metin ? `${simdiki.metin}\n\n${m}` : m;
  };
  const isle = (d: XmlDugum, onEk = "") => {
    if (d.ad === "text:h") {
      const m = odfMetin(d).trim();
      if (!m) return;
      if (simdiki.metin.trim() || simdiki.baslik) bolumler.push(simdiki);
      simdiki = { capa: { bolum: m }, baslik: m, duzey: Number(d.oz["text:outline-level"] ?? 1) || 1, metin: "" };
    } else if (d.ad === "text:p") {
      const m = odfMetin(d).trim();
      if (m) ekle(onEk + m);
    } else if (d.ad === "table:table") {
      tablolar.push({ capa: { ...simdiki.capa }, ad: d.oz["table:name"] ?? `Tablo ${tablolar.length + 1}`, satirlar: odfTabloMetin(d) });
    } else if (d.ad === "text:list") {
      for (const oge of cocuklar(d, "text:list-item")) for (const c of cocuklar(oge)) isle(c, "- ");
    } else if (d.ad === "text:section" || d.ad === "text:list-item") {
      for (const c of cocuklar(d)) isle(c, onEk);
    }
  };
  if (metinKok) for (const c of cocuklar(metinKok)) isle(c);
  if (simdiki.metin.trim() || simdiki.baslik) bolumler.push(simdiki);
  return { bolumler, tablolar, uyarilar: [] };
}

// ---------------- ODS ----------------

function odsHucre(c: XmlDugum): HucreDegeri {
  if (c.ad === "table:covered-table-cell") return null;
  const tur = c.oz["office:value-type"];
  if (tur === "float" || tur === "percentage" || tur === "currency") {
    const n = Number(c.oz["office:value"]);
    return Number.isFinite(n) ? n : null;
  }
  if (tur === "date") return c.oz["office:date-value"] ?? null;
  if (tur === "time") return c.oz["office:time-value"] ?? null;
  if (tur === "boolean") return c.oz["office:boolean-value"] ?? null;
  const m = cocuklar(c, "text:p").map(odfMetin).join("\n");
  return m === "" ? null : m;
}

export function odsTablo(t: XmlDugum): HucreDegeri[][] {
  const satirlar: HucreDegeri[][] = [];
  const satirTopla = (d: XmlDugum) => {
    for (const r of cocuklar(d)) {
      if (r.ad === "table:table-row") {
        const satir: HucreDegeri[] = [];
        for (const c of cocuklar(r)) {
          if (c.ad !== "table:table-cell" && c.ad !== "table:covered-table-cell") continue;
          const deger = odsHucre(c);
          const tekrar = Math.min(Number(c.oz["table:number-columns-repeated"] ?? 1) || 1, EN_COK_TEKRAR);
          for (let i = 0; i < tekrar; i++) satir.push(deger);
        }
        while (satir.length > 0 && satir[satir.length - 1] === null) satir.pop();
        const tekrar = Math.min(Number(r.oz["table:number-rows-repeated"] ?? 1) || 1, EN_COK_TEKRAR);
        for (let i = 0; i < tekrar; i++) satirlar.push([...satir]);
      } else if (r.ad === "table:table-rows" || r.ad === "table:table-header-rows" || r.ad === "table:table-row-group") {
        satirTopla(r);
      }
    }
  };
  satirTopla(t);
  while (satirlar.length > 0 && (satirlar[satirlar.length - 1] as HucreDegeri[]).length === 0) satirlar.pop();
  return satirlar;
}

export function odsSayfalari(zip: ZipIcerik): { ad: string; satirlar: HucreDegeri[][] }[] {
  const x = icerik(zip);
  if (!x) return [];
  const kok = altlar(x, "office:spreadsheet")[0];
  if (!kok) return [];
  return cocuklar(kok, "table:table").map((t, i) => ({ ad: t.oz["table:name"] ?? `Sayfa${i + 1}`, satirlar: odsTablo(t) }));
}

// ---------------- ODP ----------------

export function odpOku(zip: ZipIcerik): OkumaSonucu {
  const x = icerik(zip);
  if (!x) return { bolumler: [], tablolar: [], uyarilar: ["Sunumun içeriği bulunamadı. Dosya bozuk olabilir."] };
  const bolumler: BelgeBolumu[] = [];
  const tablolar: Tablo[] = [];
  const sayfalar = altlar(x, "draw:page");
  sayfalar.forEach((sayfa, i) => {
    const no = i + 1;
    let baslik: string | undefined;
    const govde: string[] = [];
    for (const c of cocuklar(sayfa)) {
      if (c.ad === "presentation:notes") continue;
      const metinler = altlar(c, "text:p")
        .map(odfMetin)
        .map((s) => s.trim())
        .filter(Boolean);
      if (c.oz["presentation:class"] === "title" && baslik === undefined) baslik = metinler.join(" ");
      else if (altlar(c, "table:table").length > 0) {
        for (const t of altlar(c, "table:table")) {
          tablolar.push({ capa: { slayt: no }, ad: `Slayt ${no} tablosu`, satirlar: odfTabloMetin(t) });
        }
      } else govde.push(...metinler);
    }
    bolumler.push({ capa: { slayt: no }, ...(baslik ? { baslik } : {}), metin: govde.join("\n") });
    const notlar = ilkCocuk(sayfa, "presentation:notes");
    if (notlar) {
      const m = altlar(notlar, "draw:text-box")
        .flatMap((k) => altlar(k, "text:p").map(odfMetin))
        .map((s) => s.trim())
        .filter(Boolean)
        .join("\n");
      if (m) bolumler.push({ capa: { slayt: no, bolum: "Konuşmacı notları" }, baslik: "Konuşmacı notları", metin: m });
    }
  });
  return { bolumler, tablolar, uyarilar: [], sayfaSayisi: sayfalar.length };
}
