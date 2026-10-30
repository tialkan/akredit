// İP-43 uçtan uca: yükleme (kanıt hattı, SHA-256) → okuma (sahte yerel model sunucusu, openai-uyumlu uç) →
// onay kuyruğu (Katman 2) → kişi kararı → ölçme aracına aktarım → ÇK sağlanması (@akredit/olcme).
// Kâğıtlar `test/fixtures/kagitlar.json` içindeki sentetik örneklerdir; ad ve numaralar uydurmadır.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { bellekDepo } from "@akredit/depo";
import { aktorYukle, type ServisBaglami, ServisHatasi, sinavTarama } from "@akredit/servis";
import { gocleriUygula, kiraciIslemi, pgliteBaglantisi, sema, type Vt, zinciriDogrula } from "@akredit/vt";
import { and, eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { kanitAl } from "../kanit-hatti/alma.ts";
import { bellekKuyrugu } from "../kanit-hatti/kuyruk.ts";
import { pdfOlustur } from "../kanit-hatti/test/pdf-yardimci.ts";
import { birlesikKaynak, pdfTaramaKaynagi, sinavTaramasiIsi, taramaKaynagiKur } from "./index.ts";

const KURUM = "01900000-0000-7000-8000-0000000000c3";
const SIMDI = new Date("2026-10-30T09:00:00Z");
const ANAHTAR = "deneme-anahtari-yalniz-test-icin-0123456789";
const YEREL = { hazir: "ollama", adres: "http://model:11434/v1", model: "ornek-okuyucu" } as const;
const NUMARALAR = ["2099000101", "2099000102", "2099000103", "2099000104"];

interface Ornek {
  sablon: unknown;
  sayfalar: { metin: string; bolgeler: Record<string, string> }[];
}
const ORNEK = JSON.parse(readFileSync(new URL("./test/fixtures/kagitlar.json", import.meta.url), "utf8")) as Ornek;

/** Kayıtlı örnekten kaynak: kutu metni, kutunun şablondaki adıyla bulunur; numara kutusunda kırpıntı da döner. */
function ornekKaynak(o: Ornek): sinavTarama.TaramaKaynagi {
  return {
    sayfaSayisi: o.sayfalar.length,
    sayfaMetni: async (i) => o.sayfalar[i]?.metin ?? "",
    bolge: async (i, _k, ad) => {
      const metin = o.sayfalar[i]?.bolgeler[ad] ?? "";
      return ad === sinavTarama.NUMARA_ALANI
        ? { metin, kirpinti: new TextEncoder().encode(`kirpinti-${i}`) }
        : { metin };
    },
  };
}

/**
 * Sahte yerel model sunucusu (OpenAI uyumlu `/chat/completions`). Kutu metnindeki sayıyı okur; "?" varsa
 * güveni düşük verir. Toplama ya da hesap yapmaz. Bütün istekler kaydedilir.
 */
function sahteYerelSunucu() {
  const istekler: { adres: string; govde: string }[] = [];
  const fetch = async (adres: string, ayar: RequestInit) => {
    const govde = String(ayar.body);
    istekler.push({ adres, govde });
    const j = JSON.parse(govde) as { messages: { role: string; content: string }[] };
    const kullanici = j.messages.find((m) => m.role === "user")?.content ?? "";
    const kutu = kullanici.match(/«(.*)»/u)?.[1] ?? "";
    const sayi = kutu.match(/\d+(?:[.,]\d+)?/u)?.[0];
    const yanit = sayi
      ? { deger: Number(sayi.replace(",", ".")), guven: kutu.includes("?") ? 0.6 : 0.97 }
      : { deger: null, guven: 0.2 };
    return new Response(
      JSON.stringify({ choices: [{ message: { content: JSON.stringify(yanit) }, finish_reason: "stop" }] }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };
  return { fetch, istekler };
}

let db: Vt;
let kapat: () => Promise<void>;
let hoca: string;
let aracId: string;
const ilk = <T>(x: T[]): T => {
  const d = x[0];
  if (!d) throw new Error("ekleme başarısız");
  return d;
};

beforeAll(async () => {
  const b = await pgliteBaglantisi();
  db = b.db;
  kapat = b.kapat;
  await gocleriUygula(db);
  await db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.kurum_id', ${KURUM}, true)`);
    await tx.insert(sema.kurum).values({
      id: KURUM,
      ad: "Uydurma Tarama Üniversitesi",
      // Kurum yurt dışı iznini açmış ve bir OpenRouter anahtarı kaydetmiş olsa bile tarama bunları kullanmaz.
      ayarlar: { yz: { yurtDisiIzin: true }, yzAnahtar: { saglayici: "openrouter", sifreli: "x", model: "m" } },
    });
    const birim = ilk(
      await tx.insert(sema.birim).values({ kurumId: KURUM, tur: "myo", ad: "Uydurma MYO" }).returning(),
    );
    const program = ilk(
      await tx
        .insert(sema.program)
        .values({ kurumId: KURUM, birimId: birim.id, ad: "Uydurma Programı", duzey: "onlisans" })
        .returning(),
    );
    const ders = ilk(
      await tx
        .insert(sema.ders)
        .values({ kurumId: KURUM, programId: program.id, kod: "UYD101", ad: "Uydurma Ders", akts: 5, yariyil: 1 })
        .returning(),
    );
    hoca = ilk(await tx.insert(sema.kisi).values({ kurumId: KURUM, adSoyad: "Deneme Hoca" }).returning()).id;
    await tx.insert(sema.rolAtamasi).values({
      kurumId: KURUM,
      kisiId: hoca,
      rol: "ogretim_elemani",
      kapsamTuru: "ders",
      kapsamId: ders.id,
      baslangic: new Date("2026-01-01T00:00:00Z"),
    });
    const donem = ilk(
      await tx
        .insert(sema.donem)
        .values({ kurumId: KURUM, ad: "2026-2027 Güz", baslangic: "2026-09-01", bitis: "2027-01-31" })
        .returning(),
    );
    const acilis = ilk(
      await tx.insert(sema.dersAcilisi).values({ kurumId: KURUM, dersId: ders.id, donemId: donem.id }).returning(),
    );
    const ck = async (kod: string) =>
      ilk(
        await tx
          .insert(sema.cikti)
          .values({ kurumId: KURUM, tur: "ders", sahipId: ders.id, kod, metin: `${kod} metni.` })
          .returning(),
      ).id;
    const ck1 = await ck("ÖÇ1");
    const ck2 = await ck("ÖÇ2");
    aracId = ilk(
      await tx
        .insert(sema.olcmeAraci)
        .values({ kurumId: KURUM, dersAcilisiId: acilis.id, tur: "ara_sinav", ad: "Vize", agirlik: "40" })
        .returning(),
    ).id;
    // Onaylı soru-çıktı eşlemesi: S1, S2 → ÖÇ1; S3 → ÖÇ2.
    await tx.insert(sema.soru).values([
      {
        kurumId: KURUM,
        olcmeAraciId: aracId,
        numara: "1",
        tamPuan: "10",
        ciktiEslemesi: [{ ciktiId: ck1, agirlik: 1 }],
      },
      {
        kurumId: KURUM,
        olcmeAraciId: aracId,
        numara: "2",
        tamPuan: "10",
        ciktiEslemesi: [{ ciktiId: ck1, agirlik: 1 }],
      },
      {
        kurumId: KURUM,
        olcmeAraciId: aracId,
        numara: "3",
        tamPuan: "20",
        ciktiEslemesi: [{ ciktiId: ck2, agirlik: 1 }],
      },
    ]);
  });
}, 120_000);

afterAll(async () => {
  await kapat?.();
});

async function baglam(): Promise<ServisBaglami> {
  return { db, aktor: await aktorYukle(db, KURUM, hoca), simdi: () => SIMDI };
}

async function yukle(depo: ReturnType<typeof bellekDepo>, kuyruk = bellekKuyrugu(), amac = "sinav_taramasi", ek = "") {
  const veri = pdfOlustur(ORNEK.sayfalar.map((_, i) => ["AKREDIT SINAV KAPAK", `Vize kagidi ${i + 1} ${amac} ${ek}`]));
  const r = await kanitAl(
    { db, depo, kuyruk },
    {
      kaynakAyrinti: { amac },
      kurumId: KURUM,
      dosyaAdi: "vize-taramasi.pdf",
      mime: "application/pdf",
      kaynakTuru: "yukleme",
      veri,
      yukleyenKisiId: hoca,
    },
  );
  if (r.durum === "reddedildi") throw new Error(r.ileti);
  return { ...r, veri };
}

async function taramaSayisi() {
  return kiraciIslemi(db, KURUM, async (tx) => (await tx.select().from(sema.sinavTaramasi)).length);
}

describe("yerel model yokken iş başlamaz, yurt dışına yol yok", () => {
  it("yerel model tanımlı değilse kanıt okunmaz, modele istek gitmez, kayıt yazılmaz (kurumun yurt dışı izni açık olsa bile)", async () => {
    const depo = bellekDepo();
    const k = await yukle(depo);
    const s = sahteYerelSunucu();
    let kaynakIstendi = false;
    const is = { kurumId: KURUM, kisiId: hoca, kanitId: k.kanitId, olcmeAraciId: aracId };
    const once = await taramaSayisi();
    for (const yerelModel of [
      null,
      { hazir: "ollama", adres: "https://openrouter.ai/api/v1", model: "m" },
      { hazir: "openrouter", adres: "http://model:11434/v1", model: "m" },
      { hazir: "evren", adres: "http://model:11434/v1", model: "m" },
      { hazir: "vllm", adres: "http://203.0.113.5:8000/v1", model: "m" },
    ]) {
      const p = sinavTaramasiIsi(
        {
          db,
          depo,
          yerelModel: yerelModel as never,
          takmaAdAnahtari: ANAHTAR,
          fetch: s.fetch,
          coz: async () => ["10.0.0.5"],
          kaynakKur: async () => {
            kaynakIstendi = true;
            return ornekKaynak(ORNEK);
          },
        },
        is,
      );
      await expect(p).rejects.toThrow(/kurum (içinde|ağının dışında)/u);
      await expect(p).rejects.toBeInstanceOf(ServisHatasi);
    }
    expect(kaynakIstendi).toBe(false);
    expect(s.istekler).toHaveLength(0);
    expect(await taramaSayisi()).toBe(once);
  });

  it("yurt içi olmayan sağlayıcı okuyucu olamaz", () => {
    const s = { ad: "openrouter", model: "m", yurtIci: false, sohbet: async () => ({ icerik: "", aracCagrilari: [] }) };
    expect(() => sinavTarama.okuyucuKur(s)).toThrow(/kurum ağının dışında/u);
  });
});

describe("inceleme: dolaylı yollar ve uydurma sayı", () => {
  it("tarama dosyası kanıt hattının metin/YZ kuyruğuna girmez; hattan geçmiş dosya taranmaz", async () => {
    const depo = bellekDepo();
    const kuyruk = bellekKuyrugu();
    const gonderilen: string[] = [];
    const asil = kuyruk.gonder.bind(kuyruk);
    kuyruk.gonder = async (ad, v, sec) => {
      gonderilen.push(ad);
      return asil(ad, v, sec);
    };
    const yeni = await yukle(depo, kuyruk, "sinav_taramasi", "kuyruk");
    expect(yeni.durum).toBe("eklendi");
    // Açık numaralı kâğıt metni kanit_parcasi'na yazılmamalı ve kurumun sağlayıcısına gitmemeli.
    expect(gonderilen).toEqual([]);

    // Sıradan kanıt olarak yüklenmiş (hattan geçmiş) dosya taramaya sokulamaz.
    const sirali = await yukle(depo, bellekKuyrugu(), "genel");
    const s = sahteYerelSunucu();
    await expect(
      sinavTaramasiIsi(
        {
          db,
          depo,
          yerelModel: YEREL,
          takmaAdAnahtari: ANAHTAR,
          fetch: s.fetch,
          coz: async () => ["10.0.0.5"],
          kaynakKur: async () => ornekKaynak(ORNEK),
        },
        { kurumId: KURUM, kisiId: hoca, kanitId: sirali.kanitId, olcmeAraciId: aracId },
      ),
    ).rejects.toThrow(/sınav taraması için yüklenmemiş/u);
    expect(s.istekler).toHaveLength(0);
  });

  it("modelin kutu metninde olmayan sayısı (güven 1 olsa da) otomatik puana girmez", async () => {
    const depo = bellekDepo();
    const b = await baglam();
    await sinavTarama.sablonKaydet(b, { olcmeAraciId: aracId, sablon: ORNEK.sablon });
    const k2 = await yukle(depo, bellekKuyrugu(), "sinav_taramasi", "uydurma");
    // Uyduran model: kutuda ne yazarsa yazsın 1 ve güven 1 döner.
    const fetch = async () =>
      new Response(
        JSON.stringify({ choices: [{ message: { content: '{"deger":1,"guven":1}' }, finish_reason: "stop" }] }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    const sonuc = await sinavTaramasiIsi(
      {
        db,
        depo,
        yerelModel: YEREL,
        takmaAdAnahtari: ANAHTAR,
        fetch,
        coz: async () => ["10.0.0.5"],
        simdi: () => SIMDI,
        kaynakKur: async () => ornekKaynak(ORNEK),
      },
      { kurumId: KURUM, kisiId: hoca, kanitId: k2.kanitId, olcmeAraciId: aracId },
    );
    const g = await sinavTarama.taramaGorunumu(b, sonuc.taramaId);
    const puanli = g.hucreler.filter((h) => h.alan !== "*numara");
    // Örnek kâğıtlarda hiçbir puan kutusunda yalnız "1" yazmıyor: 4 kâğıt × 4 puan kutusu onaya düşmeli.
    expect(puanli).toHaveLength(16);
    for (const h of puanli) expect(h.nedenler).toContain("metinde_yok");
  });
});

describe("uçtan uca", () => {
  it("yükleme → okuma → kuyruk → onay → aktarım → ölçme; numara hiçbir yerde açık değil, günlük sağlam", async () => {
    const depo = bellekDepo();
    const b = await baglam();
    await sinavTarama.sablonKaydet(b, { olcmeAraciId: aracId, sablon: ORNEK.sablon });

    // Yükleme: kanıt hattı içerik özetiyle saklar; iş kanıtı depodan okur.
    const k = await yukle(depo);
    const ozet = createHash("sha256").update(k.veri).digest("hex");
    expect(k.ozet).toBe(ozet);
    const s = sahteYerelSunucu();
    let okunanOzet = "";
    const sonuc = await sinavTaramasiIsi(
      {
        db,
        depo,
        yerelModel: YEREL,
        takmaAdAnahtari: ANAHTAR,
        fetch: s.fetch,
        coz: async () => ["10.0.0.5"],
        simdi: () => SIMDI,
        kaynakKur: async (veri) => {
          okunanOzet = createHash("sha256").update(veri).digest("hex");
          return ornekKaynak(ORNEK);
        },
      },
      { kurumId: KURUM, kisiId: hoca, kanitId: k.kanitId, olcmeAraciId: aracId },
    );
    expect(okunanOzet).toBe(ozet);
    // 4 kâğıt × 5 hücre (numara, S1-S3, toplam) = 20.
    // K1 hepsi tutuyor (5 otomatik). K2: S1 "9?" düşük güven, 9+6+12=27 ≠ 28 → S1-S3 ve toplam onaya (4), numara otomatik.
    // K3: S1 12 > azami 10 → onaya (1). K4: numara okunamadı → onaya (1). Otomatik 5+1+4+4 = 14, onay 6.
    expect(sonuc).toMatchObject({ kagitSayisi: 4, otomatik: 14, onayBekleyen: 6 });

    // Modele yalnız yerel uca istek gitti; numara kutusu hiç gönderilmedi (4 kâğıt × 4 puan kutusu = 16 istek).
    expect(s.istekler).toHaveLength(16);
    expect(new Set(s.istekler.map((x) => x.adres))).toEqual(new Set(["http://model:11434/v1/chat/completions"]));
    for (const x of s.istekler) for (const n of NUMARALAR) expect(x.govde).not.toContain(n);
    for (const x of s.istekler) expect(x.govde).not.toMatch(/\d{5}/u);

    const g = await sinavTarama.taramaGorunumu(b, sonuc.taramaId);
    expect(g.hucreler).toHaveLength(20);
    expect(g.kartlar).toHaveLength(6);
    for (const c of g.kartlar) expect(c.katman).toMatchObject({ katman: 2, devredilemez: true });
    const kart = (sira: number, alan: string) => {
      const c = g.kartlar.find((x) => x.kagitSira === sira && x.alan === alan);
      if (!c) throw new Error(`kart yok: ${sira}/${alan}`);
      return c;
    };
    expect(kart(2, "*toplam").katman.kural).toBe("K2-sinav-toplam-tutarsiz");
    expect(kart(2, "1").nedenler).toEqual(["dusuk_guven", "toplam_tutarsiz"]);
    expect(kart(3, "1").katman.kural).toBe("K2-sinav-azami-asimi");
    expect(kart(4, "*numara").nedenler).toEqual(["numara_okunamadi"]);
    expect(kart(4, "*numara").kirpintiOzeti).toMatch(/^[0-9a-f]{64}$/u);
    // Kırpıntı kanıt deposunda.
    expect(await depo.varMi(`${KURUM}/${kart(4, "*numara").kirpintiOzeti}`)).toBe(true);
    // Otomatik okunan hücre de görünür.
    expect(g.hucreler.filter((h) => h.katman.kural === "K0-otomatik-okundu")).toHaveLength(14);

    // Onaylar bitmeden aktarım yok.
    await expect(sinavTarama.puanlariAktar(b, sonuc.taramaId)).rejects.toThrow(/6 hücre/u);
    // Katman 2: toplu karar yok; azami puanı aşan puan onaylanamaz.
    await expect(
      sinavTarama.hucreKarari(b, { hucreId: kart(2, "2").hucreId, sonuc: "onaylandi", toplu: true }, ANAHTAR),
    ).rejects.toThrow(/toplu/u);
    await expect(
      sinavTarama.hucreKarari(b, { hucreId: kart(3, "1").hucreId, sonuc: "onaylandi" }, ANAHTAR),
    ).rejects.toThrow(/en çok 10/u);
    await expect(
      sinavTarama.hucreKarari(b, { hucreId: kart(4, "*numara").hucreId, sonuc: "onaylandi" }, ANAHTAR),
    ).rejects.toThrow(/numarasını yazın/u);
    // Otomatik hücreye karar verilemez.
    const oto = g.hucreler.find((h) => h.kagitSira === 1 && h.alan === "1");
    await expect(sinavTarama.hucreKarari(b, { hucreId: oto?.hucreId, sonuc: "onaylandi" }, ANAHTAR)).rejects.toThrow(
      /onay beklemiyor/u,
    );

    // Hoca kâğıda bakıp karar verir.
    await sinavTarama.hucreKarari(b, { hucreId: kart(2, "1").hucreId, sonuc: "duzeltildi", deger: 10 }, ANAHTAR);
    await sinavTarama.hucreKarari(b, { hucreId: kart(2, "2").hucreId, sonuc: "onaylandi" }, ANAHTAR);
    await sinavTarama.hucreKarari(b, { hucreId: kart(2, "3").hucreId, sonuc: "onaylandi" }, ANAHTAR);
    await sinavTarama.hucreKarari(b, { hucreId: kart(2, "*toplam").hucreId, sonuc: "onaylandi" }, ANAHTAR);
    await sinavTarama.hucreKarari(b, { hucreId: kart(3, "1").hucreId, sonuc: "duzeltildi", deger: 10 }, ANAHTAR);
    await sinavTarama.hucreKarari(
      b,
      { hucreId: kart(4, "*numara").hucreId, sonuc: "duzeltildi", ogrenciNo: "2099000104" },
      ANAHTAR,
    );
    // Aynı karta ikinci karar yok.
    await expect(
      sinavTarama.hucreKarari(b, { hucreId: kart(2, "2").hucreId, sonuc: "onaylandi" }, ANAHTAR),
    ).rejects.toThrow();
    expect((await sinavTarama.taramaGorunumu(b, sonuc.taramaId)).kartlar).toHaveLength(0);

    expect(await sinavTarama.puanlariAktar(b, sonuc.taramaId)).toEqual({ ogrenciSayisi: 4, puanSayisi: 12 });
    await expect(sinavTarama.puanlariAktar(b, sonuc.taramaId)).rejects.toThrow(/zaten aktarılmış/u);

    // Ölçme (elle hesap): ÖÇ1 = (S1+S2)/20 → K1 15,5/20 = %77,5; K2 16/20 = %80; K3 15/20 = %75; K4 7/20 = %35.
    // ÖÇ2 = S3/20 → %75, %60, %90, %50.
    const o = await sinavTarama.olcmeHesapla(b, aracId);
    const ok1 = o.ckBasarilari.find((c) => c.ckKod === "ÖÇ1");
    const ok2 = o.ckBasarilari.find((c) => c.ckKod === "ÖÇ2");
    expect(Object.values(ok1?.ogrenciler ?? {}).sort()).toEqual([35, 75, 77.5, 80]);
    expect(Object.values(ok2?.ogrenciler ?? {}).sort()).toEqual([50, 60, 75, 90]);
    expect(o.ogrenciSayisi).toBe(4);

    // Numara veritabanında hiçbir tabloda açık değil (günlük dahil).
    const satirlar = async <T>(q: ReturnType<typeof sql.raw>) =>
      ((await db.execute(q)) as unknown as { rows: T[] }).rows;
    const tablolar = await satirlar<{ t: string }>(
      sql.raw(
        `select table_name as t from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'`,
      ),
    );
    expect(tablolar.length).toBeGreaterThan(40);
    let taranan = 0;
    for (const { t } of tablolar) {
      const [r] = await satirlar<{ m: string | null }>(
        sql.raw(`select string_agg(to_jsonb(x)::text, ' ') as m from "${t}" x`),
      );
      taranan += r?.m?.length ?? 0;
      for (const n of NUMARALAR) expect(r?.m ?? "", t).not.toContain(n);
    }
    // Denetimin boş geçmediğinin karşılığı: hücrelerde takma ad (HMAC) var.
    expect(taranan).toBeGreaterThan(1000);
    expect(g.hucreler.length).toBe(20);
    const [ta] = await satirlar<{ n: number }>(
      sql.raw(
        `select count(distinct ogrenci_takma_ad)::int as n from sinav_hucresi where ogrenci_takma_ad ~ '^[0-9a-f]{32}$'`,
      ),
    );
    expect(ta?.n).toBe(3);

    // Günlük: her hücrenin güveni ve durumu, her karar; zincir sağlam.
    const gunluk = await kiraciIslemi(db, KURUM, (tx) =>
      tx.select().from(sema.gunluk).where(eq(sema.gunluk.kurumId, KURUM)),
    );
    const okunan = gunluk.filter(
      (x) => x.eylem === "sinav.hucre_okundu" && (x.ayrinti as { taramaId?: string }).taramaId === sonuc.taramaId,
    );
    expect(okunan).toHaveLength(20);
    expect(okunan.every((x) => typeof (x.ayrinti as { guven?: unknown }).guven === "number")).toBe(true);
    expect(okunan.filter((x) => (x.ayrinti as { durum: string }).durum === "otomatik_okundu")).toHaveLength(14);
    const kararlar = gunluk.filter((x) => x.eylem === "sinav.hucre_karari");
    expect(kararlar).toHaveLength(6);
    expect(kararlar.every((x) => (x.ayrinti as { dayanak: string }).dayanak === "dogrudan")).toBe(true);
    expect(gunluk.some((x) => x.eylem === "sinav.puanlar_aktarildi")).toBe(true);
    expect(await zinciriDogrula(db, KURUM)).toBeNull();

    // Hücre ve karar kayıtları değiştirilemez.
    await expect(
      kiraciIslemi(db, KURUM, (tx) =>
        tx.update(sema.sinavHucresi).set({ guven: 1 }).where(eq(sema.sinavHucresi.taramaId, sonuc.taramaId)),
      ),
    ).rejects.toThrow();
    await expect(
      kiraciIslemi(db, KURUM, (tx) =>
        tx.delete(sema.sinavHucreKarari).where(and(eq(sema.sinavHucreKarari.kurumId, KURUM))),
      ),
    ).rejects.toThrow();
  });
});

describe("PDF ve ZIP kaynağı (kurum içi Poppler + Tesseract)", () => {
  it("kutuyu oransal konumdan piksele çevirip kırpar; ZIP içindeki PDF'leri ad sırasıyla birleştirir", async () => {
    const komutlar: string[][] = [];
    const calistirici = async (k: string, a: string[]) => {
      komutlar.push([k, ...a]);
      if (k === "pdfinfo") return "Title: x\nPages:          2\n";
      if (k === "tesseract") return a[0]?.includes("k0") ? " 2099000101 \n" : "AKREDIT SINAV KAPAK";
      return "";
    };
    const pdf = pdfOlustur([["a"], ["b"]]);
    const kaynak = await pdfTaramaKaynagi(pdf, { calistirici, genislik: 1000, yukseklik: 2000 });
    expect(kaynak.sayfaSayisi).toBe(2);
    expect(await kaynak.sayfaMetni(1)).toBe("AKREDIT SINAV KAPAK");
    const kutu = { sayfa: 1, x: 0.6, y: 0.05, genislik: 0.3, yukseklik: 0.05 };
    const b = await kaynak.bolge(0, kutu, "*numara");
    expect(b.metin).toBe("2099000101");
    const kirp = komutlar.find((c) => c[0] === "pdftoppm" && c.includes("-x"));
    // 0,6 × 1000 = 600; 0,05 × 2000 = 100; 0,3 × 1000 = 300; 0,05 × 2000 = 100. Yalnız 1. sayfa.
    expect(kirp?.slice(1, 5)).toEqual(["-f", "1", "-l", "1"]);
    expect(kirp?.slice(kirp.indexOf("-x"), kirp.indexOf("-x") + 8)).toEqual([
      "-x",
      "600",
      "-y",
      "100",
      "-W",
      "300",
      "-H",
      "100",
    ]);
    // Ağa çıkan bir komut yok.
    expect(new Set(komutlar.map((c) => c[0]))).toEqual(new Set(["pdfinfo", "pdftoppm", "tesseract"]));
    await (kaynak as { kapat?: () => Promise<void> }).kapat?.();

    const iki = birlesikKaynak([ornekKaynak({ sablon: {}, sayfalar: ORNEK.sayfalar.slice(0, 1) }), ornekKaynak(ORNEK)]);
    expect(iki.sayfaSayisi).toBe(5);
    expect(await iki.bolge(1, kutu, "1")).toEqual({ metin: "8" });
    await expect(taramaKaynagiKur(new TextEncoder().encode("düz metin"))).rejects.toThrow(/PDF/u);
  });
});
