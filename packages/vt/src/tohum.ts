// Geliştirme tohumu: kurgu "Örnek Üniversitesi". Gerçek kişi adı ya da gerçek kurum bilgisi yoktur;
// çıktı metinleri örnek amaçlı yazılmıştır, resmî bir programdan alınmamıştır.

import { sql } from "drizzle-orm";
import type { Vt } from "./baglanti.ts";
import { gunlugeYaz } from "./gunluk.ts";
import { birim, cikti, ders, donem, kurum, program } from "./sema/index.ts";

export const ORNEK_KURUM_ID = "01900000-0000-7000-8000-000000000001";

const DERSLER = [
  { kod: "BP101", ad: "Algoritma ve Programlamaya Giriş", akts: 6, teorik: 2, uygulama: 2, yariyil: 1 },
  { kod: "BP103", ad: "Bilgisayar Donanımı", akts: 4, teorik: 2, uygulama: 1, yariyil: 1 },
  { kod: "BP105", ad: "Ofis Yazılımları", akts: 3, teorik: 1, uygulama: 2, yariyil: 1 },
  { kod: "BP102", ad: "Nesne Tabanlı Programlama", akts: 6, teorik: 2, uygulama: 2, yariyil: 2 },
  { kod: "BP104", ad: "Veri Tabanı Yönetimi", akts: 5, teorik: 2, uygulama: 2, yariyil: 2 },
  { kod: "BP106", ad: "Web Tasarımının Temelleri", akts: 5, teorik: 2, uygulama: 2, yariyil: 2 },
] as const;

const PROGRAM_CIKTILARI = [
  "Temel programlama kavramlarını kullanarak basit uygulamalar geliştirir.",
  "Bir veri tabanı tasarlar ve sorgular.",
  "Bilgisayar donanımını kurar ve temel arızaları giderir.",
  "Mesleki çalışmalarında ekip içinde görev alır.",
];

/**
 * Tohum verisini ekler (sahip rolüyle çalıştırılır; `kurum` eklemek uygulama rolüne açık değildir).
 * Kurum zaten varsa bir şey yapmaz. Eklenen kurumun kimliğini döndürür.
 */
export async function tohumla(db: Vt, kurumId: string = ORNEK_KURUM_ID): Promise<string> {
  await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.kurum_id', ${kurumId}, true)`);
    const varMi = await tx.select({ id: kurum.id }).from(kurum).where(sql`${kurum.id} = ${kurumId}`);
    if (varMi.length > 0) return;

    await tx.insert(kurum).values({ id: kurumId, ad: "Örnek Üniversitesi", kisaAd: "ÖRNEK" });
    const [myo] = await tx
      .insert(birim)
      .values({ kurumId, tur: "myo", ad: "Örnek Meslek Yüksekokulu", kod: "MYO" })
      .returning();
    if (!myo) throw new Error("Tohum: birim eklenemedi.");
    const [bp] = await tx
      .insert(program)
      .values({ kurumId, birimId: myo.id, ad: "Bilgisayar Programcılığı", duzey: "onlisans", ogretimTuru: "örgün" })
      .returning();
    if (!bp) throw new Error("Tohum: program eklenemedi.");
    await tx.insert(donem).values({ kurumId, ad: "2026-2027 Güz", baslangic: "2026-09-21", bitis: "2027-01-22" });

    await tx.insert(cikti).values(
      PROGRAM_CIKTILARI.map((metin, i) => ({
        kurumId,
        tur: "program" as const,
        sahipId: bp.id,
        kod: `PÇ${i + 1}`,
        metin,
      })),
    );

    for (const d of DERSLER) {
      const [satir] = await tx
        .insert(ders)
        .values({ kurumId, programId: bp.id, ...d })
        .returning();
      if (!satir) throw new Error("Tohum: ders eklenemedi.");
      await tx.insert(cikti).values([
        { kurumId, tur: "ders", sahipId: satir.id, kod: "ÖÇ1", metin: `${d.ad} dersinin temel kavramlarını açıklar.` },
        { kurumId, tur: "ders", sahipId: satir.id, kod: "ÖÇ2", metin: `${d.ad} konularını uygulamada kullanır.` },
      ]);
    }

    await gunlugeYaz(tx, {
      aktor: { tur: "sistem", id: null },
      eylem: "tohum.eklendi",
      hedef: { tur: "kurum", id: kurumId },
    });
  });
  return kurumId;
}
