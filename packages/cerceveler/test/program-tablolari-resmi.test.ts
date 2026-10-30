// İP-47 resmî metin doğrulaması: program akreditasyonu çerçevelerinin her başlığı, metni ve örnek
// kanıtı ile ÖDR tablo tanımlarının başlık, sütun ve dayanak metinleri kaynak belgede birebir geçmeli.
// Belgeler kaynaklar/resmi/ altındadır; PDF'ler @akredit/belge ile, Word şablonları zip içinden okunur.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";
import { metinCikar } from "@akredit/belge";
import { beforeAll, describe, expect, it } from "vitest";
import {
  EPDAD_OGRETMEN_1_1_HAM,
  EPDAD_RPD_HAM,
  FEDEK_4_1_HAM,
  type KaynakBelge,
  MUDEK_LISANS_3_1_HAM,
  MUDEK_YL_2_0_HAM,
  normalize,
  PROGRAM_BELGELERI,
  PROGRAM_CERCEVELERI,
  type ProgramOlcutHam,
  SABAK_R4_HAM,
  TABLO_TANIMLARI,
  tumOlcutler,
  UST_BILGI,
} from "../src/index.ts";

const KOK = new URL("../../../kaynaklar/resmi/", import.meta.url);
const sayfalar = new Map<string, string[]>();
const wordMetni = new Map<string, string>();

/** Word (.docx) dosyasından word/document.xml metni: paragraflar boşlukla, koşular bitişik birleşir. */
function docxMetni(veri: Buffer): string {
  let eocd = veri.length - 22;
  while (eocd >= 0 && veri.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  const adet = veri.readUInt16LE(eocd + 10);
  let p = veri.readUInt32LE(eocd + 16);
  for (let i = 0; i < adet; i++) {
    const yontem = veri.readUInt16LE(p + 10);
    const boyut = veri.readUInt32LE(p + 20);
    const adUz = veri.readUInt16LE(p + 28);
    const ekUz = veri.readUInt16LE(p + 30);
    const yorumUz = veri.readUInt16LE(p + 32);
    const yerel = veri.readUInt32LE(p + 42);
    const ad = veri.subarray(p + 46, p + 46 + adUz).toString("utf8");
    if (ad === "word/document.xml") {
      const bas = yerel + 30 + veri.readUInt16LE(yerel + 26) + veri.readUInt16LE(yerel + 28);
      const ham = veri.subarray(bas, bas + boyut);
      const xml = (yontem === 8 ? inflateRawSync(ham) : ham).toString("utf8");
      return normalize(
        xml
          .replace(/<\/w:p>/gu, " ")
          .replace(/<w:tab\/>/gu, " ")
          .replace(/<[^>]+>/gu, "")
          .replace(/&amp;/gu, "&")
          .replace(/&lt;/gu, "<")
          .replace(/&gt;/gu, ">")
          .replace(/&quot;/gu, '"')
          .replace(/&apos;/gu, "'"),
      );
    }
    p += 46 + adUz + ekUz + yorumUz;
  }
  throw new Error("word/document.xml bulunamadı");
}

async function oku(b: KaynakBelge): Promise<void> {
  const dosya = b.dosya ?? "";
  if (sayfalar.has(dosya) || wordMetni.has(dosya)) return;
  const veri = readFileSync(new URL(dosya, KOK));
  expect(createHash("sha256").update(veri).digest("hex"), dosya).toBe(b.sha256);
  if (dosya.endsWith(".docx")) {
    wordMetni.set(dosya, docxMetni(veri));
    return;
  }
  const m = await metinCikar(new Uint8Array(veri));
  const ust = UST_BILGI[dosya];
  const dizi: string[] = [];
  for (const bl of m.bolumler) {
    const s = normalize(bl.metin);
    dizi[(bl.capa.sayfa ?? 1) - 1] = ust ? s.replace(ust, "").trim() : s;
  }
  sayfalar.set(dosya, dizi);
}

/** Metin belgenin verilen sayfasında (ya da sonraki sayfaya taşarak) birebir geçiyor mu? */
function sayfadaGecer(dosya: string, sayfa: number, metin: string): boolean {
  const s = sayfalar.get(dosya);
  if (!s) throw new Error(`Belge okunmadı: ${dosya}`);
  return `${s[sayfa - 1] ?? ""} ${s[sayfa] ?? ""}`.includes(normalize(metin));
}

const BELGELER = Object.values(PROGRAM_BELGELERI) as KaynakBelge[];

beforeAll(async () => {
  for (const b of BELGELER) await oku(b);
}, 240_000);

describe("İP-47 resmî belgeler", () => {
  it("adres, dosya ve SHA-256 kaynaklar.json kaydıyla aynı; dosyanın özeti tutuyor", () => {
    const kayit = JSON.parse(readFileSync(new URL("kaynaklar.json", KOK), "utf8")) as {
      adres: string;
      dosya?: string;
      sha256?: string;
    }[];
    for (const b of BELGELER) {
      const k = kayit.find((x) => x.dosya === b.dosya);
      expect(k, b.dosya ?? "").toBeDefined();
      expect(k?.sha256).toBe(b.sha256);
      expect(k?.adres).toBe(b.adres);
    }
  });
});

const HAM: [string, string, readonly ProgramOlcutHam[]][] = [
  ["mudek-lisans", PROGRAM_BELGELERI.mudekLisans31.dosya, MUDEK_LISANS_3_1_HAM],
  ["mudek-yl", PROGRAM_BELGELERI.mudekYl20.dosya, MUDEK_YL_2_0_HAM],
  ["fedek-lisans", PROGRAM_BELGELERI.fedek41.dosya, FEDEK_4_1_HAM],
  ["sabak-genel", PROGRAM_BELGELERI.sabakR4.dosya, SABAK_R4_HAM],
  ["epdad-ogretmen", PROGRAM_BELGELERI.epdadKilavuz11.dosya, EPDAD_OGRETMEN_1_1_HAM],
  ["epdad-rpd", PROGRAM_BELGELERI.epdadRpd.dosya, EPDAD_RPD_HAM],
];

describe.each(HAM)("%s ölçüt metni", (kod, dosya, ham) => {
  it("her başlık, metin ve örnek kanıt belgenin kaynak sayfasında birebir geçer", () => {
    const eksik: string[] = [];
    for (const h of ham) {
      if (!sayfadaGecer(dosya, h.sayfa, h.baslik)) eksik.push(`${h.kod} başlık`);
      if (!sayfadaGecer(dosya, h.sayfa, h.metin)) eksik.push(`${h.kod} metin`);
      for (const k of "kanitlar" in h ? (h.kanitlar as { metin: string; sayfa: number }[]) : [])
        if (!sayfadaGecer(dosya, k.sayfa, k.metin)) eksik.push(`${h.kod} kanıt: ${k.metin.slice(0, 40)}`);
    }
    expect(eksik).toEqual([]);
  });

  it("çerçeve ağacı ham satırlarla birebir aynı ve hepsi resmî", () => {
    const c = PROGRAM_CERCEVELERI.find((x) => x.kod === kod);
    const hepsi = tumOlcutler(c?.olcutler ?? []);
    expect(hepsi.map((o) => o.kod)).toEqual(ham.map((h) => h.kod));
    expect(hepsi.every((o) => o.metinDurumu === "resmi" && o.baslikDurumu === "resmi")).toBe(true);
    expect(c?.dogrulandi).toBe(false);
  });
});

describe("ölçüt sayıları belgeden elle sayıldı", () => {
  const say = (ham: readonly ProgramOlcutHam[], desen: RegExp) => ham.filter((h) => desen.test(h.kod)).length;
  const ANA = /^\d+$/u;
  const ALT = /^\d+\.\d+$/u;
  const ALT3 = /^\d+\.\d+\.\d+$/u;
  const CIKTI = /\.C\d+$/u;

  it("MÜDEK lisans 3.1: 9 ölçüt, 31 alt ölçüt, 11 MÜDEK Çıktısı (s. 6-10)", () => {
    // Ölçüt 1: 1.1-1.6 (6), 2: 2.1-2.3 (3), 3: 3.1-3.3 (3), 4: 4.1-4.2 (2), 5: 5.1-5.5 (5),
    // 6: 6.1-6.3 (3), 7: 7.1-7.5 (5), 8: 8.1-8.4 (4), 9: alt maddesi yok (0) → 31.
    // Tablo 3.1 MÜDEK Çıktıları 1-11 (s. 7-8); belge "11 çıktıdan oluşmaktadır" diyor.
    expect(say(MUDEK_LISANS_3_1_HAM, ANA)).toBe(9);
    expect(say(MUDEK_LISANS_3_1_HAM, ALT)).toBe(31);
    expect(say(MUDEK_LISANS_3_1_HAM, CIKTI)).toBe(11);
    expect(sayfadaGecer(PROGRAM_BELGELERI.mudekLisans31.dosya, 7, "11 çıktıdan oluşmaktadır")).toBe(true);
  });

  it("MÜDEK YL 2.0: 9 ölçüt, 30 alt ölçüt, 11 çıktı (s. 6-10)", () => {
    // Lisanstan farkı: Ölçüt 5'te 5.1-5.4 (4) → 6+3+3+2+4+3+5+4 = 30.
    expect(say(MUDEK_YL_2_0_HAM, ANA)).toBe(9);
    expect(say(MUDEK_YL_2_0_HAM, ALT)).toBe(30);
    expect(say(MUDEK_YL_2_0_HAM, CIKTI)).toBe(11);
  });

  it("FEDEK 4.1: 10 genel ölçüt, 40 alt ölçüt, 11 FEDEK çıktısı (s. 3-6)", () => {
    // 1: 1.1.-1.7. (7), 2: 3, 3: 3, 4: 4.1.-4.5. (5), 5: 4, 6: 4, 7: 7.1.-7.6. (6), 8: 4, 9: 2, 10: 2 → 40.
    // Tablo 3.1 FEDEK Çıktıları I-XI. Programa özgü ölçütler (II. bölüm) kapsam dışı.
    expect(say(FEDEK_4_1_HAM, ANA)).toBe(10);
    expect(say(FEDEK_4_1_HAM, ALT)).toBe(40);
    expect(say(FEDEK_4_1_HAM, CIKTI)).toBe(11);
  });

  it("SABAK R4: 9 ölçüt, 50 ölçüt maddesi, 37 alt madde, 11 SABAK çıktısı (s. 2-9)", () => {
    // İkinci düzey: 1.1-1.9 (9), 2.1-2.6 (6), 3.1-3.9 (9), 4.1-4.6 (6), 5.1-5.7 (7), 6.1-6.6 (6),
    // 7.1-7.4 (4), 8.1-8.2 (2), 9.1 (1) → 50.
    // Üçüncü düzey: 1.1.1-4, 1.4.1-4, 1.5.1-5, 1.6.1-2, 1.7.1, 1.8.1-2 (18); 2.4.1-2, 2.6.1 (3);
    // 3.1.1-4, 3.2.1-2, 3.4.1-3 (9); 4.1.1-2, 4.2.1-3, 4.5.1-2 (7) → 37. Tablo 1 SABAK Çıktıları I-XI.
    expect(say(SABAK_R4_HAM, ANA)).toBe(9);
    expect(say(SABAK_R4_HAM, ALT)).toBe(50);
    expect(say(SABAK_R4_HAM, ALT3)).toBe(37);
    expect(say(SABAK_R4_HAM, CIKTI)).toBe(11);
  });

  it("EPDAD öğretmen eğitimi 1.1: 7 standart alanı, 39 alt standart (kılavuz s. 7)", () => {
    // Alanlara göre: 8 + 7 + 3 + 4 + 8 + 6 + 3 = 39. Kılavuz: "39 Alt Standart ve 158 Göstergeden oluşmaktadır".
    expect(say(EPDAD_OGRETMEN_1_1_HAM, ANA)).toBe(7);
    expect(say(EPDAD_OGRETMEN_1_1_HAM, ALT3)).toBe(39);
    expect(
      sayfadaGecer(PROGRAM_BELGELERI.epdadKilavuz11.dosya, 7, "39 Alt Standart ve 158 Göstergeden oluşmaktadır"),
    ).toBe(true);
    // Her alt standardın kılavuzda kanıt listesi ya da kanıt cümlesi var.
    expect(EPDAD_OGRETMEN_1_1_HAM.filter((h) => h.kod.includes(".")).every((h) => h.kanitlar.length > 0)).toBe(true);
  });

  it("EPDAD RPD: 7 alan, 40 standart (s. 1-3)", () => {
    // 1: 1.1.1-1.1.3, 1.2.1-1.2.4, 1.3.1 (8); 2: 7; 3: 3; 4: 4.1.1, 4.1.2, 4.2.1, 4.2.2, 4.3.1 (5);
    // 5: 5.1.1-5.1.4, 5.2.1-2, 5.3.1-2 (8); 6: 6; 7: 3 → 40.
    expect(say(EPDAD_RPD_HAM, ANA)).toBe(7);
    expect(say(EPDAD_RPD_HAM, ALT3)).toBe(40);
  });
});

describe("ÖDR tablo tanımları resmî şablonla örtüşür", () => {
  it.each(TABLO_TANIMLARI.map((t) => [t.kod, t] as const))("%s", (_, t) => {
    const dosya = t.kaynak.dosya ?? "";
    const gecer = (metin: string) =>
      dosya.endsWith(".docx")
        ? (wordMetni.get(dosya) ?? "").includes(normalize(metin))
        : sayfadaGecer(dosya, t.sayfa ?? 0, metin);
    const parcalar = [["dayanak", t.dayanak], ...t.sutunlar.map((s) => [`sütun ${s.kod}`, s.belgeMetni ?? s.baslik])];
    if (t.baslikDurumu === "resmi") parcalar.push(["başlık", t.baslik]);
    expect(parcalar.filter(([, m]) => !gecer(m ?? "")).map(([a]) => a)).toEqual([]);
    if (dosya.endsWith(".pdf")) expect(t.sayfa).not.toBeNull();
  });
});
