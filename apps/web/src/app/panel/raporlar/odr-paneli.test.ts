// Panelin çerçeve listesi servisin tanıdığı kodlarla aynı olmalı (yanlış kod sunucuda reddedilir).
import { odr } from "@akredit/servis";
import { describe, expect, it } from "vitest";
import { CERCEVELER } from "./odr-paneli.tsx";

describe("ÖDR paneli", () => {
  it("çerçeve kodlarının hepsi servis tarafından tanınır", () => {
    for (const [k] of CERCEVELER) expect(odr.cerceveBul(k).kod).toBe(k);
  });
});
