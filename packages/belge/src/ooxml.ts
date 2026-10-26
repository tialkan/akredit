// Word (.docx) ve PowerPoint (.pptx) okuma: ZIP içindeki XML'den çapalı bölümler ve tablolar.

import type { BelgeBolumu, Tablo } from "./turler.ts";
import { altlar, cocuklar, gez, icMetin, ilkCocuk, type XmlDugum, xmlAyristir } from "./xml.ts";
import { utf8, type ZipIcerik } from "./zip.ts";

export interface OkumaSonucu {
  bolumler: BelgeBolumu[];
  tablolar: Tablo[];
  uyarilar: string[];
  sayfaSayisi?: number;
}

function xmlOku(zip: ZipIcerik, yol: string): XmlDugum | undefined {
  const s = utf8(zip[yol]);
  return s === undefined ? undefined : xmlAyristir(s);
}

// ---------------- DOCX ----------------

/** Stil adından başlık düzeyi: "heading 1", "Başlık 2", "Heading3" … */
export function baslikDuzeyi(ad: string | undefined): number | undefined {
  if (!ad) return undefined;
  const m = /^(?:heading|başlık|baslik|balk)\s*([1-9])$/i.exec(ad.trim());
  return m ? Number(m[1]) : undefined;
}

function wParagrafMetni(p: XmlDugum): string {
  let s = "";
  gez(p, (d) => {
    if (d.ad === "w:t") s += icMetin(d);
    else if (d.ad === "w:tab") s += "\t";
    else if (d.ad === "w:br" || d.ad === "w:cr") s += "\n";
    else if (d.ad === "w:footnoteReference") s += `[${d.oz["w:id"] ?? ""}]`;
    else if (d.ad === "w:delText" || d.ad === "w:instrText") return false;
    return true;
  });
  return s;
}

function wTablo(tbl: XmlDugum): string[][] {
  return cocuklar(tbl, "w:tr").map((tr) =>
    cocuklar(tr, "w:tc").map((tc) => altlar(tc, "w:p").map(wParagrafMetni).join("\n").trim()),
  );
}

export function docxOku(zip: ZipIcerik): OkumaSonucu {
  const belge = xmlOku(zip, "word/document.xml");
  if (!belge)
    return { bolumler: [], tablolar: [], uyarilar: ["Word dosyasının içeriği bulunamadı. Dosya bozuk olabilir."] };
  const stiller = new Map<string, number>();
  const stilXml = xmlOku(zip, "word/styles.xml");
  if (stilXml) {
    for (const st of altlar(stilXml, "w:style")) {
      const id = st.oz["w:styleId"] ?? "";
      const ad = ilkCocuk(st, "w:name")?.oz["w:val"];
      const duzey = baslikDuzeyi(ad) ?? baslikDuzeyi(id);
      if (duzey) stiller.set(id, duzey);
    }
  }
  const govde = ilkCocuk(belge, "w:body") ?? belge;
  const bolumler: BelgeBolumu[] = [];
  const tablolar: Tablo[] = [];
  let simdiki: BelgeBolumu = { capa: { bolum: "§1" }, metin: "" };
  const ekle = (metin: string) => {
    simdiki.metin = simdiki.metin ? `${simdiki.metin}\n\n${metin}` : metin;
  };
  const kapat = () => {
    if (simdiki.metin.trim() !== "" || simdiki.baslik) bolumler.push(simdiki);
  };
  const isle = (d: XmlDugum) => {
    if (d.ad === "w:p") {
      const ppr = ilkCocuk(d, "w:pPr");
      const stilId = ppr ? ilkCocuk(ppr, "w:pStyle")?.oz["w:val"] : undefined;
      const anahat = ppr ? ilkCocuk(ppr, "w:outlineLvl")?.oz["w:val"] : undefined;
      const metin = wParagrafMetni(d).trim();
      let duzey = stilId ? (stiller.get(stilId) ?? baslikDuzeyi(stilId)) : undefined;
      if (duzey === undefined && anahat !== undefined && Number(anahat) < 9) duzey = Number(anahat) + 1;
      if (duzey !== undefined && metin !== "") {
        kapat();
        simdiki = { capa: { bolum: metin }, baslik: metin, duzey, metin: "" };
      } else if (metin !== "") ekle(metin);
    } else if (d.ad === "w:tbl") {
      tablolar.push({
        capa: { ...simdiki.capa },
        ad: `Tablo ${tablolar.length + 1}`,
        satirlar: wTablo(d),
      });
    } else if (d.ad === "w:sdt" || d.ad === "w:sdtContent" || d.ad === "w:customXml" || d.ad === "w:ins") {
      for (const c of cocuklar(d)) isle(c);
    }
  };
  for (const c of cocuklar(govde)) isle(c);
  kapat();
  const dipnot = xmlOku(zip, "word/footnotes.xml");
  if (dipnot) {
    const notlar = altlar(dipnot, "w:footnote")
      .filter((f) => !f.oz["w:type"])
      .map((f) => {
        const m = altlar(f, "w:p").map(wParagrafMetni).join(" ").trim();
        return m ? `[${f.oz["w:id"] ?? ""}] ${m}` : "";
      })
      .filter(Boolean);
    if (notlar.length > 0) {
      bolumler.push({ capa: { bolum: "Dipnotlar" }, baslik: "Dipnotlar", metin: notlar.join("\n") });
    }
  }
  return { bolumler, tablolar, uyarilar: [] };
}

// ---------------- PPTX ----------------

function aParagraflari(d: XmlDugum): string[] {
  return altlar(d, "a:p")
    .map((p) => {
      let s = "";
      gez(p, (x) => {
        if (x.ad === "a:t") s += icMetin(x);
        else if (x.ad === "a:br") s += "\n";
        return true;
      });
      return s.trim();
    })
    .filter((s) => s !== "");
}

function relsOku(zip: ZipIcerik, yol: string): Map<string, { hedef: string; tur: string }> {
  const r = xmlOku(zip, yol);
  const m = new Map<string, { hedef: string; tur: string }>();
  if (!r) return m;
  for (const x of altlar(r, "Relationship")) {
    m.set(x.oz.Id ?? "", { hedef: x.oz.Target ?? "", tur: x.oz.Type ?? "" });
  }
  return m;
}

function yolCoz(taban: string, goreli: string): string {
  if (goreli.startsWith("/")) return goreli.slice(1);
  const parcalar = taban.split("/").slice(0, -1);
  for (const p of goreli.split("/")) {
    if (p === "..") parcalar.pop();
    else if (p !== ".") parcalar.push(p);
  }
  return parcalar.join("/");
}

export function pptxOku(zip: ZipIcerik): OkumaSonucu {
  const sunum = xmlOku(zip, "ppt/presentation.xml");
  let slaytYollari: string[] = [];
  if (sunum) {
    const rels = relsOku(zip, "ppt/_rels/presentation.xml.rels");
    slaytYollari = altlar(sunum, "p:sldId")
      .map((s) => rels.get(s.oz["r:id"] ?? "")?.hedef)
      .filter((h): h is string => !!h)
      .map((h) => yolCoz("ppt/presentation.xml", h));
  }
  if (slaytYollari.length === 0) {
    slaytYollari = Object.keys(zip)
      .filter((a) => /^ppt\/slides\/slide\d+\.xml$/.test(a))
      .sort((a, b) => Number(/(\d+)\.xml$/.exec(a)?.[1]) - Number(/(\d+)\.xml$/.exec(b)?.[1]));
  }
  const bolumler: BelgeBolumu[] = [];
  const tablolar: Tablo[] = [];
  slaytYollari.forEach((yol, i) => {
    const no = i + 1;
    const x = xmlOku(zip, yol);
    if (!x) return;
    let baslik: string | undefined;
    const govde: string[] = [];
    for (const sp of altlar(x, "p:sp")) {
      const ph = altlar(sp, "p:ph")[0];
      const tur = ph?.oz.type;
      const metinler = aParagraflari(sp);
      if ((tur === "title" || tur === "ctrTitle") && baslik === undefined) baslik = metinler.join(" ");
      else govde.push(...metinler);
    }
    for (const tbl of altlar(x, "a:tbl")) {
      tablolar.push({
        capa: { slayt: no },
        ad: `Slayt ${no} tablosu`,
        satirlar: altlar(tbl, "a:tr").map((tr) => cocuklar(tr, "a:tc").map((tc) => aParagraflari(tc).join("\n"))),
      });
    }
    bolumler.push({ capa: { slayt: no }, ...(baslik ? { baslik } : {}), metin: govde.join("\n") });
    const rels = relsOku(zip, yol.replace(/([^/]+)$/, "_rels/$1.rels"));
    for (const r of rels.values()) {
      if (r.tur.endsWith("/notesSlide")) {
        const not = xmlOku(zip, yolCoz(yol, r.hedef));
        if (!not) continue;
        const metin = altlar(not, "p:sp")
          .filter((sp) => altlar(sp, "p:ph")[0]?.oz.type === "body")
          .flatMap(aParagraflari)
          .join("\n");
        if (metin)
          bolumler.push({ capa: { slayt: no, bolum: "Konuşmacı notları" }, baslik: "Konuşmacı notları", metin });
      }
    }
  });
  return { bolumler, tablolar, uyarilar: [], sayfaSayisi: slaytYollari.length };
}
