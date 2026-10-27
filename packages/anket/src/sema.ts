// Anket tanımı ve yanıt şemaları. Tanım veridir (zod); yanıtlar tanıma göre doğrulanır.
// Yanıt nesnesi yalnız soru kodu → değer taşır: kişi, e-posta, belirteç ya da IP alanı kabul edilmez.

import { z } from "zod";

const Kod = z.string().regex(/^[a-z0-9_]{1,64}$/u, "Kod küçük harf, rakam ve alt çizgiden oluşmalı.");

export const SoruTuru = z.enum(["likert", "tek_secim", "coklu_secim", "sayi", "acik", "isyuku"]);
export type SoruTuru = z.infer<typeof SoruTuru>;

export const Soru = z
  .object({
    kod: Kod,
    metin: z.string().min(1).max(500),
    tur: SoruTuru,
    zorunlu: z.boolean().default(false),
    /** tek_secim / coklu_secim seçenekleri; likert için ölçek etiketleri (1..n). */
    secenekler: z.array(z.string().min(1).max(200)).max(20).optional(),
    /** sayi ve isyuku için alt ve üst sınır. */
    enAz: z.number().optional(),
    enCok: z.number().optional(),
    /** isyuku: Bologna iş yükü tablosundaki etkinlik adı (ör. "Ödev"). */
    etkinlik: z.string().max(200).optional(),
  })
  .superRefine((s, ctx) => {
    if ((s.tur === "tek_secim" || s.tur === "coklu_secim" || s.tur === "likert") && !s.secenekler?.length)
      ctx.addIssue({ code: "custom", message: `${s.kod}: seçenek gerekli.` });
    if (s.tur === "isyuku" && !s.etkinlik) ctx.addIssue({ code: "custom", message: `${s.kod}: etkinlik adı gerekli.` });
  });
export type Soru = z.infer<typeof Soru>;

export const HedefKitle = z.enum(["ogrenci", "mezun", "isveren", "danisma_kurulu", "ic_paydas"]);
export type HedefKitle = z.infer<typeof HedefKitle>;

export const AnketTanimi = z
  .object({
    sablon: z.string().max(64).optional(),
    baslik: z.string().min(1).max(200),
    aciklama: z.string().max(2000).optional(),
    hedefKitle: HedefKitle,
    sorular: z.array(Soru).min(1).max(100),
  })
  .superRefine((t, ctx) => {
    const g = new Set<string>();
    for (const s of t.sorular) {
      if (g.has(s.kod)) ctx.addIssue({ code: "custom", message: `Soru kodu tekrar ediyor: ${s.kod}` });
      g.add(s.kod);
    }
  });
export type AnketTanimi = z.infer<typeof AnketTanimi>;
export type AnketTanimiGirdisi = z.input<typeof AnketTanimi>;

export type YanitDegeri = number | string | string[] | null;
export type Yanit = Record<string, YanitDegeri>;

/** Kişiyi tanıtabilecek alan adları: yanıtta bulunamaz. */
const YASAK_ANAHTAR = /^(kisi|kisi_id|eposta|e_posta|email|ad|ad_soyad|ogrenci_no|tckn|ip|ipaddr|belirtec|token)$/iu;

export class YanitHatasi extends Error {
  override name = "YanitHatasi";
}

/**
 * Ham yanıtı tanıma göre doğrular ve temizler. Bilinmeyen alan reddedilir (kişi bilgisi gizlice taşınamaz).
 * Dönen nesnede yalnız tanımdaki soru kodları vardır.
 */
export function yanitDogrula(tanim: AnketTanimi, ham: unknown): Yanit {
  const g = z.record(z.string(), z.unknown()).safeParse(ham);
  if (!g.success) throw new YanitHatasi("Yanıt okunamadı. Formu yeniden gönderin.");
  const sorular = new Map(tanim.sorular.map((s) => [s.kod, s]));
  for (const k of Object.keys(g.data)) {
    if (YASAK_ANAHTAR.test(k)) throw new YanitHatasi("Yanıtta kişisel bilgi alanı olamaz.");
    if (!sorular.has(k)) throw new YanitHatasi("Yanıtta ankette olmayan bir soru var.");
  }
  const sonuc: Yanit = {};
  for (const s of tanim.sorular) {
    const v = g.data[s.kod];
    const bos = v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
    if (bos) {
      if (s.zorunlu) throw new YanitHatasi(`"${s.metin}" sorusunu yanıtlayın.`);
      sonuc[s.kod] = null;
      continue;
    }
    sonuc[s.kod] = degerDogrula(s, v);
  }
  return sonuc;
}

function sayiyaCevir(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v === "string" && /^-?\d+([.,]\d+)?$/u.test(v.trim())) return Number(v.trim().replace(",", "."));
  return null;
}

function degerDogrula(s: Soru, v: unknown): YanitDegeri {
  const hata = () => new YanitHatasi(`"${s.metin}" sorusunun yanıtı geçersiz.`);
  switch (s.tur) {
    case "likert": {
      const n = sayiyaCevir(v);
      const ust = s.secenekler?.length ?? 5;
      if (n === null || !Number.isInteger(n) || n < 1 || n > ust) throw hata();
      return n;
    }
    case "sayi":
    case "isyuku": {
      const n = sayiyaCevir(v);
      if (n === null || n < (s.enAz ?? 0) || (s.enCok !== undefined && n > s.enCok)) throw hata();
      return n;
    }
    case "tek_secim": {
      if (typeof v !== "string" || !s.secenekler?.includes(v)) throw hata();
      return v;
    }
    case "coklu_secim": {
      const d = Array.isArray(v) ? v : [v];
      if (!d.every((x) => typeof x === "string" && s.secenekler?.includes(x))) throw hata();
      return [...new Set(d as string[])];
    }
    case "acik": {
      if (typeof v !== "string") throw hata();
      return v.trim().slice(0, 4000);
    }
  }
}
