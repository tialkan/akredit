// KVKK veri akış envanteri (İP-40). Kod tabanından üretilir: YZ sağlayıcı kataloğu (`@akredit/yz`), bağlayıcılar
// (`@akredit/baglayicilar` dizinleri) ve veritabanı tabloları (`@akredit/vt` şeması). Testler her tablonun ve her
// bağlayıcının burada sınıflandırıldığını denetler; yeni tablo ya da bağlayıcı eklenince envanter güncellenmeden
// test geçmez. Hukuki sebepler avukat incelemesi gerektirir: hepsi DOĞRULANMADI.

import type { SaglayiciBilgisi } from "@akredit/yz";

export interface EnvanterSatiri {
  faaliyet: string;
  veriKategorisi: string;
  amac: string;
  hukukiSebep: string;
  saklama: string;
  alici: string;
  yurtDisiAktarim: string;
  teknikTedbir: string;
  kaynak: string;
}

const DOG = "DOĞRULANMADI";

/** Kişisel veri taşıyan tablolar ve işleme faaliyeti. `null`: kişisel veri tutmaz. */
export const TABLO_SINIFI: Record<string, string | null> = {
  kisi: "hesap",
  rol_atamasi: "hesap",
  kimlik_kullanici: "hesap",
  kimlik_hesap: "hesap",
  kimlik_oturum: "hesap",
  kimlik_dogrulama: "hesap",
  kimlik_giris_izi: "hesap",
  kimlik_uyelik: "hesap",
  kimlik_davet: "hesap",
  kimlik_api_anahtari: "hesap",
  kimlik_sso_saglayici: null,
  ogrenci_puani: "olcme",
  olcme_sonucu: "olcme",
  takma_ad: "olcme",
  kisi_anahtari: "olcme",
  anket_yaniti: "anket",
  anket_belirteci: "anket",
  kanit: "kanit",
  kanit_parcasi: "kanit",
  kanit_isleme: "kanit",
  toplanti: "kanit",
  oneri: "karar",
  karar: "karar",
  katki: "karar",
  yetki_politikasi: "karar",
  kayit_duzeltmesi: "karar",
  gunluk: "gunluk",
  bildirim: "bildirim",
  gorev: "bildirim",
  eylem: "bildirim",
  kurum_acilis_talebi: "basvuru",
  anket: null,
  anket_sorusu: null,
  birim: null,
  cerceve: null,
  cikti: null,
  demo_nesli: null,
  ders: null,
  ders_acilisi: null,
  donem: null,
  gosterge: null,
  gosterge_olcumu: null,
  kanit_gereksinimi: null,
  kanit_olcut_baglantisi: null,
  kurum: null,
  olcme_araci: null,
  olcut: null,
  olgunluk_duzeyi: null,
  program: null,
  rapor: null,
  rapor_bolumu_surumu: null,
  son_tarih: null,
  soru: null,
  surec_ornegi: null,
  surec_tanimi: null,
};

/** Şemada olmayıp göçle eklenen tablolar. */
export const EK_TABLOLAR = ["kisi_anahtari"];

interface Faaliyet extends Omit<EnvanterSatiri, "kaynak" | "yurtDisiAktarim"> {
  kimlik: string;
}

const FAALIYETLER: Faaliyet[] = [
  {
    kimlik: "hesap",
    faaliyet: "Kullanıcı hesabı, giriş ve rol yönetimi",
    veriKategorisi: "Kimlik (ad, soyad), iletişim (kurumsal e-posta), işlem güvenliği (oturum, giriş izi)",
    amac: "Sisteme güvenli giriş, yetkilendirme",
    hukukiSebep: `Sözleşmenin ifası / hukuki yükümlülük (KVKK m. 5, ${DOG})`,
    saklama: "Hesap süresince; giriş izleri saklama politikasına göre (docs/hukuk/saklama-imha-politikasi.md)",
    alici: "Kurum yetkilileri; tek oturum açma sağlayıcısı (kurumun kendi)",
    teknikTedbir: "Satır güvenliği (kurum yalıtımı), parola ve kod modele ve günlüğe girmez (ilke 8)",
  },
  {
    kimlik: "olcme",
    faaliyet: "Öğrenci notları ve öğrenme çıktısı ölçmesi",
    veriKategorisi: "Öğrenci numarası (takma adla), not ve puanlar",
    amac: "Ders ve program öğrenme çıktılarının sağlanma düzeyi",
    hukukiSebep: `Kamu görevi / hukuki yükümlülük (yükseköğretim mevzuatı, ${DOG})`,
    saklama: "Ölçme dönemi; silme talebinde kriptografik silme",
    alici: "Yok (yalnız toplu sonuç raporlanır)",
    teknikTedbir: "HMAC takma ad, kişiye özgü anahtar ve kriptografik silme, numara şifreli",
  },
  {
    kimlik: "anket",
    faaliyet: "Anketler (öğrenci, mezun, dış paydaş)",
    veriKategorisi: "Anket yanıtları; tek kullanımlık bağlantı belirteci",
    amac: "Paydaş görüşü ve memnuniyet ölçümü",
    hukukiSebep: `Kamu görevi / meşru menfaat (${DOG})`,
    saklama: "Anket dönemi + kurum politikası",
    alici: "Yok (toplu sonuç)",
    teknikTedbir: "Yanıt kimlikten ayrık; belirteç tek kullanımlık",
  },
  {
    kimlik: "kanit",
    faaliyet: "Kanıt belgeleri ve toplantı tutanakları",
    veriKategorisi: "Belgelerde geçen ad, unvan, imza; tutanaklarda katılımcılar",
    amac: "Akreditasyon ve kalite güvencesi kanıtı",
    hukukiSebep: `Kamu görevi / hukuki yükümlülük (YÖKAK süreçleri, ${DOG})`,
    saklama: "Akreditasyon dönemi; dosya değiştirilemez, kişiye ait alanlar kriptografik silmeyle",
    alici: "Kurum yetkilileri; değerlendiriciler (kurum kararıyla)",
    teknikTedbir: "SHA-256 ile değiştirilemez saklama; YZ'ye çıkışta maskeleme ve çıkış kapısı",
  },
  {
    kimlik: "karar",
    faaliyet: "Öneri, onay ve yetki devri kayıtları",
    veriKategorisi: "Onaylayanın adı, zamanı, dayanağı",
    amac: "Beyan ve onayın insanda kalması, hesap verebilirlik (ilke 3)",
    hukukiSebep: `Hukuki yükümlülük / meşru menfaat (${DOG})`,
    saklama: "Kalıcı (yalnız eklenir)",
    alici: "Kurum yetkilileri",
    teknikTedbir: "Yalnız ekleme tetikleyicileri, satır güvenliği",
  },
  {
    kimlik: "gunluk",
    faaliyet: "Değiştirilemez işlem günlüğü",
    veriKategorisi: "İşlemi yapanın kimliği, işlem, zaman",
    amac: "Bütünlük ve denetim izi",
    hukukiSebep: `Hukuki yükümlülük (veri güvenliği, KVKK m. 12, ${DOG})`,
    saklama: "Kalıcı; silme kayıtları en az 3 yıl (K7)",
    alici: "Kurum yetkilileri; denetçi",
    teknikTedbir: "SHA-256 özet zinciri; kişiye ait alanlar kişiye özgü anahtarla şifreli",
  },
  {
    kimlik: "bildirim",
    faaliyet: "Bildirim, görev ve hatırlatmalar",
    veriKategorisi: "Alıcı kişi, görev içeriği",
    amac: "İş akışı hatırlatma",
    hukukiSebep: `Meşru menfaat (${DOG})`,
    saklama: "Okunduktan sonra kurum politikasına göre",
    alici: "E-posta hizmeti (kurumun seçtiği)",
    teknikTedbir: "İçerikte kişisel veri en aza indirilir",
  },
  {
    kimlik: "basvuru",
    faaliyet: "Kurum açılış başvurusu",
    veriKategorisi: "Başvuranın adı, kurumsal e-postası",
    amac: "Kurumun sisteme açılması",
    hukukiSebep: `Sözleşmenin kurulması (${DOG})`,
    saklama: "Başvuru sonuçlanana kadar + saklama politikası",
    alici: "İşletmeci",
    teknikTedbir: "Kurumsal alan adı doğrulaması",
  },
];

/** Bağlayıcı dizinleri ve açıklamaları (`packages/baglayicilar/src/<dizin>`). */
export const BAGLAYICILAR: Record<string, { ad: string; veri: string; kisisel: boolean }> = {
  avesis: { ad: "AVESİS (akademik veri)", veri: "Akademisyen adı ve yayınları (kamuya açık)", kisisel: true },
  "bologna-proliz": {
    ad: "Bologna bilgi paketi (Proliz)",
    veri: "Ders bilgileri, sorumlu öğretim elemanı",
    kisisel: true,
  },
  bulut: { ad: "Google Drive / OneDrive", veri: "Kurum belgeleri (kişisel veri içerebilir)", kisisel: true },
  ebys: { ad: "Elektronik belge yönetim sistemi", veri: "Resmî yazılar (ad, unvan, imza)", kisisel: true },
  eposta: { ad: "E-posta (IMAP)", veri: "Kanıt e-postaları (gönderen, alıcı)", kisisel: true },
  "not-aktarimi": { ad: "OBS not aktarımı", veri: "Öğrenci numarası ve notlar (takma adla saklanır)", kisisel: true },
  ubys: { ad: "UBYS / OBS", veri: "Ders ve öğrenci kayıtları", kisisel: true },
  "web-tarama": { ad: "Kurum sitesi taraması", veri: "Kurumun kamuya açık sayfaları", kisisel: false },
  yokatlas: { ad: "YÖK Atlas", veri: "Programın toplu istatistikleri", kisisel: false },
};

/** Envanteri üretir. Sıra belirlenimcidir. */
export function veriAkisEnvanteri(girdi: {
  saglayicilar: readonly SaglayiciBilgisi[];
  baglayicilar: readonly string[];
  tablolar: readonly string[];
}): EnvanterSatiri[] {
  const satirlar: EnvanterSatiri[] = [];
  for (const f of FAALIYETLER) {
    const tablolar = girdi.tablolar.filter((t) => TABLO_SINIFI[t] === f.kimlik).sort();
    const { kimlik: _k, ...alanlar } = f;
    satirlar.push({
      ...alanlar,
      yurtDisiAktarim: "Yok",
      kaynak: tablolar.length ? `Tablolar: ${tablolar.join(", ")}` : "Tablo yok",
    });
  }
  for (const d of [...girdi.baglayicilar].sort()) {
    const b = BAGLAYICILAR[d];
    if (!b) throw new Error(`Bağlayıcı envanterde yok: ${d}`);
    satirlar.push({
      faaliyet: `Veri alma: ${b.ad}`,
      veriKategorisi: b.veri,
      amac: "Kanıtın birincil kaynaktan toplanması",
      hukukiSebep: b.kisisel ? `Kamu görevi / hukuki yükümlülük (${DOG})` : "Kişisel veri yok",
      saklama: "Kanıt olarak; kanıt saklama süresi",
      alici: "Yok (yalnız okuma)",
      yurtDisiAktarim: "Yok",
      teknikTedbir: "Kurumun kendi kimlik bilgisiyle, salt okunur; giriş bilgisi modele girmez",
      kaynak: `Bağlayıcı: ${d}`,
    });
  }
  for (const s of girdi.saglayicilar) {
    const ulke = s.ulkeDogrulandi ? s.ulke : `${s.ulke} (${DOG})`;
    satirlar.push({
      faaliyet: `Yapay zekâ işleme: ${s.gorunenAd}`,
      veriKategorisi:
        s.kip === "yurt_disi"
          ? "Maskeli metin (kişisel veri çıkmaz; şüpheli içerik gönderilmez)"
          : "Belge metni (kişisel veri içerebilir)",
      amac: `Taslak, sınıflama ve arama (${s.islemler.join(", ")})`,
      hukukiSebep: s.kip === "yurt_disi" ? "Kişisel veri aktarılmaz (çıkış kapısı)" : `Kamu görevi (${DOG})`,
      saklama: "Sağlayıcıda saklama sağlayıcı koşullarına bağlı (DOĞRULANMADI); Akredit'te çıkış kaydı",
      alici: s.gorunenAd,
      yurtDisiAktarim: s.kip === "yurt_disi" ? `Var: ${s.ad}, ${ulke}. Güvence: ${s.guvence}` : `Yok (${ulke})`,
      teknikTedbir:
        s.kip === "yurt_disi"
          ? "Zorunlu çıkış kapısı: maskeleme, şüphede insan incelemesi, çıkış kaydı; kurum izni olmadan kapalı"
          : "Kurum içi kip; çıkış kaydı",
      kaynak: `Sağlayıcı: ${s.ad}`,
    });
  }
  return satirlar;
}

export const ENVANTER_BASLIKLARI: [keyof EnvanterSatiri, string][] = [
  ["faaliyet", "İşleme faaliyeti"],
  ["veriKategorisi", "Veri kategorisi"],
  ["amac", "Amaç"],
  ["hukukiSebep", "Hukuki sebep"],
  ["saklama", "Saklama"],
  ["alici", "Alıcı"],
  ["yurtDisiAktarim", "Yurt dışı aktarım"],
  ["teknikTedbir", "Teknik tedbir"],
  ["kaynak", "Kaynak"],
];

function csvAlan(s: string): string {
  return /[",\n;]/u.test(s) ? `"${s.replace(/"/gu, '""')}"` : s;
}

/** RFC 4180 CSV (UTF-8, BOM'lu: Excel Türkçe karakterleri doğru açsın). */
export function envanterCsv(satirlar: readonly EnvanterSatiri[]): string {
  const bas = ENVANTER_BASLIKLARI.map(([, b]) => csvAlan(b)).join(",");
  const govde = satirlar.map((s) => ENVANTER_BASLIKLARI.map(([k]) => csvAlan(s[k])).join(","));
  return `﻿${[bas, ...govde].join("\r\n")}\r\n`;
}

/** Markdown belgesi (docs/hukuk/veri-akis-envanteri.md). */
export function envanterMarkdown(satirlar: readonly EnvanterSatiri[]): string {
  const hucre = (s: string) => s.replace(/\|/gu, "\\|");
  const tablo = [
    `| ${ENVANTER_BASLIKLARI.map(([, b]) => b).join(" | ")} |`,
    `|${ENVANTER_BASLIKLARI.map(() => "---").join("|")}|`,
    ...satirlar.map((s) => `| ${ENVANTER_BASLIKLARI.map(([k]) => hucre(s[k])).join(" | ")} |`),
  ];
  return `# Veri akış envanteri

> **TASLAK, avukat incelemesi gerekir.** Bu dosya \`apps/web/scripts/veri-akis-envanteri.ts\` ile kod tabanından üretilir; elle düzenlemeyin. Hukuki sebeplerin hepsi \`DOĞRULANMADI\`: kurumun hukuk birimi belirler. Kaynak kodları (K1...) için [kaynaklar.md](kaynaklar.md).

Kaynaklar: YZ sağlayıcı kataloğu (\`packages/yz/src/guvence/cikis-kapisi.ts\`), bağlayıcı dizinleri (\`packages/baglayicilar/src\`), veritabanı tabloları (\`packages/vt\`).

${tablo.join("\n")}
`;
}
