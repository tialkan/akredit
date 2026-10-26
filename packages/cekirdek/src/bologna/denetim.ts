// Bologna Bilgi Paketi denetimi. apps/cli/lib/bologna.mjs `denetle` işlevinin saf, tipli taşıması.
// Kurallar resmî ölçüt değildir; tutarsızlığı işaretler, kararı komisyon verir.
// Fark: zaman `simdi` parametresiyle gelir; verilmezse güncellik kuralı çalışmaz. Tarih UTC yorumlanır.

import type { Bulgu, BulguDuzeyi, IsoZaman } from "../turler.ts";
import { type BolognaVerisi, okunamadiMi } from "./turler.ts";

export interface BolognaDenetimSecenekleri {
  /** AKTS başına beklenen saat aralığı; varsayılan [25, 30]. */
  aktsSaat?: readonly [number, number];
  /** Son güncellemeden bu yana en çok kaç ay geçebilir; varsayılan 12. */
  guncellikAy?: number;
  /** Denetim zamanı. Verilmezse güncellik kuralı atlanır. */
  simdi?: IsoZaman | number;
}

const bos = (v: unknown): boolean => v === "" || v === "-" || v == null;

const sayi = (s: unknown): number | null => {
  const m = String(s ?? "")
    .replace(",", ".")
    .match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
};

const GUN_MS = 86400000;

export function bolognaDenetle(veri: BolognaVerisi, secenekler: BolognaDenetimSecenekleri = {}): Bulgu[] {
  const aktsSaat = secenekler.aktsSaat ?? [25, 30];
  const guncellikAy = secenekler.guncellikAy ?? 12;
  const bugun =
    secenekler.simdi === undefined
      ? null
      : typeof secenekler.simdi === "number"
        ? secenekler.simdi
        : Date.parse(secenekler.simdi);
  const bulgular: Bulgu[] = [];
  const ekle = (duzey: BulguDuzeyi, konu: string, kural: string, aciklama: string) =>
    bulgular.push({ duzey, konu, kural, aciklama });
  const matrisDersi = new Map(veri.matris.dersler.map((d) => [d.kod, d]));

  if (!veri.programCiktilari.length)
    ekle("hata", "-", "program-ciktisi", "Program öğrenme çıktıları okunamadı ya da boş.");
  if (veri.tyycIsaret === 0)
    ekle("uyari", "-", "tyyc", "TYYÇ matrisinde program çıktılarıyla işaretlenmiş hiçbir ilişki yok.");

  for (const d of veri.matris.dersler) {
    if (d.grupBasligi) continue;
    const dolu = Object.values(d.degerler).filter((v) => !bos(v));
    if (d.zorunlu && !dolu.length)
      ekle("hata", d.kod, "matris-bos", "Zorunlu dersin program çıktısı matrisi satırı tamamen boş.");
    if (dolu.length >= 5 && new Set(dolu).size === 1 && Number(dolu[0]) >= 3)
      ekle(
        "uyari",
        d.kod,
        "matris-ayrimsiz",
        `Bütün dolu hücreler ${dolu[0]}. Çıktılar arasında ayrım yapılmamış görünüyor.`,
      );
  }

  for (const d of veri.dersler) {
    if (okunamadiMi(d)) {
      ekle("hata", d.kod, "okuma", `Ders sayfası okunamadı: ${d.hata}`);
      continue;
    }
    if (d.bos) {
      ekle(
        d.zorunlu ? "hata" : "uyari",
        d.kod,
        "bos-sayfa",
        `${d.zorunlu ? "Zorunlu" : "Seçmeli"} dersin bilgi sayfası boş: çıktı, değerlendirme, iş yükü ve konu yok.`,
      );
      continue;
    }
    const isyuku = d.isyuku ?? [];
    const degerlendirme = d.degerlendirme ?? [];
    const dersYapisi = d.dersYapisi ?? [];
    const ciktilar = d.ciktilar ?? [];
    const katki = d.katki ?? {};

    const toplam = isyuku.reduce((t, x) => t + (x.toplam || 0), 0);
    if (d.akts && toplam) {
      const oran = toplam / d.akts;
      if (oran < aktsSaat[0] || oran > aktsSaat[1])
        ekle(
          "hata",
          d.kod,
          "akts-isyuku",
          `Toplam iş yükü ${toplam} saat, AKTS ${d.akts}. AKTS başına ${oran.toFixed(1)} saat (beklenen ${aktsSaat[0]}-${aktsSaat[1]}).`,
        );
    } else if (d.akts) ekle("uyari", d.kod, "akts-isyuku", "İş yükü tablosu okunamadı ya da boş.");
    const deg = degerlendirme.reduce((t, x) => t + (x.katki || 0), 0);
    if (degerlendirme.length && Math.round(deg) !== 100)
      ekle("hata", d.kod, "degerlendirme", `Değerlendirme katkıları toplamı %${deg}.`);
    if (!degerlendirme.length) ekle("uyari", d.kod, "degerlendirme", "Değerlendirme ölçütleri tablosu yok.");
    const yapi = dersYapisi.reduce((t, x) => t + (x.yuzde || 0), 0);
    if (dersYapisi.length && Math.round(yapi) !== 100)
      ekle("uyari", d.kod, "ders-yapisi", `Ders yapısı yüzdeleri toplamı %${yapi}.`);
    const saat = (d.tul || "")
      .split("+")
      .map(Number)
      .reduce((t, x) => t + (x || 0), 0);
    if (saat > 0 && d.kredi === 0) ekle("uyari", d.kod, "kredi", `T+U+L ${d.tul} olduğu hâlde ulusal kredi 0.`);
    if (!ciktilar.length) ekle("hata", d.kod, "ders-ciktisi", "Dersin öğrenme çıktıları yok.");
    const listede = new Set(ciktilar.map((c) => c.kod));
    const gorunmeyen = Object.keys(katki).filter((k) => /^Ö\d+$/u.test(k) && !listede.has(k));
    if (ciktilar.length && gorunmeyen.length) {
      ekle(
        "hata",
        d.kod,
        "ders-ciktisi",
        `Katkı tablosunda olan ${gorunmeyen.join(", ")} öğrenme çıktıları listesinde görünmüyor. Herkese açık sayfada yalnız ${[...listede].join(", ")} var.`,
      );
    }
    if (d.haftalar && d.haftalar < 14) ekle("uyari", d.kod, "haftalar", `Haftalık konu sayısı ${d.haftalar}.`);
    const [g = 0, a = 0, y = 0] = (d.guncelleme || "").split(".").map(Number);
    if (bugun !== null && y && (bugun - Date.UTC(y, a - 1, g)) / (30 * GUN_MS) > guncellikAy)
      ekle("uyari", d.kod, "guncellik", `Son güncelleme ${d.guncelleme}.`);

    const tum = katki["Tüm"] || katki.All;
    const md = matrisDersi.get(d.kod);
    if (tum && md) {
      const farkli = Object.keys(tum).filter(
        (p) =>
          p in md.degerler &&
          String(tum[p]).trim() !== String(md.degerler[p]).trim() &&
          !(bos(tum[p]) && bos(md.degerler[p])),
      );
      if (farkli.length)
        ekle(
          "hata",
          d.kod,
          "matris-tutarlilik",
          `Ders sayfasındaki genel katkı ile program matrisi farklı: ${farkli.map((p) => `${p} ${tum[p] || "boş"}/${md.degerler[p] || "boş"}`).join(", ")}.`,
        );
    }
    if (tum) {
      const satirlar = Object.entries(katki)
        .filter(([k]) => /^Ö\d+$/u.test(k))
        .map(([, v]) => v);
      if (satirlar.length) {
        const enYuksek = (p: string) => Math.max(0, ...satirlar.map((s) => sayi(s[p]) ?? 0));
        const destekSiz = Object.keys(tum).filter((p) => {
          const n = sayi(tum[p]);
          return n !== null && n > enYuksek(p);
        });
        if (destekSiz.length)
          ekle(
            "uyari",
            d.kod,
            "katki-destegi",
            `Genel katkı hiçbir ders çıktısının katkısıyla desteklenmiyor: ${destekSiz.map((p) => `${p} (genel ${tum[p]}, en yüksek ${enYuksek(p)})`).join(", ")}.`,
          );
      }
    }
  }
  return bulgular;
}
