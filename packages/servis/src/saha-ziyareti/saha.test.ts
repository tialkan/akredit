// İP-48: saha ziyareti hazırlık simülatörü. Sentetik "Örnek A Üniversitesi" (test/yardimci.ts) ve kurgu
// iç çerçeve (akredit-onlisans-ic: P, P.1–P.5). Bütün ad, dosya ve numaralar uydurmadır.

import { AKREDIT_ONLISANS_IC, tumOlcutler } from "@akredit/cerceveler";
import { kiraciIslemi, sema } from "@akredit/vt";
import { sahteSaglayici } from "@akredit/yz";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type Ornek, ortam } from "../../test/yardimci.ts";
import * as odr from "../odr/index.ts";
import { kararVer } from "../oneri.ts";
import * as saha from "./index.ts";
import { type KanitBagi, oranHesapla, rolSorulari, sorulariKur } from "./sorular.ts";

const OZ1 = "1a2b3c4d".padEnd(64, "0");
const OZ2 = "9f8e7d6c".padEnd(64, "1");
const kb = (id: string, ozet: string, dosyaAdi: string, olcutKodlari: string[]): KanitBagi => ({
  kanitId: id,
  ozet,
  dosyaAdi,
  olcutKodlari,
});

describe("soru listesi (saf)", () => {
  const kanitlar = [kb("k1", OZ1, "kurul-tutanagi.pdf", ["P.1"]), kb("k2", OZ2, "danisma-kurulu.pdf", ["P.4"])];
  const eksikCumleler = [
    { olcutKod: "P.3", metin: "[EKSİK: Bu ölçüt için onaylı kanıt yok.]" },
    { olcutKod: "P.3", metin: "Süreç kaydı (planla): ölçme planı [EKSİK: kanıtı onaylanmadı]." },
    // Çerçevede olmayan koda bağlı eksik cümle listeye girmez.
    { olcutKod: "Z.9", metin: "[EKSİK: bilinmeyen]" },
  ];
  const l = sorulariKur({ cerceve: AKREDIT_ONLISANS_IC, kanitlar, eksikCumleler });

  it("her ölçüt ve alt ölçüt ile her EKSİK cümle en az bir soru üretir", () => {
    for (const o of tumOlcutler(AKREDIT_ONLISANS_IC.olcutler))
      expect(
        l.sorular.some((s) => s.olcutKod === o.kod && s.kaynak === "olcut"),
        o.kod,
      ).toBe(true);
    for (const e of eksikCumleler.slice(0, 2))
      expect(
        l.sorular.some((s) => s.kaynak === "eksik" && s.eksikCumle === e.metin),
        e.metin,
      ).toBe(true);
    expect(l.sorular.some((s) => s.olcutKod === "Z.9")).toBe(false);
  });

  it("inceleme D8-8: model önerisi hazırlık oranının paydasına girmez, ayrı sayılır", () => {
    const m = sorulariKur({
      cerceve: AKREDIT_ONLISANS_IC,
      kanitlar,
      eksikCumleler,
      yzOnerileri: [
        { olcutKod: "P.2", metin: "P.2 paydaş görüşü alınıyor mu?" },
        { olcutKod: "P.1", metin: "P.1 çıktılar nasıl güncelleniyor?" },
      ],
    });
    // Kurallı liste değişmez: oran aynı. Model soruları ayrı: 2 soru, P.1 kanıtlı olduğundan 1 kanıtlı.
    expect(m.toplam).toEqual(l.toplam);
    expect(m.hazirlik).toEqual(l.hazirlik);
    expect(m.modelOnerisi).toEqual({ soru: 2, kanitli: 1 });
    expect(l.modelOnerisi).toEqual({ soru: 0, kanitli: 0 });
  });

  it("cevap yazılmaz; kanıt eşlenir, kanıtsız soru hazırlıksız", () => {
    const p1 = l.sorular.find((s) => s.olcutKod === "P.1");
    expect(p1?.kanitlar.map((k) => k.dosyaAdi)).toEqual(["kurul-tutanagi.pdf"]);
    expect(p1?.hazirlik).toBe("hazir");
    expect(l.sorular.find((s) => s.olcutKod === "P.2")?.hazirlik).toBe("hazirliksiz");
    for (const s of l.sorular) {
      expect(s.metin.endsWith("?")).toBe(true);
      expect(Object.keys(s)).not.toContain("cevap");
    }
  });

  it("hazırlık oranı elle hesaplanmış örnekle", () => {
    // Sorular: 6 ölçüt sorusu (P, P.1–P.5) + 2 EKSİK sorusu (P.3) = 8.
    // Kanıtlı: P.1 ve P.4 ölçüt soruları = 2. Toplam oran 2 / 8 = %25,0.
    expect(l.toplam).toEqual({ soru: 8, kanitli: 2, oran: 25 });
    const h = new Map(l.hazirlik.map((x) => [x.olcutKod, x]));
    expect(h.get("P.1")).toMatchObject({ soru: 1, kanitli: 1, oran: 100 });
    // P.3: 1 ölçüt + 2 EKSİK sorusu, hiçbiri kanıtlı değil: 0 / 3 = %0.
    expect(h.get("P.3")).toMatchObject({ soru: 3, kanitli: 0, oran: 0 });
    expect(h.get("P")).toMatchObject({ soru: 1, kanitli: 0, oran: 0 });
    // Yuvarlama: 1/3 = %33,33… → 33,3; 2/3 = %66,66… → 66,7; soru yoksa oran yok.
    expect([oranHesapla(1, 3), oranHesapla(2, 3), oranHesapla(0, 0)]).toEqual([33.3, 66.7, null]);
    // Panoda olasılık ya da tahmin alanı yok.
    expect(JSON.stringify(l)).not.toMatch(/olasilik|basari|tahmin/u);
  });

  it("model önerisi hazırlık oranının paydasına girmez (inceleme dalga 8, D8-8)", () => {
    // Kurallı liste yukarıdakiyle aynı: 8 soru, 2 kanıtlı, %25. P.1'e iki model önerisi eklenir;
    // P.1 kanıtlı olduğundan eski hesapta toplam 4 / 10 = %40 ve P.1 3 / 3 olurdu. Doğrusu değişmemesi.
    const yz = sorulariKur({
      cerceve: AKREDIT_ONLISANS_IC,
      kanitlar,
      eksikCumleler,
      yzOnerileri: [
        { olcutKod: "P.1", metin: "P.1 kurul kararları nasıl izleniyor?" },
        { olcutKod: "P.1", metin: "P.1 paydaş görüşleri nasıl toplanıyor?" },
      ],
    });
    expect(yz.sorular.filter((s) => s.kaynak === "yz")).toHaveLength(2);
    expect(yz.toplam).toEqual({ soru: 8, kanitli: 2, oran: 25 });
    expect(yz.hazirlik.find((h) => h.olcutKod === "P.1")).toMatchObject({ soru: 1, kanitli: 1, oran: 100 });
  });

  it("aynı girdi aynı listeyi verir; rol setleri kurallı", () => {
    const l2 = sorulariKur({ cerceve: AKREDIT_ONLISANS_IC, kanitlar, eksikCumleler });
    expect(l2).toEqual(l);
    // P kök ölçüt: rektörlük; P.3 ölçme gerektirir: öğretim elemanı; P.2 matris: öğretim elemanı.
    expect(l.sorular.find((s) => s.olcutKod === "P")?.roller).toContain("rektorluk");
    expect(rolSorulari(l, "ogretim_elemani").map((s) => s.olcutKod)).toEqual(["P.2", "P.3", "P.3", "P.3"]);
    expect(rolSorulari(l, "komisyon")).toHaveLength(8);
  });

  it("model önerisi ölçüt kodu olmadan listeye girmez; dil düzeltmesi özgün metni saklar", () => {
    const p1 = l.sorular.find((s) => s.olcutKod === "P.1");
    const m = sorulariKur({
      cerceve: AKREDIT_ONLISANS_IC,
      kanitlar,
      eksikCumleler: [],
      yzOnerileri: [
        { olcutKod: "P.2", metin: "P.2 müfredat nasıl güncelleniyor?" },
        { olcutKod: "", metin: "Kampüs nerede?" },
      ],
      dilDuzeltmeleri: new Map([[p1?.id ?? "", "P.1 çıktılarını nasıl belirlediniz?"]]),
    });
    expect(m.sorular.filter((s) => s.kaynak === "yz").map((s) => s.metin)).toEqual([
      "P.2 müfredat nasıl güncelleniyor?",
    ]);
    const d = m.sorular.find((s) => s.olcutKod === "P.1");
    expect(d?.metin).toBe("P.1 çıktılarını nasıl belirlediniz?");
    expect(d?.ozgunMetin).toBe(p1?.metin);
  });

  it("EKSİK cümle ayırma", () => {
    expect(
      saha.eksikCumleleri("Kanıt var [K:1a2b3c4d]. Süreç kaydı: plan [EKSİK: kanıt yok]. [EKSİK: Bu ölçüt boş.]"),
    ).toEqual(["Süreç kaydı: plan [EKSİK: kanıt yok].", "[EKSİK: Bu ölçüt boş.]"]);
  });
});

// ---------------------------------------------------------------------------------------------------------

let o: Awaited<ReturnType<typeof ortam>>;
let a: Ornek;
beforeAll(async () => {
  o = await ortam();
  a = o.a;
  const id = await kiraciIslemi(o.db, a.kurumId, async (tx) => {
    const [e] = await tx
      .insert(sema.oneri)
      .values({
        kurumId: a.kurumId,
        tur: "kanit_etiketi",
        hedefTuru: "kanit",
        hedefId: a.kanitDers,
        icerik: { baslik: "Ölçüt bağı", metin: "P.1", olcutKodlari: ["P.1"] },
        gerekce: "Kurgu.",
        ureticiTuru: "kural",
        uretici: { kural: "deneme", surum: "1" },
        risk: "dusuk",
      })
      .returning({ id: sema.oneri.id });
    return e?.id ?? "";
  });
  const y = await o.baglam(a, a.yonetici);
  await kararVer(y, { oneriId: id, sonuc: "onaylandi" });
  await odr.olustur(y, { programId: a.programId, cerceveKod: "akredit-onlisans-ic" });
});
afterAll(async () => {
  await o.kapat();
});

const GIRDI = () => ({ programId: a.programId, cerceveKod: "akredit-onlisans-ic" });

describe("Örnek Üniversitesi ile uçtan uca", () => {
  it("ÖDR'deki her EKSİK cümle ve her ölçüt soru üretir; kanıt onaylı bağdan eşlenir", async () => {
    const y = await o.baglam(a, a.yonetici);
    const d = await saha.hazirla(y, GIRDI());
    expect(d.odrSurumu).toBe(1);
    expect(d.yz).toBeNull();
    const kodlar = tumOlcutler(AKREDIT_ONLISANS_IC.olcutler).map((x) => x.kod);
    for (const k of kodlar) expect(d.sorular.some((s) => s.olcutKod === k)).toBe(true);
    // ÖDR'de P.1 dışındaki her yaprak ölçüt kanıtsız: her biri en az bir EKSİK sorusu taşır.
    const yapraklar = tumOlcutler(AKREDIT_ONLISANS_IC.olcutler)
      .filter((x) => !x.altOlcutler.length)
      .map((x) => x.kod);
    for (const k of yapraklar.filter((x) => x !== "P.1"))
      expect(
        d.sorular.some((s) => s.olcutKod === k && s.kaynak === "eksik"),
        k,
      ).toBe(true);
    const p1 = d.sorular.find((s) => s.olcutKod === "P.1" && s.kaynak === "olcut");
    expect(p1?.kanitlar.map((x) => x.dosyaAdi)).toEqual(["ders-izlencesi.pdf"]);
    expect(d.hazirlik.find((h) => h.olcutKod === "P.1")).toMatchObject({ soru: 1, kanitli: 1, oran: 100 });
    expect(d.toplam.kanitli).toBe(1);
  });

  it("sahte sağlayıcı: geçerli düzeltme ve ölçüte bağlı öneri girer; kodsuz öneri ve cevap girmez", async () => {
    const y = await o.baglam(a, a.yonetici);
    const once = await saha.hazirla(y, GIRDI());
    const p1 = once.sorular.find((s) => s.olcutKod === "P.1" && s.kaynak === "olcut");
    const s = sahteSaglayici([
      JSON.stringify({
        duzeltmeler: [
          { soruId: p1?.id, metin: "P.1 program çıktılarını nasıl belirlediniz?" },
          { soruId: p1?.id, metin: "P.1 için kurul toplandı. Kanıt ektedir." },
        ],
        oneriler: [
          { olcutKod: "P.5", metin: "P.5 mezunlarla nasıl iletişim kuruyorsunuz?" },
          { olcutKod: "YOK", metin: "Okulun kuruluş yılı nedir?" },
          { olcutKod: "P.2", metin: "Cevap: müfredat güncellendi?" },
        ],
      }),
    ]);
    const d = await saha.hazirla(y, GIRDI(), { saglayici: s });
    expect(d.yz).toEqual({ duzeltilen: 1, onerilen: 1, reddedilen: 3 });
    const yzSorulari = d.sorular.filter((x) => x.kaynak === "yz");
    expect(yzSorulari.map((x) => [x.olcutKod, x.metin, x.hazirlik])).toEqual([
      ["P.5", "P.5 mezunlarla nasıl iletişim kuruyorsunuz?", "hazirliksiz"],
    ]);
    expect(d.sorular.find((x) => x.id === p1?.id)?.metin).toBe("P.1 program çıktılarını nasıl belirlediniz?");
    expect(JSON.stringify(d)).not.toContain("Kanıt ektedir");
    // D8-8: öneri saklanır; modelsiz sonraki çağrıda da listede kalır, oranın paydasına girmez ve prova alır.
    expect(d.toplam).toEqual(once.toplam);
    expect(d.modelOnerisi).toEqual({ soru: 1, kanitli: 0 });
    const sonra = await saha.hazirla(y, GIRDI());
    const p5 = sonra.sorular.find((x) => x.kaynak === "yz");
    expect(p5?.metin).toBe("P.5 mezunlarla nasıl iletişim kuruyorsunuz?");
    const r = await saha.provaIsaretle(y, { ...GIRDI(), soruId: p5?.id, rol: "komisyon", durum: "hazirim" });
    expect(r.durum).toBe("hazirim");
    // Modele kanıt içeriği ve kişi adı gitmez.
    const giden = JSON.stringify(s.istekler);
    expect(giden).not.toContain("Deneme Yönetici");
    expect(giden).not.toContain("ders-izlencesi.pdf");
  });

  it("prova: eksik var işareti komisyona görev açar, ikinci işaret yinelemez; hazırım günlüğe girer", async () => {
    const h = await o.baglam(a, a.ogretim);
    const d = await saha.hazirla(h, GIRDI());
    const p3 = d.sorular.find((s) => s.olcutKod === "P.3" && s.kaynak === "olcut");
    const p1 = d.sorular.find((s) => s.olcutKod === "P.1" && s.kaynak === "olcut");
    const r1 = await saha.provaIsaretle(h, { ...GIRDI(), soruId: p3?.id, rol: "ogretim_elemani", durum: "eksik_var" });
    expect(r1.gorevId).not.toBeNull();
    expect(r1.zatenVardi).toBe(false);
    const r2 = await saha.provaIsaretle(h, { ...GIRDI(), soruId: p3?.id, rol: "ogretim_elemani", durum: "eksik_var" });
    expect(r2).toMatchObject({ gorevId: r1.gorevId, zatenVardi: true });
    await saha.provaIsaretle(h, { ...GIRDI(), soruId: p1?.id, rol: "ogretim_elemani", durum: "hazirim" });
    const g = await kiraciIslemi(o.db, a.kurumId, (tx) =>
      tx
        .select()
        .from(sema.gorev)
        .where(eq(sema.gorev.id, r1.gorevId as string)),
    );
    expect(g[0]?.baslik).toBe("Saha ziyareti hazırlığı: P.3 için eksik var");
    expect(g[0]?.ayrinti).toMatchObject({ hedefEkip: "komisyon", olcutKod: "P.3", sahaSoruId: p3?.id });
    const sonra = await saha.hazirla(h, GIRDI());
    expect(sonra.prova).toEqual({ [p3?.id as string]: "eksik_var", [p1?.id as string]: "hazirim" });
    // Prova işareti hazırlık oranını değiştirmez: oran yalnız kanıttan hesaplanır.
    expect(sonra.toplam).toEqual(d.toplam);
    // Başka kişinin işaretleri bu kişiye görünmez.
    const baskasi = (await saha.hazirla(await o.baglam(a, a.yonetici), GIRDI())).prova;
    expect(baskasi).not.toHaveProperty(p3?.id as string);
    expect(baskasi).not.toHaveProperty(p1?.id as string);
  });

  it("gözlemci listeyi görür ama prova işareti koyamaz", async () => {
    const g = await o.baglam(a, a.gozlemci);
    const d = await saha.hazirla(g, GIRDI());
    await expect(
      saha.provaIsaretle(g, { ...GIRDI(), soruId: d.sorular[0]?.id, rol: "komisyon", durum: "eksik_var" }),
    ).rejects.toMatchObject({ kod: "yetki_yok" });
  });

  it("KİDR ve BİDR eksikleri de soru üretir (yalnız çerçevedeki kodlar, son sürüm)", async () => {
    await kiraciIslemi(o.db, a.kurumId, async (tx) => {
      const [r] = await tx
        .insert(sema.rapor)
        .values({ kurumId: a.kurumId, tur: "kidr", kapsam: { tur: "kurum", id: a.kurumId }, baslik: "KİDR taslağı" })
        .returning({ id: sema.rapor.id });
      await tx.insert(sema.raporBolumuSurumu).values([
        {
          kurumId: a.kurumId,
          raporId: r?.id as string,
          bolumKodu: "P.2",
          metin: "Paydaş katılımı [EKSİK: kurum düzeyinde kanıt yok].",
          denetimSonucu: { eksik: true },
        },
        {
          kurumId: a.kurumId,
          raporId: r?.id as string,
          bolumKodu: "Z.9",
          metin: "[EKSİK: çerçevede olmayan kod].",
          denetimSonucu: { eksik: true },
        },
      ]);
    });
    const d = await saha.hazirla(await o.baglam(a, a.yonetici), GIRDI());
    const k = d.sorular.filter((s) => s.kaynak === "eksik" && s.eksikCumle?.includes("kurum düzeyinde"));
    expect(k.map((s) => s.olcutKod)).toEqual(["P.2"]);
    expect(d.sorular.some((s) => s.olcutKod === "Z.9")).toBe(false);
  });

  it("listede olmayan soru ve başka kurum reddedilir", async () => {
    const y = await o.baglam(a, a.yonetici);
    await expect(
      saha.provaIsaretle(y, { ...GIRDI(), soruId: "0".repeat(16), rol: "komisyon", durum: "hazirim" }),
    ).rejects.toMatchObject({ kod: "gecersiz_istek" });
    const bb = await o.baglam(o.b, o.b.yonetici);
    await expect(saha.hazirla(bb, GIRDI())).rejects.toMatchObject({ kod: "bulunamadi" });
  });
});
