// İP-35: self-servis kurum açılışı, kurulum sihirbazı adımları, birim/program yönetimi. Adlar uydurmadır.
import type { BolognaVerisi } from "@akredit/cekirdek";
import { sema, zinciriDogrula } from "@akredit/vt";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { aktorYukle, type ServisBaglami } from "../src/baglam.ts";
import { bolognaKoprusuAyarla } from "../src/bologna/index.ts";
import { ServisHatasi } from "../src/hata.ts";
import * as kurulum from "../src/kurulum/index.ts";
import * as acilis from "../src/kurum-acilisi.ts";
import { ortam, SIMDI } from "./yardimci.ts";

let o: Awaited<ReturnType<typeof ortam>>;
beforeAll(async () => {
  o = await ortam();
});
afterAll(async () => {
  await o.kapat?.();
});

const SONRA = new Date(SIMDI.getTime() + 3600_000);
const kod = async (p: Promise<unknown>) => {
  try {
    await p;
    return "yok";
  } catch (e) {
    return e instanceof ServisHatasi ? e.kod : e instanceof Error ? e.name : "?";
  }
};

const BASVURU = {
  kurumAdi: "Uydurma Teknik Üniversitesi",
  alanAdi: "uydurma.edu.tr",
  yoneticiAdi: "Deneme Kurucu",
  eposta: "kurucu@uydurma.edu.tr",
};

describe("kurum açılışı", () => {
  let belirtec = "";
  let kurumId = "";
  let kisiId = "";

  it("alan adı denetimi: e-posta beyan edilen alan adında olmalı, genel hizmetler reddedilir", async () => {
    expect(acilis.alanAdiSorunu("uydurma.edu.tr", "a@uydurma.edu.tr")).toBeNull();
    expect(acilis.alanAdiSorunu("uydurma.edu.tr", "a@hukuk.uydurma.edu.tr")).toBeNull();
    expect(acilis.alanAdiSorunu("uydurma.edu.tr", "a@baska.edu.tr")).toMatch(/uydurma\.edu\.tr/u);
    expect(acilis.alanAdiSorunu("gmail.com", "a@gmail.com")).toMatch(/Genel e-posta/u);
    expect(
      await kod(acilis.acilisBaslat(o.db, { ...BASVURU, eposta: "x@gmail.com" }, { simdi: SIMDI, agIzi: "a" })),
    ).toBe("gecersiz_istek");
    expect(acilis.alanAdlariCakisir("uydurma.edu.tr", "hukuk.uydurma.edu.tr")).toBe(true);
    expect(acilis.alanAdlariCakisir("uydurma.edu.tr", "baska.edu.tr")).toBe(false);
  });

  it("başvuru belirteci yalnız özetiyle saklanır", async () => {
    const r = await acilis.acilisBaslat(
      o.db,
      { ...BASVURU, alanAdi: "@Uydurma.edu.tr" },
      { simdi: SIMDI, agIzi: "ag-1" },
    );
    belirtec = r.belirtec;
    const satir = await o.db.select().from(sema.kurumAcilisTalebi);
    expect(satir).toHaveLength(1);
    expect(satir[0]?.alanAdi).toBe("uydurma.edu.tr");
    expect(JSON.stringify(satir)).not.toContain(belirtec);
  });

  it("doğrulama kurumu, yöneticiyi, rolü, üyeliği ve günlük kaydını oluşturur; bağlantı bir kez kullanılır", async () => {
    const r = await acilis.acilisTamamla(o.db, belirtec, { simdi: new Date(SIMDI.getTime() + 60_000) });
    kurumId = r.kurumId;
    kisiId = r.kisiId;
    expect(r.eposta).toBe("kurucu@uydurma.edu.tr");
    const uyelik = await o.db.select().from(sema.kimlikUyelik).where(eq(sema.kimlikUyelik.bagliKurumId, kurumId));
    expect(uyelik.map((u) => u.eposta)).toEqual(["kurucu@uydurma.edu.tr"]);
    const a = await aktorYukle(o.db, kurumId, kisiId);
    expect(a.atamalar).toMatchObject([{ rol: "kurum_yoneticisi", kapsam: { tur: "kurum", id: kurumId } }]);
    expect(await zinciriDogrula(o.db, kurumId)).toBeNull();
    expect(await kod(acilis.acilisTamamla(o.db, belirtec, { simdi: SIMDI }))).toBe("bulunamadi");
  });

  it("aynı alan adına (ya da alt alan adına) ikinci kurum açılamaz", async () => {
    const s = { simdi: SIMDI, agIzi: "ag-2" };
    expect(await kod(acilis.acilisBaslat(o.db, BASVURU, s))).toBe("cakisma");
    expect(
      await kod(
        acilis.acilisBaslat(o.db, { ...BASVURU, alanAdi: "hukuk.uydurma.edu.tr", eposta: "b@hukuk.uydurma.edu.tr" }, s),
      ),
    ).toBe("cakisma");
  });

  it("süresi geçen bağlantı kurum açmaz", async () => {
    const r = await acilis.acilisBaslat(
      o.db,
      { ...BASVURU, alanAdi: "gecikmis.edu.tr", eposta: "y@gecikmis.edu.tr" },
      { simdi: SIMDI, agIzi: "ag-3" },
    );
    const sonra = new Date(SIMDI.getTime() + acilis.ACILIS_SURESI_MS + 1000);
    expect(await kod(acilis.acilisTamamla(o.db, r.belirtec, { simdi: sonra }))).toBe("bulunamadi");
  });

  it("hız sınırı: aynı ağdan saatte 5, aynı alan adına saatte 3 başvuru", async () => {
    const s = { simdi: SIMDI, agIzi: "ag-hiz" };
    for (let i = 0; i < acilis.AG_SINIRI_SAATLIK; i++)
      await acilis.acilisBaslat(o.db, { ...BASVURU, alanAdi: `k${i}.edu.tr`, eposta: `y@k${i}.edu.tr` }, s);
    expect(await kod(acilis.acilisBaslat(o.db, { ...BASVURU, alanAdi: "k9.edu.tr", eposta: "y@k9.edu.tr" }, s))).toBe(
      "cok_fazla_istek",
    );
    const t = { ...BASVURU, alanAdi: "tekrar.edu.tr", eposta: "y@tekrar.edu.tr" };
    for (let i = 0; i < acilis.ALAN_SINIRI_SAATLIK; i++)
      await acilis.acilisBaslat(o.db, t, { simdi: SIMDI, agIzi: `farkli-${i}` });
    expect(await kod(acilis.acilisBaslat(o.db, t, { simdi: SIMDI, agIzi: "farkli-x" }))).toBe("cok_fazla_istek");
    // Bir saat sonra yeniden açılır.
    const sonra = new Date(SIMDI.getTime() + 3600_000 + 1000);
    expect(await kod(acilis.acilisBaslat(o.db, t, { simdi: sonra, agIzi: "farkli-y" }))).toBe("yok");
  });

  describe("kurulum sihirbazı", () => {
    let y: ServisBaglami;
    beforeAll(async () => {
      y = { db: o.db, aktor: await aktorYukle(o.db, kurumId, kisiId), simdi: () => SONRA };
    });

    it("yurt dışı kararı açık metinle, adıyla imzalanır ve günlüğe girer", async () => {
      const metinOzeti = kurulum.YURT_DISI_METNI_OZETI;
      expect(await kod(kurulum.yurtDisiKarariImzala(y, { izin: true, imzaAdi: "Başka Biri", metinOzeti }))).toBe(
        "kural_ihlali",
      );
      expect(
        await kod(
          kurulum.yurtDisiKarariImzala(y, { izin: true, imzaAdi: "Deneme Kurucu", metinOzeti: "0".repeat(64) }),
        ),
      ).toBe("kural_ihlali");
      const k = await kurulum.yurtDisiKarariImzala(y, { izin: true, imzaAdi: " deneme  kurucu ", metinOzeti });
      expect(k).toMatchObject({ izin: true, imzalayan: "Deneme Kurucu", metinOzeti });
      const d = await kurulum.kurulumDurumu(y);
      expect(d.yurtDisiKarari?.imzalayan).toBe("Deneme Kurucu");
      const g = await o.db.execute(
        sql`select eylem, ayrinti from gunluk where kurum_id = ${kurumId} and eylem = 'kurum.yurt_disi_karari_imzalandi'`,
      );
      expect(JSON.stringify(g)).toContain(metinOzeti);
      const anahtarla = { ...y, aktor: { ...y.aktor, tur: "anahtar" as const } };
      expect(
        await kod(kurulum.yurtDisiKarariImzala(anahtarla, { izin: false, imzaAdi: "Deneme Kurucu", metinOzeti })),
      ).toBe("yetki_yok");
    });

    it("çerçeve seçimi yalnız kütüphanedeki çerçevelerden", async () => {
      const s = kurulum.cerceveSecenekleri();
      expect(s.length).toBeGreaterThan(0);
      const ilk = s[0]?.kod as string;
      expect(await kurulum.cercevelerSec(y, { kodlar: [ilk, ilk] })).toEqual([ilk]);
      expect(await kod(kurulum.cercevelerSec(y, { kodlar: ["uydurma@1"] }))).toBe("gecersiz_istek");
      expect((await kurulum.kurulumDurumu(y)).cerceveler).toEqual([ilk]);
    });

    it("Bologna önizlemesi öneri döndürür, onaylanınca birim/program/PÇ/ders oluşur; adlar e-postaya çevrilmez", async () => {
      expect(kurulum.bolognaAdresiSorunu("http://127.0.0.1/bologna/x.aspx?curSunit=1")).not.toBeNull();
      expect(kurulum.bolognaAdresiSorunu("https://obs.uydurma.edu.tr/oibs/bologna/index.aspx?curSunit=12")).toBeNull();
      expect(kurulum.bolognaAdresiSorunu("https://obs.uydurma.edu.tr/oibs/index.aspx")).toMatch(/curSunit/u);
      bolognaKoprusuAyarla({ oku: async () => ORNEK_VERI, depo: null });
      const on = await kurulum.bolognaOnizle(y, { adres: ORNEK_VERI.adres });
      expect(on.programCiktilari).toHaveLength(2);
      expect(on.dersler.map((d) => d.kod)).toEqual(["UTB101", "UTB102"]);
      expect(on.okunamayanDersler).toEqual(["UTB199"]);
      expect(on.dersiVerenler).toEqual([
        { ad: "Dr. Öğr. Üyesi Kurgu Örnekoğlu", dersler: ["UTB101", "UTB102"] },
        { ad: "Öğr. Gör. Deneme Hoca", dersler: ["UTB102"] },
      ]);
      expect(JSON.stringify(on)).not.toMatch(/@/u);
      // Önizleme hiçbir şey kaydetmez.
      expect((await kurulum.kurulumDurumu(y)).programSayisi).toBe(0);
      const u = await kurulum.bolognaUygula(y, {
        onizlemeId: on.onizlemeId,
        birim: { ad: "Uydurma Meslek Yüksekokulu", tur: "myo" },
        program: { ad: "Bilgisayar Programcılığı", duzey: "onlisans" },
        dersKodlari: ["UTB101"],
      });
      expect(u).toMatchObject({ dersSayisi: 1, ciktiSayisi: 2, okumaKaniti: null });
      const d = await kurulum.kurulumDurumu(y);
      expect(d).toMatchObject({ birimSayisi: 1, programSayisi: 1, dersSayisi: 1 });
      expect(
        await kod(
          kurulum.bolognaUygula(y, {
            onizlemeId: on.onizlemeId,
            birim: { id: u.birimId },
            program: { ad: "X Y", duzey: "lisans" },
          }),
        ),
      ).toBe("bulunamadi");
    });

    it("birim/program: ekle, listele, düzelt (eski değer yeni kayıtta korunur)", async () => {
      const birim = await kurulum.birimEkle(y, { ad: "Uydurma Fakültesi", tur: "fakulte" });
      const program = await kurulum.programEkle(y, { birimId: birim.id, ad: "Uydurma Hukuku", duzey: "lisans" });
      expect(await kod(kurulum.programEkle(y, { birimId: birim.id, ad: "X", duzey: "lisans" }))).toBe("ZodError");
      const liste = await kurulum.birimler(y);
      expect(liste.find((x) => x.id === birim.id)?.programlar.map((p) => p.ad)).toEqual(["Uydurma Hukuku"]);
      expect(await kurulum.programDuzelt(y, program.id, { ad: "Uydurma Hukuk Programı" })).toEqual({ degisen: ["ad"] });
      expect(await kurulum.programDuzelt(y, program.id, { ad: "Uydurma Hukuk Programı" })).toEqual({ degisen: [] });
      expect(await kurulum.birimDuzelt(y, birim.id, { kod: "UF" })).toEqual({ degisen: ["kod"] });
      expect(await kod(kurulum.birimDuzelt(y, birim.id, { ustBirimId: birim.id }))).toBe("gecersiz_istek");
      const g = await kurulum.duzeltmeGecmisi(y, "program", program.id);
      expect(g).toEqual([
        {
          zaman: expect.any(String),
          duzelten: "Deneme Kurucu",
          onceki: { ad: "Uydurma Hukuku" },
          yeni: { ad: "Uydurma Hukuk Programı" },
        },
      ]);
      // Düzeltme kaydı değiştirilemez.
      await expect(o.db.execute(sql`update kayit_duzeltmesi set yeni = '{}'::jsonb`)).rejects.toThrow();
      const k = await kurulum.kisiler(y);
      expect(k.map((x) => x.adSoyad)).toEqual(["Deneme Kurucu"]);
      expect(k[0]?.roller[0]).toMatchObject({ rol: "kurum_yoneticisi", kapsamAdi: "Kurumun tamamı" });
    });

    it("başka kurumun kişisi kurulum adımlarını göremez; öğretim elemanı birim ekleyemez", async () => {
      const baska = await o.baglam(o.a, o.a.yonetici);
      const birimlerA = await kurulum.birimler(baska);
      expect(JSON.stringify(birimlerA)).not.toContain("Uydurma Fakültesi");
      const hoca = await o.baglam(o.a, o.a.ogretim);
      expect(await kod(kurulum.birimEkle(hoca, { ad: "Yetkisiz Birim", tur: "bolum" }))).toBe("yetki_yok");
      expect(await kod(kurulum.kurulumDurumu(hoca))).toBe("yetki_yok");
    });
  });
});

const ORNEK_VERI: BolognaVerisi = {
  adres: "https://obs.uydurma.edu.tr/oibs/bologna/index.aspx?curSunit=12",
  okundu: "2026-10-28T08:00:00Z",
  programCiktilari: [
    { kod: "P1", metin: "Uydurma program çıktısı bir." },
    { kod: "P2", metin: "Uydurma program çıktısı iki." },
  ],
  matris: {
    pkodlar: ["P1", "P2"],
    dersler: [
      { kod: "UTB101", ad: "Uydurma Giriş", zorunlu: true, grup: null, yariyil: 1, grupBasligi: false, degerler: {} },
      { kod: "UTB102", ad: "Uydurma İleri", zorunlu: false, grup: null, yariyil: 2, grupBasligi: false, degerler: {} },
    ],
  },
  tyycIsaret: null,
  dersler: [
    {
      kod: "UTB101",
      ad: "Uydurma Giriş",
      zorunlu: true,
      bos: false,
      kaynak: "https://obs.uydurma.edu.tr/oibs/bologna/progCourseDetails.aspx?curCourse=1",
      yariyil: 1,
      tul: "2+1+0",
      kredi: 3,
      akts: 4,
      bilgiler: { "Dersi Verenler": "Dr. Öğr. Üyesi Kurgu Örnekoğlu [e-posta ayıklandı]" },
      degerlendirme: [],
      isyuku: [],
      dersYapisi: [],
      ciktilar: [],
      haftalar: 14,
      katki: {},
    },
    {
      kod: "UTB102",
      ad: "Uydurma İleri",
      zorunlu: false,
      bos: false,
      kaynak: "https://obs.uydurma.edu.tr/oibs/bologna/progCourseDetails.aspx?curCourse=2",
      yariyil: 2,
      tul: "3+0+0",
      kredi: 3,
      akts: 5,
      bilgiler: { "Dersi Verenler": "Dr. Öğr. Üyesi Kurgu Örnekoğlu, Öğr. Gör. Deneme Hoca" },
      degerlendirme: [],
      isyuku: [],
      dersYapisi: [],
      ciktilar: [],
      haftalar: 14,
      katki: {},
    },
    { kod: "UTB199", hata: "HTTP 500" },
  ],
};
