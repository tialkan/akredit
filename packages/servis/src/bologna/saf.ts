// Bologna otomasyonunun saf parçaları (İP-15): okumanın atıf parçalarına çevrilmesi, ders adıyla tutarlılık ve
// kopya içerik uyarıları, taslak farkı (hangi alan neden değişti), OBS yazma planı ve kopyalanabilir çıktı.
// IO yoktur; zaman ve kimlik parametreyle gelir.

import {
  type BolognaOkunanDers,
  type BolognaTaslagi,
  type BolognaVerisi,
  type Bulgu,
  kanonikJson,
  okunamadiMi,
  taslakDenetle,
} from "@akredit/cekirdek";

// ---------- Okuma → atıf parçaları ----------

/** Kişi bilgisi taşıyan Bologna alanları modele gönderilmez (en az kişisel veri). */
const KISI_ALANI = /koordinat|veren|yardımcı|yardimci|asistan|e-?posta|avesis|öğretim eleman|ogretim eleman/iu;

export function bolumAdi(metin: string): string {
  return (
    metin
      .toLocaleLowerCase("tr")
      .replace(/ı/gu, "i")
      .replace(/ğ/gu, "g")
      .replace(/ü/gu, "u")
      .replace(/ş/gu, "s")
      .replace(/ö/gu, "o")
      .replace(/ç/gu, "c")
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/gu, "-")
      .replace(/^-|-$/gu, "") || "alan"
  );
}

export interface OkumaParcasi {
  capa: { bolum: string };
  metin: string;
}

/** Dersin okumadaki atıf parçaları: bilgi alanları, çıktılar, iş yükü ve değerlendirme. */
export function dersParcalari(d: BolognaOkunanDers): OkumaParcasi[] {
  const p: OkumaParcasi[] = [];
  const ekle = (alan: string, metin: string) => {
    if (metin.trim()) p.push({ capa: { bolum: `${d.kod}.${alan}` }, metin: metin.trim() });
  };
  ekle("kunye", `${d.kod} ${d.ad ?? ""} · ${d.akts ?? "?"} AKTS · ${d.tul ?? ""}`);
  for (const [k, v] of Object.entries(d.bilgiler)) if (!KISI_ALANI.test(k)) ekle(bolumAdi(k), `${k}: ${v}`);
  ekle("ciktilar", d.ciktilar.map((c) => `${c.kod}: ${c.metin}`).join("\n"));
  ekle("isyuku", d.isyuku.map((x) => `${x.ad}: ${x.sayi ?? "-"} × ${x.sure ?? "-"}`).join("\n"));
  ekle("degerlendirme", d.degerlendirme.map((x) => `${x.ad}: %${x.katki ?? "-"}`).join("\n"));
  return p;
}

/** Bütün okumanın parçaları: program çıktıları ve okunan her ders. */
export function okumaParcalari(v: BolognaVerisi): OkumaParcasi[] {
  return [
    ...v.programCiktilari.map((c) => ({ capa: { bolum: `program.${c.kod}` }, metin: `${c.kod}: ${c.metin}` })),
    ...v.dersler.flatMap((d) => (okunamadiMi(d) ? [] : dersParcalari(d))),
  ];
}

export function okunanDers(v: BolognaVerisi, kod: string): BolognaOkunanDers | null {
  const d = v.dersler.find((x) => x.kod === kod);
  return d && !okunamadiMi(d) ? d : null;
}

// ---------- K1 ve K11: ders adıyla tutarlılık, kopya içerik ----------

const DOLGU = new Set(["giris", "ve", "ile", "icin", "temel", "ileri", "genel", "uygulama", "uygulamalari", "ders"]);

function kokler(metin: string): string[] {
  return bolumAdi(metin)
    .split("-")
    .filter((k) => k.length >= 4 && !DOLGU.has(k))
    .map((k) => k.slice(0, 5));
}

function kelimeKumesi(metin: string): Set<string> {
  return new Set(kokler(metin));
}

/** İki metnin kelime kökü benzerliği (Jaccard, 0-1). */
export function benzerlik(a: string, b: string): number {
  const x = kelimeKumesi(a);
  const y = kelimeKumesi(b);
  if (!x.size || !y.size) return 0;
  let ortak = 0;
  for (const k of x) if (y.has(k)) ortak++;
  return ortak / (x.size + y.size - ortak);
}

function cumleler(metin: string): string[] {
  return metin
    .split(/(?<=[.!?])\s+/u)
    .map((c) => c.trim().toLocaleLowerCase("tr"))
    .filter((c) => c.split(/\s+/u).length >= 6);
}

export interface KarsiDers {
  kod: string;
  ad: string;
  /** Amaç + içerik metni. */
  metin: string;
  yontem?: string;
  notlar?: string;
}

/** Kurumdaki diğer derslerin okumadaki metinleri (kopya denetimi için). */
export function karsiDersler(v: BolognaVerisi, haric: string): KarsiDers[] {
  return v.dersler.flatMap((d) => {
    if (okunamadiMi(d) || d.kod === haric) return [];
    const bul = (re: RegExp) => Object.entries(d.bilgiler).find(([k]) => re.test(bolumAdi(k)))?.[1] ?? "";
    return [
      {
        kod: d.kod,
        ad: d.ad ?? d.kod,
        metin: `${bul(/amac/u)} ${bul(/icerik/u)}`.trim(),
        yontem: bul(/yontem/u),
        notlar: bul(/not/u),
      },
    ];
  });
}

export const KOPYA_ESIGI = 0.6;

/**
 * Ders adıyla tutarsız ya da başka dersten kopya içerik uyarıları. Doğrulayıcı kopyayı kesin yakalayamaz; bu
 * yüzden uyarıdır ve hoca onayında gösterilir.
 */
export function tutarlilikDenetle(t: BolognaTaslagi, digerleri: KarsiDers[]): Bulgu[] {
  const bulgular: Bulgu[] = [];
  const ad = new Set(kokler(t.ad));
  const govde = [t.amac.tr, t.icerik.tr, ...t.ciktilar.map((c) => c.tr)].join(" ");
  const govdeKokleri = new Set(kokler(govde));
  // Ad kavramlarının en az dörtte üçü gövdede geçmeli ("Veri Tabanı"nda yalnız "veri" geçmesi yetmez).
  const gecen = [...ad].filter((k) => govdeKokleri.has(k)).length;
  if (ad.size && gecen / ad.size < 0.75)
    bulgular.push({
      duzey: "uyari",
      kural: "K1",
      konu: t.kod,
      aciklama: `Amaç, içerik ve çıktılarda ders adındaki ("${t.ad}") kavramlar yeterince geçmiyor. İçerik başka bir dersten kopya olabilir; baştan yazın.`,
    });
  const metin = `${t.amac.tr} ${t.icerik.tr}`;
  for (const d of digerleri) {
    if (d.metin && benzerlik(metin, d.metin) >= KOPYA_ESIGI)
      bulgular.push({
        duzey: "uyari",
        kural: "K1",
        konu: t.kod,
        aciklama: `Amaç ve içerik ${d.kod} ${d.ad} dersiyle büyük ölçüde aynı. Ders adına uygun yeniden yazın.`,
      });
    const ortak = [t.yontem.tr, t.notlar.tr]
      .flatMap(cumleler)
      .filter((c) => [d.yontem ?? "", d.notlar ?? ""].flatMap(cumleler).includes(c));
    if (ortak.length)
      bulgular.push({
        duzey: "uyari",
        kural: "K11",
        konu: t.kod,
        aciklama: `Yöntem ya da notlarda ${d.kod} dersiyle birebir aynı ${ortak.length} cümle var.`,
      });
  }
  return bulgular;
}

/** Taslağın tam denetimi: K1-K12 (çekirdek) + tutarlılık ve kopya uyarıları. */
export function tamDenetim(t: BolognaTaslagi, digerleri: KarsiDers[] = []) {
  const d = taslakDenetle(t);
  const bulgular = [...d.bulgular, ...tutarlilikDenetle(t, digerleri)];
  return {
    bulgular,
    hata: bulgular.filter((b) => b.duzey === "hata").length,
    uyari: bulgular.filter((b) => b.duzey !== "hata").length,
    isToplam: d.isToplam,
    hedef: d.hedef,
  };
}

// ---------- Program denetimi: önce / sonra ----------

export interface DersBulguSayisi {
  kod: string;
  hata: number;
  uyari: number;
}

export function dersBazinda(bulgular: Bulgu[], kodlar: string[]): DersBulguSayisi[] {
  return kodlar.map((kod) => {
    const b = bulgular.filter((x) => x.konu === kod);
    return { kod, hata: b.filter((x) => x.duzey === "hata").length, uyari: b.filter((x) => x.duzey !== "hata").length };
  });
}

export interface Karsilastirma {
  kod: string;
  once: { hata: number; uyari: number } | null;
  sonra: { hata: number; uyari: number };
  degisim: "iyilesti" | "kotulesti" | "ayni" | "yeni";
}

/** İki okumanın ders ders bulgu sayısı karşılaştırması. */
export function onceSonra(once: DersBulguSayisi[] | null, sonra: DersBulguSayisi[]): Karsilastirma[] {
  return sonra.map((s) => {
    const o = once?.find((x) => x.kod === s.kod) ?? null;
    const puan = (x: { hata: number; uyari: number }) => x.hata * 1000 + x.uyari;
    const degisim = !o ? "yeni" : puan(s) < puan(o) ? "iyilesti" : puan(s) > puan(o) ? "kotulesti" : "ayni";
    return {
      kod: s.kod,
      once: o ? { hata: o.hata, uyari: o.uyari } : null,
      sonra: { hata: s.hata, uyari: s.uyari },
      degisim,
    };
  });
}

// ---------- Taslak geçmişi: hangi alan neden değişti ----------

/** Taslak alanı → onu ilgilendiren kurallar (değişikliğin nedeni). */
const ALAN_KURALLARI: Record<string, string[]> = {
  amac: ["K1", "K2", "K3", "Türkçe"],
  icerik: ["K1", "K2", "K3", "Türkçe"],
  yontem: ["K2", "K3", "K11", "Türkçe"],
  notlar: ["K3", "K11", "Türkçe"],
  degerlendirme: ["Değerlendirme"],
  isyuku: ["K8"],
  dersYapisi: ["K6"],
  ciktilar: ["K1", "K4", "K5", "Türkçe"],
  haftalar: ["K9", "Ders akışı", "Türkçe"],
  kaynaklar: ["Kaynaklar"],
  katki: ["K12"],
  ska: ["K7"],
  yetkililer: ["K10"],
};

export interface AlanDegisikligi {
  alan: string;
  /** Önceki taslakta bu alanı ilgilendiren bulgular; yoksa hoca beyanı ya da yeniden üretim. */
  neden: string[];
}

export function taslakFarki(eski: BolognaTaslagi | null, yeni: BolognaTaslagi): AlanDegisikligi[] {
  const eskiBulgular = eski ? taslakDenetle(eski).bulgular : [];
  return Object.keys(ALAN_KURALLARI).flatMap((alan) => {
    const a = eski ? kanonikJson((eski as unknown as Record<string, unknown>)[alan] ?? null) : undefined;
    const b = kanonikJson((yeni as unknown as Record<string, unknown>)[alan] ?? null);
    if (a === b) return [];
    const kurallar = ALAN_KURALLARI[alan] ?? [];
    const neden = eskiBulgular.filter((x) => kurallar.includes(x.kural)).map((x) => `${x.kural}: ${x.aciklama}`);
    return [{ alan, neden: neden.length ? neden : [eski ? "Hoca beyanı ya da yeniden üretim." : "İlk taslak."] }];
  });
}

// ---------- OBS yazma planı ----------

export interface YazmaAlani {
  /** OBS ekranındaki sekme. */
  sekme: string;
  /** Alan adı (OBS'deki etiket). */
  alan: string;
  deger: string;
  /** Değerin dayanağı: onaylı taslak önerisi. */
  kaynak: string;
}

/** Giriş bilgisi alanları: plana hiçbir koşulda giremez (değişmez ilke 8). */
export const GIRIS_ALANI =
  /parola|şifre|sifre|password|passwd|pass\b|pwd|doğrulama kodu|dogrulama kodu|otp|captcha|token|belirteç|cerez|çerez|cookie|oturum/iu;

export class GirisAlaniHatasi extends Error {}

export function girisAlaniVarMi(alanlar: readonly Pick<YazmaAlani, "alan" | "sekme">[]): string[] {
  return alanlar.filter((a) => GIRIS_ALANI.test(a.alan) || GIRIS_ALANI.test(a.sekme)).map((a) => a.alan);
}

/** Onaylı taslaktan sekme sekme OBS yazma planı. */
export function yazmaPlaniKur(t: BolognaTaslagi, kaynak: string): YazmaAlani[] {
  const p: YazmaAlani[] = [];
  const ekle = (sekme: string, alan: string, deger: string) => p.push({ sekme, alan, deger, kaynak });
  ekle("Genel", "Dersin Amacı", t.amac.tr);
  ekle("Genel", "Dersin Amacı (İngilizce)", t.amac.en);
  ekle("Genel", "Dersin İçeriği", t.icerik.tr);
  ekle("Genel", "Dersin İçeriği (İngilizce)", t.icerik.en);
  ekle("Genel", "Öğretim Yöntem ve Teknikleri", t.yontem.tr);
  ekle("Genel", "Öğretim Yöntem ve Teknikleri (İngilizce)", t.yontem.en);
  ekle("Genel", "Ders Notları", t.notlar.tr);
  ekle("Genel", "Ders Notları (İngilizce)", t.notlar.en);
  ekle("Genel", "Ön Koşul", t.onKosul ?? "Yok");
  for (const [i, k] of t.kaynaklar.entries())
    ekle("Kaynaklar", `Kaynak ${i + 1}`, [k.yazar, k.eser, k.yayinevi, k.yil].filter(Boolean).join(", "));
  for (const c of t.ciktilar) {
    ekle("Öğrenme Çıktıları", `${c.kod}`, c.tr);
    ekle("Öğrenme Çıktıları", `${c.kod} (İngilizce)`, c.en);
    ekle("Öğrenme Çıktıları", `${c.kod} Türü`, c.tur);
  }
  for (const h of t.haftalar) {
    ekle("Ders Akışı", `${h.hafta}. Hafta Konu`, h.konu.tr);
    ekle("Ders Akışı", `${h.hafta}. Hafta Konu (İngilizce)`, h.konu.en);
    ekle("Ders Akışı", `${h.hafta}. Hafta Ön Hazırlık`, h.onHazirlik);
    ekle("Ders Akışı", `${h.hafta}. Hafta Dokümanlar`, h.dokuman);
  }
  for (const d of t.degerlendirme) ekle("Değerlendirme", d.ad, `${d.sayi} adet, %${d.katki}`);
  for (const x of t.isyuku) ekle("İş Yükü", x.ad, `${x.sayi} × ${x.sure} saat`);
  for (const y of t.dersYapisi) ekle("Ders Yapısı", y.alan, `%${y.yuzde}`);
  for (const [o, satir] of Object.entries(t.katki))
    for (const [pc, v] of Object.entries(satir)) ekle("Katkı Matrisi", `${o}/${pc}`, v === null ? "" : String(v));
  ekle("Genel", "Sürdürülebilir Kalkınma Amaçları", t.ska.join(", "));
  for (const y of t.yetkililer) ekle("Yetkililer", y.rol, `${y.ad} <${y.eposta}>`);
  const giris = girisAlaniVarMi(p);
  if (giris.length) throw new GirisAlaniHatasi(`Plana giriş bilgisi alanı giremez: ${giris.join(", ")}.`);
  return p;
}

/** Elle aktarım için alan alan, kopyalanabilir düz metin. */
export function kopyalanabilirCikti(kod: string, alanlar: YazmaAlani[]): string {
  const satirlar = [`${kod} ders bilgi paketi: OBS'ye alan alan aktarım`, ""];
  let sekme = "";
  for (const a of alanlar) {
    if (a.sekme !== sekme) {
      sekme = a.sekme;
      satirlar.push(`## ${sekme}`, "");
    }
    satirlar.push(`### ${a.alan}`, a.deger, "");
  }
  satirlar.push("Her sekmeden sonra Kaydet'e siz basın ve kaydın başarıyla düzeltildiğini görün.");
  return satirlar.join("\n");
}
