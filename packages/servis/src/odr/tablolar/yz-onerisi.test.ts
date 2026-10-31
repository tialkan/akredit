// ÖDR tablo eşlemesi YZ öneri işi (İP-47): PGlite ve sahte sağlayıcı, ağ yok. İstek günlüğe yazılır, işçi
// işler, kurala uyan öneri yalnız öneri olarak eklenir; tabloya girmez. Ders kodları, adlar ve metinler uydurmadır.

import { type BolognaOkunanDers, type BolognaVerisi, ozetHesapla } from "@akredit/cekirdek";
import { kiraciIslemi, sema } from "@akredit/vt";
import { sahteSaglayici, YzHatasi } from "@akredit/yz";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ortam } from "../../../test/yardimci.ts";
import type { ServisBaglami } from "../../baglam.ts";
import * as bologna from "../../bologna/index.ts";
import { ServisHatasi } from "../../hata.ts";
import * as t from "./index.ts";

const y = t.yzOnerisi;
let o: Awaited<ReturnType<typeof ortam>>;
let yonetici: ServisBaglami;
let gozlemci: ServisBaglami;
let programId = "";
const CERCEVE = "mudek-lisans";

function ders(kod: string, ad: string, amac: string): BolognaOkunanDers {
  return {
    kod,
    ad,
    zorunlu: true,
    bos: false,
    kaynak: `https://bologna.ornek.edu.tr/ders/${kod}`,
    yariyil: 1,
    tul: "3+0+0",
    kredi: 3,
    akts: 5,
    bilgiler: { "Dersin Dili": "Türkçe", "Dersin Amacı": amac, "Dersin Koordinatörü": "Dr. Ayşe Yılmaz" },
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
    { kod: "P1", metin: "Matematik bilgisini uygular." },
    { kod: "P2", metin: "Takımda çalışır." },
  ],
  matris: { pkodlar: ["P1", "P2"], dersler: [] },
  tyycIsaret: 5,
  dersler: [
    ders("MAT101", "Matematik I", "Limit ve türev. Sorumlu: Dr. Ayşe Yılmaz"),
    ders("PRJ201", "Proje", "Takım projesi."),
  ],
};

const MODEL_CEVABI = JSON.stringify({
  dersler: [
    {
      dersKod: "MAT101",
      deger: "MTB",
      gerekce: "Limit ve türev işleyen temel matematik dersi.",
      kaynaklar: ["ders:MAT101"],
    },
    // Kaynak uydurulmuş: ayıklanır.
    { dersKod: "PRJ201", deger: "MK", gerekce: "Takım projesi dersi.", kaynaklar: ["web:ornek"] },
  ],
  pcKurul: [
    {
      pcKod: "P1",
      kurulCiktilari: ["3.C1"],
      gerekce: "Program çıktısı matematik bilgisini uygulamayı söyler.",
      kaynaklar: ["pc:P1", "kurul:3.C1"],
    },
  ],
});

beforeAll(async () => {
  o = await ortam();
  programId = o.a.programId;
  yonetici = await o.baglam(o.a, o.a.yonetici);
  gozlemci = await o.baglam(o.a, o.a.gozlemci);
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

describe("eşleme YZ öneri işi", () => {
  it("Bologna verisi yokken öneri istenemez; salt okuma rolü isteyemez", async () => {
    await expect(y.oneriIste(yonetici, { programId, cerceveKod: CERCEVE })).rejects.toBeInstanceOf(ServisHatasi);
    await bologna.okumaKaydet(yonetici, programId, { veri: OKUMA });
    await expect(y.oneriIste(gozlemci, { programId, cerceveKod: CERCEVE })).rejects.toBeInstanceOf(ServisHatasi);
  });

  it("istek işlenir: kurala uyan öneriler gerekçe ve kaynakla yalnız öneri olarak yazılır, tabloya girmez", async () => {
    const { istekId } = await y.oneriIste(yonetici, { programId, cerceveKod: CERCEVE });
    const bekleyen = await y.bekleyenOneriIstekleri(o.db, o.a.kurumId);
    expect(bekleyen.map((x) => x.istekId)).toEqual([istekId]);
    expect((await y.oneriDurumu(yonetici, { programId, cerceveKod: CERCEVE }))?.durum).toBe("bekliyor");

    const s = sahteSaglayici([MODEL_CEVABI]);
    const r = await y.istegiIsle(
      {
        db: o.db,
        simdi: () => new Date("2026-10-31T10:00:00Z"),
        fabrika: async () => ({ saglayici: s, maske: { adlar: ["Ayşe Yılmaz"] } }),
      },
      o.a.kurumId,
      bekleyen[0] as (typeof bekleyen)[number],
    );
    // MAT101 ve P1 önerisi geçer; PRJ201 uydurma kaynak yüzünden ayıklanır.
    expect(r).toEqual({ durum: "tamam", onerilen: 2, reddedilen: 1 });
    // Kişi adı modele gitmez; yalnız amaç ve içerik alanları gider (koordinatör alanı gitmez).
    const giden = (s.istekler[0]?.mesajlar ?? []).map((m) => m.icerik).join("\n");
    expect(giden).not.toContain("Ayşe Yılmaz");
    expect(giden).not.toContain("Koordinatörü");

    const d = await t.programTablolari(yonetici, { programId, cerceveKod: CERCEVE });
    const mat = d.eslemeler.dersler.find((x) => x.anahtar === "MAT101");
    expect(mat?.karar).toBeNull();
    expect(mat?.oneri?.uretici).toBe("yz");
    expect(mat?.oneri?.deger).toBe("MTB");
    expect(mat?.oneri?.gerekce?.kaynaklar).toEqual([
      { tur: "bologna", anahtar: "MAT101", kanitId: d.bologna?.kanitId },
    ]);
    const p1 = d.eslemeler.pcKurul.find((x) => x.anahtar === "P1");
    expect(p1?.oneri?.deger).toEqual(["3.C1"]);
    expect(p1?.oneri?.gerekce?.kaynaklar.map((k) => k.tur)).toEqual(["pc", "kurul"]);
    // Öneri tabloya girmez: Tablo 5.1'de MAT101 kategori hücreleri EKSİK kalır.
    const t51 = d.tablolar.find((x) => x.tanimKod === "mudek-lisans.5.1");
    const satir = t51?.satirlar.find(
      (x) => x.tur === "veri" && x.hucreler[0]?.tur === "deger" && x.hucreler[0].metin === "MAT101",
    );
    expect(satir && satir.tur !== "ara" ? satir.hucreler.slice(3).map((h) => h.tur) : []).toEqual([
      "eksik",
      "eksik",
      "eksik",
      "eksik",
    ]);

    // Kayıtlar öneri durumunda, karar veren boş.
    const kayitlar = await kiraciIslemi(o.db, o.a.kurumId, (tx) =>
      tx.select().from(sema.programEsleme).where(eq(sema.programEsleme.programId, programId)),
    );
    expect(kayitlar.every((k) => k.durum === "oneri" && k.uretici === "yz" && k.kararVerenKisiId === null)).toBe(true);

    // İstek bir kez işlenir.
    expect(await y.bekleyenOneriIstekleri(o.db, o.a.kurumId)).toEqual([]);
    const son = await y.oneriDurumu(yonetici, { programId, cerceveKod: CERCEVE });
    expect(son).toMatchObject({ durum: "tamam", onerilen: 2, reddedilen: 1 });
  });

  it("anahtar ya da izin yoksa istek 'olmadı' diye kapanır, öneri yazılmaz", async () => {
    await y.oneriIste(yonetici, { programId, cerceveKod: CERCEVE });
    const [istek] = await y.bekleyenOneriIstekleri(o.db, o.a.kurumId);
    const r = await y.istegiIsle(
      {
        db: o.db,
        simdi: () => new Date("2026-10-31T11:00:00Z"),
        fabrika: async () => {
          throw new YzHatasi("politika", "izin yok");
        },
      },
      o.a.kurumId,
      istek as NonNullable<typeof istek>,
    );
    expect(r.durum).toBe("olmadi");
    const son = await y.oneriDurumu(yonetici, { programId, cerceveKod: CERCEVE });
    expect(son?.ileti).toMatch(/izin vermiyor/u);
  });

  it("öneri gerekçesi başka okumanın kanıtına bağlanamaz", async () => {
    await expect(
      t.eslemeOner(yonetici, {
        programId,
        cerceveKod: CERCEVE,
        tur: "ders_kategorisi",
        anahtar: "PRJ201",
        deger: "MK",
        uretici: "kisi",
        gerekce: {
          metin: "Takım projesi dersi.",
          kaynaklar: [{ tur: "bologna", anahtar: "PRJ201", kanitId: "00000000-0000-4000-8000-000000000000" }],
        },
      }),
    ).rejects.toBeInstanceOf(ServisHatasi);
  });
});
