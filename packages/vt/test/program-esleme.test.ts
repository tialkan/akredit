// Program tablo eşlemeleri (İP-47, 0130 göçü): yalnız ekleme, kiracı yalıtımı, karar kuralları.
// Kimlikler, kodlar ve dayanaklar uydurmadır.

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
let programA = "";
let programB = "";

const zaman = new Date("2026-10-30T09:00:00Z");
type Kayit = typeof s.programEsleme.$inferInsert;
const karar = (kurumId: string, programId: string, kisi: string, ek: Partial<Kayit> = {}): Kayit => ({
  kurumId,
  programId,
  cerceveKod: "mudek-lisans",
  tur: "ders_kategorisi",
  anahtar: "FIZ101",
  deger: "MTB",
  durum: "karar",
  uretici: "kisi",
  kararVerenKisiId: kisi,
  dayanak: "Bölüm kurulu kararı 2026/1",
  zaman,
  ...ek,
});
const ekle = (kurumId: string, v: Kayit) => kiraciIslemi(b.db, kurumId, (tx) => tx.insert(s.programEsleme).values(v));

beforeAll(async () => {
  b = await gocluVt();
  a = await kurumVerisiEkle(b.db, KURUM_A, "A");
  bk = await kurumVerisiEkle(b.db, KURUM_B, "B");
  const ilkProgram = async (k: string) =>
    (await kiraciIslemi(b.db, k, (tx) => tx.select({ id: s.program.id }).from(s.program).limit(1)))[0]?.id ?? "";
  programA = await ilkProgram(KURUM_A);
  programB = await ilkProgram(KURUM_B);
});
afterAll(async () => {
  await b.kapat();
});

describe("program_esleme", () => {
  it("karar ve öneri eklenir; aynı anahtara yeni karar eklenebilir (düzeltme)", async () => {
    await ekle(KURUM_A, karar(KURUM_A, programA, a.kisi));
    await ekle(KURUM_A, karar(KURUM_A, programA, a.kisi, { deger: "MK" }));
    await ekle(
      KURUM_A,
      karar(KURUM_A, programA, a.kisi, { durum: "oneri", uretici: "yz", kararVerenKisiId: null, dayanak: null }),
    );
    const r = await kiraciIslemi(b.db, KURUM_A, (tx) =>
      tx.select().from(s.programEsleme).where(eq(s.programEsleme.anahtar, "FIZ101")).orderBy(s.programEsleme.sira),
    );
    expect(r.map((x) => [x.durum, x.deger])).toEqual([
      ["karar", "MTB"],
      ["karar", "MK"],
      ["oneri", "MTB"],
    ]);
  });

  it("değiştirilemez ve silinemez", async () => {
    for (const ifade of ["update program_esleme set anahtar = 'x'", "delete from program_esleme"]) {
      const e = await reddedilir(() => kiraciIslemi(b.db, KURUM_A, (tx) => tx.execute(sql.raw(ifade))));
      expect(["42501", "23000"]).toContain(hataKodu(e));
    }
    const e = await reddedilir(() => b.db.execute(sql`delete from program_esleme`));
    expect(hataMetni(e)).toMatch(/değiştirilemez/u);
  });

  it("kararda karar veren ve dayanak zorunlu; YZ karar veremez; öneride karar veren boş", async () => {
    const kisisiz = karar(KURUM_A, programA, a.kisi, { kararVerenKisiId: null });
    expect(hataKodu(await reddedilir(() => ekle(KURUM_A, kisisiz)))).toBe("23514");
    const dayanaksiz = karar(KURUM_A, programA, a.kisi, { dayanak: "  " });
    expect(hataKodu(await reddedilir(() => ekle(KURUM_A, dayanaksiz)))).toBe("23514");
    const yz = karar(KURUM_A, programA, a.kisi, { uretici: "yz" });
    expect(hataKodu(await reddedilir(() => ekle(KURUM_A, yz)))).toBe("23514");
    const kisiliOneri = karar(KURUM_A, programA, a.kisi, { durum: "oneri" });
    expect(hataKodu(await reddedilir(() => ekle(KURUM_A, kisiliOneri)))).toBe("23514");
  });

  it("değer biçimi türe uyar; seçmeli yer sayısı çerçevesiz ve negatif olmayan tam sayı", async () => {
    const ok = karar(KURUM_A, programA, a.kisi, { tur: "secmeli_yer", cerceveKod: null, anahtar: "3", deger: 2 });
    await ekle(KURUM_A, ok);
    for (const bozuk of [
      { ...ok, deger: -1 },
      { ...ok, deger: 1.5 },
      { ...ok, cerceveKod: "mudek-lisans" },
      { ...ok, tur: "pc_kurul", cerceveKod: "mudek-lisans", deger: "3.C1" },
      { ...ok, tur: "bilinmeyen" },
    ])
      expect(hataKodu(await reddedilir(() => ekle(KURUM_A, bozuk)))).toBe("23514");
    await ekle(KURUM_A, karar(KURUM_A, programA, a.kisi, { tur: "pc_kurul", anahtar: "P1", deger: ["3.C1", "3.C2"] }));
  });

  it("kiracı yalıtımı: başka kurumun kişisi ya da programı kullanılamaz, kayıtlar görünmez", async () => {
    const e1 = await reddedilir(() => ekle(KURUM_A, karar(KURUM_A, programA, bk.kisi)));
    expect(hataMetni(e1)).toMatch(/bu kurumda değil/u);
    const e2 = await reddedilir(() => ekle(KURUM_A, karar(KURUM_A, programB, a.kisi)));
    expect(hataMetni(e2)).toMatch(/bu kurumda değil/u);
    const e3 = await reddedilir(() => ekle(KURUM_A, karar(KURUM_B, programB, bk.kisi)));
    expect(hataKodu(e3)).toBe("42501");
    const r = await kiraciIslemi(b.db, KURUM_B, (tx) =>
      tx.select().from(s.programEsleme).where(eq(s.programEsleme.anahtar, "FIZ101")),
    );
    expect(r).toEqual([]);
  });
});
