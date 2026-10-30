// Yönetici özeti kapısı (İP-39 → İP-13 onay motoru): dış gönderim onayı, karar verenin güncel özeti gördüğü
// günlük kaydı olmadan verilemez. PGlite, ağ yok. Veriler uydurmadır.

import { kiraciIslemi, sema } from "@akredit/vt";
import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { oneri } from "../src/index.ts";
import { oneriYoneticiOzeti, yoneticiOzetiGoruldu } from "../src/puko/yonetici-ozeti.ts";
import { ortam } from "./yardimci.ts";

let o: Awaited<ReturnType<typeof ortam>>;

async function gonderimOnerisi(): Promise<string> {
  return kiraciIslemi(o.db, o.a.kurumId, async (tx) => {
    const [x] = await tx
      .insert(sema.oneri)
      .values({
        kurumId: o.a.kurumId,
        tur: "dis_gonderim",
        hedefTuru: "rapor",
        hedefId: "01900000-0000-7000-8000-0000000000aa",
        icerik: { baslik: "KİDR'yi gönder", metin: "Kurum adına beyan." },
        gerekce: "Dış kuruma son gönderim insan kararıdır.",
        ureticiTuru: "kural",
        uretici: { kural: "test" },
        risk: "yuksek",
      })
      .returning();
    return x?.id as string;
  });
}

beforeAll(async () => {
  o = await ortam();
});
afterAll(async () => {
  await o?.kapat();
});

describe("yönetici özeti kapısı", () => {
  it("özet görülmeden dış gönderim onaylanamaz; görülünce günlüğe yazılır ve onay imzayla kaydedilir", async () => {
    const id = await gonderimOnerisi();
    const y = await o.baglam(o.a, o.a.yonetici);
    await expect(oneri.kararVer(y, { oneriId: id, sonuc: "onaylandi" })).rejects.toMatchObject({
      kod: "kural_ihlali",
    });
    const ozet = await oneriYoneticiOzeti(y, id);
    expect(ozet.imza).toMatch(/\S/u);
    // Eski (farklı) imzayla "görüldü" yazılamaz.
    await expect(yoneticiOzetiGoruldu(y, { oneriId: id, imza: "eski-imza" })).rejects.toMatchObject({
      kod: "kural_ihlali",
    });
    // API anahtarı özeti görmüş sayılmaz.
    const anahtar = await o.baglam(o.a, o.a.yonetici, "anahtar", ["rapor.gonder"]);
    await expect(yoneticiOzetiGoruldu(anahtar, { oneriId: id, imza: ozet.imza })).rejects.toMatchObject({
      kod: "yetki_yok",
    });
    await yoneticiOzetiGoruldu(y, { oneriId: id, imza: ozet.imza });
    const g = await kiraciIslemi(o.db, o.a.kurumId, (tx) =>
      tx
        .select()
        .from(sema.gunluk)
        .where(and(eq(sema.gunluk.eylem, "yonetici_ozeti.goruldu"), eq(sema.gunluk.hedefId, id))),
    );
    expect(g).toHaveLength(1);
    expect(g[0]?.aktorId).toBe(o.a.yonetici);
    expect(g[0]?.ayrinti).toMatchObject({ imza: ozet.imza });
    const k = await oneri.kararVer(y, { oneriId: id, sonuc: "onaylandi" });
    expect(k.sonuc).toBe("onaylandi");
    const kg = await kiraciIslemi(o.db, o.a.kurumId, (tx) =>
      tx
        .select()
        .from(sema.gunluk)
        .where(and(eq(sema.gunluk.eylem, "karar.verildi"), eq(sema.gunluk.hedefId, k.id))),
    );
    expect(kg[0]?.ayrinti).toMatchObject({ gorulenOzet: ozet.imza });
  });

  it("bir öneri için görülen özet başka öneriyi açmaz; ret kapıya takılmaz", async () => {
    const id = await gonderimOnerisi();
    const diger = await gonderimOnerisi();
    const y = await o.baglam(o.a, o.a.yonetici);
    const ozet = await oneriYoneticiOzeti(y, id);
    await yoneticiOzetiGoruldu(y, { oneriId: id, imza: ozet.imza });
    await expect(oneri.kararVer(y, { oneriId: diger, sonuc: "onaylandi" })).rejects.toMatchObject({
      kod: "kural_ihlali",
    });
    // Ret her zaman açıktır (gönderimi durdurmak).
    const r = await oneri.kararVer(y, { oneriId: diger, sonuc: "reddedildi" });
    expect(r.sonuc).toBe("reddedildi");
  });

  it("dış gönderim dışındaki öneri için özet istenmez", async () => {
    const y = await o.baglam(o.a, o.a.yonetici);
    const [x] = await kiraciIslemi(o.db, o.a.kurumId, (tx) =>
      tx.select({ id: sema.oneri.id }).from(sema.oneri).where(eq(sema.oneri.tur, "kanit_etiketi")).limit(1),
    );
    if (x) await expect(oneriYoneticiOzeti(y, x.id)).rejects.toMatchObject({ kod: "kural_ihlali" });
  });
});
