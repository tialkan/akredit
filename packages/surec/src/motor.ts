// Süreç motoru: saf durum makinesi. Girdi süreç tanımı, örneğin anlık durumu ve zamandır; çıktı
// uygulanacak eylemlerdir. Her zamanlı eylemin tekil bir anahtarı vardır; uygulayan taraf anahtarı
// `gonderilenler`e ekler, böylece motor aynı eylemi ikinci kez üretmez (tekrar çalıştırmaya dayanıklı).
// Motor tarih uydurmaz: takvimde olmayan tarih `eksik_tarih` eylemi olur, adım açılmaz.

import type { Adim, Kosul, SurecTanimi } from "./tanim.ts";
import { GUN_MS, yerelZaman } from "./zaman.ts";

export type AdimDurumuTuru = "bekliyor" | "acik" | "tamam";

export interface AdimDurumu {
  durum: AdimDurumuTuru;
  acilis?: Date;
  sonTarih?: Date;
  kanitSayisi: number;
  /** Uygulanmış zamanlı eylemlerin anahtarları. */
  gonderilenler: string[];
}

export interface OrnekDurumu {
  baslangic: Date;
  olaylar: string[];
  adimlar: Record<string, AdimDurumu>;
  durum: "acik" | "kapali";
}

export interface MotorBaglami {
  simdi: Date;
  /** Takvim anahtarı → "YYYY-MM-DD" (kurum ayarı + çerçeve verisi). */
  takvim: Record<string, string>;
  saatDilimi: string;
  gunSaati: string;
}

export type Eylem =
  | { tur: "gorev_ac"; adim: string; sonTarih: Date }
  | { tur: "hatirlat"; adim: string; anahtar: string; gunKaldi: number }
  | { tur: "gecikti"; adim: string; anahtar: string }
  | { tur: "yukselt"; adim: string; anahtar: string; rol: Adim["gorev"]["rol"] }
  | { tur: "eksik_tarih"; adim: string; anahtar: string; takvimAnahtarlari: string[] }
  | { tur: "kapat" };

export function bosDurum(tanim: SurecTanimi, baslangic: Date): OrnekDurumu {
  return {
    baslangic,
    olaylar: [],
    durum: "acik",
    adimlar: Object.fromEntries(
      tanim.adimlar.map((a) => [a.kod, { durum: "bekliyor", kanitSayisi: 0, gonderilenler: [] } as AdimDurumu]),
    ),
  };
}

/** Takvim noktasını ana çevirir; tarih yoksa `null`. */
export function noktaZamani(nokta: { anahtar: string; gunFark: number }, b: MotorBaglami): Date | null {
  const tarih = b.takvim[nokta.anahtar];
  if (!tarih) return null;
  return yerelZaman(tarih, b.gunSaati, b.saatDilimi, nokta.gunFark);
}

interface KosulSonucu {
  saglandi: boolean;
  eksik: string[];
  /** Koşul gelecekteki bir tarihe bağlıysa o tarih (uyanma hesabı için). */
  bekleme: Date[];
}

function kosulDegerlendir(k: Kosul, d: OrnekDurumu, b: MotorBaglami): KosulSonucu {
  switch (k.tur) {
    case "adimlar_tamam":
      return { saglandi: k.adimlar.every((a) => d.adimlar[a]?.durum === "tamam"), eksik: [], bekleme: [] };
    case "olay":
      return { saglandi: d.olaylar.includes(k.olay), eksik: [], bekleme: [] };
    case "tarih": {
      const z = noktaZamani(k.nokta, b);
      if (!z) return { saglandi: false, eksik: [k.nokta.anahtar], bekleme: [] };
      return { saglandi: z <= b.simdi, eksik: [], bekleme: z > b.simdi ? [z] : [] };
    }
    case "hepsi":
    case "herhangi": {
      const alt = k.kosullar.map((x) => kosulDegerlendir(x, d, b));
      const saglandi = k.tur === "hepsi" ? alt.every((x) => x.saglandi) : alt.some((x) => x.saglandi);
      return { saglandi, eksik: alt.flatMap((x) => x.eksik), bekleme: alt.flatMap((x) => x.bekleme) };
    }
  }
}

function tetiklendiMi(a: Adim, d: OrnekDurumu, b: MotorBaglami): KosulSonucu {
  const t = a.tetikleyici;
  switch (t.tur) {
    case "baslangic":
      return { saglandi: true, eksik: [], bekleme: [] };
    case "tarih":
      return kosulDegerlendir({ tur: "tarih", nokta: t.nokta }, d, b);
    case "olay":
      return kosulDegerlendir({ tur: "olay", olay: t.olay }, d, b);
    case "kosul":
      return kosulDegerlendir(t.kosul, d, b);
  }
}

function sonTarihHesapla(a: Adim, acilis: Date, b: MotorBaglami): Date | null {
  if (a.sonTarih.tur === "sure") return new Date(acilis.getTime() + a.sonTarih.gun * GUN_MS);
  return noktaZamani(a.sonTarih.nokta, b);
}

/** Açık adımın zamanlı eylemleri ve zamanları. */
function zamanliEylemler(a: Adim, ad: AdimDurumu): { zaman: Date; eylem: Eylem }[] {
  if (ad.durum !== "acik" || !ad.sonTarih) return [];
  const st = ad.sonTarih.getTime();
  const sonuc: { zaman: Date; eylem: Eylem }[] = [];
  // Büyükten küçüğe: geç kalınmış birden çok hatırlatmadan yalnız en yakını gönderilir (aşağıda).
  for (const gun of [...new Set(a.hatirlatmalar)].sort((x, y) => y - x))
    sonuc.push({
      zaman: new Date(st - gun * GUN_MS),
      eylem: { tur: "hatirlat", adim: a.kod, anahtar: `hatirlat:${a.kod}:${gun}`, gunKaldi: gun },
    });
  sonuc.push({ zaman: new Date(st), eylem: { tur: "gecikti", adim: a.kod, anahtar: `gecikti:${a.kod}` } });
  if (a.yukseltme)
    sonuc.push({
      zaman: new Date(st + a.yukseltme.gunSonra * GUN_MS),
      eylem: { tur: "yukselt", adim: a.kod, anahtar: `yukselt:${a.kod}`, rol: a.yukseltme.rol },
    });
  return sonuc;
}

/**
 * Bir adım ilerletir: tetiklenen adımlar için görev açar, zamanı gelen hatırlatma/gecikme/yükseltme
 * eylemlerini üretir, bütün adımlar tamamsa süreci kapatır. Durumu değiştirmez.
 */
export function ilerlet(tanim: SurecTanimi, d: OrnekDurumu, b: MotorBaglami): Eylem[] {
  if (d.durum === "kapali") return [];
  const eylemler: Eylem[] = [];
  for (const a of tanim.adimlar) {
    const ad = d.adimlar[a.kod] ?? { durum: "bekliyor", kanitSayisi: 0, gonderilenler: [] };
    if (ad.durum === "bekliyor") {
      const t = tetiklendiMi(a, d, b);
      const eksik = new Set(t.eksik);
      if (t.saglandi) {
        const st = sonTarihHesapla(a, b.simdi, b);
        if (st) eylemler.push({ tur: "gorev_ac", adim: a.kod, sonTarih: st });
        else if (a.sonTarih.tur === "takvim") eksik.add(a.sonTarih.nokta.anahtar);
      }
      if (eksik.size > 0) {
        const anahtarlar = [...eksik].sort();
        const anahtar = `eksik_tarih:${a.kod}:${anahtarlar.join(",")}`;
        if (!ad.gonderilenler.includes(anahtar))
          eylemler.push({ tur: "eksik_tarih", adim: a.kod, anahtar, takvimAnahtarlari: anahtarlar });
      }
      continue;
    }
    if (ad.durum !== "acik") continue;
    const zamani = zamanliEylemler(a, ad).filter(
      (x) => x.zaman <= b.simdi && !ad.gonderilenler.includes((x.eylem as { anahtar: string }).anahtar),
    );
    // Motor bir süre çalışmadıysa hatırlatma yağdırmaz: zamanı geçmiş hatırlatmalardan yalnız en
    // sonuncusu gönderilir, gecikme ya da yükseltme varsa hiçbiri. Atlananlar `bastirilanAnahtarlar`
    // ile gönderilmiş sayılır.
    const hatirlatmalar = zamani.filter((x) => x.eylem.tur === "hatirlat");
    const digerleri = zamani.filter((x) => x.eylem.tur !== "hatirlat");
    if (digerleri.length === 0 && hatirlatmalar.length > 0) {
      const son = hatirlatmalar[hatirlatmalar.length - 1];
      if (son) eylemler.push(son.eylem);
    }
    for (const x of digerleri) eylemler.push(x.eylem);
  }
  const hepsiTamam = tanim.adimlar.every((a) => d.adimlar[a.kod]?.durum === "tamam");
  if (hepsiTamam) eylemler.push({ tur: "kapat" });
  return eylemler;
}

/** Eylemin bastırdığı (artık gönderilmemesi gereken) anahtarlar: geç kalmış daha erken hatırlatmalar. */
export function bastirilanAnahtarlar(tanim: SurecTanimi, d: OrnekDurumu, e: Eylem, simdi: Date): string[] {
  if (e.tur !== "hatirlat" && e.tur !== "gecikti" && e.tur !== "yukselt") return [];
  const a = tanim.adimlar.find((x) => x.kod === e.adim);
  const ad = d.adimlar[e.adim];
  if (!a || !ad) return [];
  return zamanliEylemler(a, ad)
    .filter((x) => x.eylem.tur === "hatirlat" && x.zaman <= simdi)
    .map((x) => (x.eylem as { anahtar: string }).anahtar)
    .filter((k) => k !== (e as { anahtar: string }).anahtar);
}

/** Bu örnek için motorun bir sonraki uyanması gereken an (yoksa `null`). */
export function sonrakiUyanma(tanim: SurecTanimi, d: OrnekDurumu, b: MotorBaglami): Date | null {
  if (d.durum === "kapali") return null;
  const adaylar: Date[] = [];
  for (const a of tanim.adimlar) {
    const ad = d.adimlar[a.kod];
    if (!ad) continue;
    if (ad.durum === "bekliyor") adaylar.push(...tetiklendiMi(a, d, b).bekleme);
    for (const x of zamanliEylemler(a, ad))
      if (x.zaman > b.simdi && !ad.gonderilenler.includes((x.eylem as { anahtar: string }).anahtar))
        adaylar.push(x.zaman);
  }
  if (adaylar.length === 0) return null;
  return new Date(Math.min(...adaylar.map((x) => x.getTime())));
}

/** Kendiliğinden başlayan tanım için başlama anı; elle/olayla başlayanlar ya da takvimde tarih yoksa `null`. */
export function baslatmaZamani(tanim: SurecTanimi, b: MotorBaglami): Date | null {
  if (tanim.baslatma.tur !== "tarih") return null;
  return noktaZamani(tanim.baslatma.nokta, b);
}

/** Görev kapatılabilir mi: yeterli kanıt bağlı olmalı. Kanıtsız kapanış yoktur. */
export function kapatilabilirMi(a: Adim, ad: AdimDurumu): { tamam: true } | { tamam: false; eksikKanit: number } {
  if (ad.durum !== "acik") return { tamam: false, eksikKanit: 0 };
  const eksik = a.enAzKanit - ad.kanitSayisi;
  return eksik > 0 ? { tamam: false, eksikKanit: eksik } : { tamam: true };
}
