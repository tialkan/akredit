// Word paketi (İP-37): hoca ders sayfasından düzenlenebilir Word dosyası indirir, düzenleyip geri yükler.
//
// İndirme: (1) düzeltilmiş Bologna ders bilgi paketi: alanlar OBS (Proliz) ekran sırasıyla (`yazmaPlaniKur` ile
// aynı sıra), her alan bir kod (A001…) taşır; Akredit'in önerdiği değerler sarı zemin ve "Akredit önerisi"
// etiketiyle işaretlidir. (2) Bulgular: okumanın ve taslağın denetimi. (3) Kaynakça: kanıt atıfları ve başka
// kurum örnekleri ("kanıt değildir" etiketiyle). Ders dosyası varsa ayrı .docx; birden çok belge .zip olur.
//
// Geri yükleme: tablo satırları kodla eşlenir, alan alan fark çıkarılır. Fark hocanın kendi kararıdır: yeni
// `bologna_taslagi` önerisi (üretici: kişi) açılır ve aynı kişi tarafından doğrudan onaylanır; ikisi de
// değiştirilemez günlüğe yazılır. Sistem alanları (kod, ad, AKTS, T+U+L, yetkililer) Word'den değiştirilemez.

import { type DocxBolumu, type DocxModeli, docxUret, metinCikar, zipPaketle } from "@akredit/belge";
import {
  type BolognaOkunanDers,
  type BolognaTaslagi,
  type Bulgu,
  kanonikJson,
  okunamadiMi,
  ozetHesapla,
} from "@akredit/cekirdek";
import { sema } from "@akredit/vt";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { disOrnekleriOku } from "../arastirma/index.ts";
import { gunluge, islem, type ServisBaglami } from "../baglam.ts";
import {
  bolognaKoprusu,
  dersBulgulari,
  dersTaslaklari,
  gecerliTaslak,
  okumalar,
  TaslakIcerigi,
  tamDenetim,
  taslakFarki,
  yazmaPlaniKur,
} from "../bologna/index.ts";
import * as dersDosyasi from "../ders-dosyasi/index.ts";
import { bulunamadi, ServisHatasi } from "../hata.ts";
import * as oneri from "../oneri.ts";

const Kimlik = z.string().uuid("Geçersiz kimlik.");

export const PAKET_ISARETI = "Akredit paket kimliği";
const BASLIKLAR = ["Kod", "Alan", "Değer", "Kaynak"] as const;
const AKREDIT_ONERISI = "Akredit önerisi";
const MEVCUT = "Bologna'da aynı";
const SISTEM = "Sistem (değiştirilemez)";

const MIME = {
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  zip: "application/zip",
};

export const DosyaCiktisi = z.object({
  dosyaAdi: z.string(),
  mime: z.string(),
  ozet: z.string(),
  icerikBase64: z.string(),
  belgeler: z.array(z.string()),
});
export type DosyaCiktisi = z.infer<typeof DosyaCiktisi>;

export const YuklemeGirdisi = z
  .object({
    dosyaAdi: z.string().trim().min(1).max(200),
    /** Düzenlenmiş .docx, base64. */
    icerikBase64: z.string().min(1).max(1_400_000, "Dosya çok büyük. Yalnız indirdiğiniz Word dosyasını yükleyin."),
  })
  .strict();

const Degisim = z.object({ kod: z.string(), sekme: z.string(), alan: z.string(), eski: z.string(), yeni: z.string() });
export const YuklemeSonucu = z.object({
  oneriId: z.string().nullable(),
  kararId: z.string().nullable(),
  degisen: z.array(Degisim),
  reddedilen: z.array(z.object({ kod: z.string(), alan: z.string(), neden: z.string() })),
  denetim: z.object({ hata: z.number(), uyari: z.number() }),
});
export type YuklemeSonucu = z.infer<typeof YuklemeSonucu>;

// ---------- Alanlar (saf) ----------

export interface PaketAlani {
  kod: string;
  sekme: string;
  alan: string;
  deger: string;
  kaynak: string;
}

/** Okumadaki değer (yalnız metin alanları için karşılaştırılabilir). */
function okumaDegeri(okunan: BolognaOkunanDers | null, alan: string): string | null {
  if (!okunan) return null;
  const b = okunan.bilgiler ?? {};
  const anahtar: Record<string, string[]> = {
    "Dersin Amacı": ["Amaç", "Dersin Amacı"],
    "Dersin İçeriği": ["İçerik", "Dersin İçeriği"],
    "Öğretim Yöntem ve Teknikleri": ["Yöntem ve Teknikler", "Öğretim Yöntem ve Teknikleri"],
    "Ders Notları": ["Ders Notları"],
    "Ön Koşul": ["Ön Koşul", "Ön Koşul Dersleri"],
  };
  for (const a of anahtar[alan] ?? []) if (typeof b[a] === "string") return b[a] as string;
  const c = /^(Ö\d+)$/u.exec(alan);
  if (c) return okunan.ciktilar.find((x) => x.kod === c[1])?.metin ?? null;
  return null;
}

const bosluk = (s: string) => s.replace(/\s+/gu, " ").trim();

/** Taslağın Word'e giden alanları: OBS sırası (yazmaPlaniKur), kod ve kaynak işaretiyle. */
export function paketAlanlari(t: BolognaTaslagi, okunan: BolognaOkunanDers | null): PaketAlani[] {
  return yazmaPlaniKur(t, "").map((a, i) => {
    const kod = `A${String(i + 1).padStart(3, "0")}`;
    if (a.sekme === "Yetkililer") return { kod, sekme: a.sekme, alan: a.alan, deger: a.deger, kaynak: SISTEM };
    const eski = okumaDegeri(okunan, a.alan);
    const ayni = eski !== null && bosluk(eski) === bosluk(a.deger);
    return { kod, sekme: a.sekme, alan: a.alan, deger: a.deger, kaynak: ayni ? MEVCUT : AKREDIT_ONERISI };
  });
}

class AlanHatasi extends Error {}

const tamSayi = (s: string, ad: string, en = 0, boy = 10_000) => {
  const n = Number(s.trim());
  if (!Number.isInteger(n) || n < en || n > boy) throw new AlanHatasi(`${ad} ${en}-${boy} arası tam sayı olmalı.`);
  return n;
};

/** Bir alanın Word'deki yeni değerini taslağa uygular (yerinde). Okunamayan değer `AlanHatasi`. */
export function alanUygula(t: BolognaTaslagi, sekme: string, alan: string, deger: string): void {
  const v = deger.trim();
  const iki = (x: { tr: string; en: string }, ing: boolean) => {
    if (ing) x.en = v;
    else x.tr = v;
  };
  if (sekme === "Genel") {
    const ing = alan.endsWith("(İngilizce)");
    const ad = alan.replace(/ \(İngilizce\)$/u, "");
    if (ad === "Dersin Amacı") return iki(t.amac, ing);
    if (ad === "Dersin İçeriği") return iki(t.icerik, ing);
    if (ad === "Öğretim Yöntem ve Teknikleri") return iki(t.yontem, ing);
    if (ad === "Ders Notları") return iki(t.notlar, ing);
    if (ad === "Ön Koşul") {
      t.onKosul = v;
      return;
    }
    if (ad === "Sürdürülebilir Kalkınma Amaçları") {
      t.ska = v
        ? v
            .split(/[,;\s]+/u)
            .filter(Boolean)
            .map((x) => tamSayi(x, "Sürdürülebilir Kalkınma Amacı", 1, 17))
        : [];
      return;
    }
  }
  if (sekme === "Kaynaklar") {
    const n = /^Kaynak (\d+)$/u.exec(alan);
    const k = n ? t.kaynaklar[Number(n[1]) - 1] : undefined;
    if (!k) throw new AlanHatasi("Kaynak satırı bulunamadı.");
    const p = v.split(/,\s*/u);
    const yil = /^\d{4}$/u.test(p.at(-1) ?? "") ? Number(p.pop()) : undefined;
    if (p.length < 2) throw new AlanHatasi('Kaynak "Yazar, Eser" biçiminde yazılmalı.');
    k.yazar = p[0] as string;
    k.eser = p[1] as string;
    if (p.length > 2) k.yayinevi = p.slice(2).join(", ");
    else delete k.yayinevi;
    if (yil !== undefined) k.yil = yil;
    else delete k.yil;
    return;
  }
  if (sekme === "Öğrenme Çıktıları") {
    const m = /^(Ö\d+)( \(İngilizce\)| Türü)?$/u.exec(alan);
    const c = m ? t.ciktilar.find((x) => x.kod === m[1]) : undefined;
    if (!c || !m) throw new AlanHatasi("Öğrenme çıktısı bulunamadı.");
    if (m[2] === " Türü") {
      if (v !== "Bilgi" && v !== "Beceri" && v !== "Yetkinlik")
        throw new AlanHatasi("Çıktı türü Bilgi, Beceri ya da Yetkinlik olmalı.");
      c.tur = v;
    } else if (m[2]) c.en = v;
    else c.tr = v;
    return;
  }
  if (sekme === "Ders Akışı") {
    const m = /^(\d+)\. Hafta (Konu \(İngilizce\)|Konu|Ön Hazırlık|Dokümanlar)$/u.exec(alan);
    const h = m ? t.haftalar.find((x) => x.hafta === Number(m[1])) : undefined;
    if (!h || !m) throw new AlanHatasi("Hafta bulunamadı.");
    if (m[2] === "Konu") h.konu.tr = v;
    else if (m[2] === "Konu (İngilizce)") h.konu.en = v;
    else if (m[2] === "Ön Hazırlık") h.onHazirlik = v;
    else h.dokuman = v;
    return;
  }
  if (sekme === "Değerlendirme") {
    const d = t.degerlendirme.find((x) => x.ad === alan);
    const m = /^(\d+)\s*adet\s*,\s*%\s*(\d+)$/u.exec(v);
    if (!d) throw new AlanHatasi("Değerlendirme kalemi bulunamadı.");
    if (!m) throw new AlanHatasi('Değerlendirme "1 adet, %40" biçiminde yazılmalı.');
    d.sayi = tamSayi(m[1] as string, "Sayı");
    d.katki = tamSayi(m[2] as string, "Katkı", 0, 100);
    return;
  }
  if (sekme === "İş Yükü") {
    const x = t.isyuku.find((y) => y.ad === alan);
    const m = /^(\d+)\s*[×xX*]\s*(\d+)\s*saat$/u.exec(v);
    if (!x) throw new AlanHatasi("İş yükü kalemi bulunamadı.");
    if (!m) throw new AlanHatasi('İş yükü "14 × 3 saat" biçiminde yazılmalı.');
    x.sayi = tamSayi(m[1] as string, "Sayı");
    x.sure = tamSayi(m[2] as string, "Süre");
    return;
  }
  if (sekme === "Ders Yapısı") {
    const y = t.dersYapisi.find((z) => z.alan === alan);
    const m = /^%\s*(\d+)$/u.exec(v);
    if (!y) throw new AlanHatasi("Ders yapısı satırı bulunamadı.");
    if (!m) throw new AlanHatasi('Ders yapısı "%50" biçiminde yazılmalı.');
    y.yuzde = tamSayi(m[1] as string, "Yüzde", 0, 100);
    return;
  }
  if (sekme === "Katkı Matrisi") {
    const [o, p] = alan.split("/");
    const satir = o ? t.katki[o] : undefined;
    if (!satir || !p || !(p in satir)) throw new AlanHatasi("Matris hücresi bulunamadı.");
    satir[p] = v === "" ? null : tamSayi(v, "Katkı", 1, 5);
    return;
  }
  if (sekme === "Yetkililer") throw new AlanHatasi("Yetkililer sistemden gelir; Word'den değiştirilemez.");
  throw new AlanHatasi("Bu alan tanınmadı.");
}

/** Yüklenen Word dosyasından paket kimliği ve kod → değer eşlemesi. */
export function paketOku(tablolar: { satirlar: (string | number | null)[][] }[], bolumler: { metin: string }[]) {
  const metin = bolumler.map((b) => b.metin).join("\n");
  const m = new RegExp(`${PAKET_ISARETI}: ([0-9a-f-]{36}) · ([0-9a-f]{12})`, "u").exec(metin);
  const degerler = new Map<string, string>();
  for (const t of tablolar) {
    const bas = (t.satirlar[0] ?? []).map((x) => String(x ?? "").trim());
    if (bas.length < 3 || bas[0] !== "Kod" || bas[2] !== "Değer") continue;
    for (const s of t.satirlar.slice(1)) {
      const kod = String(s[0] ?? "").trim();
      if (/^A\d{3}$/u.test(kod)) degerler.set(kod, String(s[2] ?? ""));
    }
  }
  return { oneriId: m?.[1] ?? null, alanOzeti: m?.[2] ?? null, degerler };
}

function alanOzeti(alanlar: PaketAlani[]): string {
  return ozetHesapla(kanonikJson(alanlar.map((a) => [a.kod, a.sekme, a.alan]))).slice(0, 12);
}

// ---------- Belge modeli ----------

interface PaketGirdisi {
  ders: { kod: string; ad: string };
  oneriId: string;
  karar: string | null;
  alanlar: PaketAlani[];
  okumaBulgulari: Bulgu[];
  taslakBulgulari: Bulgu[];
  kanitlar: { ad: string; ozet: string; adres: string | null }[];
  disOrnekler: { baslik: string; adres: string; erisim: string }[];
  zaman: string;
}

export function paketModeli(g: PaketGirdisi): DocxModeli {
  const sekmeler = [...new Set(g.alanlar.map((a) => a.sekme))];
  const oneriSayisi = g.alanlar.filter((a) => a.kaynak === AKREDIT_ONERISI).length;
  const bolumler: DocxBolumu[] = [
    {
      baslik: "Nasıl kullanılır",
      duzey: 1,
      icerik: [
        {
          tur: "paragraf",
          vurgu: "not",
          metin:
            "Sarı zeminli satırlar Akredit'in önerisidir; onaylamadan OBS'ye yazılmaz. Yalnız Değer sütununu düzenleyin, Kod sütununu değiştirmeyin. Düzenledikten sonra dosyayı ders sayfasındaki \"Word dosyasını yükle\" ile geri yükleyin; değişiklikleriniz sizin kararınız olarak kaydedilir.",
        },
        {
          tur: "paragraf",
          vurgu: "oneri",
          metin: `${oneriSayisi} alan Akredit önerisidir. Taslak durumu: ${g.karar ? kararAdi(g.karar) : "onay bekliyor"}.`,
        },
        { tur: "paragraf", metin: `${PAKET_ISARETI}: ${g.oneriId} · ${alanOzeti(g.alanlar)}` },
      ],
    },
    ...sekmeler.map((sekme): DocxBolumu => {
      const satirlar = g.alanlar.filter((a) => a.sekme === sekme);
      return {
        baslik: sekme,
        duzey: 2,
        icerik: [
          {
            tur: "tablo",
            basliklar: [...BASLIKLAR],
            satirlar: satirlar.map((a) => [a.kod, a.alan, a.deger, a.kaynak]),
            oneriSatirlari: satirlar.flatMap((a, i) => (a.kaynak === AKREDIT_ONERISI ? [i] : [])),
          },
        ],
      };
    }),
    {
      baslik: "Bulgular",
      duzey: 1,
      icerik: [
        { tur: "paragraf", metin: "Son Bologna okumasında bu ders için bulunanlar (deterministik denetim):" },
        g.okumaBulgulari.length
          ? {
              tur: "tablo",
              basliklar: ["Düzey", "Kural", "Açıklama"],
              satirlar: g.okumaBulgulari.map((b) => [duzeyAdi(b.duzey), b.kural, b.aciklama]),
            }
          : { tur: "paragraf", metin: "Bulgu yok." },
        { tur: "paragraf", metin: "Önerilen taslağın denetimi (K1-K12 ve diğer kurallar):" },
        g.taslakBulgulari.length
          ? {
              tur: "tablo",
              basliklar: ["Düzey", "Kural", "Açıklama"],
              satirlar: g.taslakBulgulari.map((b) => [duzeyAdi(b.duzey), b.kural, b.aciklama]),
            }
          : { tur: "paragraf", metin: "Hata ya da uyarı yok." },
      ],
    },
    {
      baslik: "Kaynakça",
      duzey: 1,
      icerik: [
        { tur: "paragraf", metin: "Kanıtlar (kurumun kanıt havuzundan, içerik özetiyle):" },
        g.kanitlar.length
          ? {
              tur: "tablo",
              basliklar: ["Belge", "Özet (SHA-256)", "Adres"],
              satirlar: g.kanitlar.map((k) => [k.ad, k.ozet, k.adres ?? ""]),
            }
          : { tur: "paragraf", vurgu: "eksik", metin: "EKSİK: Taslağın dayandığı kanıt bulunamadı." },
        {
          tur: "paragraf",
          vurgu: "not",
          metin:
            "Başka kurumlardan örnekler kanıt değildir; yalnız fikir kaynağıdır. Metinleri taslağa kopyalanmadı, rapora kanıt olarak girmez.",
        },
        g.disOrnekler.length
          ? {
              tur: "tablo",
              basliklar: ["Başka kurumdan örnek", "Adres", "Erişim"],
              satirlar: g.disOrnekler.map((d) => [d.baslik, d.adres, d.erisim.slice(0, 10)]),
            }
          : { tur: "paragraf", metin: "Başka kurumdan örnek eklenmedi." },
      ],
    },
  ];
  return {
    baslik: `${g.ders.kod} ${g.ders.ad}: ders bilgi paketi`,
    altBaslik: "Düzeltilmiş taslak (OBS alan sırasıyla)",
    ustBilgi: "Taslak: Akredit önerileri işaretlidir, karar öğretim elemanınındır",
    altBilgi: `Akredit · ${g.zaman.slice(0, 10)}`,
    bolumler,
  };
}

const duzeyAdi = (d: string) => (d === "hata" ? "Hata" : d === "uyari" ? "Uyarı" : "Bilgi");
const kararAdi = (k: string) => (k === "onaylandi" ? "onaylandı" : k === "duzeltildi" ? "düzeltilerek onaylandı" : k);

// ---------- Servis ----------

async function sonTaslak(tx: Parameters<Parameters<typeof islem>[1]>[0], dersId: string) {
  const r = (await dersTaslaklari(tx, dersId)).filter((x) => x.k?.sonuc !== "reddedildi").at(-1);
  if (!r)
    throw new ServisHatasi(
      "kural_ihlali",
      'Bu ders için henüz taslak yok. Önce "Eksikleri gider" ile düzeltme taslağı üretin.',
    );
  const ic = TaslakIcerigi.safeParse(r.o.icerik);
  if (!ic.success) throw new ServisHatasi("kural_ihlali", "Son taslak okunamadı. Yeni taslak üretin.");
  return { r, ic: ic.data, taslak: gecerliTaslak(ic.data, r.k) };
}

/** Word paketini üretir: ders bilgi paketi (+ varsa ders dosyası) → .docx ya da .zip. */
export async function wordPaketi(b: ServisBaglami, dersId: string): Promise<DosyaCiktisi> {
  const id = Kimlik.parse(dersId);
  const g = await islem(b, async (tx, gerekli) => {
    const [d] = await tx.select().from(sema.ders).where(eq(sema.ders.id, id));
    if (!d) throw bulunamadi();
    await gerekli("oneri.oku", { tur: "ders", id: d.id });
    const { r, ic, taslak } = await sonTaslak(tx, d.id);
    const [okuma] = await okumalar(tx, d.programId, 1);
    const ham = okuma?.veri.dersler.find((x) => x.kod === d.kod) ?? null;
    const okunan = ham && !okunamadiMi(ham) ? ham : null;
    const kanitIdleri = [ic.okumaKanitId, ...(ic.beyanKanitId ? [ic.beyanKanitId] : [])];
    const kanitlar = [];
    for (const k of kanitIdleri) {
      const [x] = await tx.select().from(sema.kanit).where(eq(sema.kanit.id, k));
      if (x) {
        const adres = (x.kaynakAyrinti as { adres?: unknown }).adres;
        kanitlar.push({ ad: x.dosyaAdi, ozet: x.ozet, adres: typeof adres === "string" ? adres : null });
      }
    }
    const den = (r.o.icerik as { denetim?: { bulgular?: Bulgu[] } }).denetim;
    await gunluge(tx, b, "word_paketi.indirildi", { tur: "ders", id: d.id }, { taslak: r.o.id });
    return {
      d,
      model: paketModeli({
        ders: { kod: d.kod, ad: d.ad },
        oneriId: r.o.id,
        karar: r.k?.sonuc ?? null,
        alanlar: paketAlanlari(taslak, okunan),
        okumaBulgulari: okuma ? dersBulgulari(okuma.veri, d.kod, b.simdi().getTime()) : [],
        taslakBulgulari: den?.bulgular ?? tamDenetim(taslak).bulgular,
        kanitlar,
        disOrnekler: await disOrnekleriOku(tx, d.id),
        zaman: b.simdi().toISOString(),
      }),
    };
  });
  const ad = g.d.kod.replace(/[^\p{L}\p{N}-]+/gu, "-");
  const dosyalar = [{ ad: `${ad}-ders-bilgi-paketi.docx`, veri: await docxUret(g.model) }];
  // Ders dosyası (İP-16) üretilmişse pakete girer; yetki ya da aşama yetmiyorsa atlanır.
  try {
    const dd = (await dersDosyasi.dersinDosyalari(b, id)).find((x) => x.raporId);
    if (dd) {
      const x = await dersDosyasi.belge(b, dd.dersAcilisiId, "docx");
      dosyalar.push({ ad: x.dosyaAdi, veri: new Uint8Array(Buffer.from(x.icerikBase64, "base64")) });
    }
  } catch (e) {
    if (!(e instanceof ServisHatasi)) throw e;
  }
  const tek = dosyalar.length === 1;
  const veri = tek ? (dosyalar[0]?.veri as Uint8Array) : zipPaketle(dosyalar);
  return {
    dosyaAdi: tek ? (dosyalar[0]?.ad as string) : `${ad}-word-paketi.zip`,
    mime: tek ? MIME.docx : MIME.zip,
    ozet: ozetHesapla(veri),
    icerikBase64: Buffer.from(veri).toString("base64"),
    belgeler: dosyalar.map((x) => x.ad),
  };
}

/**
 * Hocanın düzenlediği Word dosyasını alır, alan alan farkı çıkarır ve hocanın kendi kararı olarak kaydeder:
 * yeni öneri (üretici: kişi) + aynı kişinin doğrudan onayı. Değişiklik yoksa hiçbir kayıt açılmaz.
 */
export async function wordYukle(b: ServisBaglami, dersId: string, girdi: unknown): Promise<YuklemeSonucu> {
  const id = Kimlik.parse(dersId);
  const g = YuklemeGirdisi.parse(girdi);
  // Yetki, dosya okunmadan önce denetlenir.
  await islem(b, async (tx, gerekli) => {
    const [d] = await tx.select({ id: sema.ders.id }).from(sema.ders).where(eq(sema.ders.id, id));
    if (!d) throw bulunamadi();
    await gerekli("olcme.veri_gir", { tur: "ders", id: d.id });
  });
  const veri = new Uint8Array(Buffer.from(g.icerikBase64, "base64"));
  const okunan = await metinCikar(veri, { ad: g.dosyaAdi });
  if (okunan.tur !== "docx")
    throw new ServisHatasi("gecersiz_istek", "Bu bir Word (.docx) dosyası değil. İndirdiğiniz paketi yükleyin.");
  const p = paketOku(okunan.tablolar, okunan.bolumler);
  if (!p.oneriId)
    throw new ServisHatasi(
      "gecersiz_istek",
      "Dosyada Akredit paket kimliği bulunamadı. Ders sayfasından indirdiğiniz Word dosyasını yükleyin.",
    );
  const depo = bolognaKoprusu().depo;
  const nesne = depo ? await depo.koy(b.aktor.kurumId, veri, { mime: MIME.docx }) : null;

  const kayit = await islem(b, async (tx, gerekli) => {
    const [d] = await tx.select().from(sema.ders).where(eq(sema.ders.id, id));
    if (!d) throw bulunamadi();
    await gerekli("olcme.veri_gir", { tur: "ders", id: d.id });
    const [o] = await tx
      .select()
      .from(sema.oneri)
      .where(eq(sema.oneri.id, p.oneriId as string));
    if (!o || o.tur !== "bologna_taslagi" || o.hedefId !== d.id)
      throw new ServisHatasi("gecersiz_istek", "Bu Word dosyası bu derse ait değil.");
    const [k] = await tx.select().from(sema.karar).where(eq(sema.karar.oneriId, o.id));
    const ic = TaslakIcerigi.safeParse(o.icerik);
    if (!ic.success) throw new ServisHatasi("kural_ihlali", "Paketin taslağı okunamadı. Yeni paket indirin.");
    const temel = gecerliTaslak(ic.data, k ? { sonuc: k.sonuc, duzeltme: k.duzeltme } : null);
    const [okuma] = await okumalar(tx, d.programId, 1);
    const ham = okuma?.veri.dersler.find((x) => x.kod === d.kod) ?? null;
    const alanlar = paketAlanlari(temel, ham && !okunamadiMi(ham) ? ham : null);
    if (p.alanOzeti !== alanOzeti(alanlar))
      throw new ServisHatasi(
        "kural_ihlali",
        "Dosyadaki alan listesi bu taslakla uyuşmuyor (satır eklenmiş ya da silinmiş olabilir). Yeni paket indirip yalnız Değer sütununu düzenleyin.",
      );
    const yeni = structuredClone(temel);
    const degisen: YuklemeSonucu["degisen"] = [];
    const reddedilen: YuklemeSonucu["reddedilen"] = [];
    for (const a of alanlar) {
      const v = p.degerler.get(a.kod);
      if (v === undefined || bosluk(v) === bosluk(a.deger)) continue;
      try {
        alanUygula(yeni, a.sekme, a.alan, v);
        degisen.push({ kod: a.kod, sekme: a.sekme, alan: a.alan, eski: a.deger, yeni: v.trim() });
      } catch (e) {
        if (!(e instanceof AlanHatasi)) throw e;
        reddedilen.push({ kod: a.kod, alan: a.alan, neden: e.message });
      }
    }
    const denetim = tamDenetim(yeni);
    if (!degisen.length) return { d, oneriId: null, degisen, reddedilen, denetim };
    let kanitId: string | null = null;
    if (nesne) {
      const [var_] = await tx.select({ id: sema.kanit.id }).from(sema.kanit).where(eq(sema.kanit.ozet, nesne.ozet));
      kanitId = var_?.id ?? null;
      if (!kanitId) {
        const [kn] = await tx
          .insert(sema.kanit)
          .values({
            kurumId: b.aktor.kurumId,
            ozet: nesne.ozet,
            dosyaAdi: g.dosyaAdi.replace(/[^\p{L}\p{N}._-]+/gu, "-").slice(0, 150),
            mime: MIME.docx,
            boyut: veri.byteLength,
            depoAnahtari: nesne.anahtar,
            kaynakTuru: "yukleme",
            kaynakAyrinti: { tur: "word_paketi", dersId: d.id, temelOneriId: o.id },
            kapsamlar: [{ tur: "ders", id: d.id }],
            yukleyenKisiId: b.aktor.kisiId,
          })
          .returning({ id: sema.kanit.id });
        kanitId = kn?.id ?? null;
      }
    }
    const metin = `Öğretim elemanı Word dosyasında ${degisen.length} alanı düzenledi: ${degisen
      .map((x) => x.alan)
      .slice(0, 12)
      .join(", ")}${degisen.length > 12 ? "…" : ""}.`;
    const [yo] = await tx
      .insert(sema.oneri)
      .values({
        kurumId: b.aktor.kurumId,
        tur: "bologna_taslagi",
        hedefTuru: "ders",
        hedefId: d.id,
        icerik: JSON.parse(
          JSON.stringify({
            baslik: `Bologna taslağı (öğretim elemanının düzenlemesi): ${d.kod} ${d.ad}`,
            metin,
            dersKodu: d.kod,
            taslak: yeni,
            denetim,
            fark: taslakFarki(temel, yeni),
            okumaKanitId: ic.data.okumaKanitId,
            beyanKanitId: ic.data.beyanKanitId,
            wordFarki: degisen,
            wordKanitId: kanitId,
            temelOneriId: o.id,
          }),
        ),
        gerekce: metin,
        atiflar: o.atiflar,
        ureticiTuru: "kisi",
        uretici: { kisiId: b.aktor.kisiId, kaynak: "word", dosyaOzeti: ozetHesapla(veri) },
        risk: "orta",
      })
      .returning({ id: sema.oneri.id });
    if (!yo) throw new Error("Öneri eklenemedi.");
    await gunluge(
      tx,
      b,
      "word_paketi.yuklendi",
      { tur: "oneri", id: yo.id },
      { ders: d.id, temel: o.id, alanlar: degisen.map((x) => x.kod), reddedilen: reddedilen.length },
    );
    return { d, oneriId: yo.id, degisen, reddedilen, denetim };
  });
  if (!kayit.oneriId)
    return {
      oneriId: null,
      kararId: null,
      degisen: [],
      reddedilen: kayit.reddedilen,
      denetim: { hata: kayit.denetim.hata, uyari: kayit.denetim.uyari },
    };
  // Hocanın kendi kararı: doğrudan onay, adı ve zamanıyla değiştirilemez günlüğe girer.
  const karar = await oneri.kararVer(b, {
    oneriId: kayit.oneriId,
    sonuc: "onaylandi",
    gerekce: "Öğretim elemanı Word dosyasında düzenleyip yükledi; alan farkı öneri içeriğindedir.",
  });
  return {
    oneriId: kayit.oneriId,
    kararId: karar.id,
    degisen: kayit.degisen,
    reddedilen: kayit.reddedilen,
    denetim: { hata: kayit.denetim.hata, uyari: kayit.denetim.uyari },
  };
}
