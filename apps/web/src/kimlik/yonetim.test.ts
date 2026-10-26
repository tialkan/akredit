import { kiraciIslemi, sema } from "@akredit/vt";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type IstekBaglami, istekBaglami, yetkiliIs } from "./erisim.ts";
import { type CerezKavanozu, istek, kimlikIstegi, sihirliGiris, type TestOrtami, testOrtami } from "./test-yardimci.ts";
import { apiAnahtariIptal, apiAnahtariOlustur, davetKabulEt, davetOlustur, topluIceAktar } from "./yonetim.ts";

let o: TestOrtami;
let yonetici: IstekBaglami;
let kavanoz: CerezKavanozu;
const GUN = 24 * 3600 * 1000;

beforeAll(async () => {
  o = await testOrtami();
  kavanoz = (await sihirliGiris(o, o.a.yoneticiEposta)).kavanoz;
  yonetici = await istekBaglami(o.k, istek("/", { kavanoz }));
}, 60_000);
afterAll(() => o.kapat());

const gunlukOku = () =>
  kiraciIslemi(o.db, o.a.kurumId, (tx) => tx.select().from(sema.gunluk).orderBy(sema.gunluk.sira));

describe("davet akışı", () => {
  it("yönetici başkanı davet eder; başkan girip kabul eder; başkan program sorumlusu davet eder", async () => {
    const d = await davetOlustur(o.k, yonetici, {
      adSoyad: "Deneme Başkan",
      eposta: "Baskan@a.ornek.edu.tr",
      rol: "kalite_komisyonu_baskani",
      kapsam: { tur: "kurum", id: o.a.kurumId },
    });
    expect(d.belirtec).toHaveLength(32);
    const [satir] = await o.db.select().from(sema.kimlikDavet).where(eq(sema.kimlikDavet.id, d.davetId));
    expect(satir?.belirtecOzeti).not.toContain(d.belirtec);

    const { kavanoz: bk } = await sihirliGiris(o, "baskan@a.ornek.edu.tr");
    // Davetsiz kabul öncesi bağlam yok.
    await expect(istekBaglami(o.k, istek("/", { kavanoz: bk }))).rejects.toMatchObject({ durum: 403 });
    const s = await davetKabulEt(o.k, istek("/", { kavanoz: bk }), d.belirtec);
    expect(s.kurumId).toBe(o.a.kurumId);
    const baskan = await istekBaglami(o.k, istek("/", { kavanoz: bk }));
    expect(baskan.kisi.atamalar.map((a) => a.rol)).toEqual(["kalite_komisyonu_baskani"]);
    // Aynı davet ikinci kez kullanılamaz.
    await expect(davetKabulEt(o.k, istek("/", { kavanoz: bk }), d.belirtec)).rejects.toMatchObject({ durum: 404 });

    // Başkan yönetici davet edemez, program sorumlusu davet edebilir.
    await expect(
      davetOlustur(o.k, baskan, {
        adSoyad: "Deneme Yönetici",
        eposta: "y2@a.ornek.edu.tr",
        rol: "kurum_yoneticisi",
        kapsam: { tur: "kurum", id: o.a.kurumId },
      }),
    ).rejects.toMatchObject({ durum: 403, message: "Bu rolü atama yetkiniz yok." });
    const d2 = await davetOlustur(o.k, baskan, {
      adSoyad: "Deneme Sorumlu",
      eposta: "sorumlu@a.ornek.edu.tr",
      rol: "program_sorumlusu",
      kapsam: { tur: "program", id: o.a.programId },
    });
    // Başka e-postayla giren kullanıcı bu daveti kabul edemez.
    await expect(davetKabulEt(o.k, istek("/", { kavanoz: bk }), d2.belirtec)).rejects.toMatchObject({ durum: 403 });
  });

  it("değerlendirici süresiz davet edilemez; süreli davetle salt okunur ve süre sonunda erişemez", async () => {
    await expect(
      davetOlustur(o.k, yonetici, {
        adSoyad: "Deneme Değerlendirici",
        eposta: "deg@dis.ornek.org",
        rol: "degerlendirici",
        kapsam: { tur: "program", id: o.a.programId },
      }),
    ).rejects.toMatchObject({ durum: 403 });
    const bitis = new Date(Date.now() + 30 * GUN);
    const d = await davetOlustur(o.k, yonetici, {
      adSoyad: "Deneme Değerlendirici",
      eposta: "deg@dis.ornek.org",
      rol: "degerlendirici",
      kapsam: { tur: "program", id: o.a.programId },
      rolBitis: bitis,
    });
    const { kavanoz: dk } = await sihirliGiris(o, "deg@dis.ornek.org");
    await davetKabulEt(o.k, istek("/", { kavanoz: dk }), d.belirtec);
    const b = await istekBaglami(o.k, istek("/", { kavanoz: dk }));
    expect(await yetkiliIs(o.k, b, "kanit.oku", { tur: "ders", id: o.a.dersId }, async () => "ok")).toBe("ok");
    await expect(
      yetkiliIs(o.k, b, "kanit.yukle", { tur: "ders", id: o.a.dersId }, async () => "ok"),
    ).rejects.toMatchObject({ durum: 403 });
    // Süre sonrasında aynı kişi okuyamaz (zamanı ileri alan sunucu).
    const ileri = { ...o.k, simdi: () => new Date(bitis.getTime() + 1) };
    await expect(
      yetkiliIs(ileri, b, "kanit.oku", { tur: "ders", id: o.a.dersId }, async () => "ok"),
    ).rejects.toMatchObject({ durum: 403 });
  });
});

describe("toplu içe aktarma", () => {
  it("tek hatalı satırda hiçbir şey kaydedilmez", async () => {
    const once = await kiraciIslemi(o.db, o.a.kurumId, (tx) => tx.select().from(sema.kisi));
    const r = await topluIceAktar(
      o.k,
      yonetici,
      "ad_soyad,eposta,rol,kapsam_turu,kapsam_kodu\nDeneme Bir,bir@a.ornek.edu.tr,ogretim_elemani,ders,ORNA101\nDeneme İki,iki@a.ornek.edu.tr,ogretim_elemani,ders,YOK999\n",
    );
    expect(r.hatalar).toEqual([{ satir: 3, ileti: "Kapsam kodu bulunamadı ya da birden çok kayıtla eşleşiyor." }]);
    const sonra = await kiraciIslemi(o.db, o.a.kurumId, (tx) => tx.select().from(sema.kisi));
    expect(sonra.length).toBe(once.length);
  });

  it("B'nin ders koduyla içe aktarma A'da bulunamaz", async () => {
    const r = await topluIceAktar(
      o.k,
      yonetici,
      "ad_soyad,eposta,rol,kapsam_turu,kapsam_kodu\nDeneme Bir,bir@a.ornek.edu.tr,ogretim_elemani,ders,ORNB101\n",
    );
    expect(r.hatalar).toHaveLength(1);
  });

  it("geçerli dosya kişi, rol ve üyelik oluşturur; kişi ilk girişinde bağlanır", async () => {
    const r = await topluIceAktar(
      o.k,
      yonetici,
      [
        "ad_soyad;eposta;rol;kapsam_turu;kapsam_kodu;unvan",
        "Deneme Bir;bir@a.ornek.edu.tr;ogretim_elemani;ders;ORNA101;Öğr. Gör.",
        "Deneme Bir;bir@a.ornek.edu.tr;gozlemci;birim;MYO-A;",
        "Deneme Üç;uc@a.ornek.edu.tr;program_sorumlusu;program;Program A;",
      ].join("\n"),
    );
    expect(r).toEqual({ eklenenKisi: 2, eklenenAtama: 3, hatalar: [] });
    const { kavanoz: k1 } = await sihirliGiris(o, "bir@a.ornek.edu.tr");
    const b = await istekBaglami(o.k, istek("/", { kavanoz: k1 }));
    expect(b.kisi.atamalar.map((a) => a.rol).sort()).toEqual(["gozlemci", "ogretim_elemani"]);
    // İçe aktarılan öğretim elemanı toplu içe aktarma yapamaz.
    await expect(topluIceAktar(o.k, b, "ad_soyad,eposta,rol,kapsam_turu,kapsam_kodu\n")).rejects.toMatchObject({
      durum: 403,
    });
  });
});

describe("API anahtarları", () => {
  it("yalnız özet saklanır; iptal sonrası anahtar çalışmaz", async () => {
    const { id, anahtar } = await apiAnahtariOlustur(o.k, yonetici, {
      ad: "CLI",
      kapsam: ["kanit.oku"],
      bitis: new Date(Date.now() + 10 * GUN),
    });
    const [kayit] = await o.db.select().from(sema.kimlikApiAnahtari).where(eq(sema.kimlikApiAnahtari.id, id));
    expect(JSON.stringify(kayit)).not.toContain(anahtar);
    expect((await istekBaglami(o.k, istek("/", { anahtar }))).tur).toBe("anahtar");
    await apiAnahtariIptal(o.k, yonetici, id);
    await expect(istekBaglami(o.k, istek("/", { anahtar }))).rejects.toMatchObject({ durum: 401 });
  });

  it("süresi dolan anahtar çalışmaz; kurum düzeyi izin verilemez", async () => {
    const { anahtar } = await apiAnahtariOlustur(o.k, yonetici, {
      ad: "kısa",
      kapsam: ["rapor.oku"],
      bitis: new Date(Date.now() + GUN),
    });
    const ileri = { ...o.k, simdi: () => new Date(Date.now() + 2 * GUN) };
    await expect(istekBaglami(ileri, istek("/", { anahtar }))).rejects.toMatchObject({ durum: 401 });
    await expect(
      apiAnahtariOlustur(o.k, yonetici, { ad: "x", kapsam: ["kurum.ayar_yonet"], bitis: new Date(Date.now() + GUN) }),
    ).rejects.toMatchObject({ durum: 403 });
  });
});

describe("kimlik olayları ve giriş bilgisi", () => {
  it("giriş, davet, içe aktarma, anahtar ve red olayları günlüğe yazılır", async () => {
    const eylemler = new Set((await gunlukOku()).map((g) => g.eylem));
    for (const e of [
      "kimlik.giris",
      "kimlik.davet_olusturuldu",
      "kimlik.davet_kabul_edildi",
      "kimlik.rol_atandi",
      "kimlik.toplu_ice_aktarma",
      "kimlik.api_anahtari_olusturuldu",
      "kimlik.api_anahtari_iptal_edildi",
      "kimlik.erisim_reddedildi",
    ])
      expect(eylemler, e).toContain(e);
  });

  it("günlükte, kütüphane kayıtlarında oturum belirteci, sihirli bağlantı, davet belirteci ya da anahtar yok", async () => {
    const gunluk = JSON.stringify(await gunlukOku());
    const gizliler: string[] = [];
    for (const v of kavanoz.cerezler.values()) gizliler.push(decodeURIComponent(v).split(".")[0] ?? "");
    for (const g of o.eposta.kutu) if (g.baglanti) gizliler.push(new URL(g.baglanti).searchParams.get("token") ?? "");
    const oturumlar = await o.db.select({ t: sema.kimlikOturum.token }).from(sema.kimlikOturum);
    gizliler.push(...oturumlar.map((x) => x.t));
    const d = await davetOlustur(o.k, yonetici, {
      adSoyad: "Deneme Dört",
      eposta: "dort@a.ornek.edu.tr",
      rol: "gozlemci",
      kapsam: { tur: "kurum", id: o.a.kurumId },
    });
    gizliler.push(d.belirtec);
    const { anahtar } = await apiAnahtariOlustur(o.k, yonetici, {
      ad: "son",
      kapsam: ["kanit.oku"],
      bitis: new Date(Date.now() + GUN),
    });
    gizliler.push(anahtar);
    const tum = JSON.stringify(await gunlukOku()) + gunluk + JSON.stringify(o.kayitlar);
    expect(gizliler.filter((x) => x.length >= 16).length).toBeGreaterThanOrEqual(5);
    for (const g of gizliler.filter((x) => x.length >= 16)) expect(tum).not.toContain(g);
    expect(tum).not.toMatch(/token=|password|parola"/u);
  });

  it("hesap tablosunda parola saklanamaz", async () => {
    const [k] = await o.db.select().from(sema.kimlikKullanici).limit(1);
    await expect(
      o.db.insert(sema.kimlikHesap).values({
        id: "deneme-hesap",
        accountId: "x",
        providerId: "credential",
        // biome-ignore lint/style/noNonNullAssertion: önceki testlerde kullanıcı oluştu.
        userId: k!.id,
        password: "uydurma",
      }),
    ).rejects.toThrow();
    const parolali = (await o.db.select().from(sema.kimlikHesap)).filter((h) => h.password !== null);
    expect(parolali).toEqual([]);
  });

  it("yeni ağ ve yeni cihazdan giriş şüpheli sayılır, bildirilir ve günlüğe yazılır", async () => {
    // İçe aktarılmış, daha önce hiç girmemiş kullanıcı (ilk giriş şüpheli sayılmaz).
    const eposta = "uc@a.ornek.edu.tr";
    const ua1 = "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/130.0 Safari/537.36";
    await sihirliGiris(o, eposta, { "user-agent": ua1, "x-forwarded-for": "192.0.2.10" });
    await sihirliGiris(o, eposta, { "user-agent": ua1, "x-forwarded-for": "192.0.2.20" });
    expect(o.eposta.kutu.filter((x) => x.tur === "supheli")).toHaveLength(0);
    await sihirliGiris(o, eposta, {
      "user-agent": "Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0",
      "x-forwarded-for": "198.51.100.7",
    });
    expect(o.eposta.kutu.filter((x) => x.tur === "supheli").map((x) => x.alici)).toEqual([eposta]);
    expect((await gunlukOku()).some((g) => g.eylem === "kimlik.supheli_giris")).toBe(true);
    // IP adresi saklanmaz, yalnız ağ özeti.
    const izler = JSON.stringify(await o.db.select().from(sema.kimlikGirisIzi));
    expect(izler).not.toContain("198.51.100");
  });

  it("çıkış oturumu sonlandırır", async () => {
    const { kavanoz: k } = await sihirliGiris(o, o.a.yoneticiEposta);
    const y = await kimlikIstegi(o.k, "/api/kimlik/sign-out", { govde: {}, kavanoz: k });
    expect(y.status).toBe(200);
    await expect(istekBaglami(o.k, istek("/", { kavanoz: k }))).rejects.toMatchObject({ durum: 401 });
  });
});
