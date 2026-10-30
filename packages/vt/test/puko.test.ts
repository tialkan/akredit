// PÜKÖ olay deposu (İP-39, 0102 göçü): yalnız ekleme, kiracı yalıtımı, karar veren kişi kuralları.
// Kimlikler uydurmadır.

import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { kiraciIslemi } from "../src/baglanti.ts";
import * as s from "../src/sema/index.ts";
import {
  gocluVt,
  hataKodu,
  hataMetni,
  KURUM_A,
  KURUM_B,
  kurumVerisiEkle,
  type OrnekKimlikler,
  reddedilir,
} from "./yardimci.ts";

let b: Awaited<ReturnType<typeof gocluVt>>;
let a: OrnekKimlikler;
let bk: OrnekKimlikler;

const zaman = new Date("2026-06-01T09:00:00Z");
const olay = (kurumId: string, pukoId: string, tur: string, kararVeren?: string) => ({
  kurumId,
  pukoId,
  tur,
  olay: { tur, pukoId, ...(kararVeren ? { kararVeren } : {}) },
  kararVerenKisiId: kararVeren ?? null,
  zaman,
});
const ekle = (kurumId: string, v: ReturnType<typeof olay>) =>
  kiraciIslemi(b.db, kurumId, (tx) => tx.insert(s.pukoOlayi).values(v));

beforeAll(async () => {
  b = await gocluVt();
  a = await kurumVerisiEkle(b.db, KURUM_A, "A");
  bk = await kurumVerisiEkle(b.db, KURUM_B, "B");
});
afterAll(async () => {
  await b.kapat();
});

describe("puko_olayi", () => {
  it("açılış, önlem ve kapanış sırayla eklenir; aynı türde ikinci olay reddedilir", async () => {
    await ekle(KURUM_A, olay(KURUM_A, "p1", "acildi"));
    await ekle(KURUM_A, olay(KURUM_A, "p1", "onlem_secildi", a.kisi));
    await ekle(KURUM_A, olay(KURUM_A, "p1", "kapandi"));
    const e = await reddedilir(() => ekle(KURUM_A, olay(KURUM_A, "p1", "onlem_secildi", a.kisi)));
    expect(hataKodu(e)).toBe("23505");
    const r = await kiraciIslemi(b.db, KURUM_A, (tx) =>
      tx.select().from(s.pukoOlayi).where(eq(s.pukoOlayi.pukoId, "p1")).orderBy(s.pukoOlayi.sira),
    );
    expect(r.map((x) => x.tur)).toEqual(["acildi", "onlem_secildi", "kapandi"]);
  });

  it("değiştirilemez ve silinemez", async () => {
    for (const ifade of ["update puko_olayi set puko_id = 'x'", "delete from puko_olayi"]) {
      const e = await reddedilir(() => kiraciIslemi(b.db, KURUM_A, (tx) => tx.execute(sql.raw(ifade))));
      expect(["42501", "23000"]).toContain(hataKodu(e));
    }
    const e = await reddedilir(() => b.db.execute(sql`delete from puko_olayi`));
    expect(hataMetni(e)).toMatch(/değiştirilemez/u);
  });

  it("önlemde karar veren zorunlu, içerikle aynı, aynı kurumdan; öteki olaylarda boş", async () => {
    await ekle(KURUM_A, olay(KURUM_A, "p2", "acildi"));
    const kisisiz = { ...olay(KURUM_A, "p2", "onlem_secildi"), kararVerenKisiId: null };
    expect(hataKodu(await reddedilir(() => ekle(KURUM_A, kisisiz)))).toBe("23514");
    const farkli = {
      ...olay(KURUM_A, "p2", "onlem_secildi", a.kisi),
      olay: { tur: "onlem_secildi", pukoId: "p2", kararVeren: "baskasi" },
    };
    expect(hataKodu(await reddedilir(() => ekle(KURUM_A, farkli)))).toBe("23514");
    const e = await reddedilir(() => ekle(KURUM_A, olay(KURUM_A, "p2", "onlem_secildi", bk.kisi)));
    expect(hataMetni(e)).toMatch(/bu kurumda değil/u);
    const acilistaKisi = { ...olay(KURUM_A, "p3", "acildi"), kararVerenKisiId: a.kisi };
    expect(hataKodu(await reddedilir(() => ekle(KURUM_A, acilistaKisi)))).toBe("23514");
  });

  it("açılmamış döngüye önlem, önlemsiz döngüye kapanış yazılamaz", async () => {
    expect(hataMetni(await reddedilir(() => ekle(KURUM_A, olay(KURUM_A, "yok", "onlem_secildi", a.kisi))))).toMatch(
      /Açılmamış/u,
    );
    await ekle(KURUM_A, olay(KURUM_A, "p4", "acildi"));
    expect(hataMetni(await reddedilir(() => ekle(KURUM_A, olay(KURUM_A, "p4", "kapandi"))))).toMatch(
      /Önlemi seçilmemiş/u,
    );
  });

  it("kiracı yalıtımı: B kurumu A'nın olaylarını görmez ve A adına yazamaz", async () => {
    const r = await kiraciIslemi(b.db, KURUM_B, (tx) => tx.select().from(s.pukoOlayi));
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((x) => x.kurumId === KURUM_B)).toBe(true);
    const e = await reddedilir(() => ekle(KURUM_B, olay(KURUM_A, "p5", "acildi")));
    expect(hataKodu(e)).toBe("42501");
  });
});
