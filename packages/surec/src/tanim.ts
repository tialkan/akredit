// Bildirimsel süreç tanımı. Tanım veridir: kurum ayarından ya da hazır süreçlerden gelir, zod ile
// doğrulanır. Takvim tarihleri tanıma gömülmez; yalnız takvim anahtarı (ör. "donem_sonu") yazılır,
// tarih kurum ayarından ve çerçeve verisinden gelir.

import { z } from "zod";

const Kod = z.string().regex(/^[a-z0-9_]{2,64}$/u, "Kod küçük harf, rakam ve alt çizgiden oluşmalı.");

export const Puko = z.enum(["planla", "uygula", "kontrol_et", "onlem_al"]);
export const Rol = z.enum([
  "kurum_yoneticisi",
  "kalite_komisyonu_baskani",
  "kalite_komisyonu_uyesi",
  "birim_kalite_sorumlusu",
  "program_sorumlusu",
  "ogretim_elemani",
]);

/** Takvimdeki bir tarihe göre an: tarih + gün farkı, kurum saat diliminde `saat`te. */
export const TakvimNoktasi = z.object({
  anahtar: Kod,
  gunFark: z.number().int().min(-366).max(366).default(0),
});

export type Kosul =
  | { tur: "adimlar_tamam"; adimlar: string[] }
  | { tur: "olay"; olay: string }
  | { tur: "tarih"; nokta: { anahtar: string; gunFark: number } }
  | { tur: "hepsi"; kosullar: Kosul[] }
  | { tur: "herhangi"; kosullar: Kosul[] };

export const Kosul: z.ZodType<Kosul> = z.lazy(() =>
  z.discriminatedUnion("tur", [
    z.object({ tur: z.literal("adimlar_tamam"), adimlar: z.array(Kod).min(1) }),
    z.object({ tur: z.literal("olay"), olay: Kod }),
    z.object({ tur: z.literal("tarih"), nokta: TakvimNoktasi }),
    z.object({ tur: z.literal("hepsi"), kosullar: z.array(Kosul).min(1) }),
    z.object({ tur: z.literal("herhangi"), kosullar: z.array(Kosul).min(1) }),
  ]),
) as z.ZodType<Kosul>;

/** Adımın ne zaman açılacağı. */
export const Tetikleyici = z.discriminatedUnion("tur", [
  /** Süreç başlar başlamaz. */
  z.object({ tur: z.literal("baslangic") }),
  /** Takvimdeki bir tarihte. */
  z.object({ tur: z.literal("tarih"), nokta: TakvimNoktasi }),
  /** Bir olay bildirildiğinde (ör. "notlar_girildi"). */
  z.object({ tur: z.literal("olay"), olay: Kod }),
  /** Koşul sağlandığında (ör. önceki adımlar tamam). */
  z.object({ tur: z.literal("kosul"), kosul: Kosul }),
]);

export const SonTarih = z.union([
  z.object({ tur: z.literal("takvim"), nokta: TakvimNoktasi }),
  /** Adım açıldıktan sonra gün sayısı. */
  z.object({ tur: z.literal("sure"), gun: z.number().int().min(1).max(366) }),
]);

export const Adim = z.object({
  kod: Kod,
  ad: z.string().min(1).max(200),
  puko: Puko,
  tetikleyici: Tetikleyici,
  gorev: z.object({
    baslik: z.string().min(1).max(200),
    aciklama: z.string().max(2000).optional(),
    /** Görevin atanacağı rol; kişi süreç başlatılırken verilen atamadan ya da rol atamalarından bulunur. */
    rol: Rol,
  }),
  sonTarih: SonTarih,
  /** Görev kapanmadan önce bağlanması gereken en az kanıt sayısı. */
  enAzKanit: z.number().int().min(0).max(50).default(1),
  /** Son tarihten kaç gün önce hatırlatılır. */
  hatirlatmalar: z.array(z.number().int().min(0).max(90)).default([7, 1]),
  /** Son tarihten kaç gün sonra hangi role yükseltilir. */
  yukseltme: z.object({ gunSonra: z.number().int().min(0).max(90), rol: Rol }).optional(),
});

export const SurecTanimi = z
  .object({
    kod: Kod,
    ad: z.string().min(1).max(200),
    aciklama: z.string().max(2000).optional(),
    /** Sürecin kendiliğinden başlayacağı an (yoksa elle ya da olayla başlatılır). */
    baslatma: z
      .discriminatedUnion("tur", [
        z.object({ tur: z.literal("elle") }),
        z.object({ tur: z.literal("tarih"), nokta: TakvimNoktasi }),
        z.object({ tur: z.literal("olay"), olay: Kod }),
      ])
      .default({ tur: "elle" }),
    /** Bu tanımın kullandığı takvim anahtarları ve kullanıcıya görünen adları. */
    takvimAnahtarlari: z.record(Kod, z.string().min(1)).default({}),
    adimlar: z.array(Adim).min(1).max(50),
  })
  .superRefine((t, ctx) => {
    const kodlar = new Set<string>();
    for (const a of t.adimlar) {
      if (kodlar.has(a.kod)) ctx.addIssue({ code: "custom", message: `Adım kodu tekrar ediyor: ${a.kod}` });
      kodlar.add(a.kod);
    }
    const kullanilan = new Set<string>();
    const kosulGez = (k: Kosul) => {
      if (k.tur === "adimlar_tamam")
        for (const a of k.adimlar)
          if (!kodlar.has(a)) ctx.addIssue({ code: "custom", message: `Bilinmeyen adım: ${a}` });
      if (k.tur === "tarih") kullanilan.add(k.nokta.anahtar);
      if (k.tur === "hepsi" || k.tur === "herhangi") k.kosullar.forEach(kosulGez);
    };
    if (t.baslatma.tur === "tarih") kullanilan.add(t.baslatma.nokta.anahtar);
    for (const a of t.adimlar) {
      if (a.tetikleyici.tur === "kosul") kosulGez(a.tetikleyici.kosul);
      if (a.tetikleyici.tur === "tarih") kullanilan.add(a.tetikleyici.nokta.anahtar);
      if (a.sonTarih.tur === "takvim") kullanilan.add(a.sonTarih.nokta.anahtar);
    }
    for (const k of kullanilan)
      if (!(k in t.takvimAnahtarlari))
        ctx.addIssue({ code: "custom", message: `Takvim anahtarı tanımda adlandırılmamış: ${k}` });
  });

export type SurecTanimi = z.infer<typeof SurecTanimi>;
export type SurecTanimiGirdisi = z.input<typeof SurecTanimi>;
export type Adim = z.infer<typeof Adim>;
export type Tetikleyici = z.infer<typeof Tetikleyici>;

/** Kurum ayarındaki süreç bölümü: `kurum.ayarlar.surec`. */
export const SurecAyari = z.object({
  saatDilimi: z.string().default("Europe/Istanbul"),
  /** Takvim tarihlerinin hangi yerel saatte geçerli sayılacağı. */
  gunSaati: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/u)
    .default("09:00"),
  /** Takvim anahtarı → "YYYY-MM-DD". Kurumun girdiği ya da içe aktardığı tarihler. */
  takvim: z.record(z.string(), z.string().regex(/^\d{4}-\d{2}-\d{2}$/u)).default({}),
  bildirim: z
    .object({
      sessizBaslangic: z
        .string()
        .regex(/^([01]\d|2[0-3]):[0-5]\d$/u)
        .default("20:00"),
      sessizBitis: z
        .string()
        .regex(/^([01]\d|2[0-3]):[0-5]\d$/u)
        .default("08:00"),
      /** "aninda": her bildirim ayrı e-posta; "gunluk": günde bir özet. */
      eposta: z.enum(["aninda", "gunluk", "kapali"]).default("aninda"),
      ozetSaati: z
        .string()
        .regex(/^([01]\d|2[0-3]):[0-5]\d$/u)
        .default("08:30"),
      /** Kişi başına tercih (kişi kimliği → kısmi tercih). */
      kisiler: z
        .record(
          z.string(),
          z.object({
            eposta: z.enum(["aninda", "gunluk", "kapali"]).optional(),
            sessizBaslangic: z.string().optional(),
            sessizBitis: z.string().optional(),
          }),
        )
        .default({}),
    })
    .prefault({}),
});
export type SurecAyari = z.infer<typeof SurecAyari>;

/** Geçersiz ayar parçası varsa varsayılanlarla çalışılır; hatalı alan yok sayılmaz, hata atılır. */
export function surecAyariOku(kurumAyarlari: unknown): SurecAyari {
  const a = (kurumAyarlari as { surec?: unknown } | null)?.surec ?? {};
  return SurecAyari.parse(a);
}
