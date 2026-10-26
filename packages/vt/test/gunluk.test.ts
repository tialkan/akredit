import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { kiraciIslemi } from "../src/baglanti.ts";
import {
  type DisaAktarilanGunlukSatiri,
  gunlugeYaz,
  gunlukKanonigi,
  gunlukOzeti,
  zinciriDisaridanDogrula,
  zinciriDogrula,
} from "../src/gunluk.ts";
import { gocluVt, hataMetni, KURUM_A, KURUM_B, kurumVerisiEkle, reddedilir, sorgu } from "./yardimci.ts";

let b: Awaited<ReturnType<typeof gocluVt>>;

beforeAll(async () => {
  b = await gocluVt();
  await kurumVerisiEkle(b.db, KURUM_A, "A");
  await kurumVerisiEkle(b.db, KURUM_B, "B");
});
afterAll(async () => {
  await b.kapat();
});

async function disaAktar(kurumId: string): Promise<DisaAktarilanGunlukSatiri[]> {
  const r = await sorgu<{ id: string; sira: number; kanonik: string; onceki_ozet: string | null; ozet: string }>(
    b.db,
    sql`select id::text, sira::int, kanonik, onceki_ozet, ozet from gunluk where kurum_id = ${kurumId} order by sira`,
  );
  return r.map((x) => ({ id: x.id, sira: x.sira, kanonik: x.kanonik, oncekiOzet: x.onceki_ozet, ozet: x.ozet }));
}

describe("günlük özeti", () => {
  it("elle hesaplanmış örnekle uyuşur", () => {
    // sha256("x") bilinen değerdir; ilk kayıtta önceki özet boş metin sayılır.
    expect(gunlukOzeti(null, "x")).toBe("2d711642b726b04401627ca9fbac32f5c8530fb1903cc4db02258717921a4881");
    // sha256("ab") = fb8e20fc...: önceki özet ile kanonik metin araya bir şey konmadan birleştirilir.
    expect(gunlukOzeti("a", "b")).toBe("fb8e20fc2e4c3f248c60c39bd652f3c1347298bb977b8b4d5903b85055620603");
  });

  it("uygulama tarafı özet SQL'deki gunluk_ozeti ile aynı (Türkçe karakterli metinde de)", async () => {
    const { kanonik } = gunlukKanonigi(KURUM_A, {
      aktor: { tur: "kisi", id: "k1" },
      eylem: "karar.verildi",
      ayrinti: { not: "Öğrenci işleri şubesi ğüşıöç" },
      zaman: new Date("2026-10-27T08:00:00.000Z"),
      id: "01900000-0000-7000-8000-000000000123",
    });
    const onceki = "a".repeat(64);
    const [r] = await sorgu<{ o: string }>(b.db, sql`select gunluk_ozeti(${onceki}, ${kanonik}) as o`);
    expect(r?.o).toBe(gunlukOzeti(onceki, kanonik));
    const [r2] = await sorgu<{ o: string }>(b.db, sql`select gunluk_ozeti(null, ${kanonik}) as o`);
    expect(r2?.o).toBe(gunlukOzeti(null, kanonik));
  });
});

describe("günlük zinciri", () => {
  it("100 kayıttan sonra doğrulama NULL; dışa aktarılan satırlar da birebir doğrulanır", async () => {
    for (let i = 0; i < 100; i++) {
      await kiraciIslemi(b.db, KURUM_A, (tx) =>
        gunlugeYaz(tx, {
          aktor: { tur: i % 2 ? "kisi" : "yz", id: `aktor-${i % 3}` },
          eylem: "deneme.kayit",
          hedef: i % 5 ? { tur: "kanit", id: `k-${i}` } : null,
          ayrinti: { sira: i, metin: "Şükrü'nün önerisi", liste: [1, 2.5, null] },
        }),
      );
    }
    expect(await zinciriDogrula(b.db, KURUM_A)).toBeNull();
    expect(await zinciriDogrula(b.db, KURUM_B)).toBeNull();
    const satirlar = await disaAktar(KURUM_A);
    expect(satirlar).toHaveLength(101); // örnek verideki ilk kayıt + 100
    expect(satirlar.map((x) => x.sira)).toEqual(Array.from({ length: 101 }, (_, i) => i + 1));
    expect(satirlar[0]?.oncekiOzet).toBeNull();
    expect(zinciriDisaridanDogrula(satirlar)).toBeNull();
    // Kurumların zincirleri ayrıdır: B'nin ilk kaydı da sıra 1'den başlar.
    expect((await disaAktar(KURUM_B))[0]?.sira).toBe(1);
  });

  it("alanları kanonik metinle uyuşmayan kayıt eklenemez", async () => {
    const { kayit, kanonik } = gunlukKanonigi(KURUM_A, { aktor: { tur: "sistem", id: null }, eylem: "gercek" });
    const h = await reddedilir(() =>
      kiraciIslemi(b.db, KURUM_A, (tx) =>
        tx.execute(sql`insert into gunluk (id, kurum_id, zaman, aktor_turu, eylem, kanonik)
                       values (${kayit.id}, ${KURUM_A}, now(), 'sistem', 'sahte', ${kanonik})`),
      ),
    );
    expect(hataMetni(h)).toMatch(/kanonik metinle uyuşmuyor/u);
  });

  it("sahip rolüyle tetikleyici kapatılıp bir kayıt değiştirilirse doğrulama o kaydın kimliğini döndürür", async () => {
    const satirlar = await disaAktar(KURUM_A);
    const hedef = satirlar[49];
    if (!hedef) throw new Error("kayıt yok");
    const yeniKanonik = hedef.kanonik.replace('"sira":48', '"sira":4800');
    expect(yeniKanonik).not.toBe(hedef.kanonik);
    await b.db.transaction(async (tx) => {
      await tx.execute(sql.raw("alter table gunluk disable trigger gunluk_degismez"));
      await tx.execute(
        sql`update gunluk set kanonik = ${yeniKanonik}, ayrinti = ${yeniKanonik}::jsonb -> 'ayrinti' where id = ${hedef.id}`,
      );
      await tx.execute(sql.raw("alter table gunluk enable trigger gunluk_degismez"));
    });
    expect(await zinciriDogrula(b.db, KURUM_A)).toBe(hedef.id);
    expect(zinciriDisaridanDogrula(await disaAktar(KURUM_A))).toBe(hedef.id);
    // B'nin zinciri etkilenmez.
    expect(await zinciriDogrula(b.db, KURUM_B)).toBeNull();
  });

  it("yalnız bir sütun (kanonik değil) değiştirilse de yakalanır; silinen kayıt sonrakini bozar", async () => {
    const satirlar = await disaAktar(KURUM_B);
    const ilk = satirlar[0];
    if (!ilk) throw new Error("kayıt yok");
    for (let i = 0; i < 2; i++) {
      await kiraciIslemi(b.db, KURUM_B, (tx) =>
        gunlugeYaz(tx, { aktor: { tur: "sistem", id: null }, eylem: `b.${i}` }),
      );
    }
    const yeni = await disaAktar(KURUM_B);
    await b.db.transaction(async (tx) => {
      await tx.execute(sql.raw("alter table gunluk disable trigger gunluk_degismez"));
      await tx.execute(sql`update gunluk set eylem = 'oynanmis' where id = ${ilk.id}`);
      await tx.execute(sql.raw("alter table gunluk enable trigger gunluk_degismez"));
    });
    expect(await zinciriDogrula(b.db, KURUM_B)).toBe(ilk.id);
    await b.db.transaction(async (tx) => {
      await tx.execute(sql.raw("alter table gunluk disable trigger gunluk_degismez"));
      await tx.execute(sql`update gunluk set eylem = ${"deneme.basladi"} where id = ${ilk.id}`);
      await tx.execute(sql`delete from gunluk where id = ${yeni[1]?.id ?? ""}`);
      await tx.execute(sql.raw("alter table gunluk enable trigger gunluk_degismez"));
    });
    expect(await zinciriDogrula(b.db, KURUM_B)).toBe(yeni[2]?.id);
  });

  it("etkin kurum yoksa günlüğe yazılamaz", async () => {
    await expect(
      b.db.transaction((tx) => gunlugeYaz(tx, { aktor: { tur: "sistem", id: null }, eylem: "x" })),
    ).rejects.toThrow(/etkin kurum/u);
  });
});
