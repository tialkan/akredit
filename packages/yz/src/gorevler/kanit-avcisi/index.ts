// Kanıt avcısı (İP-37). Bir ölçütün kanıt gereksinimine göre iki ayrı şey bulur:
//
//  (a) Kurum içi aday: kurumun kendi kanıt havuzundaki (yüklenen, bağlayıcıyla gelen, kurum sitesinden taranan)
//      belgelerde, gereksinime uyan parça. Çıktı kanıta atıflı ve birebir alıntılıdır; onay bekleyen
//      `kanit_etiketi` önerisi olur. Model yoksa kural (anahtar kelime) eşlemesi aynı biçimde çalışır.
//  (b) Başka kurumdan örnek: web aramasının yapılandırılmış atıflarından (adres, başlık, alıntı). Bu bir KANIT
//      DEĞİLDİR: kurumun yaptığını göstermez, yalnız "başkaları bunu nasıl yapıyor" sorusuna kaynaktır. Türü
//      `dis_ornek`tir, `kanitDegildir: true` taşır; atıf biçimi ([K:…]) üretilmez.
//
// Belge ve web metni veridir: istemde `akredit-veri` etiketiyle sarılır, içindeki talimat uygulanmaz.

import { alintiGeciyorMu, atiflariAyristir } from "@akredit/cekirdek";
import { z } from "zod";
import { type AtifKaynagi, atifDogrula } from "../../guvence/atif.ts";
import type { Saglayici } from "../../saglayici.ts";
import { alanAdindaMi, type WebArayici, type WebKaynagi } from "../../web-arama/index.ts";
import { type Gorev, gorevCalistir, type KuralSorunu, kanitBlogu, ORTAK_KURALLAR } from "../gorev.ts";

export interface OlcutBilgisi {
  kod: string;
  baslik: string;
  /** Kanıt gereksinimlerinin açıklamaları (çerçeve kütüphanesinden). Boş olabilir. */
  gereksinimler: string[];
}

export interface KanitAdayi {
  kanitId: string;
  dosyaAdi: string;
  /** Kurum sitesinden taranan belgede sayfa adresi; yüklenen belgede null. */
  adres: string | null;
  kaynak: AtifKaynagi;
}

export interface KurumIciEslesme {
  kanitId: string;
  /** [K:özet konum "alıntı"] biçiminde doğrulanmış atıf. */
  atif: string;
  alinti: string;
  gerekce: string;
  guven: number;
  /** "yz" ya da "kural". */
  yontem: "yz" | "kural";
}

/** Başka kurumdan örnek. Kanıt değildir; rapora kanıt olarak giremez. */
export interface DisOrnek {
  tur: "dis_ornek";
  kanitDegildir: true;
  olcutKod: string;
  adres: string;
  baslik: string;
  alinti: string;
  erisim: string;
}

// ---------- (a) Model görevi ----------

const Atif = z.string().regex(/\[K:[0-9a-fA-F]{6,64}[^\]]*\]/u, "atıf [K:…] biçiminde olmalı");

export const KanitAvcisiSemasi = z.object({
  eslesmeler: z
    .array(
      z.object({
        atif: Atif,
        alinti: z.string().min(3).max(400),
        gerekce: z.string().max(400),
        guven: z.number().min(0).max(1),
      }),
    )
    .max(20),
});

export interface KanitAvcisiGirdisi {
  olcut: OlcutBilgisi;
  adaylar: KanitAdayi[];
}

function kaynaklar(g: KanitAvcisiGirdisi): AtifKaynagi[] {
  return g.adaylar.map((a) => a.kaynak);
}

export const kanitAvcisi: Gorev<KanitAvcisiGirdisi, typeof KanitAvcisiSemasi> = {
  ad: "kanit-avcisi",
  sema: KanitAvcisiSemasi,
  istem(g) {
    const gereksinim = g.olcut.gereksinimler.length
      ? g.olcut.gereksinimler.map((x) => `- ${x}`).join("\n")
      : "- (Çerçevede ayrıca yazılı gereksinim yok; ölçüt başlığına göre değerlendir.)";
    const kurallar = [
      `Ölçüt: ${g.olcut.kod} ${g.olcut.baslik}`,
      `Kanıt gereksinimleri:\n${gereksinim}`,
      "Görev: Aşağıdaki kurum belgelerinden bu ölçütün kanıtı olabilecek parçaları seç.",
      'Her eşleşme için parça başlığındaki atıfı birebir alıntıyla yaz: [K:özet s.N "alıntı"] ya da [K:özet b.bölüm "alıntı"].',
      "Alıntı parçada aynen geçmeli. Uygun parça yoksa boş liste döndür; zorlama.",
      "Guven 0-1 arası: parçanın ölçütü ne kadar doğrudan gösterdiği.",
      ORTAK_KURALLAR,
    ].join("\n");
    const veri = g.adaylar.map((a, i) => `Aday ${i + 1} (${a.dosyaAdi}):\n${kanitBlogu(a.kaynak, "kurum-belgesi")}`);
    return [
      { rol: "sistem", icerik: kurallar },
      { rol: "kullanici", icerik: veri.join("\n\n") || "(aday yok)" },
    ];
  },
  denetle(c, g) {
    const sorunlar: KuralSorunu[] = [];
    const ks = kaynaklar(g);
    for (const [i, e] of c.eslesmeler.entries()) {
      const a = atiflariAyristir(e.atif);
      if (!a.length) sorunlar.push({ alan: `eslesmeler.${i}`, aciklama: "Atıf okunamadı." });
      for (const x of a)
        for (const s of atifDogrula(x, ks))
          if (s.tur !== "taninmayan_konum") sorunlar.push({ alan: `eslesmeler.${i}`, aciklama: s.aciklama });
    }
    return sorunlar;
  },
};

function atifinAdayi(atif: string, adaylar: KanitAdayi[]): KanitAdayi | null {
  const a = atiflariAyristir(atif)[0];
  if (!a) return null;
  return adaylar.find((x) => x.kaynak.ozet.toLowerCase().startsWith(a.ozetOneki)) ?? null;
}

/**
 * Modelle kurum içi aday bulur. Yalnız atfı ve alıntısı doğrulanan eşleşmeler döner (onarım yok: yanlış
 * eşleşme atılır, insana gösterilmez). Alıntı atıfta yoksa öneri alıntısı atfa eklenerek yeniden doğrulanır.
 */
export async function kurumIciAdayBul(
  g: KanitAvcisiGirdisi,
  saglayici: Saglayici,
  secenek: { sinyal?: AbortSignal } = {},
): Promise<{ eslesmeler: KurumIciEslesme[]; atilan: number }> {
  if (!g.adaylar.length) return { eslesmeler: [], atilan: 0 };
  const s = await gorevCalistir(kanitAvcisi, g, saglayici, secenek);
  const ks = kaynaklar(g);
  const eslesmeler: KurumIciEslesme[] = [];
  let atilan = 0;
  for (const e of s.veri.eslesmeler) {
    const aday = atifinAdayi(e.atif, g.adaylar);
    const ayr = atiflariAyristir(e.atif)[0];
    const parcalar = aday?.kaynak.parcalar.filter((p) => !ayr?.capa || capaUyar(ayr.capa, p.capa)) ?? [];
    const gecerli =
      aday &&
      ayr &&
      atifDogrula(ayr, ks).every((x) => x.tur === "taninmayan_konum") &&
      parcalar.some((p) => alintiGeciyorMu(e.alinti, p.metin));
    if (!gecerli || !aday) {
      atilan++;
      continue;
    }
    if (eslesmeler.some((x) => x.kanitId === aday.kanitId)) continue;
    eslesmeler.push({
      kanitId: aday.kanitId,
      atif: e.atif,
      alinti: e.alinti,
      gerekce: e.gerekce,
      guven: e.guven,
      yontem: "yz",
    });
  }
  return { eslesmeler, atilan };
}

function capaUyar(a: { sayfa?: number; bolum?: string }, p: { sayfa?: number; bolum?: string }): boolean {
  if (a.sayfa !== undefined) return p.sayfa === a.sayfa;
  if (a.bolum !== undefined) return p.bolum === a.bolum;
  return true;
}

// ---------- (a') Kural eşlemesi (model yokken) ----------

const DOLGU = new Set([
  "ve",
  "ile",
  "için",
  "bir",
  "bu",
  "olarak",
  "gibi",
  "veya",
  "de",
  "da",
  "ilgili",
  "yönelik",
  "süreçleri",
  "sureci",
]);

/** Ölçüt başlığı ve gereksinimlerden anahtar kökler (ilk 5 harf, küçük harf, dolgu kelimeler hariç). */
export function anahtarKokler(o: OlcutBilgisi): string[] {
  const metin = [o.baslik, ...o.gereksinimler].join(" ").toLocaleLowerCase("tr-TR");
  const kokler = metin
    .split(/[^\p{L}\p{N}]+/u)
    .filter((k) => k.length >= 4 && !DOLGU.has(k))
    .map((k) => k.slice(0, 5));
  return [...new Set(kokler)];
}

function cumleler(metin: string): string[] {
  return metin
    .split(/(?<=[.!?])\s+|\n+/u)
    .map((s) => s.trim())
    .filter((s) => s.length >= 10);
}

function kokSayisi(cumle: string, kokler: string[]): number {
  const kelimeler = cumle
    .toLocaleLowerCase("tr-TR")
    .split(/[^\p{L}\p{N}]+/u)
    .map((k) => k.slice(0, 5));
  return kokler.filter((k) => kelimeler.includes(k)).length;
}

/**
 * Model olmadan, deterministik eşleme: her adayın en çok anahtar kökü içeren cümlesi alıntı olur.
 * Eşik: en az 2 kök ya da köklerin yarısı. Güven en çok 0,6 (kural eşlemesi zayıf kanıttır).
 */
export function kuralIleAdayBul(g: KanitAvcisiGirdisi, enCok = 5): KurumIciEslesme[] {
  const kokler = anahtarKokler(g.olcut);
  if (!kokler.length) return [];
  const esik = Math.min(2, kokler.length);
  const sonuc: (KurumIciEslesme & { puan: number })[] = [];
  for (const a of g.adaylar) {
    let en: { cumle: string; puan: number; capa: KanitAdayi["kaynak"]["parcalar"][number]["capa"] } | null = null;
    for (const p of a.kaynak.parcalar)
      for (const c of cumleler(p.metin)) {
        const puan = kokSayisi(c, kokler);
        if (puan >= esik && (!en || puan > en.puan)) en = { cumle: c.slice(0, 300), puan, capa: p.capa };
      }
    if (!en) continue;
    const konum = en.capa.sayfa !== undefined ? ` s.${en.capa.sayfa}` : en.capa.bolum ? ` b.${en.capa.bolum}` : "";
    const alinti = en.cumle.replace(/"/gu, "'");
    // Alıntı tırnak değişikliğiyle bozulduysa atıfsız alıntı yerine özgün cümlenin baş kısmı kullanılır.
    const gecerliAlinti = a.kaynak.parcalar.some((p) => alintiGeciyorMu(alinti, p.metin)) ? alinti : "";
    if (!gecerliAlinti) continue;
    sonuc.push({
      kanitId: a.kanitId,
      atif: `[K:${a.kaynak.ozet.slice(0, 8).toLowerCase()}${konum} "${gecerliAlinti}"]`,
      alinti: gecerliAlinti,
      gerekce: `Ölçütün anahtar kelimelerinden ${en.puan}/${kokler.length} tanesi bu cümlede geçiyor.`,
      guven: Math.round(Math.min(0.6, en.puan / kokler.length) * 100) / 100,
      yontem: "kural",
      puan: en.puan,
    });
  }
  return sonuc
    .sort((x, y) => y.puan - x.puan)
    .slice(0, enCok)
    .map(({ puan: _p, ...e }) => e);
}

// ---------- (b) Başka kurumdan örnek ----------

/** Web arama sorusu yalnız ölçüt bilgisinden kurulur; belge ya da sayfa metni soruya girmez. */
export function disOrnekSorusu(o: OlcutBilgisi): string {
  return `${o.baslik} yükseköğretim kalite güvencesi örnek uygulama kanıt`.slice(0, 300);
}

/**
 * Başka kurumların örnek uygulamalarını bulur. Kurumun kendi alan adları hariç tutulur. Sonuç yalnız
 * yanıtın yapılandırılmış atıflarından kurulur; modelin yazdığı metin kullanılmaz.
 */
export async function disOrnekBul(
  arayici: WebArayici,
  olcut: OlcutBilgisi,
  secenek: { kurumAlanlari: string[]; enCokSonuc: number; sinyal?: AbortSignal },
): Promise<DisOrnek[]> {
  const s = await arayici.ara({
    soru: disOrnekSorusu(olcut),
    enCokSonuc: secenek.enCokSonuc,
    haricAlanlar: secenek.kurumAlanlari,
    ...(secenek.sinyal ? { sinyal: secenek.sinyal } : {}),
  });
  return s.kaynaklar
    .filter((k: WebKaynagi) => !alanAdindaMi(k.adres, secenek.kurumAlanlari))
    .map((k) => ({
      tur: "dis_ornek" as const,
      kanitDegildir: true as const,
      olcutKod: olcut.kod,
      adres: k.adres,
      baslik: k.baslik,
      alinti: k.alinti,
      erisim: k.erisim,
    }));
}

/**
 * Bir şeyin rapora KANIT olarak girip giremeyeceği. Dış örnek hiçbir koşulda giremez; yalnız kurumun kanıt
 * havuzundaki (özetli) kanıt girebilir. Rapor ve matris üreticileri bu denetimi kullanır.
 */
export function kanitOlarakKullanilabilirMi(x: { tur?: string; kanitDegildir?: boolean; ozet?: string }): boolean {
  if (x.tur === "dis_ornek" || x.kanitDegildir === true) return false;
  return typeof x.ozet === "string" && /^[0-9a-f]{64}$/u.test(x.ozet);
}
