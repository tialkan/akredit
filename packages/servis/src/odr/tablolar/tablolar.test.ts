// ÖDR program tabloları servisi (İP-47): PGlite, ağ yok, model yok. Kurumun Bologna okuması kanıt olarak
// kaydedilir; eşlemeler öneri ve karar olarak eklenir; tablo yalnız kararlarla dolar.
// Ders kodları, adları, sayılar ve dayanaklar uydurmadır.

import { type BolognaOkunanDers, type BolognaVerisi, ozetHesapla } from "@akredit/cekirdek";
import type { Hucre, Satir, UretilenTablo } from "@akredit/cerceveler";
import { kiraciIslemi, sema } from "@akredit/vt";
import { desc, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ortam } from "../../../test/yardimci.ts";
import type { ServisBaglami } from "../../baglam.ts";
import * as bologna from "../../bologna/index.ts";
import { ServisHatasi } from "../../hata.ts";
import * as t from "./index.ts";

let o: Awaited<ReturnType<typeof ortam>>;
let yonetici: ServisBaglami;
let gozlemci: ServisBaglami;
let anahtar: ServisBaglami;
let programId = "";
const CERCEVE = "mudek-lisans";

async function kod(p: Promise<unknown>) {
  try {
    await p;
  } catch (e) {
    if (e instanceof ServisHatasi) return e.kod;
    if (e && typeof e === "object" && "issues" in e) return "zod";
    throw e;
  }
  return "hata yok";
}

function ders(kod: string, ad: string, yariyil: number, akts: number, zorunlu = true): BolognaOkunanDers {
  return {
    kod,
    ad,
    zorunlu,
    bos: false,
    kaynak: `https://bologna.ornek.edu.tr/ders/${kod}`,
    yariyil,
    tul: "3+0+0",
    kredi: 3,
    akts,
    bilgiler: { "Dersin Dili": "Türkçe" },
    degerlendirme: [],
    isyuku: [],
    dersYapisi: [],
    ciktilar: [],
    haftalar: 14,
    katki: {},
  };
}

const OKUMA: BolognaVerisi = {
  adres: "https://bologna.ornek.edu.tr/program",
  okundu: "2026-10-01T08:00:00Z",
  programCiktilari: [
    { kod: "P1", metin: "Temel bilgiyi uygular." },
    { kod: "P2", metin: "Takımda çalışır." },
  ],
  matris: {
    pkodlar: ["P1", "P2"],
    dersler: [
      {
        kod: "MAT101",
        ad: "Matematik I",
        zorunlu: true,
        grup: null,
        yariyil: 1,
        grupBasligi: false,
        degerler: { P1: "5", P2: "-" },
      },
    ],
  },
  tyycIsaret: 5,
  dersler: [
    ders("MAT101", "Matematik I", 1, 6),
    ders("FIZ101", "Fizik I", 1, 5),
    ders("SEC301", "Seçmeli A", 3, 4, false),
    ders("SEC303", "Seçmeli B", 3, 4, false),
  ],
};

const tablo = (d: t.ProgramTablolari, kod: string): UretilenTablo => {
  const x = d.tablolar.find((y) => y.tanimKod === kod);
  if (!x) throw new Error(kod);
  return x;
};
const metin = (h: Hucre | undefined) => (h?.tur === "deger" ? h.metin : h?.tur === "eksik" ? "EKSİK" : "");
const satirlar = (s: Satir[]) =>
  s.filter((x) => x.tur === "veri").map((x) => (x.tur === "ara" ? [] : x.hucreler.map(metin)));
const toplam = (s: Satir[]) => {
  const x = s.find((y) => y.tur === "toplam");
  return x && x.tur !== "ara" ? x.hucreler.map(metin) : [];
};
const durum = (b: ServisBaglami = yonetici) => t.programTablolari(b, { programId, cerceveKod: CERCEVE });
const karar = (tur: t.EslemeTuru, anahtarDegeri: string, deger: unknown, b: ServisBaglami = yonetici) =>
  t.eslemeKarariVer(b, {
    programId,
    cerceveKod: CERCEVE,
    tur,
    anahtar: anahtarDegeri,
    deger,
    dayanak: "Bölüm kurulu kararı 2026/7",
  });

beforeAll(async () => {
  o = await ortam();
  programId = o.a.programId;
  yonetici = await o.baglam(o.a, o.a.yonetici);
  gozlemci = await o.baglam(o.a, o.a.gozlemci);
  anahtar = await o.baglam(o.a, o.a.yonetici, "anahtar", ["olcme.oku", "rapor.duzenle", "karar.ver"]);
  bologna.bolognaKoprusuAyarla({
    oku: null,
    depo: {
      async koy(kurumId, veri) {
        const ozet = ozetHesapla(veri);
        return { ozet, anahtar: `${kurumId}/${ozet}` };
      },
    },
    saglayici: null,
  });
});
afterAll(async () => {
  await o.kapat();
});

describe("program tabloları servisi", () => {
  it("tablosu olan çerçeveler listelenir; şablonu alınmamış çerçeve reddedilir", async () => {
    // Tablo tanımı olan dört çerçeve: MÜDEK lisans, FEDEK, SABAK, EPDAD öğretmen (YL ve RPD şablonu yok).
    expect(t.tabloCerceveleri().map((c) => c.kod)).toEqual([
      "mudek-lisans",
      "fedek-lisans",
      "sabak-genel",
      "epdad-ogretmen",
    ]);
    expect(await kod(t.programTablolari(yonetici, { programId, cerceveKod: "mudek-yl" }))).toBe("gecersiz_istek");
  });

  it("Bologna verisi yokken bütün hücreler EKSİK, eşleme yazılamaz", async () => {
    const d = await durum();
    expect(d.bologna).toBeNull();
    expect(d.tablolar).toHaveLength(4);
    for (const x of d.tablolar) expect(x.eksikSayisi).toBeGreaterThan(0);
    expect(await kod(karar("ders_kategorisi", "MAT101", "MTB"))).toBe("gecersiz_istek");
  });

  it("Bologna okumasından sonra tablo dersleri gösterir, eşlemesiz kategori EKSİK kalır", async () => {
    await bologna.okumaKaydet(yonetici, programId, { veri: OKUMA });
    const d = await durum();
    expect(d.bologna?.okundu).toBe(OKUMA.okundu);
    expect(d.eslemeler.dersler.map((x) => x.anahtar)).toEqual(["MAT101", "FIZ101", "SEC301", "SEC303"]);
    expect(d.eslemeler.pcKurul.map((x) => x.anahtar)).toEqual(["P1", "P2"]);
    expect(d.eslemeler.secmeliYer.map((x) => x.anahtar)).toEqual(["3"]);
    const t51 = tablo(d, "mudek-lisans.5.1");
    expect(satirlar(t51.satirlar)[0]).toEqual(["FIZ101", "Fizik I", "Türkçe", "EKSİK", "EKSİK", "EKSİK", "EKSİK"]);
  });

  it("öneri tabloya girmez; API anahtarı öneri yazabilir, karar veremez", async () => {
    await t.eslemeOner(anahtar, {
      programId,
      cerceveKod: CERCEVE,
      tur: "ders_kategorisi",
      anahtar: "MAT101",
      deger: "MTB",
      uretici: "yz",
    });
    const d = await durum();
    const mat = d.eslemeler.dersler.find((x) => x.anahtar === "MAT101");
    expect(mat?.oneri).toMatchObject({ deger: "MTB", uretici: "yz" });
    expect(mat?.karar).toBeNull();
    expect(satirlar(tablo(d, "mudek-lisans.5.1").satirlar)[1]?.[3]).toBe("EKSİK");
    expect(await kod(karar("ders_kategorisi", "MAT101", "MTB", anahtar))).toBe("yetki_yok");
    expect(await kod(karar("ders_kategorisi", "MAT101", "MTB", gozlemci))).toBe("yetki_yok");
  });

  it("geçersiz değer ve anahtar reddedilir, dayanak zorunlu", async () => {
    expect(await kod(karar("ders_kategorisi", "MAT101", "YOK"))).toBe("gecersiz_istek");
    expect(await kod(karar("ders_kategorisi", "OLMAYAN", "MTB"))).toBe("gecersiz_istek");
    expect(await kod(karar("pc_kurul", "P1", ["9.C9"]))).toBe("gecersiz_istek");
    expect(await kod(karar("secmeli_yer", "1", 1))).toBe("gecersiz_istek");
    expect(await kod(karar("secmeli_yer", "3", -1))).toBe("gecersiz_istek");
    expect(
      await kod(
        t.eslemeKarariVer(yonetici, {
          programId,
          cerceveKod: CERCEVE,
          tur: "ders_kategorisi",
          anahtar: "MAT101",
          deger: "MTB",
          dayanak: " ",
        }),
      ),
    ).toBe("zod");
  });

  it("kararla tablo dolar; toplam seçmeli yer sayısıyla hesaplanır; karar günlüğe adla yazılır", async () => {
    await karar("ders_kategorisi", "MAT101", "MTB");
    await karar("ders_kategorisi", "FIZ101", "MTB");
    await karar("ders_kategorisi", "SEC301", "MK");
    await karar("ders_kategorisi", "SEC303", "MK");
    let d = await durum();
    let t51 = tablo(d, "mudek-lisans.5.1");
    // Seçmeli yer sayısı girilmedi: toplam EKSİK.
    expect(toplam(t51.satirlar).slice(3)).toEqual(["EKSİK", "EKSİK", "EKSİK", "EKSİK"]);
    await karar("secmeli_yer", "3", 2);
    d = await durum();
    t51 = tablo(d, "mudek-lisans.5.1");
    // MTB: zorunlu MAT101 (3-6) + FIZ101 (3-5) = "6-11". MK: 3. yarıyılda 2 yer x "3-4" = "6-8".
    expect(toplam(t51.satirlar).slice(3)).toEqual(["6-11", "6-8", "0-0", "0-0"]);
    expect(d.eslemeler.secmeliYer[0]?.karar).toMatchObject({ deger: 2, dayanak: "Bölüm kurulu kararı 2026/7" });
    expect(d.eslemeler.dersler[0]?.karar?.kararVeren).toBeTruthy();
    expect(d.eslemeler.dersler[0]?.oneri).toBeNull();

    const [g] = await kiraciIslemi(o.db, o.a.kurumId, (tx) =>
      tx
        .select()
        .from(sema.gunluk)
        .where(eq(sema.gunluk.eylem, "program_esleme.karar_verildi"))
        .orderBy(desc(sema.gunluk.sira))
        .limit(1),
    );
    const [kisi] = await kiraciIslemi(o.db, o.a.kurumId, (tx) =>
      tx.select({ ad: sema.kisi.adSoyad }).from(sema.kisi).where(eq(sema.kisi.id, o.a.yonetici)),
    );
    expect(g?.ayrinti).toMatchObject({
      tur: "secmeli_yer",
      anahtar: "3",
      deger: 2,
      kararVeren: kisi?.ad,
      dayanak: "Bölüm kurulu kararı 2026/7",
      zaman: "2026-10-27T09:00:00.000Z",
    });
  });

  it("düzeltme yeni kararla yapılır, önceki kayıt silinmez", async () => {
    await karar("ders_kategorisi", "FIZ101", "MK");
    const d = await durum();
    expect(satirlar(tablo(d, "mudek-lisans.5.1").satirlar)[0]?.slice(3)).toEqual(["", "3-5", "", ""]);
    const r = await kiraciIslemi(o.db, o.a.kurumId, (tx) =>
      tx.select().from(sema.programEsleme).where(eq(sema.programEsleme.anahtar, "FIZ101")),
    );
    expect(r.map((x) => x.deger)).toEqual(["MTB", "MK"]);
  });

  it("PÇ-kurul eşlemesi: X ve kapsayan PÇ sayısı", async () => {
    await karar("pc_kurul", "P1", ["3.C2", "3.C1"]);
    let d = await durum();
    // P2'nin eşlemesi yok: sayım EKSİK.
    expect(toplam(tablo(d, "mudek-lisans.3.1.2").satirlar)[2]).toBe("EKSİK");
    await karar("pc_kurul", "P2", []);
    d = await durum();
    const u = tablo(d, "mudek-lisans.3.1.2");
    expect(satirlar(u.satirlar).map((r) => r.slice(2, 5))).toEqual([
      ["X", "X", ""],
      ["", "", ""],
    ]);
    expect(toplam(u.satirlar).slice(2, 5)).toEqual(["1", "1", "0"]);
  });

  it("başka kurum programı göremez", async () => {
    const b = await o.baglam(o.b, o.b.yonetici);
    expect(await kod(t.programTablolari(b, { programId, cerceveKod: CERCEVE }))).toBe("bulunamadi");
    expect(await kod(karar("ders_kategorisi", "MAT101", "MTB", b))).toBe("bulunamadi");
  });

  it("Word ve Excel dosyası üretilir, indirme günlüğe girer", async () => {
    for (const bicim of ["docx", "xlsx"] as const) {
      const f = await t.tabloBelgesi(yonetici, { programId, cerceveKod: CERCEVE, bicim });
      expect(f.dosyaAdi).toBe(`mudek-lisans-tablolar.${bicim}`);
      // Zip imzası: "PK".
      expect([f.icerik[0], f.icerik[1]]).toEqual([0x50, 0x4b]);
      expect(f.ozet).toMatch(/^[0-9a-f]{64}$/u);
    }
  });
});
