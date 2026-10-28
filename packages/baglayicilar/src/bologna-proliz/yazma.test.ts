// Proliz'e geri yazma (İP-38). Birim testleri bellek sayfasıyla; uçtan uca test kayıtlı sahte Proliz sayfası
// (test/yazma/*.html) ve yerel sunucuyla gerçek Chromium üzerinde. Ağ yoktur (yalnız 127.0.0.1). Adlar uydurmadır.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { join } from "node:path";
import { type Browser, chromium } from "playwright-core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  alanSecicisi,
  type DuzenlemeSayfasi,
  type KaynakYazmaAlani,
  playwrightDuzenlemeSayfasi,
  prolizaYaz,
  VARSAYILAN_PROLIZ_SECICILERI,
} from "./yazma.ts";

const PLAN: KaynakYazmaAlani[] = [
  { sekme: "Genel", alan: "Dersin Amacı", deger: "Veri tabanı tasarımını öğretmek." },
  { sekme: "Genel", alan: "Dersin İçeriği", deger: "İlişkisel model, SQL, normalizasyon." },
  { sekme: "Genel", alan: "Ön Koşul", deger: "Yok" },
  { sekme: "Öğrenme Çıktıları", alan: "Ö1", deger: "İlişkisel şema tasarlar." },
  { sekme: "Ders Akışı", alan: "1. Hafta Konu", deger: "Giriş ve kavramlar" },
  // Seçicisi tanımlı değil: yazılmaz.
  { sekme: "Değerlendirme", alan: "Ara Sınav", deger: "1 adet, %40" },
  // Giriş bilgisi alanı: hiçbir koşulda yazılmaz.
  { sekme: "Genel", alan: "Şifre", deger: "x" },
];

/** Bellek sayfası: kayıtlı değerler, yazılan ama kaydedilmemiş değerler kaydet'e kadar ayrı. */
function bellekSayfa(baslangic: Record<string, string>, secenek: { bozukKayit?: string } = {}) {
  const kayitli = { ...baslangic };
  let taslak = { ...kayitli };
  const yazilan: string[] = [];
  let kayit = 0;
  const sayfa: DuzenlemeSayfasi = {
    async ac() {
      taslak = { ...kayitli };
    },
    async sekme() {},
    async oku(s) {
      return s in taslak ? (taslak[s] as string) : null;
    },
    async yaz(s, d) {
      yazilan.push(s);
      taslak[s] = d;
    },
    async kaydet() {
      kayit++;
      Object.assign(kayitli, taslak);
      if (secenek.bozukKayit) kayitli[secenek.bozukKayit] = "sunucu değiştirdi";
    },
  };
  return { sayfa, kayitli, yazilan, kayitSayisi: () => kayit };
}

const BASLANGIC = {
  "#txtDersAmaci": "Eski amaç.",
  "#txtDersIcerigi": "İlişkisel model, SQL, normalizasyon.",
  "#txtOnKosul": "Yok",
  "#txtCikti_Ö1": "Eski çıktı.",
  "#txtHafta1Konu": "Eski konu",
  "#txtKoordinator": "Deneme Hoca",
};

describe("prolizaYaz (bellek sayfası)", () => {
  it("seçiciler: doğrudan tablo, desen ve tanımsız alan", () => {
    const s = VARSAYILAN_PROLIZ_SECICILERI;
    expect(alanSecicisi(s, { sekme: "Genel", alan: "Dersin Amacı" })).toBe("#txtDersAmaci");
    expect(alanSecicisi(s, { sekme: "Öğrenme Çıktıları", alan: "Ö3" })).toBe("#txtCikti_Ö3");
    expect(alanSecicisi(s, { sekme: "Öğrenme Çıktıları", alan: "Ö3 (İngilizce)" })).toBe("#txtCiktiEn_Ö3");
    expect(alanSecicisi(s, { sekme: "Ders Akışı", alan: "12. Hafta Konu" })).toBe("#txtHafta12Konu");
    expect(alanSecicisi(s, { sekme: "Değerlendirme", alan: "Ara Sınav" })).toBeNull();
    expect(VARSAYILAN_PROLIZ_SECICILERI.durum).toBe("DOĞRULANMADI");
  });

  it("kuru çalıştırma hiçbir şey yazmaz ve kaydetmez; neyin değişeceğini raporlar", async () => {
    const b = bellekSayfa(BASLANGIC);
    const r = await prolizaYaz(b.sayfa, { dersKodu: "BPA102", alanlar: PLAN, kuru: true });
    expect(b.yazilan).toEqual([]);
    expect(b.kayitSayisi()).toBe(0);
    expect(b.kayitli).toEqual(BASLANGIC);
    const d = Object.fromEntries(r.alanlar.map((a) => [a.alan, a.durum]));
    // Amaç, Ö1 ve 1. hafta farklı → yazılacak; içerik ve ön koşul aynı → dokunulmaz.
    expect(d).toEqual({
      "Dersin Amacı": "yazilacak",
      "Dersin İçeriği": "ayni",
      "Ön Koşul": "ayni",
      Ö1: "yazilacak",
      "1. Hafta Konu": "yazilacak",
      "Ara Sınav": "eslesmedi",
      Şifre: "atlandi",
    });
    expect(r.alanlar.find((a) => a.alan === "Dersin Amacı")?.onceki).toBe("Eski amaç.");
    expect(r).toMatchObject({ kuru: true, kaydedildi: false, tamam: true, hata: null });
  });

  it("gerçek yazma: önce okur, yalnız farklı ve onaylı alanları yazar, kaydeder, geri okuyup doğrular", async () => {
    const b = bellekSayfa(BASLANGIC);
    const r = await prolizaYaz(b.sayfa, { dersKodu: "BPA102", alanlar: PLAN, kuru: false });
    expect(b.yazilan).toEqual(["#txtDersAmaci", "#txtCikti_Ö1", "#txtHafta1Konu"]);
    expect(b.kayitSayisi()).toBe(1);
    expect(b.kayitli["#txtKoordinator"]).toBe("Deneme Hoca"); // planda yok: dokunulmadı
    expect(r.alanlar.filter((a) => a.durum === "dogrulandi").map((a) => a.alan)).toEqual([
      "Dersin Amacı",
      "Ö1",
      "1. Hafta Konu",
    ]);
    expect(r).toMatchObject({ kaydedildi: true, tamam: true, hata: null });
  });

  it("geri okunan değer farklıysa doğrulanamadı ve tamam değil", async () => {
    const b = bellekSayfa(BASLANGIC, { bozukKayit: "#txtCikti_Ö1" });
    const r = await prolizaYaz(b.sayfa, { dersKodu: "BPA102", alanlar: PLAN, kuru: false });
    expect(r.alanlar.find((a) => a.alan === "Ö1")?.durum).toBe("dogrulanamadi");
    expect(r.tamam).toBe(false);
    expect(r.hata).toMatch(/geri okununca/u);
  });

  it("değişiklik yoksa kaydet'e basılmaz", async () => {
    const b = bellekSayfa({ ...BASLANGIC, "#txtDersAmaci": PLAN[0]?.deger ?? "" });
    const r = await prolizaYaz(b.sayfa, { dersKodu: "X", alanlar: PLAN.slice(0, 3), kuru: false });
    expect(b.kayitSayisi()).toBe(0);
    expect(r.alanlar.every((a) => a.durum === "ayni")).toBe(true);
  });

  it("hata iletisinde adres sorgusu ve giriş izi yok", async () => {
    const b = bellekSayfa(BASLANGIC);
    b.sayfa.ac = async () => {
      throw new Error("net::ERR at https://obs.ornek.edu.tr/x?oturum=GIZLI123\nyığın");
    };
    const r = await prolizaYaz(b.sayfa, { dersKodu: "X", alanlar: PLAN, kuru: false });
    expect(r.tamam).toBe(false);
    expect(r.hata).not.toContain("GIZLI123");
  });
});

// ---------- Uçtan uca: kayıtlı sahte Proliz sayfası + Chromium ----------

const DIZIN = new URL("./test/yazma/", import.meta.url);
const GIRIS_SABLONU = readFileSync(new URL("giris.html", DIZIN), "utf8");
const DUZENLE_SABLONU = readFileSync(new URL("duzenle.html", DIZIN), "utf8");
const KULLANICI = "kalite.birimi";
const PAROLA = "Sahte-Parola-938271";

function chromiumYolu(): string | undefined {
  if (process.env.E2E_CHROMIUM) return process.env.E2E_CHROMIUM;
  const kok = process.env.PLAYWRIGHT_BROWSERS_PATH ?? "/opt/pw-browsers";
  if (!existsSync(kok)) return undefined;
  for (const d of readdirSync(kok)
    .filter((x) => /^chromium-\d+$/u.test(x))
    .sort()
    .reverse()) {
    const yol = join(kok, d, "chrome-linux64", "chrome");
    if (existsSync(yol)) return yol;
  }
  return undefined;
}

const kacis = (s: string) => s.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/"/gu, "&quot;");

function govde(istek: IncomingMessage): Promise<URLSearchParams> {
  return new Promise((coz) => {
    let v = "";
    istek.on("data", (p) => {
      v += p;
    });
    istek.on("end", () => coz(new URLSearchParams(v)));
  });
}

describe("Proliz düzenleme sayfası uçtan uca (Playwright)", () => {
  let sunucu: Server;
  let taban: string;
  let tarayici: Browser;
  /** Sunucunun "veritabanı": ders koduna göre alanlar. */
  const kayit = new Map<string, Record<string, string>>();
  const istekler: string[] = [];

  beforeAll(async () => {
    kayit.set("BPA102", {
      txtDersAmaci: "Eski amaç.",
      txtDersAmaciEn: "",
      txtDersIcerigi: "İlişkisel model, SQL, normalizasyon.",
      txtOnKosul: "Yok",
      txtKoordinator: "Deneme Hoca",
      txtCikti_Ö1: "Eski çıktı.",
      txtCikti_Ö2: "Sorgu yazar.",
      txtHafta1Konu: "Eski konu",
    });
    sunucu = createServer(async (istek, yanit) => {
      const adres = new URL(istek.url ?? "/", "http://127.0.0.1");
      istekler.push(`${istek.method} ${adres.pathname}`);
      const oturumVar = /oturum=gecerli/u.test(istek.headers.cookie ?? "");
      const html = (s: string, kod = 200) => {
        yanit.writeHead(kod, { "content-type": "text/html; charset=utf-8" });
        yanit.end(s);
      };
      if (adres.pathname === "/oibs/bologna/giris.aspx") {
        if (istek.method === "POST") {
          const g = await govde(istek);
          if (g.get("txtKullaniciAdi") === KULLANICI && g.get("txtSifre") === PAROLA) {
            yanit.writeHead(302, {
              "set-cookie": "oturum=gecerli; HttpOnly; Path=/",
              location: "/oibs/bologna/anasayfa",
            });
            return yanit.end();
          }
          return html(GIRIS_SABLONU.replace("{{HATA}}", '<span id="lblHata">Hatalı giriş</span>'));
        }
        return html(GIRIS_SABLONU.replace("{{HATA}}", ""));
      }
      if (!oturumVar) {
        yanit.writeHead(302, { location: "/oibs/bologna/giris.aspx" });
        return yanit.end();
      }
      if (adres.pathname === "/oibs/bologna/anasayfa") return html('<form id="frmDersDuzenle">Ana sayfa</form>');
      if (adres.pathname === "/oibs/bologna/dersDuzenle.aspx") {
        const kod = adres.searchParams.get("kod") ?? "";
        const d = kayit.get(kod);
        if (!d) return html("<p>Ders bulunamadı</p>", 404);
        let sonuc = "";
        if (istek.method === "POST") {
          const g = await govde(istek);
          for (const k of Object.keys(d)) if (g.has(k)) d[k] = g.get(k) ?? "";
          sonuc = '<span id="lblKayitSonucu" class="basarili">Kayıt başarıyla güncellendi.</span>';
        }
        let s = DUZENLE_SABLONU.replaceAll("{{KOD}}", kacis(kod)).replace("{{SONUC}}", sonuc);
        for (const [k, v] of Object.entries(d)) s = s.replaceAll(`{{${k}}}`, kacis(v));
        return html(s);
      }
      html("<p>Bulunamadı</p>", 404);
    });
    await new Promise<void>((coz) => sunucu.listen(0, "127.0.0.1", coz));
    taban = `http://127.0.0.1:${(sunucu.address() as AddressInfo).port}`;
    const yol = chromiumYolu();
    tarayici = await chromium.launch({ headless: true, ...(yol ? { executablePath: yol } : {}) });
  }, 60_000);

  afterAll(async () => {
    await tarayici?.close();
    await new Promise((coz) => sunucu?.close(coz));
  });

  async function calistir(kuru: boolean, giris = { kullanici: KULLANICI, parola: PAROLA }) {
    const baglam = await tarayici.newContext();
    const page = await baglam.newPage();
    try {
      const sayfa = playwrightDuzenlemeSayfasi(page, {
        tabanAdres: taban,
        giris: async () => giris,
        zamanAsimiMs: 5_000,
      });
      return await prolizaYaz(sayfa, { dersKodu: "BPA102", alanlar: PLAN, kuru });
    } finally {
      await baglam.close();
    }
  }

  it("kuru çalıştırma: giriş yapar, okur, sunucuya kayıt göndermez", async () => {
    const once = structuredClone(kayit.get("BPA102"));
    istekler.length = 0;
    const r = await calistir(true);
    expect(r.hata).toBeNull();
    expect(kayit.get("BPA102")).toEqual(once);
    expect(istekler).not.toContain("POST /oibs/bologna/dersDuzenle.aspx");
    expect(r.alanlar.filter((a) => a.durum === "yazilacak").map((a) => a.alan)).toEqual([
      "Dersin Amacı",
      "Ö1",
      "1. Hafta Konu",
    ]);
    // Giriş bilgisi rapora girmez.
    expect(JSON.stringify(r)).not.toContain(PAROLA);
  }, 60_000);

  it("gerçek yazma: yalnız onaylı ve farklı alanlar değişir, kayıt sonrası geri okunup doğrulanır", async () => {
    const r = await calistir(false);
    expect(r.hata).toBeNull();
    expect(r).toMatchObject({ kuru: false, kaydedildi: true, tamam: true });
    const d = kayit.get("BPA102") ?? {};
    expect(d.txtDersAmaci).toBe("Veri tabanı tasarımını öğretmek.");
    expect(d.txtCikti_Ö1).toBe("İlişkisel şema tasarlar.");
    expect(d.txtHafta1Konu).toBe("Giriş ve kavramlar");
    // Planda olmayan alanlar aynen kalır.
    expect(d.txtKoordinator).toBe("Deneme Hoca");
    expect(d.txtCikti_Ö2).toBe("Sorgu yazar.");
    expect(r.alanlar.filter((a) => a.durum === "dogrulandi").map((a) => a.alan)).toEqual([
      "Dersin Amacı",
      "Ö1",
      "1. Hafta Konu",
    ]);
    expect(JSON.stringify(r)).not.toContain(PAROLA);
  }, 60_000);

  it("ikinci çalıştırma bir şey değiştirmez (hepsi aynı)", async () => {
    istekler.length = 0;
    const r = await calistir(false);
    expect(r.kaydedildi).toBe(false);
    expect(istekler).not.toContain("POST /oibs/bologna/dersDuzenle.aspx");
  }, 60_000);

  it("yanlış giriş: açık Türkçe hata, parola iletide yok", async () => {
    const r = await calistir(false, { kullanici: KULLANICI, parola: "yanlis-parola-55" });
    expect(r.tamam).toBe(false);
    expect(r.hata).toMatch(/giriş yapılamadı/u);
    expect(r.hata).not.toContain("yanlis-parola-55");
  }, 60_000);
});
