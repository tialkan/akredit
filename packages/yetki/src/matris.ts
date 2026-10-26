// Saf yetki matrisi: roller × kapsam (kurum, birim, program, ders) × eylemler.
// IO yapmaz; zaman parametre olarak verilir. Veritabanındaki `rol` ve `kapsam_turu` türleriyle aynı adlar.

export const ROLLER = [
  "kurum_yoneticisi",
  "kalite_komisyonu_baskani",
  "kalite_komisyonu_uyesi",
  "birim_kalite_sorumlusu",
  "program_sorumlusu",
  "ogretim_elemani",
  "degerlendirici",
  "gozlemci",
] as const;
export type Rol = (typeof ROLLER)[number];

export const KAPSAM_TURLERI = ["kurum", "birim", "program", "ders"] as const;
export type KapsamTuru = (typeof KAPSAM_TURLERI)[number];

export const EYLEMLER = [
  // Okuma
  "kanit.oku",
  "oneri.oku",
  "rapor.oku",
  "olcme.oku",
  "gunluk.oku",
  // Yazma ve onay
  "kanit.yukle",
  "olcme.veri_gir",
  "rapor.duzenle",
  "karar.ver",
  "surec.yonet",
  // İnsan kararı: dış gönderim ve yetki devri politikası
  "rapor.gonder",
  "politika.imzala",
  // Yönetim
  "kullanici.davet_et",
  "kullanici.ice_aktar",
  "rol.ata",
  "api_anahtari.yonet",
  "kurum.ayar_yonet",
] as const;
export type Eylem = (typeof EYLEMLER)[number];

/** Salt okunur eylemler: değerlendirici ve gözlemcinin yapabileceklerinin üst sınırı. */
export const OKUMA_EYLEMLERI: ReadonlySet<Eylem> = new Set([
  "kanit.oku",
  "oneri.oku",
  "rapor.oku",
  "olcme.oku",
  "gunluk.oku",
]);

/** Yalnız kurum kapsamında atanmış bir rolle yapılabilen eylemler. */
export const KURUM_DUZEYI_EYLEMLER: ReadonlySet<Eylem> = new Set([
  "kullanici.ice_aktar",
  "api_anahtari.yonet",
  "kurum.ayar_yonet",
  "politika.imzala",
  "rapor.gonder",
]);

const OKU: Eylem[] = ["kanit.oku", "oneri.oku", "rapor.oku", "olcme.oku"];

/** Her rolün izin verdiği eylemler (kapsam ayrıca denetlenir). */
export const ROL_EYLEMLERI: Readonly<Record<Rol, ReadonlySet<Eylem>>> = {
  kurum_yoneticisi: new Set<Eylem>([...EYLEMLER]),
  kalite_komisyonu_baskani: new Set<Eylem>([
    ...OKU,
    "gunluk.oku",
    "kanit.yukle",
    "olcme.veri_gir",
    "rapor.duzenle",
    "karar.ver",
    "surec.yonet",
    "rapor.gonder",
    "politika.imzala",
    "kullanici.davet_et",
    "kullanici.ice_aktar",
    "rol.ata",
  ]),
  kalite_komisyonu_uyesi: new Set<Eylem>([...OKU, "kanit.yukle", "rapor.duzenle", "karar.ver"]),
  birim_kalite_sorumlusu: new Set<Eylem>([
    ...OKU,
    "gunluk.oku",
    "kanit.yukle",
    "olcme.veri_gir",
    "rapor.duzenle",
    "karar.ver",
    "surec.yonet",
    "kullanici.davet_et",
  ]),
  program_sorumlusu: new Set<Eylem>([...OKU, "kanit.yukle", "olcme.veri_gir", "rapor.duzenle", "karar.ver"]),
  ogretim_elemani: new Set<Eylem>([...OKU, "kanit.yukle", "olcme.veri_gir", "karar.ver"]),
  degerlendirici: new Set<Eylem>(["kanit.oku", "rapor.oku", "olcme.oku"]),
  gozlemci: new Set<Eylem>(["kanit.oku", "rapor.oku"]),
};

/** Süresiz atanamayan roller (değerlendirici süreli salt okunur erişimdir). */
export const SURELI_ROLLER: ReadonlySet<Rol> = new Set(["degerlendirici"]);
/** Değerlendirici erişiminin en uzun süresi: 120 gün. */
export const DEGERLENDIRICI_AZAMI_SURE_MS = 120 * 24 * 60 * 60 * 1000;

export interface KapsamDugumu {
  tur: KapsamTuru;
  id: string;
}

/** Rol ataması (vt `rol_atamasi` satırının yetki için gereken kısmı). */
export interface RolAtamasi {
  rol: Rol;
  kapsam: KapsamDugumu;
  baslangic: Date;
  bitis: Date | null;
}

/** İstekte bulunan kişi: kurumu ve etkin rol atamaları. */
export interface YetkiKisisi {
  kisiId: string;
  kurumId: string;
  atamalar: readonly RolAtamasi[];
}

/**
 * Hedef: kurumu ve kapsam zinciri (kökten yaprağa). Ör. bir ders için
 * `[{kurum}, {birim}, {program}, {ders}]`. Zinciri sunucu veritabanından kurar, istemciden almaz.
 */
export interface YetkiHedefi {
  kurumId: string;
  zincir: readonly KapsamDugumu[];
}

/** Atama verilen anda geçerli mi? (başlangıç dahil, bitiş hariç) */
export function atamaEtkinMi(a: RolAtamasi, simdi: Date): boolean {
  const t = simdi.getTime();
  if (t < a.baslangic.getTime()) return false;
  if (a.bitis !== null && t >= a.bitis.getTime()) return false;
  // Süreli rol bitişsiz kaydedilmişse hiç geçerli sayılmaz.
  if (SURELI_ROLLER.has(a.rol) && a.bitis === null) return false;
  return true;
}

/** Atamanın kapsamı hedefi kapsıyor mu? Kurum kapsamı kurumun kimliğiyle eşleşmeli. */
export function kapsamKapsarMi(kapsam: KapsamDugumu, hedef: YetkiHedefi): boolean {
  if (kapsam.tur === "kurum") return kapsam.id === hedef.kurumId;
  return hedef.zincir.some((d) => d.tur === kapsam.tur && d.id === kapsam.id);
}

/** Tek bir atama bu eylemi bu hedefte izin veriyor mu? */
export function atamaIzinVerirMi(a: RolAtamasi, eylem: Eylem, hedef: YetkiHedefi, simdi: Date): boolean {
  if (!atamaEtkinMi(a, simdi)) return false;
  if (!ROL_EYLEMLERI[a.rol].has(eylem)) return false;
  if (KURUM_DUZEYI_EYLEMLER.has(eylem) && a.kapsam.tur !== "kurum") return false;
  return kapsamKapsarMi(a.kapsam, hedef);
}

/**
 * Ana yetki işlevi. Kiracı sınırı ilk denetimdir: kişinin kurumu hedefin kurumu değilse hiçbir rol
 * yetki vermez. Zincirin kökü verilmişse kurumla tutarlı olmalı.
 */
export function yetkiliMi(kisi: YetkiKisisi, eylem: Eylem, hedef: YetkiHedefi, simdi: Date): boolean {
  if (kisi.kurumId !== hedef.kurumId) return false;
  const kok = hedef.zincir[0];
  if (kok && kok.tur === "kurum" && kok.id !== hedef.kurumId) return false;
  return kisi.atamalar.some((a) => atamaIzinVerirMi(a, eylem, hedef, simdi));
}

/** Kişinin hedefte yapabileceği bütün eylemler (arayüzde düğmeleri göstermek için). */
export function izinliEylemler(kisi: YetkiKisisi, hedef: YetkiHedefi, simdi: Date): Eylem[] {
  return EYLEMLER.filter((e) => yetkiliMi(kisi, e, hedef, simdi));
}

/** Kurum düzeyi hedef. */
export function kurumHedefi(kurumId: string): YetkiHedefi {
  return { kurumId, zincir: [{ tur: "kurum", id: kurumId }] };
}
