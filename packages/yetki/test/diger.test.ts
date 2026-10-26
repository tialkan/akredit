import { ozetHesapla } from "@akredit/cekirdek";
import { describe, expect, it } from "vitest";
import {
  type ApiAnahtariKaydi,
  agParmakIzi,
  apiAnahtariAyristir,
  apiAnahtariDogrula,
  apiAnahtariTalebiDenetle,
  apiAnahtariUret,
  atamaYapabilirMi,
  cihazParmakIzi,
  csrfDenetle,
  csvAyristir,
  davetBelirteciUret,
  GIZLENDI,
  gizliAyikla,
  kimlikOlayi,
  kullaniciCsvDogrula,
  kurumHedefi,
  oturumCereziAyari,
  supheliGirisMi,
  type YetkiHedefi,
  type YetkiKisisi,
} from "../src/index.ts";

const A = "01900000-0000-7000-8000-00000000000a";
const B = "01900000-0000-7000-8000-00000000000b";
const SIMDI = new Date("2026-10-27T10:00:00Z");
const ESKI = new Date("2026-01-01T00:00:00Z");
const GUN = 24 * 60 * 60 * 1000;
const bayt = (n: number, baslangic = 0) => Uint8Array.from({ length: n }, (_, i) => (i * 7 + baslangic) % 256);

const yonetici: YetkiKisisi = {
  kisiId: "y",
  kurumId: A,
  atamalar: [{ rol: "kurum_yoneticisi", kapsam: { tur: "kurum", id: A }, baslangic: ESKI, bitis: null }],
};
const baskan: YetkiKisisi = {
  kisiId: "b",
  kurumId: A,
  atamalar: [{ rol: "kalite_komisyonu_baskani", kapsam: { tur: "kurum", id: A }, baslangic: ESKI, bitis: null }],
};
const ogretim: YetkiKisisi = {
  kisiId: "o",
  kurumId: A,
  atamalar: [{ rol: "ogretim_elemani", kapsam: { tur: "kurum", id: A }, baslangic: ESKI, bitis: null }],
};
const programHedefi: YetkiHedefi = {
  kurumId: A,
  zincir: [
    { tur: "kurum", id: A },
    { tur: "birim", id: "b1" },
    { tur: "program", id: "p1" },
  ],
};

describe("atama kuralları", () => {
  const talep = (rol: Parameters<typeof atamaYapabilirMi>[1]["rol"], bitis: Date | null = null) => ({
    rol,
    kapsam: { tur: "program" as const, id: "p1" },
    hedef: programHedefi,
    baslangic: SIMDI,
    bitis,
  });

  it("yönetici her rolü atayabilir", () => {
    expect(atamaYapabilirMi(yonetici, talep("kurum_yoneticisi"), "rol.ata", SIMDI).tamam).toBe(true);
  });

  it("başkan yönetici ya da başkan atayamaz, öteki rolleri atayabilir", () => {
    expect(atamaYapabilirMi(baskan, talep("kurum_yoneticisi"), "rol.ata", SIMDI).tamam).toBe(false);
    expect(atamaYapabilirMi(baskan, talep("kalite_komisyonu_baskani"), "kullanici.davet_et", SIMDI).tamam).toBe(false);
    expect(atamaYapabilirMi(baskan, talep("program_sorumlusu"), "kullanici.davet_et", SIMDI).tamam).toBe(true);
  });

  it("öğretim elemanı kimseyi davet edemez", () => {
    const s = atamaYapabilirMi(ogretim, talep("gozlemci"), "kullanici.davet_et", SIMDI);
    expect(s).toEqual({ tamam: false, neden: "Bu kapsamda kullanıcı ekleme yetkiniz yok." });
  });

  it("birim sorumlusu yalnız kendi biriminde program sorumlusu atayabilir", () => {
    const k: YetkiKisisi = {
      kisiId: "s",
      kurumId: A,
      atamalar: [{ rol: "birim_kalite_sorumlusu", kapsam: { tur: "birim", id: "b1" }, baslangic: ESKI, bitis: null }],
    };
    expect(atamaYapabilirMi(k, talep("program_sorumlusu"), "kullanici.davet_et", SIMDI).tamam).toBe(true);
    const baska = {
      ...talep("program_sorumlusu"),
      hedef: { kurumId: A, zincir: [{ tur: "birim" as const, id: "b2" }] },
    };
    expect(atamaYapabilirMi(k, baska, "kullanici.davet_et", SIMDI).tamam).toBe(false);
    expect(
      atamaYapabilirMi(k, talep("degerlendirici", new Date(SIMDI.getTime() + GUN)), "kullanici.davet_et", SIMDI).tamam,
    ).toBe(false);
  });

  it("değerlendirici süreli olmalı ve en çok 120 gün", () => {
    expect(atamaYapabilirMi(yonetici, talep("degerlendirici"), "rol.ata", SIMDI).tamam).toBe(false);
    expect(
      atamaYapabilirMi(yonetici, talep("degerlendirici", new Date(SIMDI.getTime() + 120 * GUN)), "rol.ata", SIMDI)
        .tamam,
    ).toBe(true);
    expect(
      atamaYapabilirMi(yonetici, talep("degerlendirici", new Date(SIMDI.getTime() + 121 * GUN)), "rol.ata", SIMDI)
        .tamam,
    ).toBe(false);
  });

  it("başka kurumda atama yapılamaz", () => {
    const t = { ...talep("gozlemci"), hedef: kurumHedefi(B), kapsam: { tur: "kurum" as const, id: B } };
    expect(atamaYapabilirMi(yonetici, t, "rol.ata", SIMDI).tamam).toBe(false);
  });
});

describe("API anahtarları", () => {
  const u = apiAnahtariUret(bayt(48));
  const kayit: ApiAnahtariKaydi = {
    id: "a1",
    kurumId: A,
    kisiId: "y",
    onek: u.onek,
    ozet: u.ozet,
    kapsam: ["kanit.oku"],
    bitis: new Date(SIMDI.getTime() + GUN),
    iptal: null,
  };

  it("biçim akr_<8>_<40>, saklanan özet tam anahtarın SHA-256'sı", () => {
    expect(u.anahtar).toMatch(/^akr_[A-Za-z0-9]{8}_[A-Za-z0-9]{40}$/u);
    expect(u.ozet).toBe(ozetHesapla(u.anahtar));
    expect(u.ozet).not.toContain(u.anahtar.slice(13));
    expect(apiAnahtariAyristir(u.anahtar)?.onek).toBe(u.onek);
    expect(apiAnahtariAyristir("akr_kisa")).toBeNull();
    expect(() => apiAnahtariUret(bayt(10))).toThrow();
  });

  it("farklı rastgelelik farklı anahtar üretir", () => {
    expect(apiAnahtariUret(bayt(48, 1)).anahtar).not.toBe(u.anahtar);
  });

  it("doğru anahtar geçer; yanlış, süresi dolmuş ve iptal edilmiş reddedilir", () => {
    expect(apiAnahtariDogrula(u.anahtar, kayit, SIMDI).gecerli).toBe(true);
    const yanlis = `${u.anahtar.slice(0, -1)}${u.anahtar.endsWith("a") ? "b" : "a"}`;
    expect(apiAnahtariDogrula(yanlis, kayit, SIMDI)).toEqual({ gecerli: false, neden: "Anahtar tanınmadı." });
    expect(apiAnahtariDogrula(u.anahtar, null, SIMDI).gecerli).toBe(false);
    expect(apiAnahtariDogrula(u.anahtar, kayit, kayit.bitis)).toEqual({
      gecerli: false,
      neden: "Anahtarın süresi dolmuş.",
    });
    expect(apiAnahtariDogrula(u.anahtar, { ...kayit, iptal: SIMDI }, SIMDI)).toEqual({
      gecerli: false,
      neden: "Anahtar iptal edilmiş.",
    });
  });

  it("talep denetimi: boş kapsam, bilinmeyen izin, kurum düzeyi izin, onay ve süre", () => {
    const bitis = new Date(SIMDI.getTime() + 30 * GUN);
    expect(apiAnahtariTalebiDenetle([], SIMDI, bitis).tamam).toBe(false);
    expect(apiAnahtariTalebiDenetle(["uydurma"], SIMDI, bitis).tamam).toBe(false);
    expect(apiAnahtariTalebiDenetle(["kurum.ayar_yonet"], SIMDI, bitis).tamam).toBe(false);
    expect(apiAnahtariTalebiDenetle(["karar.ver"], SIMDI, bitis).tamam).toBe(false);
    expect(apiAnahtariTalebiDenetle(["kanit.oku"], SIMDI, new Date(SIMDI.getTime() + 366 * GUN)).tamam).toBe(false);
    expect(apiAnahtariTalebiDenetle(["kanit.oku", "kanit.oku", "kanit.yukle"], SIMDI, bitis)).toEqual({
      tamam: true,
      kapsam: ["kanit.oku", "kanit.yukle"],
    });
  });

  it("davet belirteci: yalnız özet saklanır", () => {
    const d = davetBelirteciUret(bayt(32));
    expect(d.belirtec).toHaveLength(32);
    expect(d.ozet).toBe(ozetHesapla(d.belirtec));
    expect(() => davetBelirteciUret(bayt(16))).toThrow();
  });
});

describe("CSV içe aktarma", () => {
  it("tırnaklı alanları, noktalı virgülü ve BOM'u ayrıştırır", () => {
    expect(csvAyristir('﻿a;b\n"x;y";"tırnak ""iç"""\r\n')).toEqual([
      ["a", "b"],
      ["x;y", 'tırnak "iç"'],
    ]);
  });

  it("geçerli ve hatalı satırları satır numarasıyla ayırır", () => {
    const metin = [
      "ad_soyad,eposta,rol,kapsam_turu,kapsam_kodu,unvan,bitis",
      "Deneme Birinci,Birinci@ornek.edu.tr,kurum_yoneticisi,kurum,,Dr.,",
      "Deneme İkinci,ikinci@ornek.edu.tr,ogretim_elemani,ders,ORN101,,",
      "Deneme Üçüncü,gecersiz,ogretim_elemani,ders,ORN101,,",
      "Deneme Dördüncü,dorduncu@ornek.edu.tr,rektor,kurum,,,",
      "Deneme Beşinci,besinci@ornek.edu.tr,program_sorumlusu,program,,,",
      "Deneme Altıncı,altinci@ornek.edu.tr,degerlendirici,kurum,,,",
      "Deneme Yedinci,yedinci@ornek.edu.tr,degerlendirici,kurum,,,2027-01-15",
      "Deneme İkinci,ikinci@ornek.edu.tr,ogretim_elemani,ders,ORN101,,",
    ].join("\n");
    const s = kullaniciCsvDogrula(metin);
    expect(s.satirlar.map((x) => x.satir)).toEqual([2, 3, 8]);
    expect(s.satirlar[0]?.veri.eposta).toBe("birinci@ornek.edu.tr");
    expect(s.satirlar[0]?.veri.unvan).toBe("Dr.");
    expect(s.satirlar[2]?.veri.bitis?.toISOString()).toBe("2027-01-15T00:00:00.000Z");
    expect(s.hatalar.map((h) => h.satir)).toEqual([4, 5, 6, 7, 9]);
    expect(s.hatalar[0]?.ileti).toContain("E-posta");
    expect(s.hatalar[4]?.ileti).toBe("Bu satır dosyada daha önce yazılmış.");
  });

  it("eksik başlıkta tek hata döner", () => {
    expect(kullaniciCsvDogrula("ad,eposta\nx,y").hatalar).toEqual([
      { satir: 1, ileti: "Başlıkta eksik sütun: ad_soyad, rol, kapsam_turu, kapsam_kodu." },
    ]);
  });
});

describe("oturum güvenliği", () => {
  it("çerez her zaman HttpOnly, üretimde Secure", () => {
    expect(oturumCereziAyari(true)).toEqual({ httpOnly: true, secure: true, sameSite: "lax", path: "/" });
    expect(oturumCereziAyari(false).secure).toBe(false);
  });

  it("CSRF: güvenli yöntem geçer; yabancı köken, kökensiz ve çapraz site reddedilir", () => {
    const izin = ["https://akredit.org"];
    expect(csrfDenetle({ yontem: "GET", koken: null }, izin)).toBe(true);
    expect(csrfDenetle({ yontem: "POST", koken: "https://akredit.org" }, izin)).toBe(true);
    expect(csrfDenetle({ yontem: "POST", koken: "https://kotu.example" }, izin)).toBe(false);
    expect(csrfDenetle({ yontem: "POST", koken: null }, izin)).toBe(false);
    expect(csrfDenetle({ yontem: "POST", koken: "bozuk" }, izin)).toBe(false);
    expect(csrfDenetle({ yontem: "POST", koken: "https://akredit.org", fetchSite: "cross-site" }, izin)).toBe(false);
    expect(csrfDenetle({ yontem: "DELETE", koken: null, apiAnahtariyla: true }, izin)).toBe(true);
  });

  it("ağ parmak izi /24 ağını özetler, adresi saklamaz", () => {
    const a = agParmakIzi("192.0.2.10", "tuz");
    expect(a).toBe(agParmakIzi("192.0.2.200", "tuz"));
    expect(a).not.toBe(agParmakIzi("198.51.100.1", "tuz"));
    expect(a).not.toContain("192");
    expect(agParmakIzi("2001:db8:1::5", "tuz")).toBe(agParmakIzi("2001:db8:1:ffff::9", "tuz"));
    expect(agParmakIzi(null, "tuz")).toBeNull();
    expect(agParmakIzi("bilinmiyor", "tuz")).toBeNull();
  });

  it("cihaz parmak izi tarayıcı ailesi ve işletim sistemi", () => {
    expect(
      cihazParmakIzi(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36",
      ),
    ).toBe("chrome/windows");
    expect(cihazParmakIzi("Mozilla/5.0 (X11; Linux x86_64; rv:131.0) Gecko/20100101 Firefox/131.0")).toBe(
      "firefox/linux",
    );
    expect(cihazParmakIzi(null)).toBe("diger/diger");
  });

  it("şüpheli giriş: yeni ağ ve yeni cihaz birlikte; ilk giriş şüpheli değil", () => {
    const onceki = [{ ag: "a1", cihaz: "chrome/windows" }];
    expect(supheliGirisMi([], { ag: "x", cihaz: "y" })).toBe(false);
    expect(supheliGirisMi(onceki, { ag: "a1", cihaz: "firefox/linux" })).toBe(false);
    expect(supheliGirisMi(onceki, { ag: "a2", cihaz: "chrome/windows" })).toBe(false);
    expect(supheliGirisMi(onceki, { ag: "a2", cihaz: "firefox/linux" })).toBe(true);
    expect(supheliGirisMi(onceki, { ag: null, cihaz: "firefox/linux" })).toBe(true);
  });

  it("günlük ayrıntısından giriş bilgisi ayıklanır (değişmez ilke 8)", () => {
    const anahtar = apiAnahtariUret(bayt(48)).anahtar;
    const s = gizliAyikla({
      eposta: "deneme@ornek.edu.tr",
      parola: "x",
      token: "y",
      sessionToken: "z",
      cookie: "a=b",
      ic: { authorization: "Bearer abc", not: `anahtar ${anahtar} kullanıldı` },
      adres: "https://akredit.org/api/kimlik/magic-link/verify?token=GIZLI123&callbackURL=/panel",
      liste: ["eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.imza"],
      sayi: 3,
    });
    expect(s).toEqual({
      eposta: "deneme@ornek.edu.tr",
      ic: { not: `anahtar ${GIZLENDI} kullanıldı` },
      adres: `https://akredit.org/api/kimlik/magic-link/verify?${GIZLENDI}&callbackURL=/panel`,
      liste: [GIZLENDI],
      sayi: 3,
    });
    expect(JSON.stringify(s)).not.toMatch(/GIZLI123|Bearer|a=b/u);
  });

  it("kimlik olayı ayrıntısı her zaman ayıklanır", () => {
    const o = kimlikOlayi({
      aktor: { tur: "kisi", id: "k" },
      eylem: "kimlik.giris",
      ayrinti: { yontem: "sihirli_baglanti", belirtec: "x" },
    });
    expect(o.ayrinti).toEqual({ yontem: "sihirli_baglanti" });
    expect(o.hedef).toBeNull();
  });
});
