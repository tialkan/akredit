// Program tabloları sayfasının saf yardımcıları (İP-47): çerçeve seçimi, hücre ve kaynak metni, onay
// formundan karar girdileri. Örnek kip verisi kurgudur (ders kodları, adlar ve sayılar uydurma).

import type { Hucre, ProgramBolognaVerisi } from "@akredit/cerceveler";
import type { odrTablolari as T } from "@akredit/servis";

export const ILETILER: Record<string, string> = {
  kaydedildi: "Kararlarınız kaydedildi. Tablo güncellendi.",
  degisiklik: "Değişiklik yok. Kaydedilecek bir seçim yapmadınız.",
  dayanak: "Kararın dayanağını yazın (ör. kurul kararının tarihi ve sayısı).",
  yetki: "Bu programda eşleme onaylama yetkiniz yok. Program sorumlusuna ya da kalite birimine başvurun.",
  hata: "Kararlar kaydedilemedi. Sayfayı yenileyip yeniden deneyin.",
  ornek: "Örnek veri kipinde karar kaydedilmez.",
  oneri_istendi: "Öneri istendi. Hazır olunca eşlemelerde onaysız olarak görünür; sayfayı birazdan yenileyin.",
  oneri_ornek: "Örnek veri kipinde öneri istenmez.",
  oneri_hata: "Öneri istenemedi. Bologna verisinin aktarıldığından emin olun ve yeniden deneyin.",
  ozgu_kaydedildi: "Seçiminiz kaydedildi. Ölçüt ağacı seçtiğiniz bölümün konularıyla güncellendi.",
  ozgu_secim: "En az bir seçim yapın. Seçim yapılmazsa ilgili konular raporda EKSİK kalır.",
  ozgu_hata: "Seçim kaydedilemedi. Sayfayı yenileyip yeniden deneyin.",
};

/** Disiplin ya da program seçim formundaki seçili kodlar (yalnız listede olanlar, tekrarsız, sıralı). */
export function ozguSecimleri(f: FormData, gecerli: readonly string[]): string[] {
  const izinli = new Set(gecerli);
  return [...new Set(f.getAll("bolum").filter((x): x is string => typeof x === "string" && izinli.has(x)))].sort();
}

/** Ağaçtaki öğenin kaynağı: "Belge adı, s. 12". */
export function kaynakYeri(belge: string, sayfa: number | null): string {
  return sayfa === null ? belge : `${belge}, s. ${sayfa}`;
}

/** Düzey tanımı belgeden okunamayan gösterge için gösterilen metin; tanım uydurulmaz. */
export const OKUNAMADI = "Belgeden okunamadı";

/** Seçilen çerçeve; tanınmayan değer ilk çerçeveye düşer. */
export function cerceveSec(deger: unknown, cerceveler: readonly { kod: string }[]): string {
  const ilk = cerceveler[0]?.kod ?? "";
  return typeof deger === "string" && cerceveler.some((c) => c.kod === deger) ? deger : ilk;
}

/** Hücrenin görünen metni. EKSİK hücre "EKSİK" yazılır; boş hücre boş kalır. */
export function hucreMetni(h: Hucre): string {
  return h.tur === "deger" ? h.metin : h.tur === "eksik" ? "EKSİK" : "";
}

const ALANLAR: Record<string, string> = {
  kod: "ders kodu",
  ad: "ders adı",
  dil: "öğretim dili",
  tul: "T+U+L saatleri",
  akts: "AKTS",
  "kredi,akts": "kredi ve AKTS",
  zorunlu: "zorunlu ya da seçmeli",
};

/** Hücre kaynağının okunur adı: "bologna:MAT101#akts" → "Bologna, MAT101, AKTS". */
export function kaynakMetni(kaynak: string): string {
  return kaynak
    .split(";")
    .map((k) => {
      const [tur = "", geri = ""] = k.split(":");
      const [nesne = "", alan = ""] = geri.split("#");
      if (tur === "bologna") {
        if (nesne === "matris") return `Bologna ders-PÇ matrisi${alan ? `, ${alan}` : ""}`;
        if (nesne === "pc") return `Bologna program çıktısı ${alan}`;
        return `Bologna, ${nesne}${alan ? `, ${ALANLAR[alan] ?? alan}` : ""}`;
      }
      if (tur === "esleme") {
        if (nesne === "secmeli-yer") return `Kurum kararı: seçmeli yer sayısı (${alan}. yarıyıl)`;
        if (nesne === "pc-kurul") return `Kurum kararı: PÇ ile kurul çıktısı (${alan})`;
        return `Kurum kararı: ders eşlemesi (${alan})`;
      }
      if (tur === "hesap") return nesne === "sayim" ? "Hesap: sayım" : "Hesap: toplam";
      if (tur === "obs") return `Öğrenci bilgi sistemi, ${nesne}`;
      return k;
    })
    .join("; ");
}

export interface KaynakBaglantisi {
  metin: string;
  /** Tek tıkla gidilecek adres; kaynağı gösteren sayfa yoksa null (ör. hesap). */
  href: string | null;
}

/** Eşleme satırının sayfa içi çapası: hücre kaynağından karar satırına gidilir. */
export function eslemeCapasi(tur: "ders" | "pc" | "yer", anahtar: string): string {
  return `esleme-${tur}-${anahtar.replace(/[^0-9A-Za-z_-]/gu, "_")}`;
}

/**
 * Hücre kaynağından tek tık bağlantılar (İP-44): Bologna kaynağı programın Bologna okuma kanıtına, kurum
 * kararı aynı sayfadaki karar satırına (karar veren, zaman, dayanak) gider. Hesap kaynağı bağlantısızdır;
 * hesap girdileri aynı satırdaki öteki hücrelerdedir. Okuma kanıtı yoksa (örnek kip) bağlantı verilmez.
 */
export function kaynakBaglantilari(kaynak: string, kanitId: string | null): KaynakBaglantisi[] {
  return kaynak.split(";").map((k) => {
    const metin = kaynakMetni(k);
    const [tur = "", geri = ""] = k.split(":");
    const [nesne = "", alan = ""] = geri.split("#");
    if (tur === "bologna") return { metin, href: kanitId ? `/panel/kanitlar/${kanitId}` : null };
    if (tur === "esleme") {
      if (nesne === "secmeli-yer") return { metin, href: `#${eslemeCapasi("yer", alan)}` };
      if (nesne === "pc-kurul") return { metin, href: `#${eslemeCapasi("pc", alan.split("/")[0] ?? "")}` };
      return { metin, href: `#${eslemeCapasi("ders", alan)}` };
    }
    return { metin, href: null };
  });
}

/** Öneri gerekçesinin kaynakları, okunur ve bağlantılı. */
export function oneriKaynaklari(g: T.OneriGerekcesi, ornek: boolean): KaynakBaglantisi[] {
  return g.kaynaklar.map((k) => {
    const href = !ornek && k.kanitId ? `/panel/kanitlar/${k.kanitId}` : null;
    if (k.tur === "bologna") return { metin: `Bologna okuması, ${k.anahtar}`, href };
    if (k.tur === "pc") return { metin: `Program çıktısı ${k.anahtar} metni`, href };
    return { metin: `Kurul çıktısı ${k.anahtar} metni`, href: null };
  });
}

/** Onay formunda ders seçiminin ön değeri: karar yoksa öneri, yoksa boş ("Değiştirme"). */
export function dersOnDegeri(s: T.EslemeSatiri): string {
  if (s.karar) return "";
  return typeof s.oneri?.deger === "string" ? s.oneri.deger : "";
}

/** PÇ satırında işaretli kurul çıktıları: karar varsa karar, yoksa öneri. */
export function pcOnDegeri(s: T.EslemeSatiri): string[] {
  const d = s.karar?.deger ?? s.oneri?.deger;
  return Array.isArray(d) ? d : [];
}

export interface KararIstegi {
  tur: T.EslemeTuru;
  anahtar: string;
  deger: string | string[] | number;
}

/**
 * Onay formundan gönderilecek kararlar. Yalnız kişinin seçtiği ve mevcut karardan farklı olan satırlar:
 * ders için boş olmayan seçim, PÇ için "onayla" kutusu işaretli satır, seçmeli yer için boş olmayan sayı.
 * Öneri kendiliğinden karar olmaz.
 */
export function kararIstekleri(f: FormData, d: T.ProgramTablolari): KararIstegi[] {
  const sonuc: KararIstegi[] = [];
  for (const s of d.eslemeler.dersler) {
    const v = f.get(`ders:${s.anahtar}`);
    if (typeof v !== "string" || !v || v === s.karar?.deger) continue;
    // Öneriyle ön doldurulmuş seçim, satırın onay kutusu işaretlenmeden karar olmaz.
    if (v === dersOnDegeri(s) && f.get(`ders-onay:${s.anahtar}`) !== "1") continue;
    sonuc.push({ tur: "ders_kategorisi", anahtar: s.anahtar, deger: v });
  }
  for (const s of d.eslemeler.pcKurul) {
    if (f.get(`pc-onay:${s.anahtar}`) !== "1") continue;
    const kodlar = f
      .getAll(`pc:${s.anahtar}`)
      .filter((x): x is string => typeof x === "string")
      .sort();
    sonuc.push({ tur: "pc_kurul", anahtar: s.anahtar, deger: kodlar });
  }
  for (const s of d.eslemeler.secmeliYer) {
    const v = f.get(`yer:${s.anahtar}`);
    if (typeof v !== "string" || v.trim() === "") continue;
    const n = Number(v);
    if (n !== s.karar?.deger) sonuc.push({ tur: "secmeli_yer", anahtar: s.anahtar, deger: n });
  }
  return sonuc;
}

/** Karar özeti: "Ad Soyad, 30.10.2026, dayanak". */
export function kararOzeti(k: T.EslemeKarari): string {
  const tarih = new Date(k.zaman).toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" });
  return `${k.kararVeren}, ${tarih}. Dayanak: ${k.dayanak}`;
}

export function degerMetni(d: string | string[] | number, etiketler: Map<string, string> = new Map()): string {
  if (Array.isArray(d)) return d.length ? d.map((k) => etiketler.get(k) ?? k).join(", ") : "Hiçbiri";
  return String(d);
}

// ---------------------------------------------------------------------------------------------------------
// Örnek kip

const ornekDers = (kod: string, ad: string, yariyil: number, akts: number, zorunlu = true) => ({
  kod,
  ad,
  yariyil,
  tul: "3+0+0",
  kredi: 3,
  akts,
  zorunlu,
  bos: false,
  bilgiler: { "Dersin Dili": "Türkçe" },
});

/** Kurgu Bologna okuması: iki yarıyıl, bir seçmeli. */
export const ORNEK_BOLOGNA: ProgramBolognaVerisi = {
  adres: "https://bologna.ornek.edu.tr/program",
  okundu: "2026-10-01T08:00:00Z",
  programCiktilari: [
    { kod: "P1", metin: "Alan bilgisini problem çözmede kullanır." },
    { kod: "P2", metin: "Takım içinde etkin çalışır." },
  ],
  matris: {
    pkodlar: ["P1", "P2"],
    dersler: [
      { kod: "ORN101", ad: "Örnek Matematik", grupBasligi: false, degerler: { P1: "5", P2: "-" } },
      { kod: "ORN102", ad: "Örnek Fizik", grupBasligi: false, degerler: { P1: "4", P2: "2" } },
      { kod: "ORN201", ad: "Örnek Tasarım", grupBasligi: false, degerler: { P1: "3", P2: "" } },
    ],
  },
  dersler: [
    ornekDers("ORN101", "Örnek Matematik", 1, 6),
    ornekDers("ORN102", "Örnek Fizik", 1, 5),
    ornekDers("ORN201", "Örnek Tasarım", 2, 4, false),
  ],
};

/** Kurgu kararlar: bir ders eşlemesi; öteki dersler EKSİK kalır, birinde YZ önerisi bekler. */
export function ornekKayitlari(dersKodlari: readonly string[], ozguBolum?: string): T.EslemeKaydi[] {
  const zaman = new Date("2026-10-02T09:00:00Z");
  const ilk = dersKodlari[0];
  if (!ilk) return [];
  const kayitlar: T.EslemeKaydi[] = [
    {
      tur: "ders_kategorisi",
      anahtar: "ORN101",
      deger: ilk,
      durum: "karar",
      uretici: "kisi",
      kararVeren: "Örnek Program Sorumlusu",
      dayanak: "Örnek bölüm kurulu kararı",
      zaman,
    },
    {
      tur: "ders_kategorisi",
      anahtar: "ORN102",
      deger: ilk,
      durum: "oneri",
      uretici: "yz",
      kararVeren: null,
      dayanak: null,
      zaman,
      gerekce: {
        metin: "Örnek gerekçe: dersin amacı temel bilim konularını işler.",
        kaynaklar: [{ tur: "bologna", anahtar: "ORN102" }],
      },
    },
  ];
  if (ozguBolum)
    kayitlar.push({
      tur: "ozgu_bolum",
      anahtar: "bolum",
      deger: [ozguBolum],
      durum: "karar",
      uretici: "kisi",
      kararVeren: "Örnek Program Sorumlusu",
      dayanak: "Örnek bölüm kurulu kararı",
      zaman,
    });
  return kayitlar;
}
