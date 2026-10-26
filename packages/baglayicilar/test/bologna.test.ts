// Bologna (Proliz) ayrıştırıcısı. apps/cli/test/bologna.test.mjs senaryoları + CLI ile eşdeğerlik + sahte fetch ile uçtan uca okuma.
// Ağ yoktur; bütün sayfalar test/fixtures/bologna altındaki kurgu HTML dosyalarıdır.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { DisBaglam } from "../src/baglayici.ts";
import {
  adresCoz,
  dersKimlikleri,
  dersSayfasiCoz,
  metin,
  programCiktilari,
  programMatrisi,
  tablolar,
  tyycIsaretSayisi,
} from "../src/bologna-proliz/ayristir.ts";
import { KULLANICI_AJANI, programiOku } from "../src/bologna-proliz/oku.ts";

const fixture = (ad: string) => readFileSync(new URL(`./fixtures/bologna/${ad}`, import.meta.url), "utf8");

const hucre = (x: string) => `<td data-label="&lt;b>No&lt;/b>" onclick="if(a>b){x()}">${x}</td>`;
const tablo = (satirlar: string[][]) =>
  `<table>${satirlar.map((r) => `<tr>${r.map(hucre).join("")}</tr>`).join("")}</table>`;

const dersHtml = [
  tablo([
    ["Yarıyıl", "Kodu", "Adı", "T+U+L", "Kredi", "AKTS", "Son Güncelleme Tarihi"],
    ["3", "TBP201", "İNTERNET PROGRAMLAMA", "2+1+0", "0", "5", "19.09.2026"],
  ]),
  tablo([["Dersin Dili", "Türkçe"]]),
  tablo([
    ["Yarıyıl Çalışmaları", "Sayısı", "Katkı"],
    ["Ara Sınav", "1", "% 40"],
    ["Yarıyıl Sonu Sınavı", "1", "% 50"],
    ["Toplam :", "2", "% 100"],
  ]),
  tablo([
    ["İş Yükü", "Sayısı", "Süre", "Toplam İş Yükü (Saat)"],
    ["Ders Süresi", "14", "3", "42"],
    ["Ödevler", "14", "3", "42"],
    ["AKTS Kredisi : 3", "", "", "3"],
  ]),
  tablo([
    ["Sıra No", "Açıklama"],
    ["1", "HTML sayfası tasarlar."],
    ["2", "CSS uygular."],
  ]),
  tablo([["Hafta", "Konu"], ...Array.from({ length: 14 }, (_, i) => [String(i + 1), `Konu ${i + 1}`])]),
  tablo([
    ["", "P1", "P2"],
    ["Tüm", "4", "2"],
    ["Ö1", "3", "2"],
    ["Be2", "3", "1"],
    ["Ye3", "2", "1"],
  ]),
].join("");

describe("CLI senaryoları", () => {
  it("öznitelikte > olan hücreler ve sayısal karakter kodları doğru çözülür", () => {
    const t = tablolar(
      tablo([
        ["Sıra No", "A&#231;ıklama"],
        ["1", "Web&#39;in çalışmasını açıklar."],
      ]),
    );
    expect(t[0]?.[1]).toEqual(["1", "Web'in çalışmasını açıklar."]);
    expect(metin("<b>G&#252;ncelleme</b>&nbsp;x")).toBe("Güncelleme x");
  });

  it("ders sayfası ayrıştırılır, toplam satırları iş yüküne katılmaz", () => {
    const d = dersSayfasiCoz(dersHtml);
    expect(d.kod).toBe("TBP201");
    expect(d.akts).toBe(5);
    expect(d.kredi).toBe(0);
    expect(d.degerlendirme).toHaveLength(2);
    // 42 + 42; "AKTS Kredisi" satırı katılmaz.
    expect(d.isyuku.reduce((t, x) => t + (x.toplam ?? 0), 0)).toBe(84);
    expect(d.ciktilar[1]?.kod).toBe("Ö2");
    expect(d.haftalar).toBe(14);
    expect(d.katki["Tüm"]?.P1).toBe("4");
    expect(d.katki["Ö2"]?.P1, "Be2 satırı Ö2 sayılır").toBe("3");
    expect(d.katki["Ö3"], "Ye3 satırı Ö3 sayılır").toBeTruthy();
  });
});

describe("adresCoz", () => {
  it("taban, program ve dil çıkarılır", () => {
    expect(adresCoz("https://obs.kurgu.edu.tr/oibs/bologna/index.aspx?lang=en&curSunit=1234")).toEqual({
      taban: "https://obs.kurgu.edu.tr/oibs/bologna/",
      sunit: "1234",
      dil: "en",
    });
    expect(adresCoz("https://obs.kurgu.edu.tr/oibs/Bologna/index.aspx?curSunit=7").dil).toBe("tr");
  });
  it("Bologna adresi değilse anlaşılır hata verir", () => {
    expect(() => adresCoz("https://obs.kurgu.edu.tr/oibs/index.aspx?curSunit=7")).toThrow(/Bologna program adresi/);
    expect(() => adresCoz("https://obs.kurgu.edu.tr/oibs/bologna/index.aspx")).toThrow(/curSunit/);
  });
});

describe("kurgu sayfaları", () => {
  it("program çıktıları iç içe tablodan ve betik içindeki sahte tablo atlanarak okunur", () => {
    expect(programCiktilari(fixture("progLearnOutcomes.html"))).toEqual([
      { kod: "P1", metin: "Kurgu alanındaki temel kavramları açıklar." },
      { kod: "P2", metin: "Kurgu verilerini çözümler & yorumlar." },
      { kod: "P3", metin: "Ekip içinde sorumluluk alır." },
    ]);
  });

  it("matris: yarıyıl, zorunluluk ve grup başlığı", () => {
    const m = programMatrisi(fixture("progCourseMatrix.html"));
    expect(m.pkodlar).toEqual(["P1", "P2", "P3"]);
    expect(m.dersler.map((d) => d.kod)).toEqual(["KRG101", "KRG103", "SEC100", "KRG152", "KRG199"]);
    expect(m.dersler[0]).toMatchObject({
      zorunlu: true,
      yariyil: 1,
      grup: null,
      degerler: { P1: "4", P2: "3", P3: "-" },
    });
    expect(m.dersler[2]).toMatchObject({ grupBasligi: true, yariyil: 2, grup: "G1" });
    expect(m.dersler[3]?.zorunlu).toBe(false);
  });

  it("TYYÇ işaret sayısı", () => {
    // 1. satır (etiketli, 3+4 hücre): X, -, boş → 1; 2. satır (etiketsiz, 3+2 hücre): X, X, - → 2. Toplam 3.
    expect(tyycIsaretSayisi(fixture("progTYYCMatrix.html"), 3)).toBe(3);
    expect(tyycIsaretSayisi(fixture("progTYYCMatrix.html"), 0)).toBeNull();
  });

  it("ders kimlikleri, tırnaklı ve tırnaksız çağrılar", () => {
    expect(dersKimlikleri(fixture("progCourses.html"))).toEqual({ KRG101: "9001", KRG103: "9002", KRG152: "9003" });
  });
});

describe("CLI ile eşdeğerlik", () => {
  // CLI modülü tip bildirimsiz .mjs olduğu için dinamik içe aktarılır.
  const cliYolu = new URL("../../../apps/cli/lib/bologna.mjs", import.meta.url).href;
  // biome-ignore lint/suspicious/noExplicitAny: CLI modülünün tipi yok
  const cli = (): Promise<any> => import(cliYolu);
  const jsonla = (x: unknown) => JSON.parse(JSON.stringify(x));
  const sayfalar = [
    "progLearnOutcomes.html",
    "progCourseMatrix.html",
    "progTYYCMatrix.html",
    "progCourses.html",
    "ders-9001.html",
    "ders-9002.html",
    "ders-9003.html",
  ];

  it("metin, tablolar ve dersSayfasiCoz bütün sayfalarda aynı sonucu verir", async () => {
    const c = await cli();
    for (const html of [...sayfalar.map(fixture), dersHtml]) {
      expect(metin(html)).toBe(c.metin(html));
      expect(tablolar(html)).toEqual(c.tablolar(html));
      expect(jsonla(dersSayfasiCoz(html))).toEqual(jsonla(c.dersSayfasiCoz(html)));
    }
    expect(adresCoz("https://obs.kurgu.edu.tr/oibs/bologna/x.aspx?curSunit=5&lang=en")).toEqual(
      c.adresCoz("https://obs.kurgu.edu.tr/oibs/bologna/x.aspx?curSunit=5&lang=en"),
    );
  });

  it("programiOku sahte fetch ile CLI çıktısıyla aynı veriyi üretir", async () => {
    const c = await cli();
    const asil = globalThis.fetch;
    globalThis.fetch = sahteFetch().fetch;
    let cliSonuc: { okundu: string };
    try {
      cliSonuc = await c.programiOku(ADRES, { aralikMs: 0 });
    } finally {
      globalThis.fetch = asil;
    }
    const bizim = await programiOku(ADRES, sahteBaglam().baglam, { aralikMs: 0 });
    expect(jsonla({ ...bizim, okundu: "" })).toEqual(jsonla({ ...cliSonuc, okundu: "" }));
  });
});

const ADRES = "https://obs.kurgu.edu.tr/oibs/bologna/index.aspx?lang=tr&curSunit=4242";
const TABAN = "https://obs.kurgu.edu.tr/oibs/bologna/";

function sahteFetch(hatali: string[] = []) {
  const istekler: { adres: string; basliklar: Record<string, string>; sinyal: boolean }[] = [];
  const fetch = (async (girdi: string | URL | Request, init?: RequestInit) => {
    const adres = String(girdi);
    istekler.push({
      adres,
      basliklar: (init?.headers ?? {}) as Record<string, string>,
      sinyal: init?.signal instanceof AbortSignal,
    });
    const yol = adres.slice(TABAN.length);
    if (hatali.some((h) => yol.startsWith(h))) return new Response("", { status: 503 });
    const ders = yol.match(/curCourse=(\d+)/);
    const ad = ders ? `ders-${ders[1]}.html` : `${yol.split(".aspx")[0]}.html`;
    try {
      return new Response(fixture(ad), { status: 200 });
    } catch {
      return new Response("", { status: 404 });
    }
  }) as typeof globalThis.fetch;
  return { fetch, istekler };
}

function sahteBaglam(hatali: string[] = []) {
  const { fetch, istekler } = sahteFetch(hatali);
  const olaylar: string[] = [];
  const ilerlemeler: string[] = [];
  const baglam: DisBaglam = {
    fetch: (async (g: string | URL | Request, i?: RequestInit) => {
      olaylar.push(`istek ${String(g).slice(TABAN.length)}`);
      return fetch(g, i);
    }) as typeof globalThis.fetch,
    bekle: async (ms) => {
      olaylar.push(`bekle ${ms}`);
    },
    simdi: () => new Date("2026-10-26T09:00:00.000Z"),
    ilerleme: (m) => ilerlemeler.push(m),
  };
  return { baglam, istekler, olaylar, ilerlemeler };
}

describe("programiOku (uçtan uca, ağsız)", () => {
  it("istekler sıralı, aralıklı ve doğru başlıkla gider", async () => {
    const s = sahteBaglam();
    const v = await programiOku(ADRES, s.baglam);
    // İlk istekten önce beklenmez; sonraki her istekten önce varsayılan 350 ms beklenir.
    expect(s.olaylar).toEqual([
      "istek progLearnOutcomes.aspx?lang=tr&curSunit=4242",
      "bekle 350",
      "istek progCourseMatrix.aspx?lang=tr&curSunit=4242",
      "bekle 350",
      "istek progTYYCMatrix.aspx?lang=tr&curSunit=4242",
      "bekle 350",
      "istek progCourses.aspx?lang=tr&curSunit=4242",
      "bekle 350",
      "istek progCourseDetails.aspx?curCourse=9001&lang=tr",
      "bekle 350",
      "istek progCourseDetails.aspx?curCourse=9002&lang=tr",
      "bekle 350",
      "istek progCourseDetails.aspx?curCourse=9003&lang=tr",
    ]);
    expect(s.istekler.every((i) => i.basliklar["User-Agent"] === KULLANICI_AJANI && i.sinyal)).toBe(true);
    expect(s.ilerlemeler).toContain("Ders 3/3: KRG152");
    expect(v.okundu).toBe("2026-10-26T09:00:00.000Z");
    expect(v.programCiktilari).toHaveLength(3);
    expect(v.tyycIsaret).toBe(3);
    // SEC100 grup başlığı, KRG199 ders listesinde yok: ikisi de okunmaz.
    expect(v.dersler.map((d) => d.kod)).toEqual(["KRG101", "KRG103", "KRG152"]);
    const [a, b, bos] = v.dersler;
    expect(a).toMatchObject({
      zorunlu: true,
      bos: false,
      akts: 5,
      kaynak: `${TABAN}progCourseDetails.aspx?curCourse=9001`,
    });
    // 42 + 84 + 24 = 150 saat; "AKTS Kredisi" satırı katılmaz.
    expect(a && "isyuku" in a ? a.isyuku.reduce((t, x) => t + (x.toplam ?? 0), 0) : 0).toBe(150);
    expect(b).toMatchObject({ kod: "KRG103", akts: 4 });
    expect(bos).toMatchObject({ kod: "KRG152", ad: "KURGU SEÇMELİSİ", bos: true, zorunlu: false });
  });

  it("ders listesiyle süzülür, aralık değiştirilebilir", async () => {
    const s = sahteBaglam();
    const v = await programiOku(ADRES, s.baglam, { dersler: ["KRG103"], aralikMs: 1000 });
    expect(v.dersler.map((d) => d.kod)).toEqual(["KRG103"]);
    expect(s.olaylar.filter((o) => o.startsWith("bekle"))).toEqual([
      "bekle 1000",
      "bekle 1000",
      "bekle 1000",
      "bekle 1000",
    ]);
  });

  it("okunamayan ders sayfası hata kaydı olur, süreç sürer", async () => {
    const s = sahteBaglam(["progCourseDetails.aspx?curCourse=9002"]);
    const v = await programiOku(ADRES, s.baglam);
    expect(v.dersler[1]).toEqual({ kod: "KRG103", hata: "progCourseDetails.aspx?curCourse=9002&lang=tr: HTTP 503" });
    expect(v.dersler).toHaveLength(3);
  });

  it("program sayfası okunamazsa hata fırlatır", async () => {
    await expect(programiOku(ADRES, sahteBaglam(["progCourseMatrix"]).baglam)).rejects.toThrow(/HTTP 503/);
  });
});
