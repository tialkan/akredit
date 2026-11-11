// Proliz OBS herkese açık Bologna ders sayfasının DÜZ METNİ (tarayıcı aracının okuduğu biçim, sekmeli tablolar).
// Sayfa bölüm başlıklarıyla (Dersin Ayrıntıları, Dersin Detayları, Değerlendirme Ölçütleri, Ders Konuları...) ayrılır;
// her bölüm kendi tablo biçimine göre okunur. Bölümler arası karışma olmaz: "Ders Konuları"nın haftaları öğrenme
// çıktısı, değerlendirme kalemleri ders yapısı sayılmaz. Boş değer ("Veri yok", "Kayıt Yok", ".") boş kalır; sayfada
// olmayan hiçbir şey doldurulmaz. Ağ ve model yoktur.

export type ProlizBolum =
  | "ayrinti"
  | "detay"
  | "kaynak"
  | "yapi"
  | "etkinlik"
  | "degerlendirme"
  | "isyuku"
  | "ciktilar"
  | "konular"
  | "katki";

/** Bölüm başlıkları; satırın tamamı (iki nokta ve sonrası hariç) eşleşir. */
/** Başlıklar küçük harfle (tr) yazılır; satır da küçültülerek eşlenir ("İ" büyük-küçük eşlemesi için). */
const BASLIKLAR: [RegExp, ProlizBolum][] = [
  [/^dersin ayrıntıları$/iu, "ayrinti"],
  [/^dersin detayları$/iu, "detay"],
  [/^ders kaynakları$/iu, "kaynak"],
  [/^ders yapısı$/iu, "yapi"],
  [/^planlanan öğrenme aktiviteleri ve metodları$/iu, "etkinlik"],
  [/^değerlendirme ölçütleri$/iu, "degerlendirme"],
  [/^akts hesaplama içeriği$/iu, "isyuku"],
  [/^dersin öğrenme çıktıları(\s*:.*)?$/iu, "ciktilar"],
  [/^ders konuları$/iu, "konular"],
  [/^dersin program çıktılarına katkısı$/iu, "katki"],
];

/** Anahtar-değer bölümlerindeki bilinen etiketler (sekmesi kırpılmış boş etiket de tanınsın diye). */
const ETIKETLER = [
  "Dersin Dili",
  "Dersin Düzeyi",
  "Bölümü / Programı",
  "Öğrenim Türü",
  "Dersin Türü",
  "Dersin Öğretim Şekli",
  "Dersin Amacı",
  "Dersin İçeriği",
  "Dersin Yöntem ve Teknikleri",
  "Ön Koşulları",
  "Dersin Koordinatörü",
  "Dersi Verenler",
  "Dersin Yardımcıları",
  "Dersin Staj Durumu",
  "Kaynaklar",
  "Ders Notları",
  "Dökümanlar",
  "Ödevler",
  "Sınavlar",
];
const kucuk = (s: string) => s.toLocaleLowerCase("tr").replace(/\s+/gu, " ").trim();
const ETIKET_KUMESI = new Set(ETIKETLER.map(kucuk));

function baslikMi(satir: string): ProlizBolum | null {
  const s = kucuk(satir);
  for (const [re, b] of BASLIKLAR) if (re.test(s)) return b;
  return null;
}

/** Sayfada yazan ama içi boş değer. */
export const bosDeger = (s: string | undefined) => {
  const t = (s ?? "").replace(/\s+/gu, " ").trim();
  return !t || /^(veri yok|kayıt yok|yok kayıt)\.*$/iu.test(t) || /^[.\-–]+$/u.test(t);
};

/** Proliz ders sayfasının düz metni mi? En az üç bölüm başlığı satır olarak geçer (boş pakette de). */
export function prolizSayfaMetniMi(girdi: string): boolean {
  if (/<\/?(table|tr|td)\b/iu.test(girdi)) return false;
  const bulunan = new Set<ProlizBolum>();
  for (const s of girdi.split(/\r?\n/u)) {
    const b = baslikMi(s);
    if (b) bulunan.add(b);
  }
  return bulunan.size >= 3;
}

export interface ProlizMetinDersi {
  kod?: string;
  ad?: string;
  yariyil: number | null;
  tul?: string;
  kredi: number | null;
  akts: number | null;
  guncelleme?: string;
  amac: string;
  icerik: string;
  yontem: string;
  notlar: string;
  ciktilar: { kod: string; metin: string }[];
  degerlendirme: { ad: string; sayi: number | null; katki: number | null }[];
  /** Sayfadaki değerlendirme tablosu satırları, olduğu gibi (degerlendirmeKaniti olarak verilir). */
  degerlendirmeKaniti: string;
  isyuku: { ad: string; sayi: number | null; sure: number | null; toplam: number | null }[];
  dersYapisi: { alan: string; yuzde: number | null }[];
  haftaKonulari: string[];
  /** Ö satırları, P sütunları, sayı 1-5 (boş hücre yok). */
  katki: Record<string, Record<string, number>>;
  /** "Tüm" satırı ayrı. */
  katkiTum: Record<string, number>;
  /** Matris başlığındaki P kodları (boş pakette de okunur). */
  pKodlari: string[];
}

export interface ProlizMetinSonucu {
  ders: ProlizMetinDersi;
  bilgiler: Record<string, string>;
  yetkililer: { rol: string; deger: string }[];
  kaynaklar: string[];
  /** Sayfada değeri olan alanlar. */
  bulunan: string[];
  bulunamayan: string[];
}

const sayiOku = (s: string | undefined): number | null => {
  const m = (s ?? "").replace(",", ".").match(/-?\d+(?:\.\d+)?/u);
  return m ? Number(m[0]) : null;
};
const hucreler = (s: string) => s.split("\t").map((x) => x.replace(/\s+/gu, " ").trim());

/** Proliz düz metnini bölüm bölüm okur. */
export function prolizMetniCoz(girdi: string): ProlizMetinSonucu {
  const bolumler = new Map<ProlizBolum, string[]>();
  let aktif: string[] | null = null;
  for (const ham of girdi.split(/\r?\n/u)) {
    const b = baslikMi(ham);
    if (b) {
      aktif = bolumler.get(b) ?? [];
      bolumler.set(b, aktif);
      continue;
    }
    if (/^\s*katkı düzeyi\s*:/iu.test(ham)) {
      aktif = null;
      continue;
    }
    if (aktif && ham.trim()) aktif.push(ham);
  }
  const satirlar = (b: ProlizBolum) => bolumler.get(b) ?? [];

  // Dersin Ayrıntıları: başlık satırı ve altında değer satırı.
  const ayrinti: Record<string, string> = {};
  const ay = satirlar("ayrinti");
  const bi = ay.findIndex((s) => /\bkodu\b/iu.test(s) && s.includes("\t"));
  if (bi >= 0 && ay[bi + 1]) {
    const bas = hucreler(ay[bi] ?? "");
    const deg = hucreler(ay[bi + 1] ?? "");
    const ALAN: [RegExp, string][] = [
      [/^yarıyıl$|^semester$/iu, "yariyil"],
      [/^kodu$|^code$/iu, "kod"],
      [/^adı$|^name$/iu, "ad"],
      [/^t\+u\+l$/iu, "tul"],
      [/^kredi$|^credit$/iu, "kredi"],
      [/^akts$|^ects$/iu, "akts"],
      [/güncelleme/iu, "guncelleme"],
    ];
    bas.forEach((h, j) => {
      const a = ALAN.find(([re]) => re.test(h))?.[1];
      const v = deg[j] ?? "";
      if (a && !bosDeger(v)) ayrinti[a] = v;
    });
  }

  // Anahtar-değer bölümleri: "Etiket<TAB>değer", değerin devamı sekmesiz sonraki satırlar.
  const anahtarDeger = (b: ProlizBolum) => {
    const sonuc: [string, string[]][] = [];
    for (const s of satirlar(b)) {
      const sekmeli = s.includes("\t");
      const [ilk = "", ...kalan] = hucreler(s);
      if (sekmeli && ilk) sonuc.push([ilk, [kalan.join(" ").trim()]]);
      else if (ETIKET_KUMESI.has(kucuk(s))) sonuc.push([s.trim(), [""]]);
      else if (sonuc.length) sonuc.at(-1)?.[1].push(s.trim());
    }
    return sonuc.map(([e, d]): [string, string] => {
      const metin = d
        .map((x) => x.trim())
        .filter((x) => !bosDeger(x))
        .join("\n")
        .trim();
      return [e, metin];
    });
  };
  const kv = new Map<string, string>();
  for (const [e, d] of [...anahtarDeger("detay"), ...anahtarDeger("kaynak")]) kv.set(kucuk(e), d);
  const al = (e: string) => kv.get(kucuk(e)) ?? "";

  const bilgiler: Record<string, string> = {};
  const BILGI: [string, string][] = [
    ["Dersin Dili", "dil"],
    ["Dersin Düzeyi", "duzey"],
    ["Bölümü / Programı", "program"],
    ["Öğrenim Türü", "ogrenimTuru"],
    ["Dersin Türü", "tur"],
    ["Dersin Öğretim Şekli", "ogretimSekli"],
    ["Dersin Staj Durumu", "stajDurumu"],
  ];
  for (const [e, a] of BILGI) if (al(e)) bilgiler[a] = al(e);
  const onKosul = al("Ön Koşulları")
    .replace(/^\(\s*(.*?)\s*\)$/su, "$1")
    .trim();
  if (onKosul) bilgiler.onKosul = onKosul;

  const yetkililer = ["Dersin Koordinatörü", "Dersi Verenler", "Dersin Yardımcıları"]
    .filter((e) => kv.has(kucuk(e)) && al(e))
    .map((rol) => ({ rol, deger: al(rol).replace(/\n/gu, ", ") }));
  const kaynaklar = al("Kaynaklar")
    .split(/\n|;\s+(?=\S)/u)
    .map((x) => x.replace(/^\s*(\[\d+\]|\d{1,2}[.)-]|[-•*–])\s*/u, "").trim())
    .filter((x) => x.length >= 5);

  // Tablo bölümleri: başlık satırı (rakamsız) atlanır, "Toplam" satırı sayılmaz.
  const tabloSatirlari = (b: ProlizBolum) =>
    satirlar(b)
      .map(hucreler)
      .filter((h) => h.length >= 2 && h[0] && !bosDeger(h[0]) && h.slice(1).some((x) => /\d/u.test(x)));
  const TOPLAM = /^toplam/iu;

  const degerlendirmeSatirlari = satirlar("degerlendirme").filter((s) => !bosDeger(s));
  const degerlendirme = tabloSatirlari("degerlendirme")
    .filter((h) => !TOPLAM.test(h[0] ?? ""))
    .map((h) => ({ ad: h[0] ?? "", sayi: sayiOku(h[1]), katki: sayiOku(h.at(-1)) }));
  const isyuku = tabloSatirlari("isyuku")
    .filter((h) => !TOPLAM.test(h[0] ?? "") && h.length >= 4)
    .map((h) => ({ ad: h[0] ?? "", sayi: sayiOku(h[1]), sure: sayiOku(h[2]), toplam: sayiOku(h[3]) }));
  const dersYapisi = satirlar("yapi")
    .map(hucreler)
    .filter((h) => h.length >= 2 && h[0] && /\d/u.test(h[1] ?? ""))
    .map((h) => ({ alan: h[0] ?? "", yuzde: sayiOku(h[1]) }));

  const numarali = (b: ProlizBolum) =>
    satirlar(b)
      .map(hucreler)
      .filter((h) => /^\d{1,2}$/u.test(h[0] ?? "") && h.slice(1).join(" ").trim())
      .map((h) =>
        h
          .slice(1)
          .filter((x) => !bosDeger(x))
          .join(" ")
          .trim(),
      )
      .filter(Boolean);
  const ciktilar = numarali("ciktilar").map((metin, i) => ({ kod: `Ö${i + 1}`, metin }));
  const haftaKonulari = numarali("konular");

  // Katkı matrisi: başlıkta P kodları; satır başı Ö kodu ya da "Tüm".
  const katki: Record<string, Record<string, number>> = {};
  const katkiTum: Record<string, number> = {};
  let pKodlari: string[] = [];
  let sutunlar: { j: number; p: string }[] = [];
  for (const s of satirlar("katki")) {
    const h = s.split("\t").map((x) => x.trim());
    const ps = h.map((x, j) => ({ j, m: x.match(/^P\s*(\d{1,2})$/iu) })).filter((x) => x.m);
    if (ps.length >= 2) {
      sutunlar = ps.map(({ j, m }) => ({ j, p: `P${Number(m?.[1])}` }));
      pKodlari = sutunlar.map((x) => x.p);
      continue;
    }
    const m = (h[0] ?? "").match(/^(?:Ö|ÖÇ)\s*(\d{1,2})$|^(Tüm)$/iu);
    if (!m || !sutunlar.length) continue;
    const deger: Record<string, number> = {};
    for (const { j, p } of sutunlar) {
      const v = h[j] ?? "";
      if (/^[1-5]$/u.test(v)) deger[p] = Number(v);
    }
    if (m[2]) Object.assign(katkiTum, deger);
    else katki[`Ö${Number(m[1])}`] = deger;
  }

  const ders: ProlizMetinDersi = {
    ...(ayrinti.kod ? { kod: ayrinti.kod } : {}),
    ...(ayrinti.ad ? { ad: ayrinti.ad } : {}),
    yariyil: sayiOku(ayrinti.yariyil),
    ...(ayrinti.tul ? { tul: ayrinti.tul.replace(/\s/gu, "") } : {}),
    kredi: sayiOku(ayrinti.kredi),
    akts: sayiOku(ayrinti.akts),
    ...(ayrinti.guncelleme ? { guncelleme: ayrinti.guncelleme } : {}),
    amac: al("Dersin Amacı"),
    icerik: al("Dersin İçeriği"),
    yontem: al("Dersin Yöntem ve Teknikleri"),
    notlar: al("Ders Notları"),
    ciktilar,
    degerlendirme,
    degerlendirmeKaniti: degerlendirme.length ? degerlendirmeSatirlari.join("\n") : "",
    isyuku,
    dersYapisi,
    haftaKonulari,
    katki,
    katkiTum,
    pKodlari,
  };
  const varMi: Record<string, boolean> = {
    kod: Boolean(ders.kod),
    ad: Boolean(ders.ad),
    tul: Boolean(ders.tul),
    kredi: ders.kredi !== null,
    akts: ders.akts !== null,
    dil: Boolean(bilgiler.dil),
    tur: Boolean(bilgiler.tur),
    onKosul: Boolean(bilgiler.onKosul),
    amac: Boolean(ders.amac),
    icerik: Boolean(ders.icerik),
    yontem: Boolean(ders.yontem),
    notlar: Boolean(ders.notlar),
    ciktilar: ciktilar.length > 0,
    haftalar: haftaKonulari.length > 0,
    degerlendirme: degerlendirme.length > 0,
    isyuku: isyuku.length > 0,
    kaynaklar: kaynaklar.length > 0,
    katki: Object.keys(katki).length > 0,
    dersYapisi: dersYapisi.length > 0,
  };
  return {
    ders,
    bilgiler,
    yetkililer,
    kaynaklar,
    bulunan: Object.keys(varMi).filter((k) => varMi[k]),
    bulunamayan: Object.keys(varMi).filter((k) => !varMi[k]),
  };
}
