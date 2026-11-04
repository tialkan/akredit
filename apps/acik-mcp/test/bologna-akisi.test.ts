// Hoca akışı: istemler (prompts) ve Bologna araçları. Uçtan uca testler resmî SDK istemcisiyle, ağsız
// (fetch yerine işleyici) çalışır. Örnek ders ve sayfalar kurgudur (KRG101 Kurgu Bilimine Giriş).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { describe, expect, it } from "vitest";
import {
  ACIK_ARACLAR,
  ACIK_ISTEMLER,
  ALANLAR,
  acikMcpIsleyici,
  aracCalistir,
  BLOOM_FIILLERI,
  ORTAK_KURALLAR,
} from "../src/index.ts";

const SIMDI = () => new Date("2026-11-04T10:00:00Z");
const FIXTURE = join(import.meta.dirname, "../../../packages/baglayicilar/test/fixtures");
const oku = (yol: string) => readFileSync(join(FIXTURE, yol), "utf8");

async function baglan() {
  const isleyici = acikMcpIsleyici({ simdi: SIMDI, gunluk: () => {} });
  const tasima = new StreamableHTTPClientTransport(new URL("https://akredit.org/mcp"), {
    fetch: (u, i) => isleyici(new Request(u, i)),
  });
  const istemci = new Client({ name: "test", version: "1.0.0" });
  await istemci.connect(tasima);
  return istemci;
}

const veri = (r: unknown) => (r as { structuredContent: Record<string, unknown> }).structuredContent;
const istemMetni = (r: { messages: { content: unknown }[] }) =>
  String((r.messages[0]?.content as { text?: string } | undefined)?.text ?? "");
const calistir = (ad: string, girdi: unknown) => {
  const a = ACIK_ARACLAR.find((x) => x.ad === ad);
  if (!a) throw new Error(ad);
  return aracCalistir(a, girdi, { simdi: SIMDI });
};
// biome-ignore lint/suspicious/noExplicitAny: test yardımcı erişimi
const sonuc = (r: { veri: Record<string, unknown> }) => r.veri.sonuc as any;

const kelimeler = (n: number, k = "kurgu") => Array.from({ length: n }, () => k).join(" ");

/** Bloom fiilleriyle kurulmuş, kurallara uyan 8 çıktı: 5 Beceri, 2 Bilgi, 1 Yetkinlik. */
const CIKTILAR = [
  ["Kurgu kavramlarını örneklerle açıklar.", "Bilgi"],
  ["Kurgu türlerini ölçütlere göre sınıflandırır.", "Bilgi"],
  ["Kurgu yöntemlerini örnek metinlere uygular.", "Beceri"],
  ["Kurgu verisinden temel göstergeleri hesaplar.", "Beceri"],
  ["İki kurgu yaklaşımını karşılaştırır.", "Beceri"],
  ["Kurgu sorunlarını uygun yöntemle çözer.", "Beceri"],
  ["Kurgu çalışmalarını gerekçeleriyle değerlendirir.", "Beceri"],
  ["Ekip içinde küçük bir kurgu projesi tasarlar.", "Yetkinlik"],
].map(([tr, tur], i) => ({ kod: `Ö${i + 1}`, tr, tur }));

describe("istemler (prompts)", () => {
  it("SDK istemcisi altı istemi listeler; başlangıç odak menüsünü ve ortak kuralları taşır", async () => {
    const c = await baglan();
    const { prompts } = await c.listPrompts();
    expect(prompts.map((p) => p.name).sort()).toEqual(
      ["baslangic", "bologna_doldur", "cikti_yaz", "ck_pc_hesabi", "dil_denetimi", "olcut_rehberi"].sort(),
    );
    for (const p of prompts) {
      expect(p.title).toBeTruthy();
      expect(p.description).toBeTruthy();
      // Bütün bağımsız değişkenler isteğe bağlı: istem tek tıkla çalışır.
      for (const a of p.arguments ?? []) expect(a.required).toBeFalsy();
    }
    const r = await c.getPrompt({ name: "baslangic", arguments: {} });
    const metin = istemMetni(r);
    expect(metin).toContain("Bugün neye odaklanalım?");
    for (const n of [
      "1) Bologna",
      "2) Ders öğrenme çıktısı",
      "3) ÇK ve PÇ",
      "4) YÖKAK, MÜDEK, FEDEK, EPDAD ya da SABAK",
      "5) Öz değerlendirme",
    ])
      expect(metin).toContain(n);
    expect(metin).toContain(ORTAK_KURALLAR);
    expect(metin).toMatch(/hepsini 1 ile doldur/u);
    await c.close();
  });

  it("odak numarası verilince yalnız o akış döner; ders kodu metne girer ve sınırlanır", async () => {
    const c = await baglan();
    const r = await c.getPrompt({ name: "baslangic", arguments: { odak: "1" } });
    const metin = istemMetni(r);
    expect(metin).toContain("Odak: Bologna ders bilgi paketini denetle");
    expect(metin).not.toContain("Odak: ÇK ve PÇ");
    const b = await c.getPrompt({ name: "bologna_doldur", arguments: { ders_kodu: "KRG101\n```kötü" } });
    const bm = istemMetni(b);
    expect(bm).toContain("Ders: KRG101");
    expect(bm).not.toContain("```");
    await c.close();
  });

  it("istem metinlerinde em-dash ve kalın yazı yok; her akış seçenek ve kopya çıktısı ister", () => {
    for (const i of ACIK_ISTEMLER) {
      const m = i.metin({});
      expect(m).not.toMatch(/—|\*\*/u);
      expect(m).toMatch(/1\) .+ 2\) /u);
      expect(m).toMatch(/kopyalanabilir|kopya/u);
    }
  });
});

describe("bologna_denetle (alan listesi)", () => {
  it("boş, zayıf, tamam ve bilinmeyen alanları numaralı döndürür", () => {
    const r = calistir("bologna_denetle", {
      ders: {
        kod: "KRG101",
        tul: "3+0+0",
        akts: 5,
        amac: "",
        yontem: kelimeler(30),
        kaynakSayisi: 1,
        ciktilar: [{ kod: "Ö1", metin: "Temel kavramları sayar." }],
        degerlendirme: [
          { ad: "Ara Sınav", sayi: 1, katki: 40 },
          { ad: "Yarıyıl Sonu Sınavı", sayi: 1, katki: 60 },
        ],
        // 14x3 + 14x6 + 2x12 = 42 + 84 + 24 = 150; 150 / 5 = 30 saat/AKTS, aralıkta.
        isyuku: [
          { ad: "Ders Süresi", sayi: 14, sure: 3, toplam: 42 },
          { ad: "Bireysel Çalışma", sayi: 14, sure: 6, toplam: 84 },
          { ad: "Sınavlar", sayi: 2, sure: 12, toplam: 24 },
        ],
        haftalar: 3,
      },
    });
    expect(r.hata).toBe(false);
    const s = sonuc(r);
    const durum = Object.fromEntries(s.alanlar.map((a: { alan: string; durum: string }) => [a.alan, a.durum]));
    expect(durum).toMatchObject({
      amac: "bos",
      icerik: "bilinmiyor",
      yontem: "zayif",
      ciktilar: "zayif",
      degerlendirme: "tamam",
      isyuku: "tamam",
      dersYapisi: "bos",
      haftalar: "zayif",
      katki: "bos",
      kaynaklar: "zayif",
    });
    const yontem = s.alanlar.find((a: { alan: string }) => a.alan === "yontem");
    expect(yontem.nedenler.join(" ")).toMatch(/30 kelime \(beklenen 40-90\)/u);
    const cikti = s.alanlar.find((a: { alan: string }) => a.alan === "ciktilar");
    expect(cikti.nedenler.join(" ")).toMatch(/1 öğrenme çıktısı var, 8-12/u);
    expect(s.doldurulacak).toEqual(
      s.alanlar
        .filter((a: { durum: string }) => a.durum === "bos" || a.durum === "zayif")
        .map((a: { no: number }) => a.no),
    );
    expect(s.ozet).toMatch(/alan doldurulmalı/u);
    expect(r.veri.sonrakiAdim).toMatch(/1\) hepsini/u);
  });
});

describe("bologna_alan_rehberi", () => {
  it("iş yükü hedefini hesaplar: 5 AKTS x 30 = 150, ders süresi 14 x 3 = 42, kalan 108", () => {
    const s = sonuc(calistir("bologna_alan_rehberi", { alan: "isyuku", akts: 5, tul: "2+1+0" }));
    expect(s.isyukuHesabi).toMatchObject({
      hedefSaat: 150,
      dersSuresiSatiri: { sayi: 14, sure: 3, toplam: 42 },
      kalanSaat: 108,
    });
    expect(s.resmiDayanak.durum).toBe("DOĞRULANMADI");
    expect(s.secenekUretimi).toMatch(/Sunucu metin üretmez/u);
  });

  it("çıktı alanında Bloom fiilleri ve 8-12 sınırı gelir; kişi adı içeren alan MCP'de taşınmaz", () => {
    const s = sonuc(calistir("bologna_alan_rehberi", { alan: "ciktilar" }));
    expect(s.alanlar[0].bloomFiilleri).toHaveLength(6);
    expect(s.alanlar[0].sinir).toEqual({ enAzCikti: 8, enCokCikti: 12 });
    const y = calistir("bologna_alan_rehberi", { alan: "yetkililer" });
    expect(String(y.veri.sonrakiAdim)).toMatch(/kendisinin yazmasını/u);
    expect(ALANLAR.kaynaklar.mcpTasir).toBe(false);
  });

  it("Bloom örnek fiilleriyle yazılan her çıktı taslak denetiminden geçer", () => {
    const ciktilar = BLOOM_FIILLERI.flatMap((d) => d.fiiller).map((f, i) => ({
      kod: `Ö${i + 1}`,
      tr: `Kurgu konusunu ${f}.`,
      tur: i === 0 ? "Yetkinlik" : "Beceri",
    }));
    // 24 fiil, 8-12 sınırı için 3 parçada denetlenir.
    for (let p = 0; p < 3; p++) {
      const parca = ciktilar
        .slice(p * 8, p * 8 + 8)
        .map((c, i) => ({ ...c, kod: `Ö${i + 1}`, tur: i === 0 ? "Yetkinlik" : "Beceri" }));
      const s = sonuc(
        calistir("bologna_taslak_denetle", {
          ders: {},
          ingilizce: false,
          secenekler: [{ etiket: "A", alanlar: { ciktilar: parca } }],
        }),
      );
      expect(s.secenekler[0].eksikler).toEqual([]);
    }
  });
});

describe("bologna_taslak_denetle", () => {
  it("seçenekleri geçer ya da eksik nedenleriyle döndürür; iş yükünü sunucu hesaplar", () => {
    const ortak = [
      { ad: "Ders Süresi", sayi: 14, sure: 3 },
      { ad: "Sınıf Dışı Ders Çalışma Süresi", sayi: 14, sure: 5 },
      { ad: "Ara Sınav Hazırlık", sayi: 1, sure: 10 },
      { ad: "Yarıyıl Sonu Sınavı Hazırlık", sayi: 1, sure: 14 },
      { ad: "Sınavlar", sayi: 2, sure: 2 },
    ];
    const r = calistir("bologna_taslak_denetle", {
      ders: { kod: "KRG101", akts: 5, tul: "2+1+0" },
      secenekler: [
        // A: 42 + 70 + 10 + 14 + 4 = 140 saat; hedef 5 x 30 = 150, 10 saat eksik.
        { etiket: "A", alanlar: { isyuku: ortak } },
        // B: A'ya 1 x 10 saatlik proje eklenir: 150 saat, tam eşit.
        { etiket: "B", alanlar: { isyuku: [...ortak, { ad: "Proje", sayi: 1, sure: 10 }] } },
      ],
    });
    expect(r.hata).toBe(false);
    const s = sonuc(r);
    expect(s.gecenler).toEqual(["B"]);
    const [a, b] = s.secenekler;
    expect(a.gecer).toBe(false);
    expect(a.eksikler[0]).toMatchObject({ alan: "isyuku", kural: "K8" });
    expect(a.eksikler[0].neden).toMatch(/140 saat, AKTS 5 × 30 = 150/u);
    expect(a.hesap.isyuku).toMatchObject({
      toplam: 140,
      hedef: 150,
      fark: 10,
      aktsBasinaSaat: 28,
      dersSuresiHaftalikBeklenen: 3,
    });
    expect(a.hesap.isyuku.aciklama).toMatch(/10 saat ekleyin/u);
    expect(b.gecer).toBe(true);
    expect(b.hesap.isyuku.toplam).toBe(150);
  });

  it("yalnız verilen alanları denetler; kısa amaç K2 ile düşer, İngilizce istenmezse aranmaz", () => {
    const s = sonuc(
      calistir("bologna_taslak_denetle", {
        ders: {},
        ingilizce: false,
        secenekler: [
          { etiket: "A", alanlar: { amac: { tr: kelimeler(70) } } },
          { etiket: "B", alanlar: { amac: { tr: kelimeler(30) } } },
        ],
      }),
    );
    expect(s.gecenler).toEqual(["A"]);
    expect(s.secenekler[1].eksikler).toEqual([
      { alan: "amac", kural: "K2", neden: "Amaç 30 kelime (beklenen 60-120)." },
    ]);
  });

  it("ölçülemeyen fiil, eksik değerlendirme toplamı ve AKTS'siz iş yükü eksik olarak döner", () => {
    const s = sonuc(
      calistir("bologna_taslak_denetle", {
        ders: { tul: "2+1+0" },
        ingilizce: false,
        secenekler: [
          {
            etiket: "A",
            alanlar: {
              ciktilar: CIKTILAR.map((c, i) => (i === 0 ? { ...c, tr: "Kurgu hakkında bilgi sahibi olur." } : c)),
              degerlendirme: [
                { ad: "Ara Sınav", sayi: 1, katki: 40 },
                { ad: "Yarıyıl Sonu Sınavı", sayi: 1, katki: 50 },
              ],
              isyuku: [{ ad: "Ders Süresi", sayi: 14, sure: 3 }],
            },
          },
        ],
      }),
    );
    const kurallar = s.secenekler[0].eksikler.map((e: { alan: string; kural: string }) => `${e.alan}:${e.kural}`);
    expect(kurallar).toContain("ciktilar:K4");
    expect(kurallar).toContain("degerlendirme:Değerlendirme");
    expect(kurallar).toContain("isyuku:K8");
    // 40 + 50 = 90.
    expect(s.secenekler[0].hesap.degerlendirmeToplami).toBe(90);
    expect(s.secenekler[0].hesap.isyuku.hedef).toBeNull();
  });

  it("kişisel veri içeren taslak reddedilir ve Bologna'ya özgü ipucu verilir", () => {
    const r = calistir("bologna_taslak_denetle", {
      ders: {},
      secenekler: [{ etiket: "A", alanlar: { notlar: { tr: "Sorular için deniz.ak@ornek.edu.tr" } } }],
    });
    expect(r.hata).toBe(true);
    expect(r.veri.kod).toBe("kisisel_veri");
    expect(String(r.veri.hata)).toMatch(/Dersi Verenler/u);
    expect(JSON.stringify(r.veri)).not.toContain("deniz.ak");
  });
});

describe("bologna_ayristir", () => {
  it("Proliz ders sayfasını bologna_denetle girdisine çevirir (ağsız)", () => {
    const r = calistir("bologna_ayristir", { html: oku("bologna/ders-9001.html") });
    expect(r.hata).toBe(false);
    const s = sonuc(r);
    expect(s.tur).toBe("ders");
    expect(s.bolognaDenetleGirdisi.ders).toMatchObject({ kod: "KRG101", akts: 5, tul: "3+0+0", haftalar: 3 });
    expect(s.bolognaDenetleGirdisi.ders.ciktilar).toHaveLength(2);
  });

  it("program çıktıları sayfasını tanır ve P kodlarını verir", () => {
    const s = sonuc(calistir("bologna_ayristir", { html: oku("bologna/progLearnOutcomes.html") }));
    expect(s.tur).toBe("program_ciktilari");
    expect(s.pKodlari).toEqual(["P1", "P2", "P3"]);
  });

  it("tablosuz metin açık iletiyle reddedilir; hoca adı olan canlı sayfa kişisel veri iletisiyle reddedilir", () => {
    const d = calistir("bologna_ayristir", { html: "Bu yalnız düz bir metindir, tablo yoktur." });
    expect(d.hata).toBe(true);
    expect(String(d.veri.hata)).toMatch(/HTML kaynağını/u);
    const canli = calistir("bologna_ayristir", { html: oku("bologna-canli/ders-1106285.html") });
    expect(canli.hata).toBe(true);
    expect(canli.veri.kod).toBe("kisisel_veri");
    expect(String(canli.veri.hata)).toMatch(/Dersin Yardımcıları/u);
  });
});

describe("bologna_kopya_metni", () => {
  it("alanları OBS sekme sırasıyla düz metin verir, toplamı kendisi hesaplar, kalan eksikleri yazar", () => {
    const r = calistir("bologna_kopya_metni", {
      ders: { kod: "KRG101", ad: "Kurgu Bilimine Giriş", akts: 5, tul: "2+1+0" },
      ingilizce: false,
      programCiktilari: ["P1", "P2"],
      alanlar: {
        ciktilar: CIKTILAR,
        amac: { tr: kelimeler(70) },
        degerlendirme: [
          { ad: "Ara Sınav", sayi: 1, katki: 30 },
          { ad: "Proje", sayi: 1, katki: 20 },
          { ad: "Yarıyıl Sonu Sınavı", sayi: 1, katki: 40 },
        ],
        // 14x3 + 14x5 + 1x10 + 1x14 + 2x2 + 1x10 = 42 + 70 + 10 + 14 + 4 + 10 = 150.
        isyuku: [
          { ad: "Ders Süresi", sayi: 14, sure: 3 },
          { ad: "Sınıf Dışı Ders Çalışma Süresi", sayi: 14, sure: 5 },
          { ad: "Ara Sınav Hazırlık", sayi: 1, sure: 10 },
          { ad: "Yarıyıl Sonu Sınavı Hazırlık", sayi: 1, sure: 14 },
          { ad: "Sınavlar", sayi: 2, sure: 2 },
          { ad: "Proje", sayi: 1, sure: 10 },
        ],
        katki: { Ö1: { P1: 4, P2: "" } },
        ska: [4, 9],
      },
    });
    expect(r.hata).toBe(false);
    const s = sonuc(r);
    const m: string = s.metin;
    expect(m.startsWith("KRG101 Kurgu Bilimine Giriş: OBS'ye kopyalanacak alanlar")).toBe(true);
    expect(m).toContain("Toplam İş Yükü\t\t\t150");
    // Değerlendirme 30 + 20 + 40 = 90: kalan eksik olarak yazılır, metin yine verilir.
    expect(m).toContain("Toplam\t\t90");
    expect(m).toMatch(/Kalan eksikler:\n- Değerlendirme: Katkılar toplamı %90/u);
    expect(m).toContain("Ö1\tBilgi\tKurgu kavramlarını örneklerle açıklar.");
    expect(m).toContain("\tP1\tP2\nÖ1\t4\t");
    expect(m).not.toMatch(/—|\*\*/u);
    const sekmeler = s.bolumler.map((b: { sekme: string }) => b.sekme);
    expect(sekmeler.indexOf("Öğrenme Çıktıları")).toBeGreaterThan(sekmeler.lastIndexOf("Ders Bilgileri"));
    expect(sekmeler.at(-1)).toBe("Sür. Kalkınma Amaçları");
    expect(s.hesap.isyuku.toplam).toBe(150);
    expect(String(r.veri.sonrakiAdim)).toMatch(/eksikleri dolduralım/u);
  });

  it("boş istek açık iletiyle reddedilir", () => {
    const r = calistir("bologna_kopya_metni", { ders: {}, alanlar: {} });
    expect(r.hata).toBe(true);
    expect(String(r.veri.hata)).toMatch(/En az bir alan/u);
  });
});

describe("uçtan uca Bologna akışı (SDK istemcisi)", () => {
  it("istem, ayrıştırma, denetim, rehber, taslak denetimi ve kopya metni zinciri çalışır", async () => {
    const c = await baglan();
    const istem = await c.getPrompt({ name: "bologna_doldur", arguments: { ders_kodu: "KRG101" } });
    expect(istemMetni(istem)).toContain("bologna_ayristir");

    const pc = veri(
      await c.callTool({ name: "bologna_ayristir", arguments: { html: oku("bologna/progLearnOutcomes.html") } }),
    );
    const pKodlari = (pc.sonuc as { pKodlari: string[] }).pKodlari;

    const ay = veri(await c.callTool({ name: "bologna_ayristir", arguments: { html: oku("bologna/ders-9001.html") } }));
    const girdi = (ay.sonuc as { bolognaDenetleGirdisi: Record<string, unknown> }).bolognaDenetleGirdisi;
    const den = await c.callTool({ name: "bologna_denetle", arguments: girdi });
    expect(den.isError).toBeFalsy();
    const ds = veri(den).sonuc as { doldurulacak: number[]; alanlar: { alan: string; durum: string }[] };
    expect(ds.alanlar.find((a) => a.alan === "ciktilar")?.durum).toBe("zayif");
    expect(ds.doldurulacak.length).toBeGreaterThan(0);

    const reh = veri(await c.callTool({ name: "bologna_alan_rehberi", arguments: { alan: "ciktilar" } }));
    expect(String(reh.sonrakiAdim)).toMatch(/hepsi A/u);

    // Asistanın ürettiği iki seçenek: A kurallara uyar, B'de 2 çıktı var.
    const td = veri(
      await c.callTool({
        name: "bologna_taslak_denetle",
        arguments: {
          ders: { kod: "KRG101", akts: 5, tul: "3+0+0" },
          ingilizce: false,
          programCiktilari: pKodlari,
          secenekler: [
            { etiket: "A", alanlar: { ciktilar: CIKTILAR } },
            { etiket: "B", alanlar: { ciktilar: CIKTILAR.slice(0, 2) } },
          ],
        },
      }),
    );
    expect((td.sonuc as { gecenler: string[] }).gecenler).toEqual(["A"]);

    const km = await c.callTool({
      name: "bologna_kopya_metni",
      arguments: { ders: { kod: "KRG101" }, ingilizce: false, alanlar: { ciktilar: CIKTILAR } },
    });
    const kv = veri(km);
    expect((kv.sonuc as { kalanEksikler: unknown[] }).kalanEksikler).toEqual([]);
    expect((kv.sonuc as { metin: string }).metin).toContain("Öğrenme Çıktıları > Öğrenme çıktıları");
    expect(kv.sonrakiAdim).toBeTruthy();
    await c.close();
  });

  it("her başarılı araç yanıtı sonraki adım önerisi taşır", async () => {
    const c = await baglan();
    const { tools } = await c.listTools();
    for (const t of tools) expect(ACIK_ARACLAR.find((a) => a.ad === t.name)?.sonrakiAdim).toBeTruthy();
    const r = veri(await c.callTool({ name: "olcut_getir", arguments: { kod: "B.1" } }));
    expect(r.sonrakiAdim).toBeTruthy();
    await c.close();
  });
});
