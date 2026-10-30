// Değerlendirici portalında rapor okuyucusu (İP-44): salt okunur, erişim günlükte, kapsam dışı kanıt gösterilmez.
// PGlite, ağsız; bütün adlar ve metinler uydurmadır.

import { aktorYukle, rapor as raporServisi, type ServisBaglami } from "@akredit/servis";
import { sema } from "@akredit/vt";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type TestOrtami, testOrtami } from "../../../../kimlik/test-yardimci.ts";
import { erisimGunlugu, portalBaglami } from "../../_portal/portal.ts";
import * as portal from "./portal-raporu.ts";

const SIMDI = new Date("2026-10-27T09:00:00Z");
const GUN = 24 * 60 * 60 * 1000;
const OZET_A = `ab12cd34${"0".repeat(56)}`;
const OZET_GIZLI = `ef56ab78${"0".repeat(56)}`;

let o: TestOrtami;
const ids = { degerlendirici: "", kanitA: "", kanitGizli: "", rapor: "", raporKurum: "" };

async function kiraci<T>(
  kurumId: string,
  is: (tx: Parameters<Parameters<TestOrtami["db"]["transaction"]>[0]>[0]) => Promise<T>,
) {
  return o.db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.kurum_id', ${kurumId}, true)`);
    return is(tx);
  });
}

async function baglam(kisiId: string): Promise<ServisBaglami> {
  return { db: o.db, aktor: await aktorYukle(o.db, o.a.kurumId, kisiId), simdi: () => SIMDI };
}

beforeAll(async () => {
  o = await testOrtami();
  await kiraci(o.a.kurumId, async (tx) => {
    const [d] = await tx
      .insert(sema.kisi)
      .values({ kurumId: o.a.kurumId, adSoyad: "Deneme Değerlendirici", eposta: "rapor-degerlendirici@ornek.test" })
      .returning();
    ids.degerlendirici = d?.id as string;
    await tx.insert(sema.rolAtamasi).values({
      kurumId: o.a.kurumId,
      kisiId: ids.degerlendirici,
      rol: "degerlendirici",
      kapsamTuru: "program",
      kapsamId: o.a.programId,
      baslangic: new Date(SIMDI.getTime() - GUN),
      bitis: new Date(SIMDI.getTime() + 30 * GUN),
    });
    const kanitEkle = async (ozet: string, kapsamlar: { tur: string; id: string }[]) => {
      const [k] = await tx
        .insert(sema.kanit)
        .values({
          kurumId: o.a.kurumId,
          ozet,
          dosyaAdi: `${ozet.slice(0, 8)}.pdf`,
          mime: "application/pdf",
          boyut: 10,
          depoAnahtari: `${o.a.kurumId}/${ozet}`,
          kaynakTuru: "yukleme",
          kapsamlar,
        })
        .returning();
      for (const s of [1, 2])
        await tx
          .insert(sema.kanitParcasi)
          .values({
            kurumId: o.a.kurumId,
            kanitId: k?.id as string,
            sira: s - 1,
            capa: { sayfa: s },
            metin: `Sayfa ${s}`,
          });
      return k?.id as string;
    };
    ids.kanitA = await kanitEkle(OZET_A, [{ tur: "program", id: o.a.programId }]);
    ids.kanitGizli = await kanitEkle(OZET_GIZLI, []);
    const [r] = await tx
      .insert(sema.rapor)
      .values({ kurumId: o.a.kurumId, tur: "odr", kapsam: { tur: "program", id: o.a.programId }, baslik: "Deneme ÖDR" })
      .returning();
    ids.rapor = r?.id as string;
    await tx.insert(sema.raporBolumuSurumu).values({
      kurumId: o.a.kurumId,
      raporId: ids.rapor,
      bolumKodu: "P.1",
      metin: "Kurul toplandı [K:ab12cd34 s. 2]. Program en iyi programdır.\n\nBütçe ayrıldı [K:ef56ab78 s. 1].",
    });
    const [rk] = await tx
      .insert(sema.rapor)
      .values({ kurumId: o.a.kurumId, tur: "kidr", kapsam: { tur: "kurum", id: o.a.kurumId }, baslik: "Kurum raporu" })
      .returning();
    ids.raporKurum = rk?.id as string;
  });
});
afterAll(async () => o?.kapat());

describe("değerlendirici rapor okuyucusu", () => {
  it("yalnız kapsamdaki raporu listeler ve listelemeyi günlüğe yazar", async () => {
    const p = await portalBaglami(await baglam(ids.degerlendirici));
    expect((await portal.portalRaporlari(p)).map((r) => r.id)).toEqual([ids.rapor]);
  });

  it("kapsamdaki kanıt panele yüklenir ve vurgulanır; kapsam dışı kanıt yalnız yetki yok olarak görünür", async () => {
    const p = await portalBaglami(await baglam(ids.degerlendirici));
    const { veri } = await portal.portalRaporu(p, ids.rapor);
    expect(veri.kanitlar.map((k) => k.id)).toEqual([ids.kanitA]);
    expect(veri.erisilemeyen).toEqual([ids.kanitGizli]);
    const cumleler = veri.bolumler[0]?.paragraflar.flat() ?? [];
    expect(cumleler[0]?.atiflar[0]?.vurgu).toEqual([{ parcaId: expect.any(String), satirlar: [] }]);
    expect(cumleler[1]?.eksik).toBe(true);
    // Kurum içi dil bulguları portalda gösterilmez.
    expect(veri.dil).toEqual([]);
    expect(cumleler.every((c) => c.dilBulgulari.length === 0)).toBe(true);
  });

  it("kapsam dışı rapor açılmaz", async () => {
    const p = await portalBaglami(await baglam(ids.degerlendirici));
    await expect(portal.portalRaporu(p, ids.raporKurum)).rejects.toMatchObject({ kod: "yetki_yok" });
  });

  it("salt okunur: değerlendirici dil bulgusu öneri olarak ekleyemez, öneri tablosu değişmez", async () => {
    const p = await portalBaglami(await baglam(ids.degerlendirici));
    const once = await kiraci(o.a.kurumId, (tx) => tx.select().from(sema.oneri));
    await expect(raporServisi.dilBulgulariniKaydet(p, ids.rapor)).rejects.toMatchObject({ kod: "yetki_yok" });
    const sonra = await kiraci(o.a.kurumId, (tx) => tx.select().from(sema.oneri));
    expect(sonra).toHaveLength(once.length);
    expect(Object.keys(portal).sort()).toEqual(["RAPOR_EYLEMI", "portalRaporlari", "portalRaporu"]);
  });

  it("rapor görüntüleme kurumun erişim günlüğünde, yüklenen kanıtlarla", async () => {
    const kayitlar = await erisimGunlugu(await baglam(o.a.yoneticiKisiId));
    const rapor = kayitlar.filter((k) => k.eylem === portal.RAPOR_EYLEMI.raporGoruntulendi);
    expect(rapor.length).toBeGreaterThanOrEqual(1);
    expect(rapor[0]?.kisiAdi).toBe("Deneme Değerlendirici");
    expect(JSON.stringify(rapor[0]?.ayrinti)).toContain(ids.kanitA);
    expect(kayitlar.some((k) => k.eylem === portal.RAPOR_EYLEMI.listeGoruntulendi)).toBe(true);
  });
});
