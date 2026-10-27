// İP-16: kurgu bir dönemle uçtan uca ders dosyası (döküm → eşleme onayı → ölçme → DOCX/XLSX → dosya onayı),
// izlenebilirlik, etkileşim ölçümü, dönemden döneme eşleme taşıma. Bütün ad ve numaralar uydurmadır.

import { metinCikar, tabloOku } from "@akredit/belge";
import { dersiOlc } from "@akredit/olcme";
import { kiraciIslemi, sema } from "@akredit/vt";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type Ornek, ortam, SIMDI } from "../../test/yardimci.ts";
import { ServisHatasi } from "../hata.ts";
import { kararVer } from "../oneri.ts";
import { type DosyaGirdisi, dersDosyasiModeli, iyilestirmeTaslagi, olcmeRaporuSayfalari, sayiYaz } from "./belge.ts";
import { eslemeMetni, eslemeMetniOku, eslemeOnerisiKur } from "./esleme.ts";
import { etkilesimOzeti } from "./etkilesim.ts";
import * as dd from "./index.ts";

const ANAHTAR = "deneme-anahtari-yalniz-test-icin-0123456789";
const b64 = (s: string) => Buffer.from(s, "utf8").toString("base64");

// Kurgu vize: 5 öğrenci, S1 (10 puan) ve S2 (10 puan).
// S1: 10, 8, 6, 4, 2 → ÖÇ1 başarısı %100, 80, 60, 40, 20 → ortalama 60.
// S2: hepsi 5 → ÖÇ2 başarısı %50 → ortalama 50.
// Ders notu (tek araç, ağırlık 100): toplam/20 × 100 = 75, 65, 55, 45, 35 → ortalama 55.
const VIZE = [
  "Öğrenci No;Adı Soyadı;S1 (10);S2 (10);Toplam",
  "2026001;Deneme Bir;10;5;15",
  "2026002;Deneme İki;8;5;13",
  "2026003;Deneme Üç;6;5;11",
  "2026004;Deneme Dört;4;5;9",
  "2026005;Deneme Beş;2;5;7",
].join("\n");

let o: Awaited<ReturnType<typeof ortam>>;
let a: Ornek;
beforeAll(async () => {
  o = await ortam();
  a = o.a;
  await kiraciIslemi(o.db, a.kurumId, async (tx) => {
    await tx
      .insert(sema.cikti)
      .values({ kurumId: a.kurumId, tur: "ders", sahipId: a.dersId, kod: "ÖÇ2", metin: "İkinci ders çıktısı." });
  });
});
afterAll(async () => {
  await o.kapat();
});

describe("eşleme önerisi (saf)", () => {
  const araclar = [{ ad: "Vize", tur: "ara_sinav" as const, sorular: [{ no: "1" }, { no: "2" }] }];
  it("önceki dönem önce gelir, model adayında derste olmayan çıktı reddedilir, eşlenemeyen EKSİK kalır", () => {
    const e = eslemeOnerisiKur({
      araclar,
      ckKodlari: ["ÖÇ1", "ÖÇ2"],
      onceki: [{ aracAdi: "Ara", aracTur: "ara_sinav", soruNo: "1", ckKodlari: ["ÖÇ2"], kaynak: "insan" }],
      adaylar: [{ soruNo: "1", ckKodlari: ["ÖÇ1"] }, { soruNo: "2", ckKodlari: ["ÖÇ9"] }, "bozuk"],
    });
    expect(e.satirlar.map((s) => [s.soruNo, s.kaynak, s.ckKodlari])).toEqual([
      ["1", "onceki_donem", ["ÖÇ2"]],
      ["2", "yok", []],
    ]);
    expect(e.eksikler).toEqual(["Vize · S2"]);
    expect(e.reddedilenler).toHaveLength(2);
    expect(eslemeMetni(e.satirlar)).toBe("Vize · S1: ÖÇ2\nVize · S2: EKSİK");
  });
  it("düzeltilmiş metin okunur; eksik soru, bilinmeyen soru ve çıktı reddedilir", () => {
    expect(eslemeMetniOku("Vize · S1: ÖÇ1, ÖÇ2\nVize · S2: eksik", araclar, ["ÖÇ1", "ÖÇ2"])).toEqual([
      { aracAdi: "Vize", aracTur: "ara_sinav", soruNo: "1", ckKodlari: ["ÖÇ1", "ÖÇ2"], kaynak: "insan" },
      { aracAdi: "Vize", aracTur: "ara_sinav", soruNo: "2", ckKodlari: [], kaynak: "insan" },
    ]);
    expect(() => eslemeMetniOku("Vize · S1: ÖÇ1", araclar, ["ÖÇ1"])).toThrow(/Vize · S2/u);
    expect(() => eslemeMetniOku("Final · S1: ÖÇ1\nVize · S1: ÖÇ1\nVize · S2: ÖÇ1", araclar, ["ÖÇ1"])).toThrow(/yok/u);
    expect(() => eslemeMetniOku("Vize · S1: ÖÇ7\nVize · S2: ÖÇ1", araclar, ["ÖÇ1"])).toThrow(/ÖÇ7/u);
    expect(() => eslemeMetniOku("Vize S1 ÖÇ1", araclar, ["ÖÇ1"])).toThrow(/biçiminde/u);
  });
});

describe("etkileşim ölçümü (saf)", () => {
  it("yalnız insan adımları sayılır, politika kararı ve sistem sayılmaz", () => {
    const z = (m: number) => new Date(SIMDI.getTime() + m * 60_000);
    const e = etkilesimOzeti([
      { eylem: "ders_dosyasi.dokum_aktarildi", aktorTuru: "kisi", zaman: z(0), ayrinti: {} },
      { eylem: "karar.verildi", aktorTuru: "kisi", zaman: z(1), ayrinti: { sureMs: 30_000 } },
      { eylem: "ders_dosyasi.olusturuldu", aktorTuru: "sistem", zaman: z(2), ayrinti: {} },
      { eylem: "karar.verildi", aktorTuru: "kisi", zaman: z(3), ayrinti: { dayanak: "politika" } },
    ]);
    expect(e).toMatchObject({ adimSayisi: 2, yuklemeSayisi: 1, kararSayisi: 1, toplamSureMs: 30_000 });
  });
});

/** Sonuçtaki her sayının izin verilen biçimleri: rapordaki sayı bu kümede olmalı. */
function izinliSayilar(sonuc: unknown): Set<string> {
  const k = new Set<string>();
  const gez = (v: unknown) => {
    if (typeof v === "number") {
      k.add(String(v));
      k.add(sayiYaz(v));
      k.add(sayiYaz(v, 1));
      k.add(`%${sayiYaz(v * 100, 1)}`);
    } else if (Array.isArray(v)) v.forEach(gez);
    else if (v && typeof v === "object") Object.values(v).forEach(gez);
  };
  gez(sonuc);
  return k;
}

describe("belge modeli: her sayı ölçme sonucuna izlenebilir", () => {
  const sonuc = dersiOlc(
    {
      dersKodu: "BPA102",
      donem: "2025-2026 Bahar",
      ciktilar: [{ kod: "ÖÇ1" }, { kod: "ÖÇ2" }],
      araclar: [
        {
          id: "v",
          tur: "ara_sinav",
          ad: "Vize",
          agirlik: 100,
          sorular: [
            { no: "1", tamPuan: 10, eslemeler: [{ ciktiKod: "ÖÇ1", agirlik: 1 }] },
            { no: "2", tamPuan: 10, eslemeler: [{ ciktiKod: "ÖÇ2", agirlik: 1 }] },
          ],
        },
      ],
      puanlar: [10, 8, 6, 4, 2].flatMap((p, i) => [
        { ogrenci: `t${i}`, aracId: "v", soruNo: "1", puan: p },
        { ogrenci: `t${i}`, aracId: "v", soruNo: "2", puan: 5 },
      ]),
    },
    { matris: { ÖÇ1: { PÇ1: { tur: "puan", puan: 3 } } } },
  );
  const g: DosyaGirdisi = {
    kurumAdi: "Örnek Üniversitesi",
    ders: { kod: "BPA102", ad: "Veri Tabanı", akts: 5 },
    donem: "2025-2026 Bahar",
    sorumlular: ["Deneme Hoca"],
    ciktilar: [
      { kod: "ÖÇ1", metin: "Bir." },
      { kod: "ÖÇ2", metin: "İki." },
    ],
    araclar: [{ id: "v", ad: "Vize", tur: "ara_sinav", agirlik: 100, sorular: [{ no: "1", tamPuan: 10 }] }],
    esleme: [],
    eslemeOnayi: null,
    sonuc,
    olcmeSonucuId: "os-1",
    kanitlar: [],
    etkilesim: { adimSayisi: 3, yuklemeSayisi: 1, kararSayisi: 2, toplamSureMs: 90_000, adimlar: [] },
    dosyaOnayi: null,
  };
  it("sonuç, grafik ve madde analizi tablolarındaki sayılar sonuçtan gelir; tablolar kaynak notu taşır", () => {
    const m = dersDosyasiModeli(g);
    const izinli = izinliSayilar(sonuc);
    let sayilan = 0;
    for (const bolum of m.bolumler.filter((x) => /^(4|5|6)\./u.test(x.baslik ?? "")))
      for (const ic of bolum.icerik) {
        if (ic.tur !== "tablo") continue;
        expect(ic.aciklama).toContain(sonuc.girdiOzeti);
        for (const satir of ic.satirlar)
          for (const h of satir)
            if (/^%?-?\d+(,\d+)?$/u.test(h)) {
              sayilan++;
              expect(izinli.has(h), `"${h}" ölçme sonucunda yok`).toBe(true);
            }
      }
    expect(sayilan).toBeGreaterThan(20);
    // Elle: ÖÇ1 ortalaması 60, ÖÇ2 50, not ortalaması 55.
    expect(sonuc.ckBasarilari.map((c) => c.ortalama)).toEqual([60, 50]);
    expect(sonuc.notIstatistikleri.ortalama).toBe(55);
    expect(m.ustBilgi).toContain("Taslak");
    expect(m.altBilgi).toContain(sonuc.girdiOzeti);
  });
  it("iyileştirme taslağı yalnız bulgulardan; ölçme raporu sayıları ham sayıdır", () => {
    for (const s of iyilestirmeTaslagi(sonuc)) expect(s).toMatch(/Öneri:/u);
    const x = olcmeRaporuSayfalari(g);
    expect(x.map((s) => s.ad)).toEqual(["Özet", "ÇK", "PÇ", "Madde analizi", "Dağılım", "Bulgular"]);
    expect(x[1]?.satirlar.map((r) => r[3])).toEqual([60, 50]);
  });
});

describe("kurgu dönemle uçtan uca", () => {
  let eslemeOneriId = "";
  it("döküm aktarılır, numara saklanmaz, eşleme önerisi açılır", async () => {
    const b = await o.baglam(a, a.ogretim);
    const r = await dd.dokumAktar(
      b,
      {
        dersAcilisiId: a.dersAcilisiId,
        araclar: [{ ad: "Vize", tur: "ara_sinav", agirlik: 100, dosyaAdi: "vize.csv", icerikBase64: b64(VIZE) }],
        adaylar: [
          { soruNo: "1", ckKodlari: ["ÖÇ1"] },
          { soruNo: "2", ckKodlari: ["ÖÇ9"] },
        ],
      },
      ANAHTAR,
    );
    eslemeOneriId = r.eslemeOneriId;
    expect(r.ogrenciSayisi).toBe(5);
    expect(r.eksikler).toEqual(["Vize · S2"]);
    const dokum = await kiraciIslemi(o.db, a.kurumId, async (tx) => ({
      puan: await tx.select().from(sema.ogrenciPuani),
      gunluk: await tx.select().from(sema.gunluk),
      oneri: await tx.select().from(sema.oneri).where(eq(sema.oneri.id, r.eslemeOneriId)),
    }));
    const metin = JSON.stringify(dokum);
    for (const yasak of ["2026001", "2026005", "Deneme Bir"]) expect(metin).not.toContain(yasak);
    expect(dokum.puan).toHaveLength(10);
    expect(dokum.oneri[0]).toMatchObject({ tur: "soru_cikti_eslemesi", risk: "orta", ureticiTuru: "yz" });
    // Aynı dönem ikinci kez aktarılamaz.
    await expect(
      dd.dokumAktar(
        b,
        {
          dersAcilisiId: a.dersAcilisiId,
          araclar: [{ ad: "Vize", tur: "ara_sinav", agirlik: 100, dosyaAdi: "vize.csv", icerikBase64: b64(VIZE) }],
        },
        ANAHTAR,
      ),
    ).rejects.toMatchObject({ kod: "cakisma" });
  });

  it("onaysız eşlemeyle ölçme yapılmaz", async () => {
    const b = await o.baglam(a, a.ogretim);
    expect((await dd.durum(b, a.dersAcilisiId)).asama).toBe("esleme_onayda");
    await expect(dd.olustur(b, a.dersAcilisiId)).rejects.toBeInstanceOf(ServisHatasi);
  });

  it("hoca eşlemeyi düzelterek onaylar, işçi ölçer, dosya onayı açılır", async () => {
    const b = await o.baglam(a, a.ogretim);
    await kararVer(b, {
      oneriId: eslemeOneriId,
      sonuc: "duzeltildi",
      duzeltme: "Vize · S1: ÖÇ1\nVize · S2: ÖÇ2",
      sureMs: 30_000,
    });
    expect(await dd.bekleyenleriUret(o.db, a.kurumId, SIMDI)).toEqual([a.dersAcilisiId]);
    expect(await dd.bekleyenleriUret(o.db, a.kurumId, SIMDI)).toEqual([]);
    const d = await dd.durum(b, a.dersAcilisiId);
    expect(d.asama).toBe("onay_bekliyor");
    const [os] = await kiraciIslemi(o.db, a.kurumId, (tx) =>
      tx
        .select()
        .from(sema.olcmeSonucu)
        .where(eq(sema.olcmeSonucu.id, d.olcmeSonucuId as string)),
    );
    const sonuc = os?.sonuc as {
      ckBasarilari: { ckKod: string; ortalama: number }[];
      notIstatistikleri: { ortalama: number };
    };
    expect(sonuc.ckBasarilari.map((c) => [c.ckKod, c.ortalama])).toEqual([
      ["ÖÇ1", 60],
      ["ÖÇ2", 50],
    ]);
    expect(sonuc.notIstatistikleri.ortalama).toBe(55);
    // Taslak belge: üst bilgide "Taslak".
    const docx = await dd.belge(b, a.dersAcilisiId, "docx");
    const t = await metinCikar(new Uint8Array(Buffer.from(docx.icerikBase64, "base64")), { ad: docx.dosyaAdi });
    expect(JSON.stringify(t)).toContain("EKSİK: Ders dosyası henüz onaylanmadı");
  });

  it("dosya onaylanır; belgeler onaylayanı, girdi özetini ve etkileşimi taşır", async () => {
    const b = await o.baglam(a, a.ogretim);
    const once = await dd.durum(b, a.dersAcilisiId);
    // Yüksek riskli dosya onayı toplu verilemez; tek karar.
    await kararVer(b, { oneriId: once.dosyaOneriId as string, sonuc: "onaylandi", sureMs: 60_000 });
    const d = await dd.durum(b, a.dersAcilisiId);
    expect(d.asama).toBe("onaylandi");
    // Hocanın toplam etkileşimi: 1 yükleme + 2 karar; karar ekranında 1,5 dakika.
    expect(d.etkilesim).toMatchObject({ adimSayisi: 3, yuklemeSayisi: 1, kararSayisi: 2, toplamSureMs: 90_000 });
    const docx = await dd.belge(b, a.dersAcilisiId, "docx");
    const metin = JSON.stringify(
      await metinCikar(new Uint8Array(Buffer.from(docx.icerikBase64, "base64")), { ad: docx.dosyaAdi }),
    );
    const [os] = await kiraciIslemi(o.db, a.kurumId, (tx) => tx.select().from(sema.olcmeSonucu));
    expect(metin).toContain("Deneme Hoca A");
    expect(metin).toContain(os?.girdiOzeti as string);
    expect(metin).toContain("60,00");
    expect(metin).not.toContain("2026001");
    const xlsx = await dd.belge(b, a.dersAcilisiId, "xlsx");
    const tablo = await tabloOku(new Uint8Array(Buffer.from(xlsx.icerikBase64, "base64")), { ad: xlsx.dosyaAdi });
    const ck = tablo.sayfalar.find((s) => s.ad === "ÇK");
    expect(ck?.satirlar.slice(1).map((r) => [r[0], r[3]])).toEqual([
      ["ÖÇ1", 60],
      ["ÖÇ2", 50],
    ]);
    // Ders görünümündeki kontrol listesi tamam.
    const liste = await kiraciIslemi(o.db, a.kurumId, (tx) => dd.kontrolListesi(tx, a.dersId));
    expect(liste.every((x) => x.tamam)).toBe(true);
  });

  it("dış kanaldan (MCP) gelen aynı türde öneri onaylı eşlemeyi ve dosyayı gölgelemez (D3-2)", async () => {
    const b = await o.baglam(a, a.ogretim);
    const once = await dd.durum(b, a.dersAcilisiId);
    await kiraciIslemi(o.db, a.kurumId, async (tx) => {
      for (const tur of ["soru_cikti_eslemesi", "rapor_bolumu"] as const)
        await tx.insert(sema.oneri).values({
          kurumId: a.kurumId,
          tur,
          hedefTuru: "ders",
          hedefId: a.dersId,
          // En kötü durum: içerik bu açılışı ve dosyanın yapısını taklit eder.
          icerik: {
            baslik: "Dış öneri",
            metin: "Vize · S1: ÖÇ2",
            dersAcilisiId: a.dersAcilisiId,
            eslemeOneriId: once.eslemeOneriId,
          },
          gerekce: "Deneme.",
          atiflar: [],
          ureticiTuru: "yz",
          uretici: { model: "deneme-istemci", kanal: "mcp" },
          risk: "orta",
          olusturma: new Date(SIMDI.getTime() + 86_400_000),
        });
    });
    const sonra = await dd.durum(b, a.dersAcilisiId);
    expect(sonra.asama).toBe("onaylandi");
    expect(sonra.dosyaOneriId).toBe(once.dosyaOneriId);
    const liste = await kiraciIslemi(o.db, a.kurumId, (tx) => dd.kontrolListesi(tx, a.dersId));
    expect(liste.every((x) => x.tamam)).toBe(true);
    expect(await dd.bekleyenleriUret(o.db, a.kurumId, SIMDI)).toEqual([]);
  });

  it("sonraki dönemde onaylı eşleme taşınır", async () => {
    const yeni = await kiraciIslemi(o.db, a.kurumId, async (tx) => {
      const [d] = await tx
        .insert(sema.donem)
        .values({ kurumId: a.kurumId, ad: "2026-2027 Bahar", baslangic: "2027-02-01", bitis: "2027-06-30" })
        .returning();
      const [x] = await tx
        .insert(sema.dersAcilisi)
        .values({ kurumId: a.kurumId, dersId: a.dersId, donemId: d?.id as string, sorumluKisiIdleri: [a.ogretim] })
        .returning();
      return x?.id as string;
    });
    const b = await o.baglam(a, a.ogretim);
    const r = await dd.dokumAktar(
      b,
      {
        dersAcilisiId: yeni,
        araclar: [{ ad: "Ara sınav", tur: "ara_sinav", agirlik: 100, dosyaAdi: "a.csv", icerikBase64: b64(VIZE) }],
      },
      ANAHTAR,
    );
    expect(r.eksikler).toEqual([]);
    const [on] = await kiraciIslemi(o.db, a.kurumId, (tx) =>
      tx.select().from(sema.oneri).where(eq(sema.oneri.id, r.eslemeOneriId)),
    );
    expect(on?.ureticiTuru).toBe("kural");
    expect((on?.icerik as { metin?: string } | undefined)?.metin).toBe("Ara sınav · S1: ÖÇ1\nAra sınav · S2: ÖÇ2");
    const liste = await dd.dersinDosyalari(b, a.dersId);
    expect(liste.map((x) => x.asama)).toEqual(["esleme_onayda", "onaylandi"]);
  });

  it("yetkisiz kişi aktaramaz, tam puanı olmayan döküm reddedilir", async () => {
    const g = await o.baglam(a, a.gozlemci);
    await expect(
      dd.dokumAktar(
        g,
        {
          dersAcilisiId: a.dersAcilisiId,
          araclar: [{ ad: "X", tur: "odev", agirlik: 10, dosyaAdi: "x.csv", icerikBase64: b64(VIZE) }],
        },
        ANAHTAR,
      ),
    ).rejects.toMatchObject({ kod: "yetki_yok" });
    const h = await o.baglam(a, a.ogretim);
    await expect(
      dd.dokumAktar(
        h,
        {
          dersAcilisiId: a.dersAcilisiId,
          araclar: [
            { ad: "Y", tur: "odev", agirlik: 10, dosyaAdi: "y.csv", icerikBase64: b64("Öğrenci No;S1\n2026001;5\n") },
          ],
        },
        ANAHTAR,
      ),
    ).rejects.toThrow(/tam puan/u);
    await expect(dd.dokumAktar(h, { dersAcilisiId: a.dersAcilisiId, araclar: [] }, "kisa")).rejects.toBeTruthy();
  });
});
