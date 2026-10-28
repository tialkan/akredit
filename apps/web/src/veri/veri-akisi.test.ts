// Veri akış envanteri (İP-40): kod tabanından üretilir, belge güncel kalır.
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BAGLAYICILAR, envanterCsv, envanterMarkdown, TABLO_SINIFI } from "./veri-akisi.ts";
import { guncelEnvanter, semaTablolari } from "./veri-akisi-girdi.ts";

const KOK = new URL("../../../../", import.meta.url);

describe("veri akış envanteri", () => {
  it("her tablo sınıflandırılmış (yeni tablo eklenince envanter güncellenmeli)", () => {
    const eksik = semaTablolari().filter((t) => !(t in TABLO_SINIFI));
    expect(eksik).toEqual([]);
  });

  it("her bağlayıcı dizini envanterde", () => {
    const dizinler = readdirSync(new URL("packages/baglayicilar/src/", KOK), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name)
      .sort();
    expect(Object.keys(BAGLAYICILAR).sort()).toEqual(dizinler);
  });

  it("yurt dışı sağlayıcılar aktarım sütununda ülke ve DOĞRULANMADI ile görünür", () => {
    const s = guncelEnvanter();
    const anthropic = s.find((x) => x.kaynak === "Sağlayıcı: anthropic");
    expect(anthropic?.yurtDisiAktarim).toMatch(/^Var: anthropic, ABD \(DOĞRULANMADI\)/u);
    expect(s.find((x) => x.kaynak === "Sağlayıcı: ollama")?.yurtDisiAktarim).toBe("Yok (Kurum sunucusu)");
    expect(s.filter((x) => x.hukukiSebep.includes("m. 5")).length).toBeGreaterThan(0);
  });

  it("belge ve CSV güncel (pnpm --filter @akredit/web envanter)", () => {
    const s = guncelEnvanter();
    expect(readFileSync(new URL("docs/hukuk/veri-akis-envanteri.md", KOK), "utf8")).toBe(envanterMarkdown(s));
    expect(readFileSync(new URL("docs/hukuk/veri-akis-envanteri.csv", KOK), "utf8")).toBe(envanterCsv(s));
  });

  it("CSV alanları tırnaklanır", () => {
    const csv = envanterCsv([
      {
        faaliyet: 'a,"b"',
        veriKategorisi: "x",
        amac: "x",
        hukukiSebep: "x",
        saklama: "x",
        alici: "x",
        yurtDisiAktarim: "x",
        teknikTedbir: "x",
        kaynak: "x",
      },
    ]);
    expect(csv.split("\r\n")[1]).toBe('"a,""b""",x,x,x,x,x,x,x,x');
    expect(csv.startsWith("﻿")).toBe(true);
  });
});
