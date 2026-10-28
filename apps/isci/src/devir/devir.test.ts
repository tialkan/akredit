// Sessiz devir işçisi (İP-38): tur toplamları ve kurum hatasının yalıtımı. Asıl kurallar servis testlerinde
// (`packages/servis/src/bologna/devir.test.ts`); burada yalnız zamanlayıcı davranışı sınanır.

import { gocleriUygula, pgliteBaglantisi } from "@akredit/vt";
import { describe, expect, it } from "vitest";
import { devirIscisi } from "./index.ts";

describe("devir işçisi", () => {
  it("kurum yokken boş tur; bir kurumdaki hata diğerlerini durdurmaz ve bildirilir", async () => {
    const b = await pgliteBaglantisi();
    try {
      await gocleriUygula(b.db);
      const hatalar: string[] = [];
      const yaziciCagrisi: string[] = [];
      const isci = devirIscisi({
        db: b.db,
        kurumlar: async () => ["gecersiz-kurum", "01900000-0000-7000-8000-0000000000ff"],
        saat: () => new Date("2026-10-27T09:00:00Z"),
        yazici: (k) => {
          yaziciCagrisi.push(k);
          return null;
        },
        hata: (k) => hatalar.push(k),
      });
      const t = await isci.tur();
      expect(t).toEqual({ acilan: 0, varsayilanOnay: 0, yazilan: 0, kuru: 0, izinYok: 0, hata: 0 });
      expect(hatalar).toEqual(["gecersiz-kurum"]);
      // Geçerli (boş) kurumda tur tamamlanır; yazıcı istenir ama verilmediği için yazma adımı atlanır.
      expect(yaziciCagrisi).toEqual(["01900000-0000-7000-8000-0000000000ff"]);
    } finally {
      await b.kapat();
    }
  }, 120_000);
});
