// Kendini kapatan PÜKÖ uçtan uca (bellek deposu, ağsız, sahte YZ önericisi). Örnek veriler uydurmadır.

import { describe, expect, it } from "vitest";
import { puko } from "../src/index.ts";

const GUZ = "2026-2027 Güz";
const SONRAKI = "2027-2028 Güz";

const olc = (dersKodu: string, kod: string, deger: number, donem = GUZ, olcumTuru: "ck" | "pc" = "pc") => ({
  olcumTuru,
  kod,
  dersKodu,
  donem,
  deger,
  esik: 60,
  kaynak: { hesapSurumu: "olcme-1.0.0", kanitId: `kanit-${dersKodu}-${donem}` },
});

function baglam(onerici?: puko.OnlemOnericisi) {
  let n = 0;
  return {
    kimlik: () => `k${++n}`,
    zaman: "2027-02-01T09:00:00.000Z",
    aktor: { tur: "oturum" as const, kisiId: "kisi-ayse" },
    kokNeden: (o: { dersKodu: string }) => [
      { tur: "zor_soru" as const, soruNo: "S3", deger: 0.3, aciklama: `${o.dersKodu} S3 zor.` },
    ],
    onerici,
  };
}

const ilk = [olc("BP101", "PÇ3", 40), olc("BP102", "PÇ3", 55), olc("BP103", "PÇ3", 52), olc("BP104", "PÇ3", 75)];

describe("kartlariUret", () => {
  it("eşiği geçen katman 0 (onaya düşmez), aynı PÇ'deki üç ders tek katman 2 kart", async () => {
    const r = await puko.kartlariUret(ilk, baglam());
    expect(r.otomatik.map((o) => o.olcum.dersKodu)).toEqual(["BP104"]);
    expect(r.otomatik[0]?.katman.kural).toBe("K0-esik-gecti");
    expect(r.kartlar).toHaveLength(1);
    const kart = r.kartlar[0] as puko.KararKarti;
    expect(kart.katman).toMatchObject({ katman: 2, devredilemez: true });
    expect(kart.kume.olcumler.map((o) => o.dersKodu)).toEqual(["BP101", "BP102", "BP103"]);
    expect(Object.keys(kart.kokNedenler)).toEqual(["BP101", "BP102", "BP103"]);
    // Model yok: üç hazır önlem.
    expect(kart.secenekler.map((s) => s.uretici)).toEqual(["kural", "kural", "kural"]);
  });

  it("model önlemlerinden rakam içerenler düşer; geçersiz çıktı kartı durdurmaz", async () => {
    const r = await puko.kartlariUret(
      ilk,
      baglam(async () => [
        "Uygulama saatini artır",
        "Başarıyı %20 artır",
        "Uygulama saatini artır",
        "Akran öğrenmesi ekle",
      ]),
    );
    const metinler = r.kartlar[0]?.secenekler.map((s) => [s.uretici, s.metin]);
    expect(metinler).toEqual([
      ["yz", "Uygulama saatini artır"],
      ["yz", "Akran öğrenmesi ekle"],
    ]);
    const bozuk = await puko.kartlariUret(
      ilk,
      baglam(async () => ({ sayi: 42 })),
    );
    expect(bozuk.kartlar[0]?.secenekler).toHaveLength(2);
    const hata = await puko.kartlariUret(
      ilk,
      baglam(async () => {
        throw new Error("model yok");
      }),
    );
    expect(hata.kartlar[0]?.secenekler.length).toBeGreaterThanOrEqual(2);
  });

  it("katman 0 günlük girdisi sistem aktörüyle ve kaynak sistem dayanağıyla", async () => {
    const r = await puko.kartlariUret(ilk, baglam());
    const g = puko.otomatikGunlukGirdisi(r.otomatik[0] as puko.OtomatikKayit, new Date("2027-02-01T09:00:00Z"));
    expect(g.aktor).toEqual({ tur: "sistem", id: null });
    expect(g.eylem).toBe("karar.otomatik");
    expect(g.ayrinti).toMatchObject({ katman: 0, dayanak: "kaynak sistem", deger: 75, esik: 60 });
  });
});

describe("PÜKÖ döngüsü", () => {
  it("kart → önlem → devir + eylem → sonraki dönem → iyileşti/iyileşmedi → yeni kart", async () => {
    const depo = puko.bellekPukoDeposu();
    const b = baglam();
    const { kartlar } = await puko.kartlariUret(ilk, b);
    await puko.kartlariAc(depo, kartlar);
    const kart = kartlar[0] as puko.KararKarti;

    // Katman 2: politika ya da toplu karar reddedilir.
    const temel = { kartId: kart.id, hedefDonem: SONRAKI, sureMs: 9000 };
    await expect(
      puko.onlemSec(depo, { ...temel, secim: { secenekId: kart.secenekler[0]?.id }, dayanak: "politika" }, b),
    ).rejects.toThrow(/devredilemez/);
    await expect(
      puko.onlemSec(depo, { ...temel, secim: { secenekId: kart.secenekler[0]?.id }, toplu: true }, b),
    ).rejects.toThrow(/toplu/);
    await expect(puko.onlemSec(depo, { ...temel, secim: { secenekId: "yok" } }, b)).rejects.toThrow(/yok/);

    // Karar veren istekten gelemez; API anahtarı karar veremez (inceleme 4-7 #2).
    await expect(
      puko.onlemSec(depo, { ...temel, kararVeren: "Sahte Ad", secim: { secenekId: kart.secenekler[1]?.id } }, b),
    ).rejects.toThrow();
    await expect(
      puko.onlemSec(
        depo,
        { ...temel, secim: { secenekId: kart.secenekler[1]?.id } },
        {
          ...b,
          aktor: { tur: "anahtar", kisiId: "kisi-ayse" },
        },
      ),
    ).rejects.toThrow(/oturum/);
    const r = await puko.onlemSec(depo, { ...temel, secim: { secenekId: kart.secenekler[1]?.id } }, b);
    expect(r.devir[0]?.dayanak.kararVeren).toBe("kisi-ayse");
    expect(r.devir.map((d) => [d.dersKodu, d.hedefDonem, d.dayanak.pukoId])).toEqual([
      ["BP101", SONRAKI, kart.pukoId],
      ["BP102", SONRAKI, kart.pukoId],
      ["BP103", SONRAKI, kart.pukoId],
    ]);
    expect(r.eylem).toMatchObject({ tur: "puko_eylemi", dersKodlari: ["BP101", "BP102", "BP103"] });
    await expect(puko.onlemSec(depo, { ...temel, secim: { kendiMetni: "Başka" } }, b)).rejects.toThrow(/zaten/);
    expect((await puko.pukoKayitlari(depo))[0]?.durum).toBe("onlem_secildi");

    // Sonraki dönem: BP101 61, BP102 70, BP103 58 (eşik altı) → iyileşmedi, yeni kart yalnız BP103.
    const sonuc = await puko.sonrakiDonemiIsle(
      depo,
      [olc("BP101", "PÇ3", 61, SONRAKI), olc("BP102", "PÇ3", 70, SONRAKI), olc("BP103", "PÇ3", 58, SONRAKI)],
      { ...b, kanitId: "kanit-olcme-2027" },
    );
    const kapanan = sonuc.kapananlar[0] as puko.PukoKaydi;
    expect(kapanan.durum).toBe("kapandi_iyilesmedi");
    // Farklar: 61−40 = 21, 70−55 = 15, 58−52 = 6
    expect(kapanan.kapanis?.karsilastirma.map((k) => k.fark)).toEqual([21, 15, 6]);
    expect(kapanan.kapanis?.kanitId).toBe("kanit-olcme-2027");
    expect(sonuc.yeniKartlar).toHaveLength(1);
    expect(sonuc.yeniKartlar[0]?.kume.olcumler.map((o) => o.dersKodu)).toEqual(["BP103"]);
    expect(sonuc.yeniKartlar[0]?.oncekiPukoId).toBe(kart.pukoId);

    // Yeni kartta önlem → bir sonraki dönemde eşiği geçer → iyileşti.
    const yeni = sonuc.yeniKartlar[0] as puko.KararKarti;
    await puko.onlemSec(
      depo,
      {
        kartId: yeni.id,
        secim: { kendiMetni: "Laboratuvar oturumu ekle" },
        hedefDonem: "2028-2029 Güz",
        sureMs: 1200,
      },
      b,
    );
    const ucuncu = await puko.sonrakiDonemiIsle(depo, [olc("BP103", "PÇ3", 64, "2028-2029 Güz")], {
      ...b,
      kanitId: "kanit-olcme-2028",
    });
    expect(ucuncu.kapananlar.map((k) => k.durum)).toEqual(["kapandi_iyilesti"]);
    expect(ucuncu.yeniKartlar).toEqual([]);

    // Olaylar yalnız eklendi: açıldı, seçildi, kapandı, açıldı, seçildi, kapandı.
    expect((await depo.olaylar()).map((o) => o.tur)).toEqual([
      "acildi",
      "onlem_secildi",
      "kapandi",
      "acildi",
      "onlem_secildi",
      "kapandi",
    ]);
    // İki karar: küme küçük, gösterge gizli.
    expect((await puko.pukoYorgunlugu(depo)).gizli).toBe(true);
  });

  it("sonraki dönemde ölçülemeyen ders sessizce düşmez: yeni K2-olculemedi kartına girer (inceleme 4-7 #3)", async () => {
    const depo = puko.bellekPukoDeposu();
    const b = baglam();
    const { kartlar } = await puko.kartlariUret(ilk, b);
    await puko.kartlariAc(depo, kartlar);
    const kart = kartlar[0] as puko.KararKarti;
    await puko.onlemSec(
      depo,
      { kartId: kart.id, secim: { secenekId: kart.secenekler[0]?.id }, hedefDonem: SONRAKI, sureMs: 5000 },
      b,
    );
    // Sonraki dönem: BP101 eşiği geçti (61 ≥ 60), BP102 ve BP103 hiç ölçülmedi.
    const sonuc = await puko.sonrakiDonemiIsle(depo, [olc("BP101", "PÇ3", 61, SONRAKI)], {
      ...b,
      kanitId: "kanit-olcme-2027",
    });
    expect(sonuc.kapananlar[0]?.durum).toBe("kapandi_iyilesmedi");
    expect(sonuc.yeniKartlar).toHaveLength(1);
    const yeni = sonuc.yeniKartlar[0] as puko.KararKarti;
    expect(yeni.katman.kural).toBe("K2-olculemedi");
    expect(yeni.katman.devredilemez).toBe(true);
    // Ölçülmeyen derslerin değeri önceki dönemden taşınmaz (uydurma olurdu): null.
    expect(yeni.kume.olcumler.map((o) => [o.dersKodu, o.deger])).toEqual([
      ["BP102", null],
      ["BP103", null],
    ]);
    expect(yeni.kume.enDusuk).toBeNull();
    expect(yeni.kume.olculemeyenVar).toBe(true);
    expect(yeni.oncekiPukoId).toBe(kart.pukoId);
  });

  it("zod: geçersiz ölçüm reddedilir", async () => {
    await expect(puko.kartlariUret([{ ...olc("BP101", "PÇ3", 40), deger: "kırk" }], baglam())).rejects.toThrow();
  });
});
