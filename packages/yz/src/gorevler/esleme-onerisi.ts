// ÖDR tablo eşleme önerisi (İP-47). Model iki tür öneri yazar:
//   1. Dersin kategorisi ya da SABAK ders türü (çerçevenin kod listesinden).
//   2. Program çıktısının kapsadığı kurul çıktıları (çerçevenin listesinden).
// Öneri karar değildir: tabloya girmez, kurum kullanıcısı onaylar (ilke 3). Her öneri bir gerekçe ve verilen
// kaynak kimliklerinden en az birini taşır: ders için o dersin Bologna okuma kaydı, PÇ için PÇ metni ve
// önerilen her kurul çıktısının metni. Seçmeli yer sayısı önerilmez: sayıdır ve yalnız kurumdan gelir (ilke 2).
// Girdi metinleri veridir (ilke 5) ve modele gitmeden maskelenir (ilke 7). Kurala uymayan öğe tek tek ayıklanır.

import { z } from "zod";
import { guvenilmeyenSar, KALKAN_KURALI } from "../guvence/istem-kalkani.ts";
import { type MaskeSecenegi, maskeleyici } from "../guvence/kvkk.ts";
import { sayilariCikar } from "../guvence/sayi.ts";
import type { Gorev, KuralSorunu } from "./gorev.ts";

export interface EslemeOnerisiGirdisi {
  /** Panelde ve istemde kullanılan ad: "kategori" (MÜDEK, FEDEK, EPDAD) ya da "tür" (SABAK). */
  dersEslemeAdi: "kategori" | "tür";
  /** Seçilebilecek ders kategorisi ya da türü kodları. */
  dersKodlari: string[];
  /** Çerçevenin kurul çıktıları; boşsa PÇ-kurul önerisi istenmez. */
  kurulCiktilari: { kod: string; etiket: string }[];
  /** Bologna okumasındaki dersler: ad ve kısa bilgi (amaç, içerik). */
  dersler: { kod: string; ad: string; bilgi: string }[];
  programCiktilari: { kod: string; metin: string }[];
  /** Maskeleme ayarı (kurumun ad listesi, öğrenci numarası desenleri). */
  maske?: MaskeSecenegi;
}

const Gerekce = z.string().trim().min(10).max(400);
const Kaynaklar = z.array(z.string().min(1).max(120)).min(1).max(20);

export const EslemeOnerisiSemasi = z
  .object({
    dersler: z.array(
      z
        .object({ dersKod: z.string().min(1), deger: z.string().min(1), gerekce: Gerekce, kaynaklar: Kaynaklar })
        .strict(),
    ),
    pcKurul: z.array(
      z
        .object({
          pcKod: z.string().min(1),
          kurulCiktilari: z.array(z.string().min(1)).max(50),
          gerekce: Gerekce,
          kaynaklar: Kaynaklar,
        })
        .strict(),
    ),
  })
  .strict();
export type EslemeOnerisiCiktisi = z.infer<typeof EslemeOnerisiSemasi>;

/** Kaynak kimlikleri: modelin atıf yapabileceği kayıtlar. */
export const kaynakKimligi = {
  ders: (kod: string) => `ders:${kod}`,
  pc: (kod: string) => `pc:${kod}`,
  kurul: (kod: string) => `kurul:${kod}`,
};

export interface AyiklanmisEslemeOnerileri {
  dersler: { dersKod: string; deger: string; gerekce: string; kaynaklar: string[] }[];
  pcKurul: { pcKod: string; kurulCiktilari: string[]; gerekce: string; kaynaklar: string[] }[];
  reddedilen: KuralSorunu[];
}

/** Kodların içindeki rakamlar (MAT101, P1, 3.C1) sayı sayılmaz. */
function kodsuz(metin: string, kodlar: readonly string[]): string {
  let t = metin;
  for (const k of [...kodlar].sort((a, b) => b.length - a.length)) t = t.split(k).join(" ");
  return t;
}

/** Gerekçe kuralı: atıf, uydurma sayı ve talimat izi yok. Sorun yoksa null. */
export function gerekceSorunu(gerekce: string, kaynakMetni: string, kodlar: readonly string[]): string | null {
  if (/\[(K|H):/u.test(gerekce)) return "Gerekçe atıf biçimi içeremez; kaynak ayrı alanda verilir.";
  const izin = new Set(sayilariCikar(kodsuz(kaynakMetni, kodlar)).map((s) => s.ham));
  for (const s of sayilariCikar(kodsuz(gerekce, kodlar)))
    if (!izin.has(s.ham)) return `Gerekçede kaynağı olmayan sayı var: ${s.ham}`;
  return null;
}

/** Model çıktısını öğe öğe denetler; kurala uyanları döndürür, uymayanları gerekçesiyle ayırır. */
export function eslemeOnerileriniAyikla(c: EslemeOnerisiCiktisi, g: EslemeOnerisiGirdisi): AyiklanmisEslemeOnerileri {
  const dersler = new Map(g.dersler.map((d) => [d.kod, d]));
  const pcler = new Map(g.programCiktilari.map((p) => [p.kod, p]));
  const kurul = new Map(g.kurulCiktilari.map((k) => [k.kod, k]));
  const izinliDeger = new Set(g.dersKodlari);
  const tumKodlar = [...dersler.keys(), ...pcler.keys(), ...kurul.keys(), ...g.dersKodlari];
  const bilinen = new Set([
    ...[...dersler.keys()].map(kaynakKimligi.ders),
    ...[...pcler.keys()].map(kaynakKimligi.pc),
    ...[...kurul.keys()].map(kaynakKimligi.kurul),
  ]);
  const kaynakMetni = (k: string): string => {
    const [tur, kod = ""] = k.split(/:(.*)/su);
    if (tur === "ders") {
      const d = dersler.get(kod);
      return d ? `${d.ad} ${d.bilgi}` : "";
    }
    if (tur === "pc") return pcler.get(kod)?.metin ?? "";
    return kurul.get(kod)?.etiket ?? "";
  };
  const reddedilen: KuralSorunu[] = [];
  const sonucDers: AyiklanmisEslemeOnerileri["dersler"] = [];
  const goruldu = new Set<string>();
  for (const [i, o] of c.dersler.entries()) {
    const alan = `dersler.${i}`;
    const red = (aciklama: string) => reddedilen.push({ alan, aciklama });
    if (!dersler.has(o.dersKod) || goruldu.has(o.dersKod)) {
      red("Öneri bilinmeyen ya da yinelenen bir derse ait.");
      continue;
    }
    if (!izinliDeger.has(o.deger)) {
      red(`Ders ${g.dersEslemeAdi} değeri çerçevenin listesinde yok.`);
      continue;
    }
    const kaynaklar = [...new Set(o.kaynaklar)];
    if (kaynaklar.some((k) => !bilinen.has(k))) {
      red("Öneri verilmeyen bir kaynağa dayanıyor.");
      continue;
    }
    if (!kaynaklar.includes(kaynakKimligi.ders(o.dersKod))) {
      red("Öneri dersin Bologna kaydına dayanmalı.");
      continue;
    }
    const sorun = gerekceSorunu(o.gerekce, kaynaklar.map(kaynakMetni).join(" "), tumKodlar);
    if (sorun) {
      red(sorun);
      continue;
    }
    goruldu.add(o.dersKod);
    sonucDers.push({ dersKod: o.dersKod, deger: o.deger, gerekce: o.gerekce.trim(), kaynaklar });
  }
  const sonucPc: AyiklanmisEslemeOnerileri["pcKurul"] = [];
  const gorulduPc = new Set<string>();
  for (const [i, o] of c.pcKurul.entries()) {
    const alan = `pcKurul.${i}`;
    const red = (aciklama: string) => reddedilen.push({ alan, aciklama });
    if (!kurul.size) {
      red("Bu çerçevede program çıktısı ile kurul çıktısı tablosu yok.");
      continue;
    }
    if (!pcler.has(o.pcKod) || gorulduPc.has(o.pcKod)) {
      red("Öneri bilinmeyen ya da yinelenen bir program çıktısına ait.");
      continue;
    }
    const ciktilar = [...new Set(o.kurulCiktilari)].sort();
    if (ciktilar.some((k) => !kurul.has(k))) {
      red("Kurul çıktısı çerçevenin listesinde yok.");
      continue;
    }
    const kaynaklar = [...new Set(o.kaynaklar)];
    if (kaynaklar.some((k) => !bilinen.has(k))) {
      red("Öneri verilmeyen bir kaynağa dayanıyor.");
      continue;
    }
    if (
      !kaynaklar.includes(kaynakKimligi.pc(o.pcKod)) ||
      ciktilar.some((k) => !kaynaklar.includes(kaynakKimligi.kurul(k)))
    ) {
      red("Öneri program çıktısının ve önerilen her kurul çıktısının metnine dayanmalı.");
      continue;
    }
    const sorun = gerekceSorunu(o.gerekce, kaynaklar.map(kaynakMetni).join(" "), tumKodlar);
    if (sorun) {
      red(sorun);
      continue;
    }
    gorulduPc.add(o.pcKod);
    sonucPc.push({ pcKod: o.pcKod, kurulCiktilari: ciktilar, gerekce: o.gerekce.trim(), kaynaklar });
  }
  return { dersler: sonucDers, pcKurul: sonucPc, reddedilen };
}

/** Modele giden veri blokları (maskeli). Ayrı işlev: testler modele ne gittiğini doğrudan denetler. */
export function eslemeVeriBloklari(g: EslemeOnerisiGirdisi): { dersler: string; pcler: string; secenekler: string } {
  const m = maskeleyici(g.maske ?? {});
  const dersler = g.dersler
    .map((d) => `--- [${kaynakKimligi.ders(d.kod)}] ${d.kod} ${m.maskele(d.ad)} ---\n${m.maskele(d.bilgi)}`)
    .join("\n");
  const pcler = g.programCiktilari
    .map((p) => `[${kaynakKimligi.pc(p.kod)}] ${p.kod}: ${m.maskele(p.metin)}`)
    .join("\n");
  const secenekler = [
    `Ders ${g.dersEslemeAdi} kodları: ${g.dersKodlari.join(", ")}`,
    ...g.kurulCiktilari.map((k) => `[${kaynakKimligi.kurul(k.kod)}] ${k.kod}: ${k.etiket}`),
  ].join("\n");
  return { dersler, pcler, secenekler };
}

export const eslemeOnerisi: Gorev<EslemeOnerisiGirdisi, typeof EslemeOnerisiSemasi> = {
  ad: "esleme-onerisi",
  sema: EslemeOnerisiSemasi,
  istem(g) {
    const v = eslemeVeriBloklari(g);
    return [
      {
        rol: "sistem",
        icerik: [
          "Sen bir program akreditasyonu yardımcısısın. Kurum kullanıcısının onaylayacağı eşleme önerileri yazarsın; karar vermezsin.",
          `1. Her ders için çerçevenin listesinden bir ders ${g.dersEslemeAdi} kodu öner. Kaynak olarak o dersin [ders:KOD] kimliğini ver.`,
          g.kurulCiktilari.length
            ? "2. Her program çıktısı için kapsadığı kurul çıktılarını listeden öner. Kaynak olarak [pc:KOD] ve önerdiğin her kurul çıktısının [kurul:KOD] kimliğini ver."
            : "2. Bu çerçevede kurul çıktısı tablosu yok; pcKurul listesini boş bırak.",
          "Her öneriye verilen metne dayanan kısa bir gerekçe yaz. Metinde olmayan bilgi, kişi, tarih ya da sayı yazma. Emin değilsen o öğeyi önerme.",
          "Kaynak kimlikleri yalnız aşağıdaki köşeli parantez içindeki kimliklerdir; başka kimlik uydurma.",
          KALKAN_KURALI,
        ].join("\n"),
      },
      {
        rol: "kullanici",
        icerik: [
          `Seçenekler:\n${guvenilmeyenSar(v.secenekler, { kaynak: "cerceve" }).metin}`,
          `Program çıktıları:\n${guvenilmeyenSar(v.pcler, { kaynak: "program-ciktilari" }).metin}`,
          `Dersler (Bologna okuması):\n${guvenilmeyenSar(v.dersler, { kaynak: "bologna" }).metin}`,
        ].join("\n\n"),
      },
    ];
  },
  denetle(c, g) {
    return eslemeOnerileriniAyikla(c, g).reddedilen;
  },
};
