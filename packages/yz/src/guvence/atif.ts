// Atıf güvencesi: her olgusal cümle kanıta bağlı mı, atıf var olan kanıta çıkıyor mu, alıntı parçada geçiyor mu?
import { type Atif, alintiGeciyorMu, atiflariAyristir, type Capa, eksikleriAyristir } from "@akredit/cekirdek";

/** Atıf denetiminde kullanılan kanıt: özet ve metin parçaları. */
export interface AtifKaynagi {
  ozet: string;
  parcalar: { capa: Capa; metin: string }[];
}

export interface Cumle {
  metin: string;
  baslangic: number;
  bitis: number;
}

export type AtifSorunuTuru =
  | "atif_yok"
  | "kanit_yok"
  | "belirsiz_ozet"
  | "konum_yok"
  | "alinti_uyusmuyor"
  | "taninmayan_konum";

export interface AtifSorunu {
  tur: AtifSorunuTuru;
  atif?: string;
  aciklama: string;
}

export interface CumleDenetimi extends Cumle {
  olgusal: boolean;
  atiflar: Atif[];
  sorunlar: AtifSorunu[];
  /** Uyarı dışında sorun yoksa true. */
  gecti: boolean;
}

export interface AtifDenetimi {
  cumleler: CumleDenetimi[];
  gecerli: boolean;
}

// Nokta ile biten, cümle sonu sayılmayan Türkçe kısaltmalar (küçük harfle).
const KISALTMALAR = new Set([
  "prof",
  "doç",
  "dr",
  "yrd",
  "öğr",
  "gör",
  "arş",
  "uzm",
  "av",
  "müh",
  "vb",
  "vs",
  "vd",
  "s",
  "ss",
  "no",
  "bkz",
  "örn",
  "krş",
  "sn",
  "st",
  "md",
  "fık",
  "c",
  "y",
  "yy",
  "çev",
  "ed",
  "a.ş",
  "ltd",
  "şti",
  "tel",
  "mah",
  "cad",
  "sok",
]);

function kisaltmaMi(onceki: string): boolean {
  const kelime = onceki.match(/([\p{L}.]+)$/u)?.[1] ?? "";
  if (!kelime) return false;
  const k = kelime.toLocaleLowerCase("tr-TR");
  if (KISALTMALAR.has(k)) return true;
  // Tek büyük harf (ad baş harfi: "A. Yılmaz") ya da "T.C" gibi noktalı kısaltma.
  return /^\p{Lu}$/u.test(kelime) || /^(\p{L}\.)+\p{L}$/u.test(kelime);
}

/** Metni cümlelere böler. Köşeli parantez (atıf) içindeki noktalar ve kısaltmalar bölmez. */
export function cumlelereBol(metin: string): Cumle[] {
  const sonuc: Cumle[] = [];
  let bas = 0;
  let derinlik = 0;
  const ekle = (son: number) => {
    const ham = metin.slice(bas, son);
    const solBosluk = ham.length - ham.trimStart().length;
    const t = ham.trim();
    if (t) sonuc.push({ metin: t, baslangic: bas + solBosluk, bitis: bas + solBosluk + t.length });
    bas = son;
  };
  for (let i = 0; i < metin.length; i++) {
    const ch = metin[i] ?? "";
    if (ch === "[") derinlik++;
    else if (ch === "]") derinlik = Math.max(0, derinlik - 1);
    else if (ch === "\n" && metin[i + 1] === "\n" && derinlik === 0) ekle(i);
    else if (derinlik === 0 && (ch === "." || ch === "!" || ch === "?" || ch === "…")) {
      let j = i + 1;
      while (j < metin.length && /[.!?…"”')]/u.test(metin[j] ?? "")) j++;
      if (j < metin.length && !/\s/u.test(metin[j] ?? "")) continue;
      if (ch === "." && kisaltmaMi(metin.slice(bas, i))) continue;
      // Sayı + nokta + küçük harf ("3. madde") cümle sonu değil.
      let k = j;
      while (k < metin.length && /\s/u.test(metin[k] ?? "")) k++;
      if (ch === "." && /\d$/u.test(metin.slice(bas, i)) && /\p{Ll}/u.test(metin[k] ?? "")) continue;
      // Noktadan sonra gelen atıf önceki cümleye aittir.
      if (metin.startsWith("[K:", k) || /^\[EKS[İI]K/u.test(metin.slice(k))) {
        const kapanis = metin.indexOf("]", k);
        if (kapanis > 0) {
          j = kapanis + 1;
          i = kapanis;
        }
      }
      ekle(j);
    }
  }
  ekle(metin.length);
  return sonuc;
}

/** Varsayılan olgusallık ölçütü: soru, başlık ya da tamamen EKSİK işareti olmayan, en az 3 kelimelik cümle. */
export function olgusalMi(cumle: string): boolean {
  const atifsiz = cumle
    .replace(/\[K:[^\]]*\]/gu, "")
    .replace(/\[EKS[İI]K[^\]]*\]/giu, "")
    .trim();
  if (!atifsiz) return false;
  if (eksikleriAyristir(cumle).length) return false;
  if (/\?\s*$/u.test(atifsiz)) return false;
  if (/^#{1,6}\s/u.test(atifsiz)) return false;
  return atifsiz.split(/\s+/u).filter(Boolean).length >= 3;
}

function capaUyuyor(atif: Capa, parca: Capa): boolean {
  if (atif.sayfa !== undefined) {
    if (parca.sayfa === undefined) return false;
    const aSon = atif.sayfaSon ?? atif.sayfa;
    const pSon = parca.sayfaSon ?? parca.sayfa;
    if (pSon < atif.sayfa || parca.sayfa > aSon) return false;
  }
  if (atif.bolum !== undefined && parca.bolum !== atif.bolum) return false;
  if (atif.satir !== undefined && parca.satir !== atif.satir) return false;
  if (atif.hucre !== undefined && parca.hucre !== atif.hucre) return false;
  if (atif.slayt !== undefined && parca.slayt !== atif.slayt) return false;
  return true;
}

export function atifDogrula(atif: Atif, kaynaklar: AtifKaynagi[]): AtifSorunu[] {
  const adaylar = kaynaklar.filter((k) => k.ozet.toLowerCase().startsWith(atif.ozetOneki));
  if (!adaylar.length) return [{ tur: "kanit_yok", atif: atif.ham, aciklama: "Atıf yapılan kanıt bulunamadı." }];
  if (new Set(adaylar.map((a) => a.ozet.toLowerCase())).size > 1)
    return [{ tur: "belirsiz_ozet", atif: atif.ham, aciklama: "Atıftaki özet birden çok kanıta uyuyor." }];
  const kanit = adaylar[0] as AtifKaynagi;
  const sorunlar: AtifSorunu[] = [];
  if (atif.taninmayan)
    sorunlar.push({ tur: "taninmayan_konum", atif: atif.ham, aciklama: `Tanınmayan konum: ${atif.taninmayan}` });
  const parcalar = atif.capa ? kanit.parcalar.filter((p) => capaUyuyor(atif.capa as Capa, p.capa)) : kanit.parcalar;
  if (atif.capa && !parcalar.length) {
    sorunlar.push({ tur: "konum_yok", atif: atif.ham, aciklama: "Atıftaki konum kanıtta yok." });
    return sorunlar;
  }
  if (atif.alinti && !parcalar.some((p) => alintiGeciyorMu(atif.alinti as string, p.metin)))
    sorunlar.push({ tur: "alinti_uyusmuyor", atif: atif.ham, aciklama: "Alıntı kanıtın metninde geçmiyor." });
  return sorunlar;
}

const UYARI_TURLERI = new Set<AtifSorunuTuru>(["taninmayan_konum"]);

export function atifDenetle(
  metin: string,
  kaynaklar: AtifKaynagi[],
  secenek: { olgusalMi?: (cumle: string) => boolean } = {},
): AtifDenetimi {
  const olcut = secenek.olgusalMi ?? olgusalMi;
  const cumleler = cumlelereBol(metin).map((c): CumleDenetimi => {
    const atiflar = atiflariAyristir(c.metin);
    const olgusal = olcut(c.metin);
    const sorunlar = atiflar.flatMap((a) => atifDogrula(a, kaynaklar));
    if (olgusal && !atiflar.length)
      sorunlar.unshift({ tur: "atif_yok", aciklama: "Olgusal cümle bir kanıta bağlanmamış." });
    return { ...c, olgusal, atiflar, sorunlar, gecti: sorunlar.every((s) => UYARI_TURLERI.has(s.tur)) };
  });
  return { cumleler, gecerli: cumleler.every((c) => c.gecti) };
}

/** Denetimi geçmeyen cümleleri [EKSİK: …] işaretiyle değiştirir. */
export function atifsizlariIsaretle(
  metin: string,
  kaynaklar: AtifKaynagi[],
  secenek: { olgusalMi?: (cumle: string) => boolean } = {},
): { metin: string; degisen: number } {
  const d = atifDenetle(metin, kaynaklar, secenek);
  let sonuc = "";
  let imlec = 0;
  let degisen = 0;
  for (const c of d.cumleler) {
    if (c.gecti) continue;
    const ozet = c.metin
      .replace(/\[[^\]]*\]/gu, "")
      .replace(/[\][]/gu, "")
      .replace(/\s+/gu, " ")
      .trim()
      .slice(0, 160);
    const neden = c.sorunlar.find((s) => !UYARI_TURLERI.has(s.tur))?.aciklama ?? "";
    sonuc += `${metin.slice(imlec, c.baslangic)}[EKSİK: kanıtla doğrulanamadı (${neden.replace(/\.$/u, "")}): ${ozet}]`;
    imlec = c.bitis;
    degisen++;
  }
  return { metin: sonuc + metin.slice(imlec), degisen };
}
