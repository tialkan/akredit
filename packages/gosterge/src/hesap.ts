// Gösterge değerinin deterministik hesabı. Her değer, hesaba giren veri noktalarının kaynak izleriyle birlikte döner.

import { type GostergeTanimi, gerekenAnahtarlar, type KaynakIzi, kaynakIziSemasi, type VeriNoktasi } from "./tanim.ts";

export interface HesapGirdisi {
  anahtar: string;
  deger: number;
  kaynak: KaynakIzi;
}

export interface GostergeOlcumu {
  kod: string;
  donem: string;
  /** Hesaplanamadıysa null; sayı uydurulmaz. */
  deger: number | null;
  durum: "hesaplandi" | "EKSIK";
  /** Hesaba giren her veri noktası ve kaynağı. */
  girdiler: HesapGirdisi[];
  /** EKSİK nedenleri (kullanıcıya gösterilir). */
  eksikler: string[];
  /** Hesabın kendisi, okunabilir biçimde (ör. "pay / payda × 100"). */
  hesap: string;
}

/** Ondalık gürültüyü atmak için 4 basamağa yuvarlar (yarım yukarı). */
export function yuvarla(x: number, basamak = 4): number {
  const k = 10 ** basamak;
  return Math.round(x * k) / k;
}

const KAYNAK_ADI: Record<KaynakIzi["tur"], string> = {
  baglayici: "bağlayıcı",
  anket: "anket",
  olcme: "ölçme sonucu",
  elle: "elle giriş",
};

/**
 * Göstergeyi bir dönem için hesaplar. Yalnız tanımda izin verilen kaynak türleri ve geçerli kaynak izi taşıyan
 * veri noktaları kullanılır. Aynı anahtar için farklı değerler varsa çelişki EKSİK sayılır.
 */
export function gostergeHesapla(tanim: GostergeTanimi, donem: string, veriler: readonly VeriNoktasi[]): GostergeOlcumu {
  const eksikler: string[] = [];
  const secili = new Map<string, HesapGirdisi>();
  const anahtarlar = gerekenAnahtarlar(tanim.yontem);
  for (const a of anahtarlar) {
    if (secili.has(a)) continue;
    const adaylar = veriler.filter((v) => v.anahtar === a && v.donem === donem);
    const gecerli = adaylar.filter((v) => kaynakIziSemasi.safeParse(v.kaynak).success);
    const izinli = gecerli.filter((v) => tanim.kaynaklar.includes(v.kaynak.tur));
    if (adaylar.length > 0 && gecerli.length === 0) {
      eksikler.push(`"${a}" verisinin kaynağı eksik ya da geçersiz.`);
      continue;
    }
    if (gecerli.length > 0 && izinli.length === 0) {
      eksikler.push(
        `"${a}" verisi bu gösterge için izin verilmeyen kaynaktan geldi (${KAYNAK_ADI[gecerli[0]?.kaynak.tur ?? "elle"]}).`,
      );
      continue;
    }
    if (izinli.length === 0) {
      eksikler.push(`"${a}" verisi ${donem} için yok.`);
      continue;
    }
    const degerler = new Set(izinli.map((v) => v.deger));
    if (degerler.size > 1) {
      eksikler.push(`"${a}" için kaynaklar farklı değer veriyor; hangisinin doğru olduğu seçilmeli.`);
      continue;
    }
    const ilk = izinli[0] as VeriNoktasi;
    secili.set(a, { anahtar: a, deger: ilk.deger, kaynak: ilk.kaynak });
  }

  const girdiler = [...secili.values()];
  const temel = { kod: tanim.kod, donem, girdiler, hesap: hesapMetni(tanim) };
  if (eksikler.length > 0) return { ...temel, deger: null, durum: "EKSIK", eksikler };

  const d = (a: string) => (secili.get(a) as HesapGirdisi).deger;
  const y = tanim.yontem;
  let deger: number;
  switch (y.tur) {
    case "deger":
      deger = d(y.anahtar);
      break;
    case "toplam":
      deger = y.anahtarlar.reduce((t, a) => t + d(a), 0);
      break;
    case "ortalama":
      deger = y.anahtarlar.reduce((t, a) => t + d(a), 0) / y.anahtarlar.length;
      break;
    case "oran": {
      const payda = d(y.payda);
      if (payda === 0)
        return { ...temel, deger: null, durum: "EKSIK", eksikler: [`"${y.payda}" sıfır; oran hesaplanamaz.`] };
      deger = (d(y.pay) / payda) * y.carpan;
      break;
    }
  }
  return { ...temel, deger: yuvarla(deger), durum: "hesaplandi", eksikler: [] };
}

export function hesapMetni(tanim: GostergeTanimi): string {
  const y = tanim.yontem;
  switch (y.tur) {
    case "deger":
      return y.anahtar;
    case "toplam":
      return y.anahtarlar.join(" + ");
    case "ortalama":
      return `(${y.anahtarlar.join(" + ")}) / ${y.anahtarlar.length}`;
    case "oran":
      return y.carpan === 1 ? `${y.pay} / ${y.payda}` : `${y.pay} / ${y.payda} × ${y.carpan}`;
  }
}

/**
 * Ölçüm kaynağına izlenebilir mi? Değer varsa: yöntemin her anahtarı için tam bir girdi ve geçerli kaynak izi olmalı.
 * Değer yoksa EKSİK olmalı ve nedeni yazılmış olmalı.
 */
export function izlenebilirMi(tanim: GostergeTanimi, olcum: GostergeOlcumu): boolean {
  if (olcum.deger === null) return olcum.durum === "EKSIK" && olcum.eksikler.length > 0;
  const anahtarlar = new Set(gerekenAnahtarlar(tanim.yontem));
  if (olcum.girdiler.length !== anahtarlar.size) return false;
  return olcum.girdiler.every(
    (g) =>
      anahtarlar.has(g.anahtar) &&
      kaynakIziSemasi.safeParse(g.kaynak).success &&
      tanim.kaynaklar.includes(g.kaynak.tur),
  );
}

/** Kaynak izinin kanıt kimliği (varsa). */
export function kaynakKaniti(k: KaynakIzi): string | null {
  return k.tur === "baglayici" || k.tur === "elle" ? (k.kanitId ?? null) : null;
}

/** Kaynak izinin kullanıcıya gösterilecek kısa açıklaması. */
export function kaynakMetni(k: KaynakIzi): string {
  switch (k.tur) {
    case "baglayici":
      return `Bağlayıcı: ${k.baglayici} (${k.adres}, ${k.okunma.slice(0, 10)})`;
    case "anket":
      return `Anket ${k.anketId}, soru ${k.soru}`;
    case "olcme":
      return `Ölçme sonucu ${k.sonucId}`;
    case "elle":
      return `Elle giriş, kanıt ${k.kanitId} (${k.zaman.slice(0, 10)})`;
  }
}
