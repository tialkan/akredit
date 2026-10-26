// Excel okuma ve yazma (exceljs). Okumadan önce ZIP sınırları ayrıca denetlenir (bkz. index.ts).

import ExcelJS from "exceljs";
import type { HucreDegeri, XlsxSayfasi } from "./turler.ts";

/** exceljs hücre değerini ham değere çevirir: tarih ISO metin, formülde hesaplanmış sonuç. */
export function hucreDegeri(v: unknown): HucreDegeri {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" || typeof v === "string") return v;
  if (typeof v === "boolean") return v ? "DOĞRU" : "YANLIŞ";
  if (v instanceof Date) return tarihMetni(v);
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if ("richText" in o && Array.isArray(o.richText)) {
      return (o.richText as { text?: string }[]).map((p) => p.text ?? "").join("");
    }
    if ("formula" in o || "sharedFormula" in o) return hucreDegeri(o.result);
    if ("text" in o) return hucreDegeri(o.text);
    if ("error" in o) return String(o.error);
  }
  return null;
}

/** Saat bileşeni yoksa yalnız tarih (YYYY-AA-GG), varsa tam ISO. */
export function tarihMetni(t: Date): string {
  const iso = t.toISOString();
  return iso.endsWith("T00:00:00.000Z") ? iso.slice(0, 10) : iso;
}

export async function xlsxSayfalari(veri: Uint8Array): Promise<{ ad: string; satirlar: HucreDegeri[][] }[]> {
  const kitap = new ExcelJS.Workbook();
  // exceljs Node Buffer bekler.
  await kitap.xlsx.load(Buffer.from(veri.buffer, veri.byteOffset, veri.byteLength) as never);
  const sonuc: { ad: string; satirlar: HucreDegeri[][] }[] = [];
  kitap.eachSheet((sayfa) => {
    const satirlar: HucreDegeri[][] = [];
    const satirSayisi = sayfa.actualRowCount === 0 ? 0 : sayfa.rowCount;
    const sutunSayisi = sayfa.columnCount;
    for (let r = 1; r <= satirSayisi; r++) {
      const satir: HucreDegeri[] = [];
      const row = sayfa.getRow(r);
      for (let c = 1; c <= sutunSayisi; c++) {
        const hucre = row.getCell(c);
        // Birleştirilmiş hücrede değer yalnız sol üst (ana) hücrede kalır.
        if (hucre.isMerged && hucre.master.address !== hucre.address) satir.push(null);
        else satir.push(hucreDegeri(hucre.value));
      }
      while (satir.length > 0 && satir[satir.length - 1] === null) satir.pop();
      satirlar.push(satir);
    }
    while (satirlar.length > 0 && (satirlar[satirlar.length - 1] as HucreDegeri[]).length === 0) satirlar.pop();
    sonuc.push({ ad: sayfa.name, satirlar });
  });
  return sonuc;
}

/** 1 → A, 27 → AA */
export function sutunHarfi(n: number): string {
  let s = "";
  let k = n;
  while (k > 0) {
    const m = (k - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    k = Math.floor((k - 1) / 26);
  }
  return s;
}

/** Excel sayfa adı en çok 31 karakter ve \ / ? * [ ] : içeremez. */
function sayfaAdi(ad: string, kullanilan: Set<string>): string {
  let temel =
    ad
      .replace(/[\\/?*[\]:]/g, " ")
      .trim()
      .slice(0, 31) || "Sayfa";
  let i = 2;
  let aday = temel;
  while (kullanilan.has(aday.toLocaleLowerCase("tr"))) {
    const ek = ` (${i++})`;
    temel = temel.slice(0, 31 - ek.length);
    aday = temel + ek;
  }
  kullanilan.add(aday.toLocaleLowerCase("tr"));
  return aday;
}

export async function xlsxYaz(sayfalar: XlsxSayfasi[]): Promise<Uint8Array> {
  const kitap = new ExcelJS.Workbook();
  kitap.creator = "Akredit";
  const kullanilan = new Set<string>();
  for (const s of sayfalar) {
    const ws = kitap.addWorksheet(sayfaAdi(s.ad, kullanilan), {
      views: [{ state: "frozen", ySplit: 1 }],
    });
    ws.addRow(s.basliklar);
    ws.getRow(1).font = { bold: true };
    for (const satir of s.satirlar) ws.addRow(satir);
    const sutun = Math.max(s.basliklar.length, ...s.satirlar.map((r) => r.length));
    for (let c = 1; c <= sutun; c++) {
      let en = 0;
      const degerler = [s.basliklar[c - 1], ...s.satirlar.map((r) => r[c - 1])];
      for (const d of degerler) {
        if (d === null || d === undefined) continue;
        for (const parca of String(d).split("\n")) en = Math.max(en, parca.length);
      }
      ws.getColumn(c).width = Math.min(Math.max(en + 2, 8), 60);
    }
  }
  const tampon = await kitap.xlsx.writeBuffer();
  return new Uint8Array(tampon as ArrayBuffer);
}
