// Site içeriğinin koddaki gerçekle tutarlılığı ve yapılandırılmış veri.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { ROLLER } from "@akredit/yetki";
import { describe, expect, it } from "vitest";
import { yokakOzeti } from "./cerceve-ozeti.ts";
import {
  DONEM_AKISI,
  DORT_ROL,
  DURUM_ADI,
  depo,
  EYLEM_ADI,
  gecerliDurum,
  KONUM_TABLOSU,
  MODUL_DURUMU_DAYANAGI,
  MODULLER,
  PROJE_GRUPLARI,
  projeSayfasi,
  ROL_ADI,
  ROL_ANLATIMLARI,
  ROL_KARARI,
  SAYFALAR,
  SORUMLULUK,
  SSS,
  UST_MENU,
  VAAT_CERCEVESI,
  YOL_HARITASI,
} from "./icerik.ts";
import { GELISTIRICI_ARACLARI, kurulumAdimlari, MCP_ADRESI, UYGULAMALAR } from "./kurulum.ts";
import { sayfaUstVerisi, sssVerisi, yapisalVeri } from "./yapisal.ts";

describe("çerçeve özeti", () => {
  it("YÖKAK 3.3: 4 başlık, 14 ölçüt, 46 alt ölçüt (sitede yazan sayılar)", () => {
    const y = yokakOzeti();
    expect([y.basliklar.length, y.olcutSayisi, y.altOlcutSayisi]).toEqual([4, 14, 46]);
    // docs/cerceveler.md: A.4.1 ve B.2.2'nin düzey metinleri ayrıştırılamadı.
    expect(y.dogrulanmamisDuzey).toBe(2);
  });
  it("açıklamadaki sayılar veriyle aynı", () => {
    expect(SAYFALAR.cerceveler.aciklama).toContain("14 ölçüt, 46 alt ölçüt");
  });
});

describe("roller ve eylemler", () => {
  it("her rolün ve eylemin Türkçe adı var; anlatımlardaki roller geçerli", async () => {
    const { EYLEMLER } = await import("@akredit/yetki");
    for (const r of ROLLER) expect(ROL_ADI[r]).toBeTruthy();
    for (const e of EYLEMLER) expect(EYLEM_ADI[e]).toBeTruthy();
    for (const a of ROL_ANLATIMLARI) for (const r of a.roller) expect(ROLLER).toContain(r);
  });
});

describe("rol kararı anlatımı", () => {
  it("her rol için yazılı; 'karar veremez' diyen rol gerçekten karar.ver yetkisine sahip değil", async () => {
    const { ROL_EYLEMLERI } = await import("@akredit/yetki");
    for (const r of ROLLER) {
      expect(ROL_KARARI[r]).toBeTruthy();
      expect(ROL_KARARI[r]?.startsWith("Karar veremez")).toBe(!ROL_EYLEMLERI[r].has("karar.ver"));
    }
    expect(ROL_EYLEMLERI.kalite_komisyonu_baskani.has("politika.imzala")).toBe(true);
    expect(ROL_EYLEMLERI.ogretim_elemani.has("rapor.gonder")).toBe(false);
  });
  it("dönem akışı: ders dosyası bir yükleme ve iki onaydır (İP-16)", () => {
    expect(DONEM_AKISI.find((a) => a.zaman === "Notlardan sonra")?.dokunus).toBe(3);
  });
});

describe("üst veri", () => {
  it("her sayfanın başlığı ve açıklaması özgün, canonical tam adres", () => {
    const hepsi = Object.values(SAYFALAR);
    expect(new Set(hepsi.map((s) => s.title)).size).toBe(hepsi.length);
    expect(new Set(hepsi.map((s) => s.aciklama)).size).toBe(hepsi.length);
    for (const s of hepsi) {
      expect(s.aciklama.length).toBeGreaterThan(50);
      expect(s.aciklama.length).toBeLessThanOrEqual(200);
      expect(sayfaUstVerisi(s).alternates?.canonical).toBe(`https://akredit.org${s.yol === "/" ? "/" : s.yol}`);
    }
  });
  it("JSON-LD: Organization, BreadcrumbList, FAQPage; < kaçışlanır", () => {
    const j = JSON.parse(yapisalVeri(SAYFALAR.sss, [sssVerisi(SSS)]));
    const turler = j["@graph"].map((d: { "@type": string }) => d["@type"]);
    expect(turler).toEqual(["Organization", "BreadcrumbList", "FAQPage"]);
    expect(j["@graph"][2].mainEntity).toHaveLength(SSS.length);
    expect(yapisalVeri({ ...SAYFALAR.sss, ad: "</script>" })).not.toContain("</script>");
  });
});

describe("İP-42: vaat, roller, durum, depo yolları", () => {
  /** Son kullanıcıya görünen metinde depo yolu biçimi: klasör yolu, kaynak dosya adı, CLAUDE.md. */
  const DEPO_YOLU = /\b(?:packages|apps|docs|infra|plan)\/|\.(?:tsx?|sql|md)\b|CLAUDE\.md/u;

  /** Nesnedeki bütün metinleri toplar; `adres` (bağlantı hedefi) ve kod içi gerekçeler hariç. */
  function metinler(x: unknown, yol = ""): [string, string][] {
    if (typeof x === "string") return [[yol, x]];
    if (Array.isArray(x)) return x.flatMap((o, i) => metinler(o, `${yol}[${i}]`));
    if (x && typeof x === "object")
      return Object.entries(x).flatMap(([k, v]) => (k === "adres" || k === "yol" ? [] : metinler(v, `${yol}.${k}`)));
    return [];
  }

  it("site içeriğinde son kullanıcıya depo yolu yazılmaz", async () => {
    const icerik = await import("./icerik.ts");
    const { MODUL_DURUMU_DAYANAGI: _gerekce, ...gorunen } = icerik;
    const bulunan = metinler(gorunen).filter(([, m]) => DEPO_YOLU.test(m));
    expect(bulunan).toEqual([]);
  });

  it("sayfa dayanak listelerinde depo yolu yalnız bağlantıda durur", () => {
    const kok = join(import.meta.dirname, "../app/(site)");
    for (const sayfa of ["nasil-calisir/page.tsx", "yapay-zeka/page.tsx", "giris-ve-hesap/page.tsx"]) {
      const metin = readFileSync(join(kok, sayfa), "utf8");
      const liste = metin.slice(
        metin.indexOf("const DAYANAKLAR"),
        metin.indexOf("];", metin.indexOf("const DAYANAKLAR")),
      );
      const basliklar = [...liste.matchAll(/baslik:\s*"([^"]+)"/gu)].map((m) => m[1] ?? "");
      expect(basliklar.length, sayfa).toBeGreaterThan(0);
      expect(
        basliklar.filter((b) => DEPO_YOLU.test(b)),
        sayfa,
      ).toEqual([]);
      for (const m of liste.matchAll(/depo\("([^"]+)"\)/gu))
        expect(existsSync(join(import.meta.dirname, "../../../..", m[1] ?? "")), m[1]).toBe(true);
    }
  });

  it("depo bağlantısı açık kaynak deposuna gider", () => {
    expect(depo("CLAUDE.md")).toBe("https://github.com/tialkan/akredit/blob/main/CLAUDE.md");
    expect(depo("packages/olcme")).toBe("https://github.com/tialkan/akredit/tree/main/packages/olcme");
  });

  it("mutlak ifadeler doğru biçimde: 'silinemez' ve 'her cümlesine kaynak' kalmadı", async () => {
    const icerik = await import("./icerik.ts");
    const hepsi = metinler(icerik).map(([, m]) => m.toLocaleLowerCase("tr"));
    expect(hepsi.filter((m) => /silinemez|silinemeyen|her cümlesine kaynak/u.test(m))).toEqual([]);
    expect(SORUMLULUK).toContain("onaylayan kurum yetkilisindedir");
    expect(VAAT_CERCEVESI).toBe("Sıfır evrak angaryası, tam akademik irade.");
  });

  it("ölçülmemiş yüzde iddiası yok", async () => {
    const icerik = await import("./icerik.ts");
    expect(metinler(icerik).filter(([, m]) => /%\s?\d|\d\s?%/u.test(m))).toEqual([]);
  });

  it("dört rol: ad, kimlik ve sistem rolleri geçerli", () => {
    expect(DORT_ROL.map((r) => r.ad)).toEqual(["Rektörlük", "Kalite komisyonu", "Bölüm başkanı", "Öğretim elemanı"]);
    for (const r of DORT_ROL) {
      expect(r.maddeler.length).toBeGreaterThanOrEqual(3);
      for (const x of r.roller) expect(ROLLER).toContain(x);
    }
  });

  it("her modülün durumu ve koddaki gerekçesi var", () => {
    for (const m of MODULLER) {
      expect(DURUM_ADI[m.durum], m.kimlik).toBeTruthy();
      expect(MODUL_DURUMU_DAYANAGI[m.kimlik], m.kimlik).toMatch(/İP-\d+/u);
    }
    expect(Object.keys(MODUL_DURUMU_DAYANAGI).sort()).toEqual(MODULLER.map((m) => m.kimlik).sort());
    // İnceleme ya da devam durumundaki İP'ye dayanan rapor modülleri "Yayında" gösterilemez.
    for (const k of ["odr", "kidr"]) expect(MODULLER.find((m) => m.kimlik === k)?.durum).toBe("yapimda");
  });

  it("yol haritası plan.md §8'deki İP-38…49'u sırayla kapsar", () => {
    expect(YOL_HARITASI.map((y) => y.no)).toEqual([38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49]);
    const plan = readFileSync(join(import.meta.dirname, "../../../../plan.md"), "utf8");
    for (const y of YOL_HARITASI) {
      const satir = plan.split("\n").find((s) => new RegExp(`^\\| \\[?${y.no}\\b`, "u").test(s)) ?? "";
      expect(satir, `İP-${y.no}`).not.toBe("");
      // "Tamam": planda tamam; "şimdi": sürüyor ya da incelemede; "sonra": bekliyor ya da hazır;
      // "askıda": barındırılan hizmete bağlı, sponsor bulunana kadar bekliyor (ADR 0008).
      expect(y.dalga === "tamam", `İP-${y.no}`).toBe(/\| tamam \|/u.test(satir));
      expect(y.dalga === "askida", `İP-${y.no}`).toBe(/\| askıda \(sponsor\) \|/u.test(satir));
      expect(y.dalga === "simdi", `İP-${y.no}`).toBe(/\| (devam|inceleme) \|/u.test(satir));
      expect(y.dalga === "sonra", `İP-${y.no}`).toBe(/\| (bekliyor|hazır) \|/u.test(satir));
    }
  });

  it("konum tablosunda karşılaştırmalı iddia yok", () => {
    const metin = KONUM_TABLOSU.flatMap((k) => [k.baglanti, k.sinir])
      .join(" ")
      .toLocaleLowerCase("tr");
    expect(metin).not.toMatch(/daha iyi|daha hızlı|üstün|yerine geçer\b/u);
  });
});

describe("hareket ve önizleme (tasarım v2)", () => {
  const css = readFileSync(join(import.meta.dirname, "../app/globals.css"), "utf8");
  it("önizleme hareketi, hareket azaltma tercihinde kapanır ve son durumu gösterir", () => {
    const azalt = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));
    for (const sinif of [".onizleme-kart", ".onizleme-onaylandi", ".onizleme-gunluk", ".onizleme-bekliyor"])
      expect(azalt).toContain(sinif);
    expect(azalt).toMatch(/\.onizleme-bekliyor\s*\{[^}]*visibility:\s*hidden/u);
  });
  it("dayanak vurgusu her dayanak numarası için tanımlı (1-9)", () => {
    for (let n = 1; n <= 9; n++)
      expect(css).toContain(`a[href="#dayanak-${n}"]:is(:hover, :focus-visible)) #dayanak-${n}`);
  });
});

describe("İP-49: sade site, iki adım ve proje ayrıntıları", () => {
  it("üst menü yalnız üç öğe: Nasıl kurulur, Proje ayrıntıları, İletişim", () => {
    expect(UST_MENU).toEqual([
      { ad: "Nasıl kurulur", yol: "/mcp-kullan" },
      { ad: "Proje ayrıntıları", yol: "/proje" },
      { ad: "İletişim", yol: "/iletisim" },
    ]);
  });

  it("kurulum adımları MCP rehberinden gelir: 4-5 adım ya da daha az, adres içerir, akredit yazma adımı yok", () => {
    for (const u of [...UYGULAMALAR, ...GELISTIRICI_ARACLARI]) {
      const adimlar = kurulumAdimlari(u);
      expect(adimlar.length, u.kimlik).toBe(u.adet);
      expect(adimlar.length, u.kimlik).toBeLessThanOrEqual(5);
      expect(adimlar.map((a) => a.no)).toEqual(adimlar.map((_, i) => i + 1));
      // Adımlardan biri adresi ya da komutu verir (Claude Code: komut adresi içerir).
      expect(
        adimlar.some((a) => a.yap.includes(MCP_ADRESI)),
        u.kimlik,
      ).toBe(true);
      // "akredit yazın" ikinci adımdır; birinci adımın listesine girmez.
      expect(
        adimlar.filter((a) => a.goreceginiz === "Odak menüsü." || /yeni sohbet/iu.test(a.yap)),
        u.kimlik,
      ).toEqual([]);
    }
    expect(UYGULAMALAR[0]?.acik).toBe(true);
    expect(GELISTIRICI_ARACLARI[0]?.komut).toBe("claude mcp add --transport http akredit https://akredit.org/mcp");
  });

  it("ana yoldan çekilen her sayfa proje ayrıntılarında bir kez ve durumuyla listelenir", () => {
    const yollar = PROJE_GRUPLARI.flatMap((g) => g.sayfalar.map((s) => s.yol));
    expect(new Set(yollar).size).toBe(yollar.length);
    const anaYol = new Set(["/", "/proje", "/iletisim"]);
    for (const s of Object.values(SAYFALAR)) if (!anaYol.has(s.yol)) expect(yollar, s.yol).toContain(s.yol);
    for (const y of ["/deneyin", "/giris"]) expect(yollar).toContain(y);
  });

  it("durumlar ADR 0008 ve plan.md ile tutarlı", () => {
    const durum = (y: string) => projeSayfasi(y)?.durum;
    // ADR 0008 madde 2: kurum açma, pilot ve kurum girişi askıda. MCP ve tarayıcı araçları (/deneyin) çalışır.
    // Barındırılan demo (kurucu, İP-49): askıda, sponsor ya da iş birliği bulunamadı; notu aynen görünür.
    for (const y of ["/kurum-ac", "/kurum-ac/dogrula", "/pilot", "/giris"]) expect(durum(y), y).toBe("askida");
    expect(durum("/mcp-kullan")).toBe("calisiyor");
    expect(durum("/deneyin")).toBe("calisiyor");
    expect(durum("/deneyin#kurum-demosu")).toBe("askida");
    expect(projeSayfasi("/deneyin#kurum-demosu")?.not).toBe(
      "Demo hazır ve çalışır durumda, ancak askıda: sunucu ve yapay zekâ maliyeti var. Bu masrafı karşılayacak sponsor aranıyor.",
    );
    // Hukuk metinleri avukat incelemesinden geçti ve yayımlandı (kurucu, 05.11.2026); kılavuzlar taslak.
    for (const y of ["/kvkk", "/gizlilik", "/kosullar", "/guvenlik"]) expect(durum(y), y).toBe("calisiyor");
    for (const y of ["/belgeler", "/belgeler/hoca"]) expect(durum(y), y).toBe("taslak");
    const plan = readFileSync(join(import.meta.dirname, "../../../../plan.md"), "utf8");
    for (const no of [28, 29, 30])
      expect(
        plan.split("\n").find((s) => s.startsWith(`| [${no}]`)),
        `İP-${no}`,
      ).toMatch(/\| askıda \(sponsor\) \|/u);
  });

  it("barındırma açık bir kurulumda askıdaki sayfa çalışıyor görünür, diğerleri değişmez", () => {
    const pilot = projeSayfasi("/pilot");
    const kvkk = projeSayfasi("/belgeler");
    if (!pilot || !kvkk) throw new Error("kayıt yok");
    expect(gecerliDurum(pilot, false).durum).toBe("askida");
    expect(gecerliDurum(pilot, true).durum).toBe("calisiyor");
    expect(gecerliDurum(kvkk, true).durum).toBe("taslak");
  });
});

describe("İP-49: sayfa başlığı uzunluğu", () => {
  // Arama sonucunda kesilmesin: site adı ekiyle (" · Akredit", src/app/layout.tsx şablonu) 60 karakterin altında.
  const EK = " · Akredit";
  it("bütün tanıtım sayfaları ve kılavuzlar 60 karakterin altında", async () => {
    const { KILAVUZLAR } = await import("../app/(site)/belgeler/icerik.ts");
    const tam = [
      ...Object.values(SAYFALAR).map((s) => (s.yol === "/" ? s.title : `${s.title}${EK}`)),
      ...KILAVUZLAR.map((k) => `${k.baslik} (kılavuz)${EK}`),
    ];
    for (const t of tam) expect(t.length, t).toBeLessThan(60);
  });
  it("ana sayfa başlığı kısa", () => {
    expect(SAYFALAR.ana.baslik).toBe("Akreditasyon ve Bologna yardımcısı");
  });
});
