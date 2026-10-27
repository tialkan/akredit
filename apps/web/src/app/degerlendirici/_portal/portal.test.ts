// Değerlendirici portalı (İP-22): salt okuma, kiracı yalıtımı, süreli erişim, erişim günlüğü, atıflı soru-cevap.
// Bütün adlar, özetler ve metinler uydurmadır.

import { aktorYukle, kanit as kanitServisi, oneri, type ServisBaglami, ServisHatasi } from "@akredit/servis";
import { sema, zinciriDogrula } from "@akredit/vt";
import { sahteSaglayici } from "@akredit/yz";
import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type TestOrtami, testOrtami } from "../../../kimlik/test-yardimci.ts";
import {
  EYLEM,
  erisimGunlugu,
  kanitGoruntule,
  kanitOdasi,
  olcutlereGore,
  PortalHatasi,
  parcaPuani,
  portalBaglami,
  soruSor,
  sozcukler,
  ziyaretProgrami,
} from "./portal.ts";

const SIMDI = new Date("2026-10-27T09:00:00Z");
const GUN = 24 * 60 * 60 * 1000;
const OZET_A = `aa11bb22${"0".repeat(56)}`;
const OZET_GIZLI = `cc33dd44${"0".repeat(56)}`;
const OZET_B = `ee55ff66${"0".repeat(56)}`;

let o: TestOrtami;
let saat = SIMDI;
const simdi = () => saat;
const ids = { degerlendirici: "", suresiz: "", kanitA: "", kanitGizli: "", kanitB: "", oneri: "" };

async function kiraci<T>(
  kurumId: string,
  is: (tx: Parameters<Parameters<TestOrtami["db"]["transaction"]>[0]>[0]) => Promise<T>,
) {
  return o.db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.kurum_id', ${kurumId}, true)`);
    return is(tx);
  });
}

async function baglam(kisiId: string, kurumId = o.a.kurumId): Promise<ServisBaglami> {
  return { db: o.db, aktor: await aktorYukle(o.db, kurumId, kisiId), simdi };
}

beforeAll(async () => {
  o = await testOrtami();
  await kiraci(o.a.kurumId, async (tx) => {
    const [d] = await tx
      .insert(sema.kisi)
      .values({ kurumId: o.a.kurumId, adSoyad: "Deneme Değerlendirici", eposta: "degerlendirici@ornek.test" })
      .returning();
    ids.degerlendirici = d?.id as string;
    // Program A kapsamında, 30 gün süreli değerlendirici.
    await tx.insert(sema.rolAtamasi).values({
      kurumId: o.a.kurumId,
      kisiId: ids.degerlendirici,
      rol: "degerlendirici",
      kapsamTuru: "program",
      kapsamId: o.a.programId,
      baslangic: new Date(SIMDI.getTime() - GUN),
      bitis: new Date(SIMDI.getTime() + 30 * GUN),
    });
    const [s] = await tx
      .insert(sema.kisi)
      .values({ kurumId: o.a.kurumId, adSoyad: "Deneme Süresiz", eposta: "suresiz@ornek.test" })
      .returning();
    ids.suresiz = s?.id as string;
    await tx.insert(sema.rolAtamasi).values({
      kurumId: o.a.kurumId,
      kisiId: ids.suresiz,
      rol: "degerlendirici",
      kapsamTuru: "kurum",
      kapsamId: o.a.kurumId,
      baslangic: new Date(SIMDI.getTime() - GUN),
    });
    await tx.update(sema.kurum).set({
      ayarlar: {
        degerlendirici: {
          ziyaretProgrami: [
            { tarih: "2026-11-03", saat: "10:00", etkinlik: "Program sorumlusuyla görüşme", yer: "Toplantı salonu" },
            { tarih: "2026-11-02", etkinlik: "Açılış toplantısı" },
          ],
        },
      },
    });
    const kanitEkle = async (
      ozet: string,
      dosyaAdi: string,
      kapsamlar: { tur: string; id: string }[],
      metin: string,
    ) => {
      const [k] = await tx
        .insert(sema.kanit)
        .values({
          kurumId: o.a.kurumId,
          ozet,
          dosyaAdi,
          mime: "application/pdf",
          boyut: 10,
          depoAnahtari: `${o.a.kurumId}/${ozet}`,
          kaynakTuru: "yukleme",
          kapsamlar,
        })
        .returning();
      await tx
        .insert(sema.kanitParcasi)
        .values({ kurumId: o.a.kurumId, kanitId: k?.id as string, sira: 0, capa: { sayfa: 3 }, metin });
      return k?.id as string;
    };
    ids.kanitA = await kanitEkle(
      OZET_A,
      "danisma-kurulu.pdf",
      [{ tur: "ders", id: o.a.dersId }],
      "Danışma kurulu 2026 yılında iki kez toplandı ve paydaş görüşleri alındı.",
    );
    // Kurum düzeyi kanıt: program kapsamlı değerlendirici göremez.
    ids.kanitGizli = await kanitEkle(
      OZET_GIZLI,
      "butce.pdf",
      [],
      "Danışma kurulu bütçesi kurum düzeyinde gizli tutulur.",
    );
    const [r] = await tx
      .insert(sema.oneri)
      .values({
        kurumId: o.a.kurumId,
        tur: "kanit_etiketi",
        hedefTuru: "ders",
        hedefId: o.a.dersId,
        icerik: { baslik: "Öneri", metin: "Önerilen metin." },
        gerekce: "Örnek gerekçe.",
        guven: 0.9,
        ureticiTuru: "kural",
        uretici: { kural: "ornek", surum: "1" },
        risk: "dusuk",
      })
      .returning();
    ids.oneri = r?.id as string;
  });
  await kiraci(o.b.kurumId, async (tx) => {
    const [k] = await tx
      .insert(sema.kanit)
      .values({
        kurumId: o.b.kurumId,
        ozet: OZET_B,
        dosyaAdi: "b-kurulu.pdf",
        mime: "application/pdf",
        boyut: 10,
        depoAnahtari: `${o.b.kurumId}/${OZET_B}`,
        kaynakTuru: "yukleme",
        kapsamlar: [{ tur: "ders", id: o.b.dersId }],
      })
      .returning();
    ids.kanitB = k?.id as string;
    await tx
      .insert(sema.kanitParcasi)
      .values({ kurumId: o.b.kurumId, kanitId: ids.kanitB, sira: 0, capa: { sayfa: 1 }, metin: "Danışma kurulu B." });
  });
}, 60_000);

afterAll(async () => {
  await o.kapat();
});

describe("saf yardımcılar", () => {
  it("kanıtları ölçüt koduna göre doğal sırayla gruplar; ölçütsüzler sonda", () => {
    const k = (id: string, olcutler: string[]) => ({
      id,
      baslik: id,
      dosyaAdi: id,
      ozet: id,
      belgeTarihi: null,
      olcutler,
    });
    const g = olcutlereGore([k("1", ["A.10"]), k("2", ["A.2", "A.10"]), k("3", [])]);
    // "A.2" < "A.10" (sayısal karşılaştırma); 2 numaralı kanıt iki grupta da görünür.
    expect(g.map((x) => [x.olcut, x.kanitlar.map((y) => y.id)])).toEqual([
      ["A.2", ["2"]],
      ["A.10", ["1", "2"]],
      [null, ["3"]],
    ]);
  });
  it("arama sözcükleri ve parça puanı", () => {
    // "ve" durak sözcük, "ne" 3 harften kısa; kalan: danışma, kurulu, toplandı.
    expect(sozcukler("Danışma kurulu ne zaman ve kaç kez toplandı?")).toEqual([
      "danışma",
      "kurulu",
      "zaman",
      "kaç",
      "kez",
      "toplandı",
    ]);
    // Parçada "danışma", "kurulu", "toplandı" geçer: 3.
    expect(parcaPuani(["danışma", "kurulu", "toplandı", "zaman"], "Danışma kurulu iki kez toplandı.")).toBe(3);
  });
});

describe("süreli erişim", () => {
  it("süresi içinde portal bağlamı kurulur, erişim bitişi atamanın bitişidir", async () => {
    saat = SIMDI;
    const p = await portalBaglami(await baglam(ids.degerlendirici));
    expect(p.erisimBitis.toISOString()).toBe(new Date(SIMDI.getTime() + 30 * GUN).toISOString());
    expect(p.aktor.atamalar.every((a) => a.rol === "degerlendirici")).toBe(true);
  });

  it("süre bitince portala giremez, servisten de kanıt göremez; ret günlüğe yazılır", async () => {
    saat = new Date(SIMDI.getTime() + 30 * GUN); // bitiş anı hariç: tam bitişte erişim yok
    const b = await baglam(ids.degerlendirici);
    await expect(portalBaglami(b)).rejects.toBeInstanceOf(PortalHatasi);
    // Portal atlanıp servis doğrudan çağrılsa da (ör. /api/v1) matris süresi geçmiş atamayı saymaz.
    const s = await kanitServisi.kanitlar(b);
    expect(s.ogeler).toHaveLength(0);
    await expect(kanitServisi.kanit(b, ids.kanitA)).rejects.toMatchObject({ kod: "yetki_yok" });
    saat = SIMDI;
    const g = await erisimGunlugu(await baglam(o.a.yoneticiKisiId));
    expect(g.some((x) => x.eylem === EYLEM.erisimReddedildi && x.kisiId === ids.degerlendirici)).toBe(true);
  });

  it("bitişsiz kaydedilmiş değerlendirici ataması hiç geçerli sayılmaz", async () => {
    saat = SIMDI;
    await expect(portalBaglami(await baglam(ids.suresiz))).rejects.toBeInstanceOf(PortalHatasi);
  });

  it("değerlendirici rolü olmayan kişi (kurum yöneticisi) portal bağlamı kuramaz", async () => {
    await expect(portalBaglami(await baglam(o.a.yoneticiKisiId))).rejects.toBeInstanceOf(PortalHatasi);
  });
});

describe("kanıt odası ve kiracı yalıtımı", () => {
  it("yalnız kapsamındaki kanıtları ölçüt ağacında görür; başka kurumun ve kurum düzeyinin kanıtı yok", async () => {
    saat = SIMDI;
    const p = await portalBaglami(await baglam(ids.degerlendirici));
    const oda = await kanitOdasi(p, {});
    const gorulen = oda.flatMap((g) => g.kanitlar.map((k) => k.id));
    expect(gorulen).toEqual([ids.kanitA]);
    expect(oda[0]?.olcut).toBeNull();
    // Arama
    expect((await kanitOdasi(p, { arama: "yok-boyle-bir-sey" })).length).toBe(0);
  });

  it("belge görüntüleyici parçaları verir; kapsam dışı 403, başka kurumun kanıtı 404", async () => {
    const p = await portalBaglami(await baglam(ids.degerlendirici));
    const a = await kanitGoruntule(p, ids.kanitA);
    expect(a.parcalar[0]?.metin).toContain("Danışma kurulu");
    await expect(kanitGoruntule(p, ids.kanitGizli)).rejects.toMatchObject({ kod: "yetki_yok" });
    await expect(kanitGoruntule(p, ids.kanitB)).rejects.toMatchObject({ kod: "bulunamadi" });
  });

  it("A kurumunun değerlendiricisi B kurumu bağlamı kuramaz", async () => {
    await expect(aktorYukle(o.db, o.b.kurumId, ids.degerlendirici)).rejects.toBeInstanceOf(ServisHatasi);
  });

  it("ziyaret programını tarih sırasıyla okur", async () => {
    const p = await portalBaglami(await baglam(ids.degerlendirici));
    expect((await ziyaretProgrami(p)).map((z) => z.etkinlik)).toEqual([
      "Açılış toplantısı",
      "Program sorumlusuyla görüşme",
    ]);
  });
});

describe("salt okuma", () => {
  it("değerlendirici hiçbir şeyi değiştiremez: karar veremez, ayar değiştiremez", async () => {
    const b = await baglam(ids.degerlendirici);
    await expect(oneri.kararVer(b, { oneriId: ids.oneri, sonuc: "onaylandi" })).rejects.toMatchObject({
      kod: "yetki_yok",
    });
    const { politika } = await import("@akredit/servis");
    await expect(politika.ayarlariGuncelle(b, { kurumAdi: "Değişti" })).rejects.toMatchObject({ kod: "yetki_yok" });
    const kararlar = await kiraci(o.a.kurumId, (tx) => tx.select().from(sema.karar));
    expect(kararlar).toHaveLength(0);
    const [kurum] = await kiraci(o.a.kurumId, (tx) => tx.select({ ad: sema.kurum.ad }).from(sema.kurum));
    expect(kurum?.ad).toBe("Örnek A Üniversitesi");
  });

  it("portalda API anahtarının kapsamı okuma eylemleriyle sınırlanır", async () => {
    const b = await baglam(ids.degerlendirici);
    const p = await portalBaglami({
      ...b,
      aktor: { ...b.aktor, tur: "anahtar", anahtarKapsami: ["kanit.oku", "karar.ver"] },
    });
    expect(p.aktor.anahtarKapsami).toEqual(["kanit.oku"]);
  });
});

describe("atıflı soru-cevap", () => {
  it("atıflı yanıt güvenceden geçer; kaynak ve kayıt günlükte", async () => {
    const p = await portalBaglami(await baglam(ids.degerlendirici));
    const yz = sahteSaglayici([`Danışma kurulu 2026 yılında iki kez toplandı [K:aa11bb22 s.3 "iki kez toplandı"].`]);
    const y = await soruSor(p, yz, { soru: "Danışma kurulu kaç kez toplandı?" });
    expect(y.gecerli).toBe(true);
    expect(y.kaynaklar.map((k) => k.kanitId)).toEqual([ids.kanitA]);
    // Kurum düzeyi (gizli) kanıtın metni modele hiç gitmedi; kanıt metni sınırlayıcı içinde.
    const giden = JSON.stringify(yz.istekler);
    expect(giden).not.toContain("bütçesi");
    expect(giden).toContain("akredit-veri");
  });

  it("geçerli atıflı cümledeki uydurma sayı yanıta girmez (inceleme dalga 3)", async () => {
    const p = await portalBaglami(await baglam(ids.degerlendirici));
    // Kanıtta "2026" var, "14" ve "%87" yok: atıf geçerli olsa da sayılar uydurmadır.
    const yz = sahteSaglayici([
      `Danışma kurulu 2026 yılında 14 kez toplandı ve katılım %87 oldu [K:aa11bb22 s.3 "iki kez toplandı"].`,
    ]);
    const y = await soruSor(p, yz, { soru: "Danışma kurulu kaç kez toplandı?" });
    expect(y.gecerli).toBe(false);
    expect(y.yanit).not.toContain("14");
    expect(y.yanit).not.toContain("87");
  });

  it("atıfsız ya da uydurma atıflı cümle EKSİK olarak işaretlenir", async () => {
    const p = await portalBaglami(await baglam(ids.degerlendirici));
    const yz = sahteSaglayici([
      "Danışma kurulu her ay düzenli toplandı. Bütçe onaylandı ve harcandı [K:cc33dd44 s.3].",
    ]);
    const y = await soruSor(p, yz, { soru: "Danışma kurulu ne sıklıkla toplandı?" });
    expect(y.gecerli).toBe(false);
    expect(y.isaretlenen).toBe(2);
    // İki cümle de EKSİK işaretinin içine alındı; işaretsiz iddia kalmadı.
    expect(y.yanit.replace(/\[EKSİK:[^\]]*\]/gu, "").trim()).toBe("");
    // Gizli kanıta yapılan atıf kaynak sayılmaz.
    expect(y.kaynaklar).toEqual([]);
  });

  it("kanıt bulunamazsa model çağrılmaz, EKSİK yanıt döner", async () => {
    const p = await portalBaglami(await baglam(ids.degerlendirici));
    const yz = sahteSaglayici([]);
    const y = await soruSor(p, yz, { soru: "Uzay istasyonu protokolü nerede?" });
    expect(y.yanit).toMatch(/^\[EKSİK/u);
    expect(yz.istekler).toHaveLength(0);
  });

  it("yurt dışı sağlayıcıya kurum izni olmadan kanıt gönderilmez", async () => {
    const p = await portalBaglami(await baglam(ids.degerlendirici));
    const yz = sahteSaglayici(["x"], { yurtIci: false });
    await expect(soruSor(p, yz, { soru: "Danışma kurulu toplandı mı?" })).rejects.toBeInstanceOf(PortalHatasi);
    expect(yz.istekler).toHaveLength(0);
  });
});

describe("erişim günlüğü", () => {
  it("kurum yöneticisi değerlendiricinin görüntüleme ve sorularını görür; zincir sağlam", async () => {
    const g = await erisimGunlugu(await baglam(o.a.yoneticiKisiId));
    const eylemler = new Set(g.filter((x) => x.kisiId === ids.degerlendirici).map((x) => x.eylem));
    expect(eylemler).toEqual(
      new Set([EYLEM.erisimReddedildi, EYLEM.odaGoruntulendi, EYLEM.kanitGoruntulendi, EYLEM.soruYanitlandi]),
    );
    const soru = g.find((x) => x.eylem === EYLEM.soruYanitlandi);
    expect(soru?.kisiAdi).toBe("Deneme Değerlendirici");
    expect(typeof soru?.ayrinti.yanit).toBe("string");
    expect(await zinciriDogrula(o.db, o.a.kurumId)).toBeNull();
  });

  it("değerlendirici erişim günlüğünü okuyamaz; B kurumunun günlüğünde A'nın kaydı yok", async () => {
    await expect(erisimGunlugu(await baglam(ids.degerlendirici))).rejects.toMatchObject({ kod: "yetki_yok" });
    expect(await erisimGunlugu(await baglam(o.b.yoneticiKisiId, o.b.kurumId))).toEqual([]);
  });
});
