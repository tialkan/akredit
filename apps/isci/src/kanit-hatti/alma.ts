// Kanıt alma yolları: tekli yükleme, toplu ZIP, kuruma özel e-posta, bağlayıcılar ve sistemin ürettiği belgeler.
// Hepsi `kanitAl`'a iner: dosya içerik özetiyle depolanır, aynı içerik ikinci kez kanıt olmaz.

import { gunlugeYaz, kiraciIslemi, sema } from "@akredit/vt";
import { and, eq } from "drizzle-orm";
import { type Unzipped, unzipSync } from "fflate";
import { z } from "zod";
import { type HatBaglami, KUYRUK } from "./baglam.ts";
import { durumYaz } from "./durum.ts";

export type KaynakTuru = "yukleme" | "baglayici" | "eposta" | "uretilen";

export interface KanitGirdisi {
  kurumId: string;
  veri: Uint8Array;
  dosyaAdi: string;
  mime?: string;
  kaynakTuru: KaynakTuru;
  /** ör. {bagkayici:"bologna"}, {eposta:{gonderen, konu}}, {zip:"paket.zip", yol:"a/b.pdf"} */
  kaynakAyrinti?: Record<string, unknown>;
  yukleyenKisiId?: string;
  kapsamlar?: { tur: string; id: string }[];
  belgeTarihi?: string;
}

export type AlmaSonucu =
  | { durum: "eklendi"; kanitId: string; ozet: string }
  | { durum: "zaten_var"; kanitId: string; ozet: string }
  | { durum: "reddedildi"; ileti: string };

const VARSAYILAN_BOYUT = 100 * 1024 * 1024;

const GirdiSemasi = z.object({
  kurumId: z.uuid(),
  dosyaAdi: z.string().trim().min(1).max(400),
  mime: z.string().max(200).optional(),
  kaynakTuru: z.enum(["yukleme", "baglayici", "eposta", "uretilen"]),
  yukleyenKisiId: z.uuid().optional(),
  belgeTarihi: z.string().max(40).optional(),
});

/** Dosya adından yol ve denetim karakterlerini atar. */
export function dosyaAdiTemizle(ad: string): string {
  const son = ad.split(/[\\/]/u).at(-1) ?? "";
  // biome-ignore lint/suspicious/noControlCharactersInRegex: denetim karakterleri bilerek atılıyor
  const temiz = son.replace(/[\u0000-\u001f\u007f]/gu, "").trim();
  return temiz.slice(0, 200) || "adsiz";
}

/** Tek bir dosyayı kanıt olarak alır ve işleme kuyruğuna koyar. */
export async function kanitAl(b: HatBaglami, g: KanitGirdisi): Promise<AlmaSonucu> {
  const d = GirdiSemasi.safeParse(g);
  if (!d.success) return { durum: "reddedildi", ileti: "Dosya bilgileri eksik ya da hatalı." };
  const dosyaAdi = dosyaAdiTemizle(g.dosyaAdi);
  const sinir = b.enBuyukBoyut ?? VARSAYILAN_BOYUT;
  if (g.veri.byteLength === 0) return { durum: "reddedildi", ileti: `${dosyaAdi}: dosya boş.` };
  if (g.veri.byteLength > sinir)
    return {
      durum: "reddedildi",
      ileti: `${dosyaAdi}: dosya çok büyük (en çok ${Math.floor(sinir / 1048576)} MB). Bölerek yükleyin.`,
    };
  if (b.virus) {
    const t = await b.virus.tara(g.veri);
    if (!t.temiz)
      return {
        durum: "reddedildi",
        ileti: `${dosyaAdi}: dosyada zararlı yazılım bulundu, kaydedilmedi. Dosyayı kontrol ettirin.`,
      };
  }
  const nesne = await b.depo.koy(g.kurumId, g.veri, g.mime ? { mime: g.mime } : {});
  const sonuc = await kiraciIslemi(b.db, g.kurumId, async (tx) => {
    const varolan = await tx
      .select({ id: sema.kanit.id })
      .from(sema.kanit)
      .where(and(eq(sema.kanit.kurumId, g.kurumId), eq(sema.kanit.ozet, nesne.ozet)));
    if (varolan[0]) return { durum: "zaten_var" as const, kanitId: varolan[0].id, ozet: nesne.ozet };
    const eklenen = await tx
      .insert(sema.kanit)
      .values({
        kurumId: g.kurumId,
        ozet: nesne.ozet,
        dosyaAdi,
        mime: g.mime ?? "application/octet-stream",
        boyut: g.veri.byteLength,
        depoAnahtari: nesne.anahtar,
        kaynakTuru: g.kaynakTuru,
        kaynakAyrinti: g.kaynakAyrinti ?? {},
        belgeTarihi: g.belgeTarihi ?? null,
        kapsamlar: g.kapsamlar ?? [],
        yukleyenKisiId: g.yukleyenKisiId ?? null,
      })
      .onConflictDoNothing()
      .returning({ id: sema.kanit.id });
    const kanitId = eklenen[0]?.id;
    if (!kanitId) {
      // Eşzamanlı aynı içerik: tekillik kısıtı ikinciyi engelledi.
      const v = await tx
        .select({ id: sema.kanit.id })
        .from(sema.kanit)
        .where(and(eq(sema.kanit.kurumId, g.kurumId), eq(sema.kanit.ozet, nesne.ozet)));
      return { durum: "zaten_var" as const, kanitId: v[0]?.id as string, ozet: nesne.ozet };
    }
    await durumYaz(tx, g.kurumId, kanitId, "bekliyor", { asama: "alindi" });
    await gunlugeYaz(tx, {
      aktor: g.yukleyenKisiId ? { tur: "kisi", id: g.yukleyenKisiId } : { tur: "sistem", id: null },
      eylem: "kanit.eklendi",
      hedef: { tur: "kanit", id: kanitId },
      ayrinti: { ozet: nesne.ozet, kaynakTuru: g.kaynakTuru, boyut: g.veri.byteLength },
    });
    return { durum: "eklendi" as const, kanitId, ozet: nesne.ozet };
  });
  if (sonuc.durum === "eklendi")
    await b.kuyruk.gonder(
      KUYRUK.cikar,
      { kurumId: g.kurumId, kanitId: sonuc.kanitId },
      { tekilAnahtar: `${KUYRUK.cikar}:${sonuc.kanitId}` },
    );
  return sonuc;
}

// ---------- Toplu yükleme (ZIP) ----------

export interface ZipSinirlari {
  enCokDosya?: number;
  enBuyukAcilmis?: number;
}

export interface TopluSonuc {
  dosyalar: ({ ad: string } & AlmaSonucu)[];
  /** Pakete dair Türkçe uyarılar (atlanan dosyalar, sınırlar). */
  uyarilar: string[];
}

const ATLANACAK = /(^|\/)(__MACOSX|\.DS_Store|Thumbs\.db|desktop\.ini)(\/|$)|(^|\/)\.[^/]*$/u;

/** Merkez dizinden dosya sayısını ve açılmış toplam boyutu okur (açmadan önce sınır denetimi). */
function zipBildirimi(veri: Uint8Array): { sayi: number; toplam: number } | null {
  const v = new DataView(veri.buffer, veri.byteOffset, veri.byteLength);
  for (let i = veri.byteLength - 22; i >= Math.max(0, veri.byteLength - 65_557); i--) {
    if (v.getUint32(i, true) !== 0x06054b50) continue;
    const sayi = v.getUint16(i + 10, true);
    let p = v.getUint32(i + 16, true);
    let toplam = 0;
    for (let n = 0; n < sayi; n++) {
      if (p + 46 > veri.byteLength || v.getUint32(p, true) !== 0x02014b50) return null;
      toplam += v.getUint32(p + 24, true);
      p += 46 + v.getUint16(p + 28, true) + v.getUint16(p + 30, true) + v.getUint16(p + 32, true);
    }
    return { sayi, toplam };
  }
  return null;
}

/** ZIP paketindeki her dosyayı ayrı kanıt olarak alır. Bozuk dosya diğerlerini durdurmaz. */
export async function zipAl(
  b: HatBaglami,
  g: Omit<KanitGirdisi, "veri" | "dosyaAdi" | "mime"> & { veri: Uint8Array; paketAdi: string },
  sinir: ZipSinirlari = {},
): Promise<TopluSonuc> {
  const enCokDosya = sinir.enCokDosya ?? 2000;
  const enBuyukAcilmis = sinir.enBuyukAcilmis ?? 2 * 1024 * 1024 * 1024;
  const bildirim = zipBildirimi(g.veri);
  if (!bildirim) return { dosyalar: [], uyarilar: ["Paket açılamadı. Dosyanın geçerli bir ZIP olduğundan emin olun."] };
  if (bildirim.sayi > enCokDosya)
    return { dosyalar: [], uyarilar: [`Pakette çok fazla dosya var (en çok ${enCokDosya}). Paketi bölün.`] };
  if (bildirim.toplam > enBuyukAcilmis)
    return { dosyalar: [], uyarilar: ["Paket açıldığında çok büyük oluyor. Paketi bölerek yükleyin."] };
  let acilan: Unzipped;
  try {
    acilan = unzipSync(g.veri, { filter: (f) => !f.name.endsWith("/") && !ATLANACAK.test(f.name) });
  } catch {
    return { dosyalar: [], uyarilar: ["Paket açılamadı. Dosyanın bozuk olmadığından emin olun."] };
  }
  const sonuc: TopluSonuc = { dosyalar: [], uyarilar: [] };
  for (const [yol, veri] of Object.entries(acilan).sort(([a], [c]) => a.localeCompare(c))) {
    const ad = dosyaAdiTemizle(yol);
    try {
      const s = await kanitAl(b, {
        ...g,
        veri,
        dosyaAdi: ad,
        kaynakAyrinti: { ...(g.kaynakAyrinti ?? {}), paket: dosyaAdiTemizle(g.paketAdi), yol: yol.slice(0, 400) },
      });
      sonuc.dosyalar.push({ ad, ...s });
    } catch {
      sonuc.dosyalar.push({ ad, durum: "reddedildi", ileti: `${ad}: kaydedilemedi, daha sonra yeniden deneyin.` });
    }
  }
  return sonuc;
}

// ---------- Kuruma özel e-posta adresi ----------

export const EpostaSemasi = z.object({
  kurumId: z.uuid(),
  gonderen: z.email(),
  konu: z.string().max(500).default(""),
  /** Gelen posta sunucusunun doğrulama sonuçları (Authentication-Results). */
  dogrulama: z.object({
    spf: z.enum(["pass", "fail", "softfail", "neutral", "none", "temperror", "permerror"]),
    dkim: z.enum(["pass", "fail", "neutral", "none", "temperror", "permerror"]),
    dmarc: z.enum(["pass", "fail", "none", "temperror", "permerror"]),
  }),
  ekler: z.array(
    z.object({
      ad: z.string().min(1),
      mime: z.string().optional(),
      veri: z.custom<Uint8Array>((v) => v instanceof Uint8Array),
    }),
  ),
});

export type EpostaIletisi = z.input<typeof EpostaSemasi>;

export interface EpostaPolitikasi {
  /** İzinli alan adları (ör. "ornek.edu.tr") ya da tam adresler. */
  izinliGonderenler: string[];
}

export function gonderenDogrula(
  ileti: z.infer<typeof EpostaSemasi>,
  p: EpostaPolitikasi,
): { gecerli: true } | { gecerli: false; ileti: string } {
  const adres = ileti.gonderen.toLowerCase();
  const alan = adres.split("@")[1] ?? "";
  const izinli = p.izinliGonderenler.some((x) => {
    const k = x.toLowerCase();
    return k.includes("@") ? k === adres : alan === k || alan.endsWith(`.${k}`);
  });
  if (!izinli) return { gecerli: false, ileti: "Gönderen bu kurum adına belge gönderemez." };
  // SPF ve DKIM, From alan adıyla hizalı olmadan da geçebilir (saldırganın kendi alan adı). Hizalamayı yalnız
  // DMARC sonucu gösterir; bu yüzden yalnız DMARC "pass" kabul edilir.
  if (ileti.dogrulama.dmarc !== "pass")
    return { gecerli: false, ileti: "Gönderenin kimliği doğrulanamadı; e-posta kabul edilmedi." };
  return { gecerli: true };
}

/** Kuruma özel adrese gelen e-postanın eklerini kanıt olarak alır. Doğrulanmamış gönderen reddedilir. */
export async function epostaAl(b: HatBaglami, ham: EpostaIletisi, p: EpostaPolitikasi): Promise<TopluSonuc> {
  const d = EpostaSemasi.safeParse(ham);
  if (!d.success) return { dosyalar: [], uyarilar: ["E-posta okunamadı."] };
  const ileti = d.data;
  const dogrulama = gonderenDogrula(ileti, p);
  if (!dogrulama.gecerli) return { dosyalar: [], uyarilar: [dogrulama.ileti] };
  const sonuc: TopluSonuc = { dosyalar: [], uyarilar: [] };
  if (!ileti.ekler.length) sonuc.uyarilar.push("E-postada ek bulunamadı.");
  for (const ek of ileti.ekler) {
    const ad = dosyaAdiTemizle(ek.ad);
    const kaynakAyrinti = { eposta: { gonderen: ileti.gonderen, konu: ileti.konu.slice(0, 200) } };
    const ortak = { kurumId: ileti.kurumId, kaynakTuru: "eposta" as const, kaynakAyrinti };
    if (/\.zip$/iu.test(ad)) {
      const z_ = await zipAl(b, { ...ortak, veri: ek.veri, paketAdi: ad });
      sonuc.dosyalar.push(...z_.dosyalar);
      sonuc.uyarilar.push(...z_.uyarilar);
      continue;
    }
    const g: KanitGirdisi = { ...ortak, veri: ek.veri, dosyaAdi: ad };
    if (ek.mime) g.mime = ek.mime;
    sonuc.dosyalar.push({ ad, ...(await kanitAl(b, g)) });
  }
  return sonuc;
}
