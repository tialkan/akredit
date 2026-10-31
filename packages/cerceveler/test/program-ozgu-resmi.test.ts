// İP-47 resmî metin doğrulaması (ek içerik): MÜDEK EK-1 disipline özgü konular, FEDEK programa özgü ölçütler,
// EPDAD 1.1 göstergeleri ve dörtlü dereceli puanlama anahtarı. Her öğe kaynak belgenin kendi sayfasında birebir
// aranır; belge dosyasının SHA-256 özeti öğedeki özetle aynı olmalı. Sayılar belgeden elle sayıldı (yorumlarda).

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { metinCikar } from "@akredit/belge";
import { beforeAll, describe, expect, it } from "vitest";
import {
  altStandartGostergeleri,
  EPDAD_DERECELENDIRME_ANAHTARI,
  EPDAD_GOSTERGELERI,
  EPDAD_OGRETMEN_1_1_HAM,
  FEDEK_PROGRAMA_OZGU,
  MUDEK_EK1,
  normalize,
  type OzguBolum,
  type OzguKaynak,
  ozguBolum,
  PROGRAM_BELGELERI,
  UST_BILGI,
} from "../src/index.ts";

const KOK = new URL("../../../kaynaklar/resmi/", import.meta.url);
const sayfalar = new Map<string, string[]>();
const ozetler = new Map<string, string>();

async function oku(dosya: string): Promise<void> {
  const veri = readFileSync(new URL(dosya, KOK));
  ozetler.set(dosya, createHash("sha256").update(veri).digest("hex"));
  const m = await metinCikar(new Uint8Array(veri));
  const ust = UST_BILGI[dosya];
  const dizi: string[] = [];
  for (const bl of m.bolumler) {
    const s = normalize(bl.metin);
    dizi[(bl.capa.sayfa ?? 1) - 1] = ust ? s.replace(ust, "").trim() : s;
  }
  sayfalar.set(dosya, dizi);
}

function sayfa(k: OzguKaynak, n: number): string {
  return sayfalar.get(k.dosya)?.[n - 1] ?? "";
}

/** Metin kaynağın sayfasında (ya da sonraki sayfaya taşarak) birebir geçiyor mu? */
function gecer(k: OzguKaynak, metin: string): boolean {
  return `${sayfa(k, k.sayfa)} ${sayfa(k, k.sayfa + 1)}`.includes(normalize(metin));
}

/**
 * Tablo hücresi sayfa sonunda bölünebilir; o zaman başı kaynak sayfada, devamı sonraki sayfada (sayfa
 * başındaki başka hücrelerden sonra) birebir geçer. Hücre hiçbir zaman parçalardan uydurulmaz: iki parça da
 * belgede sözcük sınırında aranır.
 */
function hucreGecer(k: OzguKaynak, metin: string): boolean {
  if (gecer(k, metin)) return true;
  const s = normalize(metin).split(" ");
  for (let i = 1; i < s.length; i++) {
    const bas = s.slice(0, i).join(" ");
    const son = s.slice(i).join(" ");
    if (sayfa(k, k.sayfa).endsWith(bas) && sayfa(k, k.sayfa + 1).includes(son)) return true;
    if (sayfa(k, k.sayfa).includes(`${bas} `) && sayfa(k, k.sayfa + 1).includes(son)) return true;
  }
  return false;
}

beforeAll(async () => {
  for (const b of [PROGRAM_BELGELERI.mudekLisans31, PROGRAM_BELGELERI.fedek41, PROGRAM_BELGELERI.epdadKilavuz11])
    await oku(b.dosya);
}, 240_000);

function bolumDenetimi(bolumler: readonly OzguBolum[]): string[] {
  const eksik: string[] = [];
  for (const b of bolumler) {
    if (ozetler.get(b.kaynak.dosya) !== b.kaynak.sha256) eksik.push(`${b.kod} özet`);
    if (!gecer(b.kaynak, b.baslik)) eksik.push(`${b.kod} başlık`);
    if (!gecer(b.kaynak, b.giris)) eksik.push(`${b.kod} giriş`);
    for (const k of b.konular) {
      if (k.kaynak.sha256 !== b.kaynak.sha256) eksik.push(`${b.kod} konu özeti`);
      if (!gecer(k.kaynak, k.metin)) eksik.push(`${b.kod}: ${k.metin.slice(0, 50)}`);
      // Alt başlık konudan önce, aynı ya da önceki sayfada geçer.
      if (k.grup && !`${sayfa(k.kaynak, k.kaynak.sayfa - 1)} ${sayfa(k.kaynak, k.kaynak.sayfa)}`.includes(k.grup))
        eksik.push(`${b.kod} grup: ${k.grup.slice(0, 50)}`);
    }
  }
  return eksik;
}

describe("MÜDEK lisans 3.1 EK-1 disipline özgü eğitim planı konuları", () => {
  it("her başlık, giriş, konu ve alt başlık belgenin kaynak sayfasında birebir geçer; özet tutar", () => {
    expect(bolumDenetimi(MUDEK_EK1.bolumler)).toEqual([]);
    expect(gecer(MUDEK_EK1.not.kaynak, MUDEK_EK1.not.metin)).toBe(true);
    expect(MUDEK_EK1.not.kaynak.sha256).toBe(PROGRAM_BELGELERI.mudekLisans31.sha256);
  });

  it("26 disiplin kümesi, 172 konu (s. 11-23, elle sayıldı)", () => {
    // İçindekiler (s. 2) "II. EK-1" altında 26 disiplin sayar; gövdede de 26 "... ADLI MÜHENDİSLİK
    // PROGRAMLARININ DİSİPLİNE ÖZGÜ EĞİTİM PLANI KONULARI" başlığı var. Madde işaretli (•) konular:
    // bilgisayar-yazılım 11 (ortak 2, bilgisayar 1, yazılım 3, yapay zekâ 5), biyomühendislik 4, çevre 5,
    // deri 5, elektrik-elektronik 6, endüstri 4, enerji 11, fizik 3, gemi-deniz 10, gemi makinaları 9,
    // geomatik 2, gıda 6, havacılık 5, imalat 9, inşaat 6, jeofizik 4, jeoloji 9, kimya 6, maden 6, makina 3,
    // mekatronik 7, metalurji 7, orman 10, otomotiv 10, petrol 8, tekstil 6 → 172. "o" ile başlayan iç maddeler
    // bağlı oldukları konunun metninde kalır (ör. fizik ve geomatik).
    expect(MUDEK_EK1.bolumler).toHaveLength(26);
    expect(MUDEK_EK1.bolumler.reduce((n, b) => n + b.konular.length, 0)).toBe(172);
    expect(ozguBolum("mudek-lisans", "bilgisayar-yazilim")?.konular.map((k) => k.grup)).toEqual([
      "Ortak Konular:",
      "Ortak Konular:",
      "Adında “bilgisayar” nitelemesi bulunan programlar için yukarıdaki ortak konulara ek olarak kapsanması gereken konular:",
      ...Array(3).fill(
        "Adında “yazılım” nitelemesi bulunan programlar için yukarıdaki ortak konulara ek olarak kapsanması gereken konular:",
      ),
      ...Array(5).fill(
        'Adında “yapay zekâ”, "yapay zekâ ve veri bilimi" nitelemesi bulunan programlar için yukarıdaki ortak konulara ek olarak kapsanması gereken konular:',
      ),
    ]);
  });
});

describe("FEDEK 4.1 programa özgü ölçütler", () => {
  it("her başlık, giriş ve madde belgenin kaynak sayfasında birebir geçer; özet tutar", () => {
    expect(bolumDenetimi(FEDEK_PROGRAMA_OZGU)).toEqual([]);
  });

  it("27 program, 242 madde (s. 7-17, elle sayıldı)", () => {
    // İçindekiler (s. 2) "PROGRAMA ÖZGÜ ÖLÇÜTLER" altında 27 program sayar. Maddeler (•): Alman 8, Amerikan 8,
    // antropoloji 10, Arap 8, arkeoloji 10, astronomi 5, bilgi ve belge 7, bilgisayar bilimleri 13, biyoloji 10,
    // coğrafya 12, Çağdaş Türk lehçeleri 9, Çağdaş Yunan 7, felsefe 12, fizik 8, Fransız 8, İngiliz 8,
    // istatistik 9, kimya 6, matematik 11, moleküler biyoloji ve genetik 11, mütercim-tercümanlık 13,
    // psikoloji 12, Rus 8, sanat tarihi 6, sosyoloji 5, tarih 10, Türk dili 8 → 242.
    expect(FEDEK_PROGRAMA_OZGU).toHaveLength(27);
    expect(FEDEK_PROGRAMA_OZGU.reduce((n, b) => n + b.konular.length, 0)).toBe(242);
    expect(ozguBolum("fedek-lisans", "alman-dili-ve-edebiyati")?.konular).toHaveLength(8);
    expect(ozguBolum("fedek-lisans", "molekuler-biyoloji-ve-genetik")?.baslik).toBe("MOLEKÜLER BİYOLOJİ ve GENETİK");
    expect(ozguBolum("fedek-lisans", "yok")).toBeNull();
  });
});

describe("EPDAD öğretmen eğitimi 1.1 göstergeleri ve dereceli puanlama anahtarı", () => {
  it("dörtlü anahtarın düzey adları ve dayanak cümlesi kılavuzun 7. sayfasında birebir geçer", () => {
    const k = EPDAD_DERECELENDIRME_ANAHTARI.kaynak;
    expect(k.sha256).toBe(ozetler.get(k.dosya));
    expect(gecer(k, EPDAD_DERECELENDIRME_ANAHTARI.dayanak)).toBe(true);
    for (const d of EPDAD_DERECELENDIRME_ANAHTARI.duzeyler) expect(gecer(k, d.ad), d.ad).toBe(true);
    expect(EPDAD_DERECELENDIRME_ANAHTARI.duzeyler.map((d) => d.kod)).toEqual([
      "ileri",
      "oldukca",
      "gelismeye",
      "baslangic",
    ]);
  });

  it("her gösterge ve düzey tanımı kaynak sayfada birebir geçer; özet tutar", () => {
    const eksik: string[] = [];
    for (const g of EPDAD_GOSTERGELERI) {
      const ad = `${g.altStandart}/${g.no}`;
      if (ozetler.get(g.kaynak.dosya) !== g.kaynak.sha256) eksik.push(`${ad} özet`);
      if (!hucreGecer(g.kaynak, g.metin)) eksik.push(`${ad} gösterge`);
      for (const [d, m] of Object.entries(g.duzeyler ?? {})) if (!m || !gecer(g.kaynak, m)) eksik.push(`${ad} ${d}`);
    }
    expect(eksik).toEqual([]);
  });

  it("göstergeler alt standart ağacıyla örtüşür; sayılar belgeden", () => {
    // Kılavuz s. 7 "39 Alt Standart ve 158 Göstergeden oluşmaktadır" diyor; tablolardaki numaralı satırlar elle
    // sayıldığında 157 çıkıyor (1.1.1: 4, 1.1.2: 1, 1.1.3: 5, 1.2.1: 7, 1.2.2: 2, 1.3.1: 2, 1.3.2: 5, 1.3.3: 5,
    // 2.1.1: 5, 2.1.2: 4, 2.2.1: 5, 2.2.2: 2, 2.3.1: 6, 2.3.2: 2, 2.3.3: 3, 3.1.1: 2, 3.2.1: 4, 3.3.1: 3,
    // 4.1.1: 7, 4.2.1: 5, 4.2.2: 5, 4.3.1: 4, 5.1.1: 5, 5.1.2: 8, 5.1.3: 4, 5.1.4: 4, 5.1.5: 3, 5.2.1: 5,
    // 5.2.2: 3, 5.3.1: 2, 6.1.1: 3, 6.1.2: 3, 6.2.1: 4, 6.2.2: 3, 6.2.3: 3, 6.3.1: 6, 7.1.1: 6, 7.2.1: 5,
    // 7.3.1: 2). 2026-10-31'de ayrıca PDF'deki sözcük konumlarından (pdfplumber) gösterge sütunundaki "n."
    // numaraları okuma sırasıyla yeniden sayıldı: 158 numara bulundu, üçü gösterge değil standart alanı
    // başlığıydı (s. 17 "2.", s. 29 "4.", s. 53 "7."), ikisi okunamadı (1.1.1/1 harf harf bölünmüş, 5.2.1/2);
    // sonuç yine 157 ve her alt standartta numaralar 1'den boşluksuz. Kılavuzdaki 158 tablolarla
    // karşılanamadı; fark DOĞRULANMADI. 7.2.1'in 1. göstergesi s. 55-56 arasında bölünmüş, hücre sınırı belgeden
    // güvenle ayrılamadı; alınmadı → 156.
    expect(EPDAD_GOSTERGELERI).toHaveLength(156);
    expect(altStandartGostergeleri("7.2.1").map((g) => g.no)).toEqual([2, 3, 4, 5]);
    expect(
      sayfa(EPDAD_GOSTERGELERI[0]?.kaynak ?? { dosya: "", sha256: "", sayfa: 7 }, 7).includes(
        "39 Alt Standart ve 158 Göstergeden oluşmaktadır",
      ),
    ).toBe(true);
    const altlar = EPDAD_OGRETMEN_1_1_HAM.filter((h) => /^\d+\.\d+\.\d+$/u.test(h.kod)).map((h) => h.kod);
    expect([...new Set(EPDAD_GOSTERGELERI.map((g) => g.altStandart))]).toEqual(altlar);
    // Her alt standardın numaraları sıralı ve boşluksuz (7.2.1 dışında 1'den başlar).
    for (const a of altlar) {
      const n = altStandartGostergeleri(a).map((g) => g.no);
      const ilk = a === "7.2.1" ? 2 : 1;
      expect(n, a).toEqual(n.map((_, i) => ilk + i));
    }
  });

  it("düzey tanımı alınamayan gösterge EKSİK kalır, uydurulmaz", () => {
    // 156 göstergenin 138'inde dört düzey tanımı belgeden ayrıldı. 18'inde satır iki sayfaya bölünmüş ya da
    // tanım cümleleri noktasız olduğundan (ör. 2.1.1/1) dört tanım güvenle ayrılamadı: düzeyler null.
    const tanimli = EPDAD_GOSTERGELERI.filter((g) => g.duzeyler);
    expect(tanimli).toHaveLength(138);
    expect(EPDAD_GOSTERGELERI.find((g) => g.altStandart === "2.1.1" && g.no === 1)?.duzeyler).toBeNull();
    const ilk = EPDAD_GOSTERGELERI[0];
    expect(ilk?.metin).toBe(
      "Lisans programının Türkiye Yükseköğretim Yeterlilikler Çerçevesi (TYYÇ) ile uyumlu olması",
    );
    expect(ilk?.duzeyler?.ileri).toBe(
      "Lisans programı Türkiye Yükseköğretim Yeterlilikler Çerçevesi ile tamamen uyumludur.",
    );
    expect(ilk?.duzeyler?.baslangic).toBe(
      "Lisans programı Türkiye Yükseköğretim Yeterlilikler Çerçevesi ile uyumlu değildir.",
    );
  });
});
