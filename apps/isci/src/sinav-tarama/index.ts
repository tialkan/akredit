// Sınav kâğıdı taraması işi (İP-43).
//
// Yüklenen PDF ya da ZIP önce kanıt hattından (`kanitAl`) kanıt olarak geçer: SHA-256 ile saklanır, üzerine
// yazılmaz. Bu iş kanıtı depodan okur, sayfaları kurum içinde görüntüye çevirip kutuları kırpar ve metne çevirir
// (Poppler `pdftoppm` + Tesseract), sonra servis katmanındaki `taramayiIsle` ile yalnız kurum içi modele okutur.
//
// Yerel model tanımlı değilse iş hiçbir şey okumadan durur ve nedenini söyler. Yurt dışı sağlayıcıya yol yoktur:
// model ayarı yalnız sunucu ortamından (`AKREDIT_YZ_*`, kurum içi kurulum) gelir; kurumun anahtarı okunmaz.

import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { NesneDeposu } from "@akredit/depo";
import { aktorYukle, ServisHatasi, sinavTarama } from "@akredit/servis";
import { kiraciIslemi, sema, type Vt } from "@akredit/vt";
import type { FetchIslevi } from "@akredit/yz";
import { eq } from "drizzle-orm";
import { unzipSync } from "fflate";
import { z } from "zod";
import { SINAV_TARAMASI_AMACI } from "../kanit-hatti/alma.ts";
import { type KomutCalistirici, varsayilanCalistirici } from "../kanit-hatti/ocr.ts";

type TaramaKaynagi = sinavTarama.TaramaKaynagi;
type KutuYeri = sinavTarama.KutuYeri;

export interface PdfKaynakAyari {
  calistirici?: KomutCalistirici;
  dil?: string;
  sureMs?: number;
  /** Sayfanın görüntüye çevrildiği boyut (piksel). Varsayılan A4 dikey, 300 dpi. */
  genislik?: number;
  yukseklik?: number;
}

/**
 * Tek PDF'ten tarama kaynağı. Sayfa sayısı `pdfinfo` ile, sayfa metni ve kutu metni Tesseract ile okunur;
 * kutu `pdftoppm` kırpmasıyla (oransal konum → piksel) çıkarılır ve kırpıntı görüntüsü döndürülür.
 */
export async function pdfTaramaKaynagi(veri: Uint8Array, ayar: PdfKaynakAyari = {}): Promise<TaramaKaynagi> {
  const calistir = ayar.calistirici ?? varsayilanCalistirici;
  const dil = ayar.dil ?? "tur";
  const sure = ayar.sureMs ?? 120_000;
  const W = ayar.genislik ?? 2480;
  const H = ayar.yukseklik ?? 3508;
  const dizin = await mkdtemp(join(tmpdir(), "akredit-sinav-"));
  const pdf = join(dizin, "tarama.pdf");
  await writeFile(pdf, veri);
  try {
    const bilgi = await calistir("pdfinfo", [pdf], sure);
    const sayfaSayisi = Number(bilgi.match(/^Pages:\s+(\d+)/mu)?.[1] ?? 0);
    const metinler = new Map<number, string>();
    const goruntu = async (sira: number, ad: string, kirp?: KutuYeri): Promise<string> => {
      const cikti = join(dizin, ad);
      const s = String(sira + 1);
      const arg = ["-f", s, "-l", s, "-png", "-singlefile", "-scale-to-x", String(W), "-scale-to-y", String(H)];
      if (kirp)
        arg.push(
          "-x",
          String(Math.floor(kirp.x * W)),
          "-y",
          String(Math.floor(kirp.y * H)),
          "-W",
          String(Math.ceil(kirp.genislik * W)),
          "-H",
          String(Math.ceil(kirp.yukseklik * H)),
        );
      await calistir("pdftoppm", [...arg, pdf, cikti], sure);
      return `${cikti}.png`;
    };
    const kaynak: TaramaKaynagi = {
      sayfaSayisi,
      async sayfaMetni(sira) {
        const v = metinler.get(sira);
        if (v !== undefined) return v;
        const g = await goruntu(sira, `s${sira}`);
        const m = (await calistir("tesseract", [g, "stdout", "-l", dil, "--psm", "1"], sure)).trim();
        metinler.set(sira, m);
        return m;
      },
      async bolge(sira, kutu, ad) {
        const g = await goruntu(sira, `k${sira}-${ad.replace(/[^0-9a-z]/giu, "_")}`, kutu);
        const metin = (await calistir("tesseract", [g, "stdout", "-l", dil, "--psm", "7"], sure)).trim();
        let kirpinti: Uint8Array | undefined;
        try {
          kirpinti = new Uint8Array(await readFile(g));
        } catch {
          kirpinti = undefined;
        }
        return kirpinti ? { metin, kirpinti } : { metin };
      },
    };
    // Geçici dizin işin sonunda `kapat` ile silinir.
    return Object.assign(kaynak, { kapat: () => rm(dizin, { recursive: true, force: true }) });
  } catch (e) {
    await rm(dizin, { recursive: true, force: true });
    throw e;
  }
}

/** Birden çok kaynağı (ZIP içindeki PDF'ler, ad sırasıyla) tek kaynak gibi sıralar. */
export function birlesikKaynak(kaynaklar: readonly TaramaKaynagi[]): TaramaKaynagi {
  const yer = (sira: number): [TaramaKaynagi, number] => {
    let i = sira;
    for (const k of kaynaklar) {
      if (i < k.sayfaSayisi) return [k, i];
      i -= k.sayfaSayisi;
    }
    throw new Error("Sayfa bulunamadı.");
  };
  return {
    sayfaSayisi: kaynaklar.reduce((t, k) => t + k.sayfaSayisi, 0),
    sayfaMetni: (sira) => {
      const [k, i] = yer(sira);
      return k.sayfaMetni(i);
    },
    bolge: (sira, kutu, ad) => {
      const [k, i] = yer(sira);
      return k.bolge(i, kutu, ad);
    },
  };
}

const PDF_IMZASI = [0x25, 0x50, 0x44, 0x46];
const ZIP_IMZASI = [0x50, 0x4b, 0x03, 0x04];
const basliyor = (v: Uint8Array, imza: number[]) => imza.every((b, i) => v[i] === b);

/** PDF ya da (içinde PDF'ler olan) ZIP'ten kaynak kurar. */
export async function taramaKaynagiKur(veri: Uint8Array, ayar: PdfKaynakAyari = {}): Promise<TaramaKaynagi> {
  if (basliyor(veri, PDF_IMZASI)) return pdfTaramaKaynagi(veri, ayar);
  if (basliyor(veri, ZIP_IMZASI)) {
    const dosyalar = unzipSync(veri, { filter: (f) => /\.pdf$/iu.test(f.name) && !f.name.startsWith("__MACOSX/") });
    const adlar = Object.keys(dosyalar).sort((a, b) => a.localeCompare(b, "tr", { numeric: true }));
    if (adlar.length === 0)
      throw new ServisHatasi(
        "gecersiz_istek",
        "ZIP dosyasında taranmış PDF bulunamadı. Kâğıtları PDF olarak yükleyin.",
      );
    const kaynaklar: TaramaKaynagi[] = [];
    for (const a of adlar) kaynaklar.push(await pdfTaramaKaynagi(dosyalar[a] as Uint8Array, ayar));
    const b = birlesikKaynak(kaynaklar);
    return Object.assign(b, {
      kapat: async () => {
        for (const k of kaynaklar) await (k as { kapat?: () => Promise<void> }).kapat?.();
      },
    });
  }
  throw new ServisHatasi("gecersiz_istek", "Taranmış kâğıtları tek PDF ya da PDF'lerden oluşan ZIP olarak yükleyin.");
}

export const TaramaIsi = z
  .object({
    kurumId: z.uuid(),
    kisiId: z.uuid(),
    kanitId: z.uuid(),
    olcmeAraciId: z.uuid(),
    esik: z.number().min(0.5).max(1).optional(),
  })
  .strict();
export type TaramaIsi = z.infer<typeof TaramaIsi>;

export interface TaramaIsciBaglami {
  db: Vt;
  depo: NesneDeposu;
  /** Sunucunun yerel model ayarı (`sinavTarama.ortamdanYerelModel(process.env)`). Yoksa iş başlamaz. */
  yerelModel: sinavTarama.YerelModelAyari | null;
  takmaAdAnahtari: string;
  /** Kanıt baytlarından kaynak kurar. Varsayılan `taramaKaynagiKur` (Poppler + Tesseract). */
  kaynakKur?: (veri: Uint8Array) => Promise<TaramaKaynagi>;
  fetch?: FetchIslevi;
  /** Model sunucusu adının çözücüsü (testte sahte). */
  coz?: sinavTarama.AdCozucu;
  simdi?: () => Date;
}

/**
 * Tarama işini çalıştırır. İş yükünde yalnız kimlikler vardır; dosya depodan, model ayarı sunucudan gelir.
 * Yerel model yoksa kanıt bile okunmadan `ServisHatasi` (`kural_ihlali`) atar.
 */
export async function sinavTaramasiIsi(c: TaramaIsciBaglami, ham: unknown): Promise<sinavTarama.TaramaSonucu> {
  const is = TaramaIsi.parse(ham);
  // Önce model: yerel model yoksa ya da kurum dışındaysa hiçbir şey okunmaz.
  sinavTarama.yerelOkuyucuKur(c.yerelModel, c.fetch ? { fetch: c.fetch } : {});
  const kanit = await kiraciIslemi(c.db, is.kurumId, async (tx) => {
    const [k] = await tx
      .select({ depoAnahtari: sema.kanit.depoAnahtari, kaynakAyrinti: sema.kanit.kaynakAyrinti })
      .from(sema.kanit)
      .where(eq(sema.kanit.id, is.kanitId));
    return k;
  });
  if (!kanit) throw new ServisHatasi("bulunamadi", "Yüklenen tarama bulunamadı.");
  // Kâğıtlar yalnız tarama amacıyla (kanıt hattının metin ve YZ adımlarına girmeden) yüklenmiş olmalı; aksi hâlde
  // açık numaralı metin `kanit_parcasi`na yazılmış ve kurumun sağlayıcısına gitmiş olabilir.
  if ((kanit.kaynakAyrinti as { amac?: unknown } | null)?.amac !== SINAV_TARAMASI_AMACI)
    throw new ServisHatasi(
      "kural_ihlali",
      "Bu dosya sınav taraması için yüklenmemiş. Kâğıtları sınav taraması ekranından yeniden yükleyin.",
    );
  const veri = await c.depo.al(kanit.depoAnahtari);
  const kaynak = await (c.kaynakKur ?? taramaKaynagiKur)(veri);
  try {
    const aktor = await aktorYukle(c.db, is.kurumId, is.kisiId);
    return await sinavTarama.taramayiIsle(
      { db: c.db, aktor, simdi: c.simdi ?? (() => new Date()) },
      { olcmeAraciId: is.olcmeAraciId, kanitId: is.kanitId, ...(is.esik ? { esik: is.esik } : {}) },
      {
        kaynak,
        yerelModel: c.yerelModel,
        takmaAdAnahtari: c.takmaAdAnahtari,
        kirpintiKoy: async (kurumId, v) => c.depo.koy(kurumId, v, { mime: "image/png" }),
        ...(c.fetch ? { fetch: c.fetch } : {}),
        ...(c.coz ? { coz: c.coz } : {}),
      },
    );
  } finally {
    await (kaynak as { kapat?: () => Promise<void> }).kapat?.();
  }
}

export const SINAV_TARAMA_KUYRUGU = "sinav.tarama";
