// 404, 500 (error ve global-error) ve bakım sayfaları (İP-49): kısa Türkçe, ana sayfa ve LinkedIn bağlantısı,
// em-dash ve kalın yazı yok, iç yapı (yığın izi) gösterilmez.

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Bakim from "../app/bakim/page.tsx";
import HataEkrani from "../app/error.tsx";
import GenelHata from "../app/global-error.tsx";
import { ILETISIM_ADRESI } from "./iletisim.ts";

const hata = Object.assign(new Error("gizli iç ayrıntı: SELECT * FROM kanit"), { digest: "D1G35T" });
const sayfalar = {
  bakim: renderToStaticMarkup(createElement(Bakim)),
  hata: renderToStaticMarkup(createElement(HataEkrani, { error: hata, reset: () => {} })),
  genel: renderToStaticMarkup(createElement(GenelHata, { error: hata, reset: () => {} })),
};

describe("hata ve bakım sayfaları", () => {
  it("her biri ana sayfaya ve LinkedIn iletişime bağlanır; tek h1 taşır", () => {
    expect(ILETISIM_ADRESI).toBe("https://www.linkedin.com/in/tialkan/");
    for (const [ad, html] of Object.entries(sayfalar)) {
      expect(html, ad).toContain('href="/"');
      expect(html, ad).toContain(`href="${ILETISIM_ADRESI}"`);
      expect(html, ad).toContain("İletişim: LinkedIn");
      expect(html.match(/<h1/gu)?.length, ad).toBe(1);
      expect(html, ad).not.toMatch(/—|<strong|<b>/u);
    }
  });

  it("500 sayfaları iç ayrıntıyı göstermez, yalnız başvuru kodunu verir ve yeniden deneme sunar", () => {
    for (const html of [sayfalar.hata, sayfalar.genel]) {
      expect(html).not.toContain("SELECT");
      expect(html).toContain("D1G35T");
      expect(html).toContain("Yeniden deneyin");
      expect(html).toContain("500");
    }
    // global-error kendi html ve body etiketini taşır, dili Türkçedir.
    expect(sayfalar.genel).toMatch(/^<html lang="tr">/u);
  });

  it("bakım sayfası ne olduğunu ve ne yapılacağını söyler", () => {
    expect(sayfalar.bakim).toContain("Kısa bir bakım yapıyoruz");
    expect(sayfalar.bakim).toContain("geçici olarak kullanılamıyor");
    expect(sayfalar.bakim).toContain("sayfayı yenileyin");
  });
});
