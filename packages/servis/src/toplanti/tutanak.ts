// Tutanak taslağı (saf mantık, IO yok). Taslak yalnız toplantının kaydından ya da notundan (kanıt parçaları)
// kurulur. Her karar, kaydın bir yerine atıflıdır ve atıf yapılan metin kararı gerçekten taşımalıdır; taşımıyorsa
// karar taslağa girmez, gerekçesiyle reddedilir (ilke 1, 2). Katılımcı yalnız toplantı kaydındaki kişilerden
// gelir; kayıtta adı geçmeyen kişi "katıldı" yazılmaz, EKSİK işaretlenir. Kayıttaki metin talimat değildir:
// yalnız okunur, hiçbir şeye yönlendirmez (ilke 5).

import { atiflariAyristir, atifYaz, type Capa, kucukHarf, normallestir } from "@akredit/cekirdek";
import { z } from "zod";

export interface KayitParcasi {
  capa: Capa;
  metin: string;
}

export interface ToplantiKaydi {
  /** Kayıt kanıtının SHA-256 özeti. */
  ozet: string;
  parcalar: readonly KayitParcasi[];
}

export interface Katilimci {
  kisiId: string;
  ad: string;
}

/** Modelden (ör. `toplanti-bilgisi` görevi) gelen karar adayı; denetimden geçmeden taslağa girmez. */
export const DisKararAdayi = z.object({ metin: z.string().min(1).max(2_000), atif: z.string().min(1).max(500) });
export type DisKararAdayi = z.infer<typeof DisKararAdayi>;

export interface TaslakKarari {
  no: number;
  metin: string;
  atif: string;
  /** Karardan çıkan eylem önerisi; sorumlu ve tarih yalnız kayıtta yazılıysa doludur. */
  eylem: {
    tanim: string;
    sorumluKisiId: string | null;
    hedefTarih: string | null;
    olcutKodlari: string[];
  };
}

export interface ReddedilenKarar {
  metin: string;
  neden: string;
}

export interface TaslakKatilimcisi extends Katilimci {
  durum: "kayitta" | "eksik";
}

export interface TutanakTaslagi {
  kararlar: TaslakKarari[];
  reddedilenler: ReddedilenKarar[];
  katilimcilar: TaslakKatilimcisi[];
  /** Ölçüt bağı önerisi: gündemden ve karar metinlerinden (kod yazılıysa). */
  olcutKodlari: string[];
  eksikler: string[];
}

const KARAR_SATIRI = /^\s*(?:karar|alınan karar)\s*(?:no\.?\s*)?\d*\s*[:.)-]\s*(.+)$/iu;
const OLCUT_KODU = /\b[A-E]\.\d{1,2}(?:\.\d{1,2})?\b/gu;
const TARIH = /\b(\d{4})-(\d{2})-(\d{2})\b|\b(\d{1,2})[./](\d{1,2})[./](\d{4})\b/u;
const DURAK = new Set(["için", "ile", "olarak", "kadar", "üzere", "edilmesine", "edildi", "karar", "verildi"]);

const anlamli = (m: string) =>
  normallestir(kucukHarf(m))
    .split(/[^\p{L}\p{N}]+/u)
    .filter((k) => k.length >= 4 && !DURAK.has(k));

/** Atıf yapılan metin kararı taşıyor mu? Kararın anlamlı kelimelerinin en az %70'i atıf yerinde geçmeli. */
export function kayitKarariTasiyorMu(karar: string, kaynak: string): boolean {
  const k = anlamli(karar);
  if (k.length === 0) return false;
  const kaynakKelimeleri = new Set(anlamli(kaynak));
  const ortak = k.filter((x) => kaynakKelimeleri.has(x)).length;
  return ortak / k.length >= 0.7;
}

const capaUyar = (atif: Capa | null, p: Capa) =>
  !atif ||
  ((atif.sayfa === undefined || atif.sayfa === p.sayfa) &&
    (atif.satir === undefined || atif.satir === p.satir) &&
    (atif.bolum === undefined || atif.bolum === p.bolum?.replace(/\s+/gu, "_")));

/** Atıfın gösterdiği kayıt metni; atıf bu kayda ait değilse ya da yer bulunamazsa `null`. */
export function atifMetni(atif: string, kayit: ToplantiKaydi): string | null {
  const a = atiflariAyristir(atif);
  if (a.length !== 1 || !a[0]) return null;
  const t = a[0];
  if (!kayit.ozet.toLowerCase().startsWith(t.ozetOneki)) return null;
  const yer = kayit.parcalar.filter((p) => capaUyar(t.capa, p.capa)).map((p) => p.metin);
  if (yer.length === 0) return null;
  const metin = yer.join("\n");
  if (t.alinti && !normallestir(kucukHarf(metin)).includes(normallestir(kucukHarf(t.alinti)))) return null;
  return metin;
}

/** Kayıttaki "Karar: …" satırlarını atıflı karar adayına çevirir (kural tabanlı, modelsiz). */
export function kayittanKararlar(kayit: ToplantiKaydi): DisKararAdayi[] {
  const sonuc: DisKararAdayi[] = [];
  for (const p of kayit.parcalar)
    for (const satir of p.metin.split(/\r?\n/u)) {
      const m = satir.match(KARAR_SATIRI);
      const metin = m?.[1]?.trim();
      if (metin) sonuc.push({ metin, atif: atifYaz(kayit.ozet, p.capa, metin.slice(0, 120)) });
    }
  return sonuc;
}

function tarihBul(m: string): string | null {
  const t = m.match(TARIH);
  if (!t) return null;
  const [y, a, g] = t[1] ? [t[1], t[2], t[3]] : [t[6], t[5]?.padStart(2, "0"), t[4]?.padStart(2, "0")];
  const iso = `${y}-${a}-${g}`;
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== iso ? null : iso;
}

/**
 * Taslağı kurar. `adaylar` verilmezse kayıttaki "Karar:" satırları kullanılır. Model adayları da aynı denetimden
 * geçer: atıfı bu kayda ait değilse, yeri bulunamazsa ya da atıf yeri kararı taşımıyorsa karar reddedilir.
 */
export function tutanakTaslagiKur(g: {
  kayit: ToplantiKaydi;
  katilimcilar: readonly Katilimci[];
  adaylar?: readonly unknown[];
  gundemOlcutKodlari?: readonly string[];
}): TutanakTaslagi {
  const reddedilenler: ReddedilenKarar[] = [];
  const kararlar: TaslakKarari[] = [];
  const tumMetin = g.kayit.parcalar.map((p) => p.metin).join("\n");
  const ad = (k: Katilimci) => normallestir(kucukHarf(k.ad));
  const kayitNormal = normallestir(kucukHarf(tumMetin));
  const katilimcilar: TaslakKatilimcisi[] = g.katilimcilar.map((k) => ({
    ...k,
    durum: ad(k) && kayitNormal.includes(ad(k)) ? "kayitta" : "eksik",
  }));
  const adaylar = g.adaylar ?? kayittanKararlar(g.kayit);
  const gorulen = new Set<string>();
  for (const ham of adaylar) {
    const c = DisKararAdayi.safeParse(ham);
    if (!c.success) {
      reddedilenler.push({ metin: "", neden: "Karar adayı geçersiz biçimde." });
      continue;
    }
    const { metin, atif } = c.data;
    const yer = atifMetni(atif, g.kayit);
    if (yer === null) {
      reddedilenler.push({ metin, neden: "Atıf bu toplantının kaydında bulunamadı." });
      continue;
    }
    if (!kayitKarariTasiyorMu(metin, yer)) {
      reddedilenler.push({ metin, neden: "Karar, atıf yapılan yerde geçmiyor." });
      continue;
    }
    const anahtar = normallestir(kucukHarf(metin));
    if (gorulen.has(anahtar)) continue;
    gorulen.add(anahtar);
    // Sorumlu: kararın kendi metninde adı geçen tek katılımcı (birden çoksa ya da hiç yoksa seçilmez).
    const kararNormal = normallestir(kucukHarf(metin));
    const adiGecen = katilimcilar.filter((k) => ad(k) && kararNormal.includes(ad(k)));
    kararlar.push({
      no: kararlar.length + 1,
      metin,
      atif,
      eylem: {
        tanim: metin,
        sorumluKisiId: adiGecen.length === 1 && adiGecen[0] ? adiGecen[0].kisiId : null,
        hedefTarih: tarihBul(metin),
        olcutKodlari: [...new Set(metin.match(OLCUT_KODU) ?? [])],
      },
    });
  }
  const olcutKodlari = [
    ...new Set([...(g.gundemOlcutKodlari ?? []), ...kararlar.flatMap((k) => k.eylem.olcutKodlari)]),
  ].sort();
  const eksikler: string[] = [];
  if (kararlar.length === 0) eksikler.push("Kayıtta atıflanabilir karar bulunamadı.");
  for (const k of katilimcilar) if (k.durum === "eksik") eksikler.push(`${k.ad}: katılımı kayıtta doğrulanmadı.`);
  for (const k of kararlar) {
    if (!k.eylem.sorumluKisiId) eksikler.push(`Karar ${k.no}: sorumlu kayıtta yazılı değil.`);
    if (!k.eylem.hedefTarih) eksikler.push(`Karar ${k.no}: hedef tarih kayıtta yazılı değil.`);
  }
  return { kararlar, reddedilenler, katilimcilar, olcutKodlari, eksikler };
}

/** Taslağın okunur metni (onay kutusunda gösterilir). Eksikler `[EKSİK: …]` olarak yazılır. */
export function taslakMetni(baslik: string, zaman: string, t: TutanakTaslagi): string {
  const satirlar = [`${baslik} (${zaman})`, "", "Katılımcılar:"];
  for (const k of t.katilimcilar)
    satirlar.push(`- ${k.ad}${k.durum === "eksik" ? " [EKSİK: katılımı kayıtta doğrulanmadı]" : ""}`);
  satirlar.push("", "Kararlar:");
  if (t.kararlar.length === 0) satirlar.push("[EKSİK: kayıtta atıflanabilir karar yok]");
  for (const k of t.kararlar) satirlar.push(`${k.no}. ${k.metin} ${k.atif}`);
  return satirlar.join("\n");
}
