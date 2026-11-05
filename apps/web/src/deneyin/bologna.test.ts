import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BolognaHatasi, bolognaDenetimi, istemUret, isYukuHesabi } from "./bologna.ts";

// Kurgu ders sayfası (KRG101); gerçek kurum ve kişi değildir.
const SAYFA = readFileSync(
  new URL("../../../../packages/baglayicilar/test/fixtures/bologna/ders-9001.html", import.meta.url),
  "utf8",
);

describe("bolognaDenetimi", () => {
  it("kurgu sayfayı ayrıştırır, alanları denetler ve iş yükünü hesaplar", () => {
    const s = bolognaDenetimi(SAYFA);
    expect(s.kod).toBe("KRG101");
    const durum = Object.fromEntries(s.alanlar.map((a) => [a.alan, a.durum]));
    expect(durum.ciktilar).toBe("zayif");
    expect(durum.haftalar).toBe("zayif");
    expect(durum.degerlendirme).toBe("tamam");
    expect(s.alanlar.some((a) => a.alan === "yetkililer")).toBe(false);
    expect(s.alanlar.find((a) => a.alan === "amac")?.nedenler).toEqual(["Sayfada bulunamadı."]);
    // Sayfadaki satırların sayı x süre toplamı 150 saat; 5 AKTS x 30 = 150.
    expect(s.isYuku?.toplam).toBe(150);
    expect(s.isYuku?.hedef).toBe(150);
    expect(s.isYuku?.aktsBasinaSaat).toBe(30);
  });

  it("tanınmayan metin açık iletiyle reddedilir", () => {
    expect(() => bolognaDenetimi("Bu yalnız düz bir metindir, ders sayfası değildir.")).toThrow(BolognaHatasi);
    expect(() => bolognaDenetimi("kısa")).toThrow("Ders sayfasının tamamını yapıştırın.");
  });
});

describe("isYukuHesabi", () => {
  it("satır toplamlarını ve AKTS başına saati hesaplar", () => {
    // 14 x 3 = 42, 14 x 4 = 56, 1 x 10 = 10, 1 x 12 = 12. Toplam 120; 4 AKTS x 30 = 120; 120 / 4 = 30.
    const i = isYukuHesabi({
      kod: "X",
      akts: 4,
      isyuku: [
        { ad: "Ders Süresi", sayi: 14, sure: 3 },
        { ad: "Sınıf Dışı", sayi: 14, sure: 4 },
        { ad: "Ara Sınav Hazırlık", sayi: 1, sure: 10 },
        { ad: "Final Hazırlık", sayi: 1, sure: 12 },
        { ad: "Boş satır", sayi: null, sure: null },
      ],
    });
    expect(i).toMatchObject({ toplam: 120, hedef: 120, aktsBasinaSaat: 30 });
    expect(i?.satirlar).toHaveLength(4);
    expect(isYukuHesabi({ kod: "X", isyuku: [] })).toBeNull();
  });
});

describe("istemUret", () => {
  const istem = istemUret(bolognaDenetimi(SAYFA));

  it("eksik alanları, kuralları ve uydurma yasağını içerir", () => {
    expect(istem).toContain("Ders: KRG101");
    expect(istem).toContain("Öğrenme çıktıları (zayıf)");
    expect(istem).toContain("Haftalık ders akışı (zayıf)");
    expect(istem).not.toContain("Değerlendirme (");
    expect(istem).toContain("Uydurma yok.");
    expect(istem).toContain(
      "Değerlendirme yüzdelerini, kaynakları ve derste gerçekte ne yapıldığını yalnız benden al.",
    );
    expect(istem).toContain("Bağlantısını veremediğin kaynağı önerme.");
    expect(istem).toContain("150 saat, hedef 5 AKTS x 30 = 150 saat");
  });

  it("MCP araç adı, em-dash, kalın yazı ve kişi bilgisi içermez", () => {
    expect(istem).not.toMatch(/\b[a-z]+_[a-z_]+\b/u);
    expect(istem).not.toMatch(/\u2014|\*\*/u);
    expect(istem).not.toMatch(/Dersi Veren|Koordinatör|@/u);
  });
});
