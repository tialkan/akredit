// İP-13: politika motoru, birim/program kapsamı (servis + tetikleyici), e-posta bağlantısı, özet, ölçüm,
// öneri kuyruğu. Yüksek riskli öneri hiçbir yoldan onaylanamaz. Bütün adlar uydurmadır.

import type { Oneri } from "@akredit/cekirdek";
import { kiraciIslemi, sema, zinciriDogrula } from "@akredit/vt";
import { desc, eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ServisHatasi } from "../src/hata.ts";
import * as onay from "../src/onay/index.ts";
import { onayBaglantisi } from "../src/onay/tablolar.ts";
import * as oneri from "../src/oneri.ts";
import * as politika from "../src/politika.ts";
import { ortam, SIMDI } from "./yardimci.ts";

const GIZLI = "deneme-gizli-anahtar-en-az-otuz-iki-bayt-uzunlugunda";
const SAAT = 3_600_000;

let o: Awaited<ReturnType<typeof ortam>>;
beforeAll(async () => {
  o = await ortam();
});
afterAll(async () => {
  await o.kapat();
});

async function hataKodu(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    if (e instanceof ServisHatasi) return e.kod;
    if (e && typeof e === "object" && "issues" in e) return "zod";
    const kok = (e as { cause?: { code?: string } })?.cause ?? (e as { code?: string });
    return `vt:${kok?.code ?? String(e)}`;
  }
  return "hata yok";
}

async function karari(kurumId: string, oneriId: string) {
  return kiraciIslemi(
    o.db,
    kurumId,
    async (tx) => (await tx.select().from(sema.karar).where(eq(sema.karar.oneriId, oneriId)))[0],
  );
}

async function yeniOneri(
  kurumId: string,
  tur: "kanit_etiketi" | "matris_katkisi" | "olgunluk_duzeyi" | "eylem",
  risk: "dusuk" | "orta" | "yuksek",
  hedefTuru: string,
  hedefId: string,
  guven = 0.95,
) {
  return kiraciIslemi(o.db, kurumId, async (tx) => {
    const [s] = await tx
      .insert(sema.oneri)
      .values({
        kurumId,
        tur,
        hedefTuru,
        hedefId,
        icerik: { baslik: `Deneme ${tur}`, metin: "Metin." },
        gerekce: "Deneme.",
        guven,
        ureticiTuru: "kural",
        uretici: { kural: "deneme", surum: "1" },
        risk,
      })
      .returning();
    return s?.id as string;
  });
}

async function imzaliPolitika(
  kisi: string,
  ad: string,
  kapsam: { oneriTurleri: string[]; enYuksekRisk: "dusuk" | "orta"; programIdleri?: string[]; birimIdleri?: string[] },
) {
  const b = await o.baglam(o.a, o.a.yonetici);
  const t = await politika.politikaTaslagiOlustur(b, { ad, enDusukGuven: 0.8, ...kapsam });
  return politika.politikaImzala(await o.baglam(o.a, kisi), t.id, { imzalayanAd: "Deneme Yönetici A" });
}

describe("politika motoru", () => {
  it("kapsamdaki öneriyi imzalayanın adıyla, politika dayanağıyla karara bağlar; yüksek riske dokunmaz", async () => {
    const p = await imzaliPolitika(o.a.yonetici, "Kanıt etiketleri", {
      oneriTurleri: ["kanit_etiketi"],
      enYuksekRisk: "dusuk",
    });
    const s = await onay.politikalariUygula(o.db, o.a.kurumId, SIMDI);
    expect(s.kararlar.map((k) => k.oneriId)).toEqual([o.a.oneriDusuk]);
    const k = await karari(o.a.kurumId, o.a.oneriDusuk);
    expect(k).toMatchObject({
      dayanak: "politika",
      politikaId: p.id,
      kararVerenKisiId: o.a.yonetici,
      sonuc: "onaylandi",
    });
    expect(await karari(o.a.kurumId, o.a.oneriYuksek)).toBeUndefined();
    expect(await karari(o.a.kurumId, o.a.oneriDisGonderim)).toBeUndefined();
    // Günlük: aktör sistem, imzalayan ve politika ayrıntıda; zincir bozulmamış.
    const g = await kiraciIslemi(o.db, o.a.kurumId, async (tx) => ({
      son: (await tx.select().from(sema.gunluk).orderBy(desc(sema.gunluk.sira)).limit(1))[0],
    }));
    expect(g.son).toMatchObject({ aktorTuru: "sistem", eylem: "karar.verildi" });
    expect(g.son?.ayrinti).toMatchObject({
      dayanak: "politika",
      politika: p.id,
      imzalayan: o.a.yonetici,
      yol: "politika",
    });
    expect(await zinciriDogrula(o.db, o.a.kurumId)).toBeNull();
    // İkinci çalıştırma bir şey değiştirmez.
    expect((await onay.politikalariUygula(o.db, o.a.kurumId, SIMDI)).kararlar).toEqual([]);
  });

  it("modelin yazdığı Bologna taslağı (yüzde ve saat değerleri) politikayla onaylanamaz (dalga 3 #7)", async () => {
    const p = await imzaliPolitika(o.a.yonetici, "Bologna taslakları", {
      oneriTurleri: ["bologna_taslagi"],
      enYuksekRisk: "orta",
    });
    const taslak = (ureticiTuru: "yz" | "kisi") =>
      kiraciIslemi(o.db, o.a.kurumId, async (tx) => {
        const [s] = await tx
          .insert(sema.oneri)
          .values({
            kurumId: o.a.kurumId,
            tur: "bologna_taslagi",
            hedefTuru: "ders",
            hedefId: o.a.dersId,
            icerik: { baslik: "Bologna taslağı", metin: "Değerlendirme ve iş yükü değerleri." },
            gerekce: "Deneme.",
            guven: 0.95,
            ureticiTuru,
            uretici: ureticiTuru === "yz" ? { gorev: "bologna-taslagi" } : { kisi: o.a.ogretim },
            risk: "orta",
          })
          .returning();
        return s?.id as string;
      });
    const yz = await taslak("yz");
    expect((await onay.politikalariUygula(o.db, o.a.kurumId, SIMDI, [yz])).kararlar).toEqual([]);
    // Servisi atlayan doğrudan ekleme de tetikleyicide reddedilir.
    const dogrudan = kiraciIslemi(o.db, o.a.kurumId, (tx) =>
      tx.insert(sema.karar).values({
        kurumId: o.a.kurumId,
        oneriId: yz,
        sonuc: "onaylandi",
        kararVerenKisiId: o.a.yonetici,
        dayanak: "politika",
        politikaId: p.id,
        zaman: SIMDI,
      }),
    );
    expect(await hataKodu(dogrudan)).toBe("vt:23514");
    // Kişinin kendi yazdığı taslak (Word paketi) politika kapsamında kalır.
    const kisi = await taslak("kisi");
    expect((await onay.politikalariUygula(o.db, o.a.kurumId, SIMDI, [kisi])).kararlar).toEqual([
      expect.objectContaining({ oneriId: kisi, politikaId: p.id }),
    ]);
  });

  it("iptal edilen politika artık uygulanmaz", async () => {
    const p = await imzaliPolitika(o.a.yonetici, "Eylemler", { oneriTurleri: ["eylem"], enYuksekRisk: "orta" });
    await politika.politikaIptal(await o.baglam(o.a, o.a.yonetici), p.id);
    const id = await yeniOneri(o.a.kurumId, "eylem", "orta", "ders", o.a.dersId);
    const s = await onay.politikalariUygula(o.db, o.a.kurumId, new Date(SIMDI.getTime() + 1000), [id]);
    expect(s.kararlar).toEqual([]);
  });

  it("program kapsamı: başka programa verilmiş politika bu dersin önerisine uygulanmaz, kendi programı uygulanır", async () => {
    const baska = await imzaliPolitika(o.a.yonetici, "Muhasebe matrisi", {
      oneriTurleri: ["matris_katkisi"],
      enYuksekRisk: "orta",
      programIdleri: [o.a.digerProgramId],
    });
    const id = await yeniOneri(o.a.kurumId, "matris_katkisi", "orta", "ders", o.a.dersId);
    expect((await onay.politikalariUygula(o.db, o.a.kurumId, SIMDI, [id])).kararlar).toEqual([]);
    // Tetikleyici de reddeder (servisi atlayan doğrudan ekleme).
    const dogrudan = kiraciIslemi(o.db, o.a.kurumId, (tx) =>
      tx.insert(sema.karar).values({
        kurumId: o.a.kurumId,
        oneriId: id,
        sonuc: "onaylandi",
        kararVerenKisiId: o.a.yonetici,
        dayanak: "politika",
        politikaId: baska.id,
        zaman: SIMDI,
      }),
    );
    expect(await hataKodu(dogrudan)).toBe("vt:23514");
    const kendi = await imzaliPolitika(o.a.yonetici, "Bilgisayar matrisi", {
      oneriTurleri: ["matris_katkisi"],
      enYuksekRisk: "orta",
      programIdleri: [o.a.programId],
    });
    const s = await onay.politikalariUygula(o.db, o.a.kurumId, SIMDI, [id]);
    expect(s.kararlar).toEqual([expect.objectContaining({ oneriId: id, politikaId: kendi.id })]);
  });

  it("birim kapsamı tetikleyicide: birim dışı ya da yeri bilinmeyen öneri reddedilir, birim içi kabul edilir", async () => {
    const birimli = await imzaliPolitika(o.a.yonetici, "MYO eylemleri", {
      oneriTurleri: ["eylem"],
      enYuksekRisk: "orta",
      birimIdleri: [o.a.birimId],
    });
    const yersiz = await yeniOneri(o.a.kurumId, "eylem", "orta", "gosterge", "G-1");
    const ekle = (oneriId: string) =>
      kiraciIslemi(o.db, o.a.kurumId, (tx) =>
        tx.insert(sema.karar).values({
          kurumId: o.a.kurumId,
          oneriId,
          sonuc: "onaylandi",
          kararVerenKisiId: o.a.yonetici,
          dayanak: "politika",
          politikaId: birimli.id,
          zaman: SIMDI,
        }),
      );
    expect(await hataKodu(ekle(yersiz))).toBe("vt:23514");
    // B kurumunun birimi bu kurumda yok sayılır: çıktı (program) hedefli öneri A birimindedir.
    const ciktili = await yeniOneri(o.a.kurumId, "eylem", "orta", "cikti", o.a.programCiktiId);
    expect(await hataKodu(ekle(ciktili))).toBe("hata yok");
    // Motor da yeri bilinmeyeni politikaya bağlamaz.
    expect((await onay.politikalariUygula(o.db, o.a.kurumId, SIMDI, [yersiz])).kararlar).toEqual([]);
  });

  it("imzalayan kişi yetkisini yitirdiyse politikası işlemez", async () => {
    // Rolü SIMDI + 1 saatte biten geçici yönetici politika imzalar.
    const kisi = await kiraciIslemi(o.db, o.a.kurumId, async (tx) => {
      const [k] = await tx.insert(sema.kisi).values({ kurumId: o.a.kurumId, adSoyad: "Geçici Yönetici" }).returning();
      await tx.insert(sema.rolAtamasi).values({
        kurumId: o.a.kurumId,
        kisiId: k?.id as string,
        rol: "kurum_yoneticisi",
        kapsamTuru: "kurum",
        kapsamId: o.a.kurumId,
        baslangic: new Date("2026-01-01T00:00:00Z"),
        bitis: new Date(SIMDI.getTime() + SAAT),
      });
      return k?.id as string;
    });
    const b = await o.baglam(o.a, kisi);
    const t = await politika.politikaTaslagiOlustur(b, {
      ad: "Tutanaklar",
      oneriTurleri: ["toplanti_tutanagi"],
      enYuksekRisk: "dusuk",
      enDusukGuven: 0.5,
    });
    await politika.politikaImzala(b, t.id, { imzalayanAd: "Geçici Yönetici" });
    const yeni = () =>
      kiraciIslemi(o.db, o.a.kurumId, async (tx) => {
        const [s] = await tx
          .insert(sema.oneri)
          .values({
            kurumId: o.a.kurumId,
            tur: "toplanti_tutanagi",
            hedefTuru: "ders",
            hedefId: o.a.dersId,
            icerik: { baslik: "Tutanak", metin: "." },
            gerekce: "Deneme.",
            guven: 0.9,
            ureticiTuru: "kural",
            uretici: { kural: "deneme", surum: "1" },
            risk: "dusuk",
          })
          .returning();
        return s?.id as string;
      });
    const sonra = await yeni();
    expect(
      (await onay.politikalariUygula(o.db, o.a.kurumId, new Date(SIMDI.getTime() + 2 * SAAT), [sonra])).kararlar,
    ).toEqual([]);
    const once = await yeni();
    const s = await onay.politikalariUygula(o.db, o.a.kurumId, new Date(SIMDI.getTime() + SAAT / 2), [once]);
    expect(s.kararlar).toEqual([expect.objectContaining({ oneriId: once, imzalayanKisiId: kisi })]);
  });
});

describe("yüksek risk hiçbir yoldan onaylanamaz", () => {
  it("politika yüksek riskli türü kapsayamaz", async () => {
    const b = await o.baglam(o.a, o.a.yonetici);
    expect(
      await hataKodu(
        politika.politikaTaslagiOlustur(b, {
          ad: "x",
          oneriTurleri: ["olgunluk_duzeyi"],
          enYuksekRisk: "orta",
          enDusukGuven: 0.5,
        }),
      ),
    ).not.toBe("hata yok");
  });

  it("türü düşük ama riski yüksek öneri politika kapsamındaki türde olsa da motor ve tetikleyici reddeder", async () => {
    const id = await yeniOneri(o.a.kurumId, "kanit_etiketi", "yuksek", "kanit", o.a.kanitDers);
    expect((await onay.politikalariUygula(o.db, o.a.kurumId, SIMDI, [id])).kararlar).toEqual([]);
    const [p] = await kiraciIslemi(o.db, o.a.kurumId, (tx) =>
      tx.select().from(sema.yetkiPolitikasi).where(eq(sema.yetkiPolitikasi.ad, "Kanıt etiketleri")),
    );
    const dogrudan = kiraciIslemi(o.db, o.a.kurumId, (tx) =>
      tx.insert(sema.karar).values({
        kurumId: o.a.kurumId,
        oneriId: id,
        sonuc: "onaylandi",
        kararVerenKisiId: o.a.yonetici,
        dayanak: "politika",
        politikaId: p?.id as string,
        zaman: SIMDI,
      }),
    );
    expect(await hataKodu(dogrudan)).toBe("vt:23514");
    // Kuyruğa yazımda da: oneriYaz etkin riski yazar ve politika uygulamaz.
    const y = await onay.oneriYaz(
      o.db,
      o.a.kurumId,
      {
        id: "x" as never,
        kurumId: o.a.kurumId as never,
        tur: "kanit_etiketi",
        hedef: { tur: "kanit", id: o.a.kanitDers },
        icerik: { baslik: "Yüksek", metin: "." },
        gerekce: "Deneme.",
        atiflar: [],
        guven: 0.99,
        uretici: { tur: "kural", kural: "deneme", surum: "1" },
        risk: "yuksek",
        olusturma: SIMDI.toISOString() as never,
      },
      SIMDI,
    );
    expect(y.otomatik).toBeNull();
  });

  it("toplu onay yüksek riskli öneriyi reddeder", async () => {
    const b = await o.baglam(o.a, o.a.yonetici);
    expect(await hataKodu(oneri.topluKararVer(b, { oneriIdleri: [o.a.oneriOrta, o.a.oneriYuksek] }))).toBe(
      "kural_ihlali",
    );
  });

  it("e-posta bağlantısı yüksek riskli öneriye üretilemez; kayıt doğrudan eklense de tetikleyici reddeder", async () => {
    const g = { kurumId: o.a.kurumId, kisiId: o.a.yonetici, sonuc: "onaylandi" as const, simdi: SIMDI, gizli: GIZLI };
    expect(await hataKodu(onay.baglantiUret(o.db, { ...g, oneriId: o.a.oneriYuksek }))).toBe("kural_ihlali");
    expect(await hataKodu(onay.baglantiUret(o.db, { ...g, oneriId: o.a.oneriDisGonderim }))).toBe("kural_ihlali");
    const dogrudan = kiraciIslemi(o.db, o.a.kurumId, (tx) =>
      tx.insert(onayBaglantisi).values({
        id: crypto.randomUUID(),
        kurumId: o.a.kurumId,
        oneriId: o.a.oneriYuksek,
        kisiId: o.a.yonetici,
        sonuc: "onaylandi",
        son: new Date(SIMDI.getTime() + SAAT),
        olusturma: SIMDI,
      }),
    );
    expect(await hataKodu(dogrudan)).toBe("vt:23514");
  });
});

describe("e-posta bağlantısı", () => {
  it("ön izleme kararı tüketmez; ilk kullanım karar verir, ikinci kullanım reddedilir", async () => {
    const id = await yeniOneri(o.a.kurumId, "matris_katkisi", "orta", "ders", o.a.dersId, 0.1);
    const jeton = await onay.baglantiUret(o.db, {
      kurumId: o.a.kurumId,
      kisiId: o.a.ogretim,
      oneriId: id,
      sonuc: "onaylandi",
      simdi: SIMDI,
      gizli: GIZLI,
    });
    const on = await onay.baglantiOnizle(o.db, GIZLI, jeton, SIMDI);
    expect(on).toMatchObject({ sonuc: "onaylandi", kisiAd: "Deneme Hoca A", durum: { gecerli: true } });
    expect(await karari(o.a.kurumId, id)).toBeUndefined();
    const k = await onay.baglantiKullan(o.db, GIZLI, jeton, new Date(SIMDI.getTime() + 60_000));
    expect(k).toMatchObject({ oneriId: id, sonuc: "onaylandi", kararVeren: o.a.ogretim });
    expect(await karari(o.a.kurumId, id)).toMatchObject({ dayanak: "dogrudan", kararVerenKisiId: o.a.ogretim });
    expect(await hataKodu(onay.baglantiKullan(o.db, GIZLI, jeton, new Date(SIMDI.getTime() + 120_000)))).toBe(
      "cakisma",
    );
    expect((await onay.baglantiOnizle(o.db, GIZLI, jeton, SIMDI)).durum).toMatchObject({ gecerli: false });
    const son = await kiraciIslemi(
      o.db,
      o.a.kurumId,
      async (tx) =>
        (
          await tx
            .select()
            .from(sema.gunluk)
            .where(eq(sema.gunluk.eylem, "karar.verildi"))
            .orderBy(desc(sema.gunluk.sira))
            .limit(1)
        )[0],
    );
    expect(son).toMatchObject({ aktorTuru: "kisi", aktorId: o.a.ogretim });
    expect(son?.ayrinti).toMatchObject({ yol: "eposta", dayanak: "dogrudan" });
  });

  it("aynı öneriye iki bağlantı: biri kullanılınca öbürü çalışmaz", async () => {
    const id = await yeniOneri(o.a.kurumId, "matris_katkisi", "orta", "ders", o.a.dersId, 0.1);
    const g = { kurumId: o.a.kurumId, kisiId: o.a.ogretim, oneriId: id, simdi: SIMDI, gizli: GIZLI };
    const onayJ = await onay.baglantiUret(o.db, { ...g, sonuc: "onaylandi" });
    const retJ = await onay.baglantiUret(o.db, { ...g, sonuc: "reddedildi" });
    expect((await onay.baglantiKullan(o.db, GIZLI, retJ, SIMDI)).sonuc).toBe("reddedildi");
    expect(await hataKodu(onay.baglantiKullan(o.db, GIZLI, onayJ, SIMDI))).toBe("cakisma");
  });

  it("süresi dolunca çalışmaz (tam son anda da)", async () => {
    const id = await yeniOneri(o.a.kurumId, "matris_katkisi", "orta", "ders", o.a.dersId, 0.1);
    const jeton = await onay.baglantiUret(o.db, {
      kurumId: o.a.kurumId,
      kisiId: o.a.ogretim,
      oneriId: id,
      sonuc: "onaylandi",
      simdi: SIMDI,
      gizli: GIZLI,
      sureSaat: 2,
    });
    expect(await hataKodu(onay.baglantiKullan(o.db, GIZLI, jeton, new Date(SIMDI.getTime() + 2 * SAAT)))).toBe(
      "kural_ihlali",
    );
    expect(await karari(o.a.kurumId, id)).toBeUndefined();
    // Süre en çok 14 gün.
    expect(
      await hataKodu(
        onay.baglantiUret(o.db, {
          kurumId: o.a.kurumId,
          kisiId: o.a.ogretim,
          oneriId: id,
          sonuc: "onaylandi",
          simdi: SIMDI,
          gizli: GIZLI,
          sureSaat: 24 * 15,
        }),
      ),
    ).toBe("gecersiz_istek");
  });

  it("değiştirilmiş, başka anahtarla imzalanmış ya da bozuk jeton reddedilir", async () => {
    const id = await yeniOneri(o.a.kurumId, "matris_katkisi", "orta", "ders", o.a.dersId, 0.1);
    const jeton = await onay.baglantiUret(o.db, {
      kurumId: o.a.kurumId,
      kisiId: o.a.ogretim,
      oneriId: id,
      sonuc: "onaylandi",
      simdi: SIMDI,
      gizli: GIZLI,
    });
    const [yuk, im] = jeton.split(".") as [string, string];
    const sahte = Buffer.from(JSON.stringify({ k: o.b.kurumId, i: crypto.randomUUID() })).toString("base64url");
    for (const j of [`${sahte}.${im}`, `${yuk}.${im.slice(0, -2)}xx`, "bozuk", `${yuk}.${im}.ek`]) {
      expect(await hataKodu(onay.baglantiKullan(o.db, GIZLI, j, SIMDI))).toBe("bulunamadi");
    }
    expect(await hataKodu(onay.baglantiKullan(o.db, `${GIZLI}-baska`, jeton, SIMDI))).toBe("bulunamadi");
    expect(await karari(o.a.kurumId, id)).toBeUndefined();
  });

  it("karar yetkisi olmayan kişiye bağlantı üretilmez", async () => {
    const id = await yeniOneri(o.a.kurumId, "matris_katkisi", "orta", "ders", o.a.dersId, 0.1);
    const g = { kurumId: o.a.kurumId, oneriId: id, sonuc: "onaylandi" as const, simdi: SIMDI, gizli: GIZLI };
    expect(await hataKodu(onay.baglantiUret(o.db, { ...g, kisiId: o.a.gozlemci }))).toBe("yetki_yok");
    expect(await hataKodu(onay.baglantiUret(o.db, { ...g, kisiId: o.a.rolsuz }))).toBe("yetki_yok");
  });

  it("özet e-postası: düşük/orta için bağlantı, yüksek risk için yalnız panel; boşsa ileti yok", async () => {
    const oz = await onay.onayOzeti(o.db, o.a.kurumId, o.a.yonetici, SIMDI, {
      gizli: GIZLI,
      temelAdres: "https://ornek.akredit.test/",
      siklik: "haftalik",
    });
    expect(oz?.konu).toMatch(/^Haftalık onay özeti: \d+ öneri bekliyor$/u);
    expect(oz?.metin).toContain("e-postayla onaylanamaz");
    expect(oz?.metin).toContain("https://ornek.akredit.test/onay/eposta?jeton=");
    // Yüksek riskli öneri başlığının satırında jeton yok.
    const yuksekSatiri = oz?.metin.split("\n\n").find((p) => p.includes("Olgunluk düzeyi"));
    expect(yuksekSatiri).toBeDefined();
    expect(yuksekSatiri).not.toContain("jeton=");
    expect(
      await onay.onayOzeti(o.db, o.a.kurumId, o.a.rolsuz, SIMDI, {
        gizli: GIZLI,
        temelAdres: "https://x.test",
        siklik: "gunluk",
      }),
    ).toBeNull();
  });
});

describe("kuyruk, sayaç ve ölçüm", () => {
  it("bekleyen sayacı aktörün görebildiği önerileri etkin riske göre sayar", async () => {
    const y = await onay.bekleyenSayisi(await o.baglam(o.a, o.a.yonetici));
    const liste = await oneri.bekleyenOneriler(await o.baglam(o.a, o.a.yonetici), { sinir: 100 });
    expect(y.toplam).toBe(liste.toplam);
    expect(y.risk.yuksek).toBeGreaterThanOrEqual(2);
    const r = await onay.bekleyenSayisi(await o.baglam(o.a, o.a.rolsuz));
    expect(r.toplam).toBe(0);
  });

  it("riskGruplari yüksek önce sıralar ve yüksekte toplu onayı kapatır", () => {
    const g = onay.riskGruplari([
      { tur: "kanit_etiketi", risk: "dusuk" },
      { tur: "dis_gonderim", risk: "dusuk" }, // türü yüksek
      { tur: "matris_katkisi", risk: "orta" },
    ] as never[]);
    expect(g.map((x) => [x.risk, x.topluOnay, x.ogeler.length])).toEqual([
      ["yuksek", false, 1],
      ["orta", true, 1],
      ["dusuk", true, 1],
    ]);
  });

  it("oneriAlicisi (İP-21 EylemAlicisi) öneriyi tabloya yazar, kapsamdaysa politika hemen uygular", async () => {
    const alici = onay.oneriAlicisi(o.db, o.a.kurumId, () => SIMDI);
    const eylem: Oneri<unknown> = {
      id: "gosterge-1" as never,
      kurumId: o.a.kurumId as never,
      tur: "eylem",
      hedef: { tur: "gosterge", id: "G-1" },
      icerik: { baslik: "Sapma", metin: "." },
      gerekce: "Hedef sapması.",
      atiflar: [],
      guven: null,
      uretici: { tur: "kural", kural: "gosterge.sapma", surum: "1" },
      risk: "orta",
      olusturma: SIMDI.toISOString() as never,
    };
    await alici.eylemOner(eylem);
    const yazilan = alici.yazilan[0];
    expect(yazilan?.otomatik).toBeNull(); // güven yok: politika kapsamına girmez
    const [s] = await kiraciIslemi(o.db, o.a.kurumId, (tx) =>
      tx
        .select()
        .from(sema.oneri)
        .where(eq(sema.oneri.id, yazilan?.oneriId as string)),
    );
    expect(s).toMatchObject({
      tur: "eylem",
      hedefTuru: "gosterge",
      hedefId: "G-1",
      ureticiTuru: "kural",
      risk: "orta",
    });
    expect(s?.uretici).toEqual({ kural: "gosterge.sapma", surum: "1" });
    // Başka kurumun önerisi yazılmaz.
    await expect(onay.oneriYaz(o.db, o.b.kurumId, eylem, SIMDI)).rejects.toThrow();
  });

  it("olcumHesapla: elle hesaplı örnek", () => {
    // Ayşe: 30 sn + 90 sn = 2 dk, ortanca 1 dk; ölçümsüz bir kararı da var (3 karar, 2 ölçülen).
    // Politika kararı kişiye yazılmaz, yalnız yol ve oranlarda görünür.
    const r = onay.olcumHesapla(
      [
        { kisiId: "a", oneriTuru: "matris_katkisi", sonuc: "onaylandi", yol: "oturum", sureMs: 30_000 },
        { kisiId: "a", oneriTuru: "matris_katkisi", sonuc: "duzeltildi", yol: "oturum", sureMs: 90_000 },
        { kisiId: "a", oneriTuru: "eylem", sonuc: "reddedildi", yol: "eposta", sureMs: null },
        { kisiId: "p", oneriTuru: "kanit_etiketi", sonuc: "onaylandi", yol: "politika", sureMs: null },
      ],
      new Map([["a", "Ayşe Uydurma"]]),
      { baslangic: null, bitis: null },
    );
    expect(r.kisiler).toEqual([{ kisiId: "a", ad: "Ayşe Uydurma", kararSayisi: 3, olculen: 2, toplam: 2, ortanca: 1 }]);
    expect(r.surecler).toEqual([
      { oneriTuru: "eylem", kararSayisi: 1, olculen: 0, toplam: 0, ortanca: 0 },
      { oneriTuru: "matris_katkisi", kararSayisi: 2, olculen: 2, toplam: 2, ortanca: 1 },
    ]);
    expect(r.yollar).toEqual({ oturum: 2, eposta: 1, politika: 1 });
    // 4 karar: 2 onay (%50), 1 düzeltme (%25), 1 ret (%25).
    expect(r.oranlar).toMatchObject({
      toplam: 4,
      onaylandi: 2,
      yuzde: { onaylandi: 50, duzeltildi: 25, reddedildi: 25 },
    });
  });

  it("karar ekranı süresi günlüğe girer ve ölçüm raporuna akar", async () => {
    const id = await yeniOneri(o.a.kurumId, "matris_katkisi", "orta", "ders", o.a.dersId, 0.1);
    const b = await o.baglam(o.a, o.a.ogretim);
    await oneri.kararVer(b, { oneriId: id, sonuc: "onaylandi", sureMs: 45_000 });
    const t1 = await yeniOneri(o.a.kurumId, "matris_katkisi", "orta", "ders", o.a.dersId, 0.1);
    const t2 = await yeniOneri(o.a.kurumId, "matris_katkisi", "orta", "ders", o.a.dersId, 0.1);
    await oneri.topluKararVer(b, { oneriIdleri: [t1, t2], sureMs: 30_000 }); // 15 sn + 15 sn
    const r = await onay.insanDakikasiRaporu(await o.baglam(o.a, o.a.yonetici), {});
    const hoca = r.kisiler.find((k) => k.kisiId === o.a.ogretim);
    // Hocanın ölçülen kararları: 45 + 15 + 15 sn = 75 sn = 1.25 dk; e-posta kararları ölçümsüz sayılır.
    expect(hoca).toMatchObject({ ad: "Deneme Hoca A", olculen: 3, toplam: 1.25 });
    expect(r.yollar.politika).toBeGreaterThanOrEqual(1);
    expect(r.yollar.eposta).toBeGreaterThanOrEqual(1);
    // Yetki: gözlemci günlüğü okuyamıyorsa ölçümü de göremez; tarih aralığı süzer.
    const bos = await onay.insanDakikasiRaporu(await o.baglam(o.a, o.a.yonetici), {
      baslangic: "2030-01-01T00:00:00Z",
    });
    expect(bos.oranlar.toplam).toBe(0);
  });
});

describe("kiracı sınırı", () => {
  it("B kurumunun jetonuyla A'nın bağlantısı bulunamaz; motor yalnız kendi kurumunda çalışır", async () => {
    const s = await onay.politikalariUygula(o.db, o.b.kurumId, SIMDI);
    expect(s.kararlar).toEqual([]);
    const n = await kiraciIslemi(
      o.db,
      o.b.kurumId,
      async (tx) => (await tx.execute(sql`select count(*)::int as n from onay_baglantisi`)) as unknown,
    );
    expect(JSON.stringify(n)).toContain("0");
  });
});
