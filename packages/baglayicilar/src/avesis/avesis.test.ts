import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AVESIS_KOSULU, avesisPaneliOku, avesisProfiliOku, avesisSayfaCoz, turBul, yilBul } from "./avesis.ts";
import { adresDenetle, BaglayiciHatasi, sinirlayici } from "./istek.ts";
import { sahteBaglam } from "./test/sahte.ts";

const profilHtml = readFileSync(new URL("./test/fixtures/profil.html", import.meta.url), "utf8");
const ADRES = "https://avesis.ornek.edu.tr/deneme.ornekoglu";

describe("AVESİS ayrıştırma", () => {
  it("kurgu profil sayfasından ad, unvan, birim, alanlar ve etkinlikleri çıkarır", () => {
    const p = avesisSayfaCoz(profilHtml);
    expect(p.ad).toBe("Deneme Örnekoğlu");
    expect(p.unvan).toBe("Dr. Öğr. Üyesi");
    expect(p.birim).toBe("Örnek Fakültesi, Kurgu Bölümü");
    expect(p.arastirmaAlanlari).toEqual(["Ölçme ve Değerlendirme", "Eğitim Teknolojileri"]);
    // 2 makale + 1 bildiri + 1 proje; İletişim bölümü ve betik içindeki sahte <li> alınmaz.
    expect(p.etkinlikler.map((e) => [e.tur, e.yil])).toEqual([
      ["makale", 2024],
      ["makale", 2022],
      ["bildiri", 2023],
      ["proje", 2023],
    ]);
    expect(p.etkinlikler[1]?.baslik).toContain("İkinci kurgu makale & deneme");
    expect(JSON.stringify(p)).not.toContain("sahte");
    expect(JSON.stringify(p)).not.toContain("@");
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
      [`${ADRES}/yayinlar`]: "<h1>Deneme Örnekoğlu</h1><h2>Kitaplar</h2><ul><li>Kurgu kitap, Hayali Yayınevi, 2019</li></ul>",
    });
    const r = await avesisProfiliOku(ADRES, s.baglam, { altSayfalar: ["/deneme.ornekoglu/yayinlar"], aralikMs: 10 });
    expect(r.profil.etkinlikler.at(-1)).toMatchObject({ tur: "kitap", yil: 2019 });
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
    await expect(
      avesisProfiliOku(ADRES, s.baglam, { altSayfalar: ["https://avesis.baska.edu.tr/x"] }),
    ).rejects.toThrow(BaglayiciHatasi);
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
        return a.endsWith("/panel") ? profilHtml : "<h1>X</h1><h2>Tezler</h2><ul><li>Kurgu yüksek lisans tezi, 2020</li></ul>";
      },
    };
    const r = await avesisPaneliOku(oturum, "https://avesis.ornek.edu.tr/panel", ["/panel/tez"], s.baglam);
    expect(olaylar[0]).toBe("giris https://avesis.ornek.edu.tr/panel");
    expect(r.profil.etkinlikler.at(-1)?.tur).toBe("tez");
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
