import { etkinDemoKurumu } from "@akredit/ornek-veri/yukle";
import { gocleriUygula, ORNEK_KURUM_ID, pgliteBaglantisi, sema, tohumla } from "@akredit/vt";
import { describe, expect, it } from "vitest";
import { kurumlariListele } from "../calisma/kurumlar.ts";
import { DEMO_CRON, demoIsi } from "./index.ts";

describe("demo gece işi", () => {
  it("ilk çalışmada nesil yükler, değişiklik yoksa yeniden yüklemez; işçinin kurum turu demoyu görmez", async () => {
    const b = await pgliteBaglantisi();
    try {
      await gocleriUygula(b.db);
      await tohumla(b.db);
      const ilk = await demoIsi(b.db, new Date());
      expect(ilk.durum).toBe("yuklendi");
      expect(await etkinDemoKurumu(b.db)).toBe(ilk.kurumId);
      const ikinci = await demoIsi(b.db, new Date());
      expect(ikinci).toMatchObject({ durum: "gerek_yok", kurumId: ilk.kurumId, silinenHesap: 0 });
      expect(await kurumlariListele(b.db)).toEqual([ORNEK_KURUM_ID]);
      expect((await b.db.select().from(sema.demoNesli)).length).toBe(1);
    } finally {
      await b.kapat();
    }
  }, 600_000);

  it("zamanlama gece ve saat başı değil", () => {
    expect(DEMO_CRON).toBe("53 3 * * *");
  });
});
