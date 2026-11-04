// Herkese açık MCP araçları. Hepsi salt okuma ve deterministiktir: model çağrısı yok, kurum verisi yok,
// durum yok. Ölçüt metni yalnız resmî belgeden çıkarılmış çerçeve verisinden gelir (ilke 6); belgeden
// alınamayan metin DOĞRULANMADI olarak döner. Sayılar yalnız @akredit/olcme hesabından gelir (ilke 2).
// Öz değerlendirme iskeleti metin yazmaz: her bölüm EKSİK işaretiyle ve gereken kanıt türleriyle döner (ilke 1).

import { dilDenetle, type MatrisDegeri } from "@akredit/cekirdek";
import {
  belgeAdi,
  type Cerceve,
  DOGRULANMADI,
  EPDAD_DERECELENDIRME_ANAHTARI,
  type KaynakBelge,
  type Olcut,
  type OlcutEki,
  type OzguKaynak,
  olcutEkleri,
  ozguBagi,
  ozguBolumListesi,
  PROGRAM_BELGELERI,
  PROGRAM_CERCEVELERI,
  tumOlcutler,
  YOKAK_KIDR_3_2_1,
  YOKAK_KURUMSAL_3_3,
} from "@akredit/cerceveler";
import { type CkPcMatrisi, dersiOlc, HESAP_SURUMU } from "@akredit/olcme";
import { z } from "zod";
import { BOLOGNA_ARACLARI, bolognaDenetleAraci } from "./bologna.ts";
import { type AcikArac, AracHatasi, arac, DEPO, type Kaynak, KOD_KAYNAGI } from "./temel.ts";

export * from "./temel.ts";

// ---------------------------------------------------------------- Çerçeve yardımcıları

const BELGE_ADI: Record<string, string> = {
  [YOKAK_KURUMSAL_3_3.kaynak?.dosya ?? ""]:
    "YÖKAK Değerlendirme Programları Kılavuzu 3.3, Ek-1 Dereceli Değerlendirme Anahtarı",
  [YOKAK_KIDR_3_2_1.kaynak?.dosya ?? ""]: "YÖKAK KİDR Hazırlama Kılavuzu 3.2.1",
};
for (const e of YOKAK_KURUMSAL_3_3.ekKaynaklar)
  if (e.dosya && !BELGE_ADI[e.dosya]) BELGE_ADI[e.dosya] = "YÖKAK Değerlendirme Ölçütleri 3.1";
for (const b of Object.values(PROGRAM_BELGELERI)) if (b.dosya && !BELGE_ADI[b.dosya]) BELGE_ADI[b.dosya] = b.not;

/** Aranabilir çerçeveler: YÖKAK kurumsal 3.3 (varsayılan) ve resmî belgeden alınan program çerçeveleri. */
const CERCEVELER: readonly Cerceve[] = [YOKAK_KURUMSAL_3_3, ...PROGRAM_CERCEVELERI];
const CERCEVE_KODLARI = CERCEVELER.map((c) => c.kod) as [string, ...string[]];
const cerceveGirdisi = z
  .enum(CERCEVE_KODLARI)
  .default(YOKAK_KURUMSAL_3_3.kod)
  .describe(
    `Çerçeve kodu. Varsayılan YÖKAK (${YOKAK_KURUMSAL_3_3.kod}). Program akreditasyonu: ${PROGRAM_CERCEVELERI.map((c) => c.kod).join(", ")}.`,
  );
const cerceveBul = (kod: string): Cerceve => CERCEVELER.find((c) => c.kod === kod) ?? YOKAK_KURUMSAL_3_3;

/** Düzey tanımı belgeden ayrılamayan gösterge için dönen değer; tanım uydurulmaz. */
export const OKUNAMADI = "Belgeden okunamadı";

function ozguKaynagi(k: OzguKaynak): Kaynak {
  const b = Object.values(PROGRAM_BELGELERI).find((x) => x.dosya === k.dosya);
  return {
    ad: belgeAdi(k.dosya),
    adres: b?.adres ?? DEPO,
    sayfa: k.sayfa,
    sha256: k.sha256,
    ...(b?.erisimTarihi ? { erisimTarihi: b.erisimTarihi } : {}),
  };
}

function ekYaz(e: OlcutEki) {
  if (e.tur === "gosterge")
    return {
      tur: "gosterge" as const,
      no: e.no,
      metin: e.metin,
      duzeyler: EPDAD_DERECELENDIRME_ANAHTARI.duzeyler.map((d) => ({
        duzey: d.ad,
        metin: e.duzeyler ? e.duzeyler[d.kod] : OKUNAMADI,
      })),
      kaynakSayfa: e.kaynak.sayfa,
    };
  return { tur: "ozgu_konu" as const, bolum: e.bolumKod, grup: e.grup, metin: e.metin, kaynakSayfa: e.kaynak.sayfa };
}

/** Çerçevenin bütün ek öğeleri (bütün bölümler dahil; arama içindir, seçim değildir). */
function tumEkler(c: Cerceve): { olcutKod: string; e: OlcutEki }[] {
  const bolumler = ozguBolumListesi(c.kod).map((b) => b.kod);
  return tumOlcutler(c.olcutler).flatMap((o) =>
    olcutEkleri(c.kod, o.kod, bolumler).map((e) => ({ olcutKod: o.kod, e })),
  );
}

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
  baslik: "Ölçüt ara (YÖKAK ve program akreditasyonu)",
  aciklama:
    "YÖKAK ya da program akreditasyonu (MÜDEK, FEDEK, SABAK, EPDAD) ölçütlerinde sözcük ya da kodla arar. Metinler resmî belgeden alınır; alınamayan metin DOĞRULANMADI döner.",
  sonrakiAdim: "Hocaya en uygun 2-3 sonucu numaralı gösterin; seçtiği ölçütün tam metni için olcut_getir'i çağırın.",
  girdi: z.object({
    sorgu: z.string().trim().min(1).max(200).describe("Aranacak ifade ya da kod, ör. 'paydaş katılımı' ya da 'B.3'"),
    cerceve: cerceveGirdisi,
    en_fazla: z.number().int().min(1).max(50).default(10).describe("En çok kaç sonuç dönsün (1-50)"),
  }),
  calistir: ({ sorgu, cerceve, en_fazla }) => {
    const CERCEVE = cerceveBul(cerceve);
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
    // Ek öğeler (gösterge, özgü konu): her sözcük metinde ya da bölüm başlığında geçmeli; ölçütlerden sonra.
    const ekler = tumEkler(CERCEVE)
      .map((x) => {
        const m = x.e.metin.toLocaleLowerCase("tr");
        const b = x.e.tur === "ozgu_konu" ? x.e.bolumBaslik.toLocaleLowerCase("tr") : "";
        const tutan = kelimeler.filter((k) => m.includes(k) || b.includes(k));
        return { ...x, tam: tutan.length === kelimeler.length, puan: kelimeler.filter((k) => m.includes(k)).length };
      })
      .filter((x) => x.tam)
      .sort((a, b) => b.puan - a.puan);
    const ekSecilen = ekler.slice(0, Math.max(0, en_fazla - secilen.length));
    return {
      sonuc: {
        cerceve: `${CERCEVE.ad} ${CERCEVE.surum}`,
        cerceveKod: CERCEVE.kod,
        toplamEslesme: puanli.length,
        olcutler: secilen.map(({ o }) => ({
          kod: o.kod,
          baslik: o.baslik,
          duzey: duzey(o.kod),
          metinDurumu: o.metinDurumu,
          ozet: metinGoster(o).slice(0, 240),
          kaynakSayfa: o.kaynakSayfa,
        })),
        toplamEkEslesme: ekler.length,
        ekler: ekSecilen.map(({ olcutKod, e }) => ({
          olcutKod,
          tur: e.tur,
          ...(e.tur === "gosterge" ? { no: e.no } : { bolum: e.bolumKod }),
          ozet: e.metin.slice(0, 240),
          kaynakSayfa: e.kaynak.sayfa,
        })),
      },
      kaynak: [
        ...new Map<string, Kaynak>([
          ...secilen.map(({ o }): [string, Kaynak] => [
            o.kaynakDosya ?? CERCEVE.kaynak?.dosya ?? "",
            olcutKaynagi(CERCEVE, { ...o, kaynakSayfa: null }),
          ]),
          ...ekSecilen.map(({ e }): [string, Kaynak] => [e.kaynak.dosya, { ...ozguKaynagi(e.kaynak), sayfa: null }]),
        ]).values(),
      ],
    };
  },
});

const olcutGetir = arac({
  ad: "olcut_getir",
  baslik: "Ölçütü getir (YÖKAK ve program akreditasyonu)",
  aciklama:
    "Bir ölçütün resmî metnini kaynak belge, sayfa ve dosya özetiyle getirir; üst ve alt ölçütler, EPDAD göstergeleri, MÜDEK ve FEDEK programa özgü bölümleri de gelir. Metin tahminle doldurulmaz.",
  sonrakiAdim:
    "Alt ölçütse olgunluk_duzeyleri ile düzeyleri ve örnek kanıtları gösterin. Hocaya sorun: 1) örnek kanıtlar 2) başka ölçüt 3) öz değerlendirme iskeleti.",
  girdi: z.object({
    kod: z
      .string()
      .trim()
      .min(1)
      .max(20)
      .describe("Ölçüt kodu, ör. 'A', 'B.1', 'B.1.2'; program çerçevesinde ör. '5.1' ya da '1.1.1'"),
    cerceve: cerceveGirdisi,
    bolum: z
      .string()
      .trim()
      .min(1)
      .max(60)
      .optional()
      .describe(
        "MÜDEK 5.1 ya da FEDEK 10.1 için bölüm kodu, ör. 'bilgisayar-yazilim'. Verilmezse yalnız bölüm listesi döner.",
      ),
  }),
  calistir: ({ kod, cerceve, bolum }) => {
    const CERCEVE = cerceveBul(cerceve);
    const o = olcutBul(CERCEVE, kod);
    const bag = ozguBagi(CERCEVE.kod);
    const bolumler = bag?.olcutKod === o.kod ? ozguBolumListesi(CERCEVE.kod) : [];
    if (bolum && !bolumler.some((b) => b.kod === bolum))
      throw new AracHatasi(
        bolumler.length
          ? `"${bolum.slice(0, 40)}" kodlu bölüm yok. Kodu bu aracın bölüm listesinden seçin.`
          : `${o.kod} ölçütünde disipline ya da programa özgü bölüm yok.`,
      );
    const ekler = olcutEkleri(CERCEVE.kod, o.kod, bolum ? [bolum] : []);
    const ust = tumOlcutler(CERCEVE.olcutler).find((x) => x.altOlcutler.includes(o)) ?? null;
    return {
      sonuc: {
        cerceve: `${CERCEVE.ad} ${CERCEVE.surum}`,
        kod: o.kod,
        baslik: o.baslik,
        duzey: duzey(o.kod),
        metin: metinGoster(o),
        metinDurumu: o.metinDurumu,
        ust: ust ? { kod: ust.kod, baslik: ust.baslik } : null,
        altOlcutler: o.altOlcutler.map((a) => ({ kod: a.kod, baslik: a.baslik })),
        olgunlukDuzeyiVar: Boolean(o.olgunlukTanimlari?.length),
        uzmanDogrulamasi: CERCEVE.dogrulandi ? "yapıldı" : "bekliyor",
        ...(bolumler.length
          ? {
              ozguBolumler: {
                ad: bag?.ad,
                not: "Programın hangi bölüme girdiğini kurum seçer; bu araç seçim yapmaz.",
                bolumler: bolumler.map((b) => ({ kod: b.kod, baslik: b.baslik, kaynakSayfa: b.kaynak.sayfa })),
              },
            }
          : {}),
        ...(ekler.length ? { ekler: ekler.map(ekYaz) } : {}),
        ...(ekler.some((e) => e.tur === "gosterge")
          ? { derecelendirme: EPDAD_DERECELENDIRME_ANAHTARI.duzeyler.map((d) => d.ad) }
          : {}),
      },
      kaynak: [
        olcutKaynagi(CERCEVE, o),
        ...new Map(ekler.map((e) => [e.kaynak.dosya, { ...ozguKaynagi(e.kaynak), sayfa: null }])).values(),
      ],
    };
  },
});

const olgunlukDuzeyleri = arac({
  ad: "olgunluk_duzeyleri",
  baslik: "Alt ölçüt olgunluk düzeyleri ve örnek kanıtlar",
  aciklama:
    "Bir YÖKAK alt ölçütünün (ör. B.1.2) 1-5 olgunluk düzeyi metinlerini ve örnek kanıtlarını getirir. Düzey önermez; düzeye kurum kanıtla karar verir.",
  sonrakiAdim:
    "Örnek kanıtları hocanın elindekilerle eşleştirin: her kanıt için 1) var 2) yok 3) emin değilim diye sorun. Yok olanlar EKSİK kalır.",
  girdi: z.object({ kod: z.string().trim().min(1).max(20).describe("Alt ölçüt kodu, ör. 'B.1.2'") }),
  calistir: ({ kod }) => {
    const CERCEVE = YOKAK_KURUMSAL_3_3;
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
    "Öz değerlendirme raporunun (KİDR 3.2.1) bölümlerini, alt ölçütlerini ve gereken örnek kanıtları verir. Metin yazmaz; her bölüm EKSİK gelir.",
  sonrakiAdim: "Hocanın yazdığı bölüm metnini rapor_dil_denetle ile denetleyin. Kanıtı olmayan cümle EKSİK kalır.",
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

// ---------------------------------------------------------------- ÇK/PÇ sağlanma hesabı

const kimlik = z.string().trim().min(1).max(30);
const ANONIM = /^(?![0-9]{7,}$)[\p{L}\p{N}_.-]{1,24}$/u;

const ckPcHesapla = arac({
  ad: "ck_pc_hesapla",
  baslik: "ÇK ve PÇ sağlanma düzeyi hesabı",
  aciklama:
    "Takma adlı puan tablosundan ders öğrenme çıktısı (ÇK) başarısını ve program çıktısı (PÇ) sağlanma düzeyini hesaplar. Öğrenci adı ve numarası kabul edilmez; yalnız toplu sonuç döner.",
  sonrakiAdim:
    "Sonucu tablo olarak gösterin, sayıları yalnız bu yanıttan alın. Eşiğin altında kalan çıktılar için hocaya sorun: 1) iyileştirme notu yaz 2) başka eşikle yeniden hesapla 3) bitir.",
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
    "Rapor metnindeki dil sorunlarını işaretler: kanıtsız üstünlük, ölçüsüz nicelik, öznesiz eylem, dönem ve tarih tutarsızlığı. Metni değiştirmez.",
  sonrakiAdim:
    "Her bulgu için 2-3 numaralı düzeltme seçeneği sunun (uydurma sayı ya da kanıt eklemeden); hoca seçince düzeltilmiş metni yeniden denetleyin.",
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
  ...BOLOGNA_ARACLARI,
  ckPcHesapla,
  raporDilDenetle,
] as unknown as readonly AcikArac[];
