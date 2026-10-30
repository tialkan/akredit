// Sessiz devir ve kaynağa geri yazma (İP-38), PGlite üzerinde uçtan uca: yeni dönem → devir önerisi + fark
// özeti bildirimi → (politika + düşük risk + süre dolumu) varsayılan onay → kurum izniyle kaynağa yazma.
// Adlar, kodlar ve tarihler uydurmadır.

import type { KaynakYazmaRaporu } from "@akredit/baglayicilar";
import type { BolognaTaslagi } from "@akredit/cekirdek";
import { kiraciIslemi, sema, type Vt } from "@akredit/vt";
import { bolognaOrnek } from "@akredit/yz";
import { and, eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type Ornek, ortam, SIMDI } from "../../test/yardimci.ts";
import type { ServisBaglami } from "../baglam.ts";
import { ServisHatasi } from "../hata.ts";
import * as onay from "../onay/index.ts";
import * as politika from "../politika.ts";
import * as bologna from "./index.ts";

let o: Awaited<ReturnType<typeof ortam>>;

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

/** Örnek taslak (sistem alanları + kurgu model çıktısı); K1-K12'den hatasız geçer. */
function ornekTaslak(): BolognaTaslagi {
  const { dayanaklar: _d, ...c } = bolognaOrnek.ornekCikti();
  return { ...bolognaOrnek.ornekGirdi().sabit, ...c } as unknown as BolognaTaslagi;
}

const GECEN_DONEM_KARARI = new Date("2026-03-01T09:00:00Z");
const YENI_DONEM = { ad: "2026-2027 Güz", baslangic: "2026-10-26", bitis: "2027-01-31" };

interface Kurulum {
  donemId: string;
  dersler: { id: string; kod: string }[];
}

/** Kurumda yeni dönem, TBP201 dersleri (her programda bir), geçen dönemin onaylı taslağı ve PÜKÖ önlemleri. */
async function hazirla(db: Vt, x: Ornek, secenek: { aktsFarki?: number; programlar: string[] }): Promise<Kurulum> {
  const t = ornekTaslak();
  const [teorik, uygulama, lab] = t.tul.split("+").map(Number);
  return kiraciIslemi(db, x.kurumId, async (tx) => {
    const [donem] = await tx
      .insert(sema.donem)
      .values({ kurumId: x.kurumId, ...YENI_DONEM })
      .returning();
    const dersler: Kurulum["dersler"] = [];
    for (const programId of secenek.programlar) {
      const [d] = await tx
        .insert(sema.ders)
        .values({
          kurumId: x.kurumId,
          programId,
          kod: t.kod,
          ad: t.ad,
          akts: t.akts + (secenek.aktsFarki ?? 0),
          teorik: teorik ?? 0,
          uygulama: uygulama ?? 0,
          laboratuvar: lab ?? 0,
          yariyil: 3,
        })
        .returning();
      if (!d || !donem) throw new Error("kurulum");
      dersler.push({ id: d.id, kod: d.kod });
      await tx.insert(sema.rolAtamasi).values({
        kurumId: x.kurumId,
        kisiId: x.ogretim,
        rol: "ogretim_elemani",
        kapsamTuru: "ders",
        kapsamId: d.id,
        baslangic: new Date("2026-01-01T00:00:00Z"),
      });
      await tx.insert(sema.dersAcilisi).values({
        kurumId: x.kurumId,
        dersId: d.id,
        donemId: donem.id,
        sorumluKisiIdleri: [x.ogretim],
      });
      const [taslak] = await tx
        .insert(sema.oneri)
        .values({
          kurumId: x.kurumId,
          tur: "bologna_taslagi",
          hedefTuru: "ders",
          hedefId: d.id,
          icerik: JSON.parse(
            JSON.stringify({
              baslik: "Bologna taslağı",
              metin: "Geçen dönem taslağı.",
              dersKodu: t.kod,
              taslak: t,
              okumaKanitId: "ornek",
              beyanKanitId: null,
              fark: [],
            }),
          ),
          gerekce: "Geçen dönem.",
          guven: 0.9,
          ureticiTuru: "kural",
          uretici: { kural: "ornek", surum: "1" },
          risk: "orta",
          olusturma: new Date("2026-02-20T09:00:00Z"),
        })
        .returning();
      await tx.insert(sema.karar).values({
        kurumId: x.kurumId,
        oneriId: taslak?.id as string,
        sonuc: "onaylandi",
        kararVerenKisiId: x.ogretim,
        dayanak: "dogrudan",
        zaman: GECEN_DONEM_KARARI,
      });
      // Geçen dönemde kapanan iki önlem (biri yöntem metnini değiştiriyor), bir de henüz planlanan (alınmaz).
      await tx.insert(sema.eylem).values([
        {
          kurumId: x.kurumId,
          kaynak: {
            tur: "ders",
            id: d.id,
            bolognaDuzeltmesi: { alan: "yontem", dil: "tr", metin: `${t.yontem.tr} Haftalık proje çalışması yapılır.` },
          },
          tanim: "Yönteme haftalık proje eklensin",
          pukoAsamasi: "onlem_al",
          olusturma: new Date("2026-05-01T09:00:00Z"),
        },
        {
          kurumId: x.kurumId,
          kaynak: { tur: "ders", id: d.id },
          tanim: "Laboratuvar duyurusu erken yapılsın",
          pukoAsamasi: "kontrol_et",
          olusturma: new Date("2026-05-02T09:00:00Z"),
        },
        {
          kurumId: x.kurumId,
          kaynak: { tur: "ders", id: d.id },
          tanim: "Henüz planlanan önlem",
          pukoAsamasi: "planla",
          olusturma: new Date("2026-05-03T09:00:00Z"),
        },
      ]);
    }
    return { donemId: donem?.id as string, dersler };
  });
}

let a: Kurulum;
let b: Kurulum;
let yonetici: ServisBaglami;
let hoca: ServisBaglami;
let ucuncuProgram: string;

beforeAll(async () => {
  o = await ortam();
  ucuncuProgram = await kiraciIslemi(o.db, o.a.kurumId, async (tx) => {
    const [p] = await tx
      .insert(sema.program)
      .values({ kurumId: o.a.kurumId, birimId: o.a.birimId, ad: "Web Tasarım A", duzey: "onlisans" })
      .returning();
    return p?.id as string;
  });
  a = await hazirla(o.db, o.a, { programlar: [o.a.programId, o.a.digerProgramId, ucuncuProgram] });
  // Kurum B: AKTS ders kaydında değişmiş (akademik karar), politika yok.
  b = await hazirla(o.db, o.b, { programlar: [o.b.programId], aktsFarki: 1 });
  yonetici = await o.baglam(o.a, o.a.yonetici);
  hoca = await o.baglam(o.a, o.a.ogretim);
});
afterAll(async () => {
  await o?.kapat();
});

const gun = (n: number) => new Date(SIMDI.getTime() + n * 86_400_000);
const nedeni = (d: RegExp) => (e: unknown) =>
  d.test(String((e as { cause?: { message?: string } }).cause?.message ?? e));

describe("iş günü hesabı", () => {
  it("hafta sonu ve tatil günlerini saymaz (elle doğrulanmış)", () => {
    // 26 Ekim 2026 pazartesi 10:00 (İstanbul). +5 iş günü: 27, 28, 29, 30 Ekim, 2 Kasım (31 Ekim-1 Kasım hafta sonu).
    const bas = new Date("2026-10-26T07:00:00Z");
    expect(bologna.isGunuEkle(bas, 5).toISOString()).toBe("2026-11-02T07:00:00.000Z");
    // Kurum 29 Ekim'i tatil girdiyse: 27, 28, 30 Ekim, 2, 3 Kasım.
    expect(bologna.isGunuEkle(bas, 5, { tatiller: ["2026-10-29"] }).toISOString()).toBe("2026-11-03T07:00:00.000Z");
    // 27 Ekim'den 3 Kasım'a kalan: 28, (29 tatil), 30, 2, 3 → 4 iş günü.
    expect(
      bologna.kalanIsGunu(new Date("2026-10-27T09:00:00Z"), new Date("2026-11-03T07:00:00Z"), {
        tatiller: ["2026-10-29"],
      }),
    ).toBe(4);
    expect(bologna.kalanIsGunu(new Date("2026-11-04T00:00:00Z"), new Date("2026-11-03T07:00:00Z"))).toBe(0);
  });
});

describe("devir taslağı (saf)", () => {
  const t = ornekTaslak();
  const [te, uy, la] = t.tul.split("+").map(Number);
  const ders = { kod: t.kod, ad: t.ad, akts: t.akts, teorik: te ?? 0, uygulama: uy ?? 0, laboratuvar: la ?? 0 };

  it("değişiklik yoksa fark boş ve düşük risk", () => {
    const s = bologna.devirTaslagiKur(t, { ders, programCiktilari: null, onlemler: [] });
    expect(s.fark).toEqual([]);
    expect(s.risk).toBe("dusuk");
    expect(s.denetim.hata).toBe(0);
  });

  it("AKTS ya da program çıktısı değişirse orta risk ve nedeni yazılır", () => {
    const s = bologna.devirTaslagiKur(t, {
      ders: { ...ders, akts: t.akts + 1 },
      programCiktilari: [...t.programCiktilari, "P99"],
      onlemler: [],
    });
    expect(s.risk).toBe("orta");
    expect(s.riskNedenleri.join(" ")).toMatch(/AKTS değişti/u);
    expect(s.riskNedenleri.join(" ")).toMatch(/Program çıktıları değişti/u);
    expect(s.fark.map((f) => f.alan)).toEqual(expect.arrayContaining(["akts", "programCiktilari"]));
  });

  it("yapılandırılmış önlem metin alanına uygulanır; diğerleri bilgi olarak kalır", () => {
    const s = bologna.devirTaslagiKur(t, {
      ders,
      programCiktilari: null,
      onlemler: [
        {
          eylemId: "e1",
          tanim: "Proje",
          asama: "onlem_al",
          bolognaDuzeltmesi: { alan: "yontem", dil: "tr", metin: "Yeni yöntem." },
        },
        { eylemId: "e2", tanim: "Duyuru", asama: "kontrol_et" },
      ],
    });
    expect(s.taslak.yontem.tr).toBe("Yeni yöntem.");
    expect(s.taslak.yontem.en).toBe(t.yontem.en);
    expect(s.fark).toEqual([expect.objectContaining({ alan: "yontem", neden: "PÜKÖ önlemi: Proje" })]);
    expect(s.onlemler).toEqual([
      { eylemId: "e1", tanim: "Proje", uygulandi: true },
      { eylemId: "e2", tanim: "Duyuru", uygulandi: false },
    ]);
    expect(t.yontem.tr).not.toBe("Yeni yöntem."); // girdi değişmez
  });
});

describe("sessiz devir: politika yokken ve akademik değişiklikte", () => {
  it("devir önerisi açılır, orta risktir, süreli onay yoktur; hocaya bildirim gider; tekrar açılmaz", async () => {
    const s = await bologna.devirBaslat(o.db, o.b.kurumId, SIMDI);
    expect(s.acilan).toHaveLength(1);
    expect(s.acilan[0]?.risk).toBe("orta");
    const ikinci = await bologna.devirBaslat(o.db, o.b.kurumId, SIMDI);
    expect(ikinci.acilan).toEqual([]);
    const [r] = await kiraciIslemi(o.db, o.b.kurumId, (tx) =>
      tx.select().from(sema.oneri).where(eq(sema.oneri.tur, "bologna_devri")),
    );
    const ic = bologna.DevirIcerigi.parse(r?.icerik);
    expect(ic.sureSonu).toBeNull();
    expect(ic.politikaId).toBeNull();
    expect(ic.riskNedenleri.join(" ")).toMatch(/AKTS/u);
    expect(ic.metin).toMatch(/Kararınız gerekiyor/u);
    const bildirim = await kiraciIslemi(o.db, o.b.kurumId, (tx) =>
      tx.select().from(sema.bildirim).where(eq(sema.bildirim.tur, "bologna_devri")),
    );
    expect(bildirim).toHaveLength(1);
    expect(bildirim[0]?.kisiId).toBe(o.b.ogretim);
    expect((bildirim[0]?.icerik as { eposta?: { durum: string } } | undefined)?.eposta?.durum).toBe("bekliyor");
    // Süre ne kadar geçerse geçsin karar verilmez.
    const v = await bologna.varsayilanOnaylariUygula(o.db, o.b.kurumId, gun(60));
    expect(v.onaylanan).toEqual([]);
  });

  it("onaylı paketi olmayan ders atlanır ve nedeni yazılır", async () => {
    await kiraciIslemi(o.db, o.b.kurumId, async (tx) => {
      const [d] = await tx
        .insert(sema.ders)
        .values({
          kurumId: o.b.kurumId,
          programId: o.b.digerProgramId,
          kod: "MUH101",
          ad: "Muhasebe",
          akts: 4,
          yariyil: 1,
        })
        .returning();
      await tx.insert(sema.dersAcilisi).values({ kurumId: o.b.kurumId, dersId: d?.id as string, donemId: b.donemId });
    });
    const s = await bologna.devirBaslat(o.db, o.b.kurumId, SIMDI);
    expect(s.atlanan).toEqual([expect.objectContaining({ dersKodu: "MUH101" })]);
  });
});

describe("sessiz devir: imzalı politika ve düşük risk", () => {
  let politikaId: string;
  let ilk: string;
  let ikinci: string;
  let ucuncu: string;

  it("politikaya itiraz süresi yazılır ve imzada günlüğe girer", async () => {
    expect(
      await kod(
        politika.politikaTaslagiOlustur(yonetici, {
          ad: "x",
          oneriTurleri: ["bologna_devri"],
          enYuksekRisk: "dusuk",
          enDusukGuven: 0.9,
          itirazSuresiIsGunu: 31,
        }),
      ),
    ).toBe("zod");
    const t = await politika.politikaTaslagiOlustur(yonetici, {
      ad: "Dönem devri yönergesi md. 5",
      oneriTurleri: ["bologna_devri"],
      enYuksekRisk: "dusuk",
      enDusukGuven: 0.9,
      itirazSuresiIsGunu: 5,
    });
    const p = await politika.politikaImzala(yonetici, t.id, { imzalayanAd: "Deneme Yönetici A" });
    expect(p.kapsam.itirazSuresiIsGunu).toBe(5);
    politikaId = p.id;
  });

  it("her ders için devir önerisi: geçen dönem paketi + kapanan önlemler; süre 5 iş günü; fark özeti bildirilir", async () => {
    const s = await bologna.devirBaslat(o.db, o.a.kurumId, SIMDI);
    expect(s.acilan.map((x) => x.risk)).toEqual(["dusuk", "dusuk", "dusuk"]);
    [ilk, ikinci, ucuncu] = s.acilan.map((x) => x.oneriId) as [string, string, string];
    const [r] = await kiraciIslemi(o.db, o.a.kurumId, (tx) =>
      tx.select().from(sema.oneri).where(eq(sema.oneri.id, ilk)),
    );
    const ic = bologna.DevirIcerigi.parse(r?.icerik);
    expect(ic.politikaId).toBe(politikaId);
    expect(ic.itirazSuresiIsGunu).toBe(5);
    // SIMDI 27 Ekim 2026 salı 12:00 (İstanbul) + 5 iş günü: 28, 29, 30 Ekim, 2, 3 Kasım.
    expect(ic.sureSonu).toBe("2026-11-03T09:00:00.000Z");
    expect(ic.taslak.yontem.tr).toBe(`${ornekTaslak().yontem.tr} Haftalık proje çalışması yapılır.`);
    expect(ic.fark.map((f) => f.alan)).toEqual(["yontem"]);
    expect(ic.onlemler.map((x) => [x.tanim, x.uygulandi])).toEqual([
      ["Yönteme haftalık proje eklensin", true],
      ["Laboratuvar duyurusu erken yapılsın", false],
    ]);
    expect(ic.metin).toMatch(/İtiraz etmezseniz/u);
    expect(r?.risk).toBe("dusuk");
    const g = await kiraciIslemi(o.db, o.a.kurumId, (tx) =>
      tx
        .select()
        .from(sema.gunluk)
        .where(and(eq(sema.gunluk.eylem, "bologna.devir_taslagi_acildi"), eq(sema.gunluk.hedefId, ilk))),
    );
    expect(g[0]?.aktorTuru).toBe("sistem");
  });

  it("İP-13 politika motoru devir önerisini hemen onaylamaz", async () => {
    const m = await onay.politikalariUygula(o.db, o.a.kurumId, SIMDI, [ilk, ikinci, ucuncu]);
    expect(m.kararlar).toEqual([]);
  });

  it("veritabanı: süre dolmadan süre dolumu ya da politika dayanağıyla karar reddedilir", async () => {
    const ekle = (dayanak: "sure_dolumu" | "politika", zaman: Date) =>
      kiraciIslemi(o.db, o.a.kurumId, (tx) =>
        tx.insert(sema.karar).values({
          kurumId: o.a.kurumId,
          oneriId: ilk,
          sonuc: "onaylandi",
          kararVerenKisiId: o.a.yonetici,
          dayanak,
          politikaId,
          zaman,
        }),
      );
    await expect(ekle("sure_dolumu", gun(2))).rejects.toSatisfy(nedeni(/İtiraz süresi dolmadan/u));
    await expect(ekle("politika", gun(30))).rejects.toSatisfy(nedeni(/yalnız süre dolumuyla/u));
    // Başka türde süre dolumu dayanağı da reddedilir.
    await expect(
      kiraciIslemi(o.db, o.a.kurumId, (tx) =>
        tx.insert(sema.karar).values({
          kurumId: o.a.kurumId,
          oneriId: o.a.oneriDusuk,
          sonuc: "onaylandi",
          kararVerenKisiId: o.a.yonetici,
          dayanak: "sure_dolumu",
          politikaId,
          zaman: gun(30),
        }),
      ),
    ).rejects.toThrow();
  });

  it("süre içinde karar verilmez; hoca reddederse ya da yeni taslak açarsa süre dolumu işlemez", async () => {
    const once = await bologna.varsayilanOnaylariUygula(o.db, o.a.kurumId, gun(3));
    expect(once.onaylanan).toEqual([]);
    expect(once.bekleyen.map((x) => x.neden)).toEqual(Array(3).fill("İtiraz süresi sürüyor."));
    // İkinci derste hoca reddeder (doğrudan karar).
    const d2 = a.dersler[1]?.id as string;
    const k = await bologna.devirKarari(hoca, d2, { sonuc: "reddedildi", gerekce: "Bu dönem içerik değişecek." });
    expect(k.dayanak).toEqual({ tur: "dogrudan" });
    expect(await kod(bologna.devirKarari(hoca, d2, { sonuc: "onaylandi" }))).toBe("cakisma");
    // Üçüncü derste hoca Bologna asistanıyla yeni taslak açar (itiraz sayılır).
    const d3 = a.dersler[2]?.id as string;
    await kiraciIslemi(o.db, o.a.kurumId, (tx) =>
      tx.insert(sema.oneri).values({
        kurumId: o.a.kurumId,
        tur: "bologna_taslagi",
        hedefTuru: "ders",
        hedefId: d3,
        icerik: { baslik: "Yeni", metin: "Hoca taslağı." },
        gerekce: "Hoca beyanı.",
        guven: 0.9,
        ureticiTuru: "kural",
        uretici: { kural: "ornek", surum: "1" },
        risk: "orta",
        olusturma: gun(1),
      }),
    );
    const d3Durum = await bologna.devirDurumu(hoca, d3);
    expect(d3Durum?.durum).toBe("hoca_degistiriyor");
  });

  it("süre dolunca: süre dolumu dayanağı, politika ve imzalayan adına karar; günlükte ayrı görünür", async () => {
    const d1 = a.dersler[0]?.id as string;
    const once = await bologna.devirDurumu(hoca, d1);
    expect(once).toMatchObject({ durum: "taslak_hazir", kalanIsGunu: 5, politikaAdi: "Dönem devri yönergesi md. 5" });
    const sonra = new Date("2026-11-03T09:00:00Z");
    const v = await bologna.varsayilanOnaylariUygula(o.db, o.a.kurumId, sonra);
    expect(v.onaylanan.map((x) => x.oneriId)).toEqual([ilk]);
    expect(v.bekleyen.map((x) => x.neden)).toEqual(["Öğretim elemanı yeni taslak hazırlıyor."]);
    const [k] = await kiraciIslemi(o.db, o.a.kurumId, (tx) =>
      tx.select().from(sema.karar).where(eq(sema.karar.oneriId, ilk)),
    );
    expect(k).toMatchObject({ dayanak: "sure_dolumu", politikaId, kararVerenKisiId: o.a.yonetici, sonuc: "onaylandi" });
    expect(k?.gerekce).toMatch(/Süre dolumuyla, "Dönem devri yönergesi md\. 5" politikası dayanağıyla/u);
    const [g] = await kiraciIslemi(o.db, o.a.kurumId, (tx) =>
      tx
        .select()
        .from(sema.gunluk)
        .where(and(eq(sema.gunluk.eylem, "karar.verildi"), eq(sema.gunluk.hedefId, k?.id as string))),
    );
    expect(g?.ayrinti).toMatchObject({
      dayanak: "sure_dolumu",
      politika: politikaId,
      imzalayanAd: "Deneme Yönetici A",
      yol: "sure_dolumu",
    });
    const durum = await bologna.devirDurumu(hoca, d1);
    expect(durum).toMatchObject({
      durum: "varsayilan_onaylandi",
      karar: { dayanak: "sure_dolumu", kararVeren: "Deneme Yönetici A" },
    });
    expect(durum?.yazma?.durum).toBe("bekliyor");
    // Tekrar çalıştırmak ikinci karar yazmaz.
    expect((await bologna.varsayilanOnaylariUygula(o.db, o.a.kurumId, gun(30))).onaylanan).toEqual([]);
  });

  it("panel durumu yetkisiz kişiye görünmez", async () => {
    const rolsuz = await o.baglam(o.a, o.a.rolsuz);
    expect(await kod(bologna.devirDurumu(rolsuz, a.dersler[0]?.id as string))).toBe("yetki_yok");
  });
});

describe("kaynağa geri yazma", () => {
  const cagrilar: { kuru: boolean; alan: number }[] = [];
  const yazici = (sonuc: Partial<KaynakYazmaRaporu> = {}): bologna.DevirYazici => ({
    async yaz(is) {
      cagrilar.push({ kuru: is.kuru, alan: is.alanlar.length });
      return {
        kuru: is.kuru,
        alanlar: is.alanlar.map((x) => ({
          sekme: x.sekme,
          alan: x.alan,
          durum: is.kuru ? "yazilacak" : "dogrulandi",
          onceki: "eski",
          yeni: x.deger,
        })),
        kaydedildi: !is.kuru,
        tamam: true,
        hata: null,
        ...sonuc,
      };
    },
  });
  let oneriId: string;

  beforeAll(async () => {
    oneriId = (await bologna.yazilacakDevirler(o.db, o.a.kurumId))[0] as string;
  });

  it("kurumun yazılı izni yokken çalışmaz ve tarayıcı ajanı hiç çağrılmaz", async () => {
    expect(oneriId).toBeTruthy();
    const s = await bologna.devirKaynagaYaz(o.db, o.a.kurumId, oneriId, yazici(), gun(8), { kuru: false });
    expect(s.durum).toBe("izin_yok");
    expect(cagrilar).toEqual([]);
    expect((await bologna.devirDurumu(hoca, a.dersler[0]?.id as string))?.yazma?.durum).toBe("izin_yok");
  });

  it("izin: yalnız oturumdaki yönetici, adını hesabındaki gibi yazarak verir; günlüğe girer", async () => {
    const g = { acik: true, yaziSayisi: "E-12345678-000-999", imzalayanAd: "Deneme Yönetici A" };
    expect(await kod(bologna.kaynagaYazmaIzniVer(hoca, g))).toBe("yetki_yok");
    expect(await kod(bologna.kaynagaYazmaIzniVer(yonetici, { ...g, imzalayanAd: "Başka Biri" }))).toBe("kural_ihlali");
    const anahtar = await o.baglam(o.a, o.a.yonetici, "anahtar");
    expect(await kod(bologna.kaynagaYazmaIzniVer(anahtar, g))).toBe("yetki_yok");
    const i = await bologna.kaynagaYazmaIzniVer(yonetici, g);
    expect(i).toMatchObject({ acik: true, gercekYazma: false, veren: "Deneme Yönetici A" });
    expect(await bologna.kaynagaYazmaIzni(yonetici)).toMatchObject({ acik: true });
  });

  it("gerçek yazma izni yokken kuru çalıştırma zorunlu", async () => {
    const s = await bologna.devirKaynagaYaz(o.db, o.a.kurumId, oneriId, yazici(), gun(8), { kuru: false });
    expect(s.durum).toBe("kuru");
    expect(cagrilar.at(-1)?.kuru).toBe(true);
    expect((await bologna.devirDurumu(hoca, a.dersler[0]?.id as string))?.yazma?.durum).toBe("kuru");
  });

  it("gerçek yazma açıkken bile varsayılan kuru; açıkça istenince yazar, her alan özetle günlüğe girer", async () => {
    await bologna.kaynagaYazmaIzniVer(yonetici, {
      acik: true,
      gercekYazma: true,
      yaziSayisi: "E-12345678-000-1000",
      imzalayanAd: "Deneme Yönetici A",
    });
    await bologna.devirKaynagaYaz(o.db, o.a.kurumId, oneriId, yazici(), gun(8));
    expect(cagrilar.at(-1)?.kuru).toBe(true);
    const s = await bologna.devirKaynagaYaz(o.db, o.a.kurumId, oneriId, yazici(), gun(8), { kuru: false });
    expect(s.durum).toBe("yazildi");
    expect(cagrilar.at(-1)?.kuru).toBe(false);
    const alanlar = await kiraciIslemi(o.db, o.a.kurumId, (tx) =>
      tx
        .select()
        .from(sema.gunluk)
        .where(
          and(
            eq(sema.gunluk.eylem, "bologna.kaynak_alani"),
            eq(sema.gunluk.hedefId, oneriId),
            sql`${sema.gunluk.ayrinti} ->> 'kuru' = 'false'`,
          ),
        ),
    );
    expect(alanlar.length).toBe(cagrilar.at(-1)?.alan);
    // Değerin kendisi değil özeti yazılır (yetkili e-postası günlükte açık durmaz).
    const metin = JSON.stringify(alanlar.map((x) => x.ayrinti));
    for (const y of ornekTaslak().yetkililer) expect(metin).not.toContain(y.eposta);
    expect((await bologna.devirDurumu(hoca, a.dersler[0]?.id as string))?.yazma?.durum).toBe("yazildi");
    expect(await bologna.yazilacakDevirler(o.db, o.a.kurumId)).toEqual([]);
  });

  it("tarayıcı ajanı hata verirse durum hata olur ve günlüğe girer", async () => {
    const s = await bologna.devirKaynagaYaz(
      o.db,
      o.a.kurumId,
      oneriId,
      { yaz: async () => Promise.reject(new Error("kopuk")) },
      gun(9),
      { kuru: false },
    );
    expect(s.durum).toBe("hata");
    expect((await bologna.devirDurumu(hoca, a.dersler[0]?.id as string))?.yazma?.durum).toBe("hata");
  });

  it("onaylanmamış (reddedilmiş) taslak kaynağa yazılmaz", async () => {
    const [r] = await kiraciIslemi(o.db, o.a.kurumId, (tx) =>
      tx
        .select({ id: sema.oneri.id })
        .from(sema.oneri)
        .where(and(eq(sema.oneri.tur, "bologna_devri"), eq(sema.oneri.hedefId, a.dersler[1]?.id as string))),
    );
    expect(await kod(bologna.devirKaynagaYaz(o.db, o.a.kurumId, r?.id as string, yazici(), gun(9)))).toBe(
      "kural_ihlali",
    );
  });
});

describe("sessiz devir: bildirilecek kimse yoksa süreli onay yok (inceleme dalga 4-7)", () => {
  it("ders açılışında sorumlu yoksa süre sonu yazılmaz ve süre dolumuyla onay verilmez", async () => {
    // Politika (kurum A, bologna_devri, düşük risk) yukarıdaki testte imzalandı. Fark özeti kimseye gitmediyse
    // itiraz edecek kimse yoktur: varsayılan onay ilke 3'e göre verilemez, karar kişide kalır.
    const t = ornekTaslak();
    const [teorik, uygulama, lab] = t.tul.split("+").map(Number);
    const { donemId, dersId } = await kiraciIslemi(o.db, o.a.kurumId, async (tx) => {
      const [p] = await tx
        .insert(sema.program)
        .values({ kurumId: o.a.kurumId, birimId: o.a.birimId, ad: "Sorumlusuz Program", duzey: "onlisans" })
        .returning();
      const [donem] = await tx
        .insert(sema.donem)
        .values({ kurumId: o.a.kurumId, ad: "2027-2028 Güz", baslangic: "2027-09-27", bitis: "2028-01-21" })
        .returning();
      const [d] = await tx
        .insert(sema.ders)
        .values({
          kurumId: o.a.kurumId,
          programId: p?.id as string,
          kod: t.kod,
          ad: t.ad,
          akts: t.akts,
          teorik: teorik ?? 0,
          uygulama: uygulama ?? 0,
          laboratuvar: lab ?? 0,
          yariyil: 3,
        })
        .returning();
      await tx
        .insert(sema.dersAcilisi)
        .values({ kurumId: o.a.kurumId, dersId: d?.id as string, donemId: donem?.id as string, sorumluKisiIdleri: [] });
      const [taslak] = await tx
        .insert(sema.oneri)
        .values({
          kurumId: o.a.kurumId,
          tur: "bologna_taslagi",
          hedefTuru: "ders",
          hedefId: d?.id as string,
          icerik: JSON.parse(JSON.stringify({ baslik: "B", metin: "M", dersKodu: t.kod, taslak: t, fark: [] })),
          gerekce: "Geçen dönem.",
          guven: 0.9,
          ureticiTuru: "kural",
          uretici: { kural: "ornek", surum: "1" },
          risk: "orta",
          olusturma: new Date("2026-02-20T09:00:00Z"),
        })
        .returning();
      await tx.insert(sema.karar).values({
        kurumId: o.a.kurumId,
        oneriId: taslak?.id as string,
        sonuc: "onaylandi",
        kararVerenKisiId: o.a.ogretim,
        dayanak: "dogrudan",
        zaman: GECEN_DONEM_KARARI,
      });
      return { donemId: donem?.id as string, dersId: d?.id as string };
    });
    const s = await bologna.devirBaslat(o.db, o.a.kurumId, SIMDI, { donemId });
    expect(s.acilan).toHaveLength(1);
    const oneriId = s.acilan[0]?.oneriId as string;
    const [r] = await kiraciIslemi(o.db, o.a.kurumId, (tx) =>
      tx.select().from(sema.oneri).where(eq(sema.oneri.id, oneriId)),
    );
    const ic = bologna.DevirIcerigi.parse(r?.icerik);
    expect(ic.bildirilen).toEqual([]);
    expect(ic.sureSonu).toBeNull();
    expect(ic.politikaId).toBeNull();
    const v = await bologna.varsayilanOnaylariUygula(o.db, o.a.kurumId, gun(60));
    expect(v.onaylanan.map((x) => x.oneriId)).not.toContain(oneriId);
    const k = await kiraciIslemi(o.db, o.a.kurumId, (tx) =>
      tx.select().from(sema.karar).where(eq(sema.karar.oneriId, oneriId)),
    );
    expect(k).toEqual([]);
    expect(dersId).toBeTruthy();
  });

  it("veritabanı: bildirilen boşken süre dolumu kararı reddedilir (son savunma hattı)", async () => {
    // Servis bu kararı yazmaz; tetikleyici de kabul etmemeli. Süre sonu geçmiş, politika geçerli, yalnız
    // bildirilen kişi yok: kimse itiraz edemezdi, "itirazsız onay" olamaz.
    const [p] = await kiraciIslemi(o.db, o.a.kurumId, (tx) =>
      tx
        .select()
        .from(sema.yetkiPolitikasi)
        .where(sql`${sema.yetkiPolitikasi.oneriTurleri} @> array['bologna_devri']::oneri_turu[]`),
    );
    expect(p).toBeDefined();
    const ekle = (bildirilen: string[]) =>
      kiraciIslemi(o.db, o.a.kurumId, async (tx) => {
        const [r] = await tx
          .insert(sema.oneri)
          .values({
            kurumId: o.a.kurumId,
            tur: "bologna_devri",
            hedefTuru: "ders",
            hedefId: a.dersler[0]?.id as string,
            icerik: { sureSonu: gun(10).toISOString(), bildirilen },
            gerekce: "Deneme.",
            guven: 0.95,
            ureticiTuru: "kural",
            uretici: { kural: "ornek", surum: "1" },
            risk: "dusuk",
            olusturma: SIMDI,
          })
          .returning();
        await tx.insert(sema.karar).values({
          kurumId: o.a.kurumId,
          oneriId: r?.id as string,
          sonuc: "onaylandi",
          kararVerenKisiId: p?.imzalayanKisiId as string,
          dayanak: "sure_dolumu",
          politikaId: p?.id as string,
          zaman: gun(30),
        });
      });
    await expect(ekle([])).rejects.toSatisfy(nedeni(/bildirilmediği/u));
    await expect(ekle([o.a.ogretim])).resolves.toBeUndefined();
  });
});
