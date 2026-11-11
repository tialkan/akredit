// /deneyin ÇK/PÇ hesaplayıcısının saf mantığı. Tamamı tarayıcıda çalışır; ağ yok, saklama yok.
// Ayrıştırma herkese açık MCP'nin not tablosu ayrıştırıcısıdır (apps/acik-mcp/src/not-tablosu.ts, yalnız içe
// aktarılır): kimlik sütunları (ad, soyad, numara, e-posta) bellekte atılır, öğrenciler o1, o2 olur. Sayılar
// yalnız @akredit/olcme hesabından gelir (ilke 2). Sezilemeyen tam puan, ÇK eşlemesi ve ağırlık tahmin edilmez;
// hocaya sorulur.

import type { MatrisDegeri } from "@akredit/cekirdek";
import { type CkPcMatrisi, type DersOlcmeSonucu, dersiOlc, olcmeGirdiSorunlari } from "@akredit/olcme";
import { notTablosuAyikla, notTablosuAyristirAraci, sutunCoz, tabloOku } from "../../../acik-mcp/src/not-tablosu.ts";

export interface SutunTaslagi {
  baslik: string;
  aracId: string;
  aracAdi: string;
  soruNo: string;
  /** Başlıktan sezilen tam puan; yoksa null (hoca girer). */
  tamPuan: number | null;
  /** Başlıktan sezilen ÇK kodları (Ö1, Ö2). */
  ciktilar: string[];
}

export interface HazirTablo {
  /** Kimlik sütunları atılmış, başına takma ad konmuş tablo (sekmeyle ayrılmış). Yalnız bellekte. */
  tablo: string;
  /** Atılan sütunların başlıkları (değerleri değil). */
  atilan: string[];
  ogrenciSayisi: number;
  sutunlar: SutunTaslagi[];
  yoksayilan: string[];
  /** Ölçme araçları (sütunlardan): kimlik ve ad. */
  araclar: { id: string; ad: string }[];
}

/** Yapıştırılan ya da dosyadan okunan tabloyu hazırlar: kimlikleri atar, başlıkları çözer. */
export function tabloyuHazirla(ham: string): HazirTablo {
  const { tablo, atilan } = notTablosuAyikla(ham);
  const { satirlar } = tabloOku(tablo);
  const [baslik = [], ...veri] = satirlar;
  const sutunlar: SutunTaslagi[] = [];
  const yoksayilan: string[] = [];
  baslik.forEach((b, j) => {
    if (j === 0) return;
    const s = sutunCoz(b);
    if (!s) {
      if (b.trim()) yoksayilan.push(b.trim());
      return;
    }
    sutunlar.push({
      baslik: s.baslik,
      aracId: s.aracId,
      aracAdi: s.aracAdi,
      soruNo: s.soruNo,
      tamPuan: s.tamPuan,
      ciktilar: s.ciktilar,
    });
  });
  const araclar = [...new Map(sutunlar.map((s) => [s.aracId, { id: s.aracId, ad: s.aracAdi }])).values()];
  return { tablo, atilan, ogrenciSayisi: veri.length, sutunlar, yoksayilan, araclar };
}

/** "Ö1, ÇK2, 3" gibi bir girdiyi ÇK kodlarına çevirir (Ö1, Ö2, Ö3). */
export function ciktiKodlari(girdi: string): string[] {
  const kodlar = [...girdi.matchAll(/(?:ÇK|ÖÇ|Ö|LO)?\s*-?\s*(\d{1,2})/giu)].map((m) => `Ö${Number(m[1])}`);
  return [...new Set(kodlar)];
}

/** "P1:3, P2:5" biçimindeki matris satırını okur; 0-5 dışı ya da biçimsiz parça yok sayılır. */
export function matrisSatiriOku(girdi: string): Record<string, number> {
  const satir: Record<string, number> = {};
  for (const m of girdi.matchAll(/(?:PÇ|P)\s*-?\s*(\d{1,2})\s*[:=]\s*([0-5])\b/giu))
    satir[`P${Number(m[1])}`] = Number(m[2]);
  return satir;
}

export interface HesapGirdisi {
  tamPuanlar: Record<string, number>;
  eslemeler: Record<string, string[]>;
  agirliklar: Record<string, number>;
  /** ÇK kodu → (PÇ kodu → 0-5). Boşsa PÇ hesaplanmaz. */
  matris: Record<string, Record<string, number>>;
  esik: number;
}

export type HesapSonucu = { tamam: false; eksikler: string[] } | { tamam: true; sonuc: DersOlcmeSonucu };

interface Taslak {
  eksikler: string[];
  hazir: boolean;
  ckPcHesaplaTaslagi: {
    ciktilar: { kod: string }[];
    araclar: {
      id: string;
      tur: string;
      ad: string;
      agirlik: number | null;
      sorular: { no: string; tamPuan: number | null; eslemeler: { ciktiKod: string; agirlik: number }[] }[];
    }[];
    puanlar: { ogrenci: string; aracId: string; soruNo: string; puan: number | null }[];
  };
}

/** Hesap: önce MCP ayrıştırıcısı eksikleri söyler; eksik yoksa @akredit/olcme hesaplar. */
export function hesapla(h: HazirTablo, g: HesapGirdisi): HesapSonucu {
  const girdi = notTablosuAyristirAraci.girdi.parse({
    tablo: h.tablo,
    tamPuanlar: g.tamPuanlar,
    eslemeler: g.eslemeler,
    agirliklar: g.agirliklar,
  });
  const r = notTablosuAyristirAraci.calistir(girdi, { simdi: () => new Date(0) });
  if (r instanceof Promise) throw new Error("Beklenmeyen eşzamansız sonuç.");
  const t = r.sonuc as Taslak;
  if (!t.hazir) return { tamam: false, eksikler: t.eksikler };
  const x = t.ckPcHesaplaTaslagi;
  const matris: CkPcMatrisi = {};
  for (const [ck, satir] of Object.entries(g.matris)) {
    const hucreler = Object.entries(satir);
    if (!hucreler.length) continue;
    matris[ck] = Object.fromEntries(
      hucreler.map(([pc, v]): [string, MatrisDegeri] => [
        pc,
        v === 0 ? { tur: "iliskisiz" } : { tur: "puan", puan: v as 1 | 2 | 3 | 4 | 5 },
      ]),
    );
  }
  const veri = {
    dersKodu: "DERS",
    donem: "-",
    ciktilar: x.ciktilar,
    araclar: x.araclar.map((a) => ({
      id: a.id,
      tur: a.tur as never,
      ad: a.ad,
      agirlik: a.agirlik ?? 0,
      sorular: a.sorular.map((q) => ({ no: q.no, tamPuan: q.tamPuan ?? 0, eslemeler: q.eslemeler })),
    })),
    puanlar: x.puanlar,
  };
  // Bozuk girdi sessizce hesaplanmaz; MCP'deki ck_pc_hesapla ile aynı denetim.
  const sorunlar = olcmeGirdiSorunlari(veri);
  if (sorunlar.length) return { tamam: false, eksikler: sorunlar };
  const sonuc = dersiOlc(veri, { esik: g.esik, ...(Object.keys(matris).length ? { matris } : {}) });
  return { tamam: true, sonuc };
}

const sayi = (n: number | null, basamak = 1) => (n === null ? "" : n.toFixed(basamak).replace(".", ","));
const yuzde = (n: number | null) => (n === null ? "" : `%${(n * 100).toFixed(1).replace(".", ",")}`);

/** Tabloda gösterilen satırlar; CSV de aynı satırlardan üretilir. */
export function sonucSatirlari(s: DersOlcmeSonucu): { ck: string[][]; pc: string[][] } {
  return {
    ck: s.ckBasarilari.map((c) => [
      c.ckKod.replace(/^Ö/u, "ÇK"),
      String(c.soruSayisi),
      String(c.n),
      sayi(c.ortalama),
      yuzde(c.esikGecenOrani),
    ]),
    pc: s.pcSaglanmasi.map((p) => [p.pcKod, sayi(p.deger), String(p.ckSayisi)]),
  };
}

export const CK_BASLIKLARI = ["Ders çıktısı", "Soru sayısı", "Öğrenci", "Ortalama başarı (100)", "Eşiği geçen"];
export const PC_BASLIKLARI = ["Program çıktısı", "Sağlanma (100)", "Katkı veren ÇK"];

const csvHucre = (x: string) => (/[;"\n]/u.test(x) ? `"${x.replace(/"/gu, '""')}"` : x);

/** Excel'in Türkçe ayarıyla açılan CSV: noktalı virgül ayıraç, başta BOM. Öğrenci düzeyinde satır yoktur. */
export function sonucCsv(s: DersOlcmeSonucu): string {
  const { ck, pc } = sonucSatirlari(s);
  const satirlar: string[][] = [
    [`Eşik: ${s.esik}`, `Öğrenci sayısı: ${s.ogrenciSayisi}`, `Hesap: ${s.hesapSurumu}`],
    [],
    CK_BASLIKLARI,
    ...ck,
  ];
  if (pc.length) satirlar.push([], PC_BASLIKLARI, ...pc);
  return `﻿${satirlar.map((r) => r.map(csvHucre).join(";")).join("\r\n")}\r\n`;
}
