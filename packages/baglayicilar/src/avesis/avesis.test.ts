import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ARASTIRMA_ALANLARI_NOTU,
  AVESIS_KOSULU, avesisPaneliOku, avesisProfiliOku, avesisSayfaCoz, turBul, yilBul } from "./avesis.ts";
import { adresDenetle, BaglayiciHatasi, sinirlayici } from "./istek.ts";
import { sahteBaglam } from "./test/sahte.ts";

const profilHtml = readFileSync(new URL("./test/fixtures/profil.html", import.meta.url), "utf8");
const yayinlarHtml = readFileSync(new URL("./test/fixtures/yayinlar.html", import.meta.url), "utf8");
const arastirmaHtml = readFileSync(new URL("./test/fixtures/arastirma.html", import.meta.url), "utf8");
const ADRES = "https://avesis.ornek.edu.tr/deneme.ornekoglu";

describe("AVESİS ayrıştırma (canlı yapı, 2026-10-27)", () => {
  it("profilden ad, unvan ve metrikleri okur; betik içindeki dizeler atlanır", () => {
    const p = avesisSayfaCoz(profilHtml);
    expect(p.ad).toBe("Deneme ÖRNEKOĞLU");
    expect(p.unvan).toBe("Prof. Dr.");
    // İlk kutuda strong h4'ün kardeşi, sonrakilerde div içinde; "1.234" → 1234; "-" → null.
    expect(p.metrikler).toEqual({ Yayın: 52, "Yayın (WoS)": 1, "Atıf (Scholar)": 1234, "H-İndeks (TrDizin)": null });
    expect(p.etkinlikler).toEqual([]);
    expect(p.arastirmaAlanlari).toEqual({ durum: "DOĞRULANMADI", not: ARASTIRMA_ALANLARI_NOTU });
    expect(JSON.stringify(p)).not.toContain("Sahte");
  });

  it("yayınlar sayfasından bölüm, başlık, yazarlar, dergi, atıf, dizin ve yılı okur", () => {
    const p = avesisSayfaCoz(yayinlarHtml);
    expect(p.etkinlikler).toHaveLength(3); // betikteki sahte .pub-item alınmaz
    expect(p.etkinlikler[0]).toEqual({
      tur: "makale",
      baslik: "Kurgu Makale Başlığı",
      yil: 2015,
      bolum: "Makaleler",
      yazarlar: ["ÖRNEKOĞLU D.", "Kurgu A."],
      dergi: "Hayali Dergi",
      atif: "cilt.10, sa.9, 2015 (SSCI, Scopus)",
      dizinler: ["sci_ssci_ahci", "sci_ssci_ahci_esci", "scopus"],
      yol: "/yayin/00000000-0000-4000-8000-000000000001/kurgu-makale-basligi",
    });
    expect(p.etkinlikler[1]).toMatchObject({ baslik: "İkinci Kurgu Makale & Deneme", yil: 2022, dizinler: ["trdizin"] });
    expect(p.etkinlikler[2]).toMatchObject({
      tur: "bildiri",
      bolum: "Hakemli Bilimsel Toplantılarda Yayımlanmış Bildiriler",
      dergi: null,
      yil: 2019,
      dizinler: [],
    });
    expect(p.etkinlikler[2]?.atif).toMatch(/\(Tam Metin Bildiri\)$/);
  });

  it("araştırma alanları sayfası boş gelir; alan okunmaz, DOĞRULANMADI bildirilir", () => {
    const p = avesisSayfaCoz(arastirmaHtml);
    expect(p.arastirmaAlanlari.durum).toBe("DOĞRULANMADI");
    expect(p.arastirmaAlanlari.not).toBe("DOĞRULANMADI: istemci tarafında yükleniyor");
  });

  it("tür ve yıl yardımcıları", () => {
    expect(turBul("Uluslararası Hakemli Dergilerde Makaleler")).toBe("makale");
    expect(turBul("Ödüller")).toBe("odul");
    expect(turBul("Diğer")).toBe("diger");
    expect(yilBul("cilt 1999 sayfa, 2020")).toBe(2020);
    expect(yilBul("yıl yok")).toBeNull();
  });

  it("ad bulunamayan sayfada anlaşılır hata verir", () => {
    expect(() => avesisSayfaCoz("<html><body><p>boş</p></body></html>")).toThrow(/akademisyen adı/);
  });
});

describe("AVESİS okuma", () => {
  it("profil ve alt sayfayı en az 1 sn aralıkla, kaynağı kaydederek okur", async () => {
    const s = sahteBaglam({
      [ADRES]: profilHtml,
      [`${ADRES}/yayinlar`]: yayinlarHtml,
    });
    // Alt sayfa verilmezse /<kullanici>/yayinlar okunur.
    const r = await avesisProfiliOku(ADRES, s.baglam, { aralikMs: 10 });
    expect(r.profil.etkinlikler.at(-1)).toMatchObject({ tur: "bildiri", yil: 2019 });
    expect(s.beklemeler).toEqual([1000]); // aralık 10 istense de koşuldaki en az 1000 ms uygulanır
    expect(s.istekler.map((i) => i.adres)).toEqual([ADRES, `${ADRES}/yayinlar`]);
    expect(s.istekler[0]?.basliklar["user-agent"]).toMatch(/^Akredit/);
    expect(r.kaynaklar).toHaveLength(2);
    expect(AVESIS_KOSULU.durum).toBe("DOĞRULANMADI");
  });

  it("AVESİS dışı, http ya da giriş bilgili adresleri ve başka makineye giden alt sayfayı reddeder", async () => {
    const s = sahteBaglam({ [ADRES]: profilHtml });
    await expect(avesisProfiliOku("https://ornek.com/x", s.baglam)).rejects.toThrow(BaglayiciHatasi);
    await expect(avesisProfiliOku("http://avesis.ornek.edu.tr/x", s.baglam)).rejects.toThrow(/https/);
    await expect(avesisProfiliOku("https://a:b@avesis.ornek.edu.tr/x", s.baglam)).rejects.toThrow(/giriş/);
    await expect(avesisProfiliOku(ADRES, s.baglam, { altSayfalar: ["https://avesis.baska.edu.tr/x"] })).rejects.toThrow(
      BaglayiciHatasi,
    );
  });

  it("HTTP 429 ve 500 Türkçe iletiyle döner", async () => {
    const s = sahteBaglam({ [ADRES]: { durum: 429, govde: "" } });
    await expect(avesisProfiliOku(ADRES, s.baglam)).rejects.toThrow(/çok fazla istek/);
    const s2 = sahteBaglam({ [ADRES]: { durum: 500, govde: "" } });
    await expect(avesisProfiliOku(ADRES, s2.baglam)).rejects.toThrow(/HTTP 500/);
  });

  it("panel tarayıcı oturumuyla okunur; giriş bilgisi bu tarafa hiç gelmez", async () => {
    const s = sahteBaglam({});
    const olaylar: string[] = [];
    const oturum = {
      girisiBekle: async (a: string) => {
        olaylar.push(`giris ${a}`);
      },
      sayfaHtml: async (a: string) => {
        olaylar.push(`sayfa ${a}`);
        return a.endsWith("/panel")
          ? profilHtml
          : yayinlarHtml;
      },
    };
    const r = await avesisPaneliOku(oturum, "https://avesis.ornek.edu.tr/panel", ["/panel/tez"], s.baglam);
    expect(olaylar[0]).toBe("giris https://avesis.ornek.edu.tr/panel");
    expect(r.profil.etkinlikler.at(-1)?.tur).toBe("bildiri");
    expect(s.istekler).toHaveLength(0); // ağ isteği bağlayıcıdan değil tarayıcıdan
    expect(s.beklemeler).toEqual([1000]);
    // Arayüzde parola/çerez alanı yoktur: oturum nesnesi yalnız iki işlev taşır.
    expect(Object.keys(oturum).sort()).toEqual(["girisiBekle", "sayfaHtml"]);
  });
});

describe("ortak istek yardımcıları", () => {
  it("sınırlayıcı geçen süreyi düşerek bekler", async () => {
    const s = sahteBaglam({});
    const sn = sinirlayici(s.baglam, 500);
    await sn.bekle(); // ilk istek beklemez
    s.ilerlet(200);
    await sn.bekle(); // 500 - 200 = 300 ms beklenir
    s.ilerlet(1000);
    await sn.bekle(); // aralık zaten geçti
    expect(s.beklemeler).toEqual([300]);
  });

  it("adres denetimi", () => {
    expect(() => adresDenetle("bozuk", () => true)).toThrow(/geçersiz/);
    expect(adresDenetle("https://x.edu.tr/a", () => true).hostname).toBe("x.edu.tr");
  });
});
