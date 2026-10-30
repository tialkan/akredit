// Hat bağlamı: veritabanı, depo, kuyruk, YZ sağlayıcısı ve isteğe bağlı OCR/virüs tarayıcısı.

import type { NesneDeposu } from "@akredit/depo";
import { type FabrikaSecenegi, kurumSaglayicisi, YzAnahtariYokHatasi } from "@akredit/servis";
import { kiraciIslemi, sema, type Vt } from "@akredit/vt";
import { type KurumYzAyari, type MaskeSecenegi, ogrenciNoDesenleriniDerle, type Saglayici } from "@akredit/yz";
import { eq } from "drizzle-orm";
import { z } from "zod";
import type { Kuyruk } from "./kuyruk.ts";
import type { OcrMotoru } from "./ocr.ts";
import type { VirusTarayici } from "./virus.ts";

export const KUYRUK = {
  cikar: "kanit.cikar",
  ocr: "kanit.ocr",
  zenginlestir: "kanit.zenginlestir",
  sinifla: "kanit.sinifla",
} as const;

export interface HatBaglami {
  db: Vt;
  depo: NesneDeposu;
  kuyruk: Kuyruk;
  /**
   * Sabit sağlayıcı (testler ve tek kurumlu kurulum). Verilmezse ve `kurumFabrikasi` verilmişse sağlayıcı
   * her iş anında kuruma göre kurulur: kurumun kayıtlı OpenRouter anahtarı kasadan çözülür (İP-35).
   * İkisi de yoksa YZ adımları atlanır ve durumda belirtilir.
   */
  saglayici?: Saglayici;
  /** Kuruma göre sağlayıcı fabrikasının seçenekleri (kasa, kurum içi model). İş yüküne anahtar girmez. */
  kurumFabrikasi?: FabrikaSecenegi;
  ocr?: OcrMotoru;
  virus?: VirusTarayici;
  /** Kurumun YZ ayarı. Verilmezse `kurum.ayarlar.yz` okunur; o da yoksa yurt dışı izni yok sayılır. */
  yzAyari?: (kurumId: string) => Promise<KurumYzAyari>;
  /** Sınıflamada önerilecek ölçütler. Verilmezse çerçeve tablosundaki ölçütler okunur. */
  olcutler?: (kurumId: string) => Promise<{ kod: string; ad: string }[]>;
  /** Tek dosya sınırı (bayt). Varsayılan 100 MB. */
  enBuyukBoyut?: number;
  /** Metin çıkarma worker süre sınırı (ms). */
  cikarmaSureMs?: number;
}

const KurumAyarSemasi = z.object({
  yz: z
    .object({
      yurtDisiIzin: z.boolean().default(false),
      adlar: z.array(z.string()).optional(),
      ogrenciNoDesenleri: z.array(z.string()).optional(),
    })
    .optional(),
});

/** Kurum ayarından YZ ayarını okur; geçersiz ya da eksik ayar en güvenli değere (izin yok) düşer. */
export async function kurumYzAyari(b: HatBaglami, kurumId: string): Promise<KurumYzAyari> {
  if (b.yzAyari) return b.yzAyari(kurumId);
  const satir = await kiraciIslemi(b.db, kurumId, async (tx) =>
    tx.select({ ayarlar: sema.kurum.ayarlar }).from(sema.kurum).where(eq(sema.kurum.id, kurumId)),
  );
  const ayar = KurumAyarSemasi.safeParse(satir[0]?.ayarlar ?? {});
  const yz = ayar.success ? ayar.data.yz : undefined;
  const maske: MaskeSecenegi = {};
  if (yz?.adlar) maske.adlar = yz.adlar;
  if (yz?.ogrenciNoDesenleri) maske.ogrenciNoDesenleri = ogrenciNoDesenleriniDerle(yz.ogrenciNoDesenleri);
  return { yurtDisiIzin: yz?.yurtDisiIzin ?? false, maske };
}

export async function olcutListesi(b: HatBaglami, kurumId: string): Promise<{ kod: string; ad: string }[]> {
  if (b.olcutler) return b.olcutler(kurumId);
  const rows = await kiraciIslemi(b.db, kurumId, async (tx) =>
    tx.select({ kod: sema.olcut.kod, ad: sema.olcut.baslik }).from(sema.olcut).orderBy(sema.olcut.sira).limit(300),
  );
  return rows;
}

export type SaglayiciCozumu =
  | { saglayici: Saglayici; politikaUygulandi: boolean }
  | { saglayici: null; ileti: string; anahtarYok: boolean };

/**
 * İş anında sağlayıcıyı çözer. Fabrika yolu politikayı (yurt dışı izni, maskeleme) kendisi uygular.
 * Anahtar yoksa iş "Yapay zekâ anahtarı tanımlı değil" iletisiyle durur; bildirim kurum yöneticisine düşer.
 */
export async function saglayiciCoz(b: HatBaglami, kurumId: string): Promise<SaglayiciCozumu> {
  if (b.saglayici) return { saglayici: b.saglayici, politikaUygulandi: false };
  if (!b.kurumFabrikasi) return { saglayici: null, ileti: "Yapay zekâ hizmeti tanımlı değil.", anahtarYok: false };
  try {
    const k = await kurumSaglayicisi(b.db, kurumId, b.kurumFabrikasi);
    return { saglayici: k.saglayici, politikaUygulandi: true };
  } catch (e) {
    if (e instanceof YzAnahtariYokHatasi) return { saglayici: null, ileti: e.message, anahtarYok: true };
    throw e;
  }
}
