// Test yardımcıları: ZIP tabanlı küçük örnek belgeler (ODT, ODS, ODP, PPTX, DOCX) üretir.

import { strToU8, type Zippable, zipSync } from "fflate";

export function zip(dosyalar: Record<string, string | Uint8Array>, odfMime?: string): Uint8Array {
  const z: Zippable = {};
  // ODF'de "mimetype" ilk ve sıkıştırılmamış olmalı.
  if (odfMime) z.mimetype = [strToU8(odfMime), { level: 0 }];
  for (const [ad, icerik] of Object.entries(dosyalar)) z[ad] = typeof icerik === "string" ? strToU8(icerik) : icerik;
  return zipSync(z);
}

const OFFICE_NS =
  'xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0"';

export function odf(tur: "text" | "spreadsheet" | "presentation", govde: string): Uint8Array {
  const icerik = `<?xml version="1.0" encoding="UTF-8"?><office:document-content ${OFFICE_NS}><office:body><office:${tur}>${govde}</office:${tur}></office:body></office:document-content>`;
  return zip(
    { "content.xml": icerik, "META-INF/manifest.xml": "<manifest/>" },
    `application/vnd.oasis.opendocument.${tur}`,
  );
}

const CT = '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>';
const P_NS =
  'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';

function sekil(tur: string | undefined, paragraflar: string[]): string {
  const ph = tur ? `<p:nvPr><p:ph type="${tur}"/></p:nvPr>` : "<p:nvPr/>";
  return `<p:sp><p:nvSpPr><p:cNvPr id="1" name="x"/><p:cNvSpPr/>${ph}</p:nvSpPr><p:txBody>${paragraflar
    .map((m) => `<a:p><a:r><a:t>${m}</a:t></a:r></a:p>`)
    .join("")}</p:txBody></p:sp>`;
}

export function pptx(slaytlar: { baslik: string; govde: string[]; not?: string; tablo?: string[][] }[]): Uint8Array {
  const d: Record<string, string> = { "[Content_Types].xml": CT };
  const sld: string[] = [];
  const rels: string[] = [];
  slaytlar.forEach((s, i) => {
    const n = i + 1;
    sld.push(`<p:sldId id="${255 + n}" r:id="rId${n}"/>`);
    rels.push(
      `<Relationship Id="rId${n}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${n}.xml"/>`,
    );
    const tablo = s.tablo
      ? `<p:graphicFrame><a:graphic><a:graphicData><a:tbl>${s.tablo
          .map(
            (r) =>
              `<a:tr>${r.map((h) => `<a:tc><a:txBody><a:p><a:r><a:t>${h}</a:t></a:r></a:p></a:txBody></a:tc>`).join("")}</a:tr>`,
          )
          .join("")}</a:tbl></a:graphicData></a:graphic></p:graphicFrame>`
      : "";
    d[`ppt/slides/slide${n}.xml`] =
      `<?xml version="1.0"?><p:sld ${P_NS}><p:cSld><p:spTree>${sekil("title", [s.baslik])}${sekil(undefined, s.govde)}${tablo}</p:spTree></p:cSld></p:sld>`;
    if (s.not) {
      d[`ppt/slides/_rels/slide${n}.xml.rels`] =
        `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId9" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/notesSlide" Target="../notesSlides/notesSlide${n}.xml"/></Relationships>`;
      d[`ppt/notesSlides/notesSlide${n}.xml`] =
        `<?xml version="1.0"?><p:notes ${P_NS}><p:cSld><p:spTree>${sekil("sldImg", [])}${sekil("body", [s.not])}</p:spTree></p:cSld></p:notes>`;
    }
  });
  // Sunum sırası slayt dosya adından farklı olabilir: presentation.xml sırası esas alınır.
  d["ppt/presentation.xml"] =
    `<?xml version="1.0"?><p:presentation ${P_NS}><p:sldIdLst>${sld.join("")}</p:sldIdLst></p:presentation>`;
  d["ppt/_rels/presentation.xml.rels"] =
    `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${rels.join("")}</Relationships>`;
  return zip(d);
}

const W_NS = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';

/** Elle yazılmış document.xml ile en küçük DOCX. */
export function docxHam(govde: string, ek: Record<string, string> = {}): Uint8Array {
  return zip({
    "[Content_Types].xml": CT,
    "word/document.xml": `<?xml version="1.0" encoding="UTF-8"?><w:document ${W_NS}><w:body>${govde}</w:body></w:document>`,
    ...ek,
  });
}

export const W_NS_ATTR = W_NS;
