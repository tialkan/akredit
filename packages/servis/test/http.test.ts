// `/api/v1` işleyicisi: her uç için yetkisiz erişim (oturumsuz 401, başka kurum 404/sızıntısız, rolsüz 403 ya
// da boş liste, kapsamı dar API anahtarı), doğrulama, hız sınırı, idempotens.

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Aktor } from "../src/baglam.ts";
import { HizSiniri } from "../src/http/hiz.ts";
import { apiIsleyici } from "../src/http/isleyici.ts";
import { vtTekrarDeposu } from "../src/http/tekrar.ts";
import { UCLAR } from "../src/http/uclar.ts";
import * as odr from "../src/odr/index.ts";
import { type Ornek, ortam, SIMDI } from "./yardimci.ts";

let o: Awaited<ReturnType<typeof ortam>>;
// Test için uydurma takma ad anahtarı (32 bayttan uzun).
process.env.AKREDIT_TAKMA_AD_ANAHTARI ??= "deneme-anahtari-yalniz-test-icin-0123456789";
let odrRaporId = "";
beforeAll(async () => {
  o = await ortam();
  const y = await aktor(o.a, o.a.yonetici);
  odrRaporId = (
    await odr.olustur(
      { db: o.db, aktor: y, simdi: () => SIMDI },
      { programId: o.a.programId, cerceveKod: "akredit-onlisans-ic" },
    )
  ).raporId;
});
afterAll(async () => {
  await o.kapat();
});

const aktor = async (x: Ornek, kisi: string, tur: Aktor["tur"] = "oturum", kapsam: Aktor["anahtarKapsami"] = null) =>
  (await o.baglam(x, kisi, tur, kapsam)).aktor;

function istek(yontem: string, yol: string, govde?: unknown, basliklar: Record<string, string> = {}) {
  return new Request(`http://akredit.test/api/v1${yol}`, {
    method: yontem,
    headers: { "content-type": "application/json", ...basliklar },
    ...(govde === undefined ? {} : { body: JSON.stringify(govde) }),
  });
}

/** Her uç için A kurumuna ait örnek istek. */
function ornekIstek(ad: string, a: Ornek): { yol: string; govde?: unknown } {
  const g: Record<string, { yol: string; govde?: unknown }> = {
    ben: { yol: "/ben" },
    panelOzeti: { yol: "/panel" },
    kanitlar: { yol: "/kanitlar" },
    kanit: { yol: `/kanitlar/${a.kanitDers}` },
    kanitHatti: { yol: "/kanit-hatti" },
    bekleyenOneriler: { yol: "/oneriler" },
    bekleyenSayisi: { yol: "/oneriler/sayac" },
    insanDakikasi: { yol: "/olcum/insan-dakikasi" },
    kararlar: { yol: "/kararlar" },
    kararVer: { yol: "/kararlar", govde: { oneriId: a.oneriOrta2, sonuc: "onaylandi" } },
    topluKararVer: { yol: "/kararlar/toplu", govde: { oneriIdleri: [a.oneriOrta2] } },
    programlar: { yol: "/programlar" },
    program: { yol: `/programlar/${a.programId}` },
    dersler: { yol: "/dersler" },
    ders: { yol: `/dersler/${a.dersId}` },
    raporlar: { yol: "/raporlar" },
    rapor: { yol: `/raporlar/${a.raporId}` },
    surecler: { yol: "/surecler" },
    ayarlar: { yol: "/ayarlar" },
    ayarlariGuncelle: { yol: "/ayarlar", govde: { yurtDisiIzni: true } },
    politikalar: { yol: "/politikalar" },
    politikaTaslagiOlustur: {
      yol: "/politikalar",
      govde: { ad: "P", oneriTurleri: ["kanit_etiketi"], enYuksekRisk: "dusuk", enDusukGuven: 0.8 },
    },
    politikaImzala: { yol: `/politikalar/${a.kanitDers}/imza`, govde: { imzalayanAd: "Deneme Rolsüz A" } },
    politikaIptal: { yol: `/politikalar/${a.kanitDers}/iptal`, govde: {} },
    gunluk: { yol: "/gunluk" },
    bolognaOku: { yol: `/bologna/programlar/${a.programId}/okumalar`, govde: { adres: "https://obs.ornek.edu.tr/" } },
    bolognaDenetimi: { yol: `/bologna/programlar/${a.programId}/denetim` },
    bolognaTaslagiUret: { yol: "/bologna/taslaklar", govde: { dersId: a.dersId, beyan: "Proje var." } },
    bolognaGecmisi: { yol: `/bologna/dersler/${a.dersId}/gecmis` },
    bolognaYazmaPlani: {
      yol: `/bologna/taslaklar/${a.oneriYuksek}/yazma-plani`,
      govde: { adres: "https://obs.ornek.edu.tr/ders" },
    },
    bolognaYazmaBaslat: { yol: `/bologna/yazma-planlari/${a.oneriYuksek}/baslat`, govde: {} },
    bolognaYazmaBitir: { yol: `/bologna/yazma-planlari/${a.oneriYuksek}/bitir`, govde: { sonuc: "tamamlandi" } },
    dersinDosyalari: { yol: `/dersler/${a.dersId}/ders-dosyasi` },
    dokumAktar: {
      yol: "/ders-dosyasi/dokum",
      govde: {
        dersAcilisiId: a.dersAcilisiId,
        araclar: [
          {
            ad: "Vize",
            tur: "ara_sinav",
            agirlik: 40,
            dosyaAdi: "vize.csv",
            icerikBase64: Buffer.from("Öğrenci No;S1 (10)\n1001;7\n").toString("base64"),
          },
        ],
      },
    },
    dersDosyasiDurumu: { yol: `/ders-dosyasi/${a.dersAcilisiId}` },
    dersDosyasiOlustur: { yol: `/ders-dosyasi/${a.dersAcilisiId}/olustur`, govde: {} },
    dersDosyasiBelgesi: { yol: `/ders-dosyasi/${a.dersAcilisiId}/belge?bicim=docx` },
    odrOlustur: { yol: "/odr", govde: { programId: a.programId, cerceveKod: "akredit-onlisans-ic" } },
    programinOdrleri: { yol: `/programlar/${a.programId}/odr` },
    odrDurumu: { yol: `/odr/${odrRaporId}` },
    odrEksikleri: { yol: `/odr/${odrRaporId}/eksikler`, govde: {} },
    odrBelgesi: { yol: `/odr/${odrRaporId}/belge?bicim=docx` },
  };
  const s = g[ad];
  if (!s) throw new Error(`örnek istek yok: ${ad}`);
  return s;
}

/** Rolsüz kişinin beklenen yanıtı: kayda ya da kurum düzeyi işleme 403; listeler 200 ama boş. */
const ROLSUZ_200 = new Set([
  "ben",
  "panelOzeti",
  "kanitlar",
  "kanitHatti",
  "bekleyenOneriler",
  "bekleyenSayisi",
  "kararlar",
  "programlar",
  "dersler",
  "raporlar",
  "surecler",
]);

describe("her uç için yetkisiz erişim", () => {
  const isle = () => apiIsleyici({ db: o.db, simdi: () => SIMDI });

  it("uç listesi tam: örnek istek her uç için var", () => {
    for (const u of UCLAR) expect(() => ornekIstek(u.ad, o.a), u.ad).not.toThrow();
  });

  it.each(UCLAR.map((u) => [u.ad, u] as const))("%s: oturum yoksa 401", async (_ad, u) => {
    const s = ornekIstek(u.ad, o.a);
    const y = await isle()(istek(u.yontem, s.yol, s.govde), null);
    expect(y.status).toBe(401);
    expect(await y.json()).toMatchObject({ kod: "oturum_yok", hata: expect.stringContaining("giriş") });
  });

  it.each(UCLAR.map((u) => [u.ad, u] as const))("%s: rolsüz kişi 403 ya da boş liste", async (_ad, u) => {
    const s = ornekIstek(u.ad, o.a);
    const y = await isle()(istek(u.yontem, s.yol, s.govde), await aktor(o.a, o.a.rolsuz));
    if (!ROLSUZ_200.has(u.ad)) {
      expect(y.status, await y.clone().text()).toBe(403);
      expect(await y.json()).toMatchObject({ kod: "yetki_yok" });
      return;
    }
    expect(y.status).toBe(200);
    const govde = JSON.stringify(await y.json());
    // Rolsüz kişi kendi adı dışında A kurumunun hiçbir kaydını görmez.
    for (const id of [o.a.kanitDers, o.a.kanitKurum, o.a.oneriOrta, o.a.programId, o.a.dersId, o.a.raporId])
      expect(govde).not.toContain(id);
  });

  it.each(UCLAR.map((u) => [u.ad, u] as const))("%s: başka kurumun kişisi A'nın verisini göremez", async (_ad, u) => {
    const s = ornekIstek(u.ad, o.a);
    const y = await isle()(istek(u.yontem, s.yol, s.govde), await aktor(o.b, o.b.yonetici));
    const govde = await y.text();
    if (
      s.yol.match(/[0-9a-f]{8}-/u) ||
      u.ad === "kararVer" ||
      u.ad === "topluKararVer" ||
      u.ad === "bolognaTaslagiUret" ||
      u.ad === "dokumAktar" ||
      u.ad === "odrOlustur"
    ) {
      expect(y.status, govde).toBe(404);
    } else expect(y.status, govde).toBeLessThan(300);
    for (const id of [o.a.kurumId, o.a.kanitDers, o.a.oneriOrta, o.a.programId, o.a.dersId, o.a.raporId])
      expect(govde).not.toContain(id);
  });

  it("kapsamı yalnız kanıt okuma olan API anahtarı karar veremez, ayar değiştiremez", async () => {
    const a = await aktor(o.a, o.a.yonetici, "anahtar", ["kanit.oku"]);
    const k = ornekIstek("kararVer", o.a);
    expect((await isle()(istek("POST", k.yol, k.govde), a)).status).toBe(403);
    expect((await isle()(istek("PATCH", "/ayarlar", { yurtDisiIzni: true }), a)).status).toBe(403);
    expect((await isle()(istek("GET", "/kanitlar"), a)).status).toBe(200);
  });
});

describe("istek kuralları", () => {
  it("doğrulama hatası: 400, Türkçe ileti ve alan ayrıntısı", async () => {
    const isle = apiIsleyici({ db: o.db, simdi: () => SIMDI });
    const y = await isle(
      istek("POST", "/kararlar", { oneriId: "yok", sonuc: "belki" }),
      await aktor(o.a, o.a.yonetici),
    );
    expect(y.status).toBe(400);
    const g = (await y.json()) as { kod: string; hata: string; alanlar: { alan: string }[] };
    expect(g.kod).toBe("gecersiz_istek");
    expect(g.alanlar.map((x) => x.alan).sort()).toEqual(["oneriId", "sonuc"]);
    const bozuk = await isle(
      new Request("http://akredit.test/api/v1/kararlar", { method: "POST", body: "{" }),
      await aktor(o.a, o.a.yonetici),
    );
    expect(await bozuk.json()).toMatchObject({ kod: "gecersiz_istek", hata: expect.stringContaining("JSON") });
    const sayfa = await isle(istek("GET", "/kanitlar?sinir=500"), await aktor(o.a, o.a.yonetici));
    expect(sayfa.status).toBe(400);
  });

  it("bilinmeyen adres 404, desteklenmeyen yöntem 400", async () => {
    const isle = apiIsleyici({ db: o.db });
    const a = await aktor(o.a, o.a.yonetici);
    expect((await isle(istek("GET", "/yok"), a)).status).toBe(404);
    expect((await isle(istek("POST", "/programlar", {}), a)).status).toBe(400);
  });

  it("hız sınırı: kapasite aşılınca 429 ve Retry-After", async () => {
    let t = 0;
    const isle = apiIsleyici({ db: o.db, hiz: new HizSiniri({ kapasite: 2, saniyede: 1, simdi: () => t }) });
    const a = await aktor(o.a, o.a.yonetici);
    expect((await isle(istek("GET", "/ben"), a)).status).toBe(200);
    expect((await isle(istek("GET", "/ben"), a)).status).toBe(200);
    const y = await isle(istek("GET", "/ben"), a);
    expect(y.status).toBe(429);
    expect(y.headers.get("retry-after")).toBe("1");
    expect(await y.json()).toMatchObject({ kod: "cok_fazla_istek" });
    // Başka kişinin kovası ayrı; 1 saniye sonra yeniden izin.
    expect((await isle(istek("GET", "/ben"), await aktor(o.a, o.a.ogretim))).status).toBe(200);
    t = 1000;
    expect((await isle(istek("GET", "/ben"), a)).status).toBe(200);
  });

  it("idempotens: aynı anahtarla tekrar eden karar bir kez kaydedilir, aynı yanıt döner", async () => {
    const isle = apiIsleyici({ db: o.db, simdi: () => SIMDI, tekrar: vtTekrarDeposu(o.db) });
    const a = await aktor(o.a, o.a.ogretim);
    const govde = { oneriId: o.a.oneriDusuk, sonuc: "onaylandi" };
    const b = { "idempotency-key": "karar-0001-deneme" };
    const y1 = await isle(istek("POST", "/kararlar", govde, b), a);
    expect(y1.status).toBe(201);
    const k1 = await y1.json();
    const y2 = await isle(istek("POST", "/kararlar", govde, b), a);
    expect(y2.status).toBe(201);
    expect(y2.headers.get("idempotent-replayed")).toBe("true");
    expect(await y2.json()).toEqual(k1);
    // Anahtarsız ikinci istek: çakışma (karar tekildir).
    expect((await isle(istek("POST", "/kararlar", govde), a)).status).toBe(409);
    // Aynı anahtar başka gövdeyle: 422.
    const y3 = await isle(istek("POST", "/kararlar", { ...govde, sonuc: "reddedildi" }, b), a);
    expect(y3.status).toBe(422);
    // Geçersiz anahtar biçimi: 400.
    expect((await isle(istek("POST", "/kararlar", govde, { "idempotency-key": "kisa" }), a)).status).toBe(400);
  });

  it("toplu onayda yüksek risk API'de de reddedilir (422), hiçbiri kaydedilmez", async () => {
    const isle = apiIsleyici({ db: o.db, simdi: () => SIMDI });
    const a = await aktor(o.a, o.a.yonetici);
    const y = await isle(istek("POST", "/kararlar/toplu", { oneriIdleri: [o.a.oneriOrta, o.a.oneriYuksek] }), a);
    expect(y.status).toBe(422);
    expect(await y.json()).toMatchObject({ kod: "kural_ihlali", hata: expect.stringContaining("Yüksek riskli") });
    const k = (await (await isle(istek("GET", "/kararlar"), a)).json()) as { ogeler: { oneriId: string }[] };
    expect(k.ogeler.map((x) => x.oneriId)).not.toContain(o.a.oneriOrta);
  });
});
