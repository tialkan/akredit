// İnceleme dalga 3 #4 (D3-4): gösterge panosu kayıtlardan çalışır; elle girilen değer yalnız onaylı kanıtla
// hesaba girer; PÇ göstergesi ölçme sonuçlarından @akredit/olcme ile türetilir. Ad ve sayılar uydurmadır.

import { gostergeHesapla, raporTablosu } from "@akredit/gosterge";
import { kiraciIslemi, sema } from "@akredit/vt";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { gostergePanosu } from "../src/gosterge.ts";
import { ServisHatasi } from "../src/hata.ts";
import { kararVer } from "../src/oneri.ts";
import { type Ornek, ortam } from "./yardimci.ts";

let o: Awaited<ReturnType<typeof ortam>>;
let a: Ornek;
let ikinciDonem = "";

beforeAll(async () => {
  o = await ortam();
  a = o.a;
  await kiraciIslemi(o.db, a.kurumId, async (tx) => {
    const [doluluk, memnuniyet, pc] = await tx
      .insert(sema.gosterge)
      .values([
        {
          kurumId: a.kurumId,
          kod: "PG-1.1",
          ad: "Program doluluk oranı",
          birim: "%",
          hesapTanimi: {
            plan: "stratejik_plan",
            yontem: { tur: "oran", pay: "yerlesen", payda: "kontenjan", carpan: 100 },
            kaynaklar: ["baglayici", "elle"],
            donemTuru: "donem",
            yon: "artan",
            hedefler: [{ donem: "2025-2026 Bahar", deger: 100 }],
          },
        },
        {
          kurumId: a.kurumId,
          kod: "PG-2.3",
          ad: "Memnuniyet",
          birim: "/5",
          hesapTanimi: { plan: "faaliyet_raporu" }, // eksik tanım: reddedilir
        },
        {
          kurumId: a.kurumId,
          kod: "PG-3.2",
          ad: "Program çıktısı sağlanma oranı",
          birim: "%",
          hesapTanimi: {
            plan: "stratejik_plan",
            yontem: { tur: "oran", pay: "saglanan_pc", payda: "toplam_pc", carpan: 100 },
            kaynaklar: ["olcme"],
            donemTuru: "donem",
            yon: "artan",
          },
        },
      ])
      .returning();
    const [d2] = await tx
      .insert(sema.donem)
      .values({ kurumId: a.kurumId, ad: "2026-2027 Güz", baslangic: "2026-09-01", bitis: "2027-01-31" })
      .returning();
    ikinciDonem = d2?.id as string;
    const atlas = {
      tur: "baglayici",
      baglayici: "YÖK Atlas",
      adres: "https://yokatlas.example/1",
      okunma: "2026-03-01T00:00:00Z",
    };
    await tx.insert(sema.gostergeOlcumu).values([
      {
        kurumId: a.kurumId,
        gostergeId: doluluk?.id as string,
        donemId: a.donemId,
        deger: "80",
        kaynak: { anahtar: "kontenjan", kaynak: atlas },
      },
      // Elle giriş; kanıtı (kalite-politikasi.pdf) henüz onaylı değil.
      {
        kurumId: a.kurumId,
        gostergeId: doluluk?.id as string,
        donemId: a.donemId,
        deger: "72",
        kaynak: {
          anahtar: "yerlesen",
          kaynak: { tur: "elle", kisiId: a.yonetici, kanitId: a.kanitKurum, zaman: "2026-03-02T00:00:00Z" },
        },
      },
      // Kanıtı hiç olmayan elle giriş.
      {
        kurumId: a.kurumId,
        gostergeId: doluluk?.id as string,
        donemId: ikinciDonem,
        deger: "75",
        kaynak: {
          anahtar: "yerlesen",
          kaynak: {
            tur: "elle",
            kisiId: a.yonetici,
            kanitId: "00000000-0000-4000-8000-000000000000",
            zaman: "2026-10-02T00:00:00Z",
          },
        },
      },
      // Ölçme verisi elle yazılamaz.
      {
        kurumId: a.kurumId,
        gostergeId: pc?.id as string,
        donemId: a.donemId,
        deger: "99",
        kaynak: { anahtar: "saglanan_pc", kaynak: { tur: "olcme", sonucId: "uydurma" } },
      },
      // Kaynaksız değer.
      { kurumId: a.kurumId, gostergeId: memnuniyet?.id as string, donemId: a.donemId, deger: "4", kaynak: {} },
    ]);
    // Ders ölçme sonucu: PÇ1 = 70 (eşik 60 üstü), PÇ2 = 50 (altı), PÇ3 hesaplanamadı (null).
    await tx.insert(sema.olcmeSonucu).values({
      kurumId: a.kurumId,
      dersAcilisiId: a.dersAcilisiId,
      hesapSurumu: "deneme",
      girdiOzeti: "b".repeat(64),
      sonuc: {
        esik: 60,
        notIstatistikleri: { n: 5 },
        pcSaglanmasi: [
          { pcKod: "PÇ1", deger: 70, katkiToplami: 3, ckSayisi: 1 },
          { pcKod: "PÇ2", deger: 50, katkiToplami: 2, ckSayisi: 1 },
          { pcKod: "PÇ3", deger: null, katkiToplami: 0, ckSayisi: 0 },
        ],
      },
    });
  });
});
afterAll(async () => {
  await o.kapat();
});

describe("gösterge panosu kayıtlardan (D3-4)", () => {
  it("onaysız kanıtlı elle değer hesaba girmez; gösterge EKSİK kalır, neden listelenir", async () => {
    const p = await gostergePanosu(await o.baglam(a, a.yonetici));
    expect(p.tanimlar.map((t) => t.kod)).toEqual(["PG-1.1", "PG-3.2"]);
    expect(p.veriler.filter((v) => v.anahtar === "yerlesen")).toEqual([]);
    const nedenler = p.reddedilenler.map((r) => `${r.gostergeKod}|${r.anahtar}|${r.neden}`);
    expect(nedenler).toEqual(
      expect.arrayContaining([
        "PG-2.3|null|Gösterge tanımı eksik ya da hatalı.",
        "PG-1.1|yerlesen|Elle girilen değerin kanıtı henüz onaylanmadı. Kanıt onaylanınca değer hesaba girer.",
        "PG-1.1|yerlesen|Elle girilen değerin kanıtı bulunamadı.",
        "PG-3.2|saglanan_pc|Ölçme verisi elle girilemez; ölçme sonuçlarından hesaplanır.",
      ]),
    );
    const t = p.tanimlar[0];
    if (!t) throw new Error("tanım yok");
    expect(gostergeHesapla(t, "2025-2026 Bahar", p.veriler).deger).toBeNull();
  });

  it("PÇ göstergesi ölçme sonucundan: 2 hesaplanan PÇ'den 1'i eşikte → %50", async () => {
    const p = await gostergePanosu(await o.baglam(a, a.yonetici));
    // PÇ1 70 ≥ 60 sağlandı, PÇ2 50 < 60 sağlanmadı, PÇ3 değersiz sayılmaz → 1/2 × 100 = 50.
    const pc = p.veriler.filter((v) => v.kaynak.tur === "olcme");
    expect(pc.map((v) => [v.anahtar, v.donem, v.deger])).toEqual([
      ["toplam_pc", "2025-2026 Bahar", 2],
      ["saglanan_pc", "2025-2026 Bahar", 1],
    ]);
    const [, satir] = raporTablosu(p.tanimlar, p.veriler, p.donemler);
    expect(satir?.degerler["2025-2026 Bahar"]).toBe(50);
  });

  it("kanıt kararla onaylanınca elle değer hesaba girer: 72/80 = %90", async () => {
    const b = await o.baglam(a, a.yonetici);
    const [on] = await kiraciIslemi(o.db, a.kurumId, (tx) =>
      tx
        .insert(sema.oneri)
        .values({
          kurumId: a.kurumId,
          tur: "kanit_etiketi",
          hedefTuru: "kanit",
          hedefId: a.kanitKurum,
          icerik: { baslik: "Etiket", metin: "Kayıt listesi." },
          gerekce: "Deneme.",
          atiflar: [{ kanitId: a.kanitKurum }],
          ureticiTuru: "kural",
          uretici: {},
          risk: "dusuk",
        })
        .returning(),
    );
    await kararVer(b, { oneriId: on?.id, sonuc: "onaylandi", sureMs: 1000 });
    const p = await gostergePanosu(b);
    expect(p.veriler.find((v) => v.anahtar === "yerlesen")?.deger).toBe(72);
    const [satir] = raporTablosu(p.tanimlar, p.veriler, p.donemler);
    expect(satir?.degerler["2025-2026 Bahar"]).toBe(90);
    expect(p.reddedilenler.some((r) => r.neden.startsWith("Elle girilen değerin kanıtı henüz"))).toBe(false);
  });

  it("kurum kapsamında ölçme okuma yetkisi olmayan göremez; başka kurum A'nın verisini görmez", async () => {
    await expect(gostergePanosu(await o.baglam(a, a.ogretim))).rejects.toBeInstanceOf(ServisHatasi);
    const pb = await gostergePanosu(await o.baglam(o.b, o.b.yonetici));
    expect(pb).toEqual({ donemler: [], tanimlar: [], veriler: [], reddedilenler: [] });
  });
});
