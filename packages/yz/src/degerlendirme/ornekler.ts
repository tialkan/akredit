// Kurgu altın örnekler. Kişi, kurum ve belge adları uydurmadır; gerçek bir belgeden alınmamıştır.
import type { KanitSiniflamaGirdisi } from "../gorevler/kanit-siniflama.ts";
import type { ToplantiBilgisiGirdisi } from "../gorevler/toplanti-bilgisi.ts";
import type { AltinOrnek } from "./duzenek.ts";

const OZET_TUTANAK = "a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90";
const OZET_IZLENCE = "0f1e2d3c4b5a69788796a5b4c3d2e1f00f1e2d3c4b5a69788796a5b4c3d2e1f0";

export const KURGU_OLCUTLER = [
  { kod: "A.1", ad: "Liderlik ve kalite" },
  { kod: "B.1", ad: "Programların tasarımı ve onayı" },
  { kod: "B.3", ad: "Öğrenci merkezli öğrenme, öğretme ve değerlendirme" },
  { kod: "C.1", ad: "Araştırma stratejisi" },
];

export const KURGU_TUTANAK = {
  ozet: OZET_TUTANAK,
  parcalar: [
    {
      capa: { sayfa: 1 },
      metin:
        "Örnek Fakültesi Danışma Kurulu toplantısı 14.03.2026 tarihinde yapıldı. Toplantıya Ayla Deniz, Kerem Toprak ve İlknur Yaz katıldı.",
    },
    {
      capa: { sayfa: 2 },
      metin:
        "Kurul, program çıktılarının paydaş görüşüyle güncellenmesine karar verdi. Kerem Toprak anket taslağını hazırlayacak.",
    },
  ],
};

export const KURGU_IZLENCE = {
  ozet: OZET_IZLENCE,
  parcalar: [
    {
      capa: { sayfa: 1 },
      metin:
        "Ders izlencesi: Örnek Hukuku I. Değerlendirme: ara sınav %40, final %60. Öğrenme çıktıları ölçme ile eşlenmiştir.",
    },
  ],
};

export const KANIT_SINIFLAMA_ORNEKLERI: AltinOrnek<KanitSiniflamaGirdisi>[] = [
  {
    ad: "izlence",
    girdi: { kanit: KURGU_IZLENCE, olcutler: KURGU_OLCUTLER },
    beklenen: { belgeTuru: "izlence" },
    sahteYanit: JSON.stringify({
      belgeTuru: "izlence",
      olcutOnerileri: [
        {
          olcutKod: "B.3",
          gerekce: "Ölçme ve değerlendirme yöntemi tanımlanmış.",
          atif: '[K:0f1e2d3c s.1 "ara sınav %40, final %60"]',
          guven: 0.8,
        },
      ],
    }),
  },
  {
    ad: "tutanak",
    girdi: { kanit: KURGU_TUTANAK, olcutler: KURGU_OLCUTLER },
    beklenen: { belgeTuru: "tutanak" },
    sahteYanit: JSON.stringify({
      belgeTuru: "tutanak",
      olcutOnerileri: [
        {
          olcutKod: "B.1",
          gerekce: "Program çıktılarının paydaşlarla güncellenmesi kararı.",
          atif: '[K:a1b2c3d4 s.2 "program çıktılarının paydaş görüşüyle güncellenmesine karar verdi"]',
          guven: 0.7,
        },
      ],
    }),
  },
];

export const TOPLANTI_BILGISI_ORNEKLERI: AltinOrnek<ToplantiBilgisiGirdisi>[] = [
  {
    ad: "danisma-kurulu",
    girdi: { kanit: KURGU_TUTANAK, adlar: ["Ayla Deniz", "Kerem Toprak", "İlknur Yaz"] },
    beklenen: { tarih: "2026-03-14", toplantiTuru: "danisma_kurulu", katilimciSayisi: 3 },
    sahteYanit: JSON.stringify({
      tarih: "2026-03-14",
      tarihAtif: '[K:a1b2c3d4 s.1 "14.03.2026 tarihinde yapıldı"]',
      toplantiTuru: "danisma_kurulu",
      katilimciSayisi: 3,
      katilimciAtif: '[K:a1b2c3d4 s.1 "katıldı"]',
      kararlar: [
        {
          metin: "Program çıktıları paydaş görüşüyle güncellenecek.",
          atif: '[K:a1b2c3d4 s.2 "güncellenmesine karar verdi"]',
        },
      ],
      eylemAdaylari: [
        {
          metin: "Anket taslağı hazırlanacak.",
          sorumlu: "[KİŞİ-2]",
          atif: '[K:a1b2c3d4 s.2 "anket taslağını hazırlayacak"]',
        },
      ],
    }),
  },
];
