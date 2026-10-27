// Bologna otomasyonu uçtan uca (PGlite + sahte YZ + bellek depo): okuma → toplu denetim ve önce/sonra →
// atıflı YZ taslağı → onay kutusu → yazma planı önerisi → plan onayı → tarayıcı ajanına alanlar. Adlar uydurmadır.

import { type BolognaOkunanDers, type BolognaVerisi, ozetHesapla } from "@akredit/cekirdek";
import { kiraciIslemi, sema } from "@akredit/vt";
import { bolognaOrnek, sahteSaglayici } from "@akredit/yz";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ortam, SIMDI } from "../../test/yardimci.ts";
import type { ServisBaglami } from "../baglam.ts";
import { ServisHatasi } from "../hata.ts";
import * as oneri from "../oneri.ts";
import * as bologna from "./index.ts";

let o: Awaited<ReturnType<typeof ortam>>;
let tbpId: string;
let yonetici: ServisBaglami;
let hoca: ServisBaglami;
const depoNesneleri = new Map<string, Uint8Array>();

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

const ornekTaslak = () => bolognaOrnek.ornekCikti();

function ders(kod: string, ad: string, bilgiler: Record<string, string>): BolognaOkunanDers {
  return {
    kod,
    ad,
    zorunlu: true,
    bos: false,
    kaynak: `https://bologna.ornek.edu.tr/ders/${kod}`,
    yariyil: 3,
    tul: "2+1+0",
    kredi: 3,
    akts: 5,
    bilgiler,
    degerlendirme: [{ ad: "Ara Sınav", sayi: 1, katki: 40 }],
    isyuku: [{ ad: "Ders Süresi", sayi: 14, sure: 3, toplam: 42 }],
    dersYapisi: [],
    ciktilar: [{ kod: "Ö1", metin: "Web sayfası geliştirir." }],
    haftalar: 14,
    katki: {},
  };
}

/** Kurgu Bologna okuması. `degisik` ikinci okumada BPA102'nin matris satırını doldurur (önce/sonra için). */
function okuma(okundu: string, degisik = false): BolognaVerisi {
  const pler = bolognaOrnek.ornekGirdi().sabit.programCiktilari;
  const c = ornekTaslak();
  return {
    adres: "https://bologna.ornek.edu.tr/program",
    okundu,
    programCiktilari: pler.map((p) => ({ kod: p, metin: `${p} program çıktısı metni.` })),
    matris: {
      pkodlar: pler,
      dersler: [
        {
          kod: "TBP201",
          ad: "İnternet Programlama",
          zorunlu: true,
          grup: null,
          yariyil: 3,
          grupBasligi: false,
          degerler: { P1: "3", P2: "2" },
        },
        {
          kod: "BPA102",
          ad: "Veri Tabanı",
          zorunlu: true,
          grup: null,
          yariyil: 2,
          grupBasligi: false,
          degerler: degisik ? { P1: "4" } : {},
        },
      ],
    },
    tyycIsaret: 5,
    dersler: [
      ders("TBP201", "İnternet Programlama", {
        Amaç: c.amac.tr,
        İçerik: c.icerik.tr,
        Kaynaklar: "JavaScript: The Definitive Guide; HTML and CSS: Design and Build Websites",
        "Dersin Koordinatörü": "Uydurma Koordinatör",
      }),
      ders("BPA102", "Veri Tabanı", { Amaç: "", Kaynaklar: "Uydurma Veri Tabanı Kitabı" }),
    ],
  };
}

beforeAll(async () => {
  o = await ortam();
  await kiraciIslemi(o.db, o.a.kurumId, async (tx) => {
    const [d] = await tx
      .insert(sema.ders)
      .values({
        kurumId: o.a.kurumId,
        programId: o.a.programId,
        kod: "TBP201",
        ad: "İnternet Programlama",
        akts: 5,
        teorik: 2,
        uygulama: 1,
        yariyil: 3,
      })
      .returning();
    tbpId = d?.id as string;
    await tx.insert(sema.rolAtamasi).values({
      kurumId: o.a.kurumId,
      kisiId: o.a.ogretim,
      rol: "ogretim_elemani",
      kapsamTuru: "ders",
      kapsamId: tbpId,
      baslangic: new Date("2026-01-01T00:00:00Z"),
    });
    await tx.update(sema.kisi).set({ eposta: "deneme.hoca@ornek.edu.tr" }).where(eq(sema.kisi.id, o.a.ogretim));
  });
  yonetici = await o.baglam(o.a, o.a.yonetici);
  hoca = await o.baglam(o.a, o.a.ogretim);
  bologna.bolognaKoprusuAyarla({
    oku: null,
    depo: {
      async koy(kurumId, veri) {
        const ozet = ozetHesapla(veri);
        depoNesneleri.set(`${kurumId}/${ozet}`, veri);
        return { ozet, anahtar: `${kurumId}/${ozet}` };
      },
    },
    saglayici: null,
  });
});
afterAll(async () => {
  await o.kapat();
});

/** Sahte sağlayıcı: istemdeki okuma özetini bulup örnek taslağı o özetle atıflandırır. */
function saglayici(degistir?: (c: ReturnType<typeof ornekTaslak>) => void, kodu = "TBP201") {
  return sahteSaglayici(
    [
      (istek) => {
        const m = JSON.stringify(istek.mesajlar).match(/\[K:([0-9a-f]{8}) b\.program\./u);
        const c = bolognaOrnek.ornekCikti((m?.[1] ?? "00000000").padEnd(64, "0"), kodu);
        c.dayanaklar = c.dayanaklar.map((d) => ({ ...d, atif: d.atif.replace(".amac]", ".amac]") }));
        degistir?.(c);
        return JSON.stringify(c);
      },
    ],
    { sonuTekrarla: true },
  );
}

describe("Bologna otomasyonu uçtan uca", () => {
  let okuma1: string;
  let taslakId: string;
  let planId: string;

  it("okuma kanıt olur: özetli dosya, kişi alanı parçalara girmez; aynı içerik ikinci kez eklenmez", async () => {
    const s = await bologna.okumaKaydet(yonetici, o.a.programId, { veri: okuma("2026-10-01T08:00:00Z") });
    expect(s.yeni).toBe(true);
    expect(s.dersSayisi).toBe(2);
    okuma1 = s.kanitId;
    expect(depoNesneleri.size).toBe(1);
    const parcalar = await kiraciIslemi(o.db, o.a.kurumId, (tx) =>
      tx.select().from(sema.kanitParcasi).where(eq(sema.kanitParcasi.kanitId, s.kanitId)),
    );
    const bolumler = parcalar.map((p) => (p.capa as { bolum: string }).bolum);
    expect(bolumler).toContain("TBP201.amac");
    expect(bolumler).toContain("program.P1");
    expect(bolumler.some((b) => b.includes("koordinator"))).toBe(false);
    const tekrar = await bologna.okumaKaydet(yonetici, o.a.programId, { veri: okuma("2026-10-01T08:00:00Z") });
    expect(tekrar).toMatchObject({ yeni: false, kanitId: s.kanitId });
  });

  it("ağdan okuma bağlı değilse ne yapılacağını söyler; hoca program okuması yapamaz", async () => {
    expect(await kod(bologna.okumaKaydet(yonetici, o.a.programId, {}))).toBe("gecersiz_istek");
    expect(await kod(bologna.okumaKaydet(hoca, o.a.programId, { veri: okuma("2026-10-02T08:00:00Z") }))).toBe(
      "yetki_yok",
    );
  });

  it("toplu denetim ve önce/sonra karşılaştırması", async () => {
    const ilk = await bologna.programDenetimi(yonetici, o.a.programId);
    expect(ilk.okuma?.kanitId).toBe(okuma1);
    expect(ilk.oncekiOkuma).toBeNull();
    // BPA102: zorunlu dersin matris satırı boş → hata.
    expect(ilk.bulgular.some((b) => b.konu === "BPA102" && b.kural === "matris-bos")).toBe(true);
    await bologna.okumaKaydet(yonetici, o.a.programId, { veri: okuma("2026-10-20T08:00:00Z", true) });
    const son = await bologna.programDenetimi(yonetici, o.a.programId);
    expect(son.oncekiOkuma?.kanitId).toBe(okuma1);
    const bpa = son.dersler.find((d) => d.kod === "BPA102");
    expect(bpa?.degisim).toBe("iyilesti");
    expect((bpa?.once?.hata ?? 0) - (bpa?.sonra.hata ?? 0)).toBe(1);
  });

  it("YZ bağlı değilse taslak üretilmez", async () => {
    expect(await kod(bologna.taslakUret(hoca, { dersId: tbpId }))).toBe("gecersiz_istek");
  });

  it("örnek taslak K1-K12'den hatasız geçer, atıflı öneri olarak onay kutusuna düşer", async () => {
    bologna.bolognaKoprusuAyarla({ saglayici: saglayici() });
    const s = await bologna.taslakUret(hoca, { dersId: tbpId, beyan: "Dönem projesi var, Flutter yok." });
    expect(s.denetim.hata).toBe(0);
    expect(s.atifSorunlari).toEqual([]);
    expect(s.fark.map((f) => f.alan)).toContain("amac");
    // K10: yetkililer oturumdaki hocadan, modelden değil.
    expect(JSON.stringify(s.taslak)).toContain("deneme.hoca@ornek.edu.tr");
    taslakId = s.oneriId;
    const [r] = await kiraciIslemi(o.db, o.a.kurumId, (tx) =>
      tx.select().from(sema.oneri).where(eq(sema.oneri.id, s.oneriId)),
    );
    expect(r).toMatchObject({ tur: "bologna_taslagi", risk: "orta", ureticiTuru: "yz", hedefId: tbpId });
    expect(((r?.atiflar ?? []) as unknown[]).length).toBeGreaterThanOrEqual(7);
    // Beyan da kanıt oldu.
    const beyanlar = await kiraciIslemi(o.db, o.a.kurumId, (tx) =>
      tx.select().from(sema.kanit).where(eq(sema.kanit.dosyaAdi, "hoca-beyani.txt")),
    );
    expect(beyanlar).toHaveLength(1);
  });

  it("ders adıyla tutarsız (kopya) içerik uyarı alır", async () => {
    bologna.bolognaKoprusuAyarla({ saglayici: saglayici(undefined, "BPA102") });
    // Veri Tabanı dersine İnternet Programlama içeriği: ad tutarsızlığı ve TBP201 ile kopya.
    const s = await bologna.taslakUret(hoca, { dersId: o.a.dersId });
    const k1 = s.denetim.bulgular.filter((b) => b.kural === "K1");
    expect(k1.some((b) => b.aciklama.includes("ders adındaki"))).toBe(true);
    expect(k1.some((b) => b.aciklama.includes("TBP201"))).toBe(true);
    expect(k1.every((b) => b.duzey === "uyari")).toBe(true);
  });

  it("yazma planı taslak onaylanmadan açılmaz", async () => {
    expect(await kod(bologna.yazmaPlaniOner(hoca, taslakId, { adres: "https://obs.ornek.edu.tr/ders/1" }))).toBe(
      "kural_ihlali",
    );
  });

  it("onaylı taslaktan yüksek riskli yazma planı önerisi açılır; ikinci kez açılmaz", async () => {
    await oneri.kararVer(hoca, { oneriId: taslakId, sonuc: "onaylandi" });
    const p = await bologna.yazmaPlaniOner(hoca, taslakId, { adres: "https://obs.ornek.edu.tr/ders/1" });
    expect(p.alanSayisi).toBeGreaterThan(50);
    planId = p.oneriId;
    const [r] = await kiraciIslemi(o.db, o.a.kurumId, (tx) =>
      tx.select().from(sema.oneri).where(eq(sema.oneri.id, planId)),
    );
    expect(r).toMatchObject({ tur: "yazma_plani", risk: "yuksek" });
    expect(await kod(bologna.yazmaPlaniOner(hoca, taslakId, { adres: "https://obs.ornek.edu.tr/ders/1" }))).toBe(
      "cakisma",
    );
  });

  it("yazma planı onaysız çalışmaz; toplu onaylanamaz", async () => {
    expect(await kod(bologna.yazmaPlaniAl(hoca, planId))).toBe("kural_ihlali");
    const doldurulan: string[] = [];
    expect(
      await kod(bologna.yazmaPlaniUygula(hoca, planId, { doldur: async (a) => void doldurulan.push(a.alan) })),
    ).toBe("kural_ihlali");
    expect(doldurulan).toEqual([]);
    expect(await kod(oneri.topluKararVer(hoca, { oneriIdleri: [planId] }))).not.toBe("hata yok");
  });

  it("onaydan sonra alanlar tarayıcı ajanına gider; süre dolunca çalışmaz; günlükte iz kalır", async () => {
    await oneri.kararVer(hoca, { oneriId: planId, sonuc: "onaylandi" });
    const plan = await bologna.yazmaPlaniAl(hoca, planId);
    expect(plan.onaylayan).toBe("Deneme Hoca A");
    expect(plan.kopyalanabilir).toContain("### Dersin Amacı");
    expect(plan.sonAdim).toContain("Kaydet");
    const doldurulan: string[] = [];
    const u = await bologna.yazmaPlaniUygula(hoca, planId, { doldur: async (a) => void doldurulan.push(a.alan) });
    expect(u.doldurulan).toBe(plan.alanlar.length);
    expect(doldurulan).toHaveLength(plan.alanlar.length);
    const gec = { ...hoca, simdi: () => new Date(SIMDI.getTime() + 2 * 3600_000) };
    expect(await kod(bologna.yazmaPlaniAl(gec, planId))).toBe("kural_ihlali");
    await bologna.yazmaBitir(hoca, planId, { sonuc: "tamamlandi" });
    const gunluk = await kiraciIslemi(o.db, o.a.kurumId, (tx) =>
      tx.select().from(sema.gunluk).where(eq(sema.gunluk.hedefId, planId)),
    );
    expect(gunluk.map((g) => g.eylem)).toEqual(
      expect.arrayContaining(["bologna.yazma_plani_acildi", "bologna.yazma_basladi", "bologna.yazma_bitti"]),
    );
  });

  it("parola alanına yazılamaz: plan kurulamaz, kayıtlı planda varsa çalışmaz", async () => {
    const t = { ...(await taslakIcerigi(taslakId)), yetkililer: [{ rol: "OBS Şifresi", ad: "x", eposta: "y" }] };
    expect(() => bologna.yazmaPlaniKur(t, "deneme")).toThrow(bologna.GirisAlaniHatasi);
    // Doğrudan veritabanına yazılmış (servisi atlayan) bir planda parola alanı olsa da çalışmaz.
    const [p] = await kiraciIslemi(o.db, o.a.kurumId, (tx) =>
      tx
        .insert(sema.oneri)
        .values({
          kurumId: o.a.kurumId,
          tur: "yazma_plani",
          hedefTuru: "ders",
          hedefId: tbpId,
          icerik: {
            baslik: "x",
            metin: "x",
            sistem: "OBS",
            adres: "https://obs.ornek.edu.tr/",
            dersKodu: "TBP201",
            taslakOneriId: taslakId,
            alanlar: [{ sekme: "Giriş", alan: "Parola", deger: "gizli", kaynak: "x" }],
          },
          gerekce: "x",
          ureticiTuru: "kural",
          uretici: { kural: "deneme" },
          risk: "yuksek",
        })
        .returning(),
    );
    await oneri.kararVer(hoca, { oneriId: p?.id as string, sonuc: "onaylandi" });
    const doldurulan: string[] = [];
    expect(
      await kod(bologna.yazmaPlaniUygula(hoca, p?.id as string, { doldur: async (a) => void doldurulan.push(a.alan) })),
    ).toBe("kural_ihlali");
    expect(doldurulan).toEqual([]);
  });

  it("taslak geçmişi: hangi alan neden değişti", async () => {
    bologna.bolognaKoprusuAyarla({
      saglayici: saglayici((c) => {
        c.ska = [4, 9, 8];
      }),
    });
    await bologna.taslakUret(hoca, { dersId: tbpId });
    const g = await bologna.taslakGecmisi(hoca, tbpId);
    expect(g).toHaveLength(2);
    expect(g[0]).toMatchObject({ karar: "onaylandi", yazmaPlaniId: planId });
    expect(g[1]?.fark).toEqual([{ alan: "ska", neden: ["Hoca beyanı ya da yeniden üretim."] }]);
    expect(await kod(bologna.taslakGecmisi(await o.baglam(o.b, o.b.yonetici), tbpId))).toBe("bulunamadi");
  });
});

async function taslakIcerigi(id: string) {
  const [r] = await kiraciIslemi(o.db, o.a.kurumId, (tx) => tx.select().from(sema.oneri).where(eq(sema.oneri.id, id)));
  return ((r?.icerik ?? {}) as { taslak: Parameters<typeof bologna.yazmaPlaniKur>[0] }).taslak;
}
