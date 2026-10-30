// İP-20: kurgu kurumla uçtan uca KİDR taslağı; olgunluk önerilerinin politikaya bağlanamadığı; eylem izleme.
// Bütün ad ve numaralar uydurmadır.

import { metinCikar } from "@akredit/belge";
import { AKREDIT_ONLISANS_IC, DOGRULANMADI, tumOlcutler, YOKAK_KURUMSAL_2020 } from "@akredit/cerceveler";
import { kiraciIslemi, sema } from "@akredit/vt";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type Ornek, ortam, SIMDI } from "../../test/yardimci.ts";
import { ServisHatasi } from "../hata.ts";
import { politikalariUygula } from "../onay/motor.ts";
import { kararVer, topluKararVer } from "../oneri.ts";
import { politikaTaslagiOlustur } from "../politika.ts";
import { rapor } from "../rapor.ts";
import {
  altOlcutler,
  bidrBolumleri,
  bidrDerle,
  eylemeKanitBagla,
  eylemIzleme,
  gelismeyeAcikYonleriAktar,
  gonderimOnerisiAc,
  izlemeDurumu,
  type KanitKaydi,
  KIDR_CERCEVESI,
  kapsamSayilari,
  kararDuzeyi,
  kidrBolumleri,
  kidrDerle,
  olgunlukDurumu,
  olgunlukOnerileriAc,
  olgunlukOnerisiKur,
  raporuDisaAktar,
} from "./index.ts";

const OZET1 = "1".repeat(64);
const OZET2 = "2".repeat(64);
const K = (id: string, ozet: string, kodlar: string[], birimId: string | null): KanitKaydi => ({
  id,
  ozet,
  baslik: `Kanıt ${id}`,
  olcutKodlari: kodlar,
  birimId,
});

describe("derleme (saf)", () => {
  // Rapor şablonu A–E; YÖKAK 2020 listesinde yaprak alt ölçüt sayısı: A 11, B 22, C 12, D 4, E 9 = 58.
  it("alt ölçütler şablon sırasıyla yapraklardır", () => {
    const a = altOlcutler(KIDR_CERCEVESI);
    expect(a).toHaveLength(58);
    expect(a[0]?.olcut.kod).toBe("A.1.1");
    expect(a.every((x) => x.olcut.altOlcutler.length === 0)).toBe(true);
  });
  it("BİDR: yalnız birimin kanıtı atıflı, diğerleri EKSİK", () => {
    const b = bidrBolumleri(KIDR_CERCEVESI, { id: "b1", ad: "Deneme MYO" }, [
      K("k1", OZET1, ["B.1.3"], "b1"),
      K("k2", OZET2, ["B.1.3"], "b2"),
    ]);
    const b13 = b.find((x) => x.kod === "B.1.3");
    expect(b13?.metin).toBe("Kayıtlı kanıt: Kanıt k1 [K:11111111]");
    expect(b13?.kanitIdleri).toEqual(["k1"]);
    expect(b.find((x) => x.kod === "A.1.1")?.metin).toMatch(/^\[EKSİK: Deneme MYO/u);
    // 58 alt ölçütten biri kanıtlı → 57 eksik.
    expect(kapsamSayilari(b)).toEqual({ altOlcutSayisi: 58, kanitliAltOlcut: 1, eksikAltOlcut: 57, kanitSayisi: 1 });
  });
  it("KİDR: kurum kanıtı + BİDR metni + BİDR'siz birim EKSİK", () => {
    const k = kidrBolumleri(
      KIDR_CERCEVESI,
      "Deneme Üniversitesi",
      [K("k0", OZET2, ["B.1.3"], null)],
      [
        { id: "b1", ad: "Alfa MYO" },
        { id: "b2", ad: "Beta MYO" },
      ],
      [
        {
          raporId: "r1",
          birimId: "b1",
          birimAdi: "Alfa MYO",
          bolumler: [{ kod: "B.1.3", metin: "X [K:11111111]", kanitIdleri: ["k1"] }],
        },
      ],
    );
    const b13 = k.find((x) => x.kod === "B.1.3");
    expect(b13?.metin.split("\n\n")).toEqual([
      "Kurum düzeyi (Deneme Üniversitesi):",
      "Kayıtlı kanıt: Kanıt k0 [K:22222222]",
      "Alfa MYO:",
      "X [K:11111111]",
      "Beta MYO:",
      "[EKSİK: Beta MYO için birim iç değerlendirme raporu derlenmedi.]",
    ]);
    expect(b13?.kanitIdleri.sort()).toEqual(["k0", "k1"]);
    expect(b13?.eksik).toBe(false);
  });
  it("KİDR: BİDR metnindeki kaynaksız sayı aktarılmaz (dalga 3 #5)", () => {
    // BİDR bölümü insan düzeltmesiyle değişmiş olabilir; ÖDR'deki sayı denetimi KİDR'de de uygulanır.
    const kanitlar = [
      { ...K("k0", OZET2, ["B.1.3"], null), baslik: "2025 Danışma Kurulu Tutanağı" },
      K("k1", OZET1, ["B.1.3"], "b1"),
    ];
    const k = kidrBolumleri(
      KIDR_CERCEVESI,
      "Deneme Üniversitesi",
      kanitlar,
      [{ id: "b1", ad: "Alfa MYO" }],
      [
        {
          raporId: "r1",
          birimId: "b1",
          birimAdi: "Alfa MYO",
          bolumler: [
            {
              kod: "B.1.3",
              metin:
                "Kayıtlı kanıt: Kanıt k1 [K:11111111]\n\nÖğrencilerin %92'si memnun [K:11111111]. Kurul toplandı [K:11111111].",
              kanitIdleri: ["k1"],
            },
          ],
        },
      ],
    );
    const parcalar = k.find((x) => x.kod === "B.1.3")?.metin.split("\n\n");
    expect(parcalar).toEqual([
      "Kurum düzeyi (Deneme Üniversitesi):",
      "Kayıtlı kanıt: 2025 Danışma Kurulu Tutanağı [K:22222222]",
      "Alfa MYO:",
      "Kayıtlı kanıt: Kanıt k1 [K:11111111]",
      "[EKSİK: Kaynağı gösterilmeyen sayı içeren bir cümle KİDR'ye alınmadı.] Kurul toplandı [K:11111111].",
    ]);
  });
  it("olgunluk: rubrik DOĞRULANMADI ise aday olsa da düzey önerilmez", () => {
    const id = "01900000-0000-7000-8000-000000000001";
    const o = olgunlukOnerisiKur({
      raporId: "r",
      bolum: { kod: "B.1.3", baslik: "x", kanitIdleri: [id] },
      rubrik: YOKAK_KURUMSAL_2020.olgunlukDuzeyleri,
      aday: { olcutKod: "B.1.3", duzey: 4, gerekce: "g", kanitIdleri: [id] },
    });
    expect(o.icerik.onerilenDuzey).toBeNull();
    expect(o.icerik.rubrikDogrulandi).toBe(false);
    expect(o.icerik.eksikler[0]).toContain(DOGRULANMADI);
  });
  it("olgunluk: doğrulanmış rubrikte aday yalnız bölümün kanıtıyla kabul edilir", () => {
    const id = "01900000-0000-7000-8000-000000000001";
    const yabanci = "01900000-0000-7000-8000-000000000002";
    const g = {
      raporId: "r",
      bolum: { kod: "B.1.3", baslik: "x", kanitIdleri: [id] },
      rubrik: AKREDIT_ONLISANS_IC.olgunlukDuzeyleri,
    };
    expect(
      olgunlukOnerisiKur({ ...g, aday: { olcutKod: "B.1.3", duzey: 3, gerekce: "Uygulanıyor.", kanitIdleri: [id] } })
        .icerik.onerilenDuzey,
    ).toBe(3);
    const r = olgunlukOnerisiKur({ ...g, aday: { olcutKod: "B.1.3", duzey: 3, gerekce: "g", kanitIdleri: [yabanci] } });
    expect(r.icerik.onerilenDuzey).toBeNull();
    expect(r.atiflar).toEqual([{ kanitId: id }]);
  });
  it("karar düzeyi yalnız komisyon kararından", () => {
    expect(kararDuzeyi({ onerilenDuzey: null }, null)).toBeNull();
    expect(kararDuzeyi({ onerilenDuzey: 3 }, { sonuc: "onaylandi" })).toBe(3);
    expect(kararDuzeyi({ onerilenDuzey: 3 }, { sonuc: "duzeltildi", duzeltmeMetni: "Düzey: 2\nGerekçe." })).toBe(2);
    expect(kararDuzeyi({ onerilenDuzey: 3 }, { sonuc: "duzeltildi", duzeltmeMetni: "belirsiz" })).toBeNull();
    expect(kararDuzeyi({ onerilenDuzey: 3 }, { sonuc: "reddedildi" })).toBeNull();
  });
  it("izleme durumu", () => {
    expect(izlemeDurumu({ kanitIdleri: ["k"], hedefTarih: null }, SIMDI)).toBe("kanitli");
    expect(izlemeDurumu({ kanitIdleri: [], hedefTarih: new Date("2026-01-01") }, SIMDI)).toBe("gecikti");
    expect(izlemeDurumu({ kanitIdleri: [], hedefTarih: null }, SIMDI)).toBe("kanitsiz");
  });
});

let o: Awaited<ReturnType<typeof ortam>>;
let a: Ornek;
let ikinciBirim: string;
let disRaporKanit: string;
let izlemeKanit: string;

beforeAll(async () => {
  o = await ortam();
  a = o.a;
  // Ortak çerçeve tabloları sahip bağlantısıyla yazılır (İP-11 verisi, DOĞRULANMADI metinlerle).
  const [c] = await o.db
    .insert(sema.cerceve)
    .values({ kod: "yokak-kurumsal", ad: YOKAK_KURUMSAL_2020.ad, surum: "2020" })
    .returning();
  const olcutId = new Map<string, string>();
  for (const [i, x] of tumOlcutler(YOKAK_KURUMSAL_2020.olcutler).entries()) {
    const ust = x.kod.includes(".") ? olcutId.get(x.kod.slice(0, x.kod.lastIndexOf("."))) : undefined;
    const [r] = await o.db
      .insert(sema.olcut)
      .values({ cerceveId: c?.id as string, kod: x.kod, baslik: x.baslik, sira: i, ustOlcutId: ust ?? null })
      .returning();
    olcutId.set(x.kod, r?.id as string);
  }
  await kiraciIslemi(o.db, a.kurumId, async (tx) => {
    const [b2] = await tx
      .insert(sema.birim)
      .values({ kurumId: a.kurumId, tur: "fakulte", ad: "Deneme Fakültesi" })
      .returning();
    ikinciBirim = b2?.id as string;
    const kanit = async (n: string, ad: string) =>
      (
        await tx
          .insert(sema.kanit)
          .values({
            kurumId: a.kurumId,
            ozet: n.repeat(64),
            dosyaAdi: ad,
            mime: "application/pdf",
            boyut: 10,
            depoAnahtari: `x/${n}`,
            kaynakTuru: "yukleme",
          })
          .returning()
      )[0]?.id as string;
    disRaporKanit = await kanit("d", "dis-degerlendirme-raporu.pdf");
    izlemeKanit = await kanit("e", "iyilestirme-tutanagi.pdf");
    // Onaylı kanıt–ölçüt bağları: ders izlencesi (birim) → B.1.3, kalite politikası (kurum) → A.1.2.
    const bag = async (kanitId: string, kod: string) => {
      const [on] = await tx
        .insert(sema.oneri)
        .values({
          kurumId: a.kurumId,
          tur: "kanit_etiketi",
          hedefTuru: "kanit",
          hedefId: kanitId,
          icerik: { kod },
          gerekce: "g",
          ureticiTuru: "kural",
          uretici: {},
          risk: "dusuk",
        })
        .returning();
      const [k] = await tx
        .insert(sema.karar)
        .values({
          kurumId: a.kurumId,
          oneriId: on?.id as string,
          sonuc: "onaylandi",
          kararVerenKisiId: a.yonetici,
          dayanak: "dogrudan",
        })
        .returning();
      await tx
        .insert(sema.kanitOlcutBaglantisi)
        .values({ kurumId: a.kurumId, kanitId, olcutId: olcutId.get(kod) as string, kararId: k?.id as string });
    };
    await bag(a.kanitDers, "B.1.3");
    await bag(a.kanitKurum, "A.1.2");
  });
}, 60_000);
afterAll(async () => {
  await o.kapat();
});

describe("uçtan uca KİDR taslağı (kurgu kurum)", () => {
  let kidrId: string;
  let oneriler: string[];

  it("BİDR → KİDR derlenir; atıflar kanıta çözülür, kanıtsız alt ölçüt EKSİK", async () => {
    const yon = await o.baglam(a, a.yonetici);
    const bidr = await bidrDerle(yon, { birimId: a.birimId, donemId: a.donemId });
    expect(bidr).toMatchObject({ altOlcutSayisi: 58, kanitliAltOlcut: 1, eksikAltOlcut: 57, kanitSayisi: 1 });
    const kidr = await kidrDerle(yon, {});
    kidrId = kidr.raporId;
    // B.1.3 (birim kanıtı) ve A.1.2 (kurum kanıtı) kanıtlı → 2 / 58.
    expect(kidr).toMatchObject({ kanitliAltOlcut: 2, eksikAltOlcut: 56, kanitSayisi: 2 });
    const g = await rapor(yon, kidrId);
    expect(g.ad).toContain("Kurum İç Değerlendirme Raporu");
    const b13 = g.bolumler.find((x) => x.olcut === "B.1.3");
    const atifli = b13?.paragraflar.find((p) => p.atiflar.length);
    expect(atifli?.atiflar[0]?.kanitId).toBe(a.kanitDers);
    expect(
      b13?.paragraflar.some((p) => p.metin.includes("Deneme Fakültesi için birim iç değerlendirme raporu derlenmedi")),
    ).toBe(true);
    const a11 = g.bolumler.find((x) => x.olcut === "A.1.1");
    expect(a11?.paragraflar.every((p) => p.eksik)).toBe(true);
    // Bölüm VT ölçüt satırına bağlı.
    expect(b13?.baslik).toBe("Ders kazanımlarının program çıktıları ile eşleştirilmesi");
    expect(ikinciBirim).toBeTruthy();
  });

  it("başka kurum KİDR'yi göremez; gözlemci derleyemez", async () => {
    const bk = await o.baglam(o.b, o.b.yonetici);
    await expect(rapor(bk, kidrId)).rejects.toMatchObject({ kod: "bulunamadi" });
    await expect(kidrDerle(await o.baglam(a, a.gozlemci), {})).rejects.toMatchObject({ kod: "yetki_yok" });
  });

  it("olgunluk önerileri yüksek riskli açılır; rubrik DOĞRULANMADI olduğundan düzey önerilmez", async () => {
    const yon = await o.baglam(a, a.yonetici);
    const r = await olgunlukOnerileriAc(yon, {
      raporId: kidrId,
      adaylar: [{ olcutKod: "B.1.3", duzey: 5, gerekce: "Model adayı.", kanitIdleri: [a.kanitDers] }, { bozuk: true }],
    });
    oneriler = r.oneriIdleri;
    expect(oneriler).toHaveLength(58);
    expect(r.atlananAday).toBe(1);
    // İkinci çağrı aynı ölçüte yeni öneri açmaz.
    expect((await olgunlukOnerileriAc(yon, { raporId: kidrId })).oneriIdleri).toHaveLength(0);
    const satir = await kiraciIslemi(o.db, a.kurumId, (tx) =>
      tx.select().from(sema.oneri).where(eq(sema.oneri.tur, "olgunluk_duzeyi")),
    );
    const bunlar = satir.filter((s) => oneriler.includes(s.id));
    expect(bunlar.every((s) => s.risk === "yuksek")).toBe(true);
    expect(bunlar.every((s) => (s.icerik as { onerilenDuzey: unknown }).onerilenDuzey === null)).toBe(true);
  });

  describe("olgunluk önerileri politikaya bağlanamaz", () => {
    it("politika taslağı olgunluk türünü kabul etmez", async () => {
      const yon = await o.baglam(a, a.yonetici);
      await expect(
        politikaTaslagiOlustur(yon, {
          ad: "Olgunluk otomatik",
          oneriTurleri: ["olgunluk_duzeyi"],
          enYuksekRisk: "orta",
          enDusukGuven: 0,
        }),
      ).rejects.toThrow();
    });
    it("VT olgunluk türlü politikayı reddeder", async () => {
      await expect(
        kiraciIslemi(o.db, a.kurumId, (tx) =>
          tx.insert(sema.yetkiPolitikasi).values({
            kurumId: a.kurumId,
            ad: "Doğrudan ekleme",
            oneriTurleri: ["olgunluk_duzeyi"],
            enYuksekRisk: "orta",
            enDusukGuven: 0,
            imzalayanKisiId: a.yonetici,
            baslangic: SIMDI,
          }),
        ),
      ).rejects.toThrow();
    });
    it("geçerli bir politikayla bile VT olgunluk önerisine politika kararı yazdırmaz; motor karar vermez", async () => {
      const [p] = await kiraciIslemi(o.db, a.kurumId, (tx) =>
        tx
          .insert(sema.yetkiPolitikasi)
          .values({
            kurumId: a.kurumId,
            ad: "Etiket",
            oneriTurleri: ["kanit_etiketi"],
            enYuksekRisk: "orta",
            enDusukGuven: 0,
            imzalayanKisiId: a.yonetici,
            baslangic: new Date("2026-01-01"),
          })
          .returning(),
      );
      await expect(
        kiraciIslemi(o.db, a.kurumId, (tx) =>
          tx.insert(sema.karar).values({
            kurumId: a.kurumId,
            oneriId: oneriler[0] as string,
            sonuc: "onaylandi",
            kararVerenKisiId: a.yonetici,
            dayanak: "politika",
            politikaId: p?.id as string,
          }),
        ),
      ).rejects.toThrow();
      const m = await politikalariUygula(o.db, a.kurumId, SIMDI, oneriler);
      expect(m.kararlar).toHaveLength(0);
      expect(m.bekleyen).toBe(58);
    });
    it("toplu onay ve API anahtarıyla karar reddedilir", async () => {
      const yon = await o.baglam(a, a.yonetici);
      await expect(topluKararVer(yon, { oneriIdleri: oneriler.slice(0, 2) })).rejects.toMatchObject({
        kod: "kural_ihlali",
      });
      const api = await o.baglam(a, a.yonetici, "anahtar", null);
      await expect(kararVer(api, { oneriId: oneriler[0], sonuc: "onaylandi" })).rejects.toBeInstanceOf(ServisHatasi);
      const d = await olgunlukDurumu(yon, kidrId);
      expect(d.every((x) => x.karar === "bekliyor" && x.kesinDuzey === null)).toBe(true);
    });
  });

  it("komisyon tek tek karar verir; kesin düzey karardan gelir", async () => {
    const yon = await o.baglam(a, a.yonetici);
    const d0 = await olgunlukDurumu(yon, kidrId);
    const b13 = d0.find((x) => x.olcutKod === "B.1.3");
    await kararVer(yon, { oneriId: b13?.oneriId, sonuc: "duzeltildi", duzeltme: "Düzey: 3\nKomisyon gerekçesi." });
    const d = await olgunlukDurumu(yon, kidrId);
    expect(d.find((x) => x.olcutKod === "B.1.3")).toMatchObject({
      karar: "duzeltildi",
      kesinDuzey: 3,
      kararVerenKisiId: a.yonetici,
    });
    const [k] = await kiraciIslemi(o.db, a.kurumId, (tx) =>
      tx
        .select()
        .from(sema.karar)
        .where(eq(sema.karar.oneriId, b13?.oneriId as string)),
    );
    expect(k?.dayanak).toBe("dogrudan");
  });

  it("gelişmeye açık yön → eylem → izleme kanıtı", async () => {
    const yon = await o.baglam(a, a.yonetici);
    const { eylemIdleri } = await gelismeyeAcikYonleriAktar(yon, {
      kaynakKanitId: disRaporKanit,
      yonler: [
        { metin: "Deneme gelişmeye açık yön 1.", olcutKod: "B.1.3", hedefTarih: "2027-06-30" },
        { metin: "Deneme gelişmeye açık yön 2.", hedefTarih: "2026-09-01" },
      ],
    });
    expect(eylemIdleri).toHaveLength(2);
    await eylemeKanitBagla(yon, { eylemId: eylemIdleri[0], kanitId: izlemeKanit });
    const iz = await eylemIzleme(yon);
    expect(iz.map((e) => [e.durum, e.pukoAsamasi])).toEqual([
      ["kanitli", "kontrol_et"],
      ["gecikti", "planla"],
    ]);
    await expect(
      gelismeyeAcikYonleriAktar(yon, { kaynakKanitId: a.dersId, yonler: [{ metin: "x" }] }),
    ).rejects.toMatchObject({ kod: "gecersiz_istek" });
  });

  it("DOCX dışa aktarım ve aktarım planı; son gönderim insan kararı", async () => {
    const yon = await o.baglam(a, a.yonetici);
    const d = await raporuDisaAktar(yon, kidrId);
    expect(d.ozet).toMatch(/^[0-9a-f]{64}$/u);
    const metin = JSON.stringify(
      await metinCikar(new Uint8Array(Buffer.from(d.icerikBase64, "base64")), { ad: d.dosyaAdi }),
    );
    // Şablon sırası: A.1.1, A.1.2 … (bölümler ölçüt sırasıyla).
    expect(metin.indexOf("A.1.1 Misyon")).toBeLessThan(metin.indexOf("A.1.2 Kalite"));
    expect(metin).toContain("Olgunluk düzeyi (komisyon kararı): 3");
    expect(metin).toContain("Deneme gelişmeye açık yön 1.");
    expect(metin).toContain(DOGRULANMADI);
    // Aynı kayıtlardan aynı içerik (DOCX paketinin zaman damgası değişebilir, metin değişmez).
    const ikinci = await raporuDisaAktar(yon, kidrId);
    const oku = async (b64: string) =>
      (await metinCikar(new Uint8Array(Buffer.from(b64, "base64")), { ad: d.dosyaAdi })).bolumler;
    expect(await oku(ikinci.icerikBase64)).toEqual(await oku(d.icerikBase64));
    const son = d.plan.at(-1);
    expect(son).toMatchObject({ kim: "insan", hazir: false });
    expect(d.plan.find((p) => p.adim.startsWith("Olgunluk"))?.hazir).toBe(false);
    const { oneriId } = await gonderimOnerisiAc(yon, kidrId);
    const [g] = await kiraciIslemi(o.db, a.kurumId, (tx) =>
      tx.select().from(sema.oneri).where(eq(sema.oneri.id, oneriId)),
    );
    expect(g).toMatchObject({ tur: "dis_gonderim", risk: "yuksek" });
    const gunluk = await o.db.execute(sql`select count(*)::int as n from gunluk where eylem like 'rapor.%'`);
    expect(((gunluk as unknown as { rows: { n: number }[] }).rows[0] as { n: number }).n).toBeGreaterThan(0);
  });
});
