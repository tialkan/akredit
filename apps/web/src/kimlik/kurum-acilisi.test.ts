// İP-35 uçtan uca (tarayıcısız): başvuru → doğrulama e-postası → kurum açılışı → giriş bağlantısı → oturum →
// kurulum uçları → hocaların daveti. Adlar ve adresler uydurmadır.

import { sema } from "@akredit/vt";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { kurulumIsleyici } from "./kurulum-uclari.ts";
import { basvuruIsle, dogrulamaIsle } from "./kurum-acilisi.ts";
import { ADRES, CerezKavanozu, kimlikIstegi, type TestOrtami, testOrtami } from "./test-yardimci.ts";

let o: TestOrtami;
beforeAll(async () => {
  o = await testOrtami();
});
afterAll(async () => {
  await o.kapat();
});

const BASVURU = {
  kurumAdi: "Uydurma Bilim Üniversitesi",
  alanAdi: "ubu.edu.tr",
  yoneticiAdi: "Deneme Kurucu",
  eposta: "kurucu@ubu.edu.tr",
};

function postIstegi(yol: string, govde: unknown, s: { koken?: string; kavanoz?: CerezKavanozu; yontem?: string } = {}) {
  const h = new Headers({ "content-type": "application/json", origin: s.koken ?? ADRES });
  if (s.kavanoz) h.set("cookie", s.kavanoz.baslik());
  return new Request(`${ADRES}${yol}`, { method: s.yontem ?? "POST", headers: h, body: JSON.stringify(govde) });
}

describe("kurum açılışı (web)", () => {
  let belirtec = "";
  const kavanoz = new CerezKavanozu();

  it("başka kökenden başvuru reddedilir; bal küpü ve çok hızlı gönderim sessizce yok sayılır", async () => {
    const r = postIstegi("/api/kurum-acilisi", {}, { koken: "https://kotu.example" });
    expect((await basvuruIsle(o.k, r, { ...BASVURU, acilis: 0 })).durum).toBe(403);
    const bal = await basvuruIsle(o.k, postIstegi("/x", {}), { ...BASVURU, webSitesi: "x", acilis: 0 });
    expect(bal.durum).toBe(202);
    const hizli = await basvuruIsle(o.k, postIstegi("/x", {}), { ...BASVURU, acilis: Date.now() });
    expect(hizli.durum).toBe(202);
    expect(o.eposta.kutu.filter((x) => x.tur === "kurum_acilisi")).toHaveLength(0);
  });

  it("başvuru doğrulama bağlantısını yalnız yöneticinin kurumsal e-postasına gönderir", async () => {
    const y = await basvuruIsle(o.k, postIstegi("/x", {}), { ...BASVURU, acilis: Date.now() - 5000 });
    expect(y).toEqual({ durum: 202, govde: { tamam: true } });
    const e = o.eposta.kutu.filter((x) => x.tur === "kurum_acilisi");
    expect(e.map((x) => x.alici)).toEqual(["kurucu@ubu.edu.tr"]);
    belirtec = new URL(e[0]?.baglanti as string).searchParams.get("b") as string;
    expect(belirtec.length).toBeGreaterThan(20);
    const yanlis = await basvuruIsle(o.k, postIstegi("/x", {}), {
      ...BASVURU,
      eposta: "kurucu@gmail.com",
      acilis: Date.now() - 5000,
    });
    expect(yanlis.durum).toBe(400);
  });

  it("doğrulama kurumu açar ve giriş bağlantısı gönderir; giriş kurulum sihirbazına götürür", async () => {
    const y = await dogrulamaIsle(o.k, postIstegi("/x", {}), { belirtec });
    expect(y.durum).toBe(201);
    expect(y.govde).toMatchObject({ kurumAdi: "Uydurma Bilim Üniversitesi", girisGonderildi: true });
    const giris = o.eposta.kutu.filter((x) => x.tur === "sihirli" && x.alici === "kurucu@ubu.edu.tr").at(-1);
    expect(giris?.baglanti).toContain("callbackURL=%2Fkurulum");
    const d = await kimlikIstegi(o.k, giris?.baglanti as string, { kavanoz });
    expect([200, 302]).toContain(d.status);
    expect(kavanoz.cerezler.size).toBeGreaterThan(0);
    expect((await dogrulamaIsle(o.k, postIstegi("/x", {}), { belirtec })).durum).toBe(404);
  });

  it("kurulum uçları oturumla çalışır: durum, birim, program, davet", async () => {
    const isle = kurulumIsleyici(o.k, o.db);
    const al = async (yol: string) => {
      const h = new Headers({ cookie: kavanoz.baslik(), origin: ADRES });
      return isle(new Request(`${ADRES}/api/kurulum/${yol}`, { headers: h }));
    };
    const gonder = async (yol: string, govde: unknown, yontem = "POST") =>
      isle(postIstegi(`/api/kurulum/${yol}`, govde, { kavanoz, yontem }));

    const durum = await al("durum");
    expect(durum.status).toBe(200);
    expect(await durum.json()).toMatchObject({ kurumAdi: "Uydurma Bilim Üniversitesi", alanAdi: "ubu.edu.tr" });
    // Oturumsuz istek 401.
    expect((await isle(new Request(`${ADRES}/api/kurulum/durum`))).status).toBe(401);
    // Başka kökenden durum değiştiren istek 403.
    expect(
      (
        await isle(
          postIstegi("/api/kurulum/birimler", { ad: "X", tur: "myo" }, { kavanoz, koken: "https://kotu.example" }),
        )
      ).status,
    ).toBe(403);

    const birim = (await (await gonder("birimler", { ad: "Uydurma MYO", tur: "myo" })).json()) as { id: string };
    const program = (await (
      await gonder("programlar", { birimId: birim.id, ad: "Uydurma Programcılığı", duzey: "onlisans" })
    ).json()) as { id: string };
    const duz = await gonder(`programlar/${program.id}`, { ad: "Uydurma Programcılık" }, "PATCH");
    expect(await duz.json()).toEqual({ degisen: ["ad"] });
    const gecmis = (await (await al(`programlar/${program.id}/duzeltmeler`)).json()) as unknown[];
    expect(gecmis).toHaveLength(1);
    const hatali = await gonder("programlar", { birimId: birim.id, ad: "", duzey: "onlisans" });
    expect(hatali.status).toBe(400);

    const davet = await gonder("davet", {
      programId: program.id,
      hocalar: [
        { adSoyad: "Kurgu Örnekoğlu", eposta: "kurgu@ubu.edu.tr" },
        { adSoyad: "Deneme Hoca", eposta: "Deneme@ubu.edu.tr" },
        { adSoyad: "Kurgu Örnekoğlu", eposta: "kurgu@ubu.edu.tr" },
      ],
    });
    expect(await davet.json()).toEqual({ gonderilen: 2, hatalar: [] });
    const davetler = o.eposta.kutu.filter((x) => x.tur === "davet");
    expect(davetler.map((x) => x.alici).sort()).toEqual(["deneme@ubu.edu.tr", "kurgu@ubu.edu.tr"]);
    expect(davetler.every((x) => x.baglanti?.startsWith(`${ADRES}/davet?b=`))).toBe(true);
    const kayit = await o.db.select().from(sema.kimlikDavet).where(eq(sema.kimlikDavet.eposta, "kurgu@ubu.edu.tr"));
    expect(kayit[0]).toMatchObject({ rol: "ogretim_elemani", kapsamTuru: "program", kapsamId: program.id });
    // Davet belirteci yalnız özetiyle saklanır.
    const b = new URL(davetler[0]?.baglanti as string).searchParams.get("b") as string;
    expect(JSON.stringify(kayit)).not.toContain(b);
  });

  it("başka kurumun yöneticisi yeni kurumun birimlerini göremez", async () => {
    const { sihirliGiris } = await import("./test-yardimci.ts");
    const { kavanoz: baska } = await sihirliGiris(o, o.a.yoneticiEposta);
    const isle = kurulumIsleyici(o.k, o.db);
    const y = await isle(
      new Request(`${ADRES}/api/kurulum/birimler`, { headers: { cookie: baska.baslik(), origin: ADRES } }),
    );
    expect(y.status).toBe(200);
    expect(JSON.stringify(await y.json())).not.toContain("Uydurma MYO");
  });
});
