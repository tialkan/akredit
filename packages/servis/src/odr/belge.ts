// ÖDR belge modelleri (saf): DOCX rapor ve XLSX ziyaret hazırlık paketi. Bölüm yapısı çerçevenin rapor
// şablonunu sırasıyla izler; ekler (kapsama haritası, eksikler, hesap kaynakları, kanıt listesi, sürüm
// geçmişi) şablon bölümlerinden sonra gelir.

import type { DocxBolumu, DocxModeli, XlsxSayfasi } from "@akredit/belge";
import { DOGRULANMADI } from "@akredit/cerceveler";
import type { OdrTaslagi } from "./kurucu.ts";

export interface OdrOnayi {
  onaylayan: string;
  zaman: string;
  dayanak: string;
}

export interface DersDosyasiSatiri {
  dersKodu: string;
  dersAdi: string;
  donem: string;
  olcmeSonucu: string;
  dersDosyasi: string;
}

export interface OdrSurumu {
  surum: number;
  zaman: string;
  eksikSayisi: number;
}

export interface OdrBelgeGirdisi {
  taslak: OdrTaslagi;
  kurumAd: string;
  surum: number;
  surumler: OdrSurumu[];
  onay: OdrOnayi | null;
  dersDosyalari: DersDosyasiSatiri[];
}

export const EK_BASLIKLARI = [
  "Ek A. Kapsama haritası",
  "Ek B. Eksikler",
  "Ek C. Hesap kaynakları",
  "Ek D. Kanıt listesi",
  "Ek E. Sürüm geçmişi ve onay",
] as const;

const kapsamaSatirlari = (t: OdrTaslagi) =>
  t.bolumler.flatMap((b) =>
    b.olcutler.map((o) => [b.kod, o.kod, o.baslik, String(o.kanitSayisi), o.kapsandi ? "Var" : "EKSİK"]),
  );

export function odrDocxModeli(g: OdrBelgeGirdisi): DocxModeli {
  const t = g.taslak;
  const giris: DocxBolumu = {
    baslik: "Rapor hakkında",
    duzey: 1,
    icerik: [
      {
        tur: "tablo",
        basliklar: ["Alan", "Değer"],
        satirlar: [
          ["Program", t.programAd],
          ["Çerçeve", `${t.cerceve.ad} (${t.cerceve.surum})`],
          ["Çerçeve durumu", t.cerceve.rozet],
          ["Çerçeve kaynağı", t.cerceve.kaynak ?? "Akredit iç çerçevesi"],
          ["Rapor sürümü", String(g.surum)],
        ],
      },
      ...(t.sablonKaynagi === "olcut_agaci"
        ? [
            {
              tur: "paragraf" as const,
              vurgu: "not" as const,
              metin: `Kuruluşun rapor şablonu resmî belgeden alınamadı (${DOGRULANMADI}); bölümler çerçevenin ana ölçütlerine göre dizildi.`,
            },
          ]
        : []),
      {
        tur: "paragraf",
        vurgu: "not",
        metin:
          "Her cümle onaylı bir kanıta [K:…] ya da kayıtlı bir hesaba [H:…] atıflıdır; kanıtı olmayan konular [EKSİK] olarak gösterilir.",
      },
    ],
  };
  const bolumler: DocxBolumu[] = t.bolumler.flatMap((b) => [
    { baslik: `${b.kod}. ${b.baslik}`, duzey: 1 as const, icerik: [] },
    ...b.olcutler.map((o) => ({
      baslik: `${o.kod} ${o.baslik}`,
      duzey: 2 as const,
      icerik: [
        {
          tur: "paragraf" as const,
          vurgu: "not" as const,
          metin: o.metinDurumu === "dogrulanmadi" ? `Ölçüt metni: ${DOGRULANMADI}` : `Ölçüt: ${o.metin}`,
        },
        ...o.paragraflar.map((p) => ({
          tur: "paragraf" as const,
          metin: p.metin,
          ...(p.eksik ? { vurgu: "eksik" as const } : {}),
        })),
      ],
    })),
  ]);
  const ekler: DocxBolumu[] = [
    {
      baslik: EK_BASLIKLARI[0],
      duzey: 1,
      icerik: [
        {
          tur: "tablo",
          basliklar: ["Bölüm", "Ölçüt", "Başlık", "Onaylı kanıt", "Durum"],
          satirlar: kapsamaSatirlari(t),
        },
      ],
    },
    {
      baslik: EK_BASLIKLARI[1],
      duzey: 1,
      icerik: t.eksikler.length
        ? [
            {
              tur: "tablo",
              basliklar: ["Ölçüt", "Başlık", "Neden", "Beklenen kanıt"],
              satirlar: t.eksikler.map((e) => [e.olcutKod, e.baslik, e.neden, e.gereksinimler.join("; ") || "—"]),
            },
          ]
        : [{ tur: "paragraf", metin: "Eksik yok." }],
    },
    {
      baslik: EK_BASLIKLARI[2],
      duzey: 1,
      icerik: t.hesaplar.length
        ? [
            {
              tur: "tablo",
              basliklar: ["Kimlik", "Hesap", "Dayanak"],
              satirlar: t.hesaplar.map((h) => [`H:${h.kimlik.slice(0, 8)}`, h.ad, h.dayanak]),
            },
          ]
        : [{ tur: "paragraf", metin: "Hesap kaynağı yok." }],
    },
    {
      baslik: EK_BASLIKLARI[3],
      duzey: 1,
      icerik: [
        {
          tur: "tablo",
          basliklar: ["Atıf", "Dosya", "Ölçütler", "Onaylayan", "Onay tarihi", "SHA-256"],
          satirlar: t.kanitlar.map((k) => [
            `K:${k.ozet.slice(0, 8)}`,
            k.dosyaAdi,
            k.olcutKodlari.join(", "),
            k.onaylayan,
            k.onayZamani.slice(0, 10),
            k.ozet,
          ]),
        },
      ],
    },
    {
      baslik: EK_BASLIKLARI[4],
      duzey: 1,
      icerik: [
        {
          tur: "tablo",
          basliklar: ["Sürüm", "Zaman", "Eksik sayısı"],
          satirlar: g.surumler.map((s) => [String(s.surum), s.zaman, String(s.eksikSayisi)]),
        },
        g.onay
          ? {
              tur: "paragraf",
              metin: `Onaylayan: ${g.onay.onaylayan} · Zaman: ${g.onay.zaman} · Dayanak: ${g.onay.dayanak}`,
            }
          : { tur: "paragraf", vurgu: "eksik", metin: "[EKSİK: Rapor henüz onaylanmadı.]" },
      ],
    },
  ];
  return {
    baslik: `Öz Değerlendirme Raporu — ${t.programAd}`,
    altBaslik: `${g.kurumAd} · ${t.cerceve.ad}`,
    ustBilgi: g.onay ? g.kurumAd : "Taslak: onaylanmadı",
    altBilgi: `Sürüm ${g.surum} · ${t.cerceve.rozet}`,
    bolumler: [giris, ...bolumler, ...ekler],
  };
}

/** Ziyaret hazırlık paketi: kanıt listesi, ders dosyaları dizini, kapsama haritası, eksikler. */
export function ziyaretPaketiSayfalari(g: OdrBelgeGirdisi): XlsxSayfasi[] {
  const t = g.taslak;
  return [
    {
      ad: "Kanıt listesi",
      basliklar: ["Atıf", "Dosya", "Ölçütler", "Onaylayan", "Onay tarihi", "SHA-256"],
      satirlar: t.kanitlar.map((k) => [
        `K:${k.ozet.slice(0, 8)}`,
        k.dosyaAdi,
        k.olcutKodlari.join(", "),
        k.onaylayan,
        k.onayZamani.slice(0, 10),
        k.ozet,
      ]),
    },
    {
      ad: "Ders dosyaları",
      basliklar: ["Ders kodu", "Ders", "Dönem", "Ölçme sonucu", "Ders dosyası"],
      satirlar: g.dersDosyalari.map((d) => [d.dersKodu, d.dersAdi, d.donem, d.olcmeSonucu, d.dersDosyasi]),
    },
    { ad: "Kapsama", basliklar: ["Bölüm", "Ölçüt", "Başlık", "Onaylı kanıt", "Durum"], satirlar: kapsamaSatirlari(t) },
    {
      ad: "Eksikler",
      basliklar: ["Ölçüt", "Başlık", "Neden", "Beklenen kanıt"],
      satirlar: t.eksikler.map((e) => [e.olcutKod, e.baslik, e.neden, e.gereksinimler.join("; ")]),
    },
  ];
}
