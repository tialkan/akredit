// Demo oturumu (İP-41): gerçek kimlik katmanı, göçlenmiş PGlite, iki gerçek kurum (A, B) ve bir demo nesli.

import { demoNesliYukle } from "@akredit/ornek-veri/yukle";
import { HizSiniri, oneri } from "@akredit/servis";
import { kiraciIslemi, sema } from "@akredit/vt";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { aktorOlustur } from "../app/api/_ortak/v1.ts";
import { baglamYetkiliMi, ErisimHatasi, istekBaglami, yetkiliIs } from "../kimlik/erisim.ts";
import { ADRES, CerezKavanozu, istek, kimlikIstegi, type TestOrtami, testOrtami } from "../kimlik/test-yardimci.ts";
import { apiAnahtariOlustur, davetOlustur, topluIceAktar } from "../kimlik/yonetim.ts";
import { demoOturumuAc, imzaliCerezDegeri } from "./oturum.ts";
import { DEMO_EYLEMLERI, DEMO_ROL_BILGISI, DEMO_ROLLERI, DEMO_SURESI_MS, demoRoluMu } from "./roller.ts";
import { demoAcikMi, demoUcu } from "./uc.ts";

let o: TestOrtami;
let demo: string;
// Better Auth oturum süresini gerçek saatle denetler; test saati de gerçek saatten başlar.
let saat = new Date();

beforeAll(async () => {
  o = await testOrtami({ simdi: () => saat });
  demo = (await demoNesliYukle(o.db, { ogrenciSayisi: 200 })).kurumId;
}, 300_000);
afterAll(async () => o.kapat());

/** Demo oturumu açar; çerezli kavanoz döndürür. */
async function demoGiris(rol: (typeof DEMO_ROLLERI)[number]) {
  const d = await demoOturumuAc(o.k, rol);
  const kavanoz = new CerezKavanozu();
  kavanoz.al(new Response(null, { headers: { "set-cookie": d.cerez } }));
  return { d, kavanoz };
}

describe("demo rolleri", () => {
  it("beş rol, her birinde 3-5 adımlı tur ve düğme metni", () => {
    expect(DEMO_ROLLERI).toHaveLength(5);
    for (const r of DEMO_ROLLERI) {
      const b = DEMO_ROL_BILGISI[r];
      expect(b.tur.length).toBeGreaterThanOrEqual(3);
      expect(b.tur.length).toBeLessThanOrEqual(5);
      for (const a of b.tur) expect(a.yol.startsWith("/panel")).toBe(true);
    }
    expect(demoRoluMu("rektorluk")).toBe(true);
    expect(demoRoluMu("kurum_yoneticisi")).toBe(false);
  });

  it("demo izinleri yalnız okuma ve karar; yükleme, davet, ayar, anahtar yok", () => {
    expect([...DEMO_EYLEMLERI].sort()).toEqual(
      ["gunluk.oku", "kanit.oku", "karar.ver", "olcme.oku", "oneri.oku", "rapor.oku"].sort(),
    );
  });

  it("uç yalnız AKREDIT_DEMO=1 iken açık", () => {
    expect(demoAcikMi({ AKREDIT_DEMO: "1" })).toBe(true);
    expect(demoAcikMi({})).toBe(false);
  });

  it("çerez imzası Better Auth biçimindedir (bilinen örnek)", () => {
    // HMAC-SHA256("gizli", "abc") base64 = "oNQ7tdpn96nfBcYlsWWgmC3EGIZQqLglmeip97XTy6U=" (openssl ile doğrulandı).
    expect(imzaliCerezDegeri("abc", "gizli")).toBe(
      encodeURIComponent("abc.oNQ7tdpn96nfBcYlsWWgmC3EGIZQqLglmeip97XTy6U="),
    );
  });
});

describe("demo oturumu", () => {
  it("rolle demo kurumuna oturum açar; Better Auth oturumu tanır; izin sınırı ve rol uygulanır", async () => {
    const { d, kavanoz } = await demoGiris("rektorluk");
    expect(d.kurumId).toBe(demo);
    expect(d.bitis.getTime() - saat.getTime()).toBe(DEMO_SURESI_MS);
    expect(d.cerez).toMatch(/HttpOnly/u);
    const ses = await o.k.auth.api.getSession({ headers: new Headers({ cookie: kavanoz.baslik() }) });
    expect(ses?.user.email).toMatch(/@demo\.akredit\.invalid$/u);
    const b = await istekBaglami(o.k, istek("/api/v1/ben", { kavanoz }));
    expect(b.kisi.kurumId).toBe(demo);
    expect(b.demo?.rol).toBe("rektorluk");
    expect(b.anahtarKapsami).toEqual(DEMO_EYLEMLERI);
    const kurum = { kurumId: demo, zincir: [{ tur: "kurum" as const, id: demo }] };
    // Kurum yöneticisi şablonu bile demo sınırını aşamaz.
    expect(baglamYetkiliMi(b, "karar.ver", kurum, saat)).toBe(true);
    for (const e of [
      "kanit.yukle",
      "kullanici.davet_et",
      "kurum.ayar_yonet",
      "api_anahtari.yonet",
      "rapor.gonder",
    ] as const)
      expect(baglamYetkiliMi(b, e, kurum, saat), e).toBe(false);
  });

  it("gerçek kurumlara erişemez: kurum başlığıyla 403, A'nın dersi 404, demo bağlamında A/B satırı yok", async () => {
    const { kavanoz } = await demoGiris("kalite_komisyonu");
    await expect(
      istekBaglami(o.k, istek("/api/v1/ben", { kavanoz, basliklar: { "x-akredit-kurum": o.a.kurumId } })),
    ).rejects.toMatchObject({ durum: 403 });
    const b = await istekBaglami(o.k, istek("/api/v1/ben", { kavanoz }));
    await expect(
      yetkiliIs(o.k, b, "kanit.oku", { tur: "ders", id: o.a.dersId }, async () => "sızdı"),
    ).rejects.toMatchObject({ durum: 404 });
    await expect(
      yetkiliIs(o.k, b, "kanit.oku", { tur: "kurum", id: o.b.kurumId }, async () => "sızdı"),
    ).rejects.toBeInstanceOf(ErisimHatasi);
    await kiraciIslemi(o.db, b.kisi.kurumId, async (tx) => {
      for (const t of [sema.kurum, sema.birim, sema.program, sema.ders, sema.kisi, sema.rolAtamasi] as const) {
        const satirlar = (await tx.select().from(t)) as { kurumId?: string; id: string }[];
        expect(satirlar.length).toBeGreaterThan(0);
        for (const s of satirlar) expect(s.kurumId ?? s.id).toBe(demo);
      }
    });
  });

  it("demo oturumu kullanıcı ekleyemez, davet gönderemez, API anahtarı oluşturamaz", async () => {
    const { kavanoz } = await demoGiris("rektorluk");
    const b = await istekBaglami(o.k, istek("/api/v1/ben", { kavanoz }));
    await expect(
      davetOlustur(o.k, b, {
        adSoyad: "Deneme Kişi",
        eposta: "kisi@a.ornek.edu.tr",
        rol: "ogretim_elemani",
        kapsam: { tur: "kurum", id: demo },
      }),
    ).rejects.toMatchObject({ durum: 403 });
    await expect(topluIceAktar(o.k, b, "ad_soyad,eposta,rol\n")).rejects.toMatchObject({ durum: 403 });
    await expect(
      apiAnahtariOlustur(o.k, b, { ad: "x", kapsam: ["kanit.oku"], bitis: new Date(saat.getTime() + 86_400_000) }),
    ).rejects.toMatchObject({ durum: 403 });
  });

  it("öğretim elemanı kendi dersindeki öneriye karar verir; karar demo kurumunda ziyaretçi adıyla kalır", async () => {
    const { kavanoz } = await demoGiris("ogretim_elemani");
    const b = await istekBaglami(o.k, istek("/api/v1/ben", { kavanoz }));
    const sb = { db: o.db, aktor: aktorOlustur(b), simdi: () => saat };
    const bekleyen = await oneri.bekleyenOneriler(sb, { sinir: 100 });
    const eylem = bekleyen.ogeler.find((x) => x.tur === "eylem" && /Algoritma Analizi/u.test(x.konum));
    expect(eylem?.konum).toMatch(/Algoritma Analizi/u);
    const karar = await oneri.kararVer(sb, { oneriId: eylem?.id, sonuc: "onaylandi" });
    expect(karar.kararVeren).toBe(b.kisi.kisiId);
    const [kisi] = await kiraciIslemi(o.db, demo, (tx) =>
      tx.select().from(sema.kisi).where(eq(sema.kisi.id, b.kisi.kisiId)),
    );
    expect(kisi?.adSoyad).toBe("Ziyaretçi");
  });

  it("iki saat sonra oturum geçersizdir (401) ve rol ataması da bitmiştir", async () => {
    const { kavanoz } = await demoGiris("bolum_baskani");
    const once = await istekBaglami(o.k, istek("/api/v1/ben", { kavanoz }));
    const onceki = saat;
    saat = new Date(saat.getTime() + DEMO_SURESI_MS + 1000);
    try {
      await expect(istekBaglami(o.k, istek("/api/v1/ben", { kavanoz }))).rejects.toMatchObject({ durum: 401 });
      const atama = once.kisi.atamalar[0];
      expect(atama?.bitis?.getTime()).toBeLessThan(saat.getTime());
    } finally {
      saat = onceki;
    }
  });

  it("e-posta gönderilmez: ne oturum açılışında ne demo adresine sihirli bağlantı isteğinde", async () => {
    const once = o.eposta.kutu.length;
    const { kavanoz } = await demoGiris("dis_degerlendirici");
    const ses = await o.k.auth.api.getSession({ headers: new Headers({ cookie: kavanoz.baslik() }) });
    const y = await kimlikIstegi(o.k, "/api/kimlik/sign-in/magic-link", {
      govde: { email: ses?.user.email, callbackURL: "/panel" },
    });
    expect(y.status).toBe(200);
    expect(o.eposta.kutu.length).toBe(once);
  });

  it("ziyaretçi hesabı yalnız demo kurumuna üyedir", async () => {
    const { kavanoz } = await demoGiris("ogretim_elemani");
    const ses = await o.k.auth.api.getSession({ headers: new Headers({ cookie: kavanoz.baslik() }) });
    const uyelikler = await o.db
      .select()
      .from(sema.kimlikUyelik)
      .where(and(eq(sema.kimlikUyelik.kullaniciId, ses?.user.id as string)));
    expect(uyelikler.map((u) => u.bagliKurumId)).toEqual([demo]);
  });
});

describe("POST /api/deneyin", () => {
  const form = (rol: string, koken: string | null = ADRES, ip = "198.51.100.7") =>
    new Request(`${ADRES}/api/deneyin`, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "x-forwarded-for": ip,
        ...(koken ? { origin: koken } : {}),
      },
      body: new URLSearchParams({ rol }).toString(),
    });

  it("geçerli rolle panele yönlendirir ve oturum çerezi verir", async () => {
    const uc = demoUcu(o.k);
    const y = await uc(form("bolum_baskani"));
    expect(y.status).toBe(303);
    expect(y.headers.get("location")).toBe(`${ADRES}/panel?tur=1`);
    expect(y.headers.get("set-cookie")).toMatch(/^akredit\.session_token=/u);
  });

  it("köken yoksa ya da başka siteden geliyorsa 403; bilinmeyen rol hata sayfasına döner", async () => {
    const uc = demoUcu(o.k);
    expect((await uc(form("rektorluk", null))).status).toBe(403);
    expect((await uc(form("rektorluk", "https://kotu.example"))).status).toBe(403);
    const y = await uc(form("kurum_yoneticisi"));
    expect(y.headers.get("location")).toBe(`${ADRES}/deneyin?hata=rol`);
  });

  it("IP başına hız sınırı: sınır dolunca oturum açılmaz", async () => {
    const uc = demoUcu(o.k, { ipBasina: new HizSiniri({ kapasite: 2, saniyede: 0.0001, simdi: () => 0 }) });
    const sayi = async () =>
      (
        await o.db
          .select({ id: sema.kimlikUyelik.id })
          .from(sema.kimlikUyelik)
          .where(eq(sema.kimlikUyelik.bagliKurumId, demo))
      ).length;
    const once = await sayi();
    expect((await uc(form("rektorluk", ADRES, "203.0.113.9"))).headers.get("location")).toMatch(/\/panel/u);
    expect((await uc(form("rektorluk", ADRES, "203.0.113.9"))).headers.get("location")).toMatch(/\/panel/u);
    const ucuncu = await uc(form("rektorluk", ADRES, "203.0.113.9"));
    expect(ucuncu.headers.get("location")).toBe(`${ADRES}/deneyin?hata=cok`);
    expect(ucuncu.headers.get("set-cookie")).toBeNull();
    // Başka IP etkilenmez.
    expect((await uc(form("rektorluk", ADRES, "203.0.113.10"))).headers.get("location")).toMatch(/\/panel/u);
    expect(await sayi()).toBe(once + 3);
  });
});
