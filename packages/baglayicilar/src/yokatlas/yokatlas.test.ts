import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { sahteBaglam } from "../avesis/test/sahte.ts";
import {
  ARAMA_ADRESI,
  aramaGovdesi,
  aramaYanitiCoz,
  programIstatistikleriniOku,
  YOKATLAS_KOSULU,
} from "./yokatlas.ts";

// 2026-10-27 canlı yanıttan tek kayıt (kosulList çıkarılmış). Kurum ve program bilgisi herkese açıktır.
const kayitli = readFileSync(new URL("./test/fixtures/yokatlas-arama-ebyu-hukuk.json", import.meta.url), "utf8");

describe("YÖK Atlas JSON ayrıştırma", () => {
  it("canlı kaydı istatistiğe çevirir; doluluk null kalır", () => {
    const r = aramaYanitiCoz(JSON.parse(kayitli));
    expect(r.toplam).toBe(100);
    const [p] = r.programlar;
    expect(p).toEqual({
      programKodu: "103610085",
      yil: 2026,
      programAdi: "Hukuk",
      puanTuru: "EA",
      ogrenimSuresi: 4,
      kontenjan: 180,
      kontenjanObs: 5,
      tabanPuan: 409.86074,
      basariSirasi: 29858,
      // gk1/minPuan1/basariSirasi1 → 2025, …; metin sayılar ("393.72695") sayıya çevrilir.
      oncekiYillar: [
        { yil: 2025, kontenjan: 180, tabanPuan: 393.72695, basariSirasi: 37492 },
        { yil: 2024, kontenjan: 300, tabanPuan: 377.78677, basariSirasi: 65343 },
        { yil: 2023, kontenjan: 300, tabanPuan: 396.46932, basariSirasi: 50736 },
      ],
      akademikKadro: { prof: 5, doc: 5, drOgrUyesi: 28, arGor: 23 },
      akreditasyon: "YÖKAK",
      doluluk: null,
    });
  });

  it("beklenmeyen yanıtta anlaşılır hata verir", () => {
    expect(() => aramaYanitiCoz({ hata: 1 })).toThrow(/beklenen biçimde değil/);
    expect(() => aramaYanitiCoz({ content: [{ kilavuzKodu: 1, yil: 2026, minPuan: "abc" }], totalElements: 1 })).toThrow();
  });

  it("istek gövdesi", () => {
    expect(aramaGovdesi({ kilavuzKodu: "103610085" })).toEqual({
      filters: { kilavuzKodu: "103610085" },
      page: 0,
      size: 100,
      sortBy: "basariSirasi",
      direction: "ASC",
    });
  });
});

describe("YÖK Atlas okuma", () => {
  it("programları POST ile, en az 2 sn aralıkla okur; hatalı kod, bulunamayan ve HTTP hatası ayrı kaydedilir", async () => {
    let n = 0;
    const s = sahteBaglam({});
    const asil = s.baglam.fetch;
    s.baglam.fetch = (async (g: string | URL | Request, init?: RequestInit) => {
      await asil(g, init); // isteği kaydet
      n++;
      if (n === 1) return new Response(kayitli, { status: 200 });
      if (n === 2) return new Response(JSON.stringify({ content: [], totalElements: 0 }), { status: 200 });
      return new Response("", { status: 503 });
    }) as typeof fetch;
    const r = await programIstatistikleriniOku(["103610085", "12", "999000111", "999000222"], s.baglam, {
      aralikMs: 100,
    });
    expect(r.programlar.map((p) => p.programKodu)).toEqual(["103610085"]);
    expect(r.hatalar.map((h) => h.programKodu)).toEqual(["12", "999000111", "999000222"]);
    expect(r.hatalar[1]?.ileti).toMatch(/bulunamadı/);
    expect(r.hatalar[2]?.ileti).toMatch(/HTTP 503/);
    expect(s.beklemeler).toEqual([2000, 2000]);
    expect(s.istekler[0]).toMatchObject({ adres: ARAMA_ADRESI, yontem: "POST" });
    expect(JSON.parse(s.istekler[0]?.govde ?? "{}").filters).toEqual({ kilavuzKodu: "103610085" });
    expect(r.kaynaklar[0]?.okunma).toBe("2026-10-27T09:00:00.000Z");
    expect(YOKATLAS_KOSULU.durum).toBe("DOĞRULANMADI");
  });
});
