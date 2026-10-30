// İP-45 işçi işleri: hatırlatma bir kez gider, sonuç kayda geçer; yüklenen dış birim kanıtı metin çıkarma
// kuyruğuna konur. PGlite, bellek e-posta taşıyıcısı ve sahte kuyruk. Adlar ve adresler uydurmadır.

import { createHash, randomUUID } from "node:crypto";
import { belgeIstegi } from "@akredit/servis";
import { bellekTasiyici } from "@akredit/surec";
import { gocleriUygula, kiraciIslemi, pgliteBaglantisi, sema, type Vt } from "@akredit/vt";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { HatBaglami } from "../kanit-hatti/index.ts";
import { belgeIstegiTuru } from "./index.ts";

const KURUM = "01900000-0000-7000-8000-0000000000a1";
const KISI = "01900000-0000-7000-8000-000000000c01";
const GIZLI = "deneme-belge-istegi-anahtari-en-az-otuz-iki-bayt";
const SIMDI = new Date("2026-11-01T09:00:00Z");
const SAAT = 3_600_000;

let db: Vt;
let kapat: () => Promise<void>;
beforeAll(async () => {
  const b = await pgliteBaglantisi();
  await gocleriUygula(b.db);
  db = b.db;
  kapat = b.kapat;
  await db.insert(sema.kurum).values({ id: KURUM, ad: "Uydurma Üniversitesi" });
  await db.insert(sema.kisi).values({ id: KISI, kurumId: KURUM, adSoyad: "Ayşe Uydurma" });
});
afterAll(async () => {
  await kapat();
});

async function istek(sonSaat: number, ilk: "gonderildi" | "gonderilmedi" = "gonderildi") {
  const id = randomUUID();
  const jeton = belgeIstegi.jetonUret(GIZLI, KURUM, id, createHash("sha256").update(id).digest());
  await kiraciIslemi(db, KURUM, async (tx) => {
    await tx.insert(sema.belgeIstegi).values({
      id,
      kurumId: KURUM,
      istenen: "SKS etkinlik listesi",
      aliciEposta: "sks@uydurma.edu.tr",
      isteyenKisiId: KISI,
      belirtecOzet: belgeIstegi.belirtecOzeti(jeton),
      son: new Date(SIMDI.getTime() + sonSaat * SAAT),
      olusturma: new Date(SIMDI.getTime() - SAAT),
    });
    await tx
      .insert(sema.belgeIstegiGonderimi)
      .values({ kurumId: KURUM, istekId: id, tur: "ilk", durum: ilk, zaman: SIMDI });
  });
  return { id, jeton };
}

function hat(): HatBaglami & { konan: string[] } {
  const konan: string[] = [];
  return {
    db,
    konan,
    depo: {} as HatBaglami["depo"],
    kuyruk: {
      async gonder(_k: string, veri: unknown) {
        konan.push((veri as { kanitId: string }).kanitId);
      },
      async isle() {},
    } as unknown as HatBaglami["kuyruk"],
  };
}

describe("belge isteği turu", () => {
  it("son tarihe 48 saatten az kalan isteğe bir kez hatırlatma gider; ilk e-postası gitmeyene gitmez", async () => {
    const yakin = await istek(24);
    const uzak = await istek(24 * 7);
    const gitmemis = await istek(24, "gonderilmedi");
    const t = bellekTasiyici();
    const h = hat();
    const r1 = await belgeIstegiTuru(h, t, KURUM, SIMDI);
    expect(r1.hatirlatilan).toBe(1);
    expect(t.kutu.map((x) => x.alici)).toEqual(["sks@uydurma.edu.tr"]);
    expect(t.kutu[0]?.metin).not.toContain(yakin.jeton);
    const r2 = await belgeIstegiTuru(h, t, KURUM, SIMDI);
    expect(r2.hatirlatilan).toBe(0);
    const kayit = await kiraciIslemi(db, KURUM, (tx) =>
      tx.select().from(sema.belgeIstegiGonderimi).where(eq(sema.belgeIstegiGonderimi.tur, "hatirlatma")),
    );
    expect(kayit.map((x) => x.istekId)).toEqual([yakin.id]);
    expect([uzak.id, gitmemis.id]).not.toContain(kayit[0]?.istekId);
  });

  it("gönderilemeyen hatırlatma 'gönderilmedi' olarak kaydedilir", async () => {
    const s = await istek(10);
    await belgeIstegiTuru(hat(), { gonder: () => Promise.reject(new Error("kapalı")) }, KURUM, SIMDI);
    const [g] = await kiraciIslemi(db, KURUM, (tx) =>
      tx.select().from(sema.belgeIstegiGonderimi).where(eq(sema.belgeIstegiGonderimi.istekId, s.id)),
    ).then((l) => l.filter((x) => x.tur === "hatirlatma"));
    expect(g?.durum).toBe("gonderilmedi");
  });

  it("yüklenen dış birim kanıtı metin çıkarma kuyruğuna konur", async () => {
    const s = await istek(24 * 5);
    const ozet = createHash("sha256").update("sks-listesi").digest("hex");
    const y = await belgeIstegi.istekYukle(
      db,
      GIZLI,
      {
        jeton: s.jeton,
        dosya: { ozet, depoAnahtari: `${KURUM}/${ozet}`, dosyaAdi: "liste.pdf", mime: "application/pdf", boyut: 10 },
        agIzi: null,
      },
      SIMDI,
    );
    const h = hat();
    await belgeIstegiTuru(h, bellekTasiyici(), KURUM, SIMDI);
    expect(h.konan).toContain(y.kanitId);
  });
});
