// Not aktarımı eşleme profili: tespit edilemeyen dökümler için kurum düzeyinde kaydedilen sütun eşlemesi (JSON).
// Profilde kişisel veri yoktur; yalnız sütun harfleri, satır numaraları ve soru numaraları bulunur.

import { z } from "zod";

const sutun = z.string().regex(/^[A-Z]{1,3}$/, "Sütun harfle yazılmalı (A, B, ..., AA).");

export const notAktarimProfiliSemasi = z.object({
  surum: z.literal(1),
  /** Sayfa adı; yoksa ilk sayfa. */
  sayfa: z.string().optional(),
  /** 1'den başlayan başlık satırı numarası. */
  baslikSatiri: z.number().int().min(1),
  ogrenciNoSutunu: sutun,
  /** Ad sütunu yalnız yok sayılmak için bilinir; hiç okunmaz. */
  adSutunu: sutun.optional(),
  sorular: z
    .array(z.object({ sutun, no: z.string().min(1), tamPuan: z.number().positive().nullable().optional() }))
    .min(1),
  toplamSutunu: sutun.optional(),
  harfSutunu: sutun.optional(),
  /** "Tam Puan" satırının 1'den başlayan numarası. */
  tamPuanSatiri: z.number().int().min(1).optional(),
});

export type NotAktarimProfili = z.infer<typeof notAktarimProfiliSemasi>;

/** Dışarıdan gelen (JSON) profili doğrular. Hatalıysa Türkçe ileti fırlatır. */
export function profilOku(veri: unknown): NotAktarimProfili {
  const s = notAktarimProfiliSemasi.safeParse(veri);
  if (!s.success) {
    const ilk = s.error.issues[0];
    throw new Error(
      `Not aktarım eşlemesi geçersiz (${ilk?.path.join(".") || "kök"}): ${ilk?.message ?? "bilinmeyen sorun"}. Eşlemeyi yeniden kaydedin.`,
    );
  }
  return s.data;
}

/** 0'dan başlayan sütun sırasını harfe çevirir (0 → A, 26 → AA). */
export function sutunHarfi(i: number): string {
  let s = "";
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s;
  return s;
}

/** Sütun harfini 0'dan başlayan sıraya çevirir (A → 0, AA → 26). */
export function sutunSirasi(harf: string): number {
  let n = 0;
  for (const c of harf) n = n * 26 + (c.charCodeAt(0) - 64);
  return n - 1;
}
