// Ders dosyası işçisi: onaylı eşlemeden dosya üretir, onaysız eşlemeye dokunmaz, kurum hatası turu durdurmaz.
// PGlite, gerçek tetikleyiciler. Bütün ad ve numaralar uydurmadır.

import { aktorYukle, dersDosyasi, oneri } from "@akredit/servis";
import { gocleriUygula, kiraciIslemi, pgliteBaglantisi, sema } from "@akredit/vt";
import { sql } from "drizzle-orm";
import { expect, it } from "vitest";
import { dersDosyasiIscisi } from "./index.ts";

const KURUM = "01900000-0000-7000-8000-0000000000f1";
const SIMDI = new Date("2026-10-27T06:00:00Z");
const ANAHTAR = "deneme-anahtari-yalniz-test-icin-0123456789";

it("onaylı eşlemeden ders dosyası üretir, ikinci turda yeniden üretmez", async () => {
  const bag = await pgliteBaglantisi();
  try {
    await gocleriUygula(bag.db);
    const k = await bag.db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.kurum_id', ${KURUM}, true)`);
      await tx.insert(sema.kurum).values({ id: KURUM, ad: "Uydurma Üniversitesi" });
      const [b] = await tx.insert(sema.birim).values({ kurumId: KURUM, tur: "myo", ad: "Uydurma MYO" }).returning();
      const [p] = await tx
        .insert(sema.program)
        .values({ kurumId: KURUM, birimId: b?.id as string, ad: "Uydurma", duzey: "onlisans" })
        .returning();
      const [d] = await tx
        .insert(sema.ders)
        .values({ kurumId: KURUM, programId: p?.id as string, kod: "UYD101", ad: "Uydurma", akts: 3, yariyil: 1 })
        .returning();
      await tx
        .insert(sema.cikti)
        .values({ kurumId: KURUM, tur: "ders", sahipId: d?.id as string, kod: "ÖÇ1", metin: "Bir." });
      const [dn] = await tx
        .insert(sema.donem)
        .values({ kurumId: KURUM, ad: "2025-2026 Güz", baslangic: "2025-09-15", bitis: "2026-01-20" })
        .returning();
      const [a] = await tx
        .insert(sema.dersAcilisi)
        .values({ kurumId: KURUM, dersId: d?.id as string, donemId: dn?.id as string })
        .returning();
      const [h] = await tx.insert(sema.kisi).values({ kurumId: KURUM, adSoyad: "Uydurma Hoca" }).returning();
      await tx.insert(sema.rolAtamasi).values({
        kurumId: KURUM,
        kisiId: h?.id as string,
        rol: "ogretim_elemani",
        kapsamTuru: "ders",
        kapsamId: d?.id as string,
        baslangic: new Date("2025-01-01T00:00:00Z"),
      });
      return { acilis: a?.id as string, hoca: h?.id as string };
    });
    const b = { db: bag.db, aktor: await aktorYukle(bag.db, KURUM, k.hoca), simdi: () => SIMDI };
    const r = await dersDosyasi.dokumAktar(
      b,
      {
        dersAcilisiId: k.acilis,
        araclar: [
          {
            ad: "Final",
            tur: "yariyil_sonu",
            agirlik: 100,
            dosyaAdi: "f.csv",
            icerikBase64: Buffer.from("Öğrenci No;S1 (10)\n9001;8\n9002;4\n").toString("base64"),
          },
        ],
        adaylar: [{ soruNo: "1", ckKodlari: ["ÖÇ1"] }],
      },
      ANAHTAR,
    );
    const hatalar: unknown[] = [];
    const isci = dersDosyasiIscisi({
      db: bag.db,
      kurumlar: async () => [KURUM, "01900000-0000-7000-8000-0000000000ff"],
      saat: () => SIMDI,
      hata: (_k, e) => hatalar.push(e),
    });
    expect(await isci.tur()).toBe(0); // onaysız eşleme üretilmez
    await oneri.kararVer(b, { oneriId: r.eslemeOneriId, sonuc: "onaylandi" });
    expect(await isci.tur()).toBe(1);
    expect(await isci.tur()).toBe(0);
    expect((await dersDosyasi.durum(b, k.acilis)).asama).toBe("onay_bekliyor");
    const gunluk = await kiraciIslemi(bag.db, KURUM, (tx) => tx.select().from(sema.gunluk));
    expect(gunluk.find((g) => g.eylem === "ders_dosyasi.olusturuldu")?.aktorTuru).toBe("sistem");
  } finally {
    await bag.kapat();
  }
}, 60_000);
