// Davet ve rol atama kuralları: kim, hangi rolü, hangi kapsamda, ne kadar süreyle atayabilir.

import {
  DEGERLENDIRICI_AZAMI_SURE_MS,
  type KapsamDugumu,
  type Rol,
  SURELI_ROLLER,
  type YetkiHedefi,
  type YetkiKisisi,
  yetkiliMi,
} from "./matris.ts";

/** Atayan rol → atayabileceği roller. Kurum yöneticisi her rolü; başkan yönetici ve başkan dışındakileri. */
export const ATANABILIR_ROLLER: Readonly<Partial<Record<Rol, ReadonlySet<Rol>>>> = {
  kurum_yoneticisi: new Set<Rol>([
    "kurum_yoneticisi",
    "kalite_komisyonu_baskani",
    "kalite_komisyonu_uyesi",
    "birim_kalite_sorumlusu",
    "program_sorumlusu",
    "ogretim_elemani",
    "degerlendirici",
    "gozlemci",
  ]),
  kalite_komisyonu_baskani: new Set<Rol>([
    "kalite_komisyonu_uyesi",
    "birim_kalite_sorumlusu",
    "program_sorumlusu",
    "ogretim_elemani",
    "degerlendirici",
    "gozlemci",
  ]),
  birim_kalite_sorumlusu: new Set<Rol>(["program_sorumlusu", "ogretim_elemani", "gozlemci"]),
};

export interface AtamaTalebi {
  rol: Rol;
  kapsam: KapsamDugumu;
  /** Atanan kapsamın hedef zinciri (sunucu veritabanından kurar). */
  hedef: YetkiHedefi;
  baslangic: Date;
  bitis: Date | null;
}

export type AtamaSonucu = { tamam: true } | { tamam: false; neden: string };

/**
 * Atayan kişi bu talebi yapabilir mi? Eylem: davet için `kullanici.davet_et`, doğrudan atama için `rol.ata`.
 * Atayanın, atadığı kapsamda o rolü verme hakkı olan etkin bir ataması olmalı.
 */
export function atamaYapabilirMi(
  atayan: YetkiKisisi,
  talep: AtamaTalebi,
  eylem: "kullanici.davet_et" | "rol.ata",
  simdi: Date,
): AtamaSonucu {
  if (talep.hedef.kurumId !== atayan.kurumId) return { tamam: false, neden: "Başka bir kurumda atama yapılamaz." };
  if (!yetkiliMi(atayan, eylem, talep.hedef, simdi))
    return { tamam: false, neden: "Bu kapsamda kullanıcı ekleme yetkiniz yok." };
  const uygun = atayan.atamalar.some((a) => {
    const izinli = ATANABILIR_ROLLER[a.rol];
    if (!izinli?.has(talep.rol)) return false;
    return yetkiliMi({ ...atayan, atamalar: [a] }, eylem, talep.hedef, simdi);
  });
  if (!uygun) return { tamam: false, neden: "Bu rolü atama yetkiniz yok." };
  if (talep.kapsam.tur === "kurum" && talep.kapsam.id !== talep.hedef.kurumId)
    return { tamam: false, neden: "Kurum kapsamı kendi kurumunuz olmalı." };
  if (talep.bitis && talep.bitis.getTime() <= talep.baslangic.getTime())
    return { tamam: false, neden: "Bitiş tarihi başlangıçtan sonra olmalı." };
  if (SURELI_ROLLER.has(talep.rol)) {
    if (!talep.bitis) return { tamam: false, neden: "Değerlendirici erişimi için bitiş tarihi zorunludur." };
    if (talep.bitis.getTime() - talep.baslangic.getTime() > DEGERLENDIRICI_AZAMI_SURE_MS)
      return { tamam: false, neden: "Değerlendirici erişimi en çok 120 gün olabilir." };
  }
  return { tamam: true };
}
