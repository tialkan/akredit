// Kuruma göre sağlayıcı fabrikası (İP-35). Ağ yok: sahte fetch. Anahtar uydurmadır.
import { sema } from "@akredit/vt";
import { type Saglayici, saglayiciAnahtarKasasi, sahteSaglayici, YzHatasi } from "@akredit/yz";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as politika from "../src/politika.ts";
import {
  ANAHTAR_YOK_BILDIRIMI,
  ANAHTAR_YOK_ILETISI,
  anahtariAyikla,
  kurumSaglayicisi,
  YzAnahtariYokHatasi,
} from "../src/yz-fabrika.ts";
import { ortam, yurtDisiIzniVer } from "./yardimci.ts";

const ANAHTAR = "sk-or-v1-uydurmafabrika0000000001";
const kasa = saglayiciAnahtarKasasi(new Uint8Array(32).fill(7));
let o: Awaited<ReturnType<typeof ortam>>;
beforeAll(async () => {
  o = await ortam();
});
afterAll(async () => {
  await o.kapat?.();
});

describe("kurumSaglayicisi", () => {
  it("anahtar yoksa iş açık iletiyle durur; bildirim yalnız kurum yöneticisine, bir kez", async () => {
    const hata = await kurumSaglayicisi(o.db, o.b.kurumId, { kasa }).catch((e) => e);
    expect(hata).toBeInstanceOf(YzAnahtariYokHatasi);
    expect(hata.message).toBe(ANAHTAR_YOK_ILETISI);
    expect(hata.message).toContain("Yapay zekâ anahtarı tanımlı değil");
    await kurumSaglayicisi(o.db, o.b.kurumId, { kasa }).catch(() => null);
    const b = await o.db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.kurum_id', ${o.b.kurumId}, true)`);
      return tx.select().from(sema.bildirim).where(eq(sema.bildirim.tur, ANAHTAR_YOK_BILDIRIMI));
    });
    expect(b.map((x) => x.kisiId)).toEqual([o.b.yonetici]);
    expect(b.some((x) => x.kisiId === o.b.ogretim)).toBe(false);
  });

  it("kayıtlı anahtar iş anında kasadan çözülür; OpenRouter'a gider; izin yoksa çağrı yapılmaz", async () => {
    const y = await o.baglam(o.a, o.a.yonetici);
    await politika.yzAnahtariKaydet(y, { anahtar: ANAHTAR }, kasa);
    let giden = "";
    let govde = "";
    let adres = "";
    const sahte = async (u: string | URL | Request, i?: RequestInit) => {
      adres = String(u);
      giden = String((i?.headers as Record<string, string>)?.authorization ?? "");
      govde = String(i?.body ?? "");
      return new Response(JSON.stringify({ choices: [{ message: { content: "tamam" } }] }), { status: 200 });
    };
    // Yurt dışı izni kapalı: politika reddi.
    await politika.ayarlariGuncelle(y, { yurtDisiIzni: false });
    const red = await kurumSaglayicisi(o.db, o.a.kurumId, { kasa, fetch: sahte as never }).catch((e) => e);
    expect(red).toBeInstanceOf(YzHatasi);
    expect(red.tur).toBe("politika");
    expect(adres).toBe("");

    await yurtDisiIzniVer(y);
    const k = await kurumSaglayicisi(o.db, o.a.kurumId, {
      kasa,
      fetch: sahte as never,
      ekMaske: { adlar: ["Deneme Hoca A"] },
    });
    expect(k.kaynak).toBe("kurum_anahtari");
    expect(k.saglayici.ad).toBe("openrouter");
    const yanit = await k.saglayici.sohbet({
      mesajlar: [{ rol: "kullanici", icerik: "Deneme Hoca A dersin sorumlusudur. Telefon 0532 111 22 33." }],
    });
    expect(yanit.icerik).toBe("tamam");
    expect(adres).toContain("openrouter.ai");
    expect(giden).toBe(`Bearer ${ANAHTAR}`);
    // Maskeleme korunur: ad ve telefon modele gitmez.
    expect(govde).not.toContain("Deneme Hoca A");
    expect(govde).not.toContain("0532 111 22 33");
  });

  it("anahtar hata iletisine girmez", async () => {
    const sizan = async () => {
      throw new Error(`istek başarısız: Authorization Bearer ${ANAHTAR}`);
    };
    const k = await kurumSaglayicisi(o.db, o.a.kurumId, { kasa, fetch: sizan as never });
    const h = await k.saglayici.sohbet({ mesajlar: [{ rol: "kullanici", icerik: "x" }] }).catch((e) => e);
    expect(h).toBeInstanceOf(YzHatasi);
    expect(String(h.message)).not.toContain(ANAHTAR);
    expect(String(h.stack ?? "")).not.toContain(ANAHTAR);
    expect(anahtariAyikla(`a ${ANAHTAR} b`)).toBe("a [gizli] b");
  });

  it("kurum anahtarı yoksa kurum içi model kullanılır (yurt içi, izin gerekmez)", async () => {
    const yerel: Saglayici = { ...sahteSaglayici([{ icerik: "yerel" }]), yurtIci: true };
    const k = await kurumSaglayicisi(o.db, o.b.kurumId, { kasa, kurumIci: yerel, bildir: false });
    expect(k.kaynak).toBe("kurum_ici");
    // İP-40: kurum içi model de çıkış kapısından (kurum içi kipte, maskesiz) geçer.
    expect(k.saglayici.ad).toBe(yerel.ad);
    expect((await k.saglayici.sohbet({ mesajlar: [{ rol: "kullanici", icerik: "x" }] })).icerik).toBe("yerel");
  });
});
