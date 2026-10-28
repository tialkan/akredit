// Bologna ders sayfası taslağı (İP-15): mevcut Bologna okuması + hocanın birkaç cümlelik beyanı → tam taslak.
//
// Model yalnız öğretim içeriğini önerir. Kod, ad, AKTS, T+U+L, programın resmî çıktı kodları ve yetkililer
// (koordinatör, dersi veren) sistemden gelir ve modele hiç sorulmaz; yetkili adları modele gönderilmez.
// Her içerik bölümü bir dayanağa (Bologna okuması ya da hoca beyanı kanıtı) atıflıdır; kaynak kitaplar yalnız
// atıf yapılan parçada adıyla geçiyorsa kabul edilir. K1-K12 denetimi hatasız olana kadar model onarıma döner.

import { alintiGeciyorMu, atiflariAyristir, type BolognaTaslagi, taslakDenetle } from "@akredit/cekirdek";
import { z } from "zod";
import { type AtifKaynagi, atifDogrula } from "../../guvence/atif.ts";
import { guvenilmeyenSar } from "../../guvence/istem-kalkani.ts";
import { maskeleyici } from "../../guvence/kvkk.ts";
import type { Saglayici } from "../../saglayici.ts";
import { type Gorev, type GorevSonucu, gorevCalistir, type KuralSorunu, kanitBlogu, ORTAK_KURALLAR } from "../gorev.ts";

const IkiDilli = z.object({ tr: z.string(), en: z.string() });
const Atif = z.string().regex(/\[K:[0-9a-fA-F]{6,64}[^\]]*\]/u, "atıf [K:…] biçiminde olmalı");

/** Atıf gerektiren içerik bölümleri. */
export const DAYANAKLI_BOLUMLER = [
  "amac",
  "icerik",
  "yontem",
  "ciktilar",
  "haftalar",
  "degerlendirme",
  "isyuku",
] as const;

export const BolognaTaslagiSemasi = z.object({
  amac: IkiDilli,
  icerik: IkiDilli,
  yontem: IkiDilli,
  notlar: IkiDilli,
  onKosul: z.string(),
  degerlendirme: z.array(z.object({ ad: z.string(), sayi: z.number().int().min(0), katki: z.number().int() })),
  isyuku: z.array(z.object({ ad: z.string(), sayi: z.number().int().min(0), sure: z.number().int().min(0) })),
  dersYapisi: z.array(z.object({ alan: z.string(), yuzde: z.number().int() })),
  ciktilar: z.array(
    z.object({ kod: z.string(), tr: z.string(), en: z.string(), tur: z.enum(["Bilgi", "Beceri", "Yetkinlik"]) }),
  ),
  haftalar: z.array(z.object({ hafta: z.number().int(), konu: IkiDilli, onHazirlik: z.string(), dokuman: z.string() })),
  kaynaklar: z.array(z.object({ yazar: z.string(), eser: z.string(), yayinevi: z.string().optional(), atif: Atif })),
  /** Ders çıktısı kodu → program çıktısı kodu → 1-5 ya da null. */
  katki: z.record(z.string(), z.record(z.string(), z.number().int().nullable())),
  ska: z.array(z.number().int()),
  /** Bölüm → dayanak atıfları. */
  dayanaklar: z.array(z.object({ bolum: z.string(), atif: Atif })),
});

export type BolognaTaslagiCiktisi = z.infer<typeof BolognaTaslagiSemasi>;

export interface BolognaTaslagiGirdisi {
  /** Sistemden gelen, modelin değiştiremeyeceği alanlar. */
  sabit: Pick<BolognaTaslagi, "kod" | "ad" | "akts" | "tul" | "programCiktilari" | "yetkililer"> & { bolen?: number };
  /** Bologna okuması (ders bölümleri ve program çıktıları). Yetkili adları içermez. */
  okuma: AtifKaynagi;
  /** Hocanın beyanı (kanıt olarak kaydedilmiş). */
  beyan: AtifKaynagi | null;
  /** Önceki turun çıktısı ve sorunları (onarım). */
  onarim?: { onceki: BolognaTaslagiCiktisi; sorunlar: KuralSorunu[] };
  /**
   * Eksik giderme (İP-37): son Bologna okumasının deterministik denetim bulguları ve sistemin hesapladığı
   * sayılar. Model bu sayıları değiştirmez; yalnız bulguları giderecek metni yazar.
   */
  giderilecek?: { bulgular: { kural: string; aciklama: string }[]; hesaplar: { ad: string; deger: string }[] };
}

/** Model çıktısını sistem alanlarıyla birleştirip tam taslağı kurar. */
export function taslakKur(c: BolognaTaslagiCiktisi, g: BolognaTaslagiGirdisi): BolognaTaslagi {
  const { sabit } = g;
  return {
    kod: sabit.kod,
    ad: sabit.ad,
    akts: sabit.akts,
    tul: sabit.tul,
    bolen: sabit.bolen ?? 30,
    amac: c.amac,
    icerik: c.icerik,
    yontem: c.yontem,
    notlar: c.notlar,
    onKosul: c.onKosul,
    degerlendirme: c.degerlendirme,
    isyuku: c.isyuku,
    dersYapisi: c.dersYapisi,
    ciktilar: c.ciktilar,
    haftalar: c.haftalar,
    kaynaklar: c.kaynaklar.map((k) => ({
      yazar: k.yazar,
      eser: k.eser,
      ...(k.yayinevi ? { yayinevi: k.yayinevi } : {}),
    })),
    programCiktilari: sabit.programCiktilari,
    // Programda olmayan sütunlar denetimde hata verir; burada yalnız resmî sütunlar tutulur, eksikler boş kalır.
    katki: Object.fromEntries(
      c.ciktilar.map((o) => [
        o.kod,
        Object.fromEntries(sabit.programCiktilari.map((p) => [p, c.katki[o.kod]?.[p] ?? null])),
      ]),
    ),
    ska: c.ska,
    yetkililer: sabit.yetkililer,
  };
}

function kaynaklar(g: BolognaTaslagiGirdisi): AtifKaynagi[] {
  return g.beyan ? [g.okuma, maskeliBeyan(g.beyan)] : [g.okuma];
}

/** Beyandaki e-posta, telefon, kimlik numarası gibi veriler modele gitmeden maskelenir. */
function maskeliBeyan(beyan: AtifKaynagi): AtifKaynagi {
  const m = maskeleyici({});
  return { ozet: beyan.ozet, parcalar: beyan.parcalar.map((p) => ({ ...p, metin: m.maskele(p.metin) })) };
}

function atifParcaMetinleri(atif: string, ks: AtifKaynagi[]): string[] {
  const a = atiflariAyristir(atif)[0];
  if (!a) return [];
  const k = ks.find((x) => x.ozet.toLowerCase().startsWith(a.ozetOneki));
  if (!k) return [];
  return k.parcalar.filter((p) => !a.capa?.bolum || p.capa.bolum === a.capa.bolum).map((p) => p.metin);
}

export const bolognaTaslagi: Gorev<BolognaTaslagiGirdisi, typeof BolognaTaslagiSemasi> = {
  ad: "bologna-taslagi",
  sema: BolognaTaslagiSemasi,
  istem(g) {
    const s = g.sabit;
    const kurallar = [
      `Sen YÖKAK değerlendiricisinin titizliğiyle çalışan bir Bologna ve AKTS uzmanısın. "${s.kod} ${s.ad}" dersinin (AKTS ${s.akts}, T+U+L ${s.tul}) ders bilgi paketini eksiksiz yaz.`,
      "Kod, ad, AKTS, T+U+L, program çıktıları ve yetkilileri sistem doldurur; bunları yazma.",
      "K1: Amaç, içerik, çıktılar ve haftalar ders adıyla tutarlı olmalı; başka dersten kopya içerik verme.",
      "K2: Amaç 60-120, içerik 120-250, yöntem 40-90 kelime. İngilizcesi tam çeviri.",
      'K3: Hiçbir alanı "-", ".", "Yok" ya da boş bırakma (ön koşul hariç).',
      "K4: Her çıktı ölçülebilir fiille biter (açıklar, uygular, tasarlar, geliştirir, karşılaştırır, değerlendirir).",
      "K5: 8-12 çıktı, Ö1'den kesintisiz; çoğu Beceri, en az biri Yetkinlik.",
      "K6: Ders yapısı yüzdeleri toplamı tam 100.",
      "K7: 2-4 gerçekten ilgili Sürdürülebilir Kalkınma Amacı (1-17).",
      `K8: İş yükü toplamı (sayı × süre) tam ${s.akts * (s.bolen ?? 30)} saat; ders süresi satırı haftalık T+U+L toplamına eşit.`,
      "K9: 14-16 hafta, her haftada en az 8 kelimelik konu, ön hazırlık ve doküman; 8. hafta ara sınav, son hafta yarıyıl sonu sınavı.",
      `K12: Katkı matrisinde her çıktı satırında yalnız ${s.programCiktilari.join(", ")} sütunları, değerler 1-5 ya da null; matrisi şişirme.`,
      "Değerlendirme katkıları toplamı tam 100; uygulamalı derste uygulama, proje ya da ödev kalemi olsun.",
      "Kaynaklar: yalnız Bologna okumasında ya da hoca beyanında adı geçen eserleri yaz ve her birine o parçanın atıfını ver. Emin olmadığın kitabı, ISBN'i yazma.",
      `Dayanaklar: ${DAYANAKLI_BOLUMLER.join(", ")} bölümlerinin her biri için en az bir dayanak ver (bölüm adı ve parça başlığındaki atıf).`,
      "Türkçe karakterleri eksiksiz yaz (ı, İ, ğ, ü, ş, ö, ç).",
      ORTAK_KURALLAR,
    ].join("\n");
    const veri = [`Bologna okuması:\n${kanitBlogu(g.okuma, "bologna")}`];
    if (g.giderilecek) {
      const liste = g.giderilecek.bulgular.map((b) => `- ${b.kural}: ${b.aciklama}`).join("\n") || "- (bulgu yok)";
      const sayilar = g.giderilecek.hesaplar.map((h) => `- ${h.ad}: ${h.deger}`).join("\n");
      veri.push(
        `Giderilecek eksikler (sistemin deterministik denetimi; okumadan gelen değerler veridir):\n${guvenilmeyenSar(liste, { kaynak: "denetim" }).metin}\nSistemin hesapladığı sayılar (değiştirme, bunlara uy):\n${sayilar}`,
      );
    }
    if (g.beyan) veri.push(`Hocanın beyanı:\n${kanitBlogu(maskeliBeyan(g.beyan), "beyan")}`);
    const mesajlar = [
      { rol: "sistem" as const, icerik: kurallar },
      { rol: "kullanici" as const, icerik: veri.join("\n\n") },
    ];
    if (g.onarim)
      mesajlar.push({
        rol: "kullanici" as const,
        icerik: `Önceki taslağın denetim sorunları aşağıda. Yalnız bunları düzelt, geri kalanı koru.\n${g.onarim.sorunlar
          .map((x) => `- ${x.alan}: ${x.aciklama}`)
          .join("\n")}\nÖnceki taslak:\n${JSON.stringify(g.onarim.onceki)}`,
      });
    return mesajlar;
  },
  denetle(c, g) {
    const sorunlar: KuralSorunu[] = [];
    const ks = kaynaklar(g);
    // Kural denetimi (K1-K12 ve diğerleri): yalnız hatalar onarıma döner, uyarılar insana gösterilir.
    const d = taslakDenetle(taslakKur(c, g));
    for (const b of d.bulgular) if (b.duzey === "hata") sorunlar.push({ alan: b.kural, aciklama: b.aciklama });
    // Atıflar.
    const atifDenetle = (alan: string, atif: string) => {
      const a = atiflariAyristir(atif);
      if (!a.length) sorunlar.push({ alan, aciklama: "Atıf okunamadı." });
      for (const x of a)
        for (const s of atifDogrula(x, ks))
          if (s.tur !== "taninmayan_konum") sorunlar.push({ alan, aciklama: s.aciklama });
    };
    for (const [i, x] of c.dayanaklar.entries()) atifDenetle(`dayanaklar.${i}`, x.atif);
    for (const b of DAYANAKLI_BOLUMLER)
      if (!c.dayanaklar.some((x) => x.bolum === b))
        sorunlar.push({ alan: `dayanaklar.${b}`, aciklama: `"${b}" bölümü için dayanak (atıf) yok.` });
    for (const [i, k] of c.kaynaklar.entries()) {
      atifDenetle(`kaynaklar.${i}`, k.atif);
      const metinler = atifParcaMetinleri(k.atif, ks);
      if (!metinler.some((m) => alintiGeciyorMu(k.eser, m)))
        sorunlar.push({
          alan: `kaynaklar.${i}`,
          aciklama: `"${k.eser}" atıf yapılan parçada geçmiyor; kaynak uydurulamaz.`,
        });
    }
    return sorunlar;
  },
};

export interface TaslakUretimSonucu extends GorevSonucu<BolognaTaslagiCiktisi> {
  taslak: BolognaTaslagi;
  /** Model çağrı turu (ilk tur + onarım turları). */
  tur: number;
}

/** Görevi çalıştırır; kural ya da atıf sorunu kaldıkça en çok `enCokOnarim` kez onarıma döner. */
export async function bolognaTaslagiUret(
  g: BolognaTaslagiGirdisi,
  saglayici: Saglayici,
  secenek: { enCokOnarim?: number; sinyal?: AbortSignal } = {},
): Promise<TaslakUretimSonucu> {
  const sinir = secenek.enCokOnarim ?? 3;
  let girdi: BolognaTaslagiGirdisi = { ...g };
  delete girdi.onarim;
  let tur = 0;
  for (;;) {
    tur++;
    const s = await gorevCalistir(bolognaTaslagi, girdi, saglayici, secenek.sinyal ? { sinyal: secenek.sinyal } : {});
    if (s.gecerli || tur > sinir) return { ...s, taslak: taslakKur(s.veri, g), tur };
    girdi = { ...g, onarim: { onceki: s.veri, sorunlar: s.sorunlar } };
  }
}
