// Yetki devri işçisi: politika turu, özet e-postası (bellek taşıyıcı) ve İP-21 gösterge önerilerinin kuyruğa
// yazılması. PGlite, gerçek tetikleyiciler. Bütün adlar ve adresler uydurmadır.

import type { KurumId } from "@akredit/cekirdek";
import { type EylemAlicisi, gostergeleriDenetle, gostergeTanimiOku, type VeriNoktasi } from "@akredit/gosterge";
import { aktorYukle, politika } from "@akredit/servis";
import { bellekTasiyici } from "@akredit/surec";
import { gocleriUygula, kiraciIslemi, pgliteBaglantisi, sema, type Vt } from "@akredit/vt";
import { eq, sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { politikaIscisi } from "./index.ts";

const KURUM = "01900000-0000-7000-8000-0000000000d1";
const YONETICI = "01900000-0000-7000-8000-0000000000e1";
const HOCA = "01900000-0000-7000-8000-0000000000e2";
const SIMDI = new Date("2026-10-26T06:00:00Z"); // pazartesi
const GIZLI = "deneme-gizli-anahtar-en-az-otuz-iki-bayt-uzunlugunda";

let kapat: (() => Promise<void>) | null = null;
afterEach(async () => {
  await kapat?.();
  kapat = null;
});

async function kur(ayarlar: object = {}) {
  const bag = await pgliteBaglantisi();
  kapat = async () => {
    await bag.kapat();
  };
  const db: Vt = bag.db;
  await gocleriUygula(db);
  const ders = await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.kurum_id', ${KURUM}, true)`);
    await tx.insert(sema.kurum).values({ id: KURUM, ad: "Uydurma Üniversitesi", ayarlar });
    const [b] = await tx.insert(sema.birim).values({ kurumId: KURUM, tur: "myo", ad: "Uydurma MYO" }).returning();
    const [p] = await tx
      .insert(sema.program)
      .values({ kurumId: KURUM, birimId: b?.id as string, ad: "Uydurma Programı", duzey: "onlisans" })
      .returning();
    const [d] = await tx
      .insert(sema.ders)
      .values({ kurumId: KURUM, programId: p?.id as string, kod: "UY101", ad: "Uydurma", akts: 5, yariyil: 1 })
      .returning();
    await tx.insert(sema.kisi).values([
      { id: YONETICI, kurumId: KURUM, adSoyad: "Zeynep Deneme", eposta: "zeynep@uydurma.edu.tr" },
      { id: HOCA, kurumId: KURUM, adSoyad: "Ayşe Uydurma", eposta: "ayse@uydurma.edu.tr" },
    ]);
    const bas = new Date("2026-01-01T00:00:00Z");
    await tx.insert(sema.rolAtamasi).values([
      {
        kurumId: KURUM,
        kisiId: YONETICI,
        rol: "kurum_yoneticisi",
        kapsamTuru: "kurum",
        kapsamId: KURUM,
        baslangic: bas,
      },
      {
        kurumId: KURUM,
        kisiId: HOCA,
        rol: "ogretim_elemani",
        kapsamTuru: "ders",
        kapsamId: d?.id as string,
        baslangic: bas,
      },
    ]);
    return d?.id as string;
  });
  const oneri = (tur: "kanit_etiketi" | "matris_katkisi" | "olgunluk_duzeyi", risk: "dusuk" | "orta" | "yuksek") =>
    kiraciIslemi(db, KURUM, async (tx) => {
      const [s] = await tx
        .insert(sema.oneri)
        .values({
          kurumId: KURUM,
          tur,
          hedefTuru: "ders",
          hedefId: ders,
          icerik: { baslik: `Uydurma ${tur}`, metin: "." },
          gerekce: "Deneme.",
          guven: 0.9,
          ureticiTuru: "kural",
          uretici: { kural: "deneme", surum: "1" },
          risk,
        })
        .returning();
      return s?.id as string;
    });
  const karar = (id: string) =>
    kiraciIslemi(db, KURUM, async (tx) => (await tx.select().from(sema.karar).where(eq(sema.karar.oneriId, id)))[0]);
  return { db, ders, oneri, karar };
}

async function imzala(db: Vt, oneriTurleri: string[], enYuksekRisk: "dusuk" | "orta") {
  const b = { db, aktor: await aktorYukle(db, KURUM, YONETICI), simdi: () => SIMDI };
  const t = await politika.politikaTaslagiOlustur(b, {
    ad: "Deneme politikası",
    oneriTurleri,
    enYuksekRisk,
    enDusukGuven: 0.8,
  });
  await politika.politikaImzala(b, t.id, { imzalayanAd: "Zeynep Deneme" });
}

describe("politika işçisi", { timeout: 120_000 }, () => {
  it("turda kapsamdaki öneriler karara bağlanır, yüksek risk insan bekler", async () => {
    const o = await kur();
    const dusuk = await o.oneri("kanit_etiketi", "dusuk");
    const yuksek = await o.oneri("olgunluk_duzeyi", "yuksek");
    await imzala(o.db, ["kanit_etiketi"], "dusuk");
    const isci = politikaIscisi({ db: o.db, kurumlar: async () => [KURUM], saat: () => SIMDI });
    expect(await isci.tur()).toEqual({ otomatikKarar: 1, gonderilenOzet: 0 });
    expect(await o.karar(dusuk)).toMatchObject({ dayanak: "politika", kararVerenKisiId: YONETICI });
    expect(await o.karar(yuksek)).toBeUndefined();
  });

  it("özet: karar yetkisi olan herkese bir kez; kapalıysa hiç", async () => {
    const o = await kur({ onay: { ozet: "haftalik" } });
    await o.oneri("matris_katkisi", "orta");
    await o.oneri("olgunluk_duzeyi", "yuksek");
    const tasiyici = bellekTasiyici();
    const isci = politikaIscisi({
      db: o.db,
      kurumlar: async () => [KURUM],
      saat: () => SIMDI,
      eposta: { tasiyici, gizli: GIZLI, temelAdres: "https://ornek.akredit.test" },
    });
    expect((await isci.tur({ ozet: true })).gonderilenOzet).toBe(2);
    expect(tasiyici.kutu.map((i) => i.alici).sort()).toEqual(["ayse@uydurma.edu.tr", "zeynep@uydurma.edu.tr"]);
    expect(tasiyici.kutu[0]?.konu).toMatch(/^Haftalık onay özeti: 2 öneri bekliyor$/u);
    expect((await isci.tur({ ozet: true })).gonderilenOzet).toBe(0); // aynı gün ikinci kez yok
  });

  it("haftalık özet pazartesi dışında, kapalı özet hiç gönderilmez", async () => {
    const o = await kur({ onay: { ozet: "kapali" } });
    await o.oneri("matris_katkisi", "orta");
    const tasiyici = bellekTasiyici();
    const ayar = {
      db: o.db,
      kurumlar: async () => [KURUM],
      eposta: { tasiyici, gizli: GIZLI, temelAdres: "https://x.test" },
    };
    expect((await politikaIscisi({ ...ayar, saat: () => SIMDI }).tur({ ozet: true })).gonderilenOzet).toBe(0);
    await kiraciIslemi(o.db, KURUM, (tx) =>
      tx
        .update(sema.kurum)
        .set({ ayarlar: { onay: { ozet: "haftalik" } } })
        .where(eq(sema.kurum.id, KURUM)),
    );
    const sali = new Date("2026-10-27T06:00:00Z");
    expect((await politikaIscisi({ ...ayar, saat: () => sali }).tur({ ozet: true })).gonderilenOzet).toBe(0);
  });

  it("İP-21 gösterge sapması öneri tablosuna yazılır ve onay kutusunda bekler", async () => {
    const o = await kur();
    const isci = politikaIscisi({ db: o.db, kurumlar: async () => [KURUM], saat: () => SIMDI });
    const alici = isci.eylemAlicisi(KURUM);
    // Tür denetimi: alıcı İP-21 arayüzünü karşılar.
    const arayuz: EylemAlicisi = alici;
    const tanim = gostergeTanimiOku({
      kod: "PG-9",
      ad: "Uydurma doluluk",
      birim: "%",
      plan: "stratejik_plan",
      yontem: { tur: "oran", pay: "yerlesen", payda: "kontenjan", carpan: 100 },
      kaynaklar: ["elle"],
      donemTuru: "yil",
      yon: "artan",
      hedefler: [{ donem: "2026", deger: 100 }],
    });
    const kaynak = { tur: "elle", kisiId: "p1", kanitId: "k-elle", zaman: "2026-09-02T00:00:00Z" } as const;
    // 2026: 72/80×100 = 90; hedef 100 → sapma, bir eylem önerisi.
    const veri: VeriNoktasi[] = [
      { anahtar: "kontenjan", donem: "2026", deger: 80, kaynak },
      { anahtar: "yerlesen", donem: "2026", deger: 72, kaynak },
    ];
    let n = 0;
    const s = await gostergeleriDenetle(
      [tanim],
      veri,
      "2026",
      { kurumId: KURUM as KurumId, simdi: SIMDI.toISOString(), oneriId: () => `g-${++n}` },
      arayuz,
    );
    expect(s.oneriler).toHaveLength(1);
    expect(alici.yazilan).toHaveLength(1);
    const [satir] = await kiraciIslemi(o.db, KURUM, (tx) =>
      tx
        .select()
        .from(sema.oneri)
        .where(eq(sema.oneri.id, alici.yazilan[0]?.oneriId as string)),
    );
    expect(satir).toMatchObject({ tur: "eylem", risk: "orta", ureticiTuru: "kural" });
    expect(satir?.icerik).toMatchObject({ gostergeKod: "PG-9", deger: 90, hedef: 100 });
    expect(await o.karar(satir?.id as string)).toBeUndefined();
  });
});
