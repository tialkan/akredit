// OCR: kurum içinde, Tesseract (Türkçe dil verisi `tur`) ile. Belge hiçbir dış hizmete gitmez.
// PDF önce `pdftoppm` ile sayfa görüntülerine çevrilir. Komut çalıştırıcı test için değiştirilebilir.

import { execFile } from "node:child_process";
import { mkdtemp, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export interface OcrSayfasi {
  sayfa: number;
  metin: string;
}

export interface OcrMotoru {
  readonly ad: string;
  oku(veri: Uint8Array, tur: "pdf" | "gorsel"): Promise<OcrSayfasi[]>;
}

export type KomutCalistirici = (komut: string, argumanlar: string[], sureMs: number) => Promise<string>;

export const varsayilanCalistirici: KomutCalistirici = (komut, argumanlar, sureMs) =>
  new Promise((coz, reddet) => {
    execFile(komut, argumanlar, { timeout: sureMs, maxBuffer: 64 * 1024 * 1024 }, (hata, cikti) => {
      if (hata) reddet(new Error("Taranmış belge okunamadı."));
      else coz(cikti);
    });
  });

export interface TesseractAyari {
  dil?: string;
  /** Sayfa başına süre sınırı (ms). */
  sureMs?: number;
  /** PDF'te en çok kaç sayfa okunsun. */
  enCokSayfa?: number;
  calistirici?: KomutCalistirici;
}

export function tesseractOcr(ayar: TesseractAyari = {}): OcrMotoru {
  const dil = ayar.dil ?? "tur";
  const sure = ayar.sureMs ?? 120_000;
  const calistir = ayar.calistirici ?? varsayilanCalistirici;
  return {
    ad: `tesseract-${dil}`,
    async oku(veri, tur) {
      const dizin = await mkdtemp(join(tmpdir(), "akredit-ocr-"));
      try {
        const girdi = join(dizin, tur === "pdf" ? "belge.pdf" : "belge.img");
        await writeFile(girdi, veri);
        let goruntuler = [girdi];
        if (tur === "pdf") {
          const son = String(ayar.enCokSayfa ?? 300);
          await calistir("pdftoppm", ["-r", "300", "-l", son, "-png", girdi, join(dizin, "s")], sure);
          goruntuler = (await readdir(dizin))
            .filter((a) => /^s-\d+\.png$/u.test(a))
            .sort((a, b) => Number(a.match(/\d+/u)?.[0]) - Number(b.match(/\d+/u)?.[0]))
            .map((a) => join(dizin, a));
        }
        const sayfalar: OcrSayfasi[] = [];
        for (const [i, g] of goruntuler.entries()) {
          const metin = await calistir("tesseract", [g, "stdout", "-l", dil, "--psm", "1"], sure);
          sayfalar.push({ sayfa: i + 1, metin: metin.trim() });
        }
        return sayfalar;
      } finally {
        await rm(dizin, { recursive: true, force: true });
      }
    },
  };
}

/** Verilen işlevle çalışan motor (testler ve başka OCR hizmetleri için). */
export function islevOcr(ad: string, f: (veri: Uint8Array, tur: "pdf" | "gorsel") => OcrSayfasi[]): OcrMotoru {
  return { ad, oku: async (v, t) => f(v, t) };
}
