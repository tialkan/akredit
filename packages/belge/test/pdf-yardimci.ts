// Testler için en küçük PDF üretici. Türkçe karakterler için Type0 (Identity-H) yazı tipi ve ToUnicode
// eşlemesi kullanılır: her ayrı karaktere bir CID verilir, metin çıkarıcı Unicode'u eşlemeden okur.

export function pdfOlustur(sayfalar: string[][]): Uint8Array {
  const karakterler = [...new Set(sayfalar.flat().join(""))];
  const cid = new Map(karakterler.map((c, i) => [c, i + 1]));
  const hex = (n: number) => n.toString(16).padStart(4, "0").toUpperCase();
  const nesneler: string[] = [];
  const ekle = (s: string) => {
    nesneler.push(s);
    return nesneler.length;
  };
  const katalog = ekle("");
  const sayfalarNo = ekle("");
  const bfchar = karakterler
    .map((c) => {
      const u = [...Buffer.from(c, "utf16le")].reduce<string[]>((a, b, i, d) => {
        if (i % 2 === 0) a.push(hex(((d[i + 1] as number) << 8) | b));
        return a;
      }, []);
      return `<${hex(cid.get(c) as number)}> <${u.join("")}>`;
    })
    .join("\n");
  const cmap = `/CIDInit /ProcSet findresource begin 12 dict begin begincmap
/CIDSystemInfo << /Registry (Adobe) /Ordering (UCS) /Supplement 0 >> def
/CMapName /Adobe-Identity-UCS def /CMapType 2 def
1 begincodespacerange <0000> <FFFF> endcodespacerange
${karakterler.length} beginbfchar
${bfchar}
endbfchar
endcmap CMapName currentdict /CMap defineresource pop end end`;
  const cmapNo = ekle(`<< /Length ${Buffer.byteLength(cmap, "latin1")} >>\nstream\n${cmap}\nendstream`);
  const tanimNo = ekle(
    "<< /Type /FontDescriptor /FontName /Deneme /Flags 32 /FontBBox [0 0 1000 1000] /ItalicAngle 0 /Ascent 800 /Descent -200 /CapHeight 700 /StemV 80 >>",
  );
  const cidNo = ekle(
    `<< /Type /Font /Subtype /CIDFontType2 /BaseFont /Deneme /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ${tanimNo} 0 R /DW 600 /CIDToGIDMap /Identity >>`,
  );
  const fontNo = ekle(
    `<< /Type /Font /Subtype /Type0 /BaseFont /Deneme /Encoding /Identity-H /DescendantFonts [${cidNo} 0 R] /ToUnicode ${cmapNo} 0 R >>`,
  );
  const sayfaNolari: number[] = [];
  for (const satirlar of sayfalar) {
    let akis = "BT /F1 12 Tf 14 TL 72 720 Td\n";
    for (const s of satirlar) akis += `<${[...s].map((c) => hex(cid.get(c) as number)).join("")}> Tj T*\n`;
    akis += "ET";
    if (satirlar.length === 0) akis = "0 0 1 rg 72 72 200 200 re f";
    const akisNo = ekle(`<< /Length ${akis.length} >>\nstream\n${akis}\nendstream`);
    sayfaNolari.push(
      ekle(
        `<< /Type /Page /Parent ${sayfalarNo} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontNo} 0 R >> >> /Contents ${akisNo} 0 R >>`,
      ),
    );
  }
  nesneler[katalog - 1] = `<< /Type /Catalog /Pages ${sayfalarNo} 0 R >>`;
  nesneler[sayfalarNo - 1] =
    `<< /Type /Pages /Kids [${sayfaNolari.map((n) => `${n} 0 R`).join(" ")}] /Count ${sayfaNolari.length} >>`;
  let cikti = "%PDF-1.7\n";
  const konumlar: number[] = [];
  nesneler.forEach((n, i) => {
    konumlar.push(Buffer.byteLength(cikti, "latin1"));
    cikti += `${i + 1} 0 obj\n${n}\nendobj\n`;
  });
  const xref = Buffer.byteLength(cikti, "latin1");
  cikti += `xref\n0 ${nesneler.length + 1}\n0000000000 65535 f \n`;
  for (const k of konumlar) cikti += `${String(k).padStart(10, "0")} 00000 n \n`;
  cikti += `trailer\n<< /Size ${nesneler.length + 1} /Root ${katalog} 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new Uint8Array(Buffer.from(cikti, "latin1"));
}
