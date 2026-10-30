// Program akreditasyonu kuruluşlarının resmî belgeleri. Adres, erişim tarihi ve SHA-256
// kaynaklar/resmi/kaynaklar.json kaydından alınmıştır; dosyalar kaynaklar/resmi/ altındadır.

import type { KaynakBelge } from "../sema.ts";

const ERISIM = "2026-10-30";

export const PROGRAM_BELGELERI = {
  mudekLisans31: {
    adres: "https://www.mudek.org.tr/doc/tr/MUDEK-Degerlendirme_Olcutleri_(3.1-05.12.2025).pdf",
    erisimTarihi: ERISIM,
    sha256: "e75078e2c21f9b2bb57e7f98866cfb7a55db8ff459c8af7b6b56bb6ea23390ae",
    dosya: "mudek/mudek-degerlendirme-olcutleri-3.1.pdf",
    not: "MÜDEK Lisans Programları Değerlendirme Ölçütleri Sürüm 3.1 (05.12.2025).",
  },
  mudekYl20: {
    adres: "https://www.mudek.org.tr/doc/tr/MUDEK-YL%20Degerlendirme_Olcutleri_(2.0-05.12.2025).pdf",
    erisimTarihi: ERISIM,
    sha256: "794413faba4512ffffaa8ea7d9f62892895cf828752607572986326fd85dc454",
    dosya: "mudek/mudek-yl-degerlendirme-olcutleri-2.0.pdf",
    not: "MÜDEK Yüksek Lisans Değerlendirme Ölçütleri Sürüm 2.0 (05.12.2025).",
  },
  mudekOdr31: {
    adres: "https://www.mudek.org.tr/doc/tr/Ozdegerlendirme_Raporu_(3.1_05.12.2025).docx",
    erisimTarihi: ERISIM,
    sha256: "14efa21d85b78c1367b9915bacac27fdb28f965039f46faed3bc44882764cb83",
    dosya: "mudek/mudek-ozdegerlendirme-raporu-3.1.docx",
    not: "MÜDEK Özdeğerlendirme Raporu şablonu Sürüm 3.1 (05.12.2025).",
  },
  fedek41: {
    adres: encodeURI("https://fedek.org.tr/_uploads/Değerlendirme Ölçütleri_Sürüm_4.1..pdf"),
    erisimTarihi: ERISIM,
    sha256: "76f6dd41f99013624a2f59e00e2a215d64c84233d333cfb5bd517a632a9a42ef",
    dosya: "fedek/fedek-degerlendirme-olcutleri-4.1.pdf",
    not: "FEDEK Değerlendirme Ölçütleri Sürüm 4.1 (2025-2026 dönemi).",
  },
  fedekOdr31: {
    adres: encodeURI("https://fedek.org.tr/_uploads/FEDEK-Özdeğerlendirme Raporu (Sürüm 3.1 - 22.12.2022).docx"),
    erisimTarihi: ERISIM,
    sha256: "04f2f6bc0f6d68d1337749cbfccc7dbc8a191efa459a9c09ee71143dfcb0b5e4",
    dosya: "fedek/fedek-ozdegerlendirme-raporu-3.1.docx",
    not: "FEDEK Özdeğerlendirme Raporu şablonu Sürüm 3.1 (22.12.2022).",
  },
  epdadKilavuz11: {
    adres: "https://epdad.org.tr/data/genel/pdf/EPDAD_Standartlar_Surum_1.1_Kilavuz.pdf",
    erisimTarihi: ERISIM,
    sha256: "a8ebddd6201f1894eebce2a4ce2df5649b864b82ff1a479970c7afb3fd9caa9d",
    dosya: "epdad/epdad-standartlar-1.1-kilavuz.pdf",
    not: "EPDAD Öğretmen Eğitimi Standartları Sürüm 1.1 Kılavuzu (02.11.2021).",
  },
  epdadRpd: {
    adres: "https://epdad.org.tr/data/genel/pdf/RPD-LES-241216.pdf",
    erisimTarihi: ERISIM,
    sha256: "bed47cc28b886b36931451dd511004bd1eeceef8290100a84f42286c8416f609",
    dosya: "epdad/epdad-rpd-lisans-egitimi-standartlari.pdf",
    not: "EPDAD Rehberlik ve Psikolojik Danışma (RPD) Lisans Eğitimi Standartları (dosya adı 241216).",
  },
  epdadOdr13: {
    adres: "https://epdad.org.tr/data/genel/belgeler-tuzukler/Ogretmen_Egitimi_ODR_Hazirlama_Kilavuzu_1.3mr.pdf",
    erisimTarihi: ERISIM,
    sha256: "002a341898c3101011285381a37205510c7fd4cadbadfd450535af2cde5a4ec3",
    dosya: "epdad/epdad-odr-hazirlama-kilavuzu-1.3.pdf",
    not: "EPDAD Öğretmen Eğitimi ÖDR Hazırlama Kılavuzu 1.3.",
  },
  sabakR4: {
    adres: encodeURI("https://www.sabak.org.tr/images/Genel_Değerlendirme_Ölçütleri_-_R4_5_Haziran_2022.pdf"),
    erisimTarihi: ERISIM,
    sha256: "9da7ce8f5a899a2d448b32a07da510590db8c1741bd6aedc4113e29e20e7e41d",
    dosya: "sabak/sabak-genel-degerlendirme-olcutleri-r4.pdf",
    not: "SABAK Sağlık Bilimleri Eğitim Programları Genel Değerlendirme Ölçütleri R4 (5 Haziran 2022).",
  },
  sabakOdrR5: {
    adres: encodeURI("https://www.sabak.org.tr/images/ÖZDEĞERLENDİRME_RAPORU_HAZIRLAMA_10.04.2026_Revizyon_5.pdf"),
    erisimTarihi: ERISIM,
    sha256: "feb478878373c78a14263384a423a51711bf0c7df4edb9af31077ad55c96b876",
    dosya: "sabak/sabak-odr-hazirlama-r5.pdf",
    not: "SABAK Özdeğerlendirme Raporu Hazırlama Revizyon 5 (10.04.2026).",
  },
} as const satisfies Record<string, KaynakBelge>;
