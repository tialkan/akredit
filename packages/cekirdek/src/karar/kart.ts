// Karar kartları, PÜKÖ kapanışı, yönetici özeti ve onay yorgunluğu (İP-39). Saf işlevler.
// Sayılar yalnız buradaki hesaplardan gelir; model metni sayı taşıyamaz (`onlemMetniGecerliMi`).

/** Eşiği geçemeyen bir ölçüm (bir dersin ÇK'sı ya da bir dersin PÇ katkısı). */
export interface EsikAltiOlcum {
  olcumTuru: "ck" | "pc";
  /** ÇK ya da PÇ kodu (ör. "PÇ3"). PÇ için kümeleme anahtarıdır. */
  kod: string;
  dersKodu: string;
  donem: string;
  /** 0-100, hesaptan. `null`: bu dönem hesaplanamadı (ölçülmedi); kişiye gider (K2-olculemedi). */
  deger: number | null;
  esik: number;
  /** Değerin dayandığı kayıt (ölçme sonucu kanıtı, hesap sürümü). */
  kaynak: { kanitId?: string; hesapSurumu: string; girdiOzeti?: string };
}

export interface IstisnaKumesi {
  /** Deterministik anahtar: tür|kod|dönem (ÇK için ders de eklenir). */
  anahtar: string;
  olcumTuru: "ck" | "pc";
  kod: string;
  donem: string;
  esik: number;
  olcumler: EsikAltiOlcum[];
  /** Kümedeki en düşük değer ve ortalama açık (eşik − değer), hesaptan. Ölçülmeyenler hesaba girmez;
   * kümede hiç ölçülen yoksa `null`. */
  enDusuk: number | null;
  ortalamaAcik: number | null;
  /** Kümede bu dönem ölçülemeyen ders var mı? Varsa kart K2-olculemedi katmanındadır. */
  olculemeyenVar: boolean;
}

const karsilastir = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Benzer istisnaları kümeler: aynı PÇ ve dönemde eşik altı kalan dersler tek kart olur. ÇK'lar derse
 * özgü olduğundan ders + ÇK + dönem bir kümedir. Eşiği geçen ölçüm kümeye girmez.
 */
export function istisnalariKumele(olcumler: readonly EsikAltiOlcum[]): IstisnaKumesi[] {
  const kumeler = new Map<string, EsikAltiOlcum[]>();
  for (const o of olcumler) {
    // Ölçülemeyen sonuç da istisnadır: sessizce düşmez, kişiye gider.
    if (o.deger !== null && !(o.deger < o.esik)) continue;
    const anahtar = o.olcumTuru === "pc" ? `pc|${o.kod}|${o.donem}` : `ck|${o.dersKodu}|${o.kod}|${o.donem}`;
    const k = kumeler.get(anahtar) ?? [];
    k.push(o);
    kumeler.set(anahtar, k);
  }
  return [...kumeler.entries()]
    .sort(([a], [b]) => karsilastir(a, b))
    .map(([anahtar, liste]) => {
      const sirali = [...liste].sort((a, b) => karsilastir(a.dersKodu, b.dersKodu));
      const ilk = sirali[0] as EsikAltiOlcum;
      const esik = Math.max(...sirali.map((o) => o.esik));
      const olculen = sirali.flatMap((o) => (o.deger === null ? [] : [{ deger: o.deger, esik: o.esik }]));
      return {
        anahtar,
        olcumTuru: ilk.olcumTuru,
        kod: ilk.kod,
        donem: ilk.donem,
        esik,
        olcumler: sirali,
        enDusuk: olculen.length ? Math.min(...olculen.map((o) => o.deger)) : null,
        ortalamaAcik: olculen.length ? olculen.reduce((t, o) => t + (o.esik - o.deger), 0) / olculen.length : null,
        olculemeyenVar: olculen.length < sirali.length,
      };
    });
}

/**
 * Önlem seçeneği metni geçerli mi? Model önlem metni önerir ama sayı yazamaz: rakam içeren metin reddedilir
 * (sayılar kartta hesaptan gösterilir). Boş ya da çok uzun metin de reddedilir.
 */
export function onlemMetniGecerliMi(metin: string): { gecerli: boolean; neden?: string } {
  const t = metin.trim();
  if (!t) return { gecerli: false, neden: "Önlem metni boş." };
  if (t.length > 280) return { gecerli: false, neden: "Önlem metni en çok 280 karakter olmalı." };
  if (/\p{Nd}/u.test(t)) return { gecerli: false, neden: "Önlem metni sayı içeremez; sayılar hesaptan gelir." };
  return { gecerli: true };
}

export type PukoDurumu = "acik" | "onlem_secildi" | "kapandi_iyilesti" | "kapandi_iyilesmedi";

export interface PukoKarsilastirmasi {
  dersKodu: string;
  /** Önceki dönem değeri; o dönem ölçülemediyse `null`. */
  once: number | null;
  sonra: number | null;
  fark: number | null;
  esik: number;
  esigiGecti: boolean;
}

/**
 * Önce/sonra karşılaştırması. Kural: kümedeki her ölçüm sonraki dönemde eşiği geçtiyse "iyileşti";
 * herhangi biri ölçülemediyse ya da eşik altında kaldıysa "iyileşmedi" (yeni karar kartı açılır).
 * Ölçülemeyen ders iyileşmiş sayılmaz.
 */
export function pukoKapanisi(
  once: readonly EsikAltiOlcum[],
  sonraki: ReadonlyMap<string, number | null>,
): { durum: "kapandi_iyilesti" | "kapandi_iyilesmedi"; karsilastirma: PukoKarsilastirmasi[] } {
  const karsilastirma = once.map((o) => {
    const s = sonraki.get(o.dersKodu);
    const sonra = s === undefined || s === null || !Number.isFinite(s) ? null : s;
    return {
      dersKodu: o.dersKodu,
      once: o.deger,
      sonra,
      fark: sonra === null || o.deger === null ? null : sonra - o.deger,
      esik: o.esik,
      esigiGecti: sonra !== null && sonra >= o.esik,
    };
  });
  const hepsi = karsilastirma.length > 0 && karsilastirma.every((k) => k.esigiGecti);
  return { durum: hepsi ? "kapandi_iyilesti" : "kapandi_iyilesmedi", karsilastirma };
}

export interface GostergeDegisimi {
  kod: string;
  ad: string;
  onceki: number | null;
  simdiki: number | null;
  kaynak: string;
}

export interface YoneticiOzeti {
  yukselen: (GostergeDegisimi & { fark: number })[];
  dusen: (GostergeDegisimi & { fark: number })[];
  degismeyen: number;
  karsilastirilamayan: number;
  gelismeyeAcikYonler: string[];
  puko: { acik: number; onlemSecildi: number; iyilesti: number; iyilesmedi: number };
  /** Özetin içerik özeti: onay ekranı, onaylayanın gördüğü özetin bu olduğunu kaydeder. */
  imza: string;
}

/** Değişim eşiği: mutlak farkı bundan küçük gösterge "değişmeyen" sayılır (yuvarlama gürültüsü). */
export const DEGISIM_ESIGI = 0.5;

export function yoneticiOzeti(
  gostergeler: readonly GostergeDegisimi[],
  gelismeyeAcikYonler: readonly string[],
  pukoDurumlari: readonly PukoDurumu[],
): YoneticiOzeti {
  const yukselen: YoneticiOzeti["yukselen"] = [];
  const dusen: YoneticiOzeti["dusen"] = [];
  let degismeyen = 0;
  let karsilastirilamayan = 0;
  for (const g of [...gostergeler].sort((a, b) => karsilastir(a.kod, b.kod))) {
    if (g.onceki === null || g.simdiki === null) {
      karsilastirilamayan++;
      continue;
    }
    const fark = g.simdiki - g.onceki;
    if (fark >= DEGISIM_ESIGI) yukselen.push({ ...g, fark });
    else if (fark <= -DEGISIM_ESIGI) dusen.push({ ...g, fark });
    else degismeyen++;
  }
  yukselen.sort((a, b) => b.fark - a.fark || karsilastir(a.kod, b.kod));
  dusen.sort((a, b) => a.fark - b.fark || karsilastir(a.kod, b.kod));
  const say = (d: PukoDurumu) => pukoDurumlari.filter((x) => x === d).length;
  const puko = {
    acik: say("acik"),
    onlemSecildi: say("onlem_secildi"),
    iyilesti: say("kapandi_iyilesti"),
    iyilesmedi: say("kapandi_iyilesmedi"),
  };
  const ozet = {
    yukselen,
    dusen,
    degismeyen,
    karsilastirilamayan,
    gelismeyeAcikYonler: [...gelismeyeAcikYonler],
    puko,
  };
  return { ...ozet, imza: ozetImzasi(JSON.stringify(ozet)) };
}

/** FNV-1a 32 bit; kriptografik değil, yalnız "aynı özet görüldü mü" eşleştirmesi için. */
function ozetImzasi(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

/**
 * Nihai onay kapısı: onaylayan, onay anındaki özetin aynısını görmüş olmalı. Özet sonradan değiştiyse
 * (yeni hesap) yeniden görülmesi gerekir.
 */
export function nihaiOnayKapisi(
  ozet: Pick<YoneticiOzeti, "imza">,
  gorulme: { imza: string; zaman: string } | null,
): { gecerli: boolean; neden?: string } {
  if (!gorulme) return { gecerli: false, neden: "Onaydan önce yönetici özetini görün." };
  if (gorulme.imza !== ozet.imza)
    return { gecerli: false, neden: "Özet siz gördükten sonra değişti. Güncel özeti görüp yeniden onaylayın." };
  return { gecerli: true };
}

export interface KartKararSuresi {
  katman: 0 | 1 | 2;
  /** Kartın açılmasından karara kadar geçen süre (ms). */
  sureMs: number;
  sonuc: "onaylandi" | "duzeltildi" | "reddedildi";
}

export interface OnayYorgunlugu {
  kararSayisi: number;
  ortancaSn: number | null;
  incelemedenOnay: number;
  incelemedenOnayOrani: number | null;
  /** Küme küçükse sonuç gösterilmez (kişi ayırt edilebilir olmasın). */
  gizli: boolean;
}

export const INCELEMEDEN_ONAY_MS = 2000;
export const YORGUNLUK_EN_AZ_KARAR = 5;

/**
 * Onay yorgunluğu: kurum düzeyinde toplu gösterge. Kişi alanı almaz. "İncelemeden onay": eşikten kısa
 * sürede verilen onay (ret ve düzeltme incelemeyi gösterir, sayılmaz). En az `enAz` karar yoksa gizli.
 */
export function onayYorgunlugu(
  kararlar: readonly KartKararSuresi[],
  secenek: { esikMs?: number; enAz?: number } = {},
): OnayYorgunlugu {
  const esik = secenek.esikMs ?? INCELEMEDEN_ONAY_MS;
  const enAz = secenek.enAz ?? YORGUNLUK_EN_AZ_KARAR;
  const gecerli = kararlar.filter((k) => Number.isFinite(k.sureMs) && k.sureMs >= 0);
  if (gecerli.length < enAz)
    return {
      kararSayisi: gecerli.length,
      ortancaSn: null,
      incelemedenOnay: 0,
      incelemedenOnayOrani: null,
      gizli: true,
    };
  const s = gecerli.map((k) => k.sureMs).sort((a, b) => a - b);
  const n = s.length;
  const ortancaMs = n % 2 ? (s[(n - 1) / 2] as number) : ((s[n / 2 - 1] as number) + (s[n / 2] as number)) / 2;
  const incelemeden = gecerli.filter((k) => k.sonuc === "onaylandi" && k.sureMs < esik).length;
  return {
    kararSayisi: n,
    ortancaSn: ortancaMs / 1000,
    incelemedenOnay: incelemeden,
    incelemedenOnayOrani: incelemeden / n,
    gizli: false,
  };
}
