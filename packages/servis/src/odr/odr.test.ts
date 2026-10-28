// İP-19: kurgu programla uçtan uca ÖDR (onaylı kanıt bağları + program PÇ hesabı + süreç kaydı → taslak →
// eksik görevleri → sürüm geçmişi → DOCX/XLSX), atıf-sayı denetimi ve şablon bölüm yapısı. Bütün ad ve
// numaralar uydurmadır.

import { metinCikar, tabloOku } from "@akredit/belge";
import { AKREDIT_ONLISANS_IC, type Cerceve, cerceveSemasi, MUDEK_TASLAK } from "@akredit/cerceveler";
import { kiraciIslemi, sema } from "@akredit/vt";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type Ornek, ortam } from "../../test/yardimci.ts";
import { ServisHatasi } from "../hata.ts";
import { kararVer } from "../oneri.ts";
import { EK_BASLIKLARI, odrDocxModeli } from "./belge.ts";
import { cumleDenetle, cumlelereBol, sayilar } from "./denetim.ts";
import * as odr from "./index.ts";
import { type OnayliKanit, odrKur } from "./kurucu.ts";

const OZ1 = "1a2b3c4d".padEnd(64, "0");
const OZ2 = "9f8e7d6c".padEnd(64, "1");
const kaynaklar = {
  kanitlar: new Map([
    [OZ1, ["kurul-tutanagi-2026.pdf", "12.03.2026"]],
    [OZ2, ["anket.pdf", "01.04.2026"]],
  ]),
  hesaplar: new Map([["abcdef0123456789", ["PÇ1 program düzeyi sağlanma", "62,5", "1 ders, 5 öğrenci kaydı"]]]),
};

describe("atıf ve sayı denetimi (saf)", () => {
  it("kodlar sayı sayılmaz; ondalık ve tarih parçaları ayrılır", () => {
    expect(sayilar("PÇ1 ve P.3 için 62,5 değeri, ÖÇ2, B.1.3, 12.03.2026")).toEqual(["62,5", "12.03.2026"]);
  });
  it("atıflı ve sayısı kaynaktan gelen cümle geçer", () => {
    expect(cumleDenetle("Kurul toplandı [K:1a2b3c4d].", kaynaklar).gecerli).toBe(true);
    expect(cumleDenetle("PÇ1 sağlanması 62,5 oldu [H:abcdef01].", kaynaklar).gecerli).toBe(true);
    expect(
      cumleDenetle("“kurul-tutanagi-2026.pdf” 12.03.2026 tarihinde onaylandı [K:1a2b3c4d].", kaynaklar).gecerli,
    ).toBe(true);
  });
  it("atıfsız, bilinmeyen atıflı ya da kaynağı gösterilmeyen sayılı cümle reddedilir", () => {
    expect(cumleDenetle("Kurul toplandı.", kaynaklar).sorunlar).toEqual(["Cümlede atıf yok."]);
    expect(cumleDenetle("Kurul toplandı [K:deadbeef].", kaynaklar).gecerli).toBe(false);
    // 85 hiçbir kaynakta yok: uydurma sayı.
    expect(cumleDenetle("Mezunların %85'i memnun [K:9f8e7d6c].", kaynaklar).sorunlar).toEqual([
      "Kaynağı gösterilmeyen sayı: 85",
    ]);
    // 62,5 hesapta var ama cümle hesaba değil kanıta atıf veriyor.
    expect(cumleDenetle("Sağlanma 62,5 [K:1a2b3c4d].", kaynaklar).gecerli).toBe(false);
    expect(cumleDenetle("[H:00000000] bilinmez.", kaynaklar).gecerli).toBe(false);
  });
  it("EKSİK işaretli cümle atıfsız geçer, içindeki sayı yine denetlenir", () => {
    expect(cumleDenetle("[EKSİK: tutanak yok]", kaynaklar)).toMatchObject({ gecerli: true, eksik: true });
    expect(cumleDenetle("3 toplantı yapıldı [EKSİK].", kaynaklar).gecerli).toBe(false);
  });
  it("cümlelere bölme", () => {
    expect(cumlelereBol("Bir [K:1a2b3c4d]. İki oldu.\nÜç")).toEqual(["Bir [K:1a2b3c4d].", "İki oldu.", "Üç"]);
  });
});

const kanit = (ozet: string, dosyaAdi: string, olcutKodlari: string[]): OnayliKanit => ({
  kanitId: ozet.slice(0, 8),
  ozet,
  dosyaAdi,
  olcutKodlari,
  onayZamani: "2026-03-12T10:00:00.000Z",
  onaylayan: "Deneme Yönetici",
});

// Üç bölümlü kurgu şablon (iç çerçeve; kuruluşların şablonu resmî belgeden alınınca aynı yolla çalışır).
const UC_BOLUMLU: Cerceve = cerceveSemasi.parse({
  ...AKREDIT_ONLISANS_IC,
  kod: "deneme-uc-bolum",
  raporSablonu: [
    { kod: "1", baslik: "Program çıktıları", olcutKodlari: ["P.1", "P.3"] },
    { kod: "2", baslik: "Müfredat", olcutKodlari: ["P.2"] },
    { kod: "3", baslik: "Paydaşlar ve mezunlar", olcutKodlari: ["P.4", "P.5"] },
  ],
});

describe("ÖDR kurucu ve şablon (saf)", () => {
  const t = odrKur({
    cerceve: UC_BOLUMLU,
    programAd: "Deneme Programı",
    kanitlar: [kanit(OZ1, "kurul-tutanagi-2026.pdf", ["P.1", "P.4"])],
    hesaplar: [],
    surecKayitlari: [
      {
        tanim: "Danışma kurulu yılda 2 kez toplanacak",
        pukoAsamasi: "planla",
        olcutKodlari: ["P.4"],
        kanitOzetleri: [OZ1],
      },
    ],
    ekMetinler: [
      { olcutKod: "P.1", metin: "Çıktılar web sitesinde yayımlandı. Program 40 yıllıktır [K:1a2b3c4d].", kaynak: "yz" },
    ],
  });
  it("bölümler şablon sırasıyla; her paragraf atıflı ya da EKSİK", () => {
    expect(t.sablonKaynagi).toBe("cerceve");
    expect(t.bolumler.map((b) => [b.kod, b.olcutler.map((o) => o.kod)])).toEqual([
      ["1", ["P.1", "P.3"]],
      ["2", ["P.2"]],
      ["3", ["P.4", "P.5"]],
    ]);
    for (const p of t.bolumler.flatMap((b) => b.olcutler.flatMap((o) => o.paragraflar)))
      expect(p.eksik || p.kanitOzetleri.length + p.hesapKimlikleri.length > 0).toBe(true);
    expect(t.eksikler.map((e) => e.olcutKod)).toEqual(["P.3", "P.2", "P.5"]);
  });
  it("atıfsız ve uydurma sayılı ek cümleler ile sayısı kaynaksız süreç kaydı rapora girmez", () => {
    // Ek metindeki iki cümle (atıfsız; 40 kaynaksız) + süreç kaydındaki 2 (kaynaksız) = 3 çıkarılan.
    expect(t.cikarilanCumle).toBe(3);
    const metin = JSON.stringify(t.bolumler);
    expect(metin).not.toContain("40 yıllık");
    expect(metin).not.toContain("web sitesinde");
    expect(metin).toContain("Doğrulanamayan bir kayıt rapora alınmadı");
  });
  it("DOCX modeli şablon bölümlerini sırasıyla, ardından ekleri taşır", () => {
    const m = odrDocxModeli({ taslak: t, kurumAd: "Örnek", surum: 1, surumler: [], onay: null, dersDosyalari: [] });
    const ust = m.bolumler.filter((b) => b.duzey === 1).map((b) => b.baslik);
    expect(ust).toEqual([
      "Rapor hakkında",
      "1. Program çıktıları",
      "2. Müfredat",
      "3. Paydaşlar ve mezunlar",
      ...EK_BASLIKLARI,
    ]);
    expect(m.ustBilgi).toBe("Taslak: onaylanmadı");
  });
  it("şablonu olmayan resmî çerçeve: ölçüt ağacına düşer, ölçütü yoksa EKSİK ve DOĞRULANMADI", () => {
    const m = odrKur({ cerceve: MUDEK_TASLAK, programAd: "X", kanitlar: [], hesaplar: [], surecKayitlari: [] });
    expect(m.sablonKaynagi).toBe("olcut_agaci");
    expect(m.bolumler).toEqual([]);
    expect(m.eksikler[0]?.neden).toContain("DOĞRULANMADI");
    expect(m.cerceve.rozet).toBe("Uzman doğrulaması bekliyor");
  });
});

// ---------------------------------------------------------------------------------------------------------

let o: Awaited<ReturnType<typeof ortam>>;
let a: Ornek;
let kanitDersOzet = "";
beforeAll(async () => {
  o = await ortam();
  a = o.a;
  await kiraciIslemi(o.db, a.kurumId, async (tx) => {
    const [d] = await tx.select().from(sema.kanit).where(eq(sema.kanit.id, a.kanitDers));
    kanitDersOzet = d?.ozet ?? "";
    // Kurgu ölçme sonucu (İP-16'nın yazdığı biçimde): BPA102'de PÇ1 sağlanması 62,5; 5 öğrenci.
    await tx.insert(sema.olcmeSonucu).values({
      kurumId: a.kurumId,
      dersAcilisiId: a.dersAcilisiId,
      hesapSurumu: "olcme-1",
      girdiOzeti: "c".repeat(64),
      sonuc: {
        pcSaglanmasi: [{ pcKod: "PÇ1", deger: 62.5, katkiToplami: 3, ckSayisi: 1 }],
        notIstatistikleri: { n: 5 },
      },
    });
    const etiket = (hedef: string, kodlar: string[]) =>
      tx
        .insert(sema.oneri)
        .values({
          kurumId: a.kurumId,
          tur: "kanit_etiketi",
          hedefTuru: "kanit",
          hedefId: hedef,
          icerik: { baslik: "Ölçüt bağı", metin: kodlar.join(", "), olcutKodlari: kodlar },
          gerekce: "Kurgu.",
          ureticiTuru: "kural",
          uretici: { kural: "deneme", surum: "1" },
          risk: "dusuk",
        })
        .returning({ id: sema.oneri.id });
    const [e1] = await etiket(a.kanitDers, ["P.1"]);
    const [e2] = await etiket(a.kanitKurum, ["P.2", "P.4"]);
    const [e3] = await etiket(a.kanitKurum, ["P.5"]);
    const [e4] = await etiket(a.kanitDers, ["P.3"]); // kararsız: sayılmaz
    Object.assign(a, { e1: e1?.id, e2: e2?.id, e3: e3?.id, e4: e4?.id });
    await tx.insert(sema.eylem).values({
      kurumId: a.kurumId,
      kaynak: { tur: "toplanti_karari", id: "t-1", olcutKodlari: ["P.4"] },
      tanim: "Danışma kurulu önerileri programa yansıtılacak",
      pukoAsamasi: "uygula",
      kanitIdleri: [a.kanitKurum],
    });
  });
  const y = await o.baglam(a, a.yonetici);
  const ids = a as unknown as Record<string, string>;
  await kararVer(y, { oneriId: ids.e1 as string, sonuc: "onaylandi" });
  await kararVer(y, { oneriId: ids.e2 as string, sonuc: "onaylandi" });
  await kararVer(y, { oneriId: ids.e3 as string, sonuc: "reddedildi", gerekce: "Kurgu ret." });
});
afterAll(async () => {
  await o.kapat();
});

describe("kurgu programla uçtan uca ÖDR", () => {
  let raporId = "";
  it("taslak: onaylı kanıtlar, PÇ hesabı ve süreç kaydı atıflı; kanıtsız ölçütler EKSİK", async () => {
    const y = await o.baglam(a, a.yonetici);
    const d = await odr.olustur(y, {
      programId: a.programId,
      cerceveKod: "akredit-onlisans-ic",
      ekMetinler: [
        { olcutKod: "P.1", metin: `Çıktılar yayımlandı [K:${kanitDersOzet.slice(0, 8)}].`, kaynak: "kisi" },
        { olcutKod: "P.1", metin: `Mezunların %85'i memnun [K:${kanitDersOzet.slice(0, 8)}].`, kaynak: "yz" },
      ],
    });
    raporId = d.raporId;
    expect(d.surum).toBe(1);
    expect(d.bolumler).toEqual([{ kod: "1", baslik: "Program öz değerlendirmesi", olcutSayisi: 6, kapsanan: 3 }]);
    // P.3 kanıtsız (önerisi karar bekliyor), P.5 önerisi reddedildi.
    expect(d.eksikler.map((e) => e.olcutKod)).toEqual(["P.3", "P.5"]);
    expect(d.cikarilanCumle).toBe(1);
    expect(d.onay).toBeNull();
    expect(d.onayOneriId).not.toBeNull();

    const [ilk] = await kiraciIslemi(o.db, a.kurumId, (tx) =>
      tx.select().from(sema.raporBolumuSurumu).where(eq(sema.raporBolumuSurumu.raporId, raporId)),
    );
    const metin = ilk?.metin ?? "";
    // Her olgusal paragraf atıflı ya da EKSİK (başlıklar hariç).
    const paragraflar = metin.split(/\n\n/u).filter((p) => !p.startsWith("###"));
    expect(paragraflar.length).toBeGreaterThan(5);
    for (const p of paragraflar) {
      const ok = /\[K:[0-9a-f]{8}\]|\[H:[0-9a-f]{8}\]|\[EKSİK/u.test(p);
      expect(ok, p).toBe(true);
    }
    // Program PÇ1 = tek dersin değeri 62,5 (eşit ağırlık, 1 ders); 5 öğrenci kaydı.
    expect(metin).toMatch(/PÇ1 program düzeyi sağlanma: 62,5 \(1 ders, 5 öğrenci kaydı\) \[H:[0-9a-f]{8}\]/u);
    expect(metin).toContain("Çıktılar yayımlandı");
    // Atıf kimlikleri (özet önekleri) rastgele "85" içerebilir; sayı denetimi yalnız metin üzerinde yapılır.
    expect(metin.replace(/\[[KH]:[0-9a-f]{8}\]/gu, "")).not.toMatch(/\b85\b/u);
    expect(metin).toContain("Süreç kaydı (uygula): Danışma kurulu önerileri programa yansıtılacak");
    expect(metin).toContain("[EKSİK: Bu ölçüt için onaylı kanıt yok.");
  });

  it("eksikler için görev açılır, ikinci çağrıda yinelenmez", async () => {
    const y = await o.baglam(a, a.yonetici);
    expect(await odr.eksikleriBaslat(y, raporId)).toEqual({ acilan: ["P.3", "P.5"], zatenVar: [] });
    expect(await odr.eksikleriBaslat(y, raporId)).toEqual({ acilan: [], zatenVar: ["P.3", "P.5"] });
    const g = await kiraciIslemi(o.db, a.kurumId, (tx) => tx.select().from(sema.gorev));
    expect(g.filter((x) => x.baslik.startsWith("ÖDR eksiği")).map((x) => x.baslik)).toEqual([
      "ÖDR eksiği: P.3 Program çıktılarının sağlanma düzeyi ölçülüyor",
      "ÖDR eksiği: P.5 Mezunlar izleniyor",
    ]);
  });

  it("yeniden kurma yeni sürüm ekler, öncekine bağlanır, eskisi değişmez", async () => {
    const y = await o.baglam(a, a.yonetici);
    const d = await odr.olustur(y, { programId: a.programId, cerceveKod: "akredit-onlisans-ic" });
    expect(d.raporId).toBe(raporId);
    expect(d.surum).toBe(2);
    expect(d.surumler.map((s) => [s.surum, s.eksikSayisi])).toEqual([
      [1, 2],
      [2, 2],
    ]);
    expect(d.cikarilanCumle).toBe(0);
    const s = await kiraciIslemi(o.db, a.kurumId, (tx) =>
      tx.select().from(sema.raporBolumuSurumu).where(eq(sema.raporBolumuSurumu.raporId, raporId)),
    );
    expect(s).toHaveLength(2);
    const [s1, s2] = s.sort((x, z) => x.olusturma.getTime() - z.olusturma.getTime() || x.id.localeCompare(z.id));
    expect(s2?.oncekiSurumId).toBe(s1?.id);
    expect(s1?.metin).toContain("Çıktılar yayımlandı");
    expect(s2?.metin).not.toContain("Çıktılar yayımlandı");
    expect((await odr.programinRaporlari(y, a.programId)).map((x) => x.surum)).toEqual([2]);
  });

  it("DOCX şablonun bölüm yapısına uyar; onaydan sonra onaylayan yazılır", async () => {
    const y = await o.baglam(a, a.yonetici);
    const once = await odr.belge(y, raporId, "docx");
    const t = await metinCikar(new Uint8Array(Buffer.from(once.icerikBase64, "base64")), { ad: once.dosyaAdi });
    const basliklar = t.bolumler.filter((b) => b.duzey === 1 && b.baslik).map((b) => b.baslik);
    const beklenen = ["Rapor hakkında", "1. Program öz değerlendirmesi", ...EK_BASLIKLARI];
    expect(basliklar.filter((b) => beklenen.includes(b as string))).toEqual(beklenen);
    const ikinci = t.bolumler.filter((b) => b.duzey === 2).map((b) => b.baslik);
    expect(ikinci).toEqual(
      AKREDIT_ONLISANS_IC.olcutler.flatMap((x) => [x, ...x.altOlcutler]).map((x) => `${x.kod} ${x.baslik}`),
    );
    expect(JSON.stringify(t)).toContain("EKSİK: Rapor henüz onaylanmadı");

    const d = await odr.durum(y, raporId);
    await kararVer(y, { oneriId: d.onayOneriId as string, sonuc: "onaylandi" });
    const sonra = await odr.durum(y, raporId);
    expect(sonra.onay?.onaylayan).toBe("Deneme Yönetici A");
    const docx = await odr.belge(y, raporId, "docx");
    const t2 = await metinCikar(new Uint8Array(Buffer.from(docx.icerikBase64, "base64")), { ad: docx.dosyaAdi });
    expect(JSON.stringify(t2)).toContain("Onaylayan: Deneme Yönetici A");
  });

  it("ziyaret paketi: kanıt listesi, ders dosyaları dizini, kapsama, eksikler", async () => {
    const y = await o.baglam(a, a.yonetici);
    const x = await odr.belge(y, raporId, "xlsx");
    expect(x.dosyaAdi).toMatch(/ziyaret-paketi-s2\.xlsx$/u);
    const veri = new Uint8Array(Buffer.from(x.icerikBase64, "base64"));
    const t = await tabloOku(veri, { ad: x.dosyaAdi });
    expect(t.sayfalar.map((s) => s.ad)).toEqual(["Kanıt listesi", "Ders dosyaları", "Kapsama", "Eksikler"]);
    const metin = JSON.stringify(t.sayfalar[0]);
    expect(metin).toContain("ders-izlencesi.pdf");
    expect(metin).toContain("kalite-politikasi.pdf");
    const dersler = JSON.stringify(t.sayfalar[1]);
    expect(dersler).toContain("BPA102");
  });

  it("yetki: gözlemci kuramaz, B kurumu A'nın raporunu göremez, bilinmeyen çerçeve reddedilir", async () => {
    const g = await o.baglam(a, a.gozlemci);
    await expect(odr.olustur(g, { programId: a.programId, cerceveKod: "akredit-onlisans-ic" })).rejects.toMatchObject({
      kod: "yetki_yok",
    });
    expect((await odr.durum(g, raporId)).surum).toBe(2);
    const bb = await o.baglam(o.b, o.b.yonetici);
    await expect(odr.durum(bb, raporId)).rejects.toMatchObject({ kod: "bulunamadi" });
    const y = await o.baglam(a, a.yonetici);
    await expect(odr.olustur(y, { programId: a.programId, cerceveKod: "yok" })).rejects.toBeInstanceOf(ServisHatasi);
  });
});
