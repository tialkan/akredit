// İP-37: web sunucusu köprüleri. Ağ yoktur; tarayıcı sahte bağlamla, depo geçici dizinle sınanır.

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DisBaglam } from "@akredit/baglayicilar";
import { arastirma, bologna } from "@akredit/servis";
import { describe, expect, it } from "vitest";
import { KopruYapilandirmaHatasi, kopruleriKur, metinParcalari, ortamdanDepo, tarayiciKur } from "./kopruler.ts";

const IMZA = "web-koprusu-testi-icin-uydurma-imza-0000";

describe("nesne deposu ortamı", () => {
  it("hiç tanım yoksa null; yarım S3 ve kısa imza gizlisi açık Türkçe hata", () => {
    expect(ortamdanDepo({})).toBeNull();
    expect(() => ortamdanDepo({ S3_UC_NOKTASI: "http://depo:9000", S3_KOVA: "k" })).toThrow(
      /S3_ERISIM_ANAHTARI, S3_GIZLI_ANAHTAR tanımlı değil/u,
    );
    expect(() => ortamdanDepo({ AKREDIT_DEPO_DIZINI: "/tmp/x", AKREDIT_DEPO_IMZA_GIZLISI: "kisa" })).toThrow(
      KopruYapilandirmaHatasi,
    );
  });

  it("üretimde depo yoksa kurulum durur; geliştirmede kurulmaz ve nedenini söyler", () => {
    expect(() => kopruleriKur({ NODE_ENV: "production" })).toThrow(/Kanıt deposu tanımlı değil/u);
    expect(kopruleriKur({ NODE_ENV: "development" })).toMatchObject({ kuruldu: false });
  });

  it("yerel depo ile köprüler kurulur; depo SHA-256 özetiyle yazar", async () => {
    const kok = mkdtempSync(join(tmpdir(), "akredit-kopru-"));
    expect(kopruleriKur({ NODE_ENV: "production", AKREDIT_DEPO_DIZINI: kok, AKREDIT_DEPO_IMZA_GIZLISI: IMZA })).toEqual(
      { kuruldu: true },
    );
    const a = arastirma.arastirmaKoprusu();
    expect(a.tara).toBeTypeOf("function");
    expect(a.metin).toBeTypeOf("function");
    expect(bologna.bolognaKoprusu().depo).toBe(a.depo);
    const n = await a.depo?.koy("01900000-0000-7000-8000-0000000000a1", new TextEncoder().encode("abc"));
    // "abc" için SHA-256 (FIPS 180-2 örnek değeri).
    expect(n?.ozet).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});

describe("tarayıcı ve metin köprüsü", () => {
  it("tarayıcı yalnız kurum alanını alır; çıktıda adres, erişim, özet var", async () => {
    let simdi = Date.UTC(2026, 9, 28, 9, 0, 0);
    const istenen: string[] = [];
    const baglam: DisBaglam = {
      simdi: () => new Date(simdi),
      bekle: async (ms) => {
        simdi += ms;
      },
      fetch: (async (g: string | URL | Request) => {
        const a = String(g);
        istenen.push(a);
        if (a.endsWith("/robots.txt")) return new Response("User-agent: *\nDisallow:\n", { status: 200 });
        if (a === "https://www.uydurma.edu.tr/")
          return new Response('<a href="https://baska.edu.tr/">x</a><p>Kalite</p>', {
            status: 200,
            headers: { "content-type": "text/html" },
          });
        return new Response("yok", { status: 404 });
      }) as typeof fetch,
    };
    const r = await tarayiciKur(baglam)({
      baslangic: "https://www.uydurma.edu.tr/",
      alanAdi: "uydurma.edu.tr",
      derinlik: 1,
      enCokSayfa: 5,
    });
    expect(r.belgeler).toHaveLength(1);
    expect(r.belgeler[0]).toMatchObject({
      adres: "https://www.uydurma.edu.tr/",
      // robots.txt isteğinden sonra en az 1 sn beklenir.
      erisim: "2026-10-28T09:00:01.000Z",
    });
    expect(r.belgeler[0]?.ozet).toMatch(/^[0-9a-f]{64}$/u);
    expect(istenen.some((a) => a.includes("baska.edu.tr"))).toBe(false);
  });

  it("metin köprüsü HTML'den çapalı parça verir", async () => {
    const p = await metinParcalari(
      new TextEncoder().encode("<html><body><h1>Kalite Komisyonu</h1><p>Toplantı tutanakları.</p></body></html>"),
      "sayfa.html",
    );
    expect(p.length).toBeGreaterThan(0);
    expect(p.map((x) => x.metin).join(" ")).toContain("Kalite Komisyonu");
  });
});
