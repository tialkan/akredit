// Bologna Bilgi Paketi (Proliz OBS) sayfa ayrıştırıcıları.
// apps/cli/lib/bologna.mjs içindeki işlevlerin davranışı birebir korunarak TypeScript'e taşınmış hâlidir.

import type {
  BolognaDersSayfasi,
  BolognaMatrisDersi,
  BolognaProgramCiktisi,
  BolognaProgramMatrisi,
} from "@akredit/cekirdek";

const VARLIKLAR: Record<string, string> = { nbsp: " ", amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
const ETIKET = /<(?:[^>"']|"[^"]*"|'[^']*')*>/g;
const BETIK = /<(script|style)\b(?:[^>"']|"[^"]*"|'[^']*')*>[\s\S]*?<\/\1>/gi;

/** HTML parçasını düz metne çevirir. */
export function metin(html: string): string {
  return html
    .replace(BETIK, "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(ETIKET, " ")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCodePoint(Number.parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, a: string) => VARLIKLAR[a.toLowerCase()] ?? m)
    .replace(/\s+/g, " ")
    .trim();
}

export type HtmlTablosu = string[][];

/** Sayfadaki en içteki tabloları satır ve hücre dizisine çevirir. */
export function tablolar(html: string): HtmlTablosu[] {
  const temiz = html.replace(BETIK, "");
  const sonuc: HtmlTablosu[] = [];
  const re = /<table\b(?:[^>"']|"[^"]*"|'[^']*')*>((?:(?!<table\b)[\s\S])*?)<\/table>/gi;
  for (let m = re.exec(temiz); m; m = re.exec(temiz)) {
    const satirlar = [...(m[1] ?? "").matchAll(/<tr\b(?:[^>"']|"[^"]*"|'[^']*')*>([\s\S]*?)<\/tr>/gi)].map((r) =>
      [...(r[1] ?? "").matchAll(/<t[dh]\b(?:[^>"']|"[^"]*"|'[^']*')*>([\s\S]*?)<\/t[dh]>/gi)].map((c) =>
        metin(c[1] ?? ""),
      ),
    );
    if (satirlar.some((s) => s.length)) sonuc.push(satirlar);
  }
  return sonuc;
}

/** Metindeki ilk sayıyı alır ("% 40" → 40, "2,5" → 2.5). */
export const sayi = (s: unknown): number | null => {
  const m = String(s ?? "")
    .replace(",", ".")
    .match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
};

export interface BolognaAdresi {
  taban: string;
  sunit: string;
  dil: string;
}

/** Program adresinden taban adresi ve program kimliğini çıkarır. */
export function adresCoz(adres: string): BolognaAdresi {
  const u = new URL(adres);
  const sunit = u.searchParams.get("curSunit");
  const i = u.pathname.toLowerCase().indexOf("/bologna/");
  if (!sunit || i < 0) throw new Error("Bologna program adresi bekleniyor (içinde /bologna/ ve curSunit olmalı).");
  return { taban: `${u.origin}${u.pathname.slice(0, i + 9)}`, sunit, dil: u.searchParams.get("lang") || "tr" };
}

export function programCiktilari(html: string): BolognaProgramCiktisi[] {
  const t = tablolar(html).find((t) => /Program Öğrenme Çıktıları|Program Outcomes/i.test(t[0]?.join(" ") ?? ""));
  if (!t) return [];
  return t
    .slice(1)
    .filter((r) => r.length >= 2 && sayi(r[0]) !== null)
    .map((r) => ({ kod: `P${sayi(r[0])}`, metin: r[1] ?? "" }));
}

/** Ders kodu: harf önekli ("HUK101", "HUK 101") ya da sayısal ("1000.020105", EBYÜ canlı yapısı). */
const DERS_KODU = /^(?:[A-ZÇĞİÖŞÜ]{2,}\s*\d|\d{3,}\.\d{3,})/;
const DERS_KODU_ARA = /\b([A-ZÇĞİÖŞÜ]{2,}\s?\d{3}[A-Z]?|\d{3,}\.\d{3,})\b/;
const YUZDE = /^%\s*\d/;
const EPOSTA = /[\p{L}\d._%+-]+@[\p{L}\d-]+(?:\.[\p{L}\d-]+)+/gu;
export const EPOSTA_YERINE = "[e-posta ayıklandı]";

/** Nesnedeki bütün metinlerden e-posta adreslerini ayıklar. */
export function epostaAyikla<T>(x: T): T {
  if (typeof x === "string") return x.replace(EPOSTA, EPOSTA_YERINE) as T;
  if (Array.isArray(x)) return x.map(epostaAyikla) as T;
  if (x && typeof x === "object")
    return Object.fromEntries(Object.entries(x).map(([k, v]) => [k, epostaAyikla(v)])) as T;
  return x;
}

export function programMatrisi(html: string): BolognaProgramMatrisi {
  const satirlar = tablolar(html).flat();
  const baslik = satirlar.find((r) => r.includes("Ders Kodu") && r.some((h) => /^P\d+$/.test(h)));
  if (!baslik) return { pkodlar: [], dersler: [] };
  const pBas = baslik.findIndex((h) => /^P\d+$/.test(h));
  const pkodlar = baslik.slice(pBas);
  let yariyil: number | null = null;
  const dersler: BolognaMatrisDersi[] = [];
  for (const r of satirlar) {
    const ilk = r[0] ?? "";
    if (r.length === 1 && /Yarıyıl|Semester/i.test(ilk)) {
      yariyil = sayi(ilk);
      continue;
    }
    if (r.length < pBas + 1 || r === baslik || ilk === "Ders Kodu") continue;
    const kod = ilk.replace(/^\[G\]\s*/, "");
    if (!DERS_KODU.test(kod)) continue;
    dersler.push({
      kod,
      ad: r[1] ?? "",
      zorunlu: /Zorunlu|Compulsory/i.test(r[2] ?? ""),
      grup: r[3] || null,
      yariyil,
      grupBasligi: ilk.startsWith("[G]"),
      degerler: Object.fromEntries(pkodlar.map((p, i) => [p, r[pBas + i] ?? ""])),
    });
  }
  return { pkodlar, dersler };
}

/** Ders listesi sayfasından ders kodu → Proliz ders kimliği eşlemesi. */
export function dersKimlikleri(html: string): Record<string, string> {
  const kimlik: Record<string, string> = {};
  for (const tr of html.split(/<tr\b/i).slice(1)) {
    const id = tr.match(/prolizOpenCourseDetails\('?(\d+)/);
    const kod = metin(tr).match(DERS_KODU_ARA);
    if (id?.[1] && kod?.[1] && !kimlik[kod[1]]) kimlik[kod[1]] = id[1];
  }
  return kimlik;
}

/** Ders sayfasının ham ayrıştırması (e-posta ayıklanmadan). */
function dersSayfasiCozHam(html: string): BolognaDersSayfasi {
  const t = tablolar(html);
  const bul = (re: RegExp) => t.find((x) => re.test((x[0] ?? []).join(" ")));
  const ust = bul(/Yarıyıl.*Kodu|Semester.*Code/i);
  const [yariyil, kod, ad, tul, kredi, akts, guncelleme] = ust?.[1] ?? [];
  const bilgiler: Record<string, string> = Object.fromEntries(
    (bul(/Dersin Dili|Language/i) ?? []).filter((r) => r.length >= 2).map((r) => [r[0] ?? "", r[1] ?? ""]),
  );
  const degerlendirme = (bul(/Yarıyıl Çalışmaları|Term Studies/i) ?? [])
    .slice(1)
    .filter((r) => r.length >= 3 && !/Toplam|Total/i.test(r[0] ?? ""))
    .map((r) => ({ ad: r[0] ?? "", sayi: sayi(r[1]), katki: sayi(r[2]) }));
  const isyukuTablosu = bul(/İş Yükü|Workload/i) ?? [];
  const isyuku = isyukuTablosu
    .slice(1)
    .filter((r) => r.length >= 4 && sayi(r[3]) !== null && !/Toplam|Total|AKTS|ECTS/i.test(r[0] ?? ""))
    .map((r) => ({ ad: r[0] ?? "", sayi: sayi(r[1]), sure: sayi(r[2]), toplam: sayi(r[3]) }));
  // Canlı Proliz sayfasında (EBYÜ, 2026-10-27) alan yüzdesi tablosu başlıksızdır: ["Sosyal Bilimler", "%100", ""].
  const dersYapisi = (
    t.find((x) => x.some((r) => /Alan Bilgisi|Field/i.test(r[0] ?? ""))) ??
    t.find((x) => x.length > 0 && x.every((r) => r.length >= 2 && YUZDE.test(r[1] ?? ""))) ??
    []
  )
    .filter((r) => r.length >= 2 && /%/.test(r[1] ?? ""))
    .map((r) => ({ alan: r[0] ?? "", yuzde: sayi(r[1]) }));
  const ciktiTablosu = bul(/Sıra No|No.*A[cç]ıklama|Description/i) ?? [];
  const ciktilar = ciktiTablosu
    .slice(1)
    .filter((r) => r.length >= 2 && sayi(r[0]) !== null && r[1])
    .map((r) => ({ kod: `Ö${sayi(r[0])}`, metin: r[1] ?? "" }));
  const haftalar = (bul(/Hafta|Week/i) ?? []).slice(1).filter((r) => sayi(r[0]) !== null && r[1]).length;
  // Katkı satırları "Ö3" ya da çıktının türüne göre "Bi3" (bilgi), "Be3" (beceri), "Ye3" (yetkinlik) diye adlandırılır.
  const katkiTablosu = t.find(
    (x) =>
      (x[0] ?? []).some((h) => /^P\d+$/.test(h)) &&
      x.some((r) => /^(Tüm|All|Ö\d+|Bi\d+|Be\d+|Ye\d+)$/.test(r[0] ?? "")),
  );
  const katki: Record<string, Record<string, string>> = {};
  if (katkiTablosu) {
    const pk = (katkiTablosu[0] ?? []).slice(1);
    for (const r of katkiTablosu.slice(1)) {
      if (!r[0]) continue;
      const ad = /^(Ö|Bi|Be|Ye)\d+$/.test(r[0]) ? `Ö${sayi(r[0])}` : r[0];
      katki[ad] = Object.fromEntries(pk.map((p, i) => [p, r[i + 1] ?? ""]));
    }
  }
  return {
    yariyil: sayi(yariyil),
    ...(kod !== undefined ? { kod } : {}),
    ...(ad !== undefined ? { ad } : {}),
    ...(tul !== undefined ? { tul } : {}),
    kredi: sayi(kredi),
    akts: sayi(akts),
    ...(guncelleme !== undefined ? { guncelleme } : {}),
    bilgiler,
    degerlendirme,
    isyuku,
    dersYapisi,
    ciktilar,
    haftalar,
    katki,
  };
}

/** Bir ders bilgi sayfasını ayrıştırır. E-posta adresleri çıktıdan ayıklanır (KVKK: en az kişisel veri). */
export function dersSayfasiCoz(html: string): BolognaDersSayfasi {
  return epostaAyikla(dersSayfasiCozHam(html));
}

/**
 * TYYÇ matrisinde program çıktısı sütunlarındaki dolu hücreleri sayar.
 * Satırlar "etiket, alt no, P1..Pn, alt no, etiket" ya da etiketsiz "alt no, P1..Pn, alt no" biçimindedir.
 */
export function tyycIsaretSayisi(html: string, pSayisi: number): number | null {
  if (!pSayisi) return null;
  // Canlı yapı (EBYÜ, 2026-10-27): 14 hücreli satır "alan, alt no, P1..Pn, alt no, alan"; rowspan yüzünden
  // sonraki satırlar 12 hücreli "alt no, P1..Pn, alt no". Ayırıcı boş satırlar (alt no yok) sayılmaz.
  // Hiç P hücresi okunamadıysa null (veri yok), okunup hepsi boşsa 0 döner.
  let dolu = 0;
  let okunan = 0;
  for (const r of tablolar(html).flat()) {
    const ic =
      r.length === pSayisi + 4 && /^\d+$/.test(r[1] ?? "")
        ? r.slice(2, 2 + pSayisi)
        : r.length === pSayisi + 2 && /^\d+$/.test(r[0] ?? "")
          ? r.slice(1, 1 + pSayisi)
          : null;
    if (!ic) continue;
    okunan += ic.length;
    dolu += ic.filter((h) => h && h !== "-").length;
  }
  return okunan ? dolu : null;
}
