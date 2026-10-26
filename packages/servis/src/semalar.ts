// Servis girdi ve çıktı şemaları (zod). HTTP sınırında girdiler bunlarla doğrulanır; OpenAPI belgesi de
// bunlardan üretilir. Çıktı biçimleri web panelinin `VeriKaynagi` türleriyle aynıdır.

import { ONERI_RISKI } from "@akredit/cekirdek";
import { z } from "zod";

export const Kimlik = z.uuid({ error: "Geçerli bir kimlik değil." });
export const IsoZaman = z.string().meta({ format: "date-time" });

export const RiskDuzeyi = z.enum(["dusuk", "orta", "yuksek"]);
export const OneriTuru = z.enum([
  "kanit_etiketi",
  "toplanti_tutanagi",
  "anket_ozeti",
  "matris_katkisi",
  "soru_cikti_eslemesi",
  "bologna_taslagi",
  "rapor_bolumu",
  "eylem",
  "olgunluk_duzeyi",
  "yazma_plani",
  "dis_gonderim",
]);
export const KararSonucu = z.enum(["onaylandi", "duzeltildi", "reddedildi"]);
export const KanitKaynakTuru = z.enum(["yukleme", "baglayici", "eposta", "uretilen"]);

// ---------- Sayfalama ----------

export const SayfaGirdisi = z.object({
  sinir: z.coerce
    .number()
    .int()
    .min(1, "En az 1 kayıt istenmeli.")
    .max(100, "En çok 100 kayıt istenebilir.")
    .default(50),
  imlec: z
    .string()
    .regex(/^[0-9]+$/u, "Sayfa imleci geçersiz. İlk sayfadan yeniden başlayın.")
    .optional(),
});
export type SayfaGirdisi = z.input<typeof SayfaGirdisi>;

export const sayfaSemasi = <T extends z.ZodType>(oge: T) =>
  z.object({
    ogeler: z.array(oge),
    /** Sonraki sayfa için `imlec`; son sayfada null. */
    sonraki: z.string().nullable(),
    toplam: z.number().int(),
  });
export interface Sayfa<T> {
  ogeler: T[];
  sonraki: string | null;
  toplam: number;
}

export function sayfala<T>(liste: readonly T[], g: SayfaGirdisi = {}): Sayfa<T> {
  const p = SayfaGirdisi.parse(g);
  const bas = p.imlec ? Number(p.imlec) : 0;
  const son = bas + p.sinir;
  return { ogeler: liste.slice(bas, son), sonraki: son < liste.length ? String(son) : null, toplam: liste.length };
}

// ---------- Çıktı şemaları ----------

export const Capa = z.object({
  sayfa: z.number().optional(),
  sayfaSon: z.number().optional(),
  bolum: z.string().optional(),
  satir: z.number().optional(),
  hucre: z.string().optional(),
  slayt: z.number().optional(),
});
export const KanitAtfi = z.object({
  kanitId: z.string(),
  parcaId: z.string().optional(),
  capa: Capa.optional(),
  alinti: z.string().optional(),
});

export const Kullanici = z.object({ id: z.string(), ad: z.string(), unvan: z.string() });

export const IslemeDurumu = z.object({
  durum: z.enum(["bekliyor", "metin_cikarildi", "ocr_gerekli", "gomme_tamam", "hata"]),
  asama: z.string(),
  /** Kullanıcıya gösterilebilir Türkçe ileti. */
  ileti: z.string().nullable(),
  zaman: IsoZaman,
});

export const KanitGorunumu = z.object({
  id: z.string(),
  kurumId: z.string(),
  ozet: z.string(),
  dosyaAdi: z.string(),
  mime: z.string(),
  boyut: z.number(),
  kaynakTuru: KanitKaynakTuru,
  kaynakAyrinti: z.record(z.string(), z.unknown()),
  belgeTarihi: z.string().nullable(),
  kapsamlar: z.array(z.object({ tur: z.string(), id: z.string() })),
  eklenme: IsoZaman,
  kisiselVeri: z.enum(["yok", "maskeli", "var", "bilinmiyor"]),
  baslik: z.string(),
  olcutler: z.array(z.string()),
  isleme: IslemeDurumu.nullable(),
});
export const KanitParcasi = z.object({
  id: z.string(),
  kanitId: z.string(),
  sira: z.number(),
  capa: Capa,
  metin: z.string(),
});
export const KanitAyrintisi = z.object({ kanit: KanitGorunumu, parcalar: z.array(KanitParcasi) });

export const KanitHattiOzeti = z.object({
  sayac: z.object({
    isleniyor: z.number(),
    tamam: z.number(),
    hata: z.number(),
    ocr_bekliyor: z.number(),
    kisisel_veri: z.number(),
  }),
});

export const OneriIcerigi = z.object({ baslik: z.string(), metin: z.string() });
export const OneriGorunumu = z.object({
  id: z.string(),
  kurumId: z.string(),
  tur: OneriTuru,
  hedef: z.object({ tur: z.string(), id: z.string() }),
  icerik: OneriIcerigi,
  gerekce: z.string(),
  atiflar: z.array(KanitAtfi),
  guven: z.number().nullable(),
  uretici: z.record(z.string(), z.unknown()),
  risk: RiskDuzeyi,
  olusturma: IsoZaman,
  konum: z.string(),
});
export const Karar = z.object({
  id: z.string(),
  oneriId: z.string(),
  sonuc: KararSonucu,
  duzeltme: OneriIcerigi.nullable(),
  kararVeren: z.string(),
  dayanak: z.union([
    z.object({ tur: z.literal("dogrudan") }),
    z.object({ tur: z.literal("politika"), politikaId: z.string() }),
  ]),
  gerekce: z.string().nullable(),
  zaman: IsoZaman,
});

const MatrisDegeri = z.union([
  z.object({ tur: z.literal("puan"), puan: z.number().int().min(1).max(5) }),
  z.object({ tur: z.literal("iliskisiz") }),
  z.object({ tur: z.literal("yetersiz_kanit") }),
]);
export const Cikti = z.object({
  id: z.string(),
  tur: z.enum(["pea", "program", "ders", "tyyc"]),
  sahipId: z.string(),
  kod: z.string(),
  metin: z.string(),
  surum: z.number(),
  oncekiSurumId: z.string().nullable(),
});
export const OlcmeSatiri = z.object({ ciktiId: z.string(), kod: z.string(), saglanma: z.number() });
export const Ders = z.object({
  id: z.string(),
  kod: z.string(),
  ad: z.string(),
  akts: z.number(),
  yariyil: z.number(),
  ciktilar: z.array(Cikti),
  bolognaDurumu: z.enum(["guncel", "eksik", "onay_bekliyor"]),
  bolognaNotu: z.string(),
  dersDosyasi: z.array(z.object({ ad: z.string(), tamam: z.boolean() })),
  olcme: z.array(OlcmeSatiri),
});
export const Program = z.object({
  id: z.string(),
  ad: z.string(),
  duzey: z.enum(["onlisans", "lisans", "yuksek_lisans", "doktora"]),
  birim: z.string(),
  ciktilar: z.array(Cikti),
  dersIdleri: z.array(z.string()),
  matris: z.array(z.object({ dersCiktisiId: z.string(), programCiktisiId: z.string(), deger: MatrisDegeri })),
  olcme: z.array(OlcmeSatiri),
  esik: z.number(),
});
export const Rapor = z.object({
  id: z.string(),
  ad: z.string(),
  donem: z.string(),
  durum: z.enum(["taslak", "incelemede"]),
  bolumler: z.array(
    z.object({
      id: z.string(),
      baslik: z.string(),
      olcut: z.string(),
      paragraflar: z.array(z.object({ metin: z.string(), atiflar: z.array(KanitAtfi), eksik: z.boolean() })),
    }),
  ),
});
export const SurecGorevi = z.object({
  id: z.string(),
  baslik: z.string(),
  sonTarih: z.string(),
  sorumlu: z.string(),
  durum: z.enum(["bekliyor", "devam", "tamam"]),
  ilgili: z.string(),
});
export const YzSaglayici = z.enum(["evren", "kurum_sunucusu", "ollama", "diger"]);
export const PolitikaKaydi = z.object({
  id: z.string(),
  ad: z.string(),
  kapsam: z.object({
    oneriTurleri: z.array(OneriTuru),
    enYuksekRisk: z.enum(["dusuk", "orta"]),
    enDusukGuven: z.number(),
    birimIdleri: z.array(z.string()).optional(),
    programIdleri: z.array(z.string()).optional(),
  }),
  durum: z.enum(["imza_bekliyor", "imzali", "iptal"]),
  olusturan: z.string(),
  olusturma: IsoZaman,
  imzalayan: z.string().nullable(),
  imzaZamani: IsoZaman.nullable(),
});
export const Ayarlar = z.object({
  kurumAdi: z.string(),
  kurumKisaAdi: z.string(),
  yzSaglayici: YzSaglayici,
  yurtDisiIzni: z.boolean(),
  politikalar: z.array(PolitikaKaydi),
});
export const PanelOzeti = z.object({
  bekleyen: z.object({ dusuk: z.number(), orta: z.number(), yuksek: z.number() }),
  yaklasanlar: z.array(SurecGorevi),
  kapsama: z.array(z.object({ olcut: z.string(), kanitSayisi: z.number() })),
  kararSayisi: z.number(),
  harcananDakika: z.number(),
});
export const GunlukKaydi = z.object({
  sira: z.number(),
  zaman: IsoZaman,
  aktor: z.object({ tur: z.string(), id: z.string().nullable() }),
  eylem: z.string(),
  hedef: z.object({ tur: z.string(), id: z.string() }).nullable(),
  ozet: z.string(),
});

// ---------- Girdi şemaları ----------

export const KanitFiltresi = SayfaGirdisi.extend({
  arama: z.string().max(200).optional(),
  kaynakTuru: KanitKaynakTuru.optional(),
  olcut: z.string().max(50).optional(),
});

export const KararGirdisi = z
  .object({
    oneriId: Kimlik,
    sonuc: KararSonucu,
    duzeltme: z.string().max(20_000).optional(),
    gerekce: z.string().max(2_000).optional(),
  })
  .strict()
  .superRefine((g, c) => {
    if (g.sonuc === "duzeltildi" && !g.duzeltme?.trim())
      c.addIssue({ code: "custom", path: ["duzeltme"], message: "Düzeltilmiş metin boş olamaz." });
    if (g.sonuc !== "duzeltildi" && g.duzeltme !== undefined)
      c.addIssue({ code: "custom", path: ["duzeltme"], message: "Düzeltme yalnız düzeltme kararında yazılır." });
  });
export type KararGirdisi = z.infer<typeof KararGirdisi>;

export const TopluKararGirdisi = z
  .object({
    oneriIdleri: z
      .array(Kimlik)
      .min(1, "Önce en az bir öneri seçin.")
      .max(100, "Bir seferde en çok 100 öneri onaylanır."),
  })
  .strict();

export const PolitikaGirdisi = z
  .object({
    ad: z.string().trim().min(1, "Politikaya bir ad verin.").max(200),
    oneriTurleri: z.array(OneriTuru).min(1, "En az bir öneri türü seçin."),
    enYuksekRisk: RiskDuzeyi,
    enDusukGuven: z
      .number()
      .min(0, "Güven eşiği 0 ile 100 arasında olmalı.")
      .max(1, "Güven eşiği 0 ile 100 arasında olmalı."),
    birimIdleri: z.array(Kimlik).max(100).optional(),
    programIdleri: z.array(Kimlik).max(100).optional(),
  })
  .strict()
  .superRefine((g, c) => {
    if (g.enYuksekRisk === "yuksek")
      c.addIssue({
        code: "custom",
        path: ["enYuksekRisk"],
        message: "Yüksek riskli işler için otomatik onay politikası oluşturulamaz.",
      });
    if (g.oneriTurleri.some((t) => ONERI_RISKI[t] === "yuksek"))
      c.addIssue({
        code: "custom",
        path: ["oneriTurleri"],
        message: "Seçilen türlerden biri yüksek riskli. Yüksek riskli işler otomatik onaylanamaz.",
      });
  });
export type PolitikaGirdisi = z.infer<typeof PolitikaGirdisi>;

export const ImzaGirdisi = z.object({ imzalayanAd: z.string().trim().min(1, "Adınızı yazın.").max(200) }).strict();

export const AyarDegisikligi = z
  .object({
    kurumAdi: z.string().trim().min(2, "Kurum adı en az 2 karakter olmalı.").max(300).optional(),
    kurumKisaAdi: z.string().trim().max(50).optional(),
    yzSaglayici: YzSaglayici.optional(),
    yurtDisiIzni: z.boolean().optional(),
  })
  .strict();
export type AyarDegisikligi = z.infer<typeof AyarDegisikligi>;
