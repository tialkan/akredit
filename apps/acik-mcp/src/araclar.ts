// Herkese açık MCP araçları. Hepsi salt okuma ve deterministiktir: model çağrısı yok, kurum verisi yok,
// durum yok. Ölçüt metni yalnız resmî belgeden çıkarılmış çerçeve verisinden gelir (ilke 6); belgeden
// alınamayan metin DOĞRULANMADI olarak döner. Sayılar yalnız @akredit/olcme hesabından gelir (ilke 2).
// Öz değerlendirme iskeleti metin yazmaz: her bölüm EKSİK işaretiyle ve gereken kanıt türleriyle döner (ilke 1).

import {
  type BolognaDersSayfasi,
  type BolognaVerisi,
  bolognaDenetle,
  dilDenetle,
  type MatrisDegeri,
} from "@akredit/cekirdek";
import {
  type Cerceve,
  DOGRULANMADI,
  type KaynakBelge,
  type Olcut,
  tumOlcutler,
  YOKAK_KIDR_3_2_1,
  YOKAK_KURUMSAL_3_3,
} from "@akredit/cerceveler";
import { type CkPcMatrisi, dersiOlc, HESAP_SURUMU } from "@akredit/olcme";
import { z } from "zod";

export const DEPO = "https://github.com/tialkan/akredit";

/** Her yanıtta yer alan not. */
export const AKREDIT_NOTU =
  "Akredit bağımsız, açık kaynak bir araçtır; YÖKAK ile bağı yoktur. Sonuçlar resmî değerlendirme yerine geçmez; beyan ve karar kurumdadır.";

export interface Kaynak {
  ad: string;
  adres: string;
  sayfa?: number | null;
  sha256?: string | null;
  erisimTarihi?: string;
}

export interface AracSonucu {
  sonuc: unknown;
  kaynak: Kaynak[];
}

export interface AracBaglami {
  simdi: () => Date;
}

export interface AcikArac<S extends z.ZodObject = z.ZodObject> {
  ad: string;
  baslik: string;
  aciklama: string;
  girdi: S;
  calistir: (girdi: z.infer<S>, b: AracBaglami) => AracSonucu;
}

const arac = <S extends z.ZodObject>(a: AcikArac<S>): AcikArac<S> => a;

/** Araç girdisi hatası: kullanıcıya gösterilecek Türkçe ileti. */
export class AracHatasi extends Error {}

// ---------------------------------------------------------------- Çerçeve yardımcıları

const CERCEVE = YOKAK_KURUMSAL_3_3;
const BELGE_ADI: Record<string, string> = {
  [YOKAK_KURUMSAL_3_3.kaynak?.dosya ?? ""]:
    "YÖKAK Değerlendirme Programları Kılavuzu 3.3, Ek-1 Dereceli Değerlendirme Anahtarı",
  [YOKAK_KIDR_3_2_1.kaynak?.dosya ?? ""]: "YÖKAK KİDR Hazırlama Kılavuzu 3.2.1",
};
for (const e of YOKAK_KURUMSAL_3_3.ekKaynaklar)
  if (e.dosya && !BELGE_ADI[e.dosya]) BELGE_ADI[e.dosya] = "YÖKAK Değerlendirme Ölçütleri 3.1";

function belgeKaynagi(c: Cerceve, dosya: string | null | undefined, sayfa: number | null): Kaynak {
  const belgeler: KaynakBelge[] = [...(c.kaynak ? [c.kaynak] : []), ...c.ekKaynaklar];
  const b = belgeler.find((x) => x.dosya === (dosya ?? c.kaynak?.dosya)) ?? c.kaynak;
  if (!b) return { ad: c.ad, adres: DEPO };
  return {
    ad: BELGE_ADI[b.dosya ?? ""] ?? c.ad,
    adres: b.adres,
    sayfa,
    sha256: b.sha256,
    erisimTarihi: b.erisimTarihi,
  };
}

const olcutKaynagi = (c: Cerceve, o: Olcut) => belgeKaynagi(c, o.kaynakDosya, o.kaynakSayfa);

const KOD_KAYNAGI = (yol: string, ad: string): Kaynak => ({ ad, adres: `${DEPO}/tree/main/${yol}` });

function olcutBul(c: Cerceve, kod: string): Olcut {
  const k = kod.trim().toLocaleUpperCase("tr").replace(/\.$/u, "");
  const o = tumOlcutler(c.olcutler).find((x) => x.kod === k);
  if (!o)
    throw new AracHatasi(
      `"${kod.slice(0, 20)}" kodlu ölçüt bulunamadı. Kodu "B.1.2" biçiminde yazın ya da olcut_ara ile arayın.`,
    );
  return o;
}

const duzey = (kod: string) =>
  kod.split(".").length === 1 ? "ana_baslik" : kod.split(".").length === 2 ? "olcut" : "alt_olcut";

const metinGoster = (o: Olcut) => (o.metinDurumu === "dogrulanmadi" ? DOGRULANMADI : o.metin);

// ---------------------------------------------------------------- Ölçüt araçları

const olcutAra = arac({
  ad: "olcut_ara",
  baslik: "YÖKAK ölçütü ara",
  aciklama:
    "YÖKAK 3.3 ölçüt ağacında (ana başlık, ölçüt, alt ölçüt) kod, başlık ya da metinde geçen ifadeye göre arar. Metinler resmî belgeden çıkarılmıştır; belgeden alınamayan metin DOĞRULANMADI olarak döner.",
  girdi: z.object({
    sorgu: z.string().trim().min(1).max(200).describe("Aranacak ifade ya da kod, ör. 'paydaş katılımı' ya da 'B.3'"),
    en_fazla: z.number().int().min(1).max(50).default(10).describe("En çok kaç sonuç dönsün (1-50)"),
  }),
  calistir: ({ sorgu, en_fazla }) => {
    const s = sorgu.toLocaleLowerCase("tr");
    const kelimeler = s.split(/\s+/u).filter(Boolean);
    const hepsi = tumOlcutler(CERCEVE.olcutler);
    const puanli = hepsi
      .map((o) => {
        const kod = o.kod.toLocaleLowerCase("tr");
        const baslik = o.baslik.toLocaleLowerCase("tr");
        const metin = o.metinDurumu === "dogrulanmadi" ? "" : o.metin.toLocaleLowerCase("tr");
        let puan = 0;
        if (kod === s) puan += 100;
        else if (kod.startsWith(s)) puan += 50;
        for (const k of kelimeler) {
          if (baslik.includes(k)) puan += 5;
          if (metin.includes(k)) puan += 1;
        }
        return { o, puan };
      })
      .filter((x) => x.puan > 0)
      .sort((a, b) => b.puan - a.puan || hepsi.indexOf(a.o) - hepsi.indexOf(b.o));
    const secilen = puanli.slice(0, en_fazla);
    return {
      sonuc: {
        cerceve: `${CERCEVE.ad} ${CERCEVE.surum}`,
        toplamEslesme: puanli.length,
        olcutler: secilen.map(({ o }) => ({
          kod: o.kod,
          baslik: o.baslik,
          duzey: duzey(o.kod),
          metinDurumu: o.metinDurumu,
          ozet: metinGoster(o).slice(0, 240),
          kaynakSayfa: o.kaynakSayfa,
        })),
      },
      kaynak: [
        ...new Map(
          secilen.map(({ o }) => [o.kaynakDosya ?? "", olcutKaynagi(CERCEVE, { ...o, kaynakSayfa: null })]),
        ).values(),
      ],
    };
  },
});

const olcutGetir = arac({
  ad: "olcut_getir",
  baslik: "YÖKAK ölçütünü getir",
  aciklama:
    "Bir ölçütün resmî metnini, kaynak belgesini, sayfasını ve belgenin SHA-256 özetini döndürür. Alt ölçütlerin listesi ve üst ölçüt de gelir. Belgeden alınamayan metin DOĞRULANMADI olarak döner; tahminle doldurulmaz.",
  girdi: z.object({ kod: z.string().trim().min(1).max(20).describe("Ölçüt kodu, ör. 'A', 'B.1' ya da 'B.1.2'") }),
  calistir: ({ kod }) => {
    const o = olcutBul(CERCEVE, kod);
    const ustKod = o.kod.includes(".") ? o.kod.slice(0, o.kod.lastIndexOf(".")) : null;
    return {
      sonuc: {
        cerceve: `${CERCEVE.ad} ${CERCEVE.surum}`,
        kod: o.kod,
        baslik: o.baslik,
        duzey: duzey(o.kod),
        metin: metinGoster(o),
        metinDurumu: o.metinDurumu,
        ust: ustKod ? { kod: ustKod, baslik: olcutBul(CERCEVE, ustKod).baslik } : null,
        altOlcutler: o.altOlcutler.map((a) => ({ kod: a.kod, baslik: a.baslik })),
        olgunlukDuzeyiVar: Boolean(o.olgunlukTanimlari?.length),
        uzmanDogrulamasi: CERCEVE.dogrulandi ? "yapıldı" : "bekliyor",
      },
      kaynak: [olcutKaynagi(CERCEVE, o)],
    };
  },
});

const olgunlukDuzeyleri = arac({
  ad: "olgunluk_duzeyleri",
  baslik: "Alt ölçüt olgunluk düzeyleri ve örnek kanıtlar",
  aciklama:
    "Bir alt ölçütün (ör. 'B.1.2') dereceli değerlendirme anahtarındaki 1-5 olgunluk düzeyi metinlerini ve belgedeki örnek kanıtları döndürür. Düzeyi siz ya da kurumunuz belirler; bu araç düzey önermez.",
  girdi: z.object({ kod: z.string().trim().min(1).max(20).describe("Alt ölçüt kodu, ör. 'B.1.2'") }),
  calistir: ({ kod }) => {
    const o = olcutBul(CERCEVE, kod);
    if (duzey(o.kod) !== "alt_olcut")
      throw new AracHatasi(
        `${o.kod} bir alt ölçüt değil. Olgunluk düzeyleri alt ölçütlerde tanımlıdır: ${o.altOlcutler
          .slice(0, 8)
          .map((a) => a.kod)
          .join(", ")}${o.altOlcutler.length ? "" : "yok"}.`,
      );
    const tanimli = Boolean(o.olgunlukTanimlari?.length);
    return {
      sonuc: {
        kod: o.kod,
        baslik: o.baslik,
        duzeyler: tanimli
          ? (o.olgunlukTanimlari ?? []).map((d) => ({ duzey: d.duzey, metin: d.metin }))
          : [1, 2, 3, 4, 5].map((d) => ({ duzey: d, metin: DOGRULANMADI })),
        ornekKanitlar: o.ornekKanitlar?.length ? o.ornekKanitlar : [DOGRULANMADI],
        kanitTurleri: o.kanitGereksinimleri.map((k) => ({ tur: k.tur, aciklama: k.aciklama })),
        hatirlatma: "Olgunluk düzeyi kararı kurumun ve değerlendiricinin kararıdır; düzeye kanıtla karar verilir.",
      },
      kaynak: [olcutKaynagi(CERCEVE, o)],
    };
  },
});

// ---------------------------------------------------------------- Öz değerlendirme iskeleti

const ozDegerlendirmeIskeleti = arac({
  ad: "oz_degerlendirme_iskeleti",
  baslik: "Öz değerlendirme raporu iskeleti",
  aciklama:
    "KİDR 3.2.1 şablonuna göre rapor bölümlerini, her bölümün ölçüt ve alt ölçütlerini ve gereken örnek kanıtları döndürür. Metin yazmaz: her alt ölçüt EKSİK işaretiyle gelir, kanıt bağlandıkça doldurulur.",
  girdi: z.object({
    bolum: z
      .enum(["A", "B", "C", "D"])
      .optional()
      .describe("Yalnız bir ana başlık isteniyorsa 'A', 'B', 'C' ya da 'D'. Verilmezse bütün rapor."),
  }),
  calistir: ({ bolum }) => {
    const c = YOKAK_KIDR_3_2_1;
    const bolumler = c.raporSablonu
      .filter((b) => !bolum || b.kod === bolum)
      .map((b) => {
        const kokler = b.olcutKodlari.map((k) => olcutBul(c, k));
        const olcutler = kokler.flatMap((k) => tumOlcutler(k.altOlcutler));
        return {
          kod: b.kod,
          baslik: b.baslik,
          durum: "EKSİK",
          altBasliklar: olcutler.map((o) =>
            duzey(o.kod) === "olcut"
              ? { kod: o.kod, baslik: o.baslik, tur: "olcut" }
              : {
                  kod: o.kod,
                  baslik: o.baslik,
                  tur: "alt_olcut",
                  durum: "EKSİK",
                  gerekenKanitlar: o.ornekKanitlar?.length ? o.ornekKanitlar : [DOGRULANMADI],
                  kaynakSayfa: o.kaynakSayfa,
                },
          ),
        };
      });
    return {
      sonuc: {
        sablon: `${c.ad} ${c.surum}`,
        kural:
          "Bu iskelet yalnız yapıdır. Her olgusal cümle bir kanıta (belge ve sayfa) bağlanmalıdır; bağlanamayan içerik EKSİK kalır, yapılmış gibi yazılmaz.",
        bolumler,
      },
      kaynak: [
        belgeKaynagi(c, c.kaynak?.dosya, 8),
        belgeKaynagi(YOKAK_KURUMSAL_3_3, YOKAK_KURUMSAL_3_3.kaynak?.dosya, null),
      ],
    };
  },
});

// ---------------------------------------------------------------- Bologna denetimi

const sayiYaDaBos = z.number().nullable().default(null);
const BolognaDersGirdisi = z.object({
  kod: z.string().trim().min(1).max(30),
  ad: z.string().max(200).optional(),
  zorunlu: z.boolean().default(true),
  yariyil: z.number().int().min(1).max(16).nullable().default(null),
  tul: z.string().max(20).optional().describe("Teori+Uygulama+Laboratuvar, ör. '2+1+0'"),
  kredi: sayiYaDaBos,
  akts: sayiYaDaBos,
  guncelleme: z.string().max(20).optional().describe("Son güncelleme tarihi, GG.AA.YYYY"),
  ciktilar: z
    .array(z.object({ kod: z.string().max(20), metin: z.string().max(1000) }))
    .max(40)
    .default([]),
  degerlendirme: z
    .array(z.object({ ad: z.string().max(200), sayi: sayiYaDaBos, katki: sayiYaDaBos }))
    .max(40)
    .default([]),
  isyuku: z
    .array(z.object({ ad: z.string().max(200), sayi: sayiYaDaBos, sure: sayiYaDaBos, toplam: sayiYaDaBos }))
    .max(40)
    .default([]),
  dersYapisi: z
    .array(z.object({ alan: z.string().max(200), yuzde: sayiYaDaBos }))
    .max(20)
    .default([]),
  haftalar: z.number().int().min(0).max(30).default(0).describe("Haftalık konu satırı sayısı"),
  katki: z
    .record(z.string().max(20), z.record(z.string().max(20), z.string().max(5)))
    .default({})
    .describe("Ders çıktısı ya da 'Tüm' satırı → program çıktısı kodu → katkı değeri ('1'-'5', '' ya da '-')"),
});

const bolognaDenetleAraci = arac({
  ad: "bologna_denetle",
  baslik: "Bologna ders bilgisini denetle",
  aciklama:
    "Yapıştırdığınız ders bilgi paketi verisini (AKTS, iş yükü, değerlendirme, öğrenme çıktıları, katkı tablosu) Akredit'in Bologna kurallarıyla denetler: AKTS-iş yükü uyumu, değerlendirme toplamı, eksik çıktı, güncellik, matris tutarlılığı. Kurallar resmî ölçüt değildir; tutarsızlığı işaretler, kararı komisyon verir.",
  girdi: z.object({
    ders: BolognaDersGirdisi,
    programCiktilari: z
      .array(z.object({ kod: z.string().max(20), metin: z.string().max(1000) }))
      .max(40)
      .optional()
      .describe("Program çıktıları; verilirse program düzeyindeki kurallar da çalışır"),
    matrisSatiri: z
      .record(z.string().max(20), z.string().max(5))
      .optional()
      .describe("Program matrisinde bu dersin satırı: program çıktısı kodu → değer"),
    aktsSaat: z
      .tuple([z.number().min(1), z.number().max(60)])
      .optional()
      .describe("AKTS başına saat aralığı; varsayılan [25, 30]"),
  }),
  calistir: ({ ders, programCiktilari, matrisSatiri, aktsSaat }, b) => {
    const sayfa: BolognaDersSayfasi & { kod: string } = {
      ...ders,
      ad: ders.ad ?? ders.kod,
      bilgiler: {},
    };
    const pkodlar = Object.keys(matrisSatiri ?? {});
    const veri: BolognaVerisi = {
      adres: "kullanici-girdisi",
      okundu: b.simdi().toISOString(),
      programCiktilari: programCiktilari ?? [],
      matris: {
        pkodlar,
        dersler: matrisSatiri
          ? [
              {
                kod: ders.kod,
                ad: ders.ad ?? ders.kod,
                zorunlu: ders.zorunlu,
                grup: null,
                yariyil: ders.yariyil,
                grupBasligi: false,
                degerler: matrisSatiri,
              },
            ]
          : [],
      },
      tyycIsaret: null,
      dersler: [{ ...sayfa, zorunlu: ders.zorunlu, bos: false, kaynak: "kullanici-girdisi" }],
    };
    let bulgular = bolognaDenetle(veri, { simdi: b.simdi().getTime(), ...(aktsSaat ? { aktsSaat } : {}) });
    // Program düzeyi kuralları yalnız program çıktıları verildiyse anlamlıdır.
    if (!programCiktilari) bulgular = bulgular.filter((x) => x.konu !== "-");
    return {
      sonuc: {
        ders: ders.kod,
        hataSayisi: bulgular.filter((x) => x.duzey === "hata").length,
        uyariSayisi: bulgular.filter((x) => x.duzey === "uyari").length,
        bulgular,
        not: "Kurallar Akredit'in iç kurallarıdır, resmî ölçüt değildir. Düzeltme kararını ders sorumlusu ve komisyon verir.",
      },
      kaynak: [KOD_KAYNAGI("packages/cekirdek/src/bologna/denetim.ts", "Akredit Bologna denetim kuralları")],
    };
  },
});

// ---------------------------------------------------------------- ÇK/PÇ sağlanma hesabı

const kimlik = z.string().trim().min(1).max(30);
const ANONIM = /^(?![0-9]{7,}$)[\p{L}\p{N}_.-]{1,24}$/u;

const ckPcHesapla = arac({
  ad: "ck_pc_hesapla",
  baslik: "ÇK ve PÇ sağlanma düzeyi hesabı",
  aciklama:
    "Anonim puan tablosundan ders öğrenme çıktısı (ÇK) başarısını ve program çıktısı (PÇ) sağlanma düzeyini hesaplar (@akredit/olcme). Öğrenci kimliği yerine 'o1', 'o2' gibi takma ad kullanın; numara ve ad kabul edilmez. Öğrenci bazında sonuç dönmez, yalnız toplu değerler döner.",
  girdi: z.object({
    dersKodu: kimlik,
    donem: z.string().trim().min(1).max(40).describe("ör. '2025-2026 Güz'"),
    ciktilar: z
      .array(z.object({ kod: kimlik, metin: z.string().max(1000).optional() }))
      .min(1)
      .max(40),
    araclar: z
      .array(
        z.object({
          id: kimlik,
          tur: z
            .enum([
              "ara_sinav",
              "yariyil_sonu",
              "butunleme",
              "kisa_sinav",
              "odev",
              "proje",
              "uygulama",
              "laboratuvar",
              "sunum",
              "diger",
            ])
            .default("diger"),
          ad: z.string().max(100).default(""),
          agirlik: z.number().min(0).max(100).describe("Ders notundaki yüzde"),
          sorular: z
            .array(
              z.object({
                no: kimlik,
                tamPuan: z.number().positive().max(1000),
                eslemeler: z.array(z.object({ ciktiKod: kimlik, agirlik: z.number().positive().max(100) })).max(40),
              }),
            )
            .max(200),
        }),
      )
      .min(1)
      .max(30),
    puanlar: z
      .array(
        z.object({
          ogrenci: z
            .string()
            .regex(ANONIM, "Öğrenci yerine takma ad kullanın (ör. o1). Numara ya da ad kabul edilmez."),
          aracId: kimlik,
          soruNo: kimlik,
          puan: z.number().min(0).max(1000).nullable(),
        }),
      )
      .min(1)
      .max(50_000),
    matris: z
      .record(kimlik, z.record(kimlik, z.number().int().min(0).max(5)))
      .optional()
      .describe("ÇK kodu → PÇ kodu → katkı (0: ilişkisiz, 1-5). Verilmezse PÇ sağlanması boş döner."),
    esik: z.number().min(0).max(100).default(60).describe("Başarı eşiği (0-100)"),
  }),
  calistir: (g) => {
    const matris: CkPcMatrisi | undefined = g.matris
      ? Object.fromEntries(
          Object.entries(g.matris).map(([ck, satir]) => [
            ck,
            Object.fromEntries(
              Object.entries(satir).map(([pc, v]): [string, MatrisDegeri] => [
                pc,
                v === 0 ? { tur: "iliskisiz" } : { tur: "puan", puan: v as 1 | 2 | 3 | 4 | 5 },
              ]),
            ),
          ]),
        )
      : undefined;
    let s: ReturnType<typeof dersiOlc>;
    try {
      s = dersiOlc(
        { dersKodu: g.dersKodu, donem: g.donem, ciktilar: g.ciktilar, araclar: g.araclar, puanlar: g.puanlar },
        { esik: g.esik, ...(matris ? { matris } : {}) },
      );
    } catch (e) {
      throw new AracHatasi(e instanceof Error ? e.message : "Hesap yapılamadı. Girdiyi denetleyin.");
    }
    const { notlar: _notlar, ...notIstatistikleri } = s.notIstatistikleri;
    return {
      sonuc: {
        dersKodu: s.dersKodu,
        donem: s.donem,
        yontem: s.yontem,
        esik: s.esik,
        ogrenciSayisi: s.ogrenciSayisi,
        ckBasarilari: s.ckBasarilari.map(({ ogrenciler: _o, ...c }) => c),
        pcSaglanmasi: s.pcSaglanmasi,
        notIstatistikleri,
        bulgular: s.bulgular,
        hesapSurumu: s.hesapSurumu,
        girdiOzeti: s.girdiOzeti,
        not: "Sayılar belirlenimci hesaptır; aynı girdi her zaman aynı sonucu verir. Harf tablosu örnektir, kurumun tablosu değildir.",
      },
      kaynak: [
        KOD_KAYNAGI("packages/olcme", `Akredit ölçme motoru ${HESAP_SURUMU}`),
        KOD_KAYNAGI("docs/olcme-yontemi.md", "Ölçme yöntemi"),
      ],
    };
  },
});

// ---------------------------------------------------------------- Rapor dil denetimi

const raporDilDenetle = arac({
  ad: "rapor_dil_denetle",
  baslik: "Rapor dil denetimi",
  aciklama:
    "Öz değerlendirme ya da faaliyet raporu metnini dil kurallarıyla denetler: kanıtsız üstünlük ifadesi, ölçüsüz nicelik, yazıyla sayı, öznesiz eylem, dönem ve tarih tutarlılığı. Metni değiştirmez, yalnız işaretler. Paragrafları boş satırla ayırın.",
  girdi: z.object({
    metin: z.string().min(1).max(60_000),
    donem: z
      .string()
      .regex(/^\d{4}-\d{4}$/u)
      .optional()
      .describe("Rapor dönemi, ör. '2025-2026'"),
    raporTarihi: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/u)
      .optional()
      .describe("YYYY-AA-GG"),
  }),
  calistir: ({ metin, donem, raporTarihi }) => {
    const bulgular = dilDenetle(metin, { ...(donem ? { donem } : {}), ...(raporTarihi ? { raporTarihi } : {}) });
    return {
      sonuc: {
        bulguSayisi: bulgular.length,
        yuksekOnemli: bulgular.filter((b) => b.onem === "yuksek").length,
        bulgular,
      },
      kaynak: [KOD_KAYNAGI("packages/cekirdek/src/rapor/dil.ts", "Akredit rapor dil kuralları")],
    };
  },
});

export const ACIK_ARACLAR: readonly AcikArac[] = [
  olcutAra,
  olcutGetir,
  olgunlukDuzeyleri,
  ozDegerlendirmeIskeleti,
  bolognaDenetleAraci,
  ckPcHesapla,
  raporDilDenetle,
] as unknown as readonly AcikArac[];
