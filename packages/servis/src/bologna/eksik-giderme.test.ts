// Bologna eksik giderme (İP-37): son okumanın bulguları + deterministik hesaplar → düzeltme taslağı önerisi.
// PGlite + sahte YZ. Adlar ve adresler uydurmadır.

import { type BolognaVerisi, ozetHesapla } from "@akredit/cekirdek";
import { kiraciIslemi, sema } from "@akredit/vt";
import { bolognaOrnek, sahteSaglayici } from "@akredit/yz";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ortam } from "../../test/yardimci.ts";
import type { ServisBaglami } from "../baglam.ts";
import { ServisHatasi } from "../hata.ts";
import { deterministikHesaplar, disKopyaUyarilari, eksikleriGider } from "./eksik-giderme.ts";
import * as bologna from "./index.ts";

let o: Awaited<ReturnType<typeof ortam>>;
let yonetici: ServisBaglami;
let hoca: ServisBaglami;
const ornek = bolognaOrnek.ornekCikti();
// Dış örneğin alıntısı, örnek taslağın amaç cümlesinin kendisi: kopya uyarısı beklenir.
const DIS_ALINTI = ornek.amac.tr.split(/(?<=\.)\s+/u)[0] as string;

function okuma(): BolognaVerisi {
  const pler = bolognaOrnek.ornekGirdi().sabit.programCiktilari;
  return {
    adres: "https://bologna.ornek.edu.tr/program",
    okundu: "2026-10-20T08:00:00Z",
    programCiktilari: pler.map((p) => ({ kod: p, metin: `${p} program çıktısı metni.` })),
    matris: {
      pkodlar: pler,
      dersler: [
        { kod: "BPA102", ad: "Veri Tabanı", zorunlu: true, grup: null, yariyil: 2, grupBasligi: false, degerler: {} },
      ],
    },
    tyycIsaret: 5,
    dersler: [
      {
        kod: "BPA102",
        ad: "Veri Tabanı",
        zorunlu: true,
        bos: false,
        kaynak: "https://bologna.ornek.edu.tr/ders/BPA102",
        yariyil: 2,
        tul: "2+1+0",
        kredi: 3,
        akts: 5,
        bilgiler: { Amaç: "Veri tabanı tasarımı ve SQL." },
        degerlendirme: [{ ad: "Ara Sınav", sayi: 1, katki: 40 }],
        isyuku: [{ ad: "Ders Süresi", sayi: 14, sure: 3, toplam: 42 }],
        dersYapisi: [],
        ciktilar: [{ kod: "Ö1", metin: "SQL sorgusu yazar." }],
        haftalar: 10,
        katki: {},
      },
    ],
  };
}

beforeAll(async () => {
  o = await ortam();
  await kiraciIslemi(o.db, o.a.kurumId, async (tx) => {
    await tx.update(sema.kisi).set({ eposta: "deneme.hoca@ornek.edu.tr" }).where(eq(sema.kisi.id, o.a.ogretim));
    await tx.update(sema.ders).set({ teorik: 2, uygulama: 1 }).where(eq(sema.ders.id, o.a.dersId));
    await tx.insert(sema.oneri).values({
      kurumId: o.a.kurumId,
      tur: "dis_ornek",
      hedefTuru: "ders",
      hedefId: o.a.dersId,
      icerik: {
        baslik: "Başka kurumdan örnek",
        metin: "Kanıt değildir.",
        kanitDegildir: true,
        olcutKod: "B.1.5",
        adres: "https://baska.edu.tr/bologna/veri-tabani",
        kaynakBaslik: "Veri Tabanı ders bilgi paketi",
        alinti: DIS_ALINTI,
        erisim: "2026-10-28T09:00:00.000Z",
      },
      gerekce: "Örnek.",
      atiflar: [],
      ureticiTuru: "yz",
      uretici: {},
      risk: "orta",
    });
  });
  yonetici = await o.baglam(o.a, o.a.yonetici);
  hoca = await o.baglam(o.a, o.a.ogretim);
});
afterAll(async () => {
  await o.kapat();
});

describe("deterministik hesaplar", () => {
  it("elle doğrulanmış örnek: AKTS 5 → 150 saat; okumadaki iş yükü 14 × 3 = 42", () => {
    const h = deterministikHesaplar({ akts: 5, teorik: 2, uygulama: 1, laboratuvar: 0 }, okuma().dersler[0] as never);
    expect(h).toEqual(
      expect.arrayContaining([
        { ad: "Hedef toplam iş yükü (AKTS × 30)", deger: "150 saat" },
        { ad: "Haftalık ders süresi (T+U+L)", deger: "3 saat" },
        { ad: "Okumadaki iş yükü toplamı", deger: "42 saat" },
        { ad: "Okumadaki değerlendirme katkıları toplamı", deger: "%40" },
        { ad: "Okumadaki öğrenme çıktısı sayısı", deger: "1" },
        { ad: "Okumadaki hafta sayısı", deger: "10" },
      ]),
    );
  });

  it("dış örnekten kopya cümle uyarı alır, özgün metin almaz", () => {
    const t = bolognaOrnek.ornekCikti() as unknown as Parameters<typeof disKopyaUyarilari>[0];
    const t2 = { ...t, ciktilar: [], haftalar: [] };
    expect(disKopyaUyarilari(t2, [{ adres: "https://x.edu.tr", alinti: DIS_ALINTI }]).map((b) => b.konu)).toEqual([
      "amac",
    ]);
    expect(
      disKopyaUyarilari(t2, [
        { adres: "https://x.edu.tr", alinti: "Tamamen farklı konuda yazılmış bir örnek cümle burada." },
      ]),
    ).toEqual([]);
  });
});

describe("eksik giderme uçtan uca", () => {
  it("okuma yoksa ne yapılacağını söyler", async () => {
    bologna.bolognaKoprusuAyarla({ saglayici: sahteSaglayici([]) });
    await expect(eksikleriGider(hoca, { dersId: o.a.dersId })).rejects.toThrow(/henüz okunmadı/u);
  });

  it("bulgular ve sayılar istemde; dış örnek modele gitmez; öneri onay kutusuna düşer, kaynakça işaretli", async () => {
    bologna.bolognaKoprusuAyarla({
      oku: null,
      depo: {
        async koy(kurumId, veri) {
          const ozet = ozetHesapla(veri);
          return { ozet, anahtar: `${kurumId}/${ozet}` };
        },
      },
    });
    await bologna.okumaKaydet(yonetici, o.a.programId, { veri: okuma() });
    const s = sahteSaglayici(
      [
        (istek) => {
          const m = JSON.stringify(istek.mesajlar).match(/\[K:([0-9a-f]{8}) b\.program\./u);
          return JSON.stringify(bolognaOrnek.ornekCikti((m?.[1] ?? "0").padEnd(64, "0"), "BPA102"));
        },
      ],
      { sonuTekrarla: true },
    );
    bologna.bolognaKoprusuAyarla({ saglayici: s });
    const r = await eksikleriGider(hoca, { dersId: o.a.dersId });
    const kurallar = r.giderilecek.map((b) => b.kural);
    expect(kurallar).toEqual(expect.arrayContaining(["akts-isyuku", "degerlendirme", "haftalar", "matris-bos"]));
    const istem = JSON.stringify(s.istekler[0]?.mesajlar);
    expect(istem).toContain("Giderilecek eksikler");
    expect(istem).toContain("Hedef toplam iş yükü (AKTS × 30): 150 saat");
    expect(istem).toContain("akts-isyuku");
    // Dış örneğin adresi de metni de modele gitmez.
    expect(istem).not.toContain("baska.edu.tr");
    expect(istem).not.toContain(DIS_ALINTI.slice(0, 40));
    expect(r.kaynakca).toEqual([
      {
        adres: "https://baska.edu.tr/bologna/veri-tabani",
        baslik: "Veri Tabanı ders bilgi paketi",
        erisim: "2026-10-28T09:00:00.000Z",
        olcutKod: "B.1.5",
      },
    ]);
    const [oneri] = await kiraciIslemi(o.db, o.a.kurumId, (tx) =>
      tx.select().from(sema.oneri).where(eq(sema.oneri.id, r.taslak.oneriId)),
    );
    expect(oneri).toMatchObject({ tur: "bologna_taslagi", risk: "orta", hedefId: o.a.dersId });
    const ic = oneri?.icerik as { kaynakca: { kanitDegildir: boolean }[]; denetim: { bulgular: { kural: string }[] } };
    expect(ic.kaynakca[0]?.kanitDegildir).toBe(true);
    // Model amaç metnini dış örneğe çok benzer yazdı: uyarı.
    expect(ic.denetim.bulgular.some((b) => b.kural === "Kaynak")).toBe(true);
    // İş yükü deterministik K8 ile denetlendi: hedef 150.
    expect((oneri?.icerik as { denetim: { hedef: number } }).denetim.hedef).toBe(150);
    // Atıflarda dış örnek yok.
    expect(JSON.stringify(oneri?.atiflar)).not.toContain("baska.edu.tr");
    const gunluk = await kiraciIslemi(o.db, o.a.kurumId, (tx) =>
      tx.select().from(sema.gunluk).where(eq(sema.gunluk.eylem, "bologna.eksik_giderme")),
    );
    expect(gunluk).toHaveLength(1);
  });

  it("yetkisiz kişi eksik gideremez", async () => {
    const g = await o.baglam(o.a, o.a.gozlemci);
    await expect(eksikleriGider(g, { dersId: o.a.dersId })).rejects.toBeInstanceOf(ServisHatasi);
  });
});
