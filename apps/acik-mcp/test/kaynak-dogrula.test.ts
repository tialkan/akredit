// kaynak_dogrula: ağsız. Dış katalog yanıtları test/fixtures/kaynak altındaki örneklerden, sahte fetch ile gelir.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ACIK_ARACLAR } from "../src/araclar.ts";
import {
  baslikEslesir,
  doiTemizle,
  EN_COK_KAYNAK,
  ESZAMANLI_DIS_ISTEK,
  IZINLI_HOSTLAR,
  isbnTemizle,
  kaynakDogrulaAraci,
  kaynakImzasiDogru,
  sinirliMetin,
  yazarEslesir,
} from "../src/kaynak-dogrula.ts";
import { aracCalistirAsenkron } from "../src/sunucu.ts";

const ornek = (ad: string) => readFileSync(join(import.meta.dirname, "fixtures/kaynak", ad), "utf8");

/** Adrese göre örnek yanıt veren sahte fetch; her çağrılan adresi kaydeder. */
function sahteFetch(yanitlar: Record<string, string | null>) {
  const cagrilar: string[] = [];
  const f = (async (adres: string | URL) => {
    const a = String(adres);
    cagrilar.push(a);
    const anahtar = Object.keys(yanitlar).find((k) => a.includes(k));
    const govde = anahtar === undefined ? null : yanitlar[anahtar];
    if (govde === null || govde === undefined) return new Response("bulunamadı", { status: 404 });
    return new Response(govde, { status: 200, headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  return { f, cagrilar };
}

const calistir = (girdi: unknown, f: typeof fetch) =>
  aracCalistirAsenkron(kaynakDogrulaAraci as never, girdi, { simdi: () => new Date(0), fetch: f });

// biome-ignore lint/suspicious/noExplicitAny: test yardımcısı
const sonuc = (r: { veri: Record<string, unknown> }) => r.veri.sonuc as any;

describe("kimlik denetimi (ağsız, saf)", () => {
  it("DOI biçimini temizler; geçersizi reddeder", () => {
    expect(doiTemizle("https://doi.org/10.5555/kurgu.2020.001")).toBe("10.5555/kurgu.2020.001");
    expect(doiTemizle("doi: 10.5555/abc")).toBe("10.5555/abc");
    expect(doiTemizle("11.5555/abc")).toBeNull();
    expect(doiTemizle("http://169.254.169.254/")).toBeNull();
  });

  it("ISBN denetim basamağını sınar", () => {
    // 978605000001 için ağırlıklı toplam: 9+21+8+18+0+15+0+0+0+0+0+3 = 74; 10'un katına tamamlayan basamak 6.
    expect(isbnTemizle("978-605-00-0001-6")).toBe("9786050000016");
    expect(isbnTemizle("9786050000017")).toBeNull();
    // ISBN-10: 0-306-40615-2 bilinen geçerli örnek (toplam 132 = 11 x 12).
    expect(isbnTemizle("0-306-40615-2")).toBe("0306406152");
    expect(isbnTemizle("0306406153")).toBeNull();
  });

  it("başlık ve yazar eşleşmesi deterministiktir", () => {
    expect(baslikEslesir("Kurgu ölçme yöntemleri", "Kurgu Ölçme Yöntemleri")).toBe(true);
    expect(baslikEslesir("Kurgu ölçme yöntemleri", "Tamamen başka bir konu")).toBe(false);
    expect(yazarEslesir("Ece Kurgu", ["Kurgu, Ece"])).toBe(true);
    expect(yazarEslesir("Kurgu, E.", ["Ali Örnek"])).toBe(false);
  });
});

describe("kaynak_dogrula (sahte fetch, kayıtlı örnekler)", () => {
  it("araç listede, dış ağ işaretli ve yalnız sabit hostlara sorar", () => {
    expect(ACIK_ARACLAR.some((a) => a.ad === "kaynak_dogrula")).toBe(true);
    expect(kaynakDogrulaAraci.disAg).toBe(true);
    expect([...IZINLI_HOSTLAR]).toEqual(["api.crossref.org", "openlibrary.org", "www.googleapis.com"]);
  });

  it("DOI ile Crossref'ten doğrular; künye ve doi.org bağlantısı döner", async () => {
    const { f, cagrilar } = sahteFetch({ "api.crossref.org/works/10.5555": ornek("crossref-doi.json") });
    const r = await calistir({ kaynaklar: [{ doi: "10.5555/kurgu.2020.001" }] }, f);
    expect(r.hata).toBe(false);
    const k = sonuc(r).kaynaklar[0];
    expect(k.durum).toBe("katalogda_bulundu");
    expect(k.katalog).toBe("Crossref");
    expect(k.baglanti).toBe("https://doi.org/10.5555/kurgu.2020.001");
    expect(k.kunye).toBe(
      "Kurgucu, A., & Deneme, C. (2020). Kurgu bilimi öğretiminde ölçme. Kurgu Eğitimi Dergisi, 12(3), 45-60. https://doi.org/10.5555/kurgu.2020.001",
    );
    expect(cagrilar).toEqual(["https://api.crossref.org/works/10.5555%2Fkurgu.2020.001"]);
  });

  it("ISBN: önce Open Library; yoksa Google Books; bağlantı katalog sayfasıdır", async () => {
    const { f } = sahteFetch({
      "openlibrary.org/api/books?bibkeys=ISBN%3A9786050000016": ornek("openlibrary-isbn.json"),
      "openlibrary.org/api/books?bibkeys=ISBN%3A9786050000023": "{}",
      "www.googleapis.com/books/v1/volumes?q=isbn": ornek("google-isbn.json"),
    });
    const s = sonuc(await calistir({ kaynaklar: [{ isbn: "978-605-00-0001-6" }, { isbn: "9786050000023" }] }, f));
    expect(s.katalogdaBulunan).toBe(2);
    expect(s.kaynaklar[0]).toMatchObject({
      katalog: "Open Library",
      baglanti: "https://openlibrary.org/books/OL0000001M/Kurgu_veri_cozumlemesi",
      kunye: "Kurgucu, A. (2021). Kurgu veri çözümlemesi. Kurgu Yayınları.",
    });
    expect(s.kaynaklar[1]).toMatchObject({
      katalog: "Google Books",
      baglanti: "https://books.google.com/books?id=KurguID123",
      kunye: "Deneme, C. (2019). Kurgu istatistiği: Temel kavramlar. Kurgu Akademi.",
    });
  });

  it("başlık+yazar: yalnız eşleşen kayıt kabul edilir", async () => {
    const { f } = sahteFetch({
      "www.googleapis.com": ornek("google-isbn.json"),
      "api.crossref.org/works?": ornek("crossref-arama.json"),
    });
    const s = sonuc(await calistir({ kaynaklar: [{ baslik: "Kurgu ölçme yöntemleri", yazar: "Ece Kurgu" }] }, f));
    // Google'daki kayıt başka eser (Kurgu istatistiği), atlanır; Crossref'teki ikinci kayıt eşleşir.
    expect(s.kaynaklar[0]).toMatchObject({
      durum: "katalogda_bulundu",
      katalog: "Crossref",
      baglanti: "https://doi.org/10.5555/kurgu.2018.007",
    });
  });

  it("bulunamayan, geçersiz ya da ağ hatalı kaynak 'bulunamadi' döner ve önerilmez", async () => {
    const { f } = sahteFetch({
      "www.googleapis.com": '{ "kind": "books#volumes", "totalItems": 0 }',
      "api.crossref.org": null,
      "openlibrary.org": "{}",
    });
    const r = await calistir(
      {
        kaynaklar: [
          { baslik: "Var olmayan uydurma kitap", yazar: "Hayal Yazar" },
          { doi: "10.5555/yok" },
          { isbn: "9786050000017" },
          { isbn: "9786050000016" },
        ],
      },
      f,
    );
    const s = sonuc(r);
    expect(s.katalogdaBulunan).toBe(0);
    for (const k of s.kaynaklar) {
      expect(k.durum).toBe("bulunamadi");
      expect(k.kunye).toBeUndefined();
      expect(k.baglanti).toBeUndefined();
    }
    expect(String(r.veri.sonrakiAdim)).toMatch(/asla kendiniz önermeyin/u);
    // Ağ hatası da 'bulunamadi' sayılır, uydurma künye yazılmaz.
    const hata = (async () => {
      throw new Error("ağ yok");
    }) as unknown as typeof fetch;
    expect(sonuc(await calistir({ kaynaklar: [{ doi: "10.5555/x" }] }, hata)).kaynaklar[0].durum).toBe("bulunamadi");
  });

  it("boyut sınırını aşan yanıt kabul edilmez; girdi şeması DOI, ISBN ya da başlık+yazar ister", async () => {
    const buyuk = `{"message":{"DOI":"10.5555/x","title":["${"a".repeat(1_100_000)}"]}}`;
    const { f } = sahteFetch({ "api.crossref.org": buyuk });
    expect(sonuc(await calistir({ kaynaklar: [{ doi: "10.5555/x" }] }, f)).kaynaklar[0].durum).toBe("bulunamadi");
    const g = await calistir({ kaynaklar: [{ baslik: "Yalnız başlık" }] }, f);
    expect(g.hata).toBe(true);
    expect(g.veri.kod).toBe("gecersiz_girdi");
  });

  it("yanıt akışla okunur: content-length olmadan büyük yanıt sınırda kesilir", async () => {
    let gonderilen = 0;
    const akis = new ReadableStream<Uint8Array>({
      pull(c) {
        // Her parça 100 KB; sınır 1 MB. Sınırı aşınca okuyucu iptal eder, akış sonsuza kadar okunmaz.
        gonderilen += 100_000;
        c.enqueue(new Uint8Array(100_000).fill(32));
        if (gonderilen > 5_000_000) c.close();
      },
    });
    expect(await sinirliMetin(new Response(akis), 1_000_000)).toBeNull();
    expect(gonderilen).toBeLessThanOrEqual(1_300_000);
  });
});

describe("kaynak_dogrula sıkılaştırma (dış inceleme 2026-11-05)", () => {
  it("soyad tam belirteç olarak eşleşir; alt dize yetmez", () => {
    expect(yazarEslesir("Ece Yılmaz", ["Yılmazer, Ece"])).toBe(false);
    expect(yazarEslesir("Ece Yılmaz", ["Yılmaz, Ece"])).toBe(true);
    expect(yazarEslesir("Kaya", ["Kayaoğlu, Ali"])).toBe(false);
  });

  it("iki sözcüklü jenerik başlıkta sözcük kümesi birebir aynı olmalı", () => {
    expect(baslikEslesir("Veri Yapıları", "Veri Yapıları")).toBe(true);
    expect(baslikEslesir("Veri Yapıları", "Veri Yapıları ve Algoritmalar")).toBe(false);
  });

  it("kitap aranırken dergi makalesi kabul edilmez; yıl birebir uymalı", async () => {
    // crossref-doi.json kurgu bir dergi makalesidir (journal-article, 2020).
    const { f } = sahteFetch({ "api.crossref.org/works/10.5555": ornek("crossref-doi.json") });
    const kitap = sonuc(await calistir({ kaynaklar: [{ doi: "10.5555/kurgu.2020.001", tur: "kitap" }] }, f));
    expect(kitap.kaynaklar[0].durum).toBe("bulunamadi");
    expect(kitap.kaynaklar[0].neden).toMatch(/dergi makalesi; aranan kitap/u);
    const yil = sonuc(await calistir({ kaynaklar: [{ doi: "10.5555/kurgu.2020.001", yil: 2019 }] }, f));
    expect(yil.kaynaklar[0].neden).toMatch(/Katalogdaki yıl 2020, verilen yıl 2019/u);
    const tamam = sonuc(
      await calistir({ kaynaklar: [{ doi: "10.5555/kurgu.2020.001", tur: "makale", yil: 2020 }] }, f),
    );
    expect(tamam.kaynaklar[0]).toMatchObject({
      durum: "katalogda_bulundu",
      kayitTuru: "makale",
      kimlik_eslesmesi: { yontem: "doi", denetlenen: ["DOI", "kayıt türü", "yıl"] },
      ders_kaynagi_uygunlugu: "hoca karar verir",
    });
  });

  it("sonuçta kimlik eşleşmesi, bibliyografik tamlık ve imza ayrı alanlardır; imza doğrulanabilir", async () => {
    const { f } = sahteFetch({ "api.crossref.org/works/10.5555": ornek("crossref-doi.json") });
    const k = sonuc(await calistir({ kaynaklar: [{ doi: "10.5555/kurgu.2020.001" }] }, f)).kaynaklar[0];
    expect(k.bibliyografik_tamlik).toBe("tam");
    expect(kaynakImzasiDogru(k.kunye, k.baglanti, k.imza)).toBe(true);
    expect(kaynakImzasiDogru(`${k.kunye} `, k.baglanti, k.imza)).toBe(false);
    expect(kaynakImzasiDogru(k.kunye, k.baglanti, "0".repeat(32))).toBe(false);
  });

  it("bulunamayan kaynak hoca beyanı yolunu söyler; çağrı başına en çok 5 kaynak", async () => {
    const { f } = sahteFetch({ "www.googleapis.com": '{"totalItems":0}', "api.crossref.org": null });
    const s = sonuc(await calistir({ kaynaklar: [{ baslik: "Türk Anayasa Hukuku Dersleri", yazar: "Kurgu" }] }, f));
    expect(s.kaynaklar[0].durum).toBe("bulunamadi");
    expect(s.kaynaklar[0].hocaBeyani).toMatch(/hoca_beyani/u);
    const alti = Array.from({ length: 6 }, () => ({ doi: "10.5555/x" }));
    expect((await calistir({ kaynaklar: alti }, f)).veri.kod).toBe("gecersiz_girdi");
    expect(EN_COK_KAYNAK).toBe(5);
  });

  it("süreç genelinde en çok 4 dış istek aynı anda sürer (semafor)", async () => {
    let anlik = 0;
    let enCok = 0;
    const yavas = (async () => {
      anlik += 1;
      enCok = Math.max(enCok, anlik);
      await new Promise((r) => setTimeout(r, 5));
      anlik -= 1;
      return new Response("{}", { status: 404 });
    }) as unknown as typeof fetch;
    // 3 çağrı x 5 kaynak = 15 dış istek aynı anda başlatılır.
    await Promise.all(
      Array.from({ length: 3 }, () =>
        calistir({ kaynaklar: Array.from({ length: 5 }, (_, i) => ({ doi: `10.5555/s${i}` })) }, yavas),
      ),
    );
    expect(enCok).toBe(ESZAMANLI_DIS_ISTEK);
    expect(ESZAMANLI_DIS_ISTEK).toBe(4);
  });
});

describe("başlık+yazar: Open Library araması ve Google kota hatası", () => {
  /** Google 429 kota yanıtı verir; Open Library arama örneğini döndürür; Crossref boş. */
  function kotaFetch() {
    const cagrilar: string[] = [];
    const f = (async (adres: string | URL) => {
      const a = String(adres);
      cagrilar.push(a);
      if (a.includes("www.googleapis.com"))
        return new Response('{"error":{"code":429,"message":"Quota exceeded for quota metric \'Queries\'"}}', {
          status: 429,
        });
      if (a.includes("openlibrary.org/search.json")) return new Response(ornek("openlibrary-arama.json"));
      return new Response("bulunamadı", { status: 404 });
    }) as typeof fetch;
    return { f, cagrilar };
  }

  it("Google kotası dolu olsa da Open Library'den bulur; künye ve bağlantı katalogdan, imza doğrulanır", async () => {
    const { f, cagrilar } = kotaFetch();
    const s = sonuc(
      await calistir(
        {
          kaynaklar: [
            { baslik: "Introduction to Java Programming", yazar: "Liang", tur: "kitap", yil: 2014 },
            { baslik: "Java: How to Program", yazar: "Deitel", tur: "kitap" },
            { baslik: "The Object-Oriented Thought Process", yazar: "Weisfeld", tur: "kitap" },
          ],
        },
        f,
      ),
    );
    expect(s.kaynaklar[0]).toMatchObject({
      durum: "katalogda_bulundu",
      katalog: "Open Library",
      yil: 2014,
      baglanti: "https://openlibrary.org/works/OL1000001W",
      kimlik_eslesmesi: { yontem: "baslik_yazar", denetlenen: ["başlık sözcükleri, tam soyad", "kayıt türü", "yıl"] },
    });
    expect(kaynakImzasiDogru(s.kaynaklar[0].kunye, s.kaynaklar[0].baglanti, s.kaynaklar[0].imza)).toBe(true);
    expect(s.kaynaklar[1]).toMatchObject({
      durum: "katalogda_bulundu",
      baglanti: "https://openlibrary.org/works/OL1000002W",
    });
    // Yıl verilmedi: künyeye yıl yazılmaz (ilk yayın yılı baskı yılı sayılmaz).
    expect(s.kaynaklar[1].yil).toBeUndefined();
    expect(s.kaynaklar[2]).toMatchObject({ durum: "katalogda_bulundu", katalog: "Open Library" });
    // Bulunan kitaplar için Google'a hiç gidilmez.
    expect(cagrilar.some((a) => a.includes("googleapis"))).toBe(false);
  });

  it("yıl publish_year dizisinde yoksa eşleşmez; first_publish_year tek başına yetmez", async () => {
    const { f } = kotaFetch();
    const s = sonuc(
      await calistir(
        {
          kaynaklar: [
            { baslik: "Introduction to Java Programming", yazar: "Liang", yil: 2016 },
            // 1999 hem ilk yayın hem baskı yılı: eşleşir.
            { baslik: "Introduction to Java Programming", yazar: "Liang", yil: 1999 },
          ],
        },
        f,
      ),
    );
    expect(s.kaynaklar[0].durum).toBe("bulunamadi");
    expect(s.kaynaklar[1]).toMatchObject({ durum: "katalogda_bulundu", yil: 1999 });
  });

  it("Google'a ulaşılamayınca neden bunu söyler; 'Türkçe kitaplar' cümlesi yalnız gerçekten aranınca", async () => {
    const { f } = kotaFetch();
    const s = sonuc(await calistir({ kaynaklar: [{ baslik: "Var olmayan kurgu kitap", yazar: "Hayalsoy" }] }, f));
    expect(s.kaynaklar[0].durum).toBe("bulunamadi");
    expect(s.kaynaklar[0].neden).toMatch(/Google Books'a ulaşılamadı/u);
    expect(s.kaynaklar[0].neden).not.toMatch(/Türkçe kitapların/u);
    const { f: f2 } = sahteFetch({ "www.googleapis.com": '{"totalItems":0}', "openlibrary.org": '{"docs":[]}' });
    const s2 = sonuc(await calistir({ kaynaklar: [{ baslik: "Var olmayan kurgu kitap", yazar: "Hayalsoy" }] }, f2));
    expect(s2.kaynaklar[0].neden).toMatch(/Türkçe kitapların/u);
  });

  it("makale aranırken Open Library'ye sorulmaz", async () => {
    const { f, cagrilar } = kotaFetch();
    await calistir({ kaynaklar: [{ baslik: "Introduction to Java Programming", yazar: "Liang", tur: "makale" }] }, f);
    expect(cagrilar.some((a) => a.includes("openlibrary"))).toBe(false);
  });
});
