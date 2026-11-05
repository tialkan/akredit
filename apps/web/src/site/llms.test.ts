// public/llms.txt elle yazılır; bu test onu sitenin durum kaynağıyla (icerik.ts) ve çerçeve verisiyle karşılaştırır.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { programCerceveleri, yokakOzeti } from "./cerceve-ozeti.ts";
import { PROJE_GRUPLARI, SITE_ADRESI } from "./icerik.ts";

const LLMS = readFileSync(join(import.meta.dirname, "../../public/llms.txt"), "utf8");
const satir = (yol: string) => LLMS.split("\n").find((s) => s.includes(`(${SITE_ADRESI}${yol})`));

describe("llms.txt ile icerik.ts tutarlı", () => {
  const sayfalar = PROJE_GRUPLARI.flatMap((g) => g.sayfalar).filter((s) => satir(s.yol));

  it("llms.txt proje sayfalarının çoğunu anar", () => {
    expect(sayfalar.length).toBeGreaterThan(10);
  });

  it.each(sayfalar.map((s) => [s.yol, s.durum] as const))("%s durumu (%s) aynı", (yol, durum) => {
    const s = (satir(yol) ?? "").toLocaleLowerCase("tr");
    expect(s.includes("askıda")).toBe(durum === "askida");
    expect(s.includes("taslak")).toBe(durum === "taslak");
  });

  it("çerçeve sayıları ve program çerçeveleri veriyle aynı", () => {
    const y = yokakOzeti();
    const s = satir("/cerceveler") ?? "";
    expect(s).toContain(
      `YÖKAK ${y.c.surum} (${y.basliklar.length} başlık, ${y.olcutSayisi} ölçüt, ${y.altOlcutSayisi} alt ölçüt)`,
    );
    for (const c of programCerceveleri()) expect(s).toContain(c.ad.split(" ")[0] ?? "");
  });
});
