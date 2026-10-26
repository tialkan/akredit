import { describe, expect, it } from "vitest";
import {
  EYLEMLER,
  type Eylem,
  izinliEylemler,
  KURUM_DUZEYI_EYLEMLER,
  kurumHedefi,
  OKUMA_EYLEMLERI,
  ROLLER,
  type Rol,
  type RolAtamasi,
  type YetkiHedefi,
  type YetkiKisisi,
  yetkiliMi,
} from "../src/index.ts";

// Uydurma kimlikler.
const A = "01900000-0000-7000-8000-00000000000a";
const B = "01900000-0000-7000-8000-00000000000b";
const BIRIM = "b1";
const BIRIM2 = "b2";
const PROG = "p1";
const PROG2 = "p2";
const DERS = "d1";
const SIMDI = new Date("2026-10-27T10:00:00Z");
const ESKI = new Date("2026-01-01T00:00:00Z");
const GELECEK = new Date("2027-01-01T00:00:00Z");

const dersHedefi: YetkiHedefi = {
  kurumId: A,
  zincir: [
    { tur: "kurum", id: A },
    { tur: "birim", id: BIRIM },
    { tur: "program", id: PROG },
    { tur: "ders", id: DERS },
  ],
};
const baskaProgramHedefi: YetkiHedefi = {
  kurumId: A,
  zincir: [
    { tur: "kurum", id: A },
    { tur: "birim", id: BIRIM2 },
    { tur: "program", id: PROG2 },
  ],
};

function kisi(rol: Rol, kapsam: RolAtamasi["kapsam"], bitis: Date | null = null, kurumId = A): YetkiKisisi {
  return { kisiId: "k1", kurumId, atamalar: [{ rol, kapsam, baslangic: ESKI, bitis }] };
}
const kurumdaKisi = (rol: Rol) => kisi(rol, { tur: "kurum", id: A }, rol === "degerlendirici" ? GELECEK : null);

/*
 * Beklenen tablo: kurum kapsamında atanmış her rolün kurum hedefindeki yetkisi. Sütunlar EYLEMLER sırasıyla:
 *  1 kanit.oku  2 oneri.oku  3 rapor.oku  4 olcme.oku  5 gunluk.oku  6 kanit.yukle  7 olcme.veri_gir
 *  8 rapor.duzenle  9 karar.ver  10 surec.yonet  11 rapor.gonder  12 politika.imzala  13 kullanici.davet_et
 *  14 kullanici.ice_aktar  15 rol.ata  16 api_anahtari.yonet  17 kurum.ayar_yonet
 * Tablo kaynak koddan bağımsız, elle yazıldı (İP-09 kapsamındaki rol tanımlarından).
 */
const BEKLENEN: Record<Rol, string> = {
  //                         1234567890 1234567
  kurum_yoneticisi: /*     */ "1111111111 1111111",
  kalite_komisyonu_baskani: "1111111111 1111100",
  kalite_komisyonu_uyesi: /**/ "1111010110 0000000",
  birim_kalite_sorumlusu: /**/ "1111111111 0010000",
  program_sorumlusu: /*    */ "1111011110 0000000",
  ogretim_elemani: /*      */ "1111011010 0000000",
  degerlendirici: /*       */ "1011000000 0000000",
  gozlemci: /*             */ "1010000000 0000000",
};

describe("yetki matrisi: her rol × eylem (kurum kapsamı)", () => {
  for (const rol of ROLLER) {
    const bitler = BEKLENEN[rol].replace(/\s/gu, "");
    it(`${rol}: ${EYLEMLER.length} eylemin her biri`, () => {
      expect(bitler).toHaveLength(EYLEMLER.length);
      EYLEMLER.forEach((eylem, i) => {
        expect(yetkiliMi(kurumdaKisi(rol), eylem, kurumHedefi(A), SIMDI), `${rol} × ${eylem}`).toBe(bitler[i] === "1");
      });
    });
  }

  it("değerlendirici ve gözlemci yalnız okuma eylemleri yapabilir", () => {
    for (const rol of ["degerlendirici", "gozlemci"] as const)
      for (const e of izinliEylemler(kurumdaKisi(rol), kurumHedefi(A), SIMDI))
        expect(OKUMA_EYLEMLERI.has(e)).toBe(true);
  });
});

describe("yetki matrisi: kapsam", () => {
  it("program kapsamındaki atama kendi programının dersini kapsar, başka programı kapsamaz", () => {
    const k = kisi("program_sorumlusu", { tur: "program", id: PROG });
    expect(yetkiliMi(k, "olcme.veri_gir", dersHedefi, SIMDI)).toBe(true);
    expect(yetkiliMi(k, "olcme.veri_gir", baskaProgramHedefi, SIMDI)).toBe(false);
    // Program kapsamı kurum düzeyindeki hedefe de yetki vermez.
    expect(yetkiliMi(k, "kanit.oku", kurumHedefi(A), SIMDI)).toBe(false);
  });

  it("birim kapsamı alt program ve dersleri kapsar", () => {
    const k = kisi("birim_kalite_sorumlusu", { tur: "birim", id: BIRIM });
    expect(yetkiliMi(k, "rapor.duzenle", dersHedefi, SIMDI)).toBe(true);
    expect(yetkiliMi(k, "rapor.duzenle", baskaProgramHedefi, SIMDI)).toBe(false);
  });

  it("ders kapsamındaki öğretim elemanı yalnız kendi dersinde", () => {
    const k = kisi("ogretim_elemani", { tur: "ders", id: DERS });
    expect(yetkiliMi(k, "kanit.yukle", dersHedefi, SIMDI)).toBe(true);
    expect(yetkiliMi(k, "kanit.yukle", { ...dersHedefi, zincir: dersHedefi.zincir.slice(0, 3) }, SIMDI)).toBe(false);
  });

  it("kurum düzeyi eylemler alt kapsamda atanmış rolle yapılamaz (yönetici bile)", () => {
    const k = kisi("kurum_yoneticisi", { tur: "birim", id: BIRIM });
    for (const e of KURUM_DUZEYI_EYLEMLER) expect(yetkiliMi(k, e, dersHedefi, SIMDI), e).toBe(false);
    expect(yetkiliMi(k, "karar.ver", dersHedefi, SIMDI)).toBe(true);
  });

  it("aynı kimlikli düğüm başka türdeyse kapsamaz", () => {
    const k = kisi("program_sorumlusu", { tur: "program", id: BIRIM });
    expect(yetkiliMi(k, "kanit.oku", dersHedefi, SIMDI)).toBe(false);
  });
});

describe("yetki matrisi: kiracı sınırı", () => {
  it("A kurumunun yöneticisi B kurumunda hiçbir eylemi yapamaz", () => {
    const k = kurumdaKisi("kurum_yoneticisi");
    for (const e of EYLEMLER) expect(yetkiliMi(k, e, kurumHedefi(B), SIMDI), e).toBe(false);
  });

  it("zincirin kökü başka kuruma işaret ederse reddedilir", () => {
    const k = kurumdaKisi("kurum_yoneticisi");
    const sahte: YetkiHedefi = { kurumId: A, zincir: [{ tur: "kurum", id: B }] };
    expect(yetkiliMi(k, "kanit.oku", sahte, SIMDI)).toBe(false);
  });

  it("B'nin kurum kimliğiyle verilmiş atama A'nın kişisine yetki vermez", () => {
    const k: YetkiKisisi = {
      kisiId: "k1",
      kurumId: A,
      atamalar: [{ rol: "kurum_yoneticisi", kapsam: { tur: "kurum", id: B }, baslangic: ESKI, bitis: null }],
    };
    expect(yetkiliMi(k, "kanit.oku", kurumHedefi(A), SIMDI)).toBe(false);
    expect(yetkiliMi(k, "kanit.oku", kurumHedefi(B), SIMDI)).toBe(false);
  });
});

describe("yetki matrisi: süre", () => {
  it("değerlendirici süresi dolunca erişemez; bitiş anı hariçtir", () => {
    const bitis = new Date("2026-11-01T00:00:00Z");
    const k = kisi("degerlendirici", { tur: "kurum", id: A }, bitis);
    expect(yetkiliMi(k, "kanit.oku", kurumHedefi(A), SIMDI)).toBe(true);
    expect(yetkiliMi(k, "kanit.oku", kurumHedefi(A), bitis)).toBe(false);
    expect(yetkiliMi(k, "kanit.oku", kurumHedefi(A), new Date(bitis.getTime() - 1))).toBe(true);
  });

  it("bitişsiz değerlendirici ataması hiç geçerli değildir", () => {
    const k = kisi("degerlendirici", { tur: "kurum", id: A }, null);
    expect(yetkiliMi(k, "kanit.oku", kurumHedefi(A), SIMDI)).toBe(false);
  });

  it("başlangıcı gelecekte olan atama henüz geçerli değildir", () => {
    const k: YetkiKisisi = {
      kisiId: "k1",
      kurumId: A,
      atamalar: [{ rol: "gozlemci", kapsam: { tur: "kurum", id: A }, baslangic: GELECEK, bitis: null }],
    };
    expect(yetkiliMi(k, "kanit.oku", kurumHedefi(A), SIMDI)).toBe(false);
  });

  it("rolü olmayan kişi hiçbir şey yapamaz", () => {
    const k: YetkiKisisi = { kisiId: "k1", kurumId: A, atamalar: [] };
    expect(izinliEylemler(k, kurumHedefi(A), SIMDI)).toEqual([]);
  });

  it("birden çok atama birleşir", () => {
    const k: YetkiKisisi = {
      kisiId: "k1",
      kurumId: A,
      atamalar: [
        { rol: "gozlemci", kapsam: { tur: "kurum", id: A }, baslangic: ESKI, bitis: null },
        { rol: "ogretim_elemani", kapsam: { tur: "ders", id: DERS }, baslangic: ESKI, bitis: null },
      ],
    };
    const e: Eylem[] = izinliEylemler(k, dersHedefi, SIMDI);
    expect(e).toContain("kanit.yukle");
    expect(izinliEylemler(k, kurumHedefi(A), SIMDI)).toEqual(["kanit.oku", "rapor.oku"]);
  });
});
