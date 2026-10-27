// Hocanın ders dosyası için toplam etkileşimi (saf mantık, İP-16). Kaynak değiştirilemez günlüktür:
// yalnız kişi (insan) aktörlü kayıtlar sayılır; sistem ve politika kararları insan adımı değildir.

export interface EtkilesimKaydi {
  eylem: string;
  aktorTuru: string;
  zaman: Date;
  ayrinti: Record<string, unknown>;
}

export interface EtkilesimOzeti {
  adimSayisi: number;
  yuklemeSayisi: number;
  kararSayisi: number;
  toplamSureMs: number;
  adimlar: { eylem: string; zaman: string }[];
}

const YUKLEME = new Set(["ders_dosyasi.dokum_aktarildi", "ders_dosyasi.kagit_eklendi"]);

export function etkilesimOzeti(kayitlar: readonly EtkilesimKaydi[]): EtkilesimOzeti {
  const insan = kayitlar
    .filter((k) => k.aktorTuru === "kisi" && k.ayrinti.dayanak !== "politika")
    .sort((a, b) => a.zaman.getTime() - b.zaman.getTime());
  let sure = 0;
  for (const k of insan) if (typeof k.ayrinti.sureMs === "number") sure += k.ayrinti.sureMs;
  return {
    adimSayisi: insan.length,
    yuklemeSayisi: insan.filter((k) => YUKLEME.has(k.eylem)).length,
    kararSayisi: insan.filter((k) => k.eylem === "karar.verildi").length,
    toplamSureMs: sure,
    adimlar: insan.map((k) => ({ eylem: k.eylem, zaman: k.zaman.toISOString() })),
  };
}
