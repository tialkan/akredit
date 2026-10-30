// Program akreditasyonu çerçeveleri (MÜDEK, FEDEK, EPDAD, SABAK). Bütün başlık ve metinler
// olcut-ham.ts içindeki, belgeden çıkarılmış satırlardan gelir; burada metin yazılmaz, yalnız yapı kurulur.
// Kanıt gereksinimleri Akredit'in hangi tabloyu ya da hesabı kanıt olarak üretebileceğini söyler;
// resmî metin değildir. Çerçeveler uzman onayı almadıkça `dogrulandi: false` kalır.

import { type Cerceve, cerceveSemasi, type KanitGereksinimi, type KaynakBelge, type Olcut } from "../sema.ts";
import { PROGRAM_BELGELERI as B } from "./kaynaklar.ts";
import {
  type AltStandartHam,
  EPDAD_OGRETMEN_1_1_HAM,
  EPDAD_RPD_HAM,
  FEDEK_4_1_HAM,
  MUDEK_LISANS_3_1_HAM,
  MUDEK_YL_2_0_HAM,
  type ProgramOlcutHam,
  SABAK_R4_HAM,
} from "./olcut-ham.ts";

/** Kod hiyerarşisi: "3.C1" ve "1.1" → "3" / "1"; "1.1.1" → "1.1". */
const noktaliUst = (kod: string) => (kod.includes(".") ? kod.slice(0, kod.lastIndexOf(".")) : null);
/** EPDAD: alan → alt standart (iki düzey): "1.1.1" → "1". */
const alanUst = (kod: string) => (kod.includes(".") ? (kod.split(".")[0] ?? null) : null);

function agacKur(
  ham: readonly (ProgramOlcutHam | AltStandartHam)[],
  ust: (kod: string) => string | null,
  kanit: Readonly<Record<string, KanitGereksinimi[]>>,
): Olcut[] {
  const kok: Olcut[] = [];
  const harita = new Map<string, Olcut>();
  for (const h of ham) {
    const kanitlar = "kanitlar" in h ? h.kanitlar.map((k) => k.metin) : [];
    const o: Olcut = {
      kod: h.kod,
      baslik: h.baslik,
      baslikDurumu: "resmi",
      metin: h.metin,
      metinDurumu: "resmi",
      kaynakSayfa: h.sayfa,
      ...(kanitlar.length ? { ornekKanitlar: kanitlar } : {}),
      kanitGereksinimleri: kanit[h.kod] ?? [],
      altOlcutler: [],
    };
    const u = ust(h.kod);
    const ebeveyn = u === null ? undefined : harita.get(u);
    if (u !== null && !ebeveyn) throw new Error(`${h.kod} için üst ölçüt yok.`);
    harita.set(h.kod, o);
    (ebeveyn ? ebeveyn.altOlcutler : kok).push(o);
  }
  for (const k of Object.keys(kanit))
    if (!harita.has(k)) throw new Error(`Kanıt gereksinimi bilinmeyen ölçüte bağlı: ${k}`);
  return kok;
}

const TABLO = "cerceveler/program-tablolari";
const k = (tur: KanitGereksinimi["tur"], aciklama: string, uretenSurec: string | null): KanitGereksinimi => ({
  tur,
  aciklama,
  uretenSurec,
});
const PC_ESLEME = k("matris", "Program çıktıları ile kurul çıktıları ilişki tablosu (Akredit üretir)", TABLO);
const PC_DUZEY = k("istatistik", "Program çıktısı sağlanma düzeyi hesabı (Akredit üretir)", "olcme");
const DERS_PC = k("matris", "Ders ile program çıktısı katkı tablosu (Bologna matrisinden)", TABLO);
const PLAN = (ad: string) => k("ders_bilgi_paketi", `${ad} (Bologna ders bilgisinden Akredit üretir)`, TABLO);

function cerceve(g: {
  kod: string;
  ad: string;
  surum: string;
  kaynak: KaynakBelge;
  ekKaynaklar?: KaynakBelge[];
  yayimTarihi: string | null;
  olcutler: Olcut[];
}): Cerceve {
  return cerceveSemasi.parse({
    ...g,
    resmi: true,
    ekKaynaklar: g.ekKaynaklar ?? [],
    dogrulandi: false,
    dogrulayan: null,
    dogrulamaZamani: null,
    olgunlukDuzeyleri: [],
    raporSablonu: [],
  });
}

export const MUDEK_LISANS_3_1: Cerceve = cerceve({
  kod: "mudek-lisans",
  ad: "MÜDEK Mühendislik Lisans Programları Değerlendirme Ölçütleri",
  surum: "3.1",
  kaynak: B.mudekLisans31,
  ekKaynaklar: [B.mudekOdr31],
  yayimTarihi: "2025-12-05",
  olcutler: agacKur(MUDEK_LISANS_3_1_HAM, noktaliUst, {
    "3.1": [PC_ESLEME],
    "3.2": [PC_DUZEY],
    "5.1": [PLAN("Tablo 5.1 Lisans Eğitim Planı"), DERS_PC],
    "5.4": [PLAN("Tablo 5.1 kategori toplamları")],
  }),
});

export const MUDEK_YL_2_0: Cerceve = cerceve({
  kod: "mudek-yl",
  ad: "MÜDEK Mühendislik Yüksek Lisans Programları Değerlendirme Ölçütleri",
  surum: "2.0",
  kaynak: B.mudekYl20,
  yayimTarihi: "2025-12-05",
  olcutler: agacKur(MUDEK_YL_2_0_HAM, noktaliUst, {
    "3.1": [PC_ESLEME],
    "3.2": [PC_DUZEY],
    "5.1": [DERS_PC],
  }),
});

export const FEDEK_4_1: Cerceve = cerceve({
  kod: "fedek-lisans",
  ad: "FEDEK Lisans Programları Değerlendirme Ölçütleri",
  surum: "4.1",
  kaynak: B.fedek41,
  ekKaynaklar: [B.fedekOdr31],
  yayimTarihi: "2024-09-14",
  olcutler: agacKur(FEDEK_4_1_HAM, noktaliUst, {
    "3.1": [PC_ESLEME],
    "3.2": [PC_DUZEY],
    "4.1": [PLAN("Tablo 4.1 Lisans Öğretim Planı"), DERS_PC],
    "4.5": [PLAN("Tablo 4.1 kategori toplamları")],
  }),
});

export const SABAK_R4: Cerceve = cerceve({
  kod: "sabak-genel",
  ad: "SABAK Sağlık Bilimleri Eğitim Programları Genel Değerlendirme Ölçütleri",
  surum: "R4",
  kaynak: B.sabakR4,
  ekKaynaklar: [B.sabakOdrR5],
  yayimTarihi: "2022-06-05",
  olcutler: agacKur(SABAK_R4_HAM, noktaliUst, {
    "1.4": [PLAN("ÖDR Tablo 1 Eğitim planı"), DERS_PC],
    "1.6": [PLAN("ÖDR Tablo 1 AKTS toplamları")],
    "2.5": [PC_DUZEY],
    "2.6": [PC_ESLEME],
  }),
});

export const EPDAD_OGRETMEN_1_1: Cerceve = cerceve({
  kod: "epdad-ogretmen",
  ad: "EPDAD Öğretmen Eğitimi Standartları",
  surum: "1.1",
  kaynak: B.epdadKilavuz11,
  ekKaynaklar: [B.epdadOdr13],
  yayimTarihi: "2021-11-02",
  olcutler: agacKur(EPDAD_OGRETMEN_1_1_HAM, alanUst, {
    "1.1.1": [PLAN("EK I.1 Lisans Eğitim Programı")],
  }),
});

export const EPDAD_RPD: Cerceve = cerceve({
  kod: "epdad-rpd",
  ad: "EPDAD Rehberlik ve Psikolojik Danışma (RPD) Lisans Eğitimi Standartları",
  // Belgede sürüm yazmıyor; dosya adındaki 241216 tarih kodu sürüm yerine kullanıldı.
  surum: "241216",
  kaynak: B.epdadRpd,
  yayimTarihi: null,
  // RPD için ÖDR şablonu indirilmedi; tablo tanımı ve kanıt eşlemesi yok.
  olcutler: agacKur(EPDAD_RPD_HAM, alanUst, {}),
});

export const PROGRAM_CERCEVELERI: readonly Cerceve[] = [
  MUDEK_LISANS_3_1,
  MUDEK_YL_2_0,
  FEDEK_4_1,
  SABAK_R4,
  EPDAD_OGRETMEN_1_1,
  EPDAD_RPD,
];
