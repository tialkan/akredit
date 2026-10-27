import type { BolognaTaslagi } from "@akredit/cekirdek";
import { bolognaOrnek, taslakKur } from "@akredit/yz";
import { describe, expect, it } from "vitest";
import {
  benzerlik,
  bolumAdi,
  girisAlaniVarMi,
  kopyalanabilirCikti,
  onceSonra,
  tamDenetim,
  taslakFarki,
  tutarlilikDenetle,
  yazmaPlaniKur,
} from "./saf.ts";

const taslak = (): BolognaTaslagi => taslakKur(bolognaOrnek.ornekCikti(), bolognaOrnek.ornekGirdi());

describe("Bologna saf işlevleri", () => {
  it("bölüm adı ASCII ve tireli", () => {
    expect(bolumAdi("Dersin Amacı")).toBe("dersin-amaci");
    expect(bolumAdi("Öğretim Yöntem ve Teknikleri")).toBe("ogretim-yontem-ve-teknikleri");
  });

  it("benzerlik: aynı metin 1, ortak kökü olmayan 0", () => {
    expect(benzerlik("Veri tabanı tasarımı", "Veri tabanı tasarımı")).toBe(1);
    expect(benzerlik("Muhasebe kayıtları", "Programlama dilleri")).toBe(0);
    // Kökler (ilk 5 harf): {veri, taban, tasar} ve {veri, model}: 1 ortak / 4 birleşim = 0,25.
    expect(benzerlik("veri tabanı tasarımı", "veri modelleme")).toBe(0.25);
  });

  it("örnek taslak tam denetimde hatasız; ad değişince K1 uyarısı", () => {
    expect(tamDenetim(taslak()).hata).toBe(0);
    const t = { ...taslak(), ad: "Muhasebe Uygulamaları" };
    const b = tutarlilikDenetle(t, []);
    expect(b).toHaveLength(1);
    expect(b[0]).toMatchObject({ duzey: "uyari", kural: "K1" });
  });

  it("başka dersle birebir aynı yöntem cümlesi K11 uyarısı alır", () => {
    const t = taslak();
    const b = tutarlilikDenetle(t, [{ kod: "X1", ad: "Başka", metin: "", yontem: t.yontem.tr }]);
    expect(b.some((x) => x.kural === "K11")).toBe(true);
  });

  it("önce/sonra: hata azalınca iyileşti, yeni ders yeni", () => {
    const k = onceSonra(
      [{ kod: "A", hata: 2, uyari: 0 }],
      [
        { kod: "A", hata: 1, uyari: 3 },
        { kod: "B", hata: 0, uyari: 0 },
      ],
    );
    expect(k.map((x) => x.degisim)).toEqual(["iyilesti", "yeni"]);
  });

  it("fark: değişen alan ve önceki bulgudan nedeni", () => {
    const eski = { ...taslak(), ska: [4] };
    const f = taslakFarki(eski, taslak());
    expect(f).toHaveLength(1);
    expect(f[0]?.alan).toBe("ska");
    expect(f[0]?.neden[0]).toMatch(/^K7:/u);
  });

  it("yazma planı: giriş bilgisi alanı yok; kopyalanabilir çıktı sekmeli", () => {
    const p = yazmaPlaniKur(taslak(), "k");
    expect(girisAlaniVarMi(p)).toEqual([]);
    expect(girisAlaniVarMi([{ sekme: "Genel", alan: "Kullanıcı Şifresi" }])).toEqual(["Kullanıcı Şifresi"]);
    expect(girisAlaniVarMi([{ sekme: "Genel", alan: "Doğrulama Kodu" }])).toHaveLength(1);
    const m = kopyalanabilirCikti("TBP201", p);
    expect(m).toContain("## Ders Akışı");
    expect(m).toContain("Kaydet'e siz basın");
  });
});
