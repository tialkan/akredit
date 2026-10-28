// Kriptografik silme (İP-40): anahtar silinir, günlüğe yeni kayıt eklenir, eski kayıtlar ve zincir değişmez.
// Bütün veriler uydurmadır.
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { kiraciIslemi } from "../src/baglanti.ts";
import { gunlugeYaz, zinciriDogrula } from "../src/gunluk.ts";
import { kisiAnahtariOlustur, kisiyeOzguCoz, kisiyeOzguSifrele, kriptografikSil } from "../src/kriptografik-silme.ts";
import { gocluVt, KURUM_A, KURUM_B, kurumVerisiEkle, sorgu } from "./yardimci.ts";

let b: Awaited<ReturnType<typeof gocluVt>>;
const ANA = new Uint8Array(32).fill(7);

beforeAll(async () => {
  b = await gocluVt();
  await kurumVerisiEkle(b.db, KURUM_A, "A");
  await kurumVerisiEkle(b.db, KURUM_B, "B");
});
afterAll(async () => {
  await b.kapat();
});

async function gunlukSatirlari(kurumId: string) {
  return sorgu<{ id: string; kanonik: string; ozet: string }>(
    b.db,
    sql`select id::text, kanonik, ozet from gunluk where kurum_id = ${kurumId} order by sira`,
  );
}

describe("kriptografik silme", () => {
  it("anahtar silinince şifreli değer çözülemez; günlük yalnız uzar, zincir sağlam", async () => {
    // Kişiye ait şifreli değer değiştirilemez günlüğe ve takma ad eşlemesine yazılır.
    const { anahtarId, sifreli } = await kiraciIslemi(b.db, KURUM_A, async (tx) => {
      const anahtarId = await kisiAnahtariOlustur(tx, "ogr-hmac-kurgu-1", ANA);
      expect(await kisiAnahtariOlustur(tx, "ogr-hmac-kurgu-1", ANA)).toBe(anahtarId);
      const sifreli = await kisiyeOzguSifrele(tx, anahtarId, "Kurgu Öğrenci 2021000001", ANA);
      await gunlugeYaz(tx, {
        aktor: { tur: "sistem", id: null },
        eylem: "olcme.not_aktarildi",
        ayrinti: { ogrenci: sifreli },
      });
      await tx.execute(
        sql`insert into takma_ad (kurum_id, takma_ad, numara_sifreli, anahtar_surumu, kisi_anahtari_id)
            values (etkin_kurum(), 'T-KURGU-1', ${Buffer.from(sifreli)}, 'a1', ${anahtarId}::uuid)`,
      );
      expect(await kisiyeOzguCoz(tx, sifreli, ANA)).toBe("Kurgu Öğrenci 2021000001");
      return { anahtarId, sifreli };
    });
    expect(sifreli).not.toContain("Kurgu");

    const once = await gunlukSatirlari(KURUM_A);
    const sonuc = await kiraciIslemi(b.db, KURUM_A, (tx) =>
      kriptografikSil(tx, {
        talepId: "talep-kurgu-1",
        anahtarId,
        onaylayanId: "kisi-kurgu-dpo",
        dayanak: "İlgili kişi silme başvurusu (kurgu)",
      }),
    );
    expect(sonuc).toMatchObject({ silinenAnahtar: 1, silinenEsleme: 1 });

    const sonra = await gunlukSatirlari(KURUM_A);
    // Eski kayıtlar birebir aynı, sonuna tam bir kayıt eklendi.
    expect(sonra.slice(0, once.length)).toEqual(once);
    expect(sonra).toHaveLength(once.length + 1);
    const yeni = JSON.parse(sonra.at(-1)?.kanonik ?? "{}");
    expect(yeni.eylem).toBe("kvkk.silme_uygulandi");
    expect(yeni.ayrinti).toEqual({
      talepId: "talep-kurgu-1",
      dayanak: "İlgili kişi silme başvurusu (kurgu)",
      yontem: "kriptografik",
      silinenEsleme: 1,
    });
    expect(await zinciriDogrula(b.db, KURUM_A)).toBeNull();

    await kiraciIslemi(b.db, KURUM_A, async (tx) => {
      expect(await kisiyeOzguCoz(tx, sifreli, ANA)).toBeNull();
      await expect(kisiyeOzguSifrele(tx, anahtarId, "x", ANA)).rejects.toThrow(/silinmiş/u);
      const kalan = await sorgu<{ n: number }>(
        tx,
        sql`select count(*)::int as n from takma_ad where takma_ad = 'T-KURGU-1'`,
      );
      expect(kalan[0]?.n).toBe(0);
    });
  });

  it("anahtar güncellenemez ve başka kurumun anahtarı silinemez", async () => {
    const anahtarId = await kiraciIslemi(b.db, KURUM_A, (tx) => kisiAnahtariOlustur(tx, "ogr-hmac-kurgu-2", ANA));
    await expect(
      kiraciIslemi(b.db, KURUM_A, (tx) => tx.execute(sql`update kisi_anahtari set konu = 'x'`)),
    ).rejects.toThrow();
    await expect(
      kiraciIslemi(b.db, KURUM_B, (tx) =>
        kriptografikSil(tx, { talepId: "t", anahtarId, onaylayanId: "k", dayanak: "d" }),
      ),
    ).rejects.toThrow(/bulunamadı/u);
    expect(await zinciriDogrula(b.db, KURUM_B)).toBeNull();
  });
});
