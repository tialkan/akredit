// Servis işlevleri: yetki, kiracı sınırı, karar ve toplu onay kuralları, politika, günlük aktörü.

import { sema, zinciriDogrula } from "@akredit/vt";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import * as akademik from "../src/akademik.ts";
import { ServisHatasi } from "../src/hata.ts";
import * as kanit from "../src/kanit.ts";
import * as oneri from "../src/oneri.ts";
import * as panel from "../src/panel.ts";
import * as politika from "../src/politika.ts";
import * as rapor from "../src/rapor.ts";
import { ortam, SIMDI } from "./yardimci.ts";

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
    throw e;
  }
  return "hata yok";
}

async function sonGunluk(kurumId: string) {
  return o.db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.kurum_id', ${kurumId}, true)`);
    return (await tx.select().from(sema.gunluk).orderBy(sql`sira desc`).limit(1))[0];
  });
}

describe("okuma ve kapsam", () => {
  it("kurum yöneticisi bütün kanıtları görür; öğretim elemanı yalnız dersinin kanıtını", async () => {
    const y = await kanit.kanitlar(await o.baglam(o.a, o.a.yonetici));
    expect(y.toplam).toBe(2);
    const h = await kanit.kanitlar(await o.baglam(o.a, o.a.ogretim));
    expect(h.ogeler.map((k) => k.id)).toEqual([o.a.kanitDers]);
  });

  it("kanıt görünümü işleme durumunu ve kişisel veri taramasını taşır", async () => {
    const k = await kanit.kanit(await o.baglam(o.a, o.a.yonetici), o.a.kanitDers);
    expect(k.kanit.isleme).toMatchObject({ durum: "gomme_tamam", asama: "tamam" });
    expect(k.kanit.kisiselVeri).toBe("var");
    expect(k.parcalar).toHaveLength(1);
    // Sayaç: kanitDers son durumu "tamam", kanitKurum "hata"; kişisel veri yalnız kanitDers.
    const ozet = await kanit.kanitHattiOzeti(await o.baglam(o.a, o.a.yonetici));
    expect(ozet.sayac).toEqual({ isleniyor: 0, tamam: 1, hata: 1, ocr_bekliyor: 0, kisisel_veri: 1 });
  });

  it("başka kurumun kanıtı 404, kapsam dışı kanıt 403 ve ret günlüğe yazılır", async () => {
    expect(await hataKodu(kanit.kanit(await o.baglam(o.a, o.a.yonetici), o.b.kanitDers))).toBe("bulunamadi");
    expect(await hataKodu(kanit.kanit(await o.baglam(o.a, o.a.ogretim), o.a.kanitKurum))).toBe("yetki_yok");
    const g = await sonGunluk(o.a.kurumId);
    expect(g).toMatchObject({ eylem: "kimlik.erisim_reddedildi", aktorTuru: "kisi", aktorId: o.a.ogretim });
  });

  it("sayfalama: sinir ve imleç", async () => {
    const b = await o.baglam(o.a, o.a.yonetici);
    const s1 = await kanit.kanitlar(b, { sinir: 1 });
    expect(s1.ogeler).toHaveLength(1);
    expect(s1.sonraki).toBe("1");
    const s2 = await kanit.kanitlar(b, { sinir: 1, imlec: "1" });
    expect(s2.sonraki).toBeNull();
    expect(s2.ogeler[0]?.id).not.toBe(s1.ogeler[0]?.id);
  });

  it("program matrisi, ders, rapor ve süreç gerçek tablolardan okunur", async () => {
    const b = await o.baglam(o.a, o.a.yonetici);
    const p = await akademik.program(b, o.a.programId);
    expect(p.ciktilar.map((c) => c.kod)).toEqual(["PÇ1"]);
    expect(p.dersIdleri).toEqual([o.a.dersId]);
    const d = await akademik.ders(b, o.a.dersId);
    expect(d.bolognaDurumu).toBe("guncel");
    expect(d.olcme).toEqual([]); // ölçme sonucu yok: sayı uydurulmaz
    const r = await rapor.rapor(b, o.a.raporId);
    const [p1, p2] = r.bolumler[0]?.paragraflar ?? [];
    expect(p1).toMatchObject({ eksik: false, atiflar: [{ kanitId: o.a.kanitDers, capa: { sayfa: 1 } }] });
    expect(p2?.eksik).toBe(true); // kanıta bağlanmayan paragraf EKSİK
    const g = await rapor.surecler(await o.baglam(o.a, o.a.ogretim));
    expect(g).toMatchObject([{ baslik: "Ders dosyasını tamamla", sonTarih: "2026-11-15", sorumlu: "Deneme Hoca A" }]);
  });

  it("rolsüz kişi listelerde hiçbir şey görmez", async () => {
    const b = await o.baglam(o.a, o.a.rolsuz);
    expect((await kanit.kanitlar(b)).toplam).toBe(0);
    expect((await oneri.bekleyenOneriler(b)).toplam).toBe(0);
    expect(await akademik.programlar(b)).toEqual([]);
    expect(await rapor.raporlar(b)).toEqual([]);
  });
});

describe("karar", () => {
  it("API anahtarıyla karar verilemez (onay insanda)", async () => {
    const b = await o.baglam(o.a, o.a.yonetici, "anahtar", ["karar.ver", "oneri.oku"]);
    expect(await hataKodu(oneri.kararVer(b, { oneriId: o.a.oneriDusuk, sonuc: "onaylandi" }))).toBe("yetki_yok");
    expect(await hataKodu(oneri.topluKararVer(b, { oneriIdleri: [o.a.oneriDusuk] }))).toBe("yetki_yok");
  });

  it("girdi zod ile doğrulanır: düzeltmede metin zorunlu", async () => {
    const b = await o.baglam(o.a, o.a.yonetici);
    expect(await hataKodu(oneri.kararVer(b, { oneriId: o.a.oneriDusuk, sonuc: "duzeltildi" }))).toBe("zod");
    expect(await hataKodu(oneri.kararVer(b, { oneriId: "x", sonuc: "onaylandi" }))).toBe("zod");
  });

  it("toplu onayda yüksek riskli öneri varsa hiçbiri kaydedilmez", async () => {
    const b = await o.baglam(o.a, o.a.yonetici);
    expect(await hataKodu(oneri.topluKararVer(b, { oneriIdleri: [o.a.oneriDusuk, o.a.oneriYuksek] }))).toBe(
      "kural_ihlali",
    );
    // Tür riski yüksek (dış gönderim) de toplu onaylanamaz.
    expect(await hataKodu(oneri.topluKararVer(b, { oneriIdleri: [o.a.oneriDisGonderim] }))).toBe("kural_ihlali");
    const kayit = await oneri.kararlar(b);
    expect(kayit.toplam).toBe(0);
  });

  it("kapsam dışı öneri toplu seçimdeyse hiçbiri kaydedilmez (403)", async () => {
    const h = await o.baglam(o.a, o.a.ogretim);
    // oneriOrta dersin, oneriDusuk dersin kanıtının: ikisi de kapsamda. Kurum kanıtı kapsam dışı değil ama
    // yüksek riskli dış gönderim kurum düzeyinde. Burada B kurumunun önerisi: 404.
    expect(await hataKodu(oneri.topluKararVer(h, { oneriIdleri: [o.a.oneriOrta, o.b.oneriOrta] }))).toBe("bulunamadi");
    expect((await oneri.kararlar(await o.baglam(o.a, o.a.yonetici))).toplam).toBe(0);
  });

  it("öğretim elemanı dersinin önerilerini toplu onaylar; karar veren oturumdaki kişi, günlükte aktör o", async () => {
    const h = await o.baglam(o.a, o.a.ogretim);
    const k = await oneri.topluKararVer(h, { oneriIdleri: [o.a.oneriDusuk, o.a.oneriOrta] });
    expect(k).toHaveLength(2);
    expect(k.every((x) => x.kararVeren === o.a.ogretim && x.dayanak.tur === "dogrudan")).toBe(true);
    const g = await sonGunluk(o.a.kurumId);
    expect(g).toMatchObject({ eylem: "karar.verildi", aktorTuru: "kisi", aktorId: o.a.ogretim });
    expect(g?.ayrinti).toMatchObject({ toplu: true, sonuc: "onaylandi" });
    // İkinci kez karar: çakışma.
    expect(await hataKodu(oneri.kararVer(h, { oneriId: o.a.oneriDusuk, sonuc: "reddedildi" }))).toBe("cakisma");
    expect(await zinciriDogrula(o.db, o.a.kurumId)).toBeNull();
  });

  it("yüksek riskli öneri tek tek düzeltilerek karara bağlanabilir", async () => {
    const h = await o.baglam(o.a, o.a.ogretim);
    const k = await oneri.kararVer(h, {
      oneriId: o.a.oneriYuksek,
      sonuc: "duzeltildi",
      duzeltme: "Düzeltilmiş metin.",
    });
    expect(k.duzeltme).toEqual({ baslik: "Öneri olgunluk_duzeyi", metin: "Düzeltilmiş metin." });
  });

  it("gözlemci karar veremez (403)", async () => {
    const g = await o.baglam(o.a, o.a.gozlemci);
    expect(await hataKodu(oneri.kararVer(g, { oneriId: o.a.oneriOrta2, sonuc: "onaylandi" }))).toBe("yetki_yok");
  });

  it("panel özeti: bekleyenler etkin riske göre, karar sayısı ve süre kararlardan", async () => {
    const p = await panel.panelOzeti(await o.baglam(o.a, o.a.ogretim));
    // Kalan bekleyen (hocanın kapsamında): oneriOrta2 (orta). Dış gönderim kurum düzeyinde, görmez.
    expect(p.bekleyen).toEqual({ dusuk: 0, orta: 1, yuksek: 0 });
    expect(p.kararSayisi).toBe(3);
    // Üç karar aynı anda (SIMDI) verildi: tek oturum, süre 0 dakika.
    expect(p.harcananDakika).toBe(0);
    expect(p.kapsama).toEqual([]);
  });
});

describe("politika ve ayarlar", () => {
  it("yüksek risk ve yüksek riskli tür politikada reddedilir", async () => {
    const y = await o.baglam(o.a, o.a.yonetici);
    const temel = { ad: "Etiketler", oneriTurleri: ["kanit_etiketi"], enYuksekRisk: "dusuk", enDusukGuven: 0.8 };
    expect(await hataKodu(politika.politikaTaslagiOlustur(y, { ...temel, enYuksekRisk: "yuksek" }))).toBe("zod");
    expect(await hataKodu(politika.politikaTaslagiOlustur(y, { ...temel, oneriTurleri: ["dis_gonderim"] }))).toBe(
      "zod",
    );
  });

  it("başka kurumun programı politika kapsamına yazılamaz", async () => {
    const y = await o.baglam(o.a, o.a.yonetici);
    const g = {
      ad: "P",
      oneriTurleri: ["kanit_etiketi"],
      enYuksekRisk: "dusuk",
      enDusukGuven: 0.8,
      programIdleri: [o.b.programId],
    };
    expect(await hataKodu(politika.politikaTaslagiOlustur(y, g))).toBe("gecersiz_istek");
  });

  it("taslak, adla imza, iptal; imzalayan oturumdaki kişi ve günlükte", async () => {
    const y = await o.baglam(o.a, o.a.yonetici);
    const t = await politika.politikaTaslagiOlustur(y, {
      ad: "Kanıt etiketleri",
      oneriTurleri: ["kanit_etiketi"],
      enYuksekRisk: "dusuk",
      enDusukGuven: 0.8,
      programIdleri: [o.a.programId],
    });
    expect(t.durum).toBe("imza_bekliyor");
    expect(await hataKodu(politika.politikaImzala(y, t.id, { imzalayanAd: "Başka Biri" }))).toBe("kural_ihlali");
    const anahtar = await o.baglam(o.a, o.a.yonetici, "anahtar", ["politika.imzala"]);
    expect(await hataKodu(politika.politikaImzala(anahtar, t.id, { imzalayanAd: "Deneme Yönetici A" }))).toBe(
      "yetki_yok",
    );
    const i = await politika.politikaImzala(y, t.id, { imzalayanAd: "  deneme yönetici a " });
    expect(i).toMatchObject({ durum: "imzali", imzalayan: "Deneme Yönetici A" });
    const g = await sonGunluk(o.a.kurumId);
    expect(g).toMatchObject({ eylem: "politika.imzalandi", aktorId: o.a.yonetici });
    expect(await hataKodu(politika.politikaImzala(y, t.id, { imzalayanAd: "Deneme Yönetici A" }))).toBe("cakisma");

    // Uygulanabilirlik: program kapsamı ve iptal (inceleme bulguları 2 ve 3).
    const uygun = (konum: { tur: "ders" | "program"; id: string }) =>
      o.db.transaction(async (tx) => {
        await tx.execute(sql`select set_config('app.kurum_id', ${o.a.kurumId}, true)`);
        return politika.uygulanabilirPolitikalar(
          tx,
          o.a.kurumId,
          { tur: "kanit_etiketi", risk: "dusuk", guven: 0.9 },
          konum,
          SIMDI,
        );
      });
    expect(await uygun({ tur: "ders", id: o.a.dersId })).toEqual([t.id]);
    expect(await uygun({ tur: "program", id: o.a.digerProgramId })).toEqual([]);
    const iptal = await politika.politikaIptal(y, t.id);
    expect(iptal.durum).toBe("iptal");
    expect(await uygun({ tur: "ders", id: o.a.dersId })).toEqual([]);
    expect(await hataKodu(politika.politikaIptal(y, t.id))).toBe("cakisma");
  });

  it("öğretim elemanı politika taslağı oluşturamaz", async () => {
    const h = await o.baglam(o.a, o.a.ogretim);
    const g = { ad: "P", oneriTurleri: ["kanit_etiketi"], enYuksekRisk: "dusuk", enDusukGuven: 0.8 };
    expect(await hataKodu(politika.politikaTaslagiOlustur(h, g))).toBe("yetki_yok");
  });

  it("ayarlar: yönetici günceller, günlüğe girer; gözlemci güncelleyemez", async () => {
    const y = await o.baglam(o.a, o.a.yonetici);
    const a = await politika.ayarlariGuncelle(y, { yurtDisiIzni: true, kurumKisaAdi: "ÖAÜ-2" });
    expect(a).toMatchObject({ yurtDisiIzni: true, kurumKisaAdi: "ÖAÜ-2", kurumAdi: "Örnek A Üniversitesi" });
    expect(await sonGunluk(o.a.kurumId)).toMatchObject({ eylem: "kurum.ayar_guncellendi", aktorId: o.a.yonetici });
    const g = await o.baglam(o.a, o.a.gozlemci);
    expect(await hataKodu(politika.ayarlariGuncelle(g, { yurtDisiIzni: false }))).toBe("yetki_yok");
    expect(await hataKodu(politika.ayarlariGuncelle(y, { bilinmeyen: 1 }))).toBe("zod");
  });

  it("yz anahtarı: şifreli saklanır, yanıtta ve günlükte görünmez; bağlantı denemesi sahte ağla", async () => {
    const { saglayiciAnahtarKasasi } = await import("@akredit/yz");
    const kasa = saglayiciAnahtarKasasi(new Uint8Array(32).fill(3));
    // Uydurma anahtar; gerçek değildir.
    const ANAHTAR = "sk-or-v1-uydurmauydurmauydurma9876";
    const y = await o.baglam(o.a, o.a.yonetici);
    expect(await hataKodu(politika.yzAnahtariKaydet(y, { anahtar: ANAHTAR }, null))).toBe("kural_ihlali");
    expect(await hataKodu(politika.yzAnahtariKaydet(y, { anahtar: "sk-proj-1" }, kasa))).toBe("gecersiz_istek");
    const a = await politika.yzAnahtariKaydet(y, { anahtar: ANAHTAR }, kasa);
    expect(a.yzSaglayici).toBe("openrouter");
    expect(a.yzAnahtar).toMatchObject({ son4: "9876", model: "openrouter/auto" });
    expect(JSON.stringify(a)).not.toContain("uydurma");
    const g = await sonGunluk(o.a.kurumId);
    expect(g).toMatchObject({ eylem: "kurum.yz_anahtari_kaydedildi" });
    expect(JSON.stringify(g)).not.toContain("uydurma");
    expect(JSON.stringify(g)).not.toContain("9876");
    const [k] = await o.db.select().from(sema.kurum).where(eq(sema.kurum.id, o.a.kurumId));
    expect(JSON.stringify(k?.ayarlar)).not.toContain("uydurma");

    let giden = "";
    const sahte = async (_u: string | URL | Request, i?: RequestInit) => {
      giden = String((i?.headers as Record<string, string>)?.authorization ?? "");
      return new Response(JSON.stringify({ choices: [{ message: { content: "t" } }] }), { status: 200 });
    };
    expect(await politika.yzBaglantiDene(y, { kasa, fetch: sahte as never })).toMatchObject({ tamam: true });
    expect(giden).toBe(`Bearer ${ANAHTAR}`);
    const red = async () => new Response("{}", { status: 401 });
    expect(await politika.yzBaglantiDene(y, { kasa, fetch: red as never })).toMatchObject({ tamam: false });

    const gz = await o.baglam(o.a, o.a.gozlemci);
    expect(await hataKodu(politika.yzAnahtariKaydet(gz, { anahtar: ANAHTAR }, kasa))).toBe("yetki_yok");
    expect((await politika.yzAnahtariKaldir(y)).yzAnahtar).toBeNull();
  });

  it("günlük yalnız gunluk.oku yetkisiyle; zincir sağlam", async () => {
    const l = await panel.gunluk(await o.baglam(o.a, o.a.yonetici), { sinir: 5 });
    expect(l.ogeler.length).toBe(5);
    expect(await hataKodu(panel.gunluk(await o.baglam(o.a, o.a.ogretim)))).toBe("yetki_yok");
    expect(await zinciriDogrula(o.db, o.a.kurumId)).toBeNull();
  });
});

describe("göç 0005: kişi kurum sınırı (inceleme bulgu 1)", () => {
  const ekle = (kurumId: string, is: (tx: Parameters<Parameters<typeof o.db.transaction>[0]>[0]) => Promise<unknown>) =>
    o.db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.kurum_id', ${kurumId}, true)`);
      await is(tx);
    });
  const kod = async (p: Promise<unknown>) => {
    try {
      await p;
      return "yok";
    } catch (e) {
      return (e as { cause?: { code?: string } }).cause?.code ?? (e as { code?: string }).code;
    }
  };

  it("başka kurumun kişisi karar veren olamaz", async () => {
    expect(
      await kod(
        ekle(o.a.kurumId, (tx) =>
          tx.insert(sema.karar).values({
            kurumId: o.a.kurumId,
            oneriId: o.a.oneriOrta2,
            sonuc: "onaylandi",
            kararVerenKisiId: o.b.yonetici,
            dayanak: "dogrudan",
          }),
        ),
      ),
    ).toBe("23514");
  });

  it("başka kurumun kişisi politika imzalayamaz, rol alamaz", async () => {
    expect(
      await kod(
        ekle(o.a.kurumId, (tx) =>
          tx.insert(sema.yetkiPolitikasi).values({
            kurumId: o.a.kurumId,
            ad: "x",
            oneriTurleri: ["kanit_etiketi"],
            enYuksekRisk: "dusuk",
            enDusukGuven: 0.5,
            imzalayanKisiId: o.b.yonetici,
            baslangic: SIMDI,
          }),
        ),
      ),
    ).toBe("23514");
    expect(
      await kod(
        ekle(o.a.kurumId, (tx) =>
          tx.insert(sema.rolAtamasi).values({
            kurumId: o.a.kurumId,
            kisiId: o.b.yonetici,
            rol: "gozlemci",
            kapsamTuru: "kurum",
            kapsamId: o.a.kurumId,
          }),
        ),
      ),
    ).toBe("23514");
    // Aynı kurumun kişisi kabul edilir.
    expect(
      await kod(
        ekle(o.a.kurumId, (tx) =>
          tx.update(sema.gorev).set({ atananKisiId: o.a.yonetici }).where(eq(sema.gorev.kurumId, o.a.kurumId)),
        ),
      ),
    ).toBe("yok");
  });
});
