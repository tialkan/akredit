// Uçtan uca (tarayıcısız): sihirli bağlantıyla giriş → çerezli /api/v1 istekleri → servis → PGlite.
// Panelin iki veri yolu da sınanır: sunucuda `ServisVeriKaynagi`, tarayıcıda `ApiVeriKaynagi` (fetch).

import { apiIsleyici, vtTekrarDeposu } from "@akredit/servis";
import { sema, zinciriDogrula } from "@akredit/vt";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { aktorOlustur, v1Isleyici } from "../app/api/_ortak/v1.ts";
import { istekBaglami } from "../kimlik/erisim.ts";
import {
  ADRES,
  type CerezKavanozu,
  istek,
  sihirliGiris,
  type TestOrtami,
  testOrtami,
} from "../kimlik/test-yardimci.ts";
import { ServisVeriKaynagi } from "./gercek.ts";
import { ApiVeriKaynagi } from "./istemci.ts";

let o: TestOrtami;
let kavanoz: CerezKavanozu;
let isle: (r: Request) => Promise<Response>;
const oneriler: Record<string, string> = {};

beforeAll(async () => {
  o = await testOrtami();
  // A kurumuna öneri ve kanıt (sahip bağlantısıyla, uydurma veri).
  await o.db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.kurum_id', ${o.a.kurumId}, true)`);
    const ekle = async (
      ad: string,
      tur: "kanit_etiketi" | "matris_katkisi" | "olgunluk_duzeyi",
      risk: "dusuk" | "orta" | "yuksek",
    ) => {
      const [r] = await tx
        .insert(sema.oneri)
        .values({
          kurumId: o.a.kurumId,
          tur,
          hedefTuru: "ders",
          hedefId: o.a.dersId,
          icerik: { baslik: `Öneri ${ad}`, metin: "Önerilen metin." },
          gerekce: "Örnek gerekçe.",
          guven: 0.9,
          ureticiTuru: "kural",
          uretici: { kural: "ornek", surum: "1" },
          risk,
        })
        .returning();
      oneriler[ad] = r?.id as string;
    };
    await ekle("dusuk", "kanit_etiketi", "dusuk");
    await ekle("orta", "matris_katkisi", "orta");
    await ekle("yuksek", "olgunluk_duzeyi", "yuksek");
    const [k] = await tx
      .insert(sema.kanit)
      .values({
        kurumId: o.a.kurumId,
        ozet: "c".repeat(64),
        dosyaAdi: "izlence.pdf",
        mime: "application/pdf",
        boyut: 10,
        depoAnahtari: "x",
        kaynakTuru: "yukleme",
        kapsamlar: [{ tur: "ders", id: o.a.dersId }],
      })
      .returning();
    await tx.insert(sema.kanitIsleme).values({
      kurumId: o.a.kurumId,
      kanitId: k?.id as string,
      durum: "hata",
      ayrinti: { asama: "cikarma", ileti: "Dosya okunamadı." },
    });
  });
  ({ kavanoz } = await sihirliGiris(o, o.a.yoneticiEposta));
  isle = v1Isleyici(o.k, apiIsleyici({ db: o.db, tekrar: vtTekrarDeposu(o.db) }));
});
afterAll(async () => {
  await o.kapat();
});

describe("panel gerçek veritabanıyla uçtan uca", () => {
  it("çerezli istek oturumdaki kişiyi döndürür; çerezsiz 401", async () => {
    const y = await isle(istek("/api/v1/ben", { kavanoz }));
    expect(y.status).toBe(200);
    expect(await y.json()).toMatchObject({ id: o.a.yoneticiKisiId, ad: "Deneme Yönetici A" });
    expect((await isle(istek("/api/v1/ben"))).status).toBe(401);
  });

  it("başka sitenin çerezli POST'u reddedilir (CSRF)", async () => {
    const r = new Request(`${ADRES}/api/v1/kararlar`, {
      method: "POST",
      headers: { cookie: kavanoz.baslik(), origin: "http://kotu.example", "content-type": "application/json" },
      body: JSON.stringify({ oneriId: oneriler.dusuk, sonuc: "onaylandi" }),
    });
    expect((await isle(r)).status).toBe(403);
  });

  it("tarayıcı kaynağı (fetch → /api/v1): bekleyenler, toplu onayda yüksek risk reddi, karar, ayarlar", async () => {
    const getir: typeof fetch = async (adres, init) => {
      const h = new Headers(init?.headers);
      h.set("cookie", kavanoz.baslik());
      h.set("origin", ADRES);
      return isle(new Request(`${ADRES}${adres}`, { ...init, headers: h }));
    };
    const k = new ApiVeriKaynagi("/api/v1", getir);
    expect((await k.bekleyenOneriler()).map((x) => x.id).sort()).toEqual(Object.values(oneriler).sort());
    const red = await k.topluKararVer([oneriler.dusuk, oneriler.yuksek] as never);
    expect(red).toEqual({
      tamam: false,
      hata: "Yüksek riskli öneriler toplu onaylanamaz. Onları tek tek inceleyip onaylayın.",
    });
    expect(await k.kararlar()).toEqual([]);
    const tamam = await k.topluKararVer([oneriler.dusuk, oneriler.orta] as never);
    expect(tamam.tamam).toBe(true);
    const tek = await k.kararVer({ oneriId: oneriler.yuksek as never, sonuc: "duzeltildi", duzeltme: "Düzeltildi." });
    expect(tek).toMatchObject({ tamam: true, deger: { kararVeren: o.a.yoneticiKisiId, sonuc: "duzeltildi" } });
    expect(await k.bekleyenOneriler()).toEqual([]);
    const a = await k.ayarlariGuncelle({ yurtDisiIzni: false });
    expect(a.yurtDisiIzni).toBe(false);
    const hat = await k.kanitHattiOzeti();
    expect(hat.sayac.hata).toBe(1);
    expect((await k.kanitlar())[0]?.isleme).toMatchObject({ durum: "hata", ileti: "Dosya okunamadı." });
    expect(await k.kanit("01900000-0000-7000-8000-000000000000")).toBeNull();
  });

  it("sunucu kaynağı (servis): oturumdan kurulan aktörle panel özeti ve günlük zinciri", async () => {
    const b = await istekBaglami(o.k, istek("/panel", { kavanoz }));
    const k = new ServisVeriKaynagi({ db: o.db, aktor: aktorOlustur(b), simdi: () => new Date() });
    const ozet = await k.panelOzeti();
    expect(ozet.bekleyen).toEqual({ dusuk: 0, orta: 0, yuksek: 0 });
    expect(ozet.kararSayisi).toBe(3);
    expect((await k.kullanici()).ad).toBe("Deneme Yönetici A");
    expect((await k.programlar()).map((p) => p.id)).toEqual([o.a.programId]);
    // Günlükte karar kayıtlarının aktörü oturumdaki kişi; zincir sağlam.
    const kayitlar = await o.db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.kurum_id', ${o.a.kurumId}, true)`);
      return tx.select().from(sema.gunluk);
    });
    const kararlar = kayitlar.filter((g) => g.eylem === "karar.verildi");
    expect(kararlar).toHaveLength(3);
    expect(kararlar.every((g) => g.aktorId === o.a.yoneticiKisiId)).toBe(true);
    expect(await zinciriDogrula(o.db, o.a.kurumId)).toBeNull();
  });

  it("B kurumunun oturumu A'nın önerisine erişemez", async () => {
    const { kavanoz: bk } = await sihirliGiris(o, o.b.yoneticiEposta);
    const y = await isle(
      new Request(`${ADRES}/api/v1/kararlar`, {
        method: "POST",
        headers: { cookie: bk.baslik(), origin: ADRES, "content-type": "application/json" },
        body: JSON.stringify({ oneriId: oneriler.dusuk, sonuc: "reddedildi" }),
      }),
    );
    expect(y.status).toBe(404);
  });
});
