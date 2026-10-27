// `/api/v1` uçlarının tek tanımı. İşleyici ve OpenAPI belgesi bu listeden üretilir; bir uç eklemek için
// yalnız buraya satır eklenir.

import type { Eylem } from "@akredit/yetki";
import { z } from "zod";
import * as akademik from "../akademik.ts";
import type { ServisBaglami } from "../baglam.ts";
import * as kanit from "../kanit.ts";
import * as onay from "../onay/index.ts";
import * as oneri from "../oneri.ts";
import * as panel from "../panel.ts";
import * as politika from "../politika.ts";
import * as rapor from "../rapor.ts";
import * as s from "../semalar.ts";

export type Yontem = "GET" | "POST" | "PATCH";

export interface Uc {
  ad: string;
  yontem: Yontem;
  /** `{id}` biçiminde yol parametreli, `/api/v1` önekisiz yol. */
  yol: string;
  ozet: string;
  /** Denetlenen yetki (belge için; denetimi servis yapar). */
  eylem: Eylem | "oturum";
  sorgu?: z.ZodType;
  govde?: z.ZodType;
  cikti: z.ZodType;
  basariDurumu?: 200 | 201;
  /** Durum değiştiren uçlar `Idempotency-Key` başlığını kabul eder. */
  isle: (b: ServisBaglami, g: { yol: Record<string, string>; sorgu: unknown; govde: unknown }) => Promise<unknown>;
}

const Bos = z.object({}).strict();

export const UCLAR: Uc[] = [
  {
    ad: "ben",
    yontem: "GET",
    yol: "/ben",
    ozet: "Oturumdaki kişi",
    eylem: "oturum",
    cikti: s.Kullanici,
    isle: (b) => panel.kullanici(b),
  },
  {
    ad: "panelOzeti",
    yontem: "GET",
    yol: "/panel",
    ozet: "Panel özeti: bekleyen öneriler, yaklaşan görevler, ölçüt kapsaması, karar sayısı",
    eylem: "oneri.oku",
    cikti: s.PanelOzeti,
    isle: (b) => panel.panelOzeti(b),
  },
  {
    ad: "kanitlar",
    yontem: "GET",
    yol: "/kanitlar",
    ozet: "Kanıt listesi (süzgeç ve sayfalama)",
    eylem: "kanit.oku",
    sorgu: s.KanitFiltresi,
    cikti: s.sayfaSemasi(s.KanitGorunumu),
    isle: (b, g) => kanit.kanitlar(b, g.sorgu as z.input<typeof s.KanitFiltresi>),
  },
  {
    ad: "kanit",
    yontem: "GET",
    yol: "/kanitlar/{id}",
    ozet: "Kanıt ve parçaları",
    eylem: "kanit.oku",
    cikti: s.KanitAyrintisi,
    isle: (b, g) => kanit.kanit(b, g.yol.id as string),
  },
  {
    ad: "kanitHatti",
    yontem: "GET",
    yol: "/kanit-hatti",
    ozet: "Kanıt hattı iş durumu sayaçları",
    eylem: "kanit.oku",
    cikti: s.KanitHattiOzeti,
    isle: (b) => kanit.kanitHattiOzeti(b),
  },
  {
    ad: "bekleyenOneriler",
    yontem: "GET",
    yol: "/oneriler",
    ozet: "Karar bekleyen öneriler",
    eylem: "oneri.oku",
    sorgu: s.SayfaGirdisi,
    cikti: s.sayfaSemasi(s.OneriGorunumu),
    isle: (b, g) => oneri.bekleyenOneriler(b, g.sorgu as s.SayfaGirdisi),
  },
  {
    ad: "bekleyenSayisi",
    yontem: "GET",
    yol: "/oneriler/sayac",
    ozet: "Karar bekleyen öneri sayısı (etkin riske göre)",
    eylem: "oneri.oku",
    cikti: z.object({
      toplam: z.number(),
      risk: z.object({ dusuk: z.number(), orta: z.number(), yuksek: z.number() }),
    }),
    isle: (b) => onay.bekleyenSayisi(b),
  },
  {
    ad: "insanDakikasi",
    yontem: "GET",
    yol: "/olcum/insan-dakikasi",
    ozet: "İnsan dakikası ve karar oranları (kişi ve süreç bazında; pilot raporu için)",
    eylem: "gunluk.oku",
    sorgu: onay.OlcumGirdisi,
    cikti: onay.OlcumRaporu,
    isle: (b, g) => onay.insanDakikasiRaporu(b, g.sorgu),
  },
  {
    ad: "kararlar",
    yontem: "GET",
    yol: "/kararlar",
    ozet: "Verilmiş kararlar",
    eylem: "oneri.oku",
    sorgu: s.SayfaGirdisi,
    cikti: s.sayfaSemasi(s.Karar),
    isle: (b, g) => oneri.kararlar(b, g.sorgu as s.SayfaGirdisi),
  },
  {
    ad: "kararVer",
    yontem: "POST",
    yol: "/kararlar",
    ozet: "Öneriye karar ver (onay, düzeltme, ret). Yalnız oturumla; API anahtarıyla verilemez.",
    eylem: "karar.ver",
    govde: s.KararGirdisi,
    cikti: s.Karar,
    basariDurumu: 201,
    isle: (b, g) => oneri.kararVer(b, g.govde),
  },
  {
    ad: "topluKararVer",
    yontem: "POST",
    yol: "/kararlar/toplu",
    ozet: "Toplu onay. Seçimde yüksek riskli öneri varsa hiçbiri onaylanmaz.",
    eylem: "karar.ver",
    govde: s.TopluKararGirdisi,
    cikti: z.array(s.Karar),
    basariDurumu: 201,
    isle: (b, g) => oneri.topluKararVer(b, g.govde),
  },
  {
    ad: "programlar",
    yontem: "GET",
    yol: "/programlar",
    ozet: "Programlar, çıktılar ve matris",
    eylem: "olcme.oku",
    cikti: z.array(s.Program),
    isle: (b) => akademik.programlar(b),
  },
  {
    ad: "program",
    yontem: "GET",
    yol: "/programlar/{id}",
    ozet: "Tek program",
    eylem: "olcme.oku",
    cikti: s.Program,
    isle: (b, g) => akademik.program(b, g.yol.id as string),
  },
  {
    ad: "dersler",
    yontem: "GET",
    yol: "/dersler",
    ozet: "Dersler",
    eylem: "olcme.oku",
    cikti: z.array(s.Ders),
    isle: (b) => akademik.dersler(b),
  },
  {
    ad: "ders",
    yontem: "GET",
    yol: "/dersler/{id}",
    ozet: "Tek ders",
    eylem: "olcme.oku",
    cikti: s.Ders,
    isle: (b, g) => akademik.ders(b, g.yol.id as string),
  },
  {
    ad: "raporlar",
    yontem: "GET",
    yol: "/raporlar",
    ozet: "Raporlar",
    eylem: "rapor.oku",
    cikti: z.array(s.Rapor),
    isle: (b) => rapor.raporlar(b),
  },
  {
    ad: "rapor",
    yontem: "GET",
    yol: "/raporlar/{id}",
    ozet: "Tek rapor (geçerli bölüm sürümleri)",
    eylem: "rapor.oku",
    cikti: s.Rapor,
    isle: (b, g) => rapor.rapor(b, g.yol.id as string),
  },
  {
    ad: "surecler",
    yontem: "GET",
    yol: "/surecler",
    ozet: "Süreç görevleri",
    eylem: "oturum",
    cikti: z.array(s.SurecGorevi),
    isle: (b) => rapor.surecler(b),
  },
  {
    ad: "ayarlar",
    yontem: "GET",
    yol: "/ayarlar",
    ozet: "Kurum ayarları ve yetki devri politikaları",
    eylem: "oneri.oku",
    cikti: s.Ayarlar,
    isle: (b) => politika.ayarlar(b),
  },
  {
    ad: "ayarlariGuncelle",
    yontem: "PATCH",
    yol: "/ayarlar",
    ozet: "Kurum ayarlarını güncelle",
    eylem: "kurum.ayar_yonet",
    govde: s.AyarDegisikligi,
    cikti: s.Ayarlar,
    isle: (b, g) => politika.ayarlariGuncelle(b, g.govde),
  },
  {
    ad: "politikalar",
    yontem: "GET",
    yol: "/politikalar",
    ozet: "Yetki devri politikaları",
    eylem: "oneri.oku",
    cikti: z.array(s.PolitikaKaydi),
    isle: (b) => politika.politikalar(b),
  },
  {
    ad: "politikaTaslagiOlustur",
    yontem: "POST",
    yol: "/politikalar",
    ozet: "İmza bekleyen politika taslağı oluştur",
    eylem: "politika.imzala",
    govde: s.PolitikaGirdisi,
    cikti: s.PolitikaKaydi,
    basariDurumu: 201,
    isle: (b, g) => politika.politikaTaslagiOlustur(b, g.govde),
  },
  {
    ad: "politikaImzala",
    yontem: "POST",
    yol: "/politikalar/{id}/imza",
    ozet: "Politikayı adınızla imzalayın. Yalnız oturumla.",
    eylem: "politika.imzala",
    govde: s.ImzaGirdisi,
    cikti: s.PolitikaKaydi,
    isle: (b, g) => politika.politikaImzala(b, g.yol.id as string, g.govde),
  },
  {
    ad: "politikaIptal",
    yontem: "POST",
    yol: "/politikalar/{id}/iptal",
    ozet: "Politikayı iptal et (yeni kayıtla). Yalnız oturumla.",
    eylem: "politika.imzala",
    govde: Bos,
    cikti: s.PolitikaKaydi,
    isle: (b, g) => politika.politikaIptal(b, g.yol.id as string),
  },
  {
    ad: "gunluk",
    yontem: "GET",
    yol: "/gunluk",
    ozet: "Değiştirilemez günlük",
    eylem: "gunluk.oku",
    sorgu: s.SayfaGirdisi,
    cikti: s.sayfaSemasi(s.GunlukKaydi),
    isle: (b, g) => panel.gunluk(b, g.sorgu as s.SayfaGirdisi),
  },
];

/** Yolu uçla eşleştirir; parametreleri döndürür. */
export function ucBul(yontem: string, yol: string): { uc: Uc; yol: Record<string, string> } | "yontem" | null {
  const parcalar = yol.replace(/\/+$/u, "").split("/");
  let yolEslesti = false;
  for (const uc of UCLAR) {
    const kalip = uc.yol.split("/");
    if (kalip.length !== parcalar.length) continue;
    const p: Record<string, string> = {};
    const tamam = kalip.every((k, i) => {
      const v = parcalar[i] ?? "";
      if (k.startsWith("{") && k.endsWith("}")) {
        if (!v) return false;
        p[k.slice(1, -1)] = decodeURIComponent(v);
        return true;
      }
      return k === v;
    });
    if (!tamam) continue;
    yolEslesti = true;
    if (uc.yontem === yontem) return { uc, yol: p };
  }
  return yolEslesti ? "yontem" : null;
}
