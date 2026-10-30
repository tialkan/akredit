// Saha ziyareti sayfasının saf yardımcıları (İP-48): seçim parametreleri, metin biçimleri, örnek kip verisi.
// Sayılar burada üretilmez; oranlar servisin deterministik hesabından gelir, yalnız biçimlenir.

import type { sahaZiyareti as S } from "@akredit/servis";

/** Çerçeve kodları `@akredit/cerceveler` ile aynıdır (test denetler). */
export const SAHA_CERCEVELERI = [
  ["akredit-onlisans-ic", "Önlisans iç öz değerlendirme çerçevesi (resmî değil)"],
  ["yokak-kurumsal", "YÖKAK ölçütleri (ölçüt metni doğrulanmadı)"],
  ["mudek", "MÜDEK (ölçüt metni doğrulanmadı)"],
  ["bologna-akts-ic", "Bologna/AKTS iç denetimi (resmî değil)"],
] as const;

export const ROL_SECENEKLERI = [
  ["rektorluk", "Rektörlük"],
  ["komisyon", "Kalite komisyonu"],
  ["bolum", "Bölüm"],
  ["ogretim_elemani", "Öğretim elemanı"],
  ["ogrenci", "Öğrenci"],
] as const satisfies readonly (readonly [S.Rol, string])[];

export const KAYNAK_ADLARI: Readonly<Record<S.SoruKaynagi, string>> = {
  olcut: "Ölçütten",
  eksik: "Rapordaki eksikten",
  yz: "Önerilen soru",
};

export interface Secim {
  programId: string;
  cerceveKod: string;
  rol: S.Rol;
}

const tekDeger = (x: string | string[] | undefined) => (Array.isArray(x) ? x[0] : x) ?? "";

/** Adres parametrelerinden geçerli seçim; tanınmayan değer ilk seçeneğe düşer. */
export function secimOku(
  p: Record<string, string | string[] | undefined>,
  programlar: readonly { id: string }[],
): Secim {
  const program = tekDeger(p.program);
  const cerceve = tekDeger(p.cerceve);
  const rol = tekDeger(p.rol);
  return {
    programId: programlar.some((x) => x.id === program) ? program : (programlar[0]?.id ?? ""),
    cerceveKod: SAHA_CERCEVELERI.some(([k]) => k === cerceve) ? cerceve : SAHA_CERCEVELERI[0][0],
    rol: (ROL_SECENEKLERI.find(([k]) => k === rol)?.[0] ?? "komisyon") as S.Rol,
  };
}

/** Yüzde metni, Türkçe ondalıkla: 25 → "%25,0"; oran yoksa "Soru yok". */
export function oranMetni(oran: number | null): string {
  if (oran === null) return "Soru yok";
  return `%${oran.toLocaleString("tr-TR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;
}

/** Rolün soruları ve bu kişinin prova ilerlemesi (işaretlenen / toplam). */
export function provaOzeti(d: Pick<S.SahaDurumu, "sorular" | "prova">, rol: S.Rol) {
  const sorular = d.sorular.filter((s) => s.roller.includes(rol));
  const isaretli = sorular.filter((s) => d.prova[s.id]).length;
  const eksik = sorular.filter((s) => d.prova[s.id] === "eksik_var").length;
  return { sorular, isaretli, eksik };
}

// Örnek veri kipi: kurgu kanıt bağları ve kurgu EKSİK cümleler (gerçek kurum değildir).
export const ORNEK_KANIT_BAGLARI: S.KanitBagi[] = [
  { kanitId: "ornek-1", ozet: "a1".repeat(32), dosyaAdi: "program-ciktilari-2026.pdf", olcutKodlari: ["P.1"] },
  { kanitId: "ornek-2", ozet: "b2".repeat(32), dosyaAdi: "danisma-kurulu-tutanagi.pdf", olcutKodlari: ["P.4"] },
];
export const ORNEK_EKSIKLER: S.EksikCumle[] = [
  { olcutKod: "P.3", metin: "[EKSİK: Bu ölçüt için onaylı kanıt yok.]" },
  { olcutKod: "P.5", metin: "[EKSİK: Mezun izleme anketi yüklenmedi.]" },
];
