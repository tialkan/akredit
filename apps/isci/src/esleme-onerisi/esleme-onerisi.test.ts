// İP-47 eşleme öneri işi: istek kuyruğa bir kez konur, iş sonucu günlüğe yazılır ve istek yeniden konmaz.
// Asıl kurallar servis testlerinde (`packages/servis/src/odr/tablolar/yz-onerisi.test.ts`). PGlite, sahte
// sağlayıcı ve sahte kuyruk; ağ yok. Ad ve kimlikler uydurmadır.

import { gocleriUygula, gunlugeYaz, kiraciIslemi, pgliteBaglantisi, sema, type Vt } from "@akredit/vt";
import { sahteSaglayici } from "@akredit/yz";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { bekleyenOnerileriKuyrugaKoy, EslemeOneriIsi, eslemeOneriIsi } from "./index.ts";

const KURUM = "01900000-0000-7000-8000-0000000000b1";
const KISI = "01900000-0000-7000-8000-000000000d01";
const PROGRAM = "01900000-0000-7000-8000-000000000e01";

let db: Vt;
let kapat: () => Promise<void>;
beforeAll(async () => {
  const b = await pgliteBaglantisi();
  await gocleriUygula(b.db);
  db = b.db;
  kapat = b.kapat;
  await db.insert(sema.kurum).values({ id: KURUM, ad: "Uydurma Üniversitesi" });
  await db.insert(sema.kisi).values({ id: KISI, kurumId: KURUM, adSoyad: "Ayşe Uydurma" });
});
afterAll(async () => {
  await kapat();
});

describe("eşleme öneri işi", () => {
  it("istek bir kez kuyruğa girer; işlenemeyen istek nedeniyle kapanır ve yeniden konmaz", async () => {
    await kiraciIslemi(db, KURUM, (tx) =>
      gunlugeYaz(tx, {
        aktor: { tur: "kisi", id: KISI },
        eylem: "program_esleme.oneri_istendi",
        hedef: { tur: "program", id: PROGRAM },
        ayrinti: { cerceve: "mudek-lisans", yol: "oturum" },
      }),
    );
    const konan: { veri: unknown; anahtar: string }[] = [];
    const gonder = async (veri: unknown, anahtar: string) => konan.push({ veri, anahtar });
    expect(await bekleyenOnerileriKuyrugaKoy(db, KURUM, gonder)).toBe(1);
    const is = EslemeOneriIsi.parse(konan[0]?.veri);
    expect(konan[0]?.anahtar).toBe(`esleme-oneri:${is.istekId}`);

    // Program bu kurumda yok: model çağrılmaz, istek "olmadı" diye kapanır.
    const s = sahteSaglayici([]);
    const r = await eslemeOneriIsi(
      { db, simdi: () => new Date("2026-10-31T10:00:00Z"), kurumFabrikasi: {}, saglayici: s },
      is,
    );
    expect(r).toEqual({ durum: "olmadi", onerilen: 0, reddedilen: 0 });
    expect(s.istekler).toHaveLength(0);
    expect(await bekleyenOnerileriKuyrugaKoy(db, KURUM, gonder)).toBe(0);
  }, 120_000);
});
