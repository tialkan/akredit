// PÜKÖ'nün kalıcı deposu ve REST uçları (İP-39): PGlite, ağ yok. Ders kodları ve ölçümler uydurmadır.

import { kiraciIslemi, sema } from "@akredit/vt";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Aktor } from "../src/baglam.ts";
import { apiIsleyici } from "../src/http/isleyici.ts";
import { puko } from "../src/index.ts";
import { type Ornek, ortam, SIMDI } from "./yardimci.ts";

let o: Awaited<ReturnType<typeof ortam>>;
const BAHAR = "2025-2026 Bahar";
const GUZ = "2026-2027 Güz";

const olc = (dersKodu: string, deger: number | null, donem = BAHAR) => ({
  olcumTuru: "pc" as const,
  kod: "PÇ3",
  dersKodu,
  donem,
  deger,
  esik: 60,
  kaynak: { hesapSurumu: "olcme-1.0.0" },
});
const ILK = [olc("BP101", 40), olc("BP102", 55), olc("BP104", 75)];

beforeAll(async () => {
  o = await ortam();
  await kiraciIslemi(o.db, o.a.kurumId, (tx) =>
    tx.insert(sema.donem).values({ kurumId: o.a.kurumId, ad: GUZ, baslangic: "2026-09-21", bitis: "2027-01-15" }),
  );
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
    const r = await isle(istek("POST", "/puko/olcumler", { olcumler: ILK, kanitId: o.a.kanitKurum }), y);
    expect(r.status, await r.clone().text()).toBe(200);
    expect(await r.json()).toEqual({ otomatik: 1, acilan: 1, kapanan: 0 });
    const tekrar = await isle(istek("POST", "/puko/olcumler", { olcumler: ILK, kanitId: o.a.kanitKurum }), y);
    expect(await tekrar.json()).toMatchObject({ acilan: 0 });
    // Kanıtı olmayan ölçüm işlenmez.
    const yok = await isle(
      istek("POST", "/puko/olcumler", { olcumler: ILK, kanitId: "01900000-0000-7000-8000-0000000000ee" }),
      y,
    );
    expect(yok.status).toBe(404);
  });

  it("panel: açık kart, hedef dönem önerisi ve otomatik kayıt sayısı; B kurumu görmez", async () => {
    const p = await puko.pukoPaneli(await o.baglam(o.a, o.a.yonetici));
    expect(p.kartlar).toHaveLength(1);
    const kart = p.kartlar[0] as (typeof p.kartlar)[number];
    expect(kart.kume.olcumler.map((x) => x.dersKodu)).toEqual(["BP101", "BP102"]);
    expect(kart.hedefDonem).toBe(GUZ);
    expect(p.otomatikSayisi).toBeGreaterThanOrEqual(1);
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

  it("önlem oturumdaki kişinin adıyla yalnız eklenen olay olarak yazılır; ikinci karar çakışma", async () => {
    const isle = apiIsleyici({ db: o.db, simdi: () => SIMDI });
    const y = await aktor(o.a, o.a.yonetici);
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

  it("sonraki dönem ölçümü döngüyü kapatır; iyileşmeyen ders yeni karta girer", async () => {
    const b = await o.baglam(o.a, o.a.yonetici);
    const r = await puko.pukoOlcumleriIsle(b, {
      olcumler: [olc("BP101", 70, GUZ), olc("BP102", 50, GUZ)],
      kanitId: o.a.kanitKurum,
    });
    expect(r).toMatchObject({ kapanan: 1, acilan: 1 });
    const p = await puko.pukoPaneli(b);
    expect(p.kartlar).toHaveLength(1);
    expect(p.kartlar[0]?.oncekiPukoId).toBeTruthy();
  });
});
