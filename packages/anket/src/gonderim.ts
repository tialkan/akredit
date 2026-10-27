// Anket gönderim ve hatırlatma planı (saf). Süreç motorunun kurallarıyla çalışır: kurum saat dilimi ve
// sessiz saatler `@akredit/surec`'ten gelir, her eylemin tekil anahtarı vardır ve motor uzun süre
// çalışmadıysa geçmiş hatırlatmalar yağdırılmaz (yalnız en sonuncusu gider).

import { GUN_MS, sessizMi, sessizSonrasi } from "@akredit/surec";
import { z } from "zod";

export const AnketAyari = z
  .object({
    /** davet: kişiye özel bağlantı e-postayla; baglanti: herkese açık bağlantı ve QR. */
    erisim: z.enum(["davet", "baglanti"]).default("davet"),
    baslangic: z.iso.datetime({ offset: true }),
    bitis: z.iso.datetime({ offset: true }),
    /** Bitişten kaç gün önce yanıtlamayanlara hatırlatılır. */
    hatirlatmalar: z.array(z.number().int().min(1).max(90)).max(5).default([3, 1]),
    /** En çok kaç yanıt alınır (yoksa sınırsız). */
    kota: z.number().int().min(1).max(100_000).optional(),
    /** Sonuçların gösterilmesi için en az yanıt (küçük gruplarda tanınabilirlik). */
    esik: z.number().int().min(3).max(50).default(5),
  })
  .refine((a) => Date.parse(a.bitis) > Date.parse(a.baslangic), "Bitiş, başlangıçtan sonra olmalı.");
export type AnketAyari = z.infer<typeof AnketAyari>;
export type AnketAyariGirdisi = z.input<typeof AnketAyari>;

export type GonderimEylemi = "davet" | `hatirlatma_${number}` | "kapanis";

export interface SessizSaat {
  sessizBaslangic: string;
  sessizBitis: string;
  saatDilimi: string;
}

export interface GonderimPlani {
  /** Şimdi yapılacaklar (sırayla). */
  eylemler: GonderimEylemi[];
  /** Yapılmış sayılacak ama gönderilmeyecek (kaçırılmış eski hatırlatmalar). */
  bastirilan: GonderimEylemi[];
  /** Planın yeniden bakılması gereken ilk an; iş bittiyse null. */
  sonraki: Date | null;
}

export function gonderimPlani(
  ayar: AnketAyari,
  yapilanlar: readonly string[],
  simdi: Date,
  sessiz: SessizSaat,
): GonderimPlani {
  const bas = new Date(ayar.baslangic);
  const bit = new Date(ayar.bitis);
  const yapildi = new Set(yapilanlar);
  if (yapildi.has("kapanis")) return { eylemler: [], bastirilan: [], sonraki: null };
  if (simdi >= bit) return { eylemler: ["kapanis"], bastirilan: [], sonraki: null };
  if (simdi < bas) return { eylemler: [], bastirilan: [], sonraki: bas };

  const hatirlatmalar = [...new Set(ayar.hatirlatmalar)]
    .sort((a, b) => b - a)
    .map((g) => ({ anahtar: `hatirlatma_${g}` as GonderimEylemi, zaman: new Date(bit.getTime() - g * GUN_MS) }))
    .filter((h) => h.zaman > bas);
  const gelecek = [...hatirlatmalar.map((h) => h.zaman).filter((z) => z > simdi), bit];
  const enYakin = new Date(Math.min(...gelecek.map((z) => z.getTime())));

  if (ayar.erisim === "baglanti") return { eylemler: [], bastirilan: [], sonraki: bit };
  if (sessizMi(simdi, sessiz)) {
    const s = sessizSonrasi(simdi, sessiz);
    return { eylemler: [], bastirilan: [], sonraki: s < bit ? s : bit };
  }
  const eylemler: GonderimEylemi[] = [];
  const bastirilan: GonderimEylemi[] = [];
  if (!yapildi.has("davet")) eylemler.push("davet");
  const vadesi = hatirlatmalar.filter((h) => h.zaman <= simdi && !yapildi.has(h.anahtar));
  const son = vadesi.at(-1);
  for (const h of vadesi) {
    // Davet şimdi gidiyorsa hatırlatma gereksiz; motor geç çalıştıysa yalnız en son hatırlatma gider.
    if (h === son && yapildi.has("davet")) eylemler.push(h.anahtar);
    else bastirilan.push(h.anahtar);
  }
  return { eylemler, bastirilan, sonraki: enYakin };
}
