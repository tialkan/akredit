// İP-43 uçtan uca: yükleme (kanıt hattı, SHA-256) → okuma (sahte yerel model sunucusu, openai-uyumlu uç) →
// onay kuyruğu (Katman 2) → kişi kararı → ölçme aracına aktarım → ÇK sağlanması (@akredit/olcme).
// Kâğıtlar `test/fixtures/kagitlar.json` içindeki sentetik örneklerdir; ad ve numaralar uydurmadır.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { bellekDepo } from "@akredit/depo";
import { aktorYukle, type ServisBaglami, ServisHatasi, sinavTarama } from "@akredit/servis";
import { gocleriUygula, kiraciIslemi, pgliteBaglantisi, sema, type Vt, zinciriDogrula } from "@akredit/vt";
import { and, eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { kanitAl } from "../kanit-hatti/alma.ts";
import { bellekKuyrugu } from "../kanit-hatti/kuyruk.ts";
import { pdfOlustur } from "../kanit-hatti/test/pdf-yardimci.ts";
import {
  bekleyenTaramalariKuyrugaKoy,
  birlesikKaynak,
  goruntuyuPdfYap,
  pdfTaramaKaynagi,
  sinavTaramasiIsi,
  taramaIstegiIsi,
  taramaKaynagiKur,
} from "./index.ts";

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
let ikinciHoca: string;
let degerlendirici: string;
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
    // Kırpıntı erişimi için: aynı dersin ikinci öğretim elemanı (onay yetkilisi) ve süreli değerlendirici
    // (okur ama karar veremez).
    ikinciHoca = ilk(await tx.insert(sema.kisi).values({ kurumId: KURUM, adSoyad: "İkinci Hoca" }).returning()).id;
    degerlendirici = ilk(
      await tx.insert(sema.kisi).values({ kurumId: KURUM, adSoyad: "Deneme Değerlendirici" }).returning(),
    ).id;
    await tx.insert(sema.rolAtamasi).values([
      {
        kurumId: KURUM,
        kisiId: ikinciHoca,
        rol: "ogretim_elemani",
        kapsamTuru: "ders",
        kapsamId: ders.id,
        baslangic: new Date("2026-01-01T00:00:00Z"),
      },
      {
        kurumId: KURUM,
        kisiId: degerlendirici,
        rol: "degerlendirici",
        kapsamTuru: "ders",
        kapsamId: ders.id,
        baslangic: new Date("2026-01-01T00:00:00Z"),
        bitis: new Date("2027-01-01T00:00:00Z"),
      },
    ]);
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
    // Otomatik hücre tek tek "onaylanmaz" (özet onayıyla onaylanır); yalnız düzeltilebilir.
    const oto = g.hucreler.find((h) => h.kagitSira === 1 && h.alan === "1");
    await expect(sinavTarama.hucreKarari(b, { hucreId: oto?.hucreId, sonuc: "onaylandi" }, ANAHTAR)).rejects.toThrow(
      /özetiyle onaylanır/u,
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
    const g2 = await sinavTarama.taramaGorunumu(b, sonuc.taramaId);
    expect(g2.kartlar).toHaveLength(0);
    // Aktarım öncesi özet (inceleme D8-3): 14 otomatik hücre.
    expect(g2.otomatikOzet.sayi).toBe(14);
    expect(g2.sahip).toBe(true);

    // Özet onayı olmadan aktarım yok; kişi istediği otomatik hücreyi düzeltebilir (Katman 1, doğrudan).
    await expect(sinavTarama.puanlariAktar(b, sonuc.taramaId)).rejects.toThrow(/özetini görüp onaylayın/u);
    const k1Toplam = g2.hucreler.find((h) => h.kagitSira === 1 && h.alan === "*toplam");
    await sinavTarama.hucreKarari(b, { hucreId: k1Toplam?.hucreId, sonuc: "duzeltildi", deger: 15.5 }, ANAHTAR);
    // Kişinin gördüğü özet artık eski: düzeltilen hücre özetten çıktı, aktarım durur.
    await expect(sinavTarama.puanlariAktar(b, sonuc.taramaId, { ozet: g2.otomatikOzet.ozet })).rejects.toThrow(
      /değişti/u,
    );
    const g3 = await sinavTarama.taramaGorunumu(b, sonuc.taramaId);
    expect(g3.otomatikOzet.sayi).toBe(13);
    expect(await sinavTarama.puanlariAktar(b, sonuc.taramaId, { ozet: g3.otomatikOzet.ozet })).toEqual({
      ogrenciSayisi: 4,
      puanSayisi: 12,
      otomatikSayisi: 13,
    });
    expect((await sinavTarama.taramaGorunumu(b, sonuc.taramaId)).aktarildi).toBe(true);
    await expect(sinavTarama.puanlariAktar(b, sonuc.taramaId, { ozet: g3.otomatikOzet.ozet })).rejects.toThrow(
      /zaten aktarılmış/u,
    );
    // Aktarımdan sonra hiçbir hücreye karar girmez (servis ve veritabanı tetikleyicisi).
    const k1S2 = g3.hucreler.find((h) => h.kagitSira === 1 && h.alan === "2");
    await expect(
      sinavTarama.hucreKarari(b, { hucreId: k1S2?.hucreId, sonuc: "duzeltildi", deger: 1 }, ANAHTAR),
    ).rejects.toThrow(/aktarıldı/u);
    await expect(
      kiraciIslemi(db, KURUM, (tx) =>
        tx.insert(sema.sinavHucreKarari).values({
          kurumId: KURUM,
          hucreId: k1S2?.hucreId as string,
          sonuc: "duzeltildi",
          deger: "1",
          kararVerenKisiId: hoca,
        }),
      ),
    ).rejects.toThrow();

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
    // 6 onay kartı (Katman 2) + 1 otomatik hücre düzeltmesi (Katman 1).
    expect(kararlar).toHaveLength(7);
    expect(kararlar.every((x) => (x.ayrinti as { dayanak: string }).dayanak === "dogrudan")).toBe(true);
    expect(kararlar.map((x) => (x.ayrinti as { katman: number }).katman).sort()).toEqual([1, 2, 2, 2, 2, 2, 2]);
    const ozetOnayi = gunluk.find((x) => x.eylem === "sinav.otomatik_ozet_onaylandi");
    expect(ozetOnayi?.ayrinti).toMatchObject({
      otomatikSayisi: 13,
      katman: 1,
      kural: "K1-sinav-otomatik-ozet",
      dayanak: "dogrudan",
      toplu: true,
    });
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

const YEREL_ORTAM = {
  AKREDIT_YZ_HAZIR: YEREL.hazir,
  AKREDIT_YZ_ADRES: YEREL.adres,
  AKREDIT_YZ_MODEL: YEREL.model,
};

describe("panelden yükleme isteği → kuyruk → kanitAl (sınav taraması amacı) → tarama", () => {
  it("istek kuyruğa bir kez girer, dosya hattın metin/YZ kuyruğuna girmeden kanıt olur, sonuç bir kez yazılır", async () => {
    const depo = bellekDepo();
    const b = await baglam();
    await sinavTarama.sablonKaydet(b, { olcmeAraciId: aracId, sablon: ORNEK.sablon });
    const veri = pdfOlustur([["AKREDIT SINAV KAPAK", "panel yuklemesi"]]);

    // Yerel model yoksa form kapalı: istek hiç yazılmaz, dosya depoya konmaz.
    await expect(
      sinavTarama.taramaIstegiKaydet(b, { olcmeAraciId: aracId }, { veri, dosyaAdi: "vize.pdf" }, { depo, ortam: {} }),
    ).rejects.toThrow(/kurum içinde/u);
    // Tür içerikten bulunur: PDF adlı düz metin reddedilir.
    await expect(
      sinavTarama.taramaIstegiKaydet(
        b,
        { olcmeAraciId: aracId },
        { veri: new TextEncoder().encode("düz metin"), dosyaAdi: "vize.pdf" },
        { depo, ortam: YEREL_ORTAM },
      ),
    ).rejects.toThrow(/PDF, PNG/u);
    // Yetkisiz kişi (değerlendirici) istek açamaz.
    const deg = { db, aktor: await aktorYukle(db, KURUM, degerlendirici), simdi: () => SIMDI };
    await expect(
      sinavTarama.taramaIstegiKaydet(
        deg,
        { olcmeAraciId: aracId },
        { veri, dosyaAdi: "x.pdf" },
        { depo, ortam: YEREL_ORTAM },
      ),
    ).rejects.toThrow();

    const { istekId } = await sinavTarama.taramaIstegiKaydet(
      b,
      { olcmeAraciId: aracId },
      { veri, dosyaAdi: "../vize\u0007.pdf" },
      { depo, ortam: YEREL_ORTAM },
    );

    // Süreç turu bekleyen isteği kuyruğa koyar (tekil anahtarla).
    const gonderilen: { veri: unknown; anahtar: string }[] = [];
    await bekleyenTaramalariKuyrugaKoy(db, KURUM, async (v, anahtar) => gonderilen.push({ veri: v, anahtar }));
    expect(gonderilen).toEqual([{ veri: { kurumId: KURUM, istekId }, anahtar: `sinav:${istekId}` }]);

    const kuyruk = bellekKuyrugu();
    const hatKuyrugu: string[] = [];
    const asil = kuyruk.gonder.bind(kuyruk);
    kuyruk.gonder = async (ad, v, sec) => {
      hatKuyrugu.push(ad);
      return asil(ad, v, sec);
    };
    const s = sahteYerelSunucu();
    const sonuc = await taramaIstegiIsi(
      {
        hat: { db, depo, kuyruk },
        yerelModel: YEREL,
        takmaAdAnahtari: ANAHTAR,
        fetch: s.fetch,
        coz: async () => ["10.0.0.5"],
        simdi: () => SIMDI,
        kaynakKur: async () => ornekKaynak(ORNEK),
      },
      gonderilen[0]?.veri,
    );
    expect(sonuc).toMatchObject({ durum: "tamam" });
    if (sonuc?.durum !== "tamam") throw new Error("tamamlanmadı");
    // Kanıt sınav taraması amacıyla alındı; metin çıkarma ve YZ kuyruğuna hiçbir şey gitmedi.
    expect(hatKuyrugu).toEqual([]);
    const [k] = await kiraciIslemi(db, KURUM, (tx) =>
      tx.select().from(sema.kanit).where(eq(sema.kanit.id, sonuc.kanitId)),
    );
    expect(k?.kaynakAyrinti).toMatchObject({ amac: "sinav_taramasi", istekId });
    expect(k?.dosyaAdi).toBe("vize.pdf");

    // Sonuç bir kez: ikinci çalıştırma bir şey yapmaz, istek artık beklemiyor.
    const ikinci = await taramaIstegiIsi(
      { hat: { db, depo, kuyruk }, yerelModel: YEREL, takmaAdAnahtari: ANAHTAR, fetch: s.fetch },
      { kurumId: KURUM, istekId },
    );
    expect(ikinci).toBeNull();
    expect(await sinavTarama.bekleyenTaramaIstekleri(db, KURUM)).toEqual([]);
    const panel = await sinavTarama.taramaPaneli(b, await dersKimligi());
    expect(panel.istekler.find((i) => i.id === istekId)).toMatchObject({ durum: "tamam", taramaId: sonuc.taramaId });
    expect(panel.araclar[0]?.sablon).not.toBeNull();
    expect(panel.taramalar.some((t) => t.taramaId === sonuc.taramaId && !t.aktarildi)).toBe(true);
  });

  it("işçide yerel model yoksa dosya kanıt olarak bile alınmaz; istek Türkçe iletiyle hata olarak kapanır", async () => {
    const depo = bellekDepo();
    const b = await baglam();
    const veri = pdfOlustur([["AKREDIT SINAV KAPAK", "modelsiz isci"]]);
    const { istekId } = await sinavTarama.taramaIstegiKaydet(
      b,
      { olcmeAraciId: aracId },
      { veri, dosyaAdi: "vize.pdf" },
      { depo, ortam: YEREL_ORTAM },
    );
    const kanitOnce = await kiraciIslemi(db, KURUM, async (tx) => (await tx.select().from(sema.kanit)).length);
    const sonuc = await taramaIstegiIsi(
      { hat: { db, depo, kuyruk: bellekKuyrugu() }, yerelModel: null, takmaAdAnahtari: ANAHTAR },
      { kurumId: KURUM, istekId },
    );
    expect(sonuc).toMatchObject({ durum: "hata", ileti: expect.stringMatching(/kurum içinde/u) });
    expect(await kiraciIslemi(db, KURUM, async (tx) => (await tx.select().from(sema.kanit)).length)).toBe(kanitOnce);
    const panel = await sinavTarama.taramaPaneli(b, await dersKimligi());
    expect(panel.istekler.find((i) => i.id === istekId)).toMatchObject({ durum: "hata" });
  });
});

async function dersKimligi(): Promise<string> {
  return kiraciIslemi(db, KURUM, async (tx) => {
    const [d] = await tx.select({ id: sema.ders.id }).from(sema.ders).where(eq(sema.ders.kod, "UYD101"));
    return d?.id as string;
  });
}

describe("numara kutusu kırpıntısı: ayrı erişim (inceleme D8-4)", () => {
  it("yalnız tarama sahibi ve onay yetkilisi alır; süre dolunca bağlantı yok; her erişim günlükte", async () => {
    const depo = bellekDepo();
    const b = await baglam();
    await sinavTarama.sablonKaydet(b, { olcmeAraciId: aracId, sablon: ORNEK.sablon });
    const k = await yukle(depo, bellekKuyrugu(), "sinav_taramasi", "kirpinti");
    const s = sahteYerelSunucu();
    const t = await sinavTaramasiIsi(
      {
        db,
        depo,
        yerelModel: YEREL,
        takmaAdAnahtari: ANAHTAR,
        fetch: s.fetch,
        coz: async () => ["10.0.0.5"],
        simdi: () => SIMDI,
        kaynakKur: async () => ornekKaynak(ORNEK),
      },
      { kurumId: KURUM, kisiId: hoca, kanitId: k.kanitId, olcmeAraciId: aracId },
    );
    const g = await sinavTarama.taramaGorunumu(b, t.taramaId);
    const numara = g.hucreler.find((h) => h.kagitSira === 4 && h.alan === "*numara");
    const puan = g.hucreler.find((h) => h.kagitSira === 4 && h.alan === "1");
    if (!numara || !puan) throw new Error("hücre yok");
    // Taramanın kayıt zamanı veritabanı saatidir; erişim penceresi ona göre hesaplanır.
    const [tr] = await kiraciIslemi(db, KURUM, (tx) =>
      tx.select().from(sema.sinavTaramasi).where(eq(sema.sinavTaramasi.id, t.taramaId)),
    );
    const t0 = tr?.olusturma.getTime() ?? 0;
    const anda = (kisi: string, ms: number) =>
      aktorYukle(db, KURUM, kisi).then((aktor) => ({ db, aktor, simdi: () => new Date(t0 + ms) }));

    // Sahip: imzalı, kısa süreli bağlantı.
    const r = await sinavTarama.kirpintiBaglantisi(await anda(hoca, 60_000), numara.hucreId, { depo });
    expect(r.adres).toContain(numara.kirpintiOzeti as string);
    expect(new Date(r.bitis).getTime() - (t0 + 60_000)).toBe(sinavTarama.KIRPINTI_BAGLANTI_SN * 1000);
    // Onay yetkilisi (aynı dersin öğretim elemanı, sahip değil).
    await sinavTarama.kirpintiBaglantisi(await anda(ikinciHoca, 60_000), numara.hucreId, { depo });
    // Okuyabilen ama karar veremeyen değerlendirici alamaz.
    await expect(
      sinavTarama.kirpintiBaglantisi(await anda(degerlendirici, 60_000), numara.hucreId, { depo }),
    ).rejects.toMatchObject({ kod: "yetki_yok" });
    // Puan hücresinin kırpıntı bağlantısı yoktur.
    await expect(
      sinavTarama.kirpintiBaglantisi(await anda(hoca, 60_000), puan.hucreId, { depo }),
    ).rejects.toMatchObject({
      kod: "bulunamadi",
    });
    // Süre dolunca (30 gün + 1 dk) sahibe de bağlantı verilmez.
    const gun = 86_400_000;
    await expect(
      sinavTarama.kirpintiBaglantisi(await anda(hoca, sinavTarama.KIRPINTI_ERISIM_GUN * gun + 60_000), numara.hucreId, {
        depo,
      }),
    ).rejects.toThrow(/süresi doldu/u);

    // Yalnız verilen iki bağlantı günlükte; numara yok.
    const gunluk = await kiraciIslemi(db, KURUM, (tx) =>
      tx.select().from(sema.gunluk).where(eq(sema.gunluk.eylem, "sinav.kirpinti_erisimi")),
    );
    const bu = gunluk.filter((x) => (x.ayrinti as { taramaId: string }).taramaId === t.taramaId);
    expect(bu.map((x) => [x.aktorId, (x.ayrinti as { gerekce: string }).gerekce])).toEqual([
      [hoca, "tarama_sahibi"],
      [ikinciHoca, "onay_yetkilisi"],
    ]);
    for (const x of bu) for (const n of NUMARALAR) expect(JSON.stringify(x.ayrinti)).not.toContain(n);
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

  it("görüntü (PNG, JPEG, TIFF) kurum içinde Tesseract ile PDF'e çevrilip aynı yoldan okunur", async () => {
    const komutlar: string[][] = [];
    const pdf = pdfOlustur([["a"], ["b"], ["c"]]);
    const calistirici = async (k: string, a: string[]) => {
      komutlar.push([k, ...a]);
      // Tesseract "pdf" çıktısı: <çıktı>.pdf yazar.
      if (k === "tesseract" && a.at(-1) === "pdf") await writeFile(`${a[1]}.pdf`, pdf);
      if (k === "pdfinfo") return "Pages:          3\n";
      return "";
    };
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
    expect(await goruntuyuPdfYap(png, { calistirici })).toEqual(pdf);
    const tiff = new Uint8Array([0x49, 0x49, 0x2a, 0x00, 0, 0, 0, 0]);
    const kaynak = await taramaKaynagiKur(tiff, { calistirici });
    expect(kaynak.sayfaSayisi).toBe(3);
    await (kaynak as { kapat?: () => Promise<void> }).kapat?.();
    expect(komutlar.filter((c) => c[0] === "tesseract").every((c) => c.includes("pdf"))).toBe(true);
    expect(new Set(komutlar.map((c) => c[0]))).toEqual(new Set(["tesseract", "pdfinfo"]));
  });
});
