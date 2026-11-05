import { PROGRAM_CERCEVELERI } from "@akredit/cerceveler";
import { describe, expect, it } from "vitest";
import { programCerceveleri } from "./cerceve-ozeti.ts";

describe("çerçeve özeti", () => {
  it("program çerçevelerinin hepsi sayfada, her birinin belge özeti var", () => {
    const satirlar = programCerceveleri();
    for (const c of PROGRAM_CERCEVELERI) expect(satirlar.map((s) => s.kod)).toContain(c.kod);
    for (const s of satirlar) {
      expect(s.sha256).toMatch(/^[0-9a-f]{64}$/u);
      expect(s.olcutSayisi).toBeGreaterThan(0);
    }
  });

  it("taslak MÜDEK (belgesiz) listede yok", () => {
    expect(programCerceveleri().every((s) => s.kod !== "mudek-taslak")).toBe(true);
  });
});
