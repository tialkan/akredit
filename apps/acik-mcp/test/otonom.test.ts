// Dış inceleme (06.11.2026): asistan her araç yanıtından sonra en son okuduğu sonrakiAdim'e uyar. Bu yüzden
// sonrakiAdim metinleri ara adımda hocaya soru sordurmamalı; zorunlu duraklar yalnız sayfada olmayan resmî bilgi
// (değerlendirme yüzdesi, kaynak) ve OBS kayıt onayıdır. Yüzdeye varsayılan konmaz (uydurma yok).
import { describe, expect, it } from "vitest";
import { ACIK_ARACLAR, aracCalistir } from "../src/index.ts";
import { ACIK_ISTEMLER, baslangic } from "../src/promptlar.ts";
import { ASISTAN_KURALI, SUNUCU_TALIMATI } from "../src/sunucu.ts";

const SIMDI = () => new Date("2026-11-06T10:00:00Z");
const calistir = (ad: string, girdi: unknown) => {
  const a = ACIK_ARACLAR.find((x) => x.ad === ad);
  if (!a) throw new Error(ad);
  return aracCalistir(a, girdi, { simdi: SIMDI });
};

describe("otonom akış", () => {
  it("hiçbir aracın varsayılan sonrakiAdim'i hocaya tek tek ya da A/B/C sordurmaz", () => {
    for (const a of ACIK_ARACLAR) {
      const m = a.sonrakiAdim ?? "";
      expect(m, a.ad).not.toMatch(
        /tek tek, seçenekle sorun|her kanıt için 1\) var|Hoca harfle seçer|2-3 numaralı düzeltme seçeneği/u,
      );
    }
  });

  it("her araç yanıtı aynı kısa asistan kuralını taşır", () => {
    const r = calistir("olcut_ara", { sorgu: "kalite" });
    expect(r.veri.asistanKurali).toBe(ASISTAN_KURALI);
    expect(ASISTAN_KURALI).toContain("Ara adımda hocaya A/B/C sorma");
    expect(ASISTAN_KURALI).toContain("değerlendirme yüzdesi uydurma");
  });

  it("akredit_basla niyet verilince menüyü atlar, yalnız o akışı döndürür", () => {
    const r = calistir("akredit_basla", { odak: "3" });
    // biome-ignore lint/suspicious/noExplicitAny: test erişimi
    const s = r.veri.sonuc as any;
    expect(s.hocayaGoster).toBe("Tamam: ÇK ve PÇ sağlanma düzeyini hesapla. Başlıyorum.");
    expect(s.odak.istem).toBe("ck_pc_hesabi");
    expect(s.akis).toContain("ÇK ve PÇ sağlanma düzeyi hesabı");
    // Parametresiz çağrı menüyü döndürür.
    // biome-ignore lint/suspicious/noExplicitAny: test erişimi
    const m = calistir("akredit_basla", {}).veri.sonuc as any;
    expect(m.hocayaGoster).toBe(baslangic().hocayaGoster);
  });

  it("değerlendirme yüzdesine varsayılan konmaz; uygulama/lab sorulmaz, T+U+L'den okunur", () => {
    const b = ACIK_ISTEMLER.find((i) => i.ad === "bologna_doldur")?.metin({}) ?? "";
    expect(b).not.toContain("Vize %40, Final %60 (varsayılan)");
    expect(b).toContain("Değerlendirme yüzdesine varsayılan uydurma; hoca yazar.");
    expect(b).toContain("Uygulama/lab sorulmaz: T+U+L'den okunur");
    expect(b).toContain("Nasıl doldurulacağını SORMA");
  });

  it("dil denetimi ve ölçüt rehberi ara soru sormaz", () => {
    const d = ACIK_ISTEMLER.find((i) => i.ad === "dil_denetimi")?.metin({}) ?? "";
    expect(d).toContain("çıkaramazsan sorma, dönemsiz denetle");
    expect(d).toContain("Nasıl düzeltileceğini SORMA");
    const o = ACIK_ISTEMLER.find((i) => i.ad === "olcut_rehberi")?.metin({}) ?? "";
    expect(o).toContain("Ne istendiğini ayrıca SORMA");
    expect(SUNUCU_TALIMATI).toContain("KURAL 5: Ara adımda hocaya soru sorma");
  });
});
