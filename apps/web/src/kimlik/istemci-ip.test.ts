// İnceleme 4-7 düşük bulgu #6: kimlik günlüğündeki ağ izi, istemcinin yazabildiği `x-forwarded-for` ilk değerine
// dayanmamalı. Kural demo ucu, kurum açılışı ve pilot formuyla aynı: önce `x-real-ip`, yoksa XFF son değeri.

import { describe, expect, it } from "vitest";
import { istemciIp } from "./sunucu.ts";

describe("kimlik sunucusu istemci adresi", () => {
  it("güvenilir vekilin yazdığı x-real-ip önce gelir", () => {
    const h = new Headers({ "x-forwarded-for": "198.51.100.7, 203.0.113.9", "x-real-ip": "203.0.113.9" });
    expect(istemciIp(h)).toBe("203.0.113.9");
  });

  it("x-real-ip yoksa istemcinin yazdığı ilk değer değil, vekilin eklediği son değer alınır", () => {
    const h = new Headers({ "x-forwarded-for": "198.51.100.7, 203.0.113.9" });
    expect(istemciIp(h)).toBe("203.0.113.9");
  });

  it("başlık yoksa adres yok", () => {
    expect(istemciIp(new Headers())).toBeNull();
    expect(istemciIp(undefined)).toBeNull();
  });
});
