// Excel ya da CSV'den yapıştırılan not tablosunu ck_pc_hesapla girdisine hazırlar. Öğrenci kimliği (ad, soyad,
// numara, e-posta) ayrıştırmadan önce bellekte atılır ve satır sırasına göre o1, o2, ... takma adı verilir; atılan
// değerler hiçbir yere yazılmaz. Sütun başlıklarından ölçme aracı, soru numarası, tam puan ve ders çıktısı (ÇK)
// eşlemesi sezilir; sezilemeyen bilgi tahmin edilmez, eksikler listesine girer. Sayılar yalnız tablodan okunur.

import { z } from "zod";
import { type AracSonucu, arac, KOD_KAYNAGI } from "./temel.ts";

export type Ayirac = "\t" | ";" | ",";

export function ayiracBul(metin: string): Ayirac {
  const satirlar = metin
    .split(/\r?\n/u)
    .filter((s) => s.trim())
    .slice(0, 5);
  if (satirlar.some((s) => s.includes("\t"))) return "\t";
  const say = (c: string) => satirlar.reduce((t, s) => t + s.split(c).length - 1, 0);
  return say(";") >= say(",") && say(";") > 0 ? ";" : ",";
}

/** Basit CSV/TSV ayrıştırma; çift tırnaklı hücreleri destekler. */
export function tabloOku(metin: string): { ayirac: Ayirac; satirlar: string[][] } {
  const ayirac = ayiracBul(metin);
  const satirlar = metin
    .split(/\r?\n/u)
    .filter((s) => s.trim())
    .map((s) => {
      const hucreler: string[] = [];
      let h = "";
      let tirnak = false;
      for (const ch of s) {
        if (ch === '"') tirnak = !tirnak;
        else if (ch === ayirac && !tirnak) {
          hucreler.push(h.trim());
          h = "";
        } else h += ch;
      }
      hucreler.push(h.trim());
      return hucreler;
    });
  return { ayirac, satirlar };
}

const KIMLIK_BASLIGI =
  /^(ad|adı|isim|soyad|soyadı|ad soyad|adı soyadı|ad-soyad|öğrenci|öğrenci adı|öğrenci no|öğrenci numarası|numara|numarası|no|okul no|sıra|sıra no|tc|tc no|t\.c\.|tc kimlik|kimlik|e-?posta|email|e-mail|name|first name|last name|surname|full name|student|student id|student no|student number|student name|id)$/iu;
const HESAP_BASLIGI =
  /^(toplam|ortalama|ort|not|harf|harf notu|başarı notu|sonuç|durum|total|average|grade|letter|result)$/iu;

const kucuk = (s: string) => s.toLocaleLowerCase("tr").trim();
/** Başlık eşlemesi: hem olduğu gibi (ID) hem Türkçe küçük harfle (ADI SOYADI) denenir. */
const esler = (re: RegExp, b: string) => re.test(b.trim()) || re.test(kucuk(b));

/** Kimlik sütunları: başlıktan ya da içerikten (çoğunluğu harfli metin ya da 7+ haneli sayı). */
export function kimlikSutunlari(satirlar: string[][]): number[] {
  const [baslik = [], ...veri] = satirlar;
  const sonuc: number[] = [];
  baslik.forEach((b, j) => {
    const degerler = veri.map((r) => r[j] ?? "").filter((x) => x.trim());
    const harfli = degerler.filter((x) => /\p{L}{2,}/u.test(x) && !/^[-–]?$/u.test(x)).length;
    const uzunSayi = degerler.filter((x) => /^\d{7,}$/u.test(x.replace(/\s/gu, ""))).length;
    const yari = degerler.length / 2;
    if (esler(KIMLIK_BASLIGI, b) || (degerler.length && (harfli > yari || uzunSayi > yari)))
      if (!esler(HESAP_BASLIGI, b) || uzunSayi > yari) sonuc.push(j);
  });
  return sonuc;
}

/** Tablodan kimlik sütunlarını atar, başa o1, o2 takma adı koyar. Yalnız bellekte çalışır. */
export function notTablosuAyikla(metin: string): { tablo: string; atilan: string[] } {
  const { satirlar } = tabloOku(metin);
  if (satirlar.length < 2) return { tablo: metin, atilan: [] };
  const kimlik = new Set(kimlikSutunlari(satirlar));
  const baslik = satirlar[0] ?? [];
  const atilan = [...kimlik].map((j) => `"${(baslik[j] ?? `${j + 1}. sütun`).slice(0, 30)}" sütunu`);
  const yeni = satirlar.map((r, i) => [i === 0 ? "Takma ad" : `o${i}`, ...r.filter((_, j) => !kimlik.has(j))]);
  return { tablo: yeni.map((r) => r.join("\t")).join("\n"), atilan };
}

const ARAC_TURLERI: [RegExp, string, string][] = [
  [/^(vize|ara ?sınav|ara|midterm|mt|as)\b/iu, "ara_sinav", "Ara Sınav"],
  [/^(final|yarıyıl sonu|yys|fin|dönem sonu)\b/iu, "yariyil_sonu", "Yarıyıl Sonu Sınavı"],
  [/^(bütünleme|but|bütünleme sınavı|makeup|resit)\b/iu, "butunleme", "Bütünleme"],
  [/^(quiz|kısa ?sınav|ks)\b/iu, "kisa_sinav", "Kısa Sınav"],
  [/^(ödev|odev|hw|homework|assignment)\b/iu, "odev", "Ödev"],
  [/^(proje|project)\b/iu, "proje", "Proje"],
  [/^(lab|laboratuvar|laboratory)\b/iu, "laboratuvar", "Laboratuvar"],
  [/^(sunum|presentation)\b/iu, "sunum", "Sunum"],
  [/^(uygulama|practice)\b/iu, "uygulama", "Uygulama"],
];

export interface Sutun {
  baslik: string;
  aracId: string;
  tur: string;
  aracAdi: string;
  soruNo: string;
  ciktilar: string[];
  tamPuan: number | null;
}

/** Sütun başlığından araç, soru, tam puan ve ÇK eşlemesi sezgisi. "Vize S1 (ÇK2) /20" gibi. */
export function sutunCoz(baslik: string): Sutun | null {
  const b = baslik.trim();
  if (!b || esler(HESAP_BASLIGI, b)) return null;
  const tur = ARAC_TURLERI.find(([re]) => re.test(b));
  const ciktilar = [...b.matchAll(/(?:ÇK|ÖÇ|DÖÇ|LO|CLO|Ö)\s*-?\s*(\d{1,2})/giu)].map((m) => `Ö${Number(m[1])}`);
  const tamPuanEslesme =
    b.match(/\/\s*(\d+(?:[.,]\d+)?)\s*$/u) ?? b.match(/\(\s*(\d+(?:[.,]\d+)?)\s*(?:p|puan|pts|points)\s*\)/iu);
  const tamPuan = tamPuanEslesme ? Number((tamPuanEslesme[1] ?? "").replace(",", ".")) : null;
  const sade = b
    .replace(/(?:ÇK|ÖÇ|DÖÇ|LO|CLO|Ö)\s*-?\s*\d{1,2}/giu, "")
    .replace(/\/\s*\d+(?:[.,]\d+)?\s*$/u, "")
    .replace(/\(\s*\d+(?:[.,]\d+)?\s*(?:p|puan|pts|points)\s*\)/iu, "");
  const soru = sade.match(/(?:^|[\s_.-])(?:s|soru|q|question)\s*\.?\s*(\d{1,3})\b/iu)?.[1];
  const aracParca = tur ? (sade.match(tur[0])?.[0] ?? "") : "";
  const aracNo = tur ? sade.slice(aracParca.length).match(/^\s*(\d)(?!\d)/u)?.[1] : undefined;
  if (!tur && !soru) return null;
  const aracId = tur ? `${tur[1]}${aracNo ? `_${aracNo}` : ""}` : "sinav";
  const aracAdi = tur ? `${tur[2]}${aracNo ? ` ${aracNo}` : ""}` : "Sınav";
  return { baslik: b, aracId, tur: tur?.[1] ?? "diger", aracAdi, soruNo: soru ?? "1", ciktilar, tamPuan };
}

const puanOku = (s: string, ayirac: Ayirac): number | null => {
  const t = s.trim().replace(/\s/gu, "");
  if (!t || /^(-|–|g|gm|girmedi|yok|na|n\/a)$/iu.test(t)) return null;
  const n = Number(ayirac === "," ? t : t.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

export const SUTUN_ESLEME_REHBERI = [
  "Excel'de ilk satır başlık olsun: her soru ya da ölçme için bir sütun.",
  "Başlık örnekleri: 'Vize S1 (ÇK1) /20', 'Vize S2 (ÇK2) /30', 'Final S1 ÇK3 /50', 'Ödev ÇK4 /100'.",
  "Başlıkta sınavın adı (Vize, Final, Ödev, Proje, Quiz), soru numarası (S1, Soru 2), ölçtüğü ders çıktısı (ÇK1 ya da Ö1) ve tam puanı (/20 ya da (20p)) olsun.",
  "Ad, soyad ve numara sütunlarını silmenize gerek yok: araç onları ayrıştırmadan önce atar ve o1, o2 diye takma ad verir. Yine de silerseniz daha iyi olur.",
  "Toplam, Ortalama, Harf sütunları yok sayılır.",
  "Boş, '-' ya da 'G' (girmedi) hücreleri boş puan sayılır.",
  "Tabloyu Excel'de seçip Ctrl+C ile kopyalayın, sohbete Ctrl+V ile yapıştırın.",
];

export const notTablosuAyristirAraci = arac({
  ad: "not_tablosu_ayristir",
  baslik: "Not tablosunu ayrıştır",
  aciklama:
    "Excel ya da CSV'den yapıştırılan not tablosunu ÇK/PÇ hesabına hazırlar. Ad, soyad ve numara sütunlarını ayrıştırmadan önce atar, öğrencilere o1, o2 takma adı verir. Başlıklardan sınav, soru, tam puan ve ders çıktısı eşlemesini sezer; eksikleri listeler.",
  sonrakiAdim:
    "Sezilen eşlemeyi hocaya tablo olarak gösterin ve eksikleri tek tek seçenekle sorun (ör. S3 hangi çıktıyı ölçüyor? 1) Ö2 2) Ö3). Eksik kalmayınca ckPcHesaplaTaslagi'ni ck_pc_hesapla'ya verin.",
  kisiselVeriIpucu:
    "Kimlik sütunları atıldıktan sonra da kişisel veri kaldı. Ad ya da numara içeren başka sütun varsa silip yeniden yapıştırın.",
  onAyikla: (g) => {
    const t = (g as { tablo?: unknown } | null)?.tablo;
    if (typeof t !== "string") return { girdi: g, atilan: [] };
    const r = notTablosuAyikla(t);
    return { girdi: { ...(g as object), tablo: r.tablo }, atilan: r.atilan };
  },
  girdi: z.object({
    tablo: z.string().min(5).max(2_000_000).describe("Excel ya da CSV'den yapıştırılan tablo; ilk satır başlık"),
    tamPuanlar: z
      .record(z.string().max(80), z.number().positive().max(1000))
      .optional()
      .describe("Sütun başlığı → tam puan; başlıkta yoksa"),
    eslemeler: z
      .record(z.string().max(80), z.array(z.string().max(10)).max(10))
      .optional()
      .describe("Sütun başlığı → ders çıktısı kodları (Ö1, Ö2); başlıkta yoksa"),
    agirliklar: z
      .record(z.string().max(40), z.number().min(0).max(100))
      .optional()
      .describe("Ölçme aracı kimliği (ara_sinav, yariyil_sonu, odev...) → ders notundaki yüzde"),
  }),
  calistir: ({ tablo, tamPuanlar = {}, eslemeler = {}, agirliklar = {} }): AracSonucu => {
    const { ayirac, satirlar } = tabloOku(tablo);
    const [baslik = [], ...veri] = satirlar;
    const sutunlar = baslik.map((b, j) => (j === 0 ? null : sutunCoz(b)));
    const yoksayilan = baslik.filter((_, j) => j > 0 && !sutunlar[j]);
    const kullanilan = sutunlar
      .map((s, j) => (s ? { ...s, j } : null))
      .filter((s): s is Sutun & { j: number } => s !== null)
      .map((s) => ({
        ...s,
        tamPuan: tamPuanlar[s.baslik] ?? s.tamPuan,
        ciktilar: eslemeler[s.baslik] ?? s.ciktilar,
      }));
    const eksikler: string[] = [];
    if (!kullanilan.length)
      eksikler.push("Hiçbir sütunda sınav ya da soru bulunamadı. Başlıkları sütun eşleme rehberine göre düzenleyin.");
    for (const s of kullanilan) {
      if (s.tamPuan === null) eksikler.push(`"${s.baslik}" sütununun tam puanı yok.`);
      if (!s.ciktilar.length) eksikler.push(`"${s.baslik}" sütununun hangi ders çıktısını ölçtüğü yok.`);
    }
    const aracIdleri = [...new Set(kullanilan.map((s) => s.aracId))];
    for (const id of aracIdleri)
      if (agirliklar[id] === undefined) eksikler.push(`"${id}" ölçme aracının ders notundaki yüzdesi yok.`);
    // Aynı araçta aynı soru numarası iki kez geçerse ikinciye sütun sırası eklenir.
    const gorulen = new Set<string>();
    for (const s of kullanilan) {
      const k = `${s.aracId}/${s.soruNo}`;
      if (gorulen.has(k)) s.soruNo = `${s.soruNo}_${s.j + 1}`;
      gorulen.add(`${s.aracId}/${s.soruNo}`);
    }
    const asim: string[] = [];
    const puanlar = veri.flatMap((r) =>
      kullanilan.map((s) => {
        const p = puanOku(r[s.j] ?? "", ayirac);
        if (p !== null && s.tamPuan !== null && p > s.tamPuan) asim.push(`${r[0]}: "${s.baslik}" ${p} > ${s.tamPuan}`);
        return { ogrenci: r[0] ?? "", aracId: s.aracId, soruNo: s.soruNo, puan: p };
      }),
    );
    if (asim.length)
      eksikler.push(`${asim.length} hücrede puan tam puanı aşıyor (ilk: ${asim[0]}). Tabloyu denetleyin.`);
    const agirlikToplami = aracIdleri.reduce((t, id) => t + (agirliklar[id] ?? 0), 0);
    if (aracIdleri.every((id) => agirliklar[id] !== undefined) && Math.abs(agirlikToplami - 100) > 0.001)
      eksikler.push(`Ölçme aracı yüzdeleri toplamı ${agirlikToplami}; 100 olmalı (bütünleme hariç tutulabilir).`);
    const araclar = aracIdleri.map((id) => {
      const ss = kullanilan.filter((s) => s.aracId === id);
      return {
        id,
        tur: ss[0]?.tur ?? "diger",
        ad: ss[0]?.aracAdi ?? id,
        agirlik: agirliklar[id] ?? null,
        sorular: ss.map((s) => ({
          no: s.soruNo,
          tamPuan: s.tamPuan,
          eslemeler: s.ciktilar.map((c) => ({ ciktiKod: c, agirlik: 1 })),
        })),
      };
    });
    const ciktilar = [...new Set(kullanilan.flatMap((s) => s.ciktilar))].sort(
      (a, b) => Number(a.slice(1)) - Number(b.slice(1)),
    );
    return {
      sonuc: {
        ogrenciSayisi: veri.length,
        ayirac: ayirac === "\t" ? "sekme" : ayirac,
        sutunlar: kullanilan.map(({ j: _j, ...s }) => s),
        yoksayilanSutunlar: yoksayilan,
        ciktilar,
        eksikler,
        hazir: eksikler.length === 0,
        ckPcHesaplaTaslagi: {
          ciktilar: ciktilar.map((kod) => ({ kod })),
          araclar,
          puanlar,
          not: "dersKodu ve donem alanlarını hocadan alıp ekleyin. Eksik kalmayınca ck_pc_hesapla'ya verin.",
        },
        sutunEslemeRehberi: SUTUN_ESLEME_REHBERI,
      },
      kaynak: [KOD_KAYNAGI("apps/acik-mcp/src/not-tablosu.ts", "Akredit not tablosu ayrıştırıcısı")],
      ...(eksikler.length
        ? {
            sonrakiAdim:
              "Eksikleri hocaya numaralı ve tek tek, seçenekle sorun; yanıtları tamPuanlar, eslemeler ve agirliklar olarak verip aracı yeniden çağırın. Tabloyu yeniden yapıştırtmayın, aynı tabloyu kullanın.",
          }
        : {}),
    };
  },
});
