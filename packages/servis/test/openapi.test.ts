// OpenAPI belgesi: şemaya göre geçerli (OpenAPI 3.1), her uç belgede, depodaki belge güncel.

import { readFileSync } from "node:fs";
import { Validator } from "@seriousme/openapi-schema-validator";
import { describe, expect, it } from "vitest";
import { openapiBelgesi } from "../src/http/openapi.ts";
import { UCLAR } from "../src/http/uclar.ts";

describe("OpenAPI", () => {
  const belge = openapiBelgesi();

  it("OpenAPI 3.1 şemasına göre geçerli", async () => {
    const d = new Validator();
    const sonuc = await d.validate(structuredClone(belge));
    expect(sonuc.errors ?? null, JSON.stringify(sonuc.errors)).toBeNull();
    expect(sonuc.valid).toBe(true);
    expect(d.version).toBe("3.1");
  });

  it("her uç belgede ve operationId'ler tekil", () => {
    const idler = Object.values(belge.paths).flatMap((y) =>
      Object.values(y).map((i) => (i as { operationId: string }).operationId),
    );
    expect(new Set(idler).size).toBe(idler.length);
    expect(idler.sort()).toEqual(UCLAR.map((u) => u.ad).sort());
    // Her uçta 401 ve 403 yanıtı belgelenir.
    for (const y of Object.values(belge.paths))
      for (const i of Object.values(y))
        expect(Object.keys((i as { responses: object }).responses)).toEqual(expect.arrayContaining(["401", "403"]));
  });

  it("depodaki openapi.json güncel (değiştiyse: pnpm --filter @akredit/servis openapi)", () => {
    const depodaki = JSON.parse(readFileSync(new URL("../openapi.json", import.meta.url), "utf8"));
    expect(depodaki).toEqual(JSON.parse(JSON.stringify(belge)));
  });
});
