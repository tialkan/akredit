// Tablo dönüştürücüsü: kurumun mevcut verisini (Bologna ders bilgisi, program çıktıları, ders-PÇ
// matrisi, kurumun onayladığı eşlemeler) ÖDR tablo biçimine çevirir. Saf işlevdir: IO yok, model yok.
// Sayılar yalnız girdideki değerlerden ve toplamadan gelir; değeri olmayan hücre EKSİK çıkar,
// boş ya da sıfır yazılmaz.

import { z } from "zod";
import { type Cerceve, tumOlcutler } from "../sema.ts";
import type { Sutun, TabloTanimi } from "./tablolar.ts";

export const EKSIK = "EKSİK" as const;

// ---------------------------------------------------------------- Girdi

const bolognaDersiSemasi = z.union([
  z.object({
    kod: z.string().min(1),
    ad: z.string().optional(),
    yariyil: z.number().int().nullable(),
    tul: z.string().optional(),
    kredi: z.number().nullable(),
    akts: z.number().nullable(),
    zorunlu: z.boolean(),
    bos: z.boolean(),
    bilgiler: z.record(z.string(), z.string()),
  }),
  z.object({ kod: z.string().min(1), hata: z.string() }),
]);

/** Bologna verisinin dönüştürücünün kullandığı kısmı (@akredit/cekirdek BolognaVerisi ile uyumlu). */
const bolognaSemasi = z.object({
  adres: z.string(),
  okundu: z.string(),
  programCiktilari: z.array(z.object({ kod: z.string().min(1), metin: z.string() })),
  matris: z.object({
    pkodlar: z.array(z.string()),
    dersler: z.array(
      z.object({
        kod: z.string(),
        ad: z.string(),
        grupBasligi: z.boolean(),
        degerler: z.record(z.string(), z.string()),
      }),
    ),
  }),
  dersler: z.array(bolognaDersiSemasi),
});

export type ProgramBolognaVerisi = z.input<typeof bolognaSemasi>;

export const programTabloVerisiSemasi = z.object({
  programAd: z.string().min(1),
  bologna: bolognaSemasi.nullable(),
  /** Ders kodu → tablonun kategori ya da ders türü kodu. Kurumun onayladığı eşlemedir; Akredit tahmin etmez. */
  dersKategorileri: z.record(z.string(), z.string()).default({}),
  /** Program çıktısı kodu → kapsadığı kurul çıktısı kodları (ör. "3.C1"). Kurumun onayladığı eşlemedir. */
  pcKurulEslemesi: z.record(z.string(), z.array(z.string())).default({}),
  /** Ders kodu → öğrenci bilgi sisteminden şube bilgisi (son iki yarıyıl). */
  subeler: z
    .record(
      z.string(),
      z.object({ subeSayisi: z.number().int().nonnegative(), enKalabalik: z.number().int().nonnegative() }),
    )
    .default({}),
  /**
   * Yarıyıl ("1", "2", ...) → o yarıyılda planda kaç seçmeli ders yeri var. Kurum girdisidir; Bologna'da
   * yoktur. Toplam satırında seçmeli dersler bu sayı kadar sayılır.
   */
  secmeliYerSayilari: z.record(z.string().regex(/^\d+$/u), z.number().int().nonnegative()).default({}),
});
export type ProgramTabloVerisi = z.infer<typeof programTabloVerisiSemasi>;
export type ProgramTabloVerisiGirdisi = z.input<typeof programTabloVerisiSemasi>;

// ---------------------------------------------------------------- Çıktı

export type Hucre =
  | { tur: "deger"; metin: string; sayi?: number; kaynak: string }
  | { tur: "eksik"; neden: string }
  | { tur: "bos" };

export type Satir = { tur: "ara"; metin: string } | { tur: "veri" | "toplam"; hucreler: Hucre[] };

export interface UretilenTablo {
  tanimKod: string;
  cerceveKod: string;
  baslik: string;
  programAd: string;
  kaynak: { dosya: string; sha256: string; sayfa: number | null; bolum: string };
  dayanak: string;
  basliklar: string[];
  satirlar: Satir[];
  notlar: string[];
  eksikSayisi: number;
}

const eksik = (neden: string): Hucre => ({ tur: "eksik", neden });
const BOS: Hucre = { tur: "bos" };
const deger = (metin: string, kaynak: string, sayi?: number): Hucre =>
  sayi === undefined ? { tur: "deger", metin, kaynak } : { tur: "deger", metin, sayi, kaynak };

/** Ondalığı Türkçe yazar (virgül). Tam sayı olduğu gibi kalır. */
export function sayiMetni(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100).replace(".", ",");
}

// ---------------------------------------------------------------- Ders satırları

interface DersKaydi {
  kod: string;
  ad?: string | undefined;
  yariyil: number | null;
  tul?: string | undefined;
  kredi: number | null;
  akts: number | null;
  zorunlu: boolean;
  dil?: string | undefined;
  okunamadi?: string;
}

function dersler(v: ProgramTabloVerisi): DersKaydi[] {
  const sonuc: DersKaydi[] = [];
  for (const d of v.bologna?.dersler ?? []) {
    if ("hata" in d) {
      sonuc.push({ kod: d.kod, yariyil: null, kredi: null, akts: null, zorunlu: true, okunamadi: d.hata });
      continue;
    }
    if (d.bos) continue;
    const dilAnahtari = Object.keys(d.bilgiler).find((a) => /Dersin Dili|Language/iu.test(a));
    const dil = dilAnahtari ? d.bilgiler[dilAnahtari]?.trim() : undefined;
    sonuc.push({
      kod: d.kod,
      ad: d.ad,
      yariyil: d.yariyil,
      tul: d.tul,
      kredi: d.kredi,
      akts: d.akts,
      zorunlu: d.zorunlu,
      ...(dil ? { dil } : {}),
    });
  }
  // Yarıyıl sırası, sonra ders kodu; yarıyılı belirsiz dersler sona.
  return sonuc.sort((a, b) => (a.yariyil ?? 99) - (b.yariyil ?? 99) || a.kod.localeCompare(b.kod, "tr"));
}

/** "2+1+0" → [teorik, uygulama, laboratuvar]; biçim tutmuyorsa null. */
export function tulAyir(tul: string | undefined): [number, number, number] | null {
  const m = /^\s*(\d+(?:[.,]\d+)?)\s*\+\s*(\d+(?:[.,]\d+)?)\s*\+\s*(\d+(?:[.,]\d+)?)\s*$/u.exec(tul ?? "");
  if (!m) return null;
  const s = (x: string | undefined) => Number((x ?? "").replace(",", "."));
  return [s(m[1]), s(m[2]), s(m[3])];
}

function krediMetni(d: DersKaydi, bicim: "akts" | "yerel-akts"): Hucre {
  if (d.akts === null) return eksik("Dersin AKTS değeri Bologna sayfasında yok.");
  if (bicim === "akts") return deger(sayiMetni(d.akts), `bologna:${d.kod}#akts`, d.akts);
  if (d.kredi === null) return eksik("Dersin yerel kredisi Bologna sayfasında yok.");
  return deger(`${sayiMetni(d.kredi)}-${sayiMetni(d.akts)}`, `bologna:${d.kod}#kredi,akts`);
}

function dersHucresi(s: Sutun, d: DersKaydi, v: ProgramTabloVerisi, t: TabloTanimi): Hucre {
  if (s.kaynak === null) return eksik("Bu sütunun Akredit'te veri kaynağı yok.");
  if (d.okunamadi && s.kaynak !== "ders.kod") return eksik(`Ders sayfası okunamadı: ${d.okunamadi}`);
  const tul = tulAyir(d.tul);
  const tulEksik = eksik("Dersin T+U+L saatleri Bologna sayfasında okunamadı.");
  const kaynak = (alan: string) => `bologna:${d.kod}#${alan}`;
  switch (s.kaynak) {
    case "ders.kod":
      return deger(d.kod, kaynak("kod"));
    case "ders.ad":
      return d.ad ? deger(d.ad, kaynak("ad")) : eksik("Dersin adı Bologna sayfasında yok.");
    case "ders.dil":
      return d.dil ? deger(d.dil, kaynak("dil")) : eksik("Dersin öğretim dili Bologna sayfasında yok.");
    case "ders.teorik":
      return tul ? deger(sayiMetni(tul[0]), kaynak("tul"), tul[0]) : tulEksik;
    case "ders.uygulama":
      return tul ? deger(sayiMetni(tul[1]), kaynak("tul"), tul[1]) : tulEksik;
    case "ders.laboratuvar":
      return tul ? deger(sayiMetni(tul[2]), kaynak("tul"), tul[2]) : tulEksik;
    case "ders.uygulamaLab":
      return tul ? deger(sayiMetni(tul[1] + tul[2]), kaynak("tul"), tul[1] + tul[2]) : tulEksik;
    case "ders.akts":
      return krediMetni(d, "akts");
    case "ders.zorunluSecmeli":
      return deger(d.zorunlu ? "Z" : "S", kaynak("zorunlu"));
    case "ders.turu": {
      const tur = v.dersKategorileri[d.kod];
      if (!tur) return eksik("Dersin türü için kurum eşlemesi girilmedi.");
      if (!t.turler.includes(tur)) return eksik(`Ders türü bu tabloda geçerli değil: ${tur}`);
      return deger(tur, `esleme:ders-kategorisi#${d.kod}`);
    }
    case "ders.kategori": {
      const kat = v.dersKategorileri[d.kod];
      if (!kat) return eksik("Dersin kategorisi için kurum eşlemesi girilmedi.");
      if (!t.kategoriler.includes(kat)) return eksik(`Kategori bu tabloda geçerli değil: ${kat}`);
      return kat === s.kategori ? krediMetni(d, s.bicim ?? "akts") : BOS;
    }
    case "ders.subeSayisi": {
      const sb = v.subeler[d.kod];
      return sb ? deger(String(sb.subeSayisi), `obs:${d.kod}#sube`, sb.subeSayisi) : eksik("Şube bilgisi aktarılmadı.");
    }
    case "ders.enKalabalikSube": {
      const sb = v.subeler[d.kod];
      return sb
        ? deger(String(sb.enKalabalik), `obs:${d.kod}#enKalabalik`, sb.enKalabalik)
        : eksik("Şube bilgisi aktarılmadı.");
    }
  }
}

/**
 * Toplam satırı. Yalnız `toplanir` sütunlar toplanır. Sütunda bir EKSİK varsa toplam da EKSİK olur
 * (eksik veriyle toplam yazılmaz). ÖDR şablonları seçmeli dersin planda yer aldığı sayı kadar sayılmasını
 * ister: her yarıyılın seçmeli dersleri, kurumun girdiği yer sayısı kadar sayılır. Yer sayısı girilmemişse,
 * yarıyılı belirsizse ya da o yarıyılın seçmeli dersleri sütunda farklı değer taşıyorsa (hangisinin
 * sayılacağı bilinemez) toplam EKSİK olur.
 */
function toplamSatiri(t: TabloTanimi, v: ProgramTabloVerisi, kayitlar: DersKaydi[], satirlar: Hucre[][]): Hucre[] {
  return t.sutunlar.map((s, i) => {
    if (i === 0) return deger("Toplam", "hesap:toplam");
    if (!s.toplanir) return BOS;
    const hucreler = satirlar.map((r) => r[i] ?? BOS);
    if (hucreler.some((h) => h.tur === "eksik")) return eksik("Sütunda eksik değer var; toplam hesaplanmadı.");
    let akts = 0;
    let kredi = 0;
    const secmeli = new Map<number | null, { akts: number; kredi: number }[]>();
    for (const [j, h] of hucreler.entries()) {
      const d = kayitlar[j];
      if (!d) continue;
      // Değer hücresi dersin kredisini taşır; boş hücre (başka kategori) sıfır katkıdır.
      const k = h.tur === "deger" ? { akts: d.akts ?? 0, kredi: d.kredi ?? 0 } : { akts: 0, kredi: 0 };
      if (d.zorunlu) {
        akts += k.akts;
        kredi += k.kredi;
      } else secmeli.set(d.yariyil, [...(secmeli.get(d.yariyil) ?? []), k]);
    }
    const yerler: string[] = [];
    for (const [yy, katkilar] of [...secmeli].sort((a, b) => (a[0] ?? 99) - (b[0] ?? 99))) {
      if (yy === null) return eksik("Yarıyılı belirtilmemiş seçmeli ders var; toplam hesaplanmadı.");
      const n = v.secmeliYerSayilari[String(yy)];
      if (n === undefined) return eksik(`${yy}. yarıyılın seçmeli ders yer sayısı girilmedi; toplam hesaplanmadı.`);
      yerler.push(String(yy));
      if (n === 0) continue;
      const ilk = katkilar[0] ?? { akts: 0, kredi: 0 };
      if (katkilar.some((k) => k.akts !== ilk.akts || k.kredi !== ilk.kredi))
        return eksik(`${yy}. yarıyılın seçmeli dersleri bu sütunda farklı değer taşıyor; toplam hesaplanmadı.`);
      akts += n * ilk.akts;
      kredi += n * ilk.kredi;
    }
    const metin = s.bicim === "yerel-akts" ? `${sayiMetni(kredi)}-${sayiMetni(akts)}` : sayiMetni(akts);
    const kaynak = `hesap:toplam#${s.kod}${yerler.length ? `;esleme:secmeli-yer#${yerler.join(",")}` : ""}`;
    return deger(metin, kaynak, s.bicim === "yerel-akts" ? undefined : akts);
  });
}

function dersTablosu(t: TabloTanimi, v: ProgramTabloVerisi): Satir[] {
  const kayitlar = dersler(v);
  const satirlar: Satir[] = [];
  const veriSatirlari: Hucre[][] = [];
  let sonYariyil: number | null | undefined;
  for (const d of kayitlar) {
    if (d.yariyil !== sonYariyil) {
      satirlar.push({
        tur: "ara",
        metin: d.yariyil === null ? "Yarıyılı belirtilmemiş dersler" : `${d.yariyil}. Yarıyıl`,
      });
      sonYariyil = d.yariyil;
    }
    const hucreler = t.sutunlar.map((s) => dersHucresi(s, d, v, t));
    veriSatirlari.push(hucreler);
    satirlar.push({ tur: "veri", hucreler });
  }
  if (t.sutunlar.some((s) => s.toplanir) && kayitlar.length)
    satirlar.push({ tur: "toplam", hucreler: toplamSatiri(t, v, kayitlar, veriSatirlari) });
  return satirlar;
}

// ---------------------------------------------------------------- Matris tabloları

function dersPcTablosu(v: ProgramTabloVerisi): { basliklar: string[]; satirlar: Satir[] } {
  const pkodlar = v.bologna?.matris.pkodlar ?? [];
  const satirlar: Satir[] = [];
  for (const d of v.bologna?.matris.dersler ?? []) {
    if (d.grupBasligi) {
      satirlar.push({ tur: "ara", metin: d.ad || d.kod });
      continue;
    }
    const hucreler: Hucre[] = [deger(d.kod, `bologna:matris#${d.kod}`), deger(d.ad, `bologna:matris#${d.kod}`)];
    for (const p of pkodlar) {
      const h = (d.degerler[p] ?? "").trim();
      if (/^[1-5]$/u.test(h)) hucreler.push(deger(h, `bologna:matris#${d.kod}/${p}`, Number(h)));
      else if (h === "-") hucreler.push(deger("-", `bologna:matris#${d.kod}/${p}`));
      else hucreler.push(eksik("Matriste bu hücre boş."));
    }
    satirlar.push({ tur: "veri", hucreler });
  }
  return { basliklar: ["Ders Kodu", "Dersin Adı", ...pkodlar], satirlar };
}

/** Kurul çıktıları: çerçevedeki "<ölçüt>.C<n>" kodlu düğümler (belgedeki çıktı listesi). */
export function kurulCiktilari(c: Cerceve): { kod: string; etiket: string }[] {
  return tumOlcutler(c.olcutler)
    .filter((o) => /\.C\d+$/u.test(o.kod))
    .map((o) => ({ kod: o.kod, etiket: o.baslik.replace(/\.$/u, "") }));
}

function pcKurulTablosu(v: ProgramTabloVerisi, c: Cerceve): { basliklar: string[]; satirlar: Satir[] } {
  const ciktilar = kurulCiktilari(c);
  const pcler = v.bologna?.programCiktilari ?? [];
  const satirlar: Satir[] = [];
  for (const p of pcler) {
    const esleme = v.pcKurulEslemesi[p.kod];
    const hucreler: Hucre[] = [deger(p.kod, `bologna:pc#${p.kod}`), deger(p.metin, `bologna:pc#${p.kod}`)];
    for (const k of ciktilar)
      hucreler.push(
        esleme === undefined
          ? eksik("Bu program çıktısının kurul çıktılarıyla eşlemesi girilmedi.")
          : esleme.includes(k.kod)
            ? deger("X", `esleme:pc-kurul#${p.kod}/${k.kod}`)
            : BOS,
      );
    satirlar.push({ tur: "veri", hucreler });
  }
  // Her kurul çıktısını kapsayan program çıktısı sayısı. Eşlemesi eksik PÇ varsa sayı yazılmaz.
  if (pcler.length) {
    const tumu = pcler.every((p) => v.pcKurulEslemesi[p.kod] !== undefined);
    satirlar.push({
      tur: "toplam",
      hucreler: [
        deger("Kapsayan PÇ sayısı", "hesap:sayim"),
        BOS,
        ...ciktilar.map((k) => {
          if (!tumu) return eksik("Eşlemesi girilmemiş program çıktısı var; sayım yapılmadı.");
          const n = pcler.filter((p) => v.pcKurulEslemesi[p.kod]?.includes(k.kod)).length;
          return deger(String(n), `hesap:sayim#${k.kod}`, n);
        }),
      ],
    });
  }
  return { basliklar: ["PÇ", "Program çıktısı", ...ciktilar.map((k) => k.etiket)], satirlar };
}

// ---------------------------------------------------------------- Ana işlev

/**
 * Tablo tanımını kurum verisiyle doldurur. `cerceve` yalnız program çıktısı-kurul çıktısı
 * tablosunda gerekir (kurul çıktıları çerçeveden okunur). Girdi şemadan geçirilir.
 */
export function tabloUret(t: TabloTanimi, girdi: ProgramTabloVerisiGirdisi, cerceve?: Cerceve): UretilenTablo {
  const v = programTabloVerisiSemasi.parse(girdi);
  if (!t.kaynak.sha256 || !t.kaynak.dosya) throw new Error("Tablo tanımının resmî belge özeti yok.");
  let basliklar: string[];
  let satirlar: Satir[];
  if (t.duzen === "ders") {
    basliklar = t.sutunlar.map((s) => s.baslik);
    satirlar = dersTablosu(t, v);
  } else if (t.duzen === "ders-pc") {
    ({ basliklar, satirlar } = dersPcTablosu(v));
  } else {
    if (!cerceve || cerceve.kod !== t.cerceveKod) throw new Error(`${t.kod} için ${t.cerceveKod} çerçevesi verilmeli.`);
    ({ basliklar, satirlar } = pcKurulTablosu(v, cerceve));
  }
  if (!v.bologna) satirlar = [{ tur: "veri", hucreler: basliklar.map(() => eksik("Bologna verisi aktarılmadı.")) }];
  const eksikSayisi = satirlar.reduce(
    (n, s) => n + (s.tur === "ara" ? 0 : s.hucreler.filter((h) => h.tur === "eksik").length),
    0,
  );
  const notlar = [...t.notlar];
  if (!v.bologna) notlar.unshift("Bologna verisi aktarılmadı; tablo boş. Önce ders bilgi paketini aktarın.");
  return {
    tanimKod: t.kod,
    cerceveKod: t.cerceveKod,
    baslik: t.baslik,
    programAd: v.programAd,
    kaynak: { dosya: t.kaynak.dosya, sha256: t.kaynak.sha256, sayfa: t.sayfa, bolum: t.bolum },
    dayanak: t.dayanak,
    basliklar,
    satirlar,
    notlar,
    eksikSayisi,
  };
}

// ---------------------------------------------------------------- Belge şablonuna çeviri

/** @akredit/belge tabloSablonu girdisiyle aynı yapı (paketler arası bağımlılık olmadan). */
export interface SablonTablosuGirdisi {
  baslik: string;
  aciklama: string[];
  basliklar: string[];
  satirlar: ({ ara: string } | { hucreler: (string | number | null)[]; toplam?: boolean })[];
}

/** Üretilen tabloyu Word/Excel şablonu girdisine çevirir. EKSİK hücre `null` olur (belgede "EKSİK" yazılır). */
export function sablonTablosu(u: UretilenTablo): SablonTablosuGirdisi {
  const yer = u.kaynak.sayfa === null ? u.kaynak.bolum : `${u.kaynak.bolum}, s. ${u.kaynak.sayfa}`;
  return {
    baslik: u.baslik,
    aciklama: [
      `${u.programAd}. Kaynak şablon: ${u.kaynak.dosya} (${yer}), SHA-256 ${u.kaynak.sha256.slice(0, 12)}.`,
      ...u.notlar,
    ],
    basliklar: u.basliklar,
    satirlar: u.satirlar.map((s) =>
      s.tur === "ara"
        ? { ara: s.metin }
        : {
            hucreler: s.hucreler.map((h) => (h.tur === "eksik" ? null : h.tur === "bos" ? "" : (h.sayi ?? h.metin))),
            ...(s.tur === "toplam" ? { toplam: true } : {}),
          },
    ),
  };
}
