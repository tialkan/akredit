// Uçtan uca kiracı yalıtımı: A kurumunun kullanıcısı (oturumla ya da API anahtarıyla) B kurumunun hiçbir
// verisine erişemez. İstekler gerçek kimlik uç noktalarından geçer; veri PGlite'ta satır güvenliğiyle okunur.

import { kiraciIslemi, sema } from "@akredit/vt";
import { type KapsamTuru, kurumHedefi } from "@akredit/yetki";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type IstekBaglami, istekBaglami, korumali, yetkiliIs } from "./erisim.ts";
import { type CerezKavanozu, istek, KURUM_B, sihirliGiris, type TestOrtami, testOrtami } from "./test-yardimci.ts";
import { apiAnahtariOlustur, davetOlustur, rolAta } from "./yonetim.ts";

let o: TestOrtami;
let aKavanoz: CerezKavanozu;
let aBaglam: IstekBaglami;
let aAnahtar: string;

/** Örnek korumalı uç: `/v/<tur>/<id>` hedefin kaydını döndürür (kanit.oku). */
const okuma = () =>
  korumali(o.k, async (i, b) => {
    const [, , tur, id] = new URL(i.url).pathname.split("/");
    const kayit = await yetkiliIs(o.k, b, "kanit.oku", { tur: tur as KapsamTuru, id: id ?? "" }, async (tx, h) => {
      const tablo = { kurum: sema.kurum, birim: sema.birim, program: sema.program, ders: sema.ders }[
        h.zincir.at(-1)?.tur ?? "kurum"
      ];
      const r = await tx.execute(sql`select count(*)::int as adet from ${tablo}`);
      return { zincir: h.zincir.length, r: r !== undefined };
    });
    return Response.json(kayit);
  });

beforeAll(async () => {
  o = await testOrtami();
  aKavanoz = (await sihirliGiris(o, o.a.yoneticiEposta)).kavanoz;
  aBaglam = await istekBaglami(o.k, istek("/", { kavanoz: aKavanoz }));
  aAnahtar = (
    await apiAnahtariOlustur(o.k, aBaglam, {
      ad: "deneme",
      kapsam: ["kanit.oku"],
      bitis: new Date(Date.now() + 30 * 24 * 3600 * 1000),
    })
  ).anahtar;
}, 60_000);
afterAll(() => o.kapat());

describe("uçtan uca kiracı yalıtımı", () => {
  it("A kendi kurumunun her düzeyini okuyabilir (oturum ve anahtar)", async () => {
    const uc = okuma();
    for (const [tur, id] of [
      ["kurum", o.a.kurumId],
      ["birim", o.a.birimId],
      ["program", o.a.programId],
      ["ders", o.a.dersId],
    ] as const) {
      expect((await uc(istek(`/v/${tur}/${id}`, { kavanoz: aKavanoz }))).status, tur).toBe(200);
      expect((await uc(istek(`/v/${tur}/${id}`, { anahtar: aAnahtar }))).status, tur).toBe(200);
    }
  });

  it("A, B'nin kurum, birim, program ve dersine oturumla da anahtarla da erişemez (404, varlık sızmaz)", async () => {
    const uc = okuma();
    for (const [tur, id] of [
      ["kurum", o.b.kurumId],
      ["birim", o.b.birimId],
      ["program", o.b.programId],
      ["ders", o.b.dersId],
    ] as const) {
      const y1 = await uc(istek(`/v/${tur}/${id}`, { kavanoz: aKavanoz }));
      const y2 = await uc(istek(`/v/${tur}/${id}`, { anahtar: aAnahtar }));
      expect([y1.status, y2.status], tur).toEqual([404, 404]);
      expect(await y1.json()).toEqual({ hata: "Aradığınız kayıt bulunamadı." });
    }
  });

  it("A, kurum seçme başlığıyla B'ye geçemez", async () => {
    const y = await okuma()(
      istek(`/v/kurum/${o.b.kurumId}`, { kavanoz: aKavanoz, basliklar: { "x-akredit-kurum": KURUM_B } }),
    );
    expect(y.status).toBe(403);
  });

  it("A'nın bağlamında hiçbir kiracı tablosunda B'nin satırı görünmez", async () => {
    const tablolar = (
      (await o.db.execute(
        sql`select table_name from information_schema.columns where table_schema='public' and column_name='kurum_id'`,
      )) as unknown as { rows: { table_name: string }[] }
    ).rows.map((x) => x.table_name);
    expect(tablolar.length).toBeGreaterThan(30);
    const b = await istekBaglami(o.k, istek("/", { kavanoz: aKavanoz }));
    await kiraciIslemi(o.k.db, b.kisi.kurumId, async (tx) => {
      for (const t of [...tablolar, "kurum"]) {
        const sutun = t === "kurum" ? "id" : "kurum_id";
        const r = (await tx.execute(
          sql.raw(`select count(*)::int as adet from ${t} where ${sutun} = '${KURUM_B}'`),
        )) as unknown as { rows: { adet: number }[] };
        expect(r.rows[0]?.adet, t).toBe(0);
      }
    });
    // Sahip bağlantısında B'nin verisi gerçekten var (test boş geçmiyor).
    const sahip = (await o.db.execute(
      sql.raw(`select count(*)::int as adet from program where kurum_id = '${KURUM_B}'`),
    )) as unknown as { rows: { adet: number }[] };
    expect(sahip.rows[0]?.adet).toBe(1);
  });

  it("uygulama rolü kimlik tablolarını (oturum, anahtar özetleri) okuyamaz", async () => {
    for (const t of ["kimlik_oturum", "kimlik_api_anahtari", "kimlik_uyelik", "kimlik_davet", "kimlik_hesap"]) {
      await expect(
        kiraciIslemi(o.db, o.a.kurumId, (tx) => tx.execute(sql.raw(`select * from ${t}`))),
        t,
      ).rejects.toThrow();
    }
  });

  it("A yöneticisi B'nin kapsamına davet ya da rol atayamaz", async () => {
    await expect(
      davetOlustur(o.k, aBaglam, {
        adSoyad: "Deneme Kişi",
        eposta: "kisi@a.ornek.edu.tr",
        rol: "gozlemci",
        kapsam: { tur: "program", id: o.b.programId },
      }),
    ).rejects.toMatchObject({ durum: 404 });
    await expect(
      rolAta(o.k, aBaglam, o.b.yoneticiKisiId, "gozlemci", { tur: "kurum", id: o.a.kurumId }, null),
    ).rejects.toMatchObject({ durum: 404 });
  });

  it("A'nın anahtarı kapsamı dışındaki eylemi yapamaz; yöneticinin rolü olsa da", async () => {
    const b = await istekBaglami(o.k, istek("/", { anahtar: aAnahtar }));
    await expect(
      yetkiliIs(o.k, b, "rapor.duzenle", { tur: "kurum", id: o.a.kurumId }, async () => 1),
    ).rejects.toMatchObject({ durum: 403 });
    // Anahtarla yönetim işlemi yapılamaz.
    await expect(
      apiAnahtariOlustur(o.k, b, { ad: "x", kapsam: ["kanit.oku"], bitis: new Date(Date.now() + 1e9) }),
    ).rejects.toMatchObject({ durum: 403 });
    expect(kurumHedefi(o.a.kurumId).kurumId).toBe(o.a.kurumId);
  });

  it("geçersiz anahtar ve oturumsuz istek 401", async () => {
    const uc = okuma();
    expect((await uc(istek(`/v/kurum/${o.a.kurumId}`, { anahtar: `${aAnahtar.slice(0, -2)}zz` }))).status).toBe(401);
    expect((await uc(istek(`/v/kurum/${o.a.kurumId}`))).status).toBe(401);
  });

  it("çerezli durum değiştiren istek yabancı kökenden gelirse reddedilir (CSRF)", async () => {
    const uc = okuma();
    const y = await uc(
      istek(`/v/kurum/${o.a.kurumId}`, { kavanoz: aKavanoz, yontem: "POST", koken: "https://kotu.example" }),
    );
    expect(y.status).toBe(403);
    const y2 = await uc(istek(`/v/kurum/${o.a.kurumId}`, { kavanoz: aKavanoz, yontem: "POST", koken: null }));
    expect(y2.status).toBe(403);
    const y3 = await uc(istek(`/v/kurum/${o.a.kurumId}`, { kavanoz: aKavanoz, yontem: "POST" }));
    expect(y3.status).toBe(200);
  });
});
