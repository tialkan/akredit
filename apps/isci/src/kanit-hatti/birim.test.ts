import { createServer, type Server } from "node:net";
import { zipSync } from "fflate";
import { afterEach, describe, expect, it } from "vitest";
import { kisiselVeriTara } from "./adimlar.ts";
import { dosyaAdiTemizle, epostaAl, gonderenDogrula, kanitAl, zipAl } from "./alma.ts";
import { kurumYzAyari } from "./baglam.ts";
import { cikarmaHavuzu, SURE_DOLDU } from "./cikarma.ts";
import { durumOzeti } from "./durum.ts";
import { bellekKuyrugu } from "./kuyruk.ts";
import { type KomutCalistirici, tesseractOcr } from "./ocr.ts";
import { hatKur, KURUM, UYDURMA_TCKN, zipYap } from "./test/yardimci.ts";
import { clamdTarayici } from "./virus.ts";

const metin = (s: string) => new TextEncoder().encode(s);
let kapat: (() => Promise<void>) | undefined;
afterEach(async () => {
  await kapat?.();
  kapat = undefined;
});

describe("bellek kuyruğu", () => {
  it("yeniden dener, sonra ölü mektup kuyruğuna atar; tekil anahtar yinelemeyi önler", async () => {
    const k = bellekKuyrugu();
    const denemeler: number[] = [];
    const olu: string[] = [];
    await k.isle<{ n: number }>(
      "is",
      { yenidenDeneme: 2 },
      async (v, deneme) => {
        denemeler.push(deneme);
        if (v.n === 1) throw new Error("hep bozuk");
      },
      async (_v, h) => {
        olu.push(h);
      },
    );
    await k.gonder("is", { n: 1 }, { tekilAnahtar: "a" });
    await k.gonder("is", { n: 1 }, { tekilAnahtar: "a" });
    await k.gonder("is", { n: 2 });
    await k.bosalt();
    // n=1: 0,1,2 (üç deneme); n=2: 0. Sıra: 0(n1),0(n2),1,2.
    expect(denemeler).toEqual([0, 0, 1, 2]);
    expect(olu).toEqual(["hep bozuk"]);
    expect(k.olu[0]?.kuyruk).toBe("is.olu");
    expect(k.tamamlanan).toHaveLength(1);
  });
});

describe("yalıtılmış çıkarma", () => {
  it("metni worker'da çıkarır; kilitlenen worker süre dolunca kesilir ve havuz çalışmaya devam eder", async () => {
    const h = cikarmaHavuzu();
    try {
      const a = await h.cikar(metin("Birinci belge metni."), { ad: "a.txt" });
      expect(a.bolumler[0]?.metin).toBe("Birinci belge metni.");
      const kilit = await h.cikar(metin("x"), { ad: "b.txt" }, { kilitle: true, toplamSureMs: 300 });
      expect(kilit.uyarilar).toEqual([SURE_DOLDU]);
      expect(kilit.bolumler).toEqual([]);
      const c = await h.cikar(metin("Üçüncü belge."), { ad: "c.txt" });
      expect(c.bolumler[0]?.metin).toBe("Üçüncü belge.");
    } finally {
      await h.kapat();
    }
  }, 30_000);
});

describe("OCR", () => {
  it("PDF'i sayfa görüntülerine çevirip her sayfayı Türkçe dil verisiyle okur", async () => {
    const cagrilar: string[][] = [];
    const calistir: KomutCalistirici = async (komut, arg) => {
      cagrilar.push([komut, ...arg]);
      if (komut === "pdftoppm") {
        const { writeFile } = await import("node:fs/promises");
        const onEk = arg.at(-1) as string;
        await writeFile(`${onEk}-2.png`, "");
        await writeFile(`${onEk}-10.png`, "");
        await writeFile(`${onEk}-1.png`, "");
        return "";
      }
      return `  metin ${arg[0]?.match(/s-(\d+)\.png$/u)?.[1]}\n`;
    };
    const ocr = tesseractOcr({ calistirici: calistir });
    expect(ocr.ad).toBe("tesseract-tur");
    const s = await ocr.oku(metin("%PDF-"), "pdf");
    expect(s).toEqual([
      { sayfa: 1, metin: "metin 1" },
      { sayfa: 2, metin: "metin 2" },
      { sayfa: 3, metin: "metin 10" },
    ]);
    expect(cagrilar[0]?.[0]).toBe("pdftoppm");
    expect(cagrilar[1]).toEqual([
      "tesseract",
      expect.stringMatching(/s-1\.png$/u),
      "stdout",
      "-l",
      "tur",
      "--psm",
      "1",
    ]);
    const g = await tesseractOcr({ calistirici: async () => "görsel yazısı" }).oku(metin("x"), "gorsel");
    expect(g).toEqual([{ sayfa: 1, metin: "görsel yazısı" }]);
  });
});

describe("virüs taraması (clamd)", () => {
  let sunucu: Server | undefined;
  afterEach(() => {
    sunucu?.close();
    sunucu = undefined;
  });

  async function sahteClamd(): Promise<number> {
    sunucu = createServer((s) => {
      const parcalar: Buffer[] = [];
      s.on("data", (d) => {
        parcalar.push(d);
        const t = Buffer.concat(parcalar);
        if (t.length >= 14 && t.subarray(-4).readUInt32BE() === 0) {
          // INSTREAM gövdesi: komut + (uzunluk + veri)* + 0
          const govde = t.subarray(10, -4).toString("latin1");
          s.end(govde.includes("EICAR") ? "stream: Eicar-Test-Signature FOUND\0" : "stream: OK\0");
        }
      });
    });
    await new Promise<void>((r) => sunucu?.listen(0, "127.0.0.1", r));
    const adres = sunucu.address();
    return typeof adres === "object" && adres ? adres.port : 0;
  }

  it("temiz ve zararlı dosyayı ayırır; zararlı dosya kanıt olmaz", async () => {
    const port = await sahteClamd();
    const t = clamdTarayici({ host: "127.0.0.1", port });
    expect(await t.tara(metin("temiz içerik"))).toEqual({ temiz: true });
    expect(await t.tara(metin("X5O EICAR deneme"))).toEqual({ temiz: false, bulgu: "Eicar-Test-Signature" });
    const h = await hatKur({ virus: t });
    kapat = h.kapat;
    const s = await kanitAl(h.b, { kurumId: KURUM, veri: metin("EICAR"), dosyaAdi: "x.txt", kaynakTuru: "yukleme" });
    expect(s).toMatchObject({ durum: "reddedildi", ileti: expect.stringMatching(/zararlı/u) });
    expect(h.depo.nesneler.size).toBe(0);
  }, 60_000);

  it("ulaşılamayan hizmette Türkçe hata verir", async () => {
    const t = clamdTarayici({ host: "127.0.0.1", port: 1 });
    await expect(t.tara(metin("x"))).rejects.toThrow(/ulaşılamadı/u);
  });
});

describe("alma yolları", { timeout: 60_000 }, () => {
  it("dosya adını temizler", () => {
    expect(dosyaAdiTemizle("../../etc/passwd")).toBe("passwd");
    expect(dosyaAdiTemizle("a\\b\\c\u0000d.pdf")).toBe("cd.pdf");
    expect(dosyaAdiTemizle("  ")).toBe("adsiz");
  });

  it("boş, büyük ve hatalı girdiyi reddeder", async () => {
    const h = await hatKur({ enBuyukBoyut: 10 });
    kapat = h.kapat;
    const g = { kurumId: KURUM, dosyaAdi: "a.txt", kaynakTuru: "yukleme" as const };
    expect(await kanitAl(h.b, { ...g, veri: new Uint8Array() })).toMatchObject({ durum: "reddedildi" });
    expect(await kanitAl(h.b, { ...g, veri: metin("on bir bayt") })).toMatchObject({
      durum: "reddedildi",
      ileti: expect.stringMatching(/çok büyük/u),
    });
    expect(await kanitAl(h.b, { ...g, kurumId: "kurum", veri: metin("x") })).toMatchObject({ durum: "reddedildi" });
  });

  it("ZIP: gizli ve sistem dosyalarını atlar, sınırı aşan ve bozuk paketi açmaz", async () => {
    const h = await hatKur();
    kapat = h.kapat;
    const g = { kurumId: KURUM, kaynakTuru: "yukleme" as const, paketAdi: "p.zip" };
    const zip = zipYap({
      "a/belge.txt": metin("Belge metni."),
      "__MACOSX/a/._belge.txt": metin("çöp"),
      ".DS_Store": metin("çöp"),
      "a/.gizli": metin("çöp"),
    });
    const s = await zipAl(h.b, { ...g, veri: zip });
    expect(s.dosyalar.map((d) => d.ad)).toEqual(["belge.txt"]);
    expect((await zipAl(h.b, { ...g, veri: zip }, { enCokDosya: 2 })).uyarilar[0]).toMatch(/çok fazla/u);
    expect((await zipAl(h.b, { ...g, veri: zip }, { enBuyukAcilmis: 5 })).uyarilar[0]).toMatch(/çok büyük/u);
    expect((await zipAl(h.b, { ...g, veri: metin("zip değil") })).uyarilar[0]).toMatch(/açılamadı/u);
  });

  it("ZIP: boyutu kurcalanmış (kesilen) dosyayı kanıt olarak kaydetmez (İP-27)", async () => {
    const h = await hatKur();
    kapat = h.kapat;
    const g = { kurumId: KURUM, kaynakTuru: "yukleme" as const, paketAdi: "p.zip" };
    const z = zipSync({ "kesik.txt": metin("a".repeat(100)), "saglam.txt": metin("Sağlam.") }, { level: 0 });
    // Merkez dizindeki ilk girdinin (kesik.txt) açılmış boyutunu 10 bayta indir.
    const v = new DataView(z.buffer, z.byteOffset, z.byteLength);
    for (let i = 0; i + 4 <= z.length; i++)
      if (v.getUint32(i, true) === 0x02014b50) {
        v.setUint32(i + 24, 10, true);
        break;
      }
    const s = await zipAl(h.b, { ...g, veri: z });
    expect(s.dosyalar.find((d) => d.ad === "kesik.txt")).toMatchObject({ durum: "reddedildi" });
    expect(s.dosyalar.find((d) => d.ad === "saglam.txt")?.durum).not.toBe("reddedildi");
  });

  it("e-posta: doğrulanmış gönderenin eklerini (ZIP içi dahil) alır, diğerlerini reddeder", async () => {
    const h = await hatKur();
    kapat = h.kapat;
    const p = { izinliGonderenler: ["ornek.edu.tr", "dis@baska.org"] };
    const gecer = { spf: "pass", dkim: "pass", dmarc: "pass" } as const;
    const ileti = {
      kurumId: KURUM,
      gonderen: "kalite@muh.ornek.edu.tr",
      konu: "Kanıtlar",
      dogrulama: gecer,
      ekler: [
        { ad: "tutanak.txt", mime: "text/plain", veri: metin("Toplantı tutanağı.") },
        { ad: "paket.zip", veri: zipYap({ "rapor.txt": metin("Faaliyet raporu.") }) },
      ],
    };
    const s = await epostaAl(h.b, ileti, p);
    expect(s.dosyalar.map((d) => [d.ad, d.durum])).toEqual([
      ["tutanak.txt", "eklendi"],
      ["rapor.txt", "eklendi"],
    ]);
    expect((await epostaAl(h.b, { ...ileti, gonderen: "biri@sahte.com" }, p)).uyarilar[0]).toMatch(/gönderemez/u);
    const sahte = { ...ileti, dogrulama: { spf: "pass", dkim: "fail", dmarc: "fail" } as const };
    expect((await epostaAl(h.b, sahte, p)).uyarilar[0]).toMatch(/doğrulanamadı/u);
    expect((await epostaAl(h.b, { ...ileti, gonderen: "x" }, p)).uyarilar[0]).toMatch(/okunamadı/u);
    expect((await epostaAl(h.b, { ...ileti, ekler: [] }, p)).uyarilar[0]).toMatch(/ek bulunamadı/u);
    // Tam adres izni; alan adı benzerliği (kotuornek.edu.tr) izin vermez.
    const d = (gonderen: string) =>
      gonderenDogrula({ ...ileti, gonderen, konu: "", dogrulama: { spf: "fail", dkim: "fail", dmarc: "pass" } }, p);
    expect(d("dis@baska.org").gecerli).toBe(true);
    expect(d("baska@baska.org").gecerli).toBe(false);
    expect(d("a@kotuornek.edu.tr").gecerli).toBe(false);
    // Saldırganın kendi alan adıyla SPF ve DKIM geçer ama From alan adıyla hizalı değildir; hizalamayı
    // yalnız DMARC sonucu gösterir. DMARC geçmeyen ileti kurum adına kabul edilmez.
    const hizasiz = gonderenDogrula({ ...ileti, konu: "", dogrulama: { spf: "pass", dkim: "pass", dmarc: "none" } }, p);
    expect(hizasiz.gecerli).toBe(false);
    await h.kuyruk.bosalt();
    const k = await durumOzeti(h.db, KURUM);
    expect(k.kanitlar).toHaveLength(2);
  });
});

describe("kurum ayarı ve kişisel veri taraması", { timeout: 60_000 }, () => {
  it("kurum ayarı yoksa yurt dışı izni kapalıdır; ayar varsa okunur", async () => {
    const h = await hatKur({ yzAyari: undefined });
    kapat = h.kapat;
    expect(await kurumYzAyari(h.b, KURUM)).toEqual({ yurtDisiIzin: false, maske: {} });
    const { sema } = await import("@akredit/vt");
    const { eq } = await import("drizzle-orm");
    await h.db
      .update(sema.kurum)
      .set({ ayarlar: { yz: { yurtDisiIzin: true, adlar: ["Ayşe Uydurma"], ogrenciNoDesenleri: ["\\b2\\d{8}\\b"] } } })
      .where(eq(sema.kurum.id, KURUM));
    const a = await kurumYzAyari(h.b, KURUM);
    expect(a.yurtDisiIzin).toBe(true);
    expect(kisiselVeriTara([`Ayşe Uydurma (209912345) ${UYDURMA_TCKN}`], a)).toEqual({
      KİŞİ: 1,
      "ÖĞRENCİ-NO": 1,
      TCKN: 1,
    });
    await h.db
      .update(sema.kurum)
      .set({ ayarlar: { yz: { yurtDisiIzin: "evet" } } })
      .where(eq(sema.kurum.id, KURUM));
    expect((await kurumYzAyari(h.b, KURUM)).yurtDisiIzin).toBe(false);
  });
});
