import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ozetHesapla } from "@akredit/cekirdek";
import { afterEach, describe, expect, it } from "vitest";
import {
  anahtarCoz,
  bellekDepo,
  DepoHatasi,
  imzaliBaglantiDogrula,
  nesneAnahtari,
  s3Depo,
  s3OnImzaliAdres,
  yerelDepo,
} from "../src/index.ts";

const KURUM = "01900000-0000-7000-8000-00000000000a";
const GIZLI = "uydurma-test-gizlisi-en-az-otuz-iki-karakter";
const metin = (s: string) => new TextEncoder().encode(s);

describe("anahtar", () => {
  it("kurum/özet biçimindedir ve biçim dışını reddeder", () => {
    const o = ozetHesapla("a");
    expect(nesneAnahtari(KURUM, o)).toBe(`${KURUM}/${o}`);
    expect(anahtarCoz(`${KURUM}/${o}`)).toEqual({ kurumId: KURUM, ozet: o });
    expect(() => anahtarCoz(`${KURUM}/../${o}`)).toThrow(DepoHatasi);
    expect(() => anahtarCoz(`x/${o}`)).toThrow(DepoHatasi);
    expect(() => nesneAnahtari(KURUM, "ABC")).toThrow(DepoHatasi);
  });
});

describe("yerel disk deposu", () => {
  let kok = "";
  afterEach(async () => {
    if (kok) await rm(kok, { recursive: true, force: true });
  });

  it("içerik adresli saklar, ikinci kez yazmaz, salt okunur yapar", async () => {
    kok = await mkdtemp(join(tmpdir(), "depo-"));
    const d = yerelDepo({ kok, imzaGizlisi: GIZLI });
    const a = await d.koy(KURUM, metin("tutanak"));
    expect(a.yeni).toBe(true);
    expect(a.ozet).toBe(ozetHesapla("tutanak"));
    const b = await d.koy(KURUM, metin("tutanak"));
    expect(b).toEqual({ ...a, yeni: false });
    expect(await d.al(a.anahtar)).toEqual(metin("tutanak"));
    expect(await d.varMi(a.anahtar)).toBe(true);
    const dosya = join(kok, KURUM, a.ozet.slice(0, 2), a.ozet);
    expect((await stat(dosya)).mode & 0o222).toBe(0);
  });

  it("eşzamanlı aynı içerikte yalnız biri yazar", async () => {
    kok = await mkdtemp(join(tmpdir(), "depo-"));
    const d = yerelDepo({ kok, imzaGizlisi: GIZLI });
    const s = await Promise.all(Array.from({ length: 8 }, () => d.koy(KURUM, metin("aynı"))));
    expect(s.filter((x) => x.yeni)).toHaveLength(1);
  });

  it("bozulmuş dosyayı okurken fark eder", async () => {
    kok = await mkdtemp(join(tmpdir(), "depo-"));
    const d = yerelDepo({ kok, imzaGizlisi: GIZLI });
    const a = await d.koy(KURUM, metin("özgün"));
    const dosya = join(kok, KURUM, a.ozet.slice(0, 2), a.ozet);
    await rm(dosya, { force: true });
    await writeFile(dosya, "kurcalanmış");
    await expect(d.al(a.anahtar)).rejects.toThrow(/bozulmuş/u);
    await expect(d.al(`${KURUM}/${ozetHesapla("yok")}`)).rejects.toThrow(/bulunamadı/u);
    expect(await readFile(dosya, "utf8")).toBe("kurcalanmış");
  });

  it("imzalı bağlantı süre dolunca ve kurcalanınca reddedilir", async () => {
    kok = await mkdtemp(join(tmpdir(), "depo-"));
    const d = yerelDepo({ kok, imzaGizlisi: GIZLI });
    const a = await d.koy(KURUM, metin("x"));
    const b = await d.baglanti(a.anahtar, 60, 1000);
    expect(imzaliBaglantiDogrula(b, GIZLI, 1060)).toBe(a.anahtar);
    expect(() => imzaliBaglantiDogrula(b, GIZLI, 1061)).toThrow(/süresi dolmuş/u);
    expect(() => imzaliBaglantiDogrula(b.replace("b=1060", "b=9999"), GIZLI, 1000)).toThrow(/geçersiz/u);
    expect(() => imzaliBaglantiDogrula(b, `${GIZLI}x`, 1000)).toThrow(/geçersiz/u);
    await expect(d.baglanti(a.anahtar, 0)).rejects.toThrow(DepoHatasi);
    expect(() => yerelDepo({ kok, imzaGizlisi: "kısa" })).toThrow(DepoHatasi);
  });
});

describe("bellek deposu", () => {
  it("tekilleştirir ve kopya döndürür", async () => {
    const d = bellekDepo();
    const a = await d.koy(KURUM, metin("y"));
    expect((await d.koy(KURUM, metin("y"))).yeni).toBe(false);
    const v = await d.al(a.anahtar);
    v[0] = 0;
    expect(await d.al(a.anahtar)).toEqual(metin("y"));
    expect(await d.baglanti(a.anahtar, 10, 0)).toContain("b=10");
  });
});

describe("S3 sürücüsü", () => {
  it("AWS belgelerindeki ön imzalı adres örneğini birebir üretir", () => {
    // Beklenen imza AWS S3 belgelerindeki "Authenticating Requests: Using Query Parameters" örneğidir
    // (examplebucket, test.txt, 20130524T000000Z, 86400 sn, us-east-1, belgelerdeki örnek anahtarlar).
    const adres = s3OnImzaliAdres(
      {
        host: "examplebucket.s3.amazonaws.com",
        yol: "/test.txt",
        protokol: "https:",
        bolge: "us-east-1",
        erisimAnahtari: "AKIAIOSFODNN7EXAMPLE",
        gizliAnahtar: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY",
      },
      86400,
      Date.UTC(2013, 4, 24),
    );
    expect(adres).toContain("X-Amz-Signature=aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404");
  });

  function sahteS3() {
    const nesneler = new Map<string, Uint8Array>();
    const istekler: { adres: string; ayar: RequestInit }[] = [];
    const f = async (adres: string, ayar: RequestInit) => {
      istekler.push({ adres, ayar });
      const yol = new URL(adres).pathname;
      const h = ayar.headers as Record<string, string>;
      if (!h.authorization?.startsWith("AWS4-HMAC-SHA256 Credential=AK/")) return new Response(null, { status: 403 });
      if (ayar.method === "PUT") {
        if (nesneler.has(yol) && h["if-none-match"] === "*") return new Response(null, { status: 412 });
        nesneler.set(yol, ayar.body as Uint8Array);
        return new Response(null, { status: 200 });
      }
      const v = nesneler.get(yol);
      if (!v) return new Response(null, { status: 404 });
      return new Response(ayar.method === "HEAD" ? null : (v as unknown as NonNullable<RequestInit["body"]>), {
        status: 200,
      });
    };
    return { nesneler, istekler, f };
  }

  it("koşullu yazar, kilit başlıklarını gönderir, okur ve doğrular", async () => {
    const s = sahteS3();
    const d = s3Depo({
      ucNokta: "http://minio.yerel:9000",
      bolge: "tr-1",
      kova: "kanit",
      erisimAnahtari: "AK",
      gizliAnahtar: "uydurma",
      kilitGun: 3650,
      fetch: s.f,
      saat: () => Date.UTC(2026, 0, 1),
    });
    expect(d.kilitli).toBe(true);
    const a = await d.koy(KURUM, metin("rapor"), { mime: "application/pdf" });
    expect(a.yeni).toBe(true);
    expect((await d.koy(KURUM, metin("rapor"))).yeni).toBe(false);
    const h = s.istekler[0]?.ayar.headers as Record<string, string>;
    expect(s.istekler[0]?.adres).toBe(`http://minio.yerel:9000/kanit/${KURUM}/${a.ozet}`);
    expect(h["x-amz-object-lock-mode"]).toBe("COMPLIANCE");
    expect(h["x-amz-object-lock-retain-until-date"]).toBe("2035-12-30T00:00:00.000Z");
    expect(h["if-none-match"]).toBe("*");
    expect(await d.al(a.anahtar)).toEqual(metin("rapor"));
    expect(await d.varMi(a.anahtar)).toBe(true);
    expect(await d.varMi(`${KURUM}/${ozetHesapla("yok")}`)).toBe(false);
    await expect(d.al(`${KURUM}/${ozetHesapla("yok")}`)).rejects.toThrow(/bulunamadı/u);
    const b = await d.baglanti(a.anahtar, 300, 1_700_000_000);
    expect(b).toMatch(/^http:\/\/minio\.yerel:9000\/kanit\/.+X-Amz-Expires=300.+X-Amz-Signature=[0-9a-f]{64}$/u);
  });

  it("kurcalanmış içeriği ve ulaşılamayan sunucuyu Türkçe hatayla bildirir", async () => {
    const s = sahteS3();
    const d = s3Depo({
      ucNokta: "http://m",
      bolge: "r",
      kova: "k",
      erisimAnahtari: "AK",
      gizliAnahtar: "g",
      fetch: s.f,
    });
    const a = await d.koy(KURUM, metin("asıl"));
    s.nesneler.set(`/k/${a.anahtar}`, metin("başka"));
    await expect(d.al(a.anahtar)).rejects.toThrow(/bozulmuş/u);
    const kopuk = s3Depo({
      ucNokta: "http://m",
      bolge: "r",
      kova: "k",
      erisimAnahtari: "AK",
      gizliAnahtar: "g",
      fetch: async () => {
        throw new Error("ECONNREFUSED");
      },
    });
    await expect(kopuk.koy(KURUM, metin("x"))).rejects.toThrow(/ulaşılamadı/u);
  });
});
