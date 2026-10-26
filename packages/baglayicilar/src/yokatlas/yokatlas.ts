// YÖK Atlas program istatistikleri: kontenjan, yerleşen, doluluk, taban puan ve başarı sırası.
// Program sayfası panelleri ayrı parçalardan yüklenir; parça yolu ve satır etiketleri canlı sayfadan
// doğrulanamadı (bulut ortamında ağ kapalı). DOĞRULANMADI: ilk canlı okumada `PARCA_YOLU` ve etiketler denetlenmeli.
// Doluluk oranı sayfadan alınmaz, yerleşen / kontenjan olarak burada hesaplanır.

import { z } from "zod";
import type { DisBaglam, Kaynak } from "../baglayici.ts";
import { tablolar } from "../bologna-proliz/ayristir.ts";
import { BaglayiciHatasi, istek, type KullanimKosulu, sinirlayici } from "../avesis/istek.ts";

export const YOKATLAS_KOSULU: KullanimKosulu = {
  kaynak: "YÖK Atlas (Yükseköğretim Kurulu)",
  durum: "DOĞRULANMADI",
  not: "Herkese açık program istatistikleri okunur; toplu indirme yapılmaz. Sitenin kullanım koşulları ve otomatik erişim izni DOĞRULANMADI; kurum yöneticisi onaylamadan açılmamalı.",
  enAzAralikMs: 2000,
};

export const YOKATLAS_TABAN = "https://yokatlas.yok.gov.tr";
/** Genel bilgiler panelinin parça yolu. DOĞRULANMADI. */
export const PARCA_YOLU = (tur: "lisans" | "onlisans", kod: string) =>
  `${YOKATLAS_TABAN}/content/${tur}-dynamic/${tur === "lisans" ? "1000_1" : "3000_1"}.php?y=${kod}`;

export const ProgramIstatistigiSemasi = z.object({
  programKodu: z.string().regex(/^\d{9}$/),
  yil: z.number().int().nullable(),
  kontenjan: z.number().int().nonnegative().nullable(),
  yerlesen: z.number().int().nonnegative().nullable(),
  bosKalan: z.number().int().nonnegative().nullable(),
  tabanPuan: z.number().nullable(),
  basariSirasi: z.number().int().nullable(),
  /** yerleşen / kontenjan, 4 basamağa yuvarlı; hesaplanamazsa null. */
  doluluk: z.number().min(0).nullable(),
  /** Tanınmayan satırlar (etiket → ham değer); yapı değişikliğini fark etmek için. */
  tanimsiz: z.record(z.string(), z.string()),
});
export type ProgramIstatistigi = z.infer<typeof ProgramIstatistigiSemasi>;

/** Türkçe biçimli tamsayı ("1.234" → 1234). Sayı değilse ("---", "Dolmadı") null. */
export function tamsayi(s: string): number | null {
  const t = s.replace(/\s/g, "");
  if (!/^\d{1,3}(\.\d{3})*$|^\d+$/.test(t)) return null;
  return Number(t.replace(/\./g, ""));
}

/** Türkçe ondalık ("312,45678" → 312.45678). */
export function ondalik(s: string): number | null {
  const t = s.replace(/\s/g, "");
  if (!/^\d+(,\d+)?$/.test(t)) return null;
  return Number(t.replace(",", "."));
}

const ETIKETLER: [RegExp, "kontenjan" | "yerlesen" | "bosKalan" | "tabanPuan" | "basariSirasi"][] = [
  [/^toplam kontenjan$|^kontenjan$/i, "kontenjan"],
  [/toplam yerle[sş]en|^yerle[sş]en$/i, "yerlesen"],
  [/bo[sş] kalan/i, "bosKalan"],
  [/taban puan|en k[üu][çc][üu]k puan|son ki[sş]inin puan/i, "tabanPuan"],
  [/ba[sş]ar[ıi] s[ıi]ras[ıi]/i, "basariSirasi"],
];

/** Genel bilgiler panelinin HTML'ini ayrıştırır. İki sütunlu (etiket, değer) satırları okur. */
export function programIstatistigiCoz(html: string, programKodu: string): ProgramIstatistigi {
  const sonuc: ProgramIstatistigi = {
    programKodu,
    yil: null,
    kontenjan: null,
    yerlesen: null,
    bosKalan: null,
    tabanPuan: null,
    basariSirasi: null,
    doluluk: null,
    tanimsiz: {},
  };
  const yilM = html.match(/\b(20\d{2})\s*(?:yılı|yili|YKS)/i);
  if (yilM) sonuc.yil = Number(yilM[1]);
  let satirSayisi = 0;
  for (const t of tablolar(html)) {
    for (const satir of t) {
      if (satir.length < 2) continue;
      const etiket = (satir[0] ?? "").replace(/[*:]+$/g, "").trim();
      const deger = (satir[satir.length - 1] ?? "").trim();
      if (!etiket) continue;
      satirSayisi++;
      const alan = ETIKETLER.find(([re]) => re.test(etiket))?.[1];
      if (!alan) {
        sonuc.tanimsiz[etiket] = deger;
        continue;
      }
      if (sonuc[alan] !== null) continue; // ilk eşleşen satır geçerlidir (ör. "Genel Kontenjan")
      sonuc[alan] = alan === "tabanPuan" ? ondalik(deger) : tamsayi(deger);
    }
  }
  if (!satirSayisi) throw new BaglayiciHatasi("YÖK Atlas sayfasında istatistik tablosu bulunamadı; sayfa yapısı değişmiş olabilir.");
  if (sonuc.kontenjan && sonuc.yerlesen !== null)
    sonuc.doluluk = Math.round((sonuc.yerlesen / sonuc.kontenjan) * 10_000) / 10_000;
  return ProgramIstatistigiSemasi.parse(sonuc);
}

/** Programların istatistiklerini sırayla, en az 2 sn aralıkla okur. */
export async function programIstatistikleriniOku(
  kodlar: string[],
  baglam: DisBaglam,
  secenek: { tur?: "lisans" | "onlisans"; aralikMs?: number } = {},
): Promise<{ programlar: ProgramIstatistigi[]; kaynaklar: Kaynak[]; hatalar: { programKodu: string; ileti: string }[] }> {
  const sinir = sinirlayici(baglam, Math.max(secenek.aralikMs ?? 0, YOKATLAS_KOSULU.enAzAralikMs));
  const programlar: ProgramIstatistigi[] = [];
  const kaynaklar: Kaynak[] = [];
  const hatalar: { programKodu: string; ileti: string }[] = [];
  for (const kod of kodlar) {
    if (!/^\d{9}$/.test(kod)) {
      hatalar.push({ programKodu: kod, ileti: "Program kodu 9 haneli olmalı." });
      continue;
    }
    const adres = PARCA_YOLU(secenek.tur ?? "lisans", kod);
    try {
      const y = await istek(baglam, sinir, adres);
      programlar.push(programIstatistigiCoz(await y.text(), kod));
      kaynaklar.push({ adres, okunma: baglam.simdi().toISOString(), aciklama: "YÖK Atlas genel bilgiler" });
    } catch (e) {
      hatalar.push({ programKodu: kod, ileti: e instanceof BaglayiciHatasi ? e.message : "Okunamadı." });
    }
  }
  return { programlar, kaynaklar, hatalar };
}
