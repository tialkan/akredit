// Toplantı servisi uçtan uca (PGlite): planla → davet → kayıttan taslak → insan onayı → kesinleşme → eylemler süreç
// motorunda → EBYS çıktısı. Süreç motoru apps/isci'deki gerçek motordur (köprüyle bağlanır). Adlar uydurmadır.

import { bellekTasiyici, icsOku, sahteSaat } from "@akredit/surec";
import { kiraciIslemi, sema, zinciriDogrula } from "@akredit/vt";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
// Süreç motoru apps/isci içindedir; test gerçek motorla çalışsın diye göreli yoldan alınır (yalnız testte).
import { hazirSurecleriYukle, olayYayinla, type SurecBaglami } from "../../../../apps/isci/src/surec/motor.ts";
import { ortam, SIMDI } from "../../test/yardimci.ts";
import { aktorYukle } from "../baglam.ts";
import { ServisHatasi } from "../hata.ts";
import * as oneri from "../oneri.ts";
import * as toplanti from "./index.ts";

let o: Awaited<ReturnType<typeof ortam>>;
let surecB: SurecBaglami;
let kopru: toplanti.SurecKoprusu;
const OZET = "c0ffee01".padEnd(64, "0");

beforeAll(async () => {
  o = await ortam();
  surecB = { db: o.db, saat: sahteSaat(SIMDI), eposta: bellekTasiyici() };
  await hazirSurecleriYukle(surecB, o.a.kurumId);
  kopru = (kurumId, olay, kisiId, g) => olayYayinla(surecB, kurumId, olay, { tur: "kisi", id: kisiId }, g);
});
afterAll(async () => {
  await o.kapat();
});

async function kod(p: Promise<unknown>) {
  try {
    await p;
  } catch (e) {
    if (e instanceof ServisHatasi) return e.kod;
    if (e && typeof e === "object" && "issues" in e) return "zod";
    throw e;
  }
  return "hata yok";
}

async function notKaydiEkle(kurumId: string) {
  return kiraciIslemi(o.db, kurumId, async (tx) => {
    const [k] = await tx
      .insert(sema.kanit)
      .values({
        kurumId,
        ozet: OZET,
        dosyaAdi: "komisyon-notlari.txt",
        mime: "text/plain",
        boyut: 300,
        depoAnahtari: `${kurumId}/${OZET}`,
        kaynakTuru: "yukleme",
      })
      .returning();
    if (!k) throw new Error();
    await tx.insert(sema.kanitParcasi).values([
      { kurumId, kanitId: k.id, sira: 0, capa: { sayfa: 1 }, metin: "Katılanlar: Deneme Yönetici A, Deneme Hoca A." },
      {
        kurumId,
        kanitId: k.id,
        sira: 1,
        capa: { sayfa: 2 },
        metin:
          "Karar 1: B.1.2 kapsamında ders izlencelerinin 15.12.2026 tarihine kadar Deneme Hoca A tarafından güncellenmesine.\nKarar 2: Danışma kurulunun dönem başında toplanmasına.",
      },
    ]);
    return k.id;
  });
}

describe("toplantı asistanı", () => {
  let toplantiId = "";
  let kanitId = "";
  let oneriId = "";

  it("planlar; gündem açık görevlerden kurulur; davet standart .ics", async () => {
    const b = await o.baglam(o.a, o.a.yonetici);
    const t = await toplanti.planla(b, {
      baslik: "Kalite komisyonu ekim toplantısı",
      zaman: "2026-10-30T10:00:00+03:00",
      katilimciKisiIdleri: [o.a.yonetici, o.a.ogretim, o.a.gozlemci],
    });
    toplantiId = t.id;
    expect(t.gundem.map((m) => m.kaynak.tur)).toEqual(["acilis", "gorev", "dilek"]);
    expect(t.gundem[1]?.baslik).toBe("Eksik iş: Ders dosyasını tamamla");
    const ics = await toplanti.davet(b, t.id);
    const olaylar = icsOku(ics);
    expect(olaylar.olaylar.length).toBe(1);
    expect(olaylar.hatalar).toEqual([]);
    expect(ics).toContain("SUMMARY:Kalite komisyonu ekim toplantısı");
    // Başka kurumun kişisi katılımcı olamaz.
    expect(
      await kod(
        toplanti.planla(b, {
          baslik: "X toplantısı",
          zaman: "2026-10-30T10:00:00Z",
          katilimciKisiIdleri: [o.b.yonetici],
        }),
      ),
    ).toBe("gecersiz_istek");
    // Gözlemci toplantı planlayamaz.
    const g = await o.baglam(o.a, o.a.gozlemci);
    expect(
      await kod(
        toplanti.planla(g, {
          baslik: "Y toplantısı",
          zaman: "2026-10-30T10:00:00Z",
          katilimciKisiIdleri: [o.a.gozlemci],
        }),
      ),
    ).toBe("yetki_yok");
  });

  it("taslak yalnız kayda atıflı kararlarla; uydurma model kararı ve katılımcı girmez", async () => {
    kanitId = await notKaydiEkle(o.a.kurumId);
    const b = await o.baglam(o.a, o.a.yonetici);
    const r = await toplanti.tutanakTaslagi(b, {
      toplantiId,
      kanitId,
      adaylar: [
        {
          metin:
            "B.1.2 kapsamında ders izlencelerinin 15.12.2026 tarihine kadar Deneme Hoca A tarafından güncellenmesine",
          atif: "[K:c0ffee01 s.2]",
        },
        { metin: "Danışma kurulunun dönem başında toplanmasına", atif: "[K:c0ffee01 s.2]" },
        { metin: "Laboratuvara yeni bilgisayarlar alınmasına", atif: "[K:c0ffee01 s.2]" },
        { metin: "Deneme Uydurma Kişi kurula üye seçilmesine", atif: "[K:c0ffee01 s.1]" },
      ],
    });
    oneriId = r.oneriId;
    expect(r.taslak.kararlar).toHaveLength(2);
    expect(r.taslak.reddedilenler).toHaveLength(2);
    // Gözlemci katılımcı listesindeydi ama kayıtta adı yok: katıldı yazılmaz.
    expect(r.taslak.katilimcilar.find((k) => k.kisiId === o.a.gozlemci)?.durum).toBe("eksik");
    expect(r.taslak.katilimcilar.map((k) => k.kisiId).sort()).toEqual([o.a.yonetici, o.a.ogretim, o.a.gozlemci].sort());
    const liste = await toplanti.toplantilar(b);
    expect(liste.find((t) => t.id === toplantiId)?.durum).toBe("taslak_onayda");
  });

  it("insan onayı olmadan kesinleşmez; toplu ve anahtarla onaylanamaz", async () => {
    const b = await o.baglam(o.a, o.a.yonetici);
    expect(await kod(toplanti.kesinlestir(b, oneriId, kopru))).toBe("kural_ihlali");
    expect(await kod(toplanti.ebysCiktisi(b, toplantiId))).toBe("kural_ihlali");
    expect(await kod(oneri.topluKararVer(b, { oneriIdleri: [oneriId] }))).toBe("kural_ihlali");
    const anahtar = { ...b, aktor: await aktorYukle(o.db, o.a.kurumId, o.a.yonetici, "anahtar", ["karar.ver"]) };
    expect(await kod(oneri.kararVer(anahtar, { oneriId, sonuc: "onaylandi" }))).toBe("yetki_yok");
  });

  it("onaydan sonra kararlar eyleme dönüşür ve süreç motorunda izlenir; ölçüt bağı önerilir", async () => {
    const b = await o.baglam(o.a, o.a.yonetici);
    await oneri.kararVer(b, { oneriId, sonuc: "onaylandi" });
    const s = await toplanti.kesinlestir(b, oneriId, kopru);
    expect(s.eylemIdleri).toHaveLength(2);
    expect(s.surecOrnekleri).toHaveLength(2);
    expect(s.olcutOneriId).not.toBeNull();
    await kiraciIslemi(o.db, o.a.kurumId, async (tx) => {
      const eylemler = await tx.select().from(sema.eylem);
      const e1 = eylemler.find((e) => e.id === s.eylemIdleri[0]);
      expect(e1?.sorumluKisiId).toBe(o.a.ogretim);
      expect(e1?.hedefTarih?.toISOString().slice(0, 10)).toBe("2026-12-15");
      expect(e1?.kaynak).toMatchObject({ tur: "toplanti_karari", id: toplantiId, olcutKodlari: ["B.1.2"] });
      const e2 = eylemler.find((e) => e.id === s.eylemIdleri[1]);
      expect(e2?.sorumluKisiId).toBeNull();
      // Süreç motoru: her eylem için "PUKÖ eylem izleme" örneği ve uygulama görevi açıldı.
      const gorevler = await tx.select().from(sema.gorev);
      const izleme = gorevler.filter((g) => s.surecOrnekleri.includes(g.surecOrnegiId ?? ""));
      expect(izleme.map((g) => g.baslik)).toEqual([
        "Eylemi uygulayıp kanıtını yükleyin",
        "Eylemi uygulayıp kanıtını yükleyin",
      ]);
      expect(izleme.some((g) => g.atananKisiId === o.a.ogretim)).toBe(true);
      const [t] = await tx.select().from(sema.toplanti).where(eq(sema.toplanti.id, toplantiId));
      expect(t?.tutanakKanitId).toBe(kanitId);
      const [olc] = await tx
        .select()
        .from(sema.oneri)
        .where(eq(sema.oneri.id, s.olcutOneriId ?? ""));
      expect(olc?.icerik).toMatchObject({ olcutKodlari: ["B.1.2"] });
    });
    // İkinci kez kesinleşmez.
    expect(await kod(toplanti.kesinlestir(b, oneriId, kopru))).toBe("cakisma");
    const ebys = await toplanti.ebysCiktisi(b, toplantiId);
    expect(ebys).toContain("Onaylayan: Deneme Yönetici A");
    expect(ebys).toContain("Karar 2: Danışma kurulunun dönem başında toplanmasına");
    expect(ebys).not.toContain("Laboratuvar");
    expect((await toplanti.toplantilar(b)).find((t) => t.id === toplantiId)?.durum).toBe("kesinlesti");
    expect(await zinciriDogrula(o.db, o.a.kurumId)).toBeNull();
  });

  it("başka kurum göremez ve dokunamaz", async () => {
    const bb = await o.baglam(o.b, o.b.yonetici);
    expect((await toplanti.toplantilar(bb)).map((t) => t.id)).not.toContain(toplantiId);
    expect(await kod(toplanti.ebysCiktisi(bb, toplantiId))).toBe("bulunamadi");
    expect(await kod(toplanti.tutanakTaslagi(bb, { toplantiId, kanitId }))).toBe("bulunamadi");
  });
});
