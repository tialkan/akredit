// Sentetik "Örnek Üniversitesi" üreteci. Saf ve belirlenimcidir: zaman, ağ ve dosya kullanmaz; aynı tohum
// aynı veriyi üretir. Bütün ölçme sayıları `@akredit/olcme dersiOlc` ile hesaplanır; anket ortalamaları
// `@akredit/olcme ortalama` ile. Metinlerdeki sayılar bu hesaplardan biçimlendirilir, elle yazılmaz.

import type { KatkiPuani, OgrenciPuani, OlcmeAraci } from "@akredit/cekirdek";
import { type CkPcMatrisi, type DersOlcmeSonucu, dersiOlc, ortalama } from "@akredit/olcme";
import {
  ADLAR,
  FAKULTELER,
  KURUM_ADI,
  KURUM_KISA_ADI,
  OC_KALIPLARI,
  PC_KALIPLARI,
  UNVANLAR,
  UYDURMA_SOYADLAR,
} from "./adlar.ts";
import { type Rastgele, rastgele } from "./rastgele.ts";
import type {
  OrnekAcilis,
  OrnekAnket,
  OrnekBelge,
  OrnekBirim,
  OrnekDers,
  OrnekDonem,
  OrnekEksik,
  OrnekEylem,
  OrnekKisi,
  OrnekOneri,
  OrnekPersona,
  OrnekProgram,
  OrnekUniversite,
} from "./turler.ts";

export const VERI_SURUMU = "ornek-veri-1";
export const VARSAYILAN_TOHUM = 20261028;
export const VARSAYILAN_OGRENCI_SAYISI = 5000;
/** ÇK başarı eşiği (0-100). @akredit/olcme varsayılanıyla aynı. */
export const ESIK = 60;

export interface UretimSecenekleri {
  tohum?: number;
  /** Testlerde daha küçük bir kurum için. */
  ogrenciSayisi?: number;
}

/** Bilinçli eşik altı sonuçlar: program anahtarı, ders adı, zayıf ÇK. */
const ZAYIF_CIKTILAR = [
  { program: "blm", ders: "Algoritma Analizi", ck: "ÖÇ2" },
  { program: "ins", ders: "Zemin Mekaniği", ck: "ÖÇ3" },
  { program: "hem", ders: "Farmakoloji", ck: "ÖÇ1" },
] as const;
/** Bilinçli eksikler. */
const MATRISSIZ = { program: "ins", ders: "Yapı Statiği" } as const;
const OLCULMEYEN = { program: "mat", ders: "Reel Analiz", ck: "ÖÇ4" } as const;
const AKTS_EKSIK = { program: "isl", ders: "Finansal Yönetim" } as const;
const ANKET_AZ = { program: "mat", ders: "Topoloji" } as const;
const TUTANAKSIZ_PROGRAM = "kmy";

const LIKERT_SORULARI = [
  { kod: "hedef", metin: "Dersin öğrenme çıktıları dönem başında açıkça anlatıldı." },
  { kod: "icerik", metin: "Ders içeriği öğrenme çıktılarıyla uyumluydu." },
  { kod: "olcme", metin: "Sınav ve ödevler öğrenme çıktılarını ölçtü." },
  { kod: "geri_bildirim", metin: "Çalışmalarıma zamanında geri bildirim aldım." },
  { kod: "genel", metin: "Genel olarak dersten memnunum." },
] as const;

export { LIKERT_SORULARI };

/** Yüzde biçimi: 45.25 → "%45,3". Ondalık ayırıcı virgül; yerel ayara bağlı değildir. */
export function yuzde(x: number): string {
  return `%${x.toFixed(1).replace(".", ",")}`;
}
const ondalik = (x: number, basamak = 2) => x.toFixed(basamak).replace(".", ",");
const sinirla = (x: number, alt: number, ust: number) => Math.min(ust, Math.max(alt, x));

const DONEMLER: OrnekDonem[] = [
  { anahtar: "2025g", ad: "2025-2026 Güz", baslangic: "2025-09-22", bitis: "2026-01-23" },
  { anahtar: "2025b", ad: "2025-2026 Bahar", baslangic: "2026-02-16", bitis: "2026-06-12" },
  { anahtar: "2026g", ad: "2026-2027 Güz", baslangic: "2026-09-21", bitis: "2027-01-22" },
];

/** Yarıyıl dağılımı: 12 ders 8 yarıyıla. */
const YARIYIL = [1, 1, 2, 3, 3, 4, 5, 5, 6, 7, 7, 8] as const;

function kisiAdi(r: Rastgele, kullanilan: Set<string>): string {
  for (;;) {
    const ad = `${r.sec(ADLAR)} ${r.sec(UYDURMA_SOYADLAR)}`;
    if (!kullanilan.has(ad)) {
      kullanilan.add(ad);
      return ad;
    }
  }
}

/** Ölçme araçları ve soru-ÇK eşlemesi. `olculmeyen` verilirse o ÇK hiçbir soruya eşlenmez. */
function araclar(dersKodu: string, olculmeyen: string | null): OlcmeAraci[] {
  const e = (ck: string, agirlik = 1) => ({ ciktiKod: ck, agirlik });
  const son = olculmeyen === "ÖÇ4" ? [e("ÖÇ3")] : [e("ÖÇ4")];
  return [
    {
      id: `${dersKodu}-ara`,
      tur: "ara_sinav",
      ad: "Ara sınav",
      agirlik: 40,
      sorular: [
        { no: "1", tamPuan: 25, eslemeler: [e("ÖÇ1")] },
        { no: "2", tamPuan: 25, eslemeler: [e("ÖÇ1", 0.5), e("ÖÇ2", 0.5)] },
        { no: "3", tamPuan: 25, eslemeler: [e("ÖÇ2")] },
        { no: "4", tamPuan: 25, eslemeler: [e("ÖÇ3")] },
      ],
    },
    {
      id: `${dersKodu}-final`,
      tur: "yariyil_sonu",
      ad: "Yarıyıl sonu sınavı",
      agirlik: 60,
      sorular: [
        { no: "1", tamPuan: 20, eslemeler: [e("ÖÇ1")] },
        { no: "2", tamPuan: 20, eslemeler: [e("ÖÇ2")] },
        { no: "3", tamPuan: 20, eslemeler: [e("ÖÇ3")] },
        { no: "4", tamPuan: 20, eslemeler: son },
        { no: "5", tamPuan: 20, eslemeler: olculmeyen === "ÖÇ4" ? [e("ÖÇ3")] : [e("ÖÇ3", 0.5), e("ÖÇ4", 0.5)] },
      ],
    },
  ];
}

function matrisUret(r: Rastgele, ckSayisi: number, pcSayisi: number): CkPcMatrisi {
  const m: CkPcMatrisi = {};
  for (let i = 0; i < ckSayisi; i++) {
    const satir: CkPcMatrisi[string] = {};
    satir[`PÇ${(i % pcSayisi) + 1}`] = { tur: "puan", puan: r.tam(3, 5) as KatkiPuani };
    satir[`PÇ${((i + 2) % pcSayisi) + 1}`] = { tur: "puan", puan: r.tam(1, 3) as KatkiPuani };
    m[`ÖÇ${i + 1}`] = satir;
  }
  return m;
}

export function ornekUniversiteUret(s: UretimSecenekleri = {}): OrnekUniversite {
  const tohum = s.tohum ?? VARSAYILAN_TOHUM;
  const ogrenciSayisi = s.ogrenciSayisi ?? VARSAYILAN_OGRENCI_SAYISI;
  const r = rastgele(tohum);
  const kullanilanAd = new Set<string>();

  const birimler: OrnekBirim[] = [];
  const programlar: OrnekProgram[] = [];
  const dersler: OrnekDers[] = [];
  const kisiler: OrnekKisi[] = [];

  // Demo rollerinin kişileri: adlar sabit (rehber turu metinlerinde geçer), soyadlar kurgu sözcükleri.
  const persona = (anahtar: string, adSoyad: string, unvan: string, program: string | null) => {
    kullanilanAd.add(adSoyad);
    kisiler.push({ anahtar, adSoyad, unvan, program });
  };
  persona("p-ogretim", "Ayşe Örnek", "Dr. Öğr. Üyesi", "blm");
  persona("p-bolum", "Mert Deneme", "Prof. Dr.", "blm");
  persona("p-kalite", "Selin Kurgu", "Doç. Dr.", null);
  persona("p-rektorluk", "Emre Taslak", "Prof. Dr.", null);
  persona("p-degerlendirici", "Zeynep Sentetik", "Prof. Dr.", null);

  for (const f of FAKULTELER) {
    birimler.push({ anahtar: f.anahtar, tur: "fakulte", ad: f.ad, kod: f.kod, ust: null });
    for (const p of f.programlar) {
      const bolum = `${p.anahtar}-bolum`;
      birimler.push({ anahtar: bolum, tur: "bolum", ad: `${p.ad} Bölümü`, kod: p.kodOneki, ust: f.anahtar });
      const pcler = PC_KALIPLARI.map((k, i) => ({
        kod: `PÇ${i + 1}`,
        metin: k.replace("{alan}", p.alan).replace(/^./u, (c) => c.toLocaleUpperCase("tr")),
      }));
      programlar.push({ anahtar: p.anahtar, birim: bolum, ad: p.ad, duzey: "lisans", ciktilar: pcler });
      for (let i = 0; i < 3; i++)
        kisiler.push({
          anahtar: `${p.anahtar}-k${i + 1}`,
          adSoyad: kisiAdi(r, kullanilanAd),
          unvan: r.sec(UNVANLAR),
          program: p.anahtar,
        });
      p.dersler.forEach((ad, i) => {
        const yariyil = YARIYIL[i] ?? 8;
        const kod = `${p.kodOneki}${yariyil}${String(i + 1).padStart(2, "0")}`;
        const ciktilar = OC_KALIPLARI.map((k, j) => ({ kod: `ÖÇ${j + 1}`, metin: k.replace("{ders}", ad) }));
        const matrissiz = p.anahtar === MATRISSIZ.program && ad === MATRISSIZ.ders;
        dersler.push({
          anahtar: `${p.anahtar}-${i + 1}`,
          program: p.anahtar,
          kod,
          ad,
          akts: i === 11 ? 10 : r.sec([4, 5, 5, 6]),
          teorik: i === 11 ? 1 : 3,
          uygulama: i === 11 ? 4 : r.tam(0, 2),
          yariyil,
          zorunlu: i < 10,
          ciktilar,
          matris: matrissiz ? null : matrisUret(r, ciktilar.length, pcler.length),
        });
      });
    }
  }

  // Öğrenciler: yalnız takma ad. Programlara ve dört sınıfa eşit dağılır.
  const programAnahtarlari = programlar.map((p) => p.anahtar);
  const ogrenciler: OrnekUniversite["ogrenciler"] = [];
  const yetenek = new Map<string, number>();
  const takmaAdlar = new Set<string>();
  for (let i = 0; i < ogrenciSayisi; i++) {
    let takmaAd = "";
    do takmaAd = `T-${r.onaltilik(12)}`;
    while (takmaAdlar.has(takmaAd));
    takmaAdlar.add(takmaAd);
    const program = programAnahtarlari[i % programAnahtarlari.length] as string;
    const sinif = (Math.floor(i / programAnahtarlari.length) % 4) + 1;
    ogrenciler.push({ takmaAd, program, sinif });
    yetenek.set(takmaAd, sinirla(r.normal(0.71, 0.13), 0.15, 0.98));
  }

  // Ders açılışları, not dökümleri, ölçme sonuçları, anketler.
  const acilislar: OrnekAcilis[] = [];
  const anketler: OrnekAnket[] = [];
  const eksikler: OrnekEksik[] = [];
  const dersBul = (program: string, ad: string) => {
    const d = dersler.find((x) => x.program === program && x.ad === ad);
    if (!d) throw new Error(`Ders tanımı yok: ${program} ${ad}`);
    return d;
  };
  const ogretimDersleri = new Set(
    ["Algoritma Analizi", "Veri Tabanı Sistemleri", "Yapay Öğrenmeye Giriş"].map((a) => dersBul("blm", a).anahtar),
  );
  const programKisileri = (p: string) => kisiler.filter((k) => k.program === p && !k.anahtar.startsWith("p-"));

  for (const d of dersler) {
    const donem = d.yariyil % 2 === 1 ? "2025g" : "2025b";
    const donemAdi = DONEMLER.find((x) => x.anahtar === donem)?.ad as string;
    const sinif = Math.ceil(d.yariyil / 2);
    const sinifOgrencileri = ogrenciler.filter((o) => o.program === d.program && o.sinif === sinif);
    const zayif = ZAYIF_CIKTILAR.find((z) => z.program === d.program && z.ders === d.ad);
    const olculmeyen = OLCULMEYEN.program === d.program && OLCULMEYEN.ders === d.ad ? OLCULMEYEN.ck : null;
    const a = araclar(d.kod, olculmeyen);
    const dersEtkisi = r.normal(0, 0.05);
    const puanlar: OgrenciPuani[] = [];
    for (const arac of a) {
      for (const q of arac.sorular) {
        const anaCk = q.eslemeler[0]?.ciktiKod;
        const gucluk = r.normal(0, 0.07) + (zayif && anaCk === zayif.ck ? -0.27 : 0);
        for (const o of sinifOgrencileri) {
          const girmedi = r.olasilik(arac.tur === "yariyil_sonu" ? 0.03 : 0.02);
          const p = sinirla((yetenek.get(o.takmaAd) ?? 0.7) + dersEtkisi + gucluk + r.normal(0, 0.1), 0, 1);
          puanlar.push({
            ogrenci: o.takmaAd,
            aracId: arac.id,
            soruNo: q.no,
            puan: girmedi ? null : Math.round(p * q.tamPuan),
          });
        }
      }
    }
    // Öğrencinin bir araca hiç girmediği durumda bütün soruları boş olsun.
    const girmeyen = new Set(puanlar.filter((p) => p.puan === null).map((p) => `${p.ogrenci}|${p.aracId}`));
    for (const p of puanlar) if (girmeyen.has(`${p.ogrenci}|${p.aracId}`)) p.puan = null;

    const veri = { dersKodu: d.kod, donem: donemAdi, ciktilar: d.ciktilar, araclar: a, puanlar };
    const sonuc: DersOlcmeSonucu = dersiOlc(veri, { esik: ESIK, ...(d.matris ? { matris: d.matris } : {}) });
    const pk = programKisileri(d.program);
    const sorumlu = ogretimDersleri.has(d.anahtar)
      ? "p-ogretim"
      : (pk[Number.parseInt(d.anahtar.split("-")[1] ?? "0", 10) % pk.length]?.anahtar as string);
    const acilis = `${d.anahtar}-${donem}`;
    acilislar.push({ anahtar: acilis, ders: d.anahtar, donem, sorumlu, veri, sonuc });

    // Ders değerlendirme anketi: yanıt oranı %30-%60; eşik altı derslerde "ölçme" sorusu daha düşük.
    const az = ANKET_AZ.program === d.program && ANKET_AZ.ders === d.ad;
    const yanitSayisi = az ? 3 : Math.round(sinifOgrencileri.length * (0.3 + r.sayi() * 0.3));
    const yanitlar: Record<string, number | null>[] = [];
    for (let i = 0; i < yanitSayisi; i++) {
      const y: Record<string, number | null> = {};
      for (const s of LIKERT_SORULARI) {
        const taban = 3.9 + dersEtkisi * 4 - (zayif && s.kod === "olcme" ? 0.8 : 0);
        y[s.kod] = r.olasilik(0.04) ? null : Math.round(sinirla(r.normal(taban, 0.8), 1, 5));
      }
      yanitlar.push(y);
    }
    const ozet = LIKERT_SORULARI.map((s) => {
      const degerler = yanitlar.map((y) => y[s.kod]).filter((v): v is number => typeof v === "number");
      return { kod: s.kod, n: degerler.length, ortalama: ortalama(degerler) };
    });
    anketler.push({ anahtar: `${acilis}-anket`, acilis, davetSayisi: sinifOgrencileri.length, yanitlar, ozet });

    if (!d.matris)
      eksikler.push({
        tur: "matris",
        hedef: { tur: "ders", anahtar: d.anahtar },
        aciklama: `${d.kod} ${d.ad}: öğrenme çıktısı ile program çıktısı katkı matrisi girilmemiş; program çıktısı sağlanması hesaplanamıyor.`,
      });
    if (olculmeyen)
      eksikler.push({
        tur: "olculmeyen_cikti",
        hedef: { tur: "ders", anahtar: d.anahtar },
        aciklama: `${d.kod} ${d.ad}: ${olculmeyen} hiçbir sınav sorusuyla ölçülmemiş.`,
      });
    if (az)
      eksikler.push({
        tur: "anket_esigi",
        hedef: { tur: "ders", anahtar: d.anahtar },
        aciklama: `${d.kod} ${d.ad}: ders değerlendirme anketine ${yanitSayisi} yanıt geldi; sonuçlar 5 yanıt eşiğinin altında olduğu için gösterilmez.`,
      });
  }

  const belgeler = belgeleriUret({ programlar, dersler, kisiler, acilislar, anketler, eksikler });
  const oneriler = onerileriUret({ dersler, programlar, acilislar, belgeler, eksikler, anketler });
  const eylemler = eylemleriUret(dersler);

  const personalar: OrnekPersona[] = [
    {
      rol: "ogretim_elemani",
      kisi: "p-ogretim",
      atamalar: [...ogretimDersleri].map((anahtar) => ({
        rol: "ogretim_elemani" as const,
        kapsam: { tur: "ders" as const, anahtar },
      })),
    },
    {
      rol: "bolum_baskani",
      kisi: "p-bolum",
      atamalar: [{ rol: "program_sorumlusu", kapsam: { tur: "program", anahtar: "blm" } }],
    },
    {
      rol: "kalite_komisyonu",
      kisi: "p-kalite",
      atamalar: [{ rol: "kalite_komisyonu_uyesi", kapsam: { tur: "kurum", anahtar: "" } }],
    },
    {
      rol: "rektorluk",
      kisi: "p-rektorluk",
      atamalar: [{ rol: "kurum_yoneticisi", kapsam: { tur: "kurum", anahtar: "" } }],
    },
    {
      rol: "dis_degerlendirici",
      kisi: "p-degerlendirici",
      atamalar: [{ rol: "degerlendirici", kapsam: { tur: "kurum", anahtar: "" } }],
    },
  ];

  return {
    surum: VERI_SURUMU,
    tohum,
    kurum: { ad: KURUM_ADI, kisaAd: KURUM_KISA_ADI, esik: ESIK },
    birimler,
    programlar,
    dersler,
    kisiler,
    ogrenciler,
    donemler: DONEMLER,
    acilislar,
    anketler,
    belgeler,
    oneriler,
    eylemler,
    eksikler,
    personalar,
  };
}

interface BelgeGirdisi {
  programlar: OrnekProgram[];
  dersler: OrnekDers[];
  kisiler: OrnekKisi[];
  acilislar: OrnekAcilis[];
  anketler: OrnekAnket[];
  eksikler: OrnekEksik[];
}

/** Eşiğin altında kalan ÇK'lar (ortalama < eşik). Kaynak: `dersiOlc` sonucu. */
export function esikAltiCiktilar(a: OrnekAcilis) {
  return a.sonuc.ckBasarilari.filter((c) => c.ortalama !== null && c.ortalama < a.sonuc.esik);
}

function belgeleriUret(g: BelgeGirdisi): OrnekBelge[] {
  const belgeler: OrnekBelge[] = [];
  const kisiAdi = (anahtar: string) => {
    const k = g.kisiler.find((x) => x.anahtar === anahtar);
    return k ? `${k.unvan} ${k.adSoyad}` : "";
  };

  // Bologna ders bilgi sayfaları.
  for (const d of g.dersler) {
    const aktsEksik = AKTS_EKSIK.program === d.program && AKTS_EKSIK.ders === d.ad;
    const toplamSaat = d.akts * 25;
    const dersSaati = (d.teorik + d.uygulama) * 14;
    const bolumler = [
      {
        baslik: "Dersin tanımı",
        metin: `${d.kod} ${d.ad}. Yarıyıl: ${d.yariyil}. Teorik ${d.teorik} saat, uygulama ${d.uygulama} saat. AKTS: ${d.akts}. ${d.zorunlu ? "Zorunlu" : "Seçmeli"} ders.`,
      },
      {
        baslik: "Öğrenme çıktıları",
        metin: d.ciktilar.map((c) => `${c.kod}: ${c.metin}`).join("\n"),
      },
      { baslik: "Değerlendirme", metin: "Ara sınav %40, yarıyıl sonu sınavı %60." },
      {
        baslik: "AKTS iş yükü",
        metin: aktsEksik
          ? "Bu bölüm doldurulmamış."
          : `Ders saati: ${dersSaati} saat. Sınıf dışı çalışma: ${toplamSaat - dersSaati - 12} saat. Sınavlar: 12 saat. Toplam: ${toplamSaat} saat (${d.akts} AKTS × 25 saat).`,
      },
    ];
    belgeler.push({
      anahtar: `bologna-${d.anahtar}`,
      tur: "bologna",
      dosyaAdi: `bologna-${d.kod}.html`,
      baslik: `${d.kod} ${d.ad} ders bilgi paketi`,
      tarih: "2025-09-01",
      kapsam: { tur: "ders", anahtar: d.anahtar },
      bolumler,
    });
    if (aktsEksik)
      g.eksikler.push({
        tur: "akts_tablosu",
        hedef: { tur: "ders", anahtar: d.anahtar },
        aciklama: `${d.kod} ${d.ad}: ders bilgi paketinde AKTS iş yükü tablosu boş.`,
      });
  }

  // Bölüm kurulu ve danışma kurulu tutanakları.
  for (const p of g.programlar) {
    const pDersleri = g.dersler.filter((d) => d.program === p.anahtar);
    const pAcilislari = g.acilislar.filter((a) => pDersleri.some((d) => d.anahtar === a.ders));
    const katilimcilar = g.kisiler.filter((k) => k.program === p.anahtar).map((k) => `${k.unvan} ${k.adSoyad}`);
    const zayiflar = pAcilislari.flatMap((a) => {
      const d = pDersleri.find((x) => x.anahtar === a.ders) as OrnekDers;
      return esikAltiCiktilar(a).map(
        (c) =>
          `${d.kod} ${d.ad} dersinde ${c.ckKod} başarı ortalaması ${yuzde(c.ortalama as number)} (eşik ${yuzde(a.sonuc.esik)}).`,
      );
    });
    belgeler.push({
      anahtar: `tutanak-bolum-${p.anahtar}`,
      tur: "tutanak",
      dosyaAdi: `bolum-kurulu-${p.anahtar}-2026-06.pdf`,
      baslik: `${p.ad} Bölüm Kurulu toplantı tutanağı (Haziran 2026)`,
      tarih: "2026-06-24",
      kapsam: { tur: "program", anahtar: p.anahtar },
      bolumler: [
        { baslik: "Katılımcılar", metin: katilimcilar.join(", ") },
        {
          baslik: "Gündem",
          metin:
            "1. 2025-2026 eğitim yılı ders ölçme sonuçlarının görüşülmesi.\n2. Ders bilgi paketlerinin güncellenmesi.\n3. Ders değerlendirme anketi sonuçları.",
        },
        {
          baslik: "Kararlar",
          metin: zayiflar.length
            ? `Eşiğin altında kalan öğrenme çıktıları görüşüldü: ${zayiflar.join(" ")} Dersin sorumlusundan iyileştirme önerisi istenmesine karar verildi.`
            : `Bütün derslerde öğrenme çıktısı ortalamalarının eşiğin (${yuzde(ESIK)}) üstünde olduğu görüldü.`,
        },
      ],
    });
    if (p.anahtar === TUTANAKSIZ_PROGRAM) {
      g.eksikler.push({
        tur: "tutanak",
        hedef: { tur: "program", anahtar: p.anahtar },
        aciklama: `${p.ad}: dış paydaş (danışma kurulu) toplantısına ait tutanak yok.`,
      });
      continue;
    }
    belgeler.push({
      anahtar: `tutanak-danisma-${p.anahtar}`,
      tur: "tutanak",
      dosyaAdi: `danisma-kurulu-${p.anahtar}-2026-05.pdf`,
      baslik: `${p.ad} Danışma Kurulu toplantı tutanağı (Mayıs 2026)`,
      tarih: "2026-05-14",
      kapsam: { tur: "program", anahtar: p.anahtar },
      bolumler: [
        {
          baslik: "Katılımcılar",
          metin: `${katilimcilar.join(", ")}; iki dış paydaş temsilcisi (adları tutanakta saklıdır).`,
        },
        { baslik: "Gündem", metin: "Program çıktılarının sektör beklentileriyle karşılaştırılması." },
        {
          baslik: "Görüşler",
          metin: `Dış paydaşlar ${p.ciktilar[3]?.kod ?? "PÇ4"} (ekip çalışması) ve ${p.ciktilar[4]?.kod ?? "PÇ5"} (iletişim) çıktılarına uygulamalı derslerde daha çok yer verilmesini önerdi.`,
        },
      ],
    });
  }

  // Kurum düzeyi: kalite komisyonu tutanağı, anket sonuç özeti, PÜKÖ izleme raporu.
  const esikAltiSayisi = g.acilislar.filter((a) => esikAltiCiktilar(a).length > 0).length;
  belgeler.push({
    anahtar: "tutanak-kalite",
    tur: "tutanak",
    dosyaAdi: "kalite-komisyonu-2026-07.pdf",
    baslik: "Kalite Komisyonu toplantı tutanağı (Temmuz 2026)",
    tarih: "2026-07-02",
    kapsam: { tur: "kurum", anahtar: "" },
    bolumler: [
      { baslik: "Katılımcılar", metin: [kisiAdi("p-kalite"), kisiAdi("p-rektorluk"), kisiAdi("p-bolum")].join(", ") },
      {
        baslik: "Gündem",
        metin: "1. Birim öz değerlendirme takvimi.\n2. Eşik altı ölçme sonuçlarının izlenmesi.\n3. Eksik kanıtlar.",
      },
      {
        baslik: "Kararlar",
        metin: `${g.acilislar.length} ders açılışından ${esikAltiSayisi} tanesinde en az bir öğrenme çıktısının eşiğin altında kaldığı görüldü. Eksik kanıtların ${g.eksikler.length} kalemde toplandığı listelendi.`,
      },
    ],
  });

  const anketSatirlari = g.programlar.map((p) => {
    const pAnketleri = g.anketler.filter((a) => {
      const dersAnahtari = g.acilislar.find((x) => x.anahtar === a.acilis)?.ders;
      return g.dersler.find((d) => d.anahtar === dersAnahtari)?.program === p.anahtar;
    });
    const genel = pAnketleri
      .flatMap((a) => a.yanitlar.map((y) => y.genel))
      .filter((v): v is number => typeof v === "number");
    const ort = ortalama(genel);
    return `${p.ad}: ${genel.length} yanıt, "genel memnuniyet" ortalaması ${ort === null ? "EKSİK" : ondalik(ort)} / 5.`;
  });
  belgeler.push({
    anahtar: "anket-raporu",
    tur: "anket_raporu",
    dosyaAdi: "ders-degerlendirme-anketi-2025-2026.pdf",
    baslik: "Ders değerlendirme anketi sonuç özeti (2025-2026)",
    tarih: "2026-07-10",
    kapsam: { tur: "kurum", anahtar: "" },
    bolumler: [
      { baslik: "Yöntem", metin: "Beşli Likert ölçeği; 5 yanıtın altındaki dersler gösterilmez." },
      { baslik: "Program sonuçları", metin: anketSatirlari.join("\n") },
    ],
  });

  belgeler.push({
    anahtar: "puko-raporu",
    tur: "puko_raporu",
    dosyaAdi: "iyilestirme-izleme-2024-2025.pdf",
    baslik: "İyileştirme izleme raporu (2024-2025 döngüsü)",
    tarih: "2025-10-15",
    kapsam: { tur: "kurum", anahtar: "" },
    bolumler: [
      {
        baslik: "Planla",
        metin: "2024-2025 ölçme sonuçlarında eşik altı kalan dersler için ders sorumlularından eylem önerisi istendi.",
      },
      { baslik: "Uygula", metin: "Ek uygulama saatleri ve vaka çalışmaları 2025-2026 Güz döneminde başlatıldı." },
      {
        baslik: "Kontrol et",
        metin: "Eylemlerin etkisi 2025-2026 ölçme sonuçlarıyla karşılaştırılacak (bu rapordan sonra).",
      },
      { baslik: "Önlem al", metin: "Etkisi görülmeyen eylemler bir sonraki döngüde yeniden planlanacak." },
    ],
  });
  return belgeler;
}

interface OneriGirdisi {
  dersler: OrnekDers[];
  programlar: OrnekProgram[];
  acilislar: OrnekAcilis[];
  belgeler: OrnekBelge[];
  eksikler: OrnekEksik[];
  anketler: OrnekAnket[];
}

const KURAL_GEREKCESI = "Örnek veri kuralı: önceden hesaplanmış öneri (yapay zekâ çağrısı yapılmadı).";

function onerileriUret(g: OneriGirdisi): OrnekOneri[] {
  const oneriler: OrnekOneri[] = [];
  const ders = (anahtar: string) => g.dersler.find((d) => d.anahtar === anahtar) as OrnekDers;
  const ocAtfi = (d: OrnekDers, ck: string) => {
    const c = d.ciktilar.find((x) => x.kod === ck);
    return { belge: `bologna-${d.anahtar}`, bolum: 1, alinti: `${ck}: ${c?.metin ?? ""}` };
  };

  for (const a of g.acilislar) {
    const d = ders(a.ders);
    for (const c of esikAltiCiktilar(a)) {
      oneriler.push({
        anahtar: `eylem-${a.anahtar}-${c.ckKod}`,
        tur: "eylem",
        hedef: { tur: "ders", anahtar: d.anahtar },
        baslik: `${d.kod} ${c.ckKod} için iyileştirme eylemi`,
        metin: `${a.veri.donem} döneminde ${c.ckKod} başarı ortalaması ${yuzde(c.ortalama as number)}; eşik ${yuzde(a.sonuc.esik)}. Eşiği geçen öğrenci oranı ${yuzde((c.esikGecenOrani ?? 0) * 100)} (${c.n} öğrenci). Öneri: bu çıktıyı ölçen sorular için ek uygulama saati ve dönem içi kısa sınav. Etki, gelecek dönemin ölçme sonucuyla izlenir.`,
        gerekce: KURAL_GEREKCESI,
        risk: "orta",
        atiflar: [ocAtfi(d, c.ckKod)],
      });
    }
  }

  for (const e of g.eksikler) {
    if (e.tur === "matris") {
      const d = ders(e.hedef.anahtar);
      oneriler.push({
        anahtar: `matris-${d.anahtar}`,
        tur: "matris_katkisi",
        hedef: { tur: "ders", anahtar: d.anahtar },
        baslik: `${d.kod} katkı matrisi taslağı`,
        metin: `${d.kod} ${d.ad} için ÖÇ × PÇ katkı matrisi girilmemiş. Taslak: ÖÇ1 → PÇ1 (4), ÖÇ2 → PÇ2 (4), ÖÇ3 → PÇ3 (3), ÖÇ4 → PÇ5 (3). Onaylanana kadar program çıktısı sağlanması bu ders için EKSİK kalır.`,
        gerekce: KURAL_GEREKCESI,
        risk: "orta",
        atiflar: [ocAtfi(d, "ÖÇ1")],
      });
    }
    if (e.tur === "olculmeyen_cikti") {
      const d = ders(e.hedef.anahtar);
      oneriler.push({
        anahtar: `esleme-${d.anahtar}`,
        tur: "soru_cikti_eslemesi",
        hedef: { tur: "ders", anahtar: d.anahtar },
        baslik: `${d.kod} ÖÇ4 için soru eşlemesi`,
        metin: "ÖÇ4 hiçbir soruyla ölçülmemiş. Öneri: yarıyıl sonu sınavının 4. sorusu ÖÇ4'e eşlensin.",
        gerekce: KURAL_GEREKCESI,
        risk: "orta",
        atiflar: [ocAtfi(d, "ÖÇ4")],
      });
    }
  }

  const vt = g.dersler.find((d) => d.program === "blm" && d.ad === "Veri Tabanı Sistemleri") as OrnekDers;
  oneriler.push({
    anahtar: `bologna-${vt.anahtar}`,
    tur: "bologna_taslagi",
    hedef: { tur: "ders", anahtar: vt.anahtar },
    baslik: `${vt.kod} ders bilgi paketi: önceki dönemden devir`,
    metin: "Ders bilgi paketi 2026-2027 Güz için önceki dönemden değişmeden devredildi. Fark yok.",
    gerekce: KURAL_GEREKCESI,
    risk: "orta",
    atiflar: [{ belge: `bologna-${vt.anahtar}`, bolum: 0, alinti: `${vt.kod} ${vt.ad}.` }],
  });

  oneriler.push({
    anahtar: "tutanak-taslak-blm",
    tur: "toplanti_tutanagi",
    hedef: { tur: "program", anahtar: "blm" },
    baslik: "Bilgisayar Mühendisliği Bölüm Kurulu: Eylül 2026 tutanak taslağı",
    metin:
      "Gündem: 2026-2027 Güz ders bilgi paketleri; Algoritma Analizi iyileştirme eylemi. Kararlar bölümü toplantıdan sonra doldurulacak (EKSİK).",
    gerekce: KURAL_GEREKCESI,
    risk: "dusuk",
    atiflar: [{ belge: "tutanak-bolum-blm", bolum: 2, alinti: "Dersin sorumlusundan iyileştirme önerisi istenmesine" }],
  });

  for (const b of g.belgeler.filter((x) => x.tur !== "bologna")) {
    oneriler.push({
      anahtar: `etiket-${b.anahtar}`,
      tur: "kanit_etiketi",
      hedef: { tur: "kanit", anahtar: b.anahtar },
      baslik: `Kanıt etiketi: ${b.baslik}`,
      metin:
        b.tur === "anket_raporu"
          ? "Etiket: öğrenci geri bildirimi."
          : b.tur === "puko_raporu"
            ? "Etiket: iyileştirme döngüsü (PÜKÖ)."
            : "Etiket: karar alma ve paydaş katılımı.",
      gerekce: KURAL_GEREKCESI,
      risk: "dusuk",
      atiflar: [{ belge: b.anahtar, bolum: 0, alinti: (b.bolumler[0]?.metin ?? "").slice(0, 120) }],
    });
  }

  const genel = g.anketler
    .flatMap((a) => a.yanitlar.map((y) => y.genel))
    .filter((v): v is number => typeof v === "number");
  const genelOrt = ortalama(genel);
  oneriler.push({
    anahtar: "anket-ozeti",
    tur: "anket_ozeti",
    hedef: { tur: "kurum", anahtar: "" },
    baslik: "Ders değerlendirme anketi kurum özeti",
    metin: `${g.anketler.length} ders açılışında toplam ${genel.length} "genel memnuniyet" yanıtı; ortalama ${genelOrt === null ? "EKSİK" : ondalik(genelOrt)} / 5.`,
    gerekce: KURAL_GEREKCESI,
    risk: "dusuk",
    atiflar: [{ belge: "anket-raporu", bolum: 1, alinti: "genel memnuniyet" }],
  });

  const esikAlti = g.acilislar.filter((a) => esikAltiCiktilar(a).length > 0).length;
  oneriler.push({
    anahtar: "rapor-egitim",
    tur: "rapor_bolumu",
    hedef: { tur: "kurum", anahtar: "" },
    baslik: "Öz değerlendirme raporu: eğitim ve öğretim bölümü taslağı",
    metin: `Kurumda ${g.programlar.length} lisans programında ${g.dersler.length} ders ölçüldü. ${g.acilislar.length} ders açılışının ${esikAlti} tanesinde en az bir öğrenme çıktısı eşiğin altında kaldı ve her biri için eylem önerildi. Dış paydaş katılımı: ${g.programlar.length - 1} programda danışma kurulu tutanağı var; Kamu Yönetimi için EKSİK. Bu bölüm kurum adına beyandır; gönderimden önce yetkili kişi onaylar.`,
    gerekce: KURAL_GEREKCESI,
    risk: "yuksek",
    atiflar: [{ belge: "tutanak-kalite", bolum: 2, alinti: "en az bir öğrenme çıktısının eşiğin altında kaldığı" }],
  });
  return oneriler;
}

function eylemleriUret(dersler: OrnekDers[]): OrnekEylem[] {
  const kod = (program: string, ad: string) => dersler.find((d) => d.program === program && d.ad === ad)?.kod ?? "";
  return [
    {
      anahtar: "e1",
      tanim: `${kod("ins", "Zemin Mekaniği")} ara sınav sorularının öğrenme çıktısı eşlemesi yeniden yapıldı.`,
      asama: "kontrol_et",
      hedefTarih: "2025-12-15",
      sorumlu: "ins-k1",
      kaynak: "2024-2025 ölçme sonucu",
      belgeler: ["puko-raporu"],
    },
    {
      anahtar: "e2",
      tanim: `${kod("blm", "Algoritma Analizi")} için haftalık ek uygulama saati açıldı.`,
      asama: "onlem_al",
      hedefTarih: "2026-01-30",
      sorumlu: "p-ogretim",
      kaynak: "2024-2025 ölçme sonucu",
      belgeler: ["puko-raporu", "tutanak-bolum-blm"],
    },
    {
      anahtar: "e3",
      tanim: `${kod("hem", "Farmakoloji")} dersine vaka çalışmaları eklendi.`,
      asama: "uygula",
      hedefTarih: "2026-03-31",
      sorumlu: "hem-k1",
      kaynak: "2024-2025 ölçme sonucu",
      belgeler: ["puko-raporu"],
    },
    {
      anahtar: "e4",
      tanim: "Ders değerlendirme anketinin yanıt oranını artırmak için dönem sonu hatırlatması planlandı.",
      asama: "planla",
      hedefTarih: "2026-12-20",
      sorumlu: "p-kalite",
      kaynak: "Kalite Komisyonu kararı",
      belgeler: ["tutanak-kalite"],
    },
    {
      anahtar: "e5",
      tanim: "Kamu Yönetimi danışma kurulu toplantısı yapılacak ve tutanağı yüklenecek.",
      asama: "planla",
      hedefTarih: "2026-11-30",
      sorumlu: "kmy-k1",
      kaynak: "Eksik kanıt",
      belgeler: ["tutanak-kalite"],
    },
  ];
}
