// İP-44: rapor dil denetimi önerileri, yayım uyarısı ve kanıt paneli (PGlite, ağsız, model ya da sağlayıcı yok).

import { kiraciIslemi, sema } from "@akredit/vt";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type Ornek, ortam } from "../test/yardimci.ts";
import { kararVer } from "./oneri.ts";
import * as rapor from "./rapor.ts";

let o: Awaited<ReturnType<typeof ortam>>;
let a: Ornek;
let raporId = "";
let ozetDers = "";

beforeAll(async () => {
  o = await ortam();
  a = o.a;
  await kiraciIslemi(o.db, a.kurumId, async (tx) => {
    const [k] = await tx.select().from(sema.kanit).where(eq(sema.kanit.id, a.kanitDers));
    ozetDers = k?.ozet ?? "";
    const [r] = await tx
      .insert(sema.rapor)
      .values({ kurumId: a.kurumId, tur: "bidr", kapsam: { tur: "birim", id: a.birimId }, baslik: "Dil denemesi" })
      .returning();
    raporId = r?.id ?? "";
    // Paragraf 1: atıflı, yazıyla sayı (orta). Paragraf 2: atıfsız üstünlük (yüksek) ve öznesiz eylem (düşük).
    // Paragraf 3: hesap atıflı; kanıtlı sayılır.
    await tx.insert(sema.raporBolumuSurumu).values({
      kurumId: a.kurumId,
      raporId: raporId,
      bolumKodu: "B.1",
      metin: `Kurul beş toplantı yaptı [K:${ozetDers.slice(0, 8)} s. 1].\n\nProgram en iyi programdır. Anket yapılmıştır.\n\nPÇ1 düzeyi 62,5 [H:0a1b2c3d].`,
    });
    // Kanıtın ölçüt bağı onayı (panelde onay bilgisi olarak görünür).
    const [e] = await tx
      .insert(sema.oneri)
      .values({
        kurumId: a.kurumId,
        tur: "kanit_etiketi",
        hedefTuru: "kanit",
        hedefId: a.kanitDers,
        icerik: { baslik: "Ölçüt bağı", metin: "B.1", olcutKodlari: ["B.1"] },
        gerekce: "Kurgu.",
        ureticiTuru: "kural",
        uretici: { kural: "deneme", surum: "1" },
        risk: "dusuk",
      })
      .returning({ id: sema.oneri.id });
    Object.assign(a, { etiket: e?.id });
  });
  const y = await o.baglam(a, a.yonetici);
  await kararVer(y, { oneriId: (a as unknown as { etiket: string }).etiket, sonuc: "onaylandi" });
});
afterAll(async () => o?.kapat());

describe("rapor görünümü", () => {
  it("hesap atıflı paragraf EKSİK sayılmaz; atıfsız paragraf EKSİK", async () => {
    const r = await rapor.rapor(await o.baglam(a, a.yonetici), raporId);
    expect(r.bolumler[0]?.paragraflar.map((p) => p.eksik)).toEqual([false, true, false]);
    expect(rapor.atifliKanitlar(r)).toEqual([a.kanitDers]);
  });
});

describe("dil denetimi", () => {
  it("bulguları önem ve konumla verir, açık yüksek bulgu yayım uyarısı doğurur", async () => {
    const d = await rapor.dilDenetimi(await o.baglam(a, a.gozlemci), raporId);
    expect(d.bulgular.map((b) => [b.kural, b.onem, b.paragraf, b.cumle, b.oneriId])).toEqual([
      ["yaziyla-sayi", "orta", 1, 1, null],
      ["ustunluk", "yuksek", 2, 1, null],
      ["oznesiz-eylem", "dusuk", 2, 2, null],
    ]);
    expect(d.acikYuksek).toBe(1);
    expect(d.yayimUyarisi).toContain("1 yüksek önemli");
  });

  it("bulgular rapor kaydına bir kez öneri olarak eklenir, metin değişmez, günlüğe yazılır", async () => {
    const y = await o.baglam(a, a.yonetici);
    const ilk = await rapor.dilBulgulariniKaydet(y, raporId);
    expect(ilk.eklenen).toBe(3);
    expect(ilk.bulgular.every((b) => b.oneriId !== null && b.acik)).toBe(true);
    const ikinci = await rapor.dilBulgulariniKaydet(y, raporId);
    expect(ikinci.eklenen).toBe(0);
    await kiraciIslemi(o.db, a.kurumId, async (tx) => {
      const oneriler = await tx
        .select()
        .from(sema.oneri)
        .where(and(eq(sema.oneri.tur, "rapor_bolumu"), eq(sema.oneri.hedefTuru, "rapor_bolumu_surumu")));
      // Tür yüksek risklidir (politikayla kapanmaz); bulgunun önemi içerikte.
      expect(oneriler.map((x) => [x.risk, x.ureticiTuru, (x.icerik as { onem: string }).onem])).toEqual([
        ["yuksek", "kural", "orta"],
        ["yuksek", "kural", "yuksek"],
        ["yuksek", "kural", "dusuk"],
      ]);
      const [s] = await tx.select().from(sema.raporBolumuSurumu).where(eq(sema.raporBolumuSurumu.raporId, raporId));
      expect(s?.metin).toContain("beş toplantı");
      const g = await tx.select().from(sema.gunluk).where(eq(sema.gunluk.eylem, "rapor.dil_denetimi"));
      expect(g).toHaveLength(2);
    });
  });

  it("yüksek bulgu kararla kapanınca yayım uyarısı kalkar", async () => {
    const y = await o.baglam(a, a.yonetici);
    const d = await rapor.dilDenetimi(y, raporId);
    const yuksek = d.bulgular.find((b) => b.onem === "yuksek");
    await kararVer(y, { oneriId: yuksek?.oneriId as string, sonuc: "reddedildi", gerekce: "Kurgu: ifade alıntıdır." });
    const son = await rapor.dilDenetimi(y, raporId);
    expect(son.acikYuksek).toBe(0);
    expect(son.yayimUyarisi).toBeNull();
  });

  it("gözlemci öneri ekleyemez; başka kurum raporu bulunamaz", async () => {
    await expect(rapor.dilBulgulariniKaydet(await o.baglam(a, a.gozlemci), raporId)).rejects.toMatchObject({
      kod: "yetki_yok",
    });
    await expect(rapor.dilDenetimi(await o.baglam(o.b, o.b.yonetici), raporId)).rejects.toMatchObject({
      kod: "bulunamadi",
    });
  });
});

describe("kanıt paneli", () => {
  it("kanıtı parçaları, SHA-256 özeti ve onay bilgisiyle verir; erişilemeyeni ayırır", async () => {
    const p = await rapor.kanitPaneli(await o.baglam(a, a.yonetici), [a.kanitDers, a.kanitDers, o.b.kanitDers]);
    expect(p.erisilemeyen).toEqual([o.b.kanitDers]);
    expect(p.kanitlar).toHaveLength(1);
    expect(p.kanitlar[0]?.ozet).toBe(ozetDers);
    expect(p.kanitlar[0]?.onay).toMatchObject({ sonuc: "onaylandi", dayanak: "dogrudan" });
    expect(p.kanitlar[0]?.onay?.kisi).toBeTruthy();
  });
});
