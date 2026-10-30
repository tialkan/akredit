// PÜKÖ'nün kalıcı deposu ve REST uçları (İP-39): PGlite, ağ yok. Ders kodları ve ölçümler uydurmadır.

import type { BolognaTaslagi } from "@akredit/cekirdek";
import { kiraciIslemi, sema } from "@akredit/vt";
import { bolognaOrnek, politikaUygula, sahteSaglayici } from "@akredit/yz";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Aktor } from "../src/baglam.ts";
import { donemOnlemleri } from "../src/bologna/devir.ts";
import { devirTaslagiKur } from "../src/bologna/devir-saf.ts";
import { apiIsleyici } from "../src/http/isleyici.ts";
import { puko } from "../src/index.ts";
import { type Ornek, ortam, SIMDI } from "./yardimci.ts";

let o: Awaited<ReturnType<typeof ortam>>;
const BAHAR = "2025-2026 Bahar";
const GUZ = "2026-2027 Güz";

// Ölçüm değerleri gövdeden gelmez: sunucu kayıtlı not ve soru verisinden `@akredit/olcme` ile hesaplar.
// Gövde yalnız hangi ders, dönem ve çıktının işleneceğini söyler.
const sec = (dersKodu: string, donem = BAHAR) => ({ olcumTuru: "pc" as const, kod: "PÇ3", dersKodu, donem });
let pc3 = "";
const ILK = [sec("BP101"), sec("BP102"), sec("BP104")];

/**
 * Dersi, ÖÇ1'i, onaylı kararla ÖÇ1 → PÇ3 katkısını (5), dönem açılışını, tek sorulu (tam puan 100, ÖÇ1'e eşli) bir sınavı ve iki öğrencinin puanını kaydeder.
 * ÇK başarısı = öğrenci puanlarının ortalaması: (a + b) / 2. Örn. 30 ve 50 → 40. PÇ3'e katkılı tek ÇK olduğundan
 * PÇ3 sağlanması ÇK başarısına eşittir.
 */
async function dersKaydet(kod: string, donemAd: string, puanlar: [number, number], soruEslemesi = true) {
  return kiraciIslemi(o.db, o.a.kurumId, async (tx) => {
    let [d] = await tx.select().from(sema.ders).where(eq(sema.ders.kod, kod));
    if (!d) {
      [d] = await tx
        .insert(sema.ders)
        .values({ kurumId: o.a.kurumId, programId: o.a.programId, kod, ad: `Ders ${kod}`, akts: 5, yariyil: 2 })
        .returning();
      const [ck] = await tx
        .insert(sema.cikti)
        .values({ kurumId: o.a.kurumId, tur: "ders", sahipId: d?.id as string, kod: "ÖÇ1", metin: "Ders çıktısı." })
        .returning();
      const [on] = await tx
        .insert(sema.oneri)
        .values({
          kurumId: o.a.kurumId,
          tur: "matris_katkisi",
          hedefTuru: "ders",
          hedefId: d?.id as string,
          icerik: { baslik: `${kod} katkı matrisi`, metin: "Örnek matris." },
          gerekce: "Örnek veri.",
          ureticiTuru: "kisi",
          uretici: { kisiId: o.a.yonetici },
          risk: "orta",
        })
        .returning();
      const [kr] = await tx
        .insert(sema.karar)
        .values({
          kurumId: o.a.kurumId,
          oneriId: on?.id as string,
          sonuc: "onaylandi",
          kararVerenKisiId: o.a.yonetici,
          dayanak: "dogrudan",
        })
        .returning();
      await tx.insert(sema.katki).values({
        kurumId: o.a.kurumId,
        dersCiktiId: ck?.id as string,
        programCiktiId: pc3,
        deger: "5",
        kararId: kr?.id as string,
      });
    }
    const dersId = d?.id as string;
    const [c] = await tx
      .select()
      .from(sema.cikti)
      .where(and(eq(sema.cikti.sahipId, dersId), eq(sema.cikti.tur, "ders")));
    const [dn] = await tx.select().from(sema.donem).where(eq(sema.donem.ad, donemAd));
    const [ac] = await tx
      .insert(sema.dersAcilisi)
      .values({ kurumId: o.a.kurumId, dersId, donemId: dn?.id as string })
      .returning();
    const [arac] = await tx
      .insert(sema.olcmeAraci)
      .values({ kurumId: o.a.kurumId, dersAcilisiId: ac?.id as string, tur: "yariyil_sonu", agirlik: "100" })
      .returning();
    const [q] = await tx
      .insert(sema.soru)
      .values({
        kurumId: o.a.kurumId,
        olcmeAraciId: arac?.id as string,
        numara: "1",
        tamPuan: "100",
        ciktiEslemesi: soruEslemesi ? [{ ciktiId: c?.id, agirlik: 1 }] : [],
      })
      .returning();
    await tx.insert(sema.ogrenciPuani).values(
      puanlar.map((p, i) => ({
        kurumId: o.a.kurumId,
        olcmeAraciId: arac?.id as string,
        soruId: q?.id as string,
        ogrenciTakmaAd: `ogr-${kod}-${i}`,
        puan: String(p),
      })),
    );
    return { dersId, acilisId: ac?.id as string };
  });
}

beforeAll(async () => {
  o = await ortam();
  await kiraciIslemi(o.db, o.a.kurumId, (tx) =>
    tx.insert(sema.donem).values({ kurumId: o.a.kurumId, ad: GUZ, baslangic: "2026-09-21", bitis: "2027-01-15" }),
  );
  pc3 = await kiraciIslemi(o.db, o.a.kurumId, async (tx) => {
    const [c] = await tx
      .insert(sema.cikti)
      .values({ kurumId: o.a.kurumId, tur: "program", sahipId: o.a.programId, kod: "PÇ3", metin: "Program çıktısı." })
      .returning();
    return c?.id as string;
  });
  // Bahar: BP101 40, BP102 55, BP104 75 (eşik 60). Güz: BP101 70 (iyileşti), BP102 50 (iyileşmedi).
  await dersKaydet("BP101", BAHAR, [30, 50]);
  await dersKaydet("BP102", BAHAR, [50, 60]);
  await dersKaydet("BP104", BAHAR, [70, 80]);
  await dersKaydet("BP101", GUZ, [60, 80]);
  await dersKaydet("BP102", GUZ, [40, 60]);
});
afterAll(async () => {
  await o?.kapat();
});

const aktor = async (x: Ornek, kisi: string, tur: Aktor["tur"] = "oturum", kapsam: Aktor["anahtarKapsami"] = null) =>
  (await o.baglam(x, kisi, tur, kapsam)).aktor;

function istek(yontem: string, yol: string, govde?: unknown) {
  return new Request(`http://yerel/api/v1${yol}`, {
    method: yontem,
    headers: govde === undefined ? {} : { "content-type": "application/json" },
    ...(govde === undefined ? {} : { body: JSON.stringify(govde) }),
  });
}

describe("PÜKÖ kalıcı depo ve uçlar", () => {
  let kartId: string;
  let secenekId: string;

  it("ölçümler işlenir: eşik altı küme kart olur, eşiği geçen günlüğe otomatik girer; tekrar işlemek kart çoğaltmaz", async () => {
    const isle = apiIsleyici({ db: o.db, simdi: () => SIMDI });
    const y = await aktor(o.a, o.a.yonetici);
    const r = await isle(istek("POST", "/puko/olcumler", { secimler: ILK, kanitId: o.a.kanitKurum }), y);
    expect(r.status, await r.clone().text()).toBe(200);
    expect(await r.json()).toEqual({ otomatik: 1, acilan: 1, kapanan: 0 });
    const tekrar = await isle(istek("POST", "/puko/olcumler", { secimler: ILK, kanitId: o.a.kanitKurum }), y);
    expect(await tekrar.json()).toMatchObject({ acilan: 0 });
    // Kanıtı olmayan ölçüm işlenmez.
    const yok = await isle(
      istek("POST", "/puko/olcumler", { secimler: ILK, kanitId: "01900000-0000-7000-8000-0000000000ee" }),
      y,
    );
    expect(yok.status).toBe(404);
  });

  it("inceleme: gövdede ölçüm değeri gelirse 400; değerler kayıtlı veriden hesaplanır; API anahtarı reddedilir", async () => {
    const isle = apiIsleyici({ db: o.db, simdi: () => SIMDI });
    const y = await aktor(o.a, o.a.yonetici);
    const degerli = { ...sec("BP101"), deger: 95, esik: 60, kaynak: { hesapSurumu: "olcme-1.0.0" } };
    const r = await isle(istek("POST", "/puko/olcumler", { olcumler: [degerli], kanitId: o.a.kanitKurum }), y);
    expect(r.status).toBe(400);
    const r2 = await isle(istek("POST", "/puko/olcumler", { secimler: [degerli], kanitId: o.a.kanitKurum }), y);
    expect(r2.status).toBe(400);
    const anahtar = await aktor(o.a, o.a.yonetici, "anahtar", ["olcme.veri_gir"]);
    const r3 = await isle(istek("POST", "/puko/olcumler", { secimler: ILK, kanitId: o.a.kanitKurum }), anahtar);
    expect(r3.status).toBe(403);
    const gozlemci = await aktor(o.a, o.a.gozlemci);
    const r4 = await isle(istek("POST", "/puko/olcumler", { secimler: ILK, kanitId: o.a.kanitKurum }), gozlemci);
    expect(r4.status).toBe(403);
    // Kartın ölçümleri sunucu hesabıdır: 40 ve 55, hesap sürümü ve girdi özetiyle.
    const p = await puko.pukoPaneli(await o.baglam(o.a, o.a.yonetici));
    const olcumler = p.kartlar[0]?.kume.olcumler ?? [];
    expect(olcumler.map((x) => [x.dersKodu, x.deger])).toEqual([
      ["BP101", 40],
      ["BP102", 55],
    ]);
    expect(olcumler[0]?.kaynak.girdiOzeti).toMatch(/^[0-9a-f]{64}$/u);
    // Kayıtlı olmayan ders işlenmez.
    const yok = await isle(istek("POST", "/puko/olcumler", { secimler: [sec("XX999")], kanitId: o.a.kanitKurum }), y);
    expect(yok.status).toBe(404);
  });

  it("panel: açık kart, hedef dönem önerisi ve otomatik kayıt sayısı; B kurumu görmez", async () => {
    const p = await puko.pukoPaneli(await o.baglam(o.a, o.a.yonetici));
    expect(p.kartlar).toHaveLength(1);
    const kart = p.kartlar[0] as (typeof p.kartlar)[number];
    expect(kart.kume.olcumler.map((x) => x.dersKodu)).toEqual(["BP101", "BP102"]);
    expect(kart.hedefDonem).toBe(GUZ);
    expect(p.otomatikSayisi).toBeGreaterThanOrEqual(1);
    // Kök neden REST ölçüm ucunda madde analizinden dolar. BP101: tek soru, tam puan 100, puanlar 30 ve 50;
    // güçlük indeksi = ortalama / tam puan = 40 / 100 = 0,4 < 0,5 → zor soru. ÇK tek soruyla ölçülür → tek ölçüm.
    // BP102: 55 / 100 = 0,55, zor değil.
    expect(kart.kokNedenler.BP101?.map((n) => [n.tur, n.soruNo ?? null, n.deger ?? null])).toEqual([
      ["zor_soru", "1", 0.4],
      ["tek_olcum", null, null],
    ]);
    // BP101 ayırt edicilik = (üst - alt) / tam puan = (50 - 30) / 100 = 0,2, eşiğin altında değil.
    // BP102 ayırt edicilik = (60 - 50) / 100 = 0,1 < 0,2 → ayırt etmeyen soru.
    expect(kart.kokNedenler.BP102?.map((n) => [n.tur, n.deger ?? null])).toEqual([
      ["ayirt_etmeyen_soru", 0.1],
      ["tek_olcum", null],
    ]);
    kartId = kart.id;
    secenekId = kart.secenekler[0]?.id as string;
    expect((await puko.pukoPaneli(await o.baglam(o.b, o.b.yonetici))).kartlar).toEqual([]);
  });

  it("önlem: API anahtarı ve karar yetkisi olmayan reddedilir; gövdeden karar veren kabul edilmez", async () => {
    const isle = apiIsleyici({ db: o.db, simdi: () => SIMDI });
    const govde = { kartId, secim: { secenekId }, hedefDonem: GUZ, sureMs: 12_000 };
    const anahtar = await aktor(o.a, o.a.yonetici, "anahtar", ["karar.ver"]);
    expect((await isle(istek("POST", "/puko/onlem", govde), anahtar)).status).toBe(403);
    expect((await isle(istek("POST", "/puko/onlem", govde), await aktor(o.a, o.a.gozlemci))).status).toBe(403);
    const sahte = await isle(
      istek("POST", "/puko/onlem", { ...govde, kararVeren: o.a.ogretim }),
      await aktor(o.a, o.a.yonetici),
    );
    expect(sahte.status).toBe(400);
  });

  it("önlem: kayıtlı olmayan hedef dönem 404, ölçülen dönemden önceki hedef reddedilir; hiçbir şey yazılmaz", async () => {
    const b = await o.baglam(o.a, o.a.yonetici);
    const govde = { kartId, secim: { secenekId }, sureMs: 12_000 };
    await expect(puko.pukoOnlemSec(b, { ...govde, hedefDonem: "2030 Yok" })).rejects.toMatchObject({
      kod: "bulunamadi",
    });
    await expect(puko.pukoOnlemSec(b, { ...govde, hedefDonem: BAHAR })).rejects.toMatchObject({
      kod: "kural_ihlali",
    });
    expect((await puko.pukoPaneli(b)).kartlar).toHaveLength(1);
  });

  it("önlem oturumdaki kişinin adıyla yalnız eklenen olay olarak yazılır; ikinci karar çakışma", async () => {
    const isle = apiIsleyici({ db: o.db, simdi: () => SIMDI });
    const y = await aktor(o.a, o.a.yonetici);
    // BP101'in Güz açılışına sorumlu atanır; BP102'nin sorumlusu yok.
    await kiraciIslemi(o.db, o.a.kurumId, async (tx) => {
      const [d] = await tx.select().from(sema.ders).where(eq(sema.ders.kod, "BP101"));
      const [dn] = await tx.select().from(sema.donem).where(eq(sema.donem.ad, GUZ));
      await tx
        .update(sema.dersAcilisi)
        .set({ sorumluKisiIdleri: [o.a.ogretim] })
        .where(and(eq(sema.dersAcilisi.dersId, d?.id as string), eq(sema.dersAcilisi.donemId, dn?.id as string)));
    });
    const govde = { kartId, secim: { secenekId }, hedefDonem: GUZ, sureMs: 12_000 };
    const r = await isle(istek("POST", "/puko/onlem", govde), y);
    expect(r.status, await r.clone().text()).toBe(200);
    const s = (await r.json()) as { devir: { dayanak: { kararVeren: string } }[] };
    expect(s.devir.map((d) => d.dayanak.kararVeren)).toEqual([o.a.yonetici, o.a.yonetici]);
    const satirlar = await kiraciIslemi(o.db, o.a.kurumId, (tx) =>
      tx.select().from(sema.pukoOlayi).where(eq(sema.pukoOlayi.tur, "onlem_secildi")),
    );
    expect(satirlar.map((x) => x.kararVerenKisiId)).toEqual([o.a.yonetici]);
    expect((await isle(istek("POST", "/puko/onlem", govde), y)).status).toBe(409);
    const g = await kiraciIslemi(o.db, o.a.kurumId, (tx) =>
      tx.select().from(sema.gunluk).where(eq(sema.gunluk.eylem, "puko.onlem_secildi")),
    );
    expect(g).toHaveLength(1);
    expect(g[0]?.aktorId).toBe(o.a.yonetici);
    expect((await puko.pukoPaneli(await o.baglam(o.a, o.a.yonetici))).kartlar).toEqual([]);
  });

  it("seçilen önlem süreç motorunda ders başına eylem açar ve sessiz devir onu yeni dönem taslağına ekler", async () => {
    const eylemler = await kiraciIslemi(o.db, o.a.kurumId, (tx) =>
      tx.select().from(sema.eylem).orderBy(sema.eylem.tanim),
    );
    const puk = eylemler.filter((e) => (e.kaynak as { tur?: string }).tur === "puko");
    expect(puk).toHaveLength(2);
    const ders = await kiraciIslemi(o.db, o.a.kurumId, (tx) => tx.select().from(sema.ders));
    const dersId = (kod: string) => ders.find((d) => d.kod === kod)?.id;
    const bp101 = puk.find((e) => (e.kaynak as { dersId: string }).dersId === dersId("BP101"));
    const bp102 = puk.find((e) => (e.kaynak as { dersId: string }).dersId === dersId("BP102"));
    // Sorumlu: hedef dönem açılışının ilk sorumlusu; son tarih hedef dönemin başlangıcı; aşama "önlem al".
    expect(bp101?.sorumluKisiId).toBe(o.a.ogretim);
    expect(bp102?.sorumluKisiId).toBeNull();
    expect(bp101?.hedefTarih?.toISOString()).toBe("2026-09-21T00:00:00.000Z");
    expect(bp101?.pukoAsamasi).toBe("onlem_al");
    expect(bp101?.tanim).toMatch(/^PÇ3 için önlem: /u);
    // İP-38 devir girdisi: sessiz devir bu eylemi okur, önlemi yöntem alanının sonuna ekler.
    const onlemler = await kiraciIslemi(o.db, o.a.kurumId, (tx) =>
      donemOnlemleri(tx, dersId("BP101") as string, { bas: new Date("2026-09-21"), son: new Date("2027-02-15") }),
    );
    expect(onlemler).toHaveLength(1);
    const dz = onlemler[0]?.bolognaDuzeltmesi;
    expect(dz).toMatchObject({ alan: "yontem", dil: "tr", kip: "ekle" });
    const { dayanaklar: _d, ...c } = bolognaOrnek.ornekCikti();
    const onceki = { ...bolognaOrnek.ornekGirdi().sabit, ...c } as unknown as BolognaTaslagi;
    const [te, uy, la] = onceki.tul.split("+").map(Number);
    const s = devirTaslagiKur(onceki, {
      ders: {
        kod: onceki.kod,
        ad: onceki.ad,
        akts: onceki.akts,
        teorik: te ?? 0,
        uygulama: uy ?? 0,
        laboratuvar: la ?? 0,
      },
      programCiktilari: null,
      onlemler,
    });
    expect(s.taslak.yontem).toEqual({ tr: `${onceki.yontem.tr}\n\n${dz?.metin}`, en: onceki.yontem.en });
    expect(s.onlemler.map((x) => x.uygulandi)).toEqual([true]);
  });

  it("sonraki dönem ölçümü döngüyü kapatır; iyileşmeyen ders yeni karta girer; YZ önerisi kurum sağlayıcısından, rakamsız", async () => {
    const b = await o.baglam(o.a, o.a.yonetici);
    const sahte = sahteSaglayici([
      JSON.stringify({
        onlemler: [
          "Zor çıkan konuyu derste ek uygulamayla yeniden işle.",
          "Sınavda soruların yüzde 50'sini bu çıktıya ayır.",
          "Ara değerlendirmeyi 3 haftada bir yap.",
          "Soruların çıktıyla uyumunu bölüm kurulunda gözden geçir.",
        ],
      }),
    ]);
    // Kurum sağlayıcısı çıkış kapısından (`politikaUygula`) geçer.
    const saglayici = politikaUygula(sahte, { yurtDisiIzin: false, maske: {} });
    const r = await puko.pukoOlcumleriIsle(
      b,
      { secimler: [sec("BP101", GUZ), sec("BP102", GUZ)], kanitId: o.a.kanitKurum },
      { saglayici },
    );
    expect(r).toMatchObject({ kapanan: 1, acilan: 1 });
    const p = await puko.pukoPaneli(b);
    expect(p.kartlar).toHaveLength(1);
    expect(p.kartlar[0]?.oncekiPukoId).toBeTruthy();
    const secenekler = p.kartlar[0]?.secenekler ?? [];
    expect(secenekler.filter((x) => x.uretici === "yz").map((x) => x.metin)).toEqual([
      "Zor çıkan konuyu derste ek uygulamayla yeniden işle.",
      "Soruların çıktıyla uyumunu bölüm kurulunda gözden geçir.",
    ]);
    for (const x of secenekler) expect(x.metin).not.toMatch(/\p{Nd}/u);
    // Modele kök neden açıklaması gider, öğrenci takma adı ya da puan gitmez.
    const giden = JSON.stringify(sahte.istekler);
    expect(giden).toContain("BP102");
    expect(giden).not.toContain("ogr-");
  });
});

describe("inceleme dalga 8, bulgu 12: ders dosyası akışının onaylı eşlemesi", () => {
  /** Ders dosyası akışının eşleme önerisi (soruya yazılmaz). Araç adı yoksa türü ad olarak kullanılır. */
  async function eslemeOnerisi(dersId: string, acilisId: string, karar: "onaylandi" | "reddedildi" | null) {
    await kiraciIslemi(o.db, o.a.kurumId, async (tx) => {
      const [on] = await tx
        .insert(sema.oneri)
        .values({
          kurumId: o.a.kurumId,
          tur: "soru_cikti_eslemesi",
          hedefTuru: "ders",
          hedefId: dersId,
          icerik: {
            baslik: "Soru-çıktı eşlemesi",
            metin: "yariyil_sonu S1: ÖÇ1",
            dersAcilisiId: acilisId,
            araclar: [{ ad: "yariyil_sonu", tur: "yariyil_sonu", sorular: [{ no: "1" }] }],
            ckKodlari: ["ÖÇ1"],
            satirlar: [
              { aracAdi: "yariyil_sonu", aracTur: "yariyil_sonu", soruNo: "1", ckKodlari: ["ÖÇ1"], kaynak: "insan" },
            ],
          },
          gerekce: "Örnek veri.",
          ureticiTuru: "kisi",
          uretici: { kisiId: o.a.yonetici },
          risk: "orta",
        })
        .returning();
      if (karar)
        await tx.insert(sema.karar).values({
          kurumId: o.a.kurumId,
          oneriId: on?.id as string,
          sonuc: karar,
          kararVerenKisiId: o.a.yonetici,
          dayanak: "dogrudan",
          ...(karar === "reddedildi" ? { gerekce: "Eşleme yanlış." } : {}),
        });
    });
  }

  it("soruda eşleme yoksa onaylı eşleme önerisi kullanılır; kararsız ya da reddedilmiş öneri kullanılmaz", async () => {
    const { olcumleriHesapla } = await import("../src/puko/olcum-hesabi.ts");
    // Üç ders, soruları eşlemesiz; puanlar 20 ve 60, tek soru tam puan 100.
    const onayli = await dersKaydet("BP120", GUZ, [20, 60], false);
    const kararsiz = await dersKaydet("BP121", GUZ, [20, 60], false);
    const red = await dersKaydet("BP122", GUZ, [20, 60], false);
    await eslemeOnerisi(onayli.dersId, onayli.acilisId, "onaylandi");
    await eslemeOnerisi(kararsiz.dersId, kararsiz.acilisId, null);
    await eslemeOnerisi(red.dersId, red.acilisId, "reddedildi");
    const s = await kiraciIslemi(o.db, o.a.kurumId, (tx) =>
      olcumleriHesapla(tx, o.a.kurumId, [sec("BP120", GUZ), sec("BP121", GUZ), sec("BP122", GUZ)]),
    );
    // BP120: ÖÇ1 başarısı (20 + 60) / 2 = 40; PÇ3'e katkılı tek ÇK olduğundan PÇ3 = 40.
    // BP121 ve BP122: eşleme yok, PÇ3 hesaplanamaz (null).
    expect(s.map((x) => [x.dersKodu, x.deger])).toEqual([
      ["BP120", 40],
      ["BP121", null],
      ["BP122", null],
    ]);
  });
});
