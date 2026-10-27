import { describe, expect, it } from "vitest";
import {
  abonelikIsle,
  base64UrlCoz,
  bellekAbonelikDeposu,
  bildirimMetni,
  bildirimYolu,
  bildirimYuku,
  KAPSAM,
  manifest,
  onbellekKarari,
  servisCalisaniKaynagi,
} from "./mobil.ts";

const KOKEN = "https://akredit.org";

const ORNEK_ISTEKLER: [string, string][] = [
  ["/panel/onaylar", "GET"],
  ["/panel/onaylar/", "GET"],
  ["/api/v1/oneriler?sonraki=abc", "GET"],
  ["/_next/static/chunks/a1b2.js", "GET"],
  ["/api/v1/kararlar", "POST"],
  ["/api/v1/oneriler", "POST"],
  ["/panel/kanitlar", "GET"],
  ["/api/v1/kanitlar", "GET"],
  ["/panel/ayarlar", "GET"],
  ["/panel/onaylar/abonelik", "POST"],
  ["https://baska.example/panel/onaylar", "GET"],
  ["/onay/eposta?j=x", "GET"],
];

describe("onbellekKarari", () => {
  it("yalnız onay listesini ve statik dosyaları önbelleğe alır", () => {
    expect(onbellekKarari("/panel/onaylar", "GET", KOKEN)).toBe("ag-once");
    expect(onbellekKarari("/api/v1/oneriler?sonraki=abc", "get", KOKEN)).toBe("ag-once");
    expect(onbellekKarari("/_next/static/x.css", "GET", KOKEN)).toBe("onbellek-once");
  });
  it("karar, kanıt, ayar ve başka köken önbelleğe girmez", () => {
    for (const [a, y] of ORNEK_ISTEKLER.slice(4)) expect(onbellekKarari(a, y, KOKEN), `${y} ${a}`).toBe("dokunma");
  });
});

describe("servis çalışanı kaynağı", () => {
  const kaynak = servisCalisaniKaynagi();
  it("gömülü karar işlevi TypeScript işleviyle aynı sonucu verir", () => {
    // Çalışan metnindeki sabitler ve işlev ayrı bir işlev gövdesinde çalıştırılır (ağ yok, self yok).
    const bas = kaynak.indexOf("const KAPSAM");
    const son = kaynak.indexOf('self.addEventListener("install"');
    const gomulu = new Function(`${kaynak.slice(bas, son)}; return onbellekKarari;`)() as typeof onbellekKarari;
    for (const [a, y] of ORNEK_ISTEKLER) expect(gomulu(a, y, KOKEN), `${y} ${a}`).toBe(onbellekKarari(a, y, KOKEN));
  });
  it("bildirimden onay eylemi yoktur, yalnız onay sayfasını açar", () => {
    expect(kaynak).not.toMatch(/actions\s*:/);
    expect(kaynak).toContain("openWindow(KAPSAM)");
  });
});

describe("bildirimYolu", () => {
  it("izin reddedilince e-posta yoluna düşer", () => {
    const y = bildirimYolu("denied", true, "anahtar");
    expect(y).toEqual({ yol: "eposta", neden: "reddedildi" });
    expect(bildirimMetni(y)).toMatch(/e-posta özetiyle/);
  });
  it("destek yoksa ya da anahtar yapılandırılmamışsa e-posta", () => {
    expect(bildirimYolu("desteklenmiyor", false, "a")).toEqual({ yol: "eposta", neden: "desteklenmiyor" });
    expect(bildirimYolu("granted", false, "a")).toEqual({ yol: "eposta", neden: "desteklenmiyor" });
    expect(bildirimYolu("granted", true, undefined)).toEqual({ yol: "eposta", neden: "yapilandirilmadi" });
  });
  it("izin sorulmadıysa ister, verildiyse anlık", () => {
    expect(bildirimYolu("default", true, "a")).toEqual({ yol: "izin-iste" });
    expect(bildirimYolu("granted", true, "a")).toEqual({ yol: "anlik" });
  });
});

describe("bildirimYuku", () => {
  it("yalnız sayı taşır; yüksek risk tek tek inceleme der", () => {
    // 2 + 3 + 5 = 10
    const y = bildirimYuku({ yuksek: 2, orta: 3, dusuk: 5 });
    expect(y.govde).toBe("10 öneri kararınızı bekliyor; 2 tanesi yüksek riskli ve tek tek incelenmeli.");
    expect(y.adres).toBe(KAPSAM);
    expect(bildirimYuku({ yuksek: 0, orta: 1, dusuk: -4 }).govde).toBe("1 öneri kararınızı bekliyor.");
  });
});

describe("abonelikIsle", () => {
  const gecerli = { endpoint: "https://push.example/abc", keys: { p256dh: "BNc", auth: "x1" } };
  const istek = (yontem: string, govde: unknown) =>
    new Request("https://akredit.org/panel/onaylar/abonelik", { method: yontem, body: JSON.stringify(govde) });

  it("geçerli aboneliği kaydeder ve siler", async () => {
    const depo = bellekAbonelikDeposu();
    expect((await abonelikIsle(istek("POST", gecerli), "k1", depo)).status).toBe(204);
    expect(await depo.listele("k1")).toHaveLength(1);
    expect(await depo.listele("k2")).toHaveLength(0);
    expect((await abonelikIsle(istek("DELETE", { endpoint: gecerli.endpoint }), "k1", depo)).status).toBe(204);
    expect(await depo.listele("k1")).toHaveLength(0);
  });
  it("güvensiz ya da eksik aboneliği reddeder", async () => {
    const depo = bellekAbonelikDeposu();
    const y = await abonelikIsle(istek("POST", { ...gecerli, endpoint: "http://push.example/a" }), "k1", depo);
    expect(y.status).toBe(400);
    expect(((await y.json()) as { hata: string }).hata).toMatch(/okunamadı/);
    expect((await abonelikIsle(istek("POST", { endpoint: "https://a.example" }), "k1", depo)).status).toBe(400);
    expect((await abonelikIsle(istek("PUT", gecerli), "k1", depo)).status).toBe(405);
    expect(await depo.listele("k1")).toHaveLength(0);
  });
});

describe("yardımcılar", () => {
  it("base64url çözer", () => {
    // "AQID" = [1, 2, 3]; "-_8" = 0xFB 0xFF (base64 "+/8=")
    expect([...base64UrlCoz("AQID")]).toEqual([1, 2, 3]);
    expect([...base64UrlCoz("-_8")]).toEqual([0xfb, 0xff]);
  });
  it("manifest kapsamı onay kutusudur", () => {
    const m = manifest();
    expect(m.scope).toBe(KAPSAM);
    expect(m.start_url).toBe(KAPSAM);
    expect(m.lang).toBe("tr");
  });
});
