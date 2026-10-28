// Site içeriğinin koddaki gerçekle tutarlılığı ve yapılandırılmış veri.
import { ROLLER } from "@akredit/yetki";
import { describe, expect, it } from "vitest";
import { yokakOzeti } from "./cerceve-ozeti.ts";
import { DONEM_AKISI, EYLEM_ADI, ROL_ADI, ROL_ANLATIMLARI, ROL_KARARI, SAYFALAR, SSS } from "./icerik.ts";
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
