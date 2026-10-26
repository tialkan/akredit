// Rapor modelinden Word belgesi üretimi (docx kütüphanesi).

import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  LevelFormat,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import type { DocxIcerik, DocxModeli } from "./turler.ts";

const DIL = { value: "tr-TR" } as const;
const BASLIKLAR = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3] as const;

function baslikStili(id: string, ad: string, boyut: number) {
  return {
    id,
    name: ad,
    basedOn: "Normal",
    next: "Normal",
    quickFormat: true,
    run: { bold: true, size: boyut, font: "Calibri", language: DIL },
    paragraph: { spacing: { before: 240, after: 120 }, keepNext: true },
  };
}

function icerikOgeleri(i: DocxIcerik, listeNo: { n: number }): (Paragraph | Table)[] {
  switch (i.tur) {
    case "paragraf":
      if (i.vurgu === "eksik") {
        return [
          new Paragraph({
            children: [new TextRun({ text: i.metin, bold: true, color: "B00020", language: DIL })],
            shading: { type: ShadingType.CLEAR, fill: "FDECEA", color: "auto" },
            border: { left: { style: BorderStyle.SINGLE, size: 18, color: "B00020", space: 6 } },
          }),
        ];
      }
      if (i.vurgu === "not") {
        return [
          new Paragraph({
            children: [new TextRun({ text: i.metin, italics: true, language: DIL })],
            shading: { type: ShadingType.CLEAR, fill: "EEF3F8", color: "auto" },
            border: {
              top: { style: BorderStyle.SINGLE, size: 4, color: "7F9DB9", space: 4 },
              bottom: { style: BorderStyle.SINGLE, size: 4, color: "7F9DB9", space: 4 },
              left: { style: BorderStyle.SINGLE, size: 4, color: "7F9DB9", space: 4 },
              right: { style: BorderStyle.SINGLE, size: 4, color: "7F9DB9", space: 4 },
            },
          }),
        ];
      }
      return [new Paragraph({ children: [new TextRun({ text: i.metin, language: DIL })] })];
    case "madde": {
      const ref = i.numarali ? `numarali-${listeNo.n++}` : "madde";
      return i.maddeler.map(
        (m) =>
          new Paragraph({
            children: [new TextRun({ text: m, language: DIL })],
            numbering: { reference: ref, level: 0 },
          }),
      );
    }
    case "tablo": {
      const hucre = (metin: string, baslik: boolean) =>
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: metin, bold: baslik, language: DIL })] })],
          ...(baslik ? { shading: { type: ShadingType.CLEAR, fill: "D9E2F3", color: "auto" } } : {}),
        });
      const tablo = new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({ tableHeader: true, children: i.basliklar.map((b) => hucre(b, true)) }),
          ...i.satirlar.map((s) => new TableRow({ children: i.basliklar.map((_, k) => hucre(s[k] ?? "", false)) })),
        ],
      });
      const sonuc: (Paragraph | Table)[] = [tablo];
      if (i.aciklama) {
        sonuc.push(
          new Paragraph({ children: [new TextRun({ text: i.aciklama, italics: true, size: 18, language: DIL })] }),
        );
      }
      return sonuc;
    }
  }
}

function numaraliSayisi(model: DocxModeli): number {
  let n = 0;
  for (const b of model.bolumler) for (const i of b.icerik) if (i.tur === "madde" && i.numarali) n++;
  return n;
}

export async function docxYaz(model: DocxModeli): Promise<Uint8Array> {
  const govde: (Paragraph | Table)[] = [
    new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: model.baslik, language: DIL })] }),
  ];
  if (model.altBaslik) {
    govde.push(
      new Paragraph({ children: [new TextRun({ text: model.altBaslik, italics: true, size: 28, language: DIL })] }),
    );
  }
  const listeNo = { n: 0 };
  for (const b of model.bolumler) {
    if (b.baslik)
      govde.push(
        new Paragraph({ heading: BASLIKLAR[b.duzey - 1], children: [new TextRun({ text: b.baslik, language: DIL })] }),
      );
    for (const i of b.icerik) govde.push(...icerikOgeleri(i, listeNo));
  }
  const numaraliTanimlar = Array.from({ length: numaraliSayisi(model) }, (_, k) => ({
    reference: `numarali-${k}`,
    levels: [
      {
        level: 0,
        format: LevelFormat.DECIMAL,
        text: "%1.",
        alignment: AlignmentType.START,
        style: { paragraph: { indent: { left: 720, hanging: 360 } } },
      },
    ],
  }));
  const belge = new Document({
    creator: "Akredit",
    title: model.baslik,
    styles: {
      default: { document: { run: { font: "Calibri", size: 22, language: DIL } } },
      paragraphStyles: [
        baslikStili("Heading1", "Heading 1", 32),
        baslikStili("Heading2", "Heading 2", 28),
        baslikStili("Heading3", "Heading 3", 24),
      ],
    },
    numbering: {
      config: [
        {
          reference: "madde",
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: "•",
              alignment: AlignmentType.START,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
          ],
        },
        ...numaraliTanimlar,
      ],
    },
    sections: [
      {
        headers: model.ustBilgi
          ? {
              default: new Header({
                children: [
                  new Paragraph({
                    alignment: AlignmentType.RIGHT,
                    children: [new TextRun({ text: model.ustBilgi, size: 18, language: DIL })],
                  }),
                ],
              }),
            }
          : undefined,
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  ...(model.altBilgi ? [new TextRun({ text: `${model.altBilgi} · `, size: 18, language: DIL })] : []),
                  new TextRun({ children: ["Sayfa ", PageNumber.CURRENT, " / ", PageNumber.TOTAL_PAGES], size: 18 }),
                ],
              }),
            ],
          }),
        },
        children: govde,
      },
    ],
  });
  const tampon = await Packer.toBuffer(belge);
  return new Uint8Array(tampon);
}
