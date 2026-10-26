// Ders düzeyi ölçme: ÇK başarısı, ders içi PÇ sağlanması, not istatistikleri, madde analizi, bulgular.
// Yöntem ayrıntıları: docs/olcme-yontemi.md

import type { Bulgu, CiktiEslemesi, DersOlcmeVerisi } from "@akredit/cekirdek";
import { degerOzeti } from "@akredit/cekirdek";
import { korelasyon, ortalama, ortanca, sirala, standartSapma, toplam, varyans, yuzdelik } from "./istatistik.ts";
import {
  type AracAnalizi,
  type CkBasarisi,
  type CkPcMatrisi,
  type DersOlcmeSonucu,
  type HarfAraligi,
  HESAP_SURUMU,
  type MaddeAnalizi,
  type NotIstatistikleri,
  type OlcmeSecenekleri,
  type PcSaglanmasi,
  TOPLAM_SORU_NO,
  type Yontem,
} from "./turler.ts";

/** Örnek harf tablosu. Hiçbir kurumun resmî tablosu değildir; kurum kendi tablosunu vermelidir. */
export const ORNEK_HARF_TABLOSU: readonly HarfAraligi[] = [
  { harf: "AA", alt: 90 },
  { harf: "BA", alt: 85 },
  { harf: "BB", alt: 80 },
  { harf: "CB", alt: 75 },
  { harf: "CC", alt: 70 },
  { harf: "DC", alt: 65 },
  { harf: "DD", alt: 60 },
  { harf: "FD", alt: 50 },
  { harf: "FF", alt: 0 },
];

const VARSAYILAN_HISTOGRAM = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
const AZ_OGRENCI = 10;

interface IcSoru {
  aracId: string;
  no: string;
  tamPuan: number;
  /** Normalleştirilmiş eşlemeler (ağırlıklar toplamı 1), ÇK koduna göre sıralı. */
  eslemeler: CiktiEslemesi[];
}

interface IcArac {
  id: string;
  agirlik: number;
  sorusuz: boolean;
  sorular: IcSoru[];
}

function normallestir(e: readonly CiktiEslemesi[]): CiktiEslemesi[] {
  const gecerli = e.filter((x) => x.agirlik > 0);
  const t = toplam(gecerli.map((x) => x.agirlik));
  return gecerli
    .map((x) => ({ ciktiKod: x.ciktiKod, agirlik: x.agirlik / t }))
    .sort((a, b) => sirala(a.ciktiKod, b.ciktiKod));
}

/** Girdiyi kanonik sıraya koyar; özet ve hesap bu biçimden yapılır, böylece girdi sırası sonucu etkilemez. */
function kanonik(veri: DersOlcmeVerisi, s: OlcmeSecenekleri) {
  const araclar = [...veri.araclar]
    .map((a) => ({
      ...a,
      sorular: [...a.sorular]
        .map((q) => ({ ...q, eslemeler: [...q.eslemeler].sort((x, y) => sirala(x.ciktiKod, y.ciktiKod)) }))
        .sort((x, y) => sirala(x.no, y.no)),
    }))
    .sort((x, y) => sirala(x.id, y.id));
  const puanlar = [...veri.puanlar].sort(
    (x, y) => sirala(x.ogrenci, y.ogrenci) || sirala(x.aracId, y.aracId) || sirala(x.soruNo, y.soruNo),
  );
  const ciktilar = [...veri.ciktilar].sort((x, y) => sirala(x.kod, y.kod));
  const aracEslemeleri: Record<string, CiktiEslemesi[]> = {};
  for (const k of Object.keys(s.aracEslemeleri ?? {}).sort(sirala)) {
    aracEslemeleri[k] = [...(s.aracEslemeleri?.[k] ?? [])].sort((x, y) => sirala(x.ciktiKod, y.ciktiKod));
  }
  return { veri: { ...veri, araclar, puanlar, ciktilar }, aracEslemeleri };
}

function harfBul(not: number, tablo: readonly HarfAraligi[]): string | null {
  for (const h of tablo) if (not >= h.alt) return h.harf;
  return null;
}

/** Bir dersin ölçme verisinden ÇK başarısı, PÇ sağlanması, not istatistikleri, madde analizi ve bulguları hesaplar. */
export function dersiOlc(veriGirdi: DersOlcmeVerisi, secenekler: OlcmeSecenekleri = {}): DersOlcmeSonucu {
  const esik = secenekler.esik ?? 60;
  const aracAgirligiKullan = secenekler.aracAgirligiKullan ?? false;
  const gecmeNotu = secenekler.gecmeNotu ?? 60;
  const harfTablosu = [...(secenekler.harfTablosu ?? ORNEK_HARF_TABLOSU)].sort((a, b) => b.alt - a.alt);
  const harfTablosuAdi = secenekler.harfTablosu ? "kurum" : "örnek";
  const sinirlar = [...(secenekler.histogramSinirlari ?? VARSAYILAN_HISTOGRAM)].sort((a, b) => a - b);

  const { veri, aracEslemeleri } = kanonik(veriGirdi, secenekler);
  const girdiOzeti = degerOzeti({
    veri,
    secenekler: {
      esik,
      aracAgirligiKullan,
      gecmeNotu,
      harfTablosu,
      sinirlar,
      matris: secenekler.matris ?? null,
      aracEslemeleri,
      aracTamPuani: secenekler.aracTamPuani ?? null,
    },
  });

  const bulgular: Bulgu[] = [];
  const bulgu = (duzey: Bulgu["duzey"], kural: string, konu: string | undefined, aciklama: string) =>
    bulgular.push(konu === undefined ? { duzey, kural, aciklama } : { duzey, kural, konu, aciklama });

  // --- Araç ve soruların iç biçimi ---
  const araclar: IcArac[] = veri.araclar.map((a) => {
    const sorusuz = a.sorular.length === 0;
    const sorular: IcSoru[] = sorusuz
      ? [
          {
            aracId: a.id,
            no: TOPLAM_SORU_NO,
            tamPuan: secenekler.aracTamPuani?.[a.id] ?? 100,
            eslemeler: normallestir(aracEslemeleri[a.id] ?? []),
          },
        ]
      : a.sorular.map((q) => ({ aracId: a.id, no: q.no, tamPuan: q.tamPuan, eslemeler: normallestir(q.eslemeler) }));
    return { id: a.id, agirlik: a.agirlik, sorusuz, sorular };
  });
  const sorusuzSayisi = araclar.filter((a) => a.sorusuz).length;
  const yontem: Yontem = sorusuzSayisi === 0 ? "soru" : sorusuzSayisi === araclar.length ? "arac" : "karma";

  const ciktiKodlari = veri.ciktilar.map((c) => c.kod);
  const ciktiKumesi = new Set(ciktiKodlari);

  for (const a of araclar) {
    for (const q of a.sorular) {
      const konu = `${a.id}/${q.no}`;
      if (!(q.tamPuan > 0)) bulgu("hata", "soru-tam-puan-sifir", konu, "Sorunun tam puanı 0; hesaplara katılmadı.");
      if (q.eslemeler.length === 0)
        bulgu("uyari", "soru-eslemesiz", konu, "Soru hiçbir ders öğrenme çıktısına eşlenmemiş.");
      for (const e of q.eslemeler)
        if (!ciktiKumesi.has(e.ciktiKod))
          bulgu("uyari", "esleme-bilinmeyen-cikti", konu, `Soru, derste olmayan ${e.ciktiKod} çıktısına eşlenmiş.`);
    }
  }
  const agirlikToplami = toplam(araclar.map((a) => a.agirlik));
  if (Math.abs(agirlikToplami - 100) > 1e-9)
    bulgu(
      "uyari",
      "arac-agirlik-toplami",
      undefined,
      `Ölçme araçlarının ağırlıkları toplamı ${agirlikToplami}; 100 olmalı. Ders notu 100'e oranlanarak hesaplandı.`,
    );

  // --- Puan tablosu ---
  const puan = new Map<string, number | null>();
  const anahtar = (o: string, a: string, q: string) => `${o}\u0000${a}\u0000${q}`;
  for (const p of veri.puanlar) puan.set(anahtar(p.ogrenci, p.aracId, p.soruNo), p.puan);
  const ogrenciler = [...new Set(veri.puanlar.map((p) => p.ogrenci))].sort(sirala);
  /** Öğrenci araca girdi mi: aracın en az bir sorusunda sayısal puanı var. */
  const girdiMi = (o: string, a: IcArac) => a.sorular.some((q) => typeof puan.get(anahtar(o, a.id, q.no)) === "number");
  const puaniAl = (o: string, a: IcArac, q: IcSoru): number => puan.get(anahtar(o, a.id, q.no)) ?? 0;

  // --- ÇK başarısı ---
  const ckBasarilari: CkBasarisi[] = ciktiKodlari.map((ck) => {
    let soruSayisi = 0;
    for (const a of araclar)
      for (const q of a.sorular) if (q.tamPuan > 0 && q.eslemeler.some((e) => e.ciktiKod === ck)) soruSayisi++;
    const ogr: Record<string, number | null> = {};
    for (const o of ogrenciler) {
      let pay = 0;
      let payda = 0;
      for (const a of araclar) {
        if (!girdiMi(o, a)) continue;
        const k = aracAgirligiKullan ? a.agirlik : 1;
        for (const q of a.sorular) {
          if (!(q.tamPuan > 0)) continue;
          const w = q.eslemeler.find((e) => e.ciktiKod === ck)?.agirlik ?? 0;
          if (w === 0) continue;
          pay += puaniAl(o, a, q) * w * k;
          payda += q.tamPuan * w * k;
        }
      }
      ogr[o] = payda > 0 ? (100 * pay) / payda : null;
    }
    const degerler = ogrenciler.map((o) => ogr[o]).filter((x): x is number => x !== null);
    const ort = ortalama(degerler);
    if (soruSayisi === 0) bulgu("uyari", "ck-olculmemis", ck, "Bu çıktıyı ölçen soru yok.");
    else if (soruSayisi === 1) bulgu("bilgi", "ck-tek-soru", ck, "Bu çıktı yalnız bir soruyla ölçülüyor.");
    if (ort !== null && ort < esik)
      bulgu("uyari", "ck-esik-alti", ck, `Çıktının ortalama başarısı eşiğin (${esik}) altında.`);
    return {
      ckKod: ck,
      soruSayisi,
      n: degerler.length,
      ortalama: ort,
      ortanca: ortanca(degerler),
      standartSapma: standartSapma(degerler),
      esikGecenOrani: degerler.length === 0 ? null : degerler.filter((x) => x >= esik).length / degerler.length,
      ogrenciler: ogr,
    };
  });

  // --- PÇ sağlanması (ders içi) ---
  const pcSaglanmasi = pcHesapla(secenekler.matris, ckBasarilari, bulgu);

  // --- Not istatistikleri ---
  const notlar: Record<string, number> = {};
  const aracTam = (a: IcArac) => toplam(a.sorular.filter((q) => q.tamPuan > 0).map((q) => q.tamPuan));
  for (const o of ogrenciler) {
    let n = 0;
    for (const a of araclar) {
      const tam = aracTam(a);
      if (tam <= 0) continue;
      const alinan = toplam(a.sorular.filter((q) => q.tamPuan > 0).map((q) => puaniAl(o, a, q)));
      n += a.agirlik * (alinan / tam);
    }
    notlar[o] = agirlikToplami > 0 ? (n * 100) / agirlikToplami : 0;
  }
  const notDizisi = ogrenciler.map((o) => notlar[o] as number);
  const histogram = [];
  for (let i = 0; i + 1 < sinirlar.length; i++) {
    const alt = sinirlar[i] as number;
    const ust = sinirlar[i + 1] as number;
    const son = i + 2 === sinirlar.length;
    histogram.push({ alt, ust, sayi: notDizisi.filter((x) => x >= alt && (x < ust || (son && x === ust))).length });
  }
  const harfSayilari = new Map<string, number>(harfTablosu.map((h) => [h.harf, 0]));
  for (const x of notDizisi) {
    const h = harfBul(x, harfTablosu);
    if (h !== null) harfSayilari.set(h, (harfSayilari.get(h) ?? 0) + 1);
  }
  const notIstatistikleri: NotIstatistikleri = {
    n: notDizisi.length,
    ortalama: ortalama(notDizisi),
    ortanca: ortanca(notDizisi),
    standartSapma: standartSapma(notDizisi),
    enKucuk: notDizisi.length ? Math.min(...notDizisi) : null,
    enBuyuk: notDizisi.length ? Math.max(...notDizisi) : null,
    ceyrek1: yuzdelik(notDizisi, 0.25),
    ceyrek3: yuzdelik(notDizisi, 0.75),
    histogram,
    harfDagilimi: harfTablosu.map((h) => ({ harf: h.harf, sayi: harfSayilari.get(h.harf) ?? 0 })),
    harfTablosuAdi,
    gecmeNotu,
    gecmeOrani: notDizisi.length ? notDizisi.filter((x) => x >= gecmeNotu).length / notDizisi.length : null,
    notlar,
  };

  // --- Madde analizi ---
  const maddeAnalizi: AracAnalizi[] = araclar.map((a) => {
    const girenler = ogrenciler.filter((o) => girdiMi(o, a));
    const maddeler = a.sorular.filter((q) => q.tamPuan > 0);
    const toplamlar = girenler.map((o) => toplam(maddeler.map((q) => puaniAl(o, a, q))));
    const sirali = girenler
      .map((o, i) => ({ o, t: toplamlar[i] as number }))
      .sort((x, y) => y.t - x.t || sirala(x.o, y.o))
      .map((x) => x.o);
    const k27 = Math.max(1, Math.round(girenler.length * 0.27));
    const ust = sirali.slice(0, k27);
    const alt = sirali.slice(-k27);
    const maddeSonuclari: MaddeAnalizi[] = maddeler.map((q) => {
      const x = girenler.map((o) => puaniAl(o, a, q));
      const ort = ortalama(x);
      const p = ort === null ? null : ort / q.tamPuan;
      const D =
        girenler.length < 2
          ? null
          : ((ortalama(ust.map((o) => puaniAl(o, a, q))) as number) -
              (ortalama(alt.map((o) => puaniAl(o, a, q))) as number)) /
            q.tamPuan;
      const r = korelasyon(
        x,
        toplamlar.map((t, i) => t - (x[i] as number)),
      );
      const konu = `${a.id}/${q.no}`;
      if (p !== null && p > 0.9)
        bulgu("bilgi", "soru-cok-kolay", konu, "Soru çok kolay (güçlük indeksi 0,90'ın üstünde).");
      if (p !== null && p < 0.2)
        bulgu("bilgi", "soru-cok-zor", konu, "Soru çok zor (güçlük indeksi 0,20'nin altında).");
      if (D !== null && D < 0) bulgu("uyari", "soru-negatif-ayirt", konu, "Sorunun ayırt ediciliği negatif.");
      return {
        aracId: a.id,
        soruNo: q.no,
        tamPuan: q.tamPuan,
        n: x.length,
        ortalama: ort,
        guclukIndeksi: p,
        ayirtEdicilik: D,
        maddeToplamKorelasyonu: r,
      };
    });
    let alfa: number | null = null;
    const vt = varyans(toplamlar);
    if (maddeler.length >= 2 && vt !== null && vt > 0) {
      const vm = toplam(maddeler.map((q) => varyans(girenler.map((o) => puaniAl(o, a, q))) as number));
      const k = maddeler.length;
      alfa = (k / (k - 1)) * (1 - vm / vt);
      if (alfa < 0.6) bulgu("uyari", "arac-dusuk-guvenirlik", a.id, "Aracın güvenirliği düşük (alfa 0,60'ın altında).");
    } else if (maddeler.length >= 2) {
      bulgu("bilgi", "arac-guvenirlik-tanimsiz", a.id, "Aracın güvenirliği hesaplanamadı (puanlarda değişkenlik yok).");
    }
    return {
      aracId: a.id,
      n: girenler.length,
      maddeSayisi: maddeler.length,
      cronbachAlfa: alfa,
      maddeler: maddeSonuclari,
    };
  });

  if (ogrenciler.length < AZ_OGRENCI)
    bulgu(
      "uyari",
      "az-ogrenci",
      undefined,
      `Öğrenci sayısı ${ogrenciler.length}; ${AZ_OGRENCI}'dan az öğrencide istatistikler yorumlanmamalı.`,
    );

  // --- Örnek kâğıtlar ---
  const artan = ogrenciler.map((o) => ({ o, n: notlar[o] as number })).sort((x, y) => x.n - y.n || sirala(x.o, y.o));
  const azalan = [...artan].sort((x, y) => y.n - x.n || sirala(x.o, y.o));
  const ornekKagitlar = {
    enYuksek: azalan[0]?.o ?? null,
    ortanca: artan[Math.floor((artan.length - 1) / 2)]?.o ?? null,
    enDusuk: artan[0]?.o ?? null,
  };

  return {
    dersKodu: veri.dersKodu,
    donem: veri.donem,
    yontem,
    esik,
    ogrenciSayisi: ogrenciler.length,
    ckBasarilari,
    pcSaglanmasi,
    notIstatistikleri,
    maddeAnalizi,
    bulgular,
    ornekKagitlar,
    hesapSurumu: HESAP_SURUMU,
    girdiOzeti,
  };
}

/** Ders içi PÇ: Σ ort(ÇK)·katkı / Σ katkı; yalnız puanlı hücreler ve ölçülmüş ÇK'lar. */
function pcHesapla(
  matris: CkPcMatrisi | undefined,
  ck: CkBasarisi[],
  bulgu: (d: Bulgu["duzey"], k: string, konu: string | undefined, a: string) => void,
): PcSaglanmasi[] {
  if (!matris) return [];
  const pcler = [...new Set(Object.values(matris).flatMap((satir) => Object.keys(satir)))].sort(sirala);
  return pcler.map((pc) => {
    let pay = 0;
    let katkiToplami = 0;
    let ckSayisi = 0;
    for (const c of ck) {
      const hucre = matris[c.ckKod]?.[pc];
      if (hucre?.tur !== "puan" || c.ortalama === null) continue;
      pay += c.ortalama * hucre.puan;
      katkiToplami += hucre.puan;
      ckSayisi++;
    }
    if (ckSayisi === 0)
      bulgu("bilgi", "pc-katkisiz", pc, "Bu program çıktısına katkı veren ölçülmüş ders çıktısı yok.");
    return { pcKod: pc, deger: ckSayisi > 0 ? pay / katkiToplami : null, katkiToplami, ckSayisi };
  });
}
