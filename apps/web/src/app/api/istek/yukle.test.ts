// Hesapsız belge yükleme ucu (İP-45): göçlenmiş PGlite ile. Köken, bal küpü, kapalı yapılandırma, geçersiz
// bağlantı, dosya türü ve başarılı yükleme. Adlar ve adresler uydurmadır.

import { createHash, randomUUID } from "node:crypto";
import type { NesneDeposu } from "@akredit/depo";
import { belgeIstegi } from "@akredit/servis";
import { gocleriUygula, pgliteBaglantisi, sema, type Vt } from "@akredit/vt";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ORNEK_JETON, type YuklemeOrtami, yuklemeIsle } from "./_ortak.ts";

const ADRES = "http://akredit.test";
const GIZLI = "deneme-belge-istegi-anahtari-en-az-otuz-iki-bayt";
const SIMDI = new Date("2026-10-30T10:00:00Z");
const KURUM = "01900000-0000-7000-8000-0000000000c1";
const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);

let db: Vt;
let kapat: () => Promise<void>;
let kisiId: string;
beforeAll(async () => {
  const b = await pgliteBaglantisi();
  await gocleriUygula(b.db);
  db = b.db;
  kapat = b.kapat;
  await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.kurum_id', ${KURUM}, true)`);
    await tx.insert(sema.kurum).values({ id: KURUM, ad: "Uydurma Üniversitesi", kisaAd: "UÜ" });
    const [k] = await tx.insert(sema.kisi).values({ kurumId: KURUM, adSoyad: "Deneme Komisyon Üyesi" }).returning();
    kisiId = k?.id as string;
  });
});
afterAll(async () => {
  await kapat();
});

const konan: string[] = [];
const depo: NesneDeposu = {
  ad: "bellek",
  kilitli: false,
  async koy(kurumId, veri) {
    const ozet = createHash("sha256").update(veri).digest("hex");
    konan.push(ozet);
    return { anahtar: `${kurumId}/${ozet}`, ozet, boyut: veri.byteLength, yeni: true };
  },
  async al() {
    return new Uint8Array();
  },
  async varMi() {
    return true;
  },
  async baglanti() {
    return "";
  },
};

function ortam(ek: Partial<YuklemeOrtami> = {}): YuklemeOrtami {
  return {
    db,
    depo,
    gizli: GIZLI,
    simdi: () => SIMDI,
    temelAdres: ADRES,
    izinliKokenler: [],
    tuz: "deneme-tuzu",
    uyar: () => {},
    ...ek,
  };
}

/** Doğrudan veritabanına bir istek ekler ve jetonunu döndürür. */
async function yeniIstek(): Promise<string> {
  const id = randomUUID();
  const jeton = belgeIstegi.jetonUret(
    GIZLI,
    KURUM,
    id,
    new Uint8Array(32).map(() => Math.floor(Math.random() * 256)),
  );
  await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.kurum_id', ${KURUM}, true)`);
    await tx.insert(sema.belgeIstegi).values({
      id,
      kurumId: KURUM,
      istenen: "Kütüphane kullanım istatistikleri",
      isteyenKisiId: kisiId,
      belirtecOzet: belgeIstegi.belirtecOzeti(jeton),
      son: new Date(SIMDI.getTime() + 86_400_000),
      olusturma: new Date(SIMDI.getTime() - 60_000),
    });
  });
  return jeton;
}

function istek(alanlar: Record<string, string | Blob>, s: { koken?: string | null; ad?: string } = {}): Request {
  const f = new FormData();
  for (const [k, v] of Object.entries(alanlar)) {
    if (v instanceof Blob) f.set(k, v, s.ad ?? "plan.pdf");
    else f.set(k, v);
  }
  const h = new Headers({ "x-real-ip": "203.0.113.9" });
  if (s.koken !== null) h.set("origin", s.koken ?? ADRES);
  return new Request(`${ADRES}/api/istek/yukle`, { method: "POST", headers: h, body: f });
}

const once = String(SIMDI.getTime() - 10_000);

describe("belge yükleme ucu", () => {
  it("başka kökenden ya da kökensiz istek reddedilir", async () => {
    expect((await yuklemeIsle(ortam(), istek({ j: "x", acilis: once }, { koken: "https://kotu.example" }))).durum).toBe(
      403,
    );
    expect((await yuklemeIsle(ortam(), istek({ j: "x", acilis: once }, { koken: null }))).durum).toBe(403);
  });

  it("bal küpü dolu ya da çok hızlı gönderim sessizce yutulur, hiçbir şey depoya konmaz", async () => {
    const jeton = await yeniIstek();
    const n = konan.length;
    const a = await yuklemeIsle(ortam(), istek({ j: jeton, acilis: once, webSitesi: "x", dosya: new Blob([PDF]) }));
    const b = await yuklemeIsle(ortam(), istek({ j: jeton, acilis: String(SIMDI.getTime()), dosya: new Blob([PDF]) }));
    expect([a.durum, b.durum]).toEqual([201, 201]);
    expect(konan.length).toBe(n);
  });

  it("örnek bağlantı kaydetmez; yapılandırma yoksa kapalı der", async () => {
    expect((await yuklemeIsle(ortam(), istek({ j: ORNEK_JETON, acilis: once }))).govde).toMatchObject({ ornek: true });
    expect((await yuklemeIsle(ortam({ gizli: null }), istek({ j: "x", acilis: once }))).durum).toBe(503);
    expect((await yuklemeIsle(ortam({ depo: null }), istek({ j: "x", acilis: once }))).durum).toBe(503);
  });

  it("geçersiz bağlantıyla gelen dosya depoya konmaz", async () => {
    const n = konan.length;
    const y = await yuklemeIsle(ortam(), istek({ j: "bozuk.jeton", acilis: once, dosya: new Blob([PDF]) }));
    expect(y.durum).toBe(404);
    expect(konan.length).toBe(n);
  });

  it("kabul edilmeyen dosya türü reddedilir", async () => {
    const jeton = await yeniIstek();
    const y = await yuklemeIsle(ortam(), istek({ j: jeton, acilis: once, dosya: new Blob([PDF]) }, { ad: "x.exe" }));
    expect(y.durum).toBe(400);
    expect(String(y.govde.hata)).toMatch(/türü kabul edilmiyor/u);
  });

  it("geçerli yükleme kaydedilir; aynı bağlantı ikinci kez kullanılamaz", async () => {
    const jeton = await yeniIstek();
    const y = await yuklemeIsle(
      ortam(),
      istek({ j: jeton, acilis: once, aciklama: "Ek not.", dosya: new Blob([PDF]) }),
    );
    expect(y).toEqual({ durum: 201, govde: { tamam: true } });
    const y2 = await yuklemeIsle(ortam(), istek({ j: jeton, acilis: once, dosya: new Blob([PDF]) }));
    expect(y2.durum).toBe(410);
  });
});
