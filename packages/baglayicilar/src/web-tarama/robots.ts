// robots.txt ayrıştırma ve eşleme (RFC 9309). Bizim ajanımıza özel grup varsa o, yoksa "*" grubu uygulanır.
// Eşleme: en uzun eşleşen kural kazanır; eşitlikte Allow. `*` her dizi, sondaki `$` satır sonu.

export interface RobotsKurali {
  izin: boolean;
  desen: string;
}

export interface RobotsKurallari {
  kurallar: RobotsKurali[];
  /** Crawl-delay (saniye), yoksa null. */
  bekleme: number | null;
}

interface Grup {
  ajanlar: string[];
  kurallar: RobotsKurali[];
  bekleme: number | null;
}

/** Ajan adının ürün kısmı ("Akredit (…)" → "akredit"). */
function urunAdi(ajan: string): string {
  return (ajan.split(/[\s/(]/u)[0] ?? "").toLowerCase();
}

export function robotsAyristir(metin: string, ajan: string): RobotsKurallari {
  const gruplar: Grup[] = [];
  let simdiki: Grup | null = null;
  let kuralGeldi = false;
  for (const hamSatir of metin.split(/\r?\n/u)) {
    const satir = hamSatir.replace(/#.*$/u, "").trim();
    if (!satir) continue;
    const i = satir.indexOf(":");
    if (i < 0) continue;
    const ad = satir.slice(0, i).trim().toLowerCase();
    const deger = satir.slice(i + 1).trim();
    if (ad === "user-agent") {
      if (!simdiki || kuralGeldi) {
        simdiki = { ajanlar: [], kurallar: [], bekleme: null };
        gruplar.push(simdiki);
        kuralGeldi = false;
      }
      simdiki.ajanlar.push(deger.toLowerCase());
    } else if (simdiki && (ad === "allow" || ad === "disallow")) {
      kuralGeldi = true;
      // Boş Disallow "her şey serbest" demektir; kural eklenmez.
      if (deger) simdiki.kurallar.push({ izin: ad === "allow", desen: deger });
    } else if (simdiki && ad === "crawl-delay") {
      kuralGeldi = true;
      const n = Number(deger);
      if (Number.isFinite(n) && n >= 0) simdiki.bekleme = Math.min(n, 60);
    }
  }
  const urun = urunAdi(ajan);
  const ozel = gruplar.filter((g) => g.ajanlar.some((a) => a !== "*" && urun.startsWith(a)));
  const secilen = ozel.length ? ozel : gruplar.filter((g) => g.ajanlar.includes("*"));
  return {
    kurallar: secilen.flatMap((g) => g.kurallar),
    bekleme: secilen.reduce<number | null>((m, g) => (g.bekleme === null ? m : Math.max(m ?? 0, g.bekleme)), null),
  };
}

function desenIfadesi(desen: string): RegExp {
  const sonda = desen.endsWith("$");
  const govde = (sonda ? desen.slice(0, -1) : desen)
    .split("*")
    .map((p) => p.replace(/[.+?^${}()|[\]\\]/gu, "\\$&"))
    .join(".*");
  return new RegExp(`^${govde}${sonda ? "$" : ""}`, "u");
}

/** Yol (sorgu dahil) bu kurallara göre alınabilir mi? */
export function robotsIzinli(k: RobotsKurallari, yol: string): boolean {
  let enUzun = -1;
  let izin = true;
  for (const r of k.kurallar) {
    let eslesti = false;
    try {
      eslesti = desenIfadesi(r.desen).test(yol) || desenIfadesi(r.desen).test(decodeURI(yol));
    } catch {
      eslesti = desenIfadesi(r.desen).test(yol);
    }
    if (!eslesti) continue;
    const uzunluk = r.desen.length;
    if (uzunluk > enUzun || (uzunluk === enUzun && r.izin)) {
      enUzun = uzunluk;
      izin = r.izin;
    }
  }
  return izin;
}
