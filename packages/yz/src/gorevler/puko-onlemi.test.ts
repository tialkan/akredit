import { describe, expect, it } from "vitest";
import { sahteSaglayici } from "../saglayicilar/sahte.ts";
import { gorevCalistir } from "./gorev.ts";
import { onlemMetniSorunu, pukoOnlemi, pukoOnlemleriniAyikla } from "./puko-onlemi.ts";

describe("PÜKÖ önlem önerisi (İP-39)", () => {
  it("rakam, atıf ya da satır sonu içeren önlem düşer; geçerliler tekrarsız kalır", () => {
    expect(onlemMetniSorunu("Zor konuyu ek uygulamayla yeniden işle.")).toBeNull();
    expect(onlemMetniSorunu("Başarıyı %70'e çıkar.")).toMatch(/sayı/u);
    expect(onlemMetniSorunu("Üç yerine ٣ soru sor.")).toMatch(/sayı/u);
    expect(onlemMetniSorunu("Sınavı gözden geçir [K:abcd].")).toMatch(/atıf/u);
    const r = pukoOnlemleriniAyikla({
      onlemler: ["Ara sınav ekle.", "Ara sınav ekle.", "Ödevleri 2 haftada bir ver.", "Geri bildirimi\nerken ver."],
    });
    expect(r.onlemler).toEqual(["Ara sınav ekle."]);
    expect(r.reddedilen).toHaveLength(2);
  });

  it("modele kök neden rakamsız gider; çıktıdaki sayılı öneri sorun olarak döner", async () => {
    const s = sahteSaglayici([
      JSON.stringify({ onlemler: ["Konuyu örnek çözümle yeniden işle.", "Notu 10 puan artır."] }),
    ]);
    const r = await gorevCalistir(
      pukoOnlemi,
      {
        olcumTuru: "ck",
        kod: "ÖÇ1",
        dersKodlari: ["BP101"],
        kokNedenler: ["1 numaralı soruda öğrenciler puanın ancak %40 kadarını aldı."],
      },
      s,
    );
    expect(r.gecerli).toBe(false);
    expect(pukoOnlemleriniAyikla(r.veri).onlemler).toEqual(["Konuyu örnek çözümle yeniden işle."]);
    const giden = JSON.stringify(s.istekler);
    expect(giden).not.toContain("%40");
  });
});
