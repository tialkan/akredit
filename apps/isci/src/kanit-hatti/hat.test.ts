import { type SorguSonucu, satirlar, sema, zinciriDogrula } from "@akredit/vt";
import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { kanitAl, zipAl } from "./alma.ts";
import { durumGecmisi, durumOzeti } from "./durum.ts";
import { OLU_ILETI } from "./index.ts";
import { islevOcr } from "./ocr.ts";
import { pdfOlustur } from "./test/pdf-yardimci.ts";
import { hatKur, KURUM, KURUM_B, karisikPaket, sahteYz, UYDURMA_TCKN, zipYap } from "./test/yardimci.ts";

const metin = (s: string) => new TextEncoder().encode(s);
let kapat: (() => Promise<void>) | undefined;
afterEach(async () => {
  await kapat?.();
  kapat = undefined;
});

async function say(db: Parameters<typeof durumOzeti>[0], tablo: string): Promise<number> {
  const r = satirlar(
    (await db.execute(sql.raw(`select count(*)::int as n from ${tablo}`))) as unknown as SorguSonucu<{ n: number }>,
  );
  return r[0]?.n ?? 0;
}

describe("uçtan uca kanıt hattı", () => {
  it("100 belgelik karışık ZIP paketini işler; bozuk dosya hattı durdurmaz", async () => {
    const ocrSayfalari = islevOcr("sahte-ocr", () => [
      { sayfa: 1, metin: "Taranmış imza listesi: kalite komisyonu üyeleri." },
    ]);
    const h = await hatKur({ ocr: ocrSayfalari });
    kapat = h.kapat;
    const paket = await karisikPaket(100);
    const zip = zipYap(Object.fromEntries(paket.map((p) => [`klasor/${p.ad}`, p.veri])));
    const alma = await zipAl(h.b, { kurumId: KURUM, kaynakTuru: "yukleme", veri: zip, paketAdi: "paket.zip" });
    expect(alma.uyarilar).toEqual([]);
    expect(alma.dosyalar).toHaveLength(100);
    expect(alma.dosyalar.every((d) => d.durum === "eklendi")).toBe(true);

    await h.kuyruk.bosalt();
    expect(h.kuyruk.olu).toEqual([]);

    const ozet = await durumOzeti(h.db, KURUM);
    expect(ozet.kanitlar).toHaveLength(100);
    const beklenenHata = paket.filter((p) => p.beklenen === "hata").length; // i % 9 === 8 → 11 belge
    const beklenenKv = paket.filter((p) => p.kisiselVeri).length;
    expect(beklenenHata).toBe(11);
    expect(ozet.sayac).toEqual({
      isleniyor: 0,
      tamam: 100 - beklenenHata,
      hata: beklenenHata,
      ocr_bekliyor: 0,
      kisisel_veri: beklenenKv,
    });
    for (const k of ozet.kanitlar) {
      const p = paket.find((x) => x.ad === k.dosyaAdi);
      expect(p, k.dosyaAdi).toBeDefined();
      if (p?.beklenen === "hata") {
        expect(k.durum).toBe("hata");
        expect(k.ileti).toMatch(/[a-zçğıöşü]/u);
      } else expect([k.dosyaAdi, k.asama]).toEqual([k.dosyaAdi, "tamam"]);
    }
    // Her işlenen belge için bir kanıt etiketi önerisi; atıflı ve insan onayını bekliyor.
    expect(await say(h.db, "oneri")).toBe(100 - beklenenHata);
    expect(await say(h.db, "karar")).toBe(0);
    const parcaSayisi = await say(h.db, "kanit_parcasi");
    expect(parcaSayisi).toBeGreaterThanOrEqual(100 - beklenenHata);
    const gommesiz = satirlar(
      (await h.db.execute(
        sql`select count(*)::int as n from kanit_parcasi where gomme is null`,
      )) as unknown as SorguSonucu<{ n: number }>,
    );
    expect(gommesiz[0]?.n).toBe(0);
    expect(await zinciriDogrula(h.db, KURUM)).toBeNull();
  }, 180_000);
});

describe("tekilleştirme", { timeout: 60_000 }, () => {
  it("aynı içerik ikinci kez kanıt olmaz (ad, kaynak ve yükleme yolu farklı olsa da)", async () => {
    const h = await hatKur();
    kapat = h.kapat;
    const veri = metin("Danışma kurulu toplantı tutanağı.");
    const a = await kanitAl(h.b, { kurumId: KURUM, veri, dosyaAdi: "a.txt", kaynakTuru: "yukleme" });
    const b = await kanitAl(h.b, { kurumId: KURUM, veri, dosyaAdi: "b.txt", kaynakTuru: "eposta" });
    const z = await zipAl(h.b, {
      kurumId: KURUM,
      kaynakTuru: "yukleme",
      veri: zipYap({ "c.txt": veri }),
      paketAdi: "p.zip",
    });
    expect(a.durum).toBe("eklendi");
    expect(b).toEqual({
      durum: "zaten_var",
      kanitId: a.durum === "eklendi" ? a.kanitId : "",
      ozet: (a as { ozet: string }).ozet,
    });
    expect(z.dosyalar[0]?.durum).toBe("zaten_var");
    expect(await say(h.db, "kanit")).toBe(1);
    expect(h.depo.nesneler.size).toBe(1);
    await h.kuyruk.bosalt();
    // Kuyruğa yalnız bir kez girdi: tek öneri.
    expect(await say(h.db, "oneri")).toBe(1);
  });

  it("başka kurumun aynı içeriği ayrı kanıttır (kiracı yalıtımı)", async () => {
    const h = await hatKur();
    kapat = h.kapat;
    const veri = metin("Ortak yönetmelik metni.");
    const a = await kanitAl(h.b, { kurumId: KURUM, veri, dosyaAdi: "y.txt", kaynakTuru: "yukleme" });
    const b = await kanitAl(h.b, { kurumId: KURUM_B, veri, dosyaAdi: "y.txt", kaynakTuru: "yukleme" });
    expect(a.durum).toBe("eklendi");
    expect(b.durum).toBe("eklendi");
    await h.kuyruk.bosalt();
    expect((await durumOzeti(h.db, KURUM)).kanitlar).toHaveLength(1);
    expect((await durumOzeti(h.db, KURUM_B)).kanitlar).toHaveLength(1);
  });

  it("kanıt satırı değiştirilemez ve silinemez", async () => {
    const h = await hatKur();
    kapat = h.kapat;
    await kanitAl(h.b, { kurumId: KURUM, veri: metin("x belge"), dosyaAdi: "x.txt", kaynakTuru: "yukleme" });
    await expect(h.db.execute(sql`update kanit set dosya_adi = 'baska'`)).rejects.toThrow();
    await expect(h.db.execute(sql`delete from kanit`)).rejects.toThrow();
  });
});

describe("kişisel veri", { timeout: 60_000 }, () => {
  const kvMetni = `Öğrenci ${UYDURMA_TCKN} kimlik numarasıyla başvurdu; e-posta deneme@ornek.edu.tr adresidir.`;

  it("kişisel veri içeren belge işaretlenir ve günlüğe girer", async () => {
    const h = await hatKur();
    kapat = h.kapat;
    const a = await kanitAl(h.b, {
      kurumId: KURUM,
      veri: metin(kvMetni),
      dosyaAdi: "basvuru.txt",
      kaynakTuru: "yukleme",
    });
    const t = await kanitAl(h.b, {
      kurumId: KURUM,
      veri: metin("Kişisel veri yok."),
      dosyaAdi: "temiz.txt",
      kaynakTuru: "yukleme",
    });
    await h.kuyruk.bosalt();
    const o = await durumOzeti(h.db, KURUM);
    const bul = (id: string) => o.kanitlar.find((k) => k.kanitId === id);
    expect(bul((a as { kanitId: string }).kanitId)?.kisiselVeri).toBe("var");
    expect(bul((t as { kanitId: string }).kanitId)?.kisiselVeri).toBe("yok");
    const gecmis = await durumGecmisi(h.db, KURUM, (a as { kanitId: string }).kanitId);
    const kvkk = gecmis.find((g) => g.ayrinti.asama === "kvkk");
    expect(kvkk?.ayrinti.turler).toEqual({ TCKN: 1, EPOSTA: 1 });
    // Değerin kendisi durum kaydına yazılmaz.
    expect(JSON.stringify(gecmis)).not.toContain(UYDURMA_TCKN);
    const g = satirlar(
      (await h.db.execute(
        sql`select count(*)::int as n from gunluk where eylem = 'kanit.kisisel_veri_isaretlendi'`,
      )) as unknown as SorguSonucu<{ n: number }>,
    );
    expect(g[0]?.n).toBe(1);
  });

  it("izinsiz kurumda yurt dışı sağlayıcıya hiç gitmez", async () => {
    const yz = sahteYz({ yurtIci: false });
    const h = await hatKur({ saglayici: yz, yzAyari: async () => ({ yurtDisiIzin: false }) });
    kapat = h.kapat;
    const a = await kanitAl(h.b, { kurumId: KURUM, veri: metin(kvMetni), dosyaAdi: "b.txt", kaynakTuru: "yukleme" });
    await h.kuyruk.bosalt();
    expect(yz.istekler).toHaveLength(0);
    expect(yz.gommeGirdileri).toHaveLength(0);
    const gecmis = await durumGecmisi(h.db, KURUM, (a as { kanitId: string }).kanitId);
    expect(gecmis.at(-1)?.ayrinti).toMatchObject({ asama: "tamam", atlandi: "politika" });
    expect(await say(h.db, "oneri")).toBe(0);
  });

  it("izinli kurumda yurt dışı sağlayıcıya yalnız maskeli metin gider; saklanan parça özgündür", async () => {
    const yz = sahteYz({ yurtIci: false });
    const h = await hatKur({ saglayici: yz, yzAyari: async () => ({ yurtDisiIzin: true }) });
    kapat = h.kapat;
    await kanitAl(h.b, { kurumId: KURUM, veri: metin(kvMetni), dosyaAdi: "c.txt", kaynakTuru: "yukleme" });
    await h.kuyruk.bosalt();
    const giden = JSON.stringify(yz.istekler) + yz.gommeGirdileri.join("\n");
    expect(yz.istekler.length).toBeGreaterThan(0);
    expect(yz.gommeGirdileri.length).toBeGreaterThan(0);
    expect(giden).not.toContain(UYDURMA_TCKN);
    expect(giden).not.toContain("deneme@ornek.edu.tr");
    expect(giden).toContain("[TCKN-1]");
    const [p] = await h.db.select().from(sema.kanitParcasi);
    expect(p?.metin).toContain(UYDURMA_TCKN);
  });
});

describe("hata yönetimi", { timeout: 60_000 }, () => {
  it("tekrar tekrar başarısız olan iş ölü mektup kuyruğuna düşer ve durum hataya geçer", async () => {
    let cagri = 0;
    const ocr = islevOcr("bozuk-ocr", () => {
      cagri++;
      throw new Error("motor çöktü");
    });
    const h = await hatKur({ ocr });
    kapat = h.kapat;
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 7]);
    const a = await kanitAl(h.b, { kurumId: KURUM, veri: png, dosyaAdi: "t.png", kaynakTuru: "yukleme" });
    const t = await kanitAl(h.b, {
      kurumId: KURUM,
      veri: metin("Sağlam belge."),
      dosyaAdi: "s.txt",
      kaynakTuru: "yukleme",
    });
    await h.kuyruk.bosalt();
    expect(cagri).toBe(2); // ilk deneme + 1 yeniden deneme
    expect(h.kuyruk.olu).toHaveLength(1);
    expect(h.kuyruk.olu[0]?.kuyruk).toBe("kanit.ocr.olu");
    const o = await durumOzeti(h.db, KURUM);
    const hatali = o.kanitlar.find((k) => k.kanitId === (a as { kanitId: string }).kanitId);
    expect(hatali).toMatchObject({ durum: "hata", asama: "ocr", ileti: OLU_ILETI });
    expect(o.kanitlar.find((k) => k.kanitId === (t as { kanitId: string }).kanitId)?.asama).toBe("tamam");
  });

  it("OCR motoru yoksa belge OCR beklemede kalır", async () => {
    const h = await hatKur();
    kapat = h.kapat;
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 8]);
    await kanitAl(h.b, { kurumId: KURUM, veri: png, dosyaAdi: "t.png", kaynakTuru: "yukleme" });
    await h.kuyruk.bosalt();
    const o = await durumOzeti(h.db, KURUM);
    expect(o.sayac.ocr_bekliyor).toBe(1);
    expect(o.kanitlar[0]?.ileti).toMatch(/taranmış/u);
  });

  it("YZ güvenilir çıktı veremezse belge insana devredilir, hat sürer", async () => {
    const { sahteSaglayici } = await import("@akredit/yz");
    const bozuk = Object.assign(sahteSaglayici(["bu json değil"], { sonuTekrarla: true }), {
      gomme: async (m: string[]) => m.map(() => new Array(1024).fill(0.5)),
    });
    const h = await hatKur({ saglayici: bozuk });
    kapat = h.kapat;
    await kanitAl(h.b, {
      kurumId: KURUM,
      veri: pdfOlustur([["Senato kararı metni: ders planlarının güncellenmesi kabul edildi."]]),
      dosyaAdi: "k.pdf",
      kaynakTuru: "yukleme",
    });
    await h.kuyruk.bosalt();
    const o = await durumOzeti(h.db, KURUM);
    expect(o.kanitlar[0]).toMatchObject({ asama: "tamam" });
    expect(o.kanitlar[0]?.ileti).toMatch(/kişinin/u);
    expect(await say(h.db, "oneri")).toBe(0);
  });

  it("YZ yoksa gömmesiz parçalar yazılır ve öneri atlanır", async () => {
    const h = await hatKur({ saglayici: undefined });
    kapat = h.kapat;
    await kanitAl(h.b, { kurumId: KURUM, veri: metin("Yönerge metni."), dosyaAdi: "y.txt", kaynakTuru: "uretilen" });
    await h.kuyruk.bosalt();
    const [p] = await h.db.select().from(sema.kanitParcasi);
    expect(p?.gomme).toBeNull();
    expect((await durumOzeti(h.db, KURUM)).kanitlar[0]?.ileti).toMatch(/öneri/u);
  });
});
