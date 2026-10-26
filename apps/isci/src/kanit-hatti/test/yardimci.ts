// Test yardımcıları: göçlenmiş PGlite, bellek deposu, bellek kuyruğu, sahte YZ ve karışık belge paketi.
// Bütün adlar, numaralar ve kurumlar uydurmadır.

import { docxUret, xlsxUret } from "@akredit/belge";
import { bellekDepo } from "@akredit/depo";
import { gocleriUygula, pgliteBaglantisi, sema } from "@akredit/vt";
import { type Saglayici, type SohbetIstegi, sahteSaglayici } from "@akredit/yz";
import { strToU8, zipSync } from "fflate";
import type { HatBaglami } from "../baglam.ts";
import { kanitHattiniBaslat } from "../index.ts";
import { bellekKuyrugu } from "../kuyruk.ts";
import { pdfOlustur } from "./pdf-yardimci.ts";

export const KURUM = "01900000-0000-7000-8000-0000000000a1";
export const KURUM_B = "01900000-0000-7000-8000-0000000000b2";
/** Sağlaması geçerli uydurma T.C. kimlik numarası (test numarası). */
export const UYDURMA_TCKN = "10000000146";
export const OLCUTLER = [
  { kod: "A.1", ad: "Liderlik ve kalite" },
  { kod: "B.1", ad: "Program tasarımı" },
  { kod: "C.1", ad: "Araştırma stratejisi" },
];

/** 1024 boyutlu belirlenimci gömme. */
export function sahteGomme(m: string): number[] {
  const v = new Array<number>(1024).fill(0);
  v[0] = m.length;
  v[1] = m.codePointAt(0) ?? 0;
  return v;
}

/** İstekteki ilk atıf başlığını kullanarak geçerli sınıflama JSON'u üreten senaryo. */
export function siniflamaYaniti(istek: SohbetIstegi): string {
  const metin = istek.mesajlar.map((m) => m.icerik).join("\n");
  const atif = metin.match(/\[K:[0-9a-f]{8}[^\]]*\]/u)?.[0] ?? "[K:00000000]";
  return JSON.stringify({
    belgeTuru: "tutanak",
    olcutOnerileri: [{ olcutKod: "A.1", gerekce: "Kalite komisyonu toplantısı anlatılıyor.", atif, guven: 0.7 }],
  });
}

export function sahteYz(
  ayar: { yurtIci?: boolean } = {},
): Saglayici & { istekler: SohbetIstegi[]; gommeGirdileri: string[] } {
  const s = sahteSaglayici([siniflamaYaniti], { sonuTekrarla: true, yurtIci: ayar.yurtIci ?? true });
  const gommeGirdileri: string[] = [];
  return Object.assign(s, {
    gommeGirdileri,
    async gomme(metinler: string[]) {
      gommeGirdileri.push(...metinler);
      return metinler.map(sahteGomme);
    },
  });
}

export async function hatKur(ek: Partial<HatBaglami> = {}) {
  const baglanti = await pgliteBaglantisi();
  await gocleriUygula(baglanti.db);
  await baglanti.db.insert(sema.kurum).values([
    { id: KURUM, ad: "Uydurma Üniversitesi" },
    { id: KURUM_B, ad: "Başka Uydurma Üniversitesi" },
  ]);
  const depo = bellekDepo();
  const kuyruk = bellekKuyrugu();
  const b: HatBaglami = {
    db: baglanti.db,
    depo,
    kuyruk,
    saglayici: sahteYz(),
    olcutler: async () => OLCUTLER,
    yzAyari: async () => ({ yurtDisiIzin: false }),
    ...ek,
  };
  await kanitHattiniBaslat(b, {
    cikar: { yenidenDeneme: 1 },
    ocr: { yenidenDeneme: 1 },
    zenginlestir: { yenidenDeneme: 1 },
    sinifla: { yenidenDeneme: 1 },
  });
  return { b, depo, kuyruk, db: baglanti.db, kapat: baglanti.kapat };
}

const PNG_IMZA = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export interface OrnekBelge {
  ad: string;
  veri: Uint8Array;
  mime?: string;
  /** Beklenen son durum. */
  beklenen: "tamam" | "ocr" | "hata";
  kisiselVeri?: boolean;
}

/** n belgelik karışık paket: PDF, DOCX, XLSX, CSV, HTML, metin, Markdown, görsel (OCR), bozuk dosya. */
export async function karisikPaket(n: number): Promise<OrnekBelge[]> {
  const belgeler: OrnekBelge[] = [];
  for (let i = 0; i < n; i++) {
    const kv = i % 10 === 3;
    const ek = kv ? ` İletişim: ${UYDURMA_TCKN} numaralı kayıt.` : "";
    const cumle = `Kalite komisyonu ${i}. toplantısında program çıktılarını değerlendirdi.${ek}`;
    switch (i % 9) {
      case 0:
        belgeler.push({
          ad: `tutanak-${i}.pdf`,
          veri: pdfOlustur([
            [`Kalite komisyonu ${i}. toplantısı yapıldı.`, ...(ek ? [ek.trim()] : [])],
            ["İkinci sayfada toplantıya katılan birimlerin listesi yer almaktadır."],
          ]),
          beklenen: "tamam",
          kisiselVeri: kv,
        });
        break;
      case 1:
        belgeler.push({
          ad: `rapor-${i}.docx`,
          veri: await docxUret({
            baslik: `Faaliyet raporu ${i}`,
            bolumler: [{ baslik: "Giriş", duzey: 1, icerik: [{ tur: "paragraf", metin: cumle }] }],
          }),
          beklenen: "tamam",
          kisiselVeri: kv,
        });
        break;
      case 2:
        belgeler.push({
          ad: `tablo-${i}.xlsx`,
          veri: await xlsxUret([
            {
              ad: "Veri",
              basliklar: ["Ders", "Not"],
              satirlar: [
                [`Ders ${i}`, 70 + (i % 30)],
                [cumle, 1],
              ],
            },
          ]),
          beklenen: "tamam",
          kisiselVeri: kv,
        });
        break;
      case 3:
        belgeler.push({
          ad: `liste-${i}.csv`,
          veri: strToU8(`ad;deger\nsatir ${i};${cumle}\n`),
          beklenen: "tamam",
          kisiselVeri: kv,
        });
        break;
      case 4:
        belgeler.push({
          ad: `sayfa-${i}.html`,
          veri: strToU8(`<html><body><h1>Duyuru ${i}</h1><p>${cumle}</p></body></html>`),
          beklenen: "tamam",
          kisiselVeri: kv,
        });
        break;
      case 5:
        belgeler.push({ ad: `not-${i}.txt`, veri: strToU8(cumle), beklenen: "tamam", kisiselVeri: kv });
        break;
      case 6:
        belgeler.push({
          ad: `plan-${i}.md`,
          veri: strToU8(`# Plan ${i}\n\n${cumle}\n`),
          beklenen: "tamam",
          kisiselVeri: kv,
        });
        break;
      case 7:
        // Taranmış görsel: metin katmanı yok, OCR kuyruğuna gider.
        belgeler.push({
          ad: `tarama-${i}.png`,
          veri: new Uint8Array([...PNG_IMZA, i & 255, 1, 2, 3]),
          beklenen: "ocr",
        });
        break;
      default:
        // Bozuk Word dosyası: ZIP imzası var, içi bozuk.
        belgeler.push({
          ad: `bozuk-${i}.docx`,
          veri: new Uint8Array([0x50, 0x4b, 0x03, 0x04, i & 255, 9, 9, 9, 9, 9, 9, 9]),
          beklenen: "hata",
        });
    }
  }
  return belgeler;
}

export function zipYap(dosyalar: Record<string, Uint8Array>): Uint8Array {
  return zipSync(dosyalar);
}
