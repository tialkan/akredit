// Gelen veride kişisel veri denetimi. Açık sunucu kişisel veri işlemez (CLAUDE.md ilke 7): desen görülürse
// istek reddedilir, kullanıcıdan maskeleyip yeniden göndermesi istenir. Bulunan değer hiçbir yere yazılmaz,
// yalnız türü söylenir. Desenler @akredit/yz KVKK maskeleyicisinden gelir (TCKN, telefon, e-posta, IBAN,
// öğrenci numarası, unvanlı ya da yaygın adla başlayan kişi adı, adres, imza).

import { maskele, type VeriTuru } from "@akredit/yz";

const TUR_ADI: Record<VeriTuru, string> = {
  KİŞİ: "kişi adı",
  TCKN: "T.C. kimlik numarası",
  TELEFON: "telefon numarası",
  EPOSTA: "e-posta adresi",
  IBAN: "IBAN",
  "ÖĞRENCİ-NO": "öğrenci numarası",
  ADRES: "adres",
  İMZA: "imza",
};

/** Bir girdideki bütün metinleri (anahtarlar dahil) gezer. */
function metinler(deger: unknown, cikti: string[] = []): string[] {
  if (typeof deger === "string") cikti.push(deger);
  else if (Array.isArray(deger)) for (const x of deger) metinler(x, cikti);
  else if (deger !== null && typeof deger === "object")
    for (const [k, v] of Object.entries(deger)) {
      cikti.push(k);
      metinler(v, cikti);
    }
  return cikti;
}

/** Girdide kişisel veri olabilecek türlerin adları (değerler değil). Boşsa temiz. */
export function kisiselVeriTurleri(girdi: unknown): string[] {
  const turler = new Set<VeriTuru>();
  for (const m of metinler(girdi)) for (const e of maskele(m).eslemeler) turler.add(e.tur);
  return [...turler].map((t) => TUR_ADI[t]);
}

export function kisiselVeriIletisi(turler: readonly string[]): string {
  return `Gönderdiğiniz veride kişisel veri olabilecek ifadeler var (${turler.join(", ")}). Bu sunucu kişisel veri işlemez. Adları, numaraları ve iletişim bilgilerini maskeleyip (ör. "Öğrenci 1", "[KİŞİ-1]") yeniden gönderin.`;
}
