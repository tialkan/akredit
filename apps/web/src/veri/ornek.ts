// Kurgu örnek veri: "Örnek Üniversitesi", "Bilgisayar Programcılığı" önlisans programı.
// Bütün adlar, sayılar ve metinler uydurmadır; gerçek bir kurumu, kişiyi ya da resmî ölçütü temsil etmez.
// Ölçüt kodları ("Ö-1" ...) yer tutucudur; resmî ölçüt metinleri İP-11'de resmî belgeden gelecek.
// Veri belirlenimcidir: rastgelelik ve gerçek saat kullanılmaz.

import type {
  Cikti,
  CiktiId,
  IsoZaman,
  Kanit,
  KanitAtfi,
  KanitId,
  KanitParcasi,
  KisiId,
  KurumId,
  MatrisDegeri,
  OneriId,
  OneriTuru,
  Ozet,
  ParcaId,
  RiskDuzeyi,
} from "@akredit/cekirdek";
import type { Ayarlar, Ders, KanitGorunumu, Kullanici, OneriGorunumu, Program, Rapor, SurecGorevi } from "./kaynak.ts";

/** Örnek verinin "şimdi"si. */
export const ORNEK_SIMDI: IsoZaman = "2026-10-27T09:00:00.000Z";
export const ORNEK_KURUM = "kurum-ornek" as KurumId;

export const ORNEK_KULLANICI: Kullanici = {
  id: "kisi-ornek-1" as KisiId,
  ad: "Dr. Öğr. Üyesi Deniz Örnek",
  unvan: "Program sorumlusu",
};

/** Belirlenimci 64 karakterlik onaltılık dize (örnek özet; gerçek SHA-256 değildir). */
export function ornekOzet(tohum: string): Ozet {
  let h = 2166136261;
  let cikti = "";
  for (let tur = 0; cikti.length < 64; tur++) {
    for (const c of `${tohum}:${tur}`) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
    cikti += h.toString(16).padStart(8, "0");
  }
  return cikti.slice(0, 64) as Ozet;
}

export const OLCUTLER = ["Ö-1", "Ö-2", "Ö-3", "Ö-4", "Ö-5", "Ö-6", "Ö-7", "Ö-8"] as const;

// ---------- Program ve dersler ----------

const PROGRAM_ID = "prog-bp";

const pcMetinleri = [
  "Temel programlama yapılarını kullanarak problem çözer.",
  "Veri tabanı tasarlar ve sorgular.",
  "Web sayfası tasarlar ve yayımlar.",
  "Nesne tabanlı yaklaşımla uygulama geliştirir.",
  "Bilgisayar ağlarının temel kavramlarını açıklar.",
  "Ekip içinde sorumluluk alır ve meslek etiğine uyar.",
];

const programCiktilari: Cikti[] = pcMetinleri.map((metin, i) => ({
  id: `pc-${i + 1}` as CiktiId,
  tur: "program",
  sahipId: PROGRAM_ID,
  kod: `PÇ${i + 1}`,
  metin,
  surum: 1,
  oncekiSurumId: null,
}));

const dersTanimlari: { id: string; kod: string; ad: string; akts: number; yariyil: number; dc: string[] }[] = [
  {
    id: "ders-bp101",
    kod: "BP101",
    ad: "Algoritma ve Programlamaya Giriş",
    akts: 6,
    yariyil: 1,
    dc: ["Algoritma kavramını açıklar.", "Akış şeması çizer.", "Döngü ve koşul yapılarını kullanır."],
  },
  {
    id: "ders-bp103",
    kod: "BP103",
    ad: "Web Tasarımının Temelleri",
    akts: 5,
    yariyil: 1,
    dc: ["Sayfa iskeletini oluşturur.", "Biçim kurallarını uygular.", "Erişilebilir sayfa hazırlar."],
  },
  {
    id: "ders-bp105",
    kod: "BP105",
    ad: "Ofis Yazılımları",
    akts: 3,
    yariyil: 1,
    dc: ["Belge biçimlendirir.", "Hesap tablosunda formül kullanır.", "Sunum hazırlar."],
  },
  {
    id: "ders-bp102",
    kod: "BP102",
    ad: "Veri Tabanı Yönetimi",
    akts: 6,
    yariyil: 2,
    dc: ["Varlık ilişki çizeneği hazırlar.", "Tablo oluşturur.", "Birleştirmeli sorgu yazar."],
  },
  {
    id: "ders-bp104",
    kod: "BP104",
    ad: "Nesne Tabanlı Programlama",
    akts: 6,
    yariyil: 2,
    dc: ["Sınıf ve nesne tanımlar.", "Kalıtım kullanır.", "Küçük bir uygulama geliştirir."],
  },
  {
    id: "ders-bp106",
    kod: "BP106",
    ad: "Ağ Temelleri",
    akts: 4,
    yariyil: 2,
    dc: ["Ağ katmanlarını açıklar.", "Adresleme yapar.", "Basit bir ağ kurar."],
  },
];

/** Katkı puanı, ders ve çıktı sırasından türetilir (belirlenimci örnek). */
function ornekMatrisDegeri(d: number, c: number, p: number): MatrisDegeri {
  const v = (d * 7 + c * 3 + p * 5) % 9;
  if (v === 0) return { tur: "yetersiz_kanit" };
  if (v > 5) return { tur: "iliskisiz" };
  return { tur: "puan", puan: v as 1 | 2 | 3 | 4 | 5 };
}

const BOLOGNA_DURUMU: Ders["bolognaDurumu"][] = ["guncel", "guncel", "eksik", "onay_bekliyor", "guncel", "eksik"];
const BOLOGNA_NOTU: Record<Ders["bolognaDurumu"], string> = {
  guncel: "Ders bilgi paketi bu dönem için güncel.",
  eksik: "Haftalık konular ve iş yükü tablosu eksik.",
  onay_bekliyor: "Güncelleme taslağı onay kutusunda bekliyor.",
};

export const DERSLER: Ders[] = dersTanimlari.map((t, d) => ({
  id: t.id,
  kod: t.kod,
  ad: t.ad,
  akts: t.akts,
  yariyil: t.yariyil,
  ciktilar: t.dc.map((metin, c) => ({
    id: `${t.id}-dc${c + 1}` as CiktiId,
    tur: "ders",
    sahipId: t.id,
    kod: `DÇ${c + 1}`,
    metin,
    surum: 1,
    oncekiSurumId: null,
  })),
  bolognaDurumu: BOLOGNA_DURUMU[d] ?? "guncel",
  bolognaNotu: BOLOGNA_NOTU[BOLOGNA_DURUMU[d] ?? "guncel"],
  dersDosyasi: [
    { ad: "Ders izlencesi", tamam: true },
    { ad: "Sınav soruları ve cevap anahtarı", tamam: d % 2 === 0 },
    { ad: "Not listesi", tamam: true },
    { ad: "Ölçme değerlendirme raporu", tamam: d % 3 === 0 },
  ],
  olcme: t.dc.map((_, c) => ({
    ciktiId: `${t.id}-dc${c + 1}`,
    kod: `DÇ${c + 1}`,
    saglanma: (40 + ((d * 13 + c * 17) % 50)) / 100,
  })),
}));

export const PROGRAMLAR: Program[] = [
  {
    id: PROGRAM_ID,
    ad: "Bilgisayar Programcılığı",
    duzey: "onlisans",
    birim: "Örnek Meslek Yüksekokulu",
    ciktilar: programCiktilari,
    dersIdleri: DERSLER.map((d) => d.id),
    matris: DERSLER.flatMap((ders, d) =>
      ders.ciktilar.flatMap((dc, c) =>
        programCiktilari.map((pc, p) => ({
          dersCiktisiId: dc.id,
          programCiktisiId: pc.id,
          deger: ornekMatrisDegeri(d, c, p),
        })),
      ),
    ),
    olcme: programCiktilari.map((pc, p) => ({
      ciktiId: pc.id,
      kod: pc.kod,
      saglanma: [0.72, 0.64, 0.81, 0.55, 0.47, 0.69][p] ?? 0,
    })),
    esik: 0.6,
  },
];

// ---------- Kanıtlar ----------

interface KanitTanimi {
  dosya: string;
  baslik: string;
  mime: string;
  kaynak: Kanit["kaynakTuru"];
  tarih: string;
  olcutler: string[];
  parcalar: string[];
}

const PDF = "application/pdf";
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const kanitTanimlari: KanitTanimi[] = [
  {
    dosya: "bp101-izlence-2026-guz.pdf",
    baslik: "BP101 ders izlencesi",
    mime: PDF,
    kaynak: "yukleme",
    tarih: "2026-09-15",
    olcutler: ["Ö-3"],
    parcalar: [
      "Dersin amacı öğrencilere algoritma kurma ve temel programlama becerisi kazandırmaktır.",
      "Değerlendirme: ara sınav yüzde 40, dönem sonu sınavı yüzde 60 ağırlıklıdır.",
      "Haftalık konular: değişkenler, koşullar, döngüler, diziler ve işlevler.",
    ],
  },
  {
    dosya: "bp101-ara-sinav-sorulari.pdf",
    baslik: "BP101 ara sınav soruları",
    mime: PDF,
    kaynak: "yukleme",
    tarih: "2026-11-10",
    olcutler: ["Ö-4"],
    parcalar: [
      "Soru 1: Verilen sayının asal olup olmadığını bulan akış şemasını çiziniz.",
      "Soru 2: Bir dizideki en büyük elemanı bulan döngüyü yazınız.",
      "Soru 3: İç içe koşul yapısının çıktısını adım adım gösteriniz.",
    ],
  },
  {
    dosya: "bolum-kurulu-tutanagi-2026-09.pdf",
    baslik: "Bölüm kurulu tutanağı, Eylül 2026",
    mime: PDF,
    kaynak: "eposta",
    tarih: "2026-09-08",
    olcutler: ["Ö-1", "Ö-2"],
    parcalar: [
      "Gündem 1: Güz dönemi ders görevlendirmeleri görüşüldü ve kabul edildi.",
      "Gündem 2: Program çıktılarının gözden geçirilmesi için çalışma grubu kuruldu.",
      "Gündem 3: Danışma kurulu toplantısının Kasım ayında yapılmasına karar verildi.",
    ],
  },
  {
    dosya: "danisma-kurulu-2026-05.docx",
    baslik: "Danışma kurulu toplantı notları, Mayıs 2026",
    mime: DOCX,
    kaynak: "yukleme",
    tarih: "2026-05-20",
    olcutler: ["Ö-2"],
    parcalar: [
      "Sektör temsilcileri veri tabanı becerilerinin önemini vurguladı.",
      "Staj sürelerinin uzatılması önerisi değerlendirildi.",
      "Bir sonraki toplantıda müfredat değişikliği taslağının sunulması istendi.",
    ],
  },
  {
    dosya: "mezun-anketi-ozeti-2026.xlsx",
    baslik: "Mezun anketi özeti 2026",
    mime: XLSX,
    kaynak: "uretilen",
    tarih: "2026-07-01",
    olcutler: ["Ö-5"],
    parcalar: [
      "Yanıtlayan mezun sayısı 48, yanıt oranı yüzde 31.",
      "Mezunların yüzde 62'si alanında çalıştığını belirtti.",
      "En çok istenen ek konu: bulut hizmetleri.",
    ],
  },
  {
    dosya: "staj-degerlendirme-formlari-2026.pdf",
    baslik: "Staj değerlendirme formları 2026",
    mime: PDF,
    kaynak: "yukleme",
    tarih: "2026-09-01",
    olcutler: ["Ö-5", "Ö-6"],
    parcalar: [
      "İş yeri yetkilileri öğrencilerin ekip çalışmasını genel olarak iyi buldu.",
      "Belgeleme alışkanlığının geliştirilmesi önerildi.",
      "Değerlendirilen öğrenci sayısı 37.",
    ],
  },
  {
    dosya: "bp102-izlence-2026-bahar.pdf",
    baslik: "BP102 ders izlencesi",
    mime: PDF,
    kaynak: "baglayici",
    tarih: "2026-02-10",
    olcutler: ["Ö-3"],
    parcalar: [
      "Ders, ilişkisel veri tabanı tasarımı ve sorgulamasını kapsar.",
      "Proje ödevi: küçük bir işletme için veri tabanı tasarlanması.",
      "Haftalık konular: tablolar, anahtarlar, birleştirmeler, görünümler.",
    ],
  },
  {
    dosya: "bp102-proje-yonergesi.pdf",
    baslik: "BP102 proje yönergesi",
    mime: PDF,
    kaynak: "yukleme",
    tarih: "2026-03-01",
    olcutler: ["Ö-4"],
    parcalar: [
      "Proje grupları en çok üç kişiden oluşur.",
      "Teslim edilecekler: varlık ilişki çizeneği, tablo tanımları ve beş sorgu.",
      "Değerlendirme ölçütleri rubrik ile ekte verilmiştir.",
    ],
  },
  {
    dosya: "bp103-uygulama-odevleri.pdf",
    baslik: "BP103 uygulama ödevleri",
    mime: PDF,
    kaynak: "yukleme",
    tarih: "2026-10-05",
    olcutler: ["Ö-4"],
    parcalar: [
      "Ödev 1: Kişisel tanıtım sayfası hazırlayınız.",
      "Ödev 2: Sayfanızı klavyeyle gezilebilir hale getiriniz.",
      "Ödev 3: Renk karşıtlığını ölçüp raporlayınız.",
    ],
  },
  {
    dosya: "bp104-sinav-analizi.xlsx",
    baslik: "BP104 sınav madde analizi",
    mime: XLSX,
    kaynak: "uretilen",
    tarih: "2026-06-20",
    olcutler: ["Ö-4"],
    parcalar: [
      "Madde güçlük indeksleri 0,35 ile 0,82 arasında.",
      "Üç maddenin ayırt edicilik indeksi 0,20'nin altında.",
      "Analize 64 öğrencinin cevapları alındı.",
    ],
  },
  {
    dosya: "bp105-izlence-2026-guz.pdf",
    baslik: "BP105 ders izlencesi",
    mime: PDF,
    kaynak: "baglayici",
    tarih: "2026-09-15",
    olcutler: ["Ö-3"],
    parcalar: [
      "Ders, kelime işlemci, hesap tablosu ve sunum yazılımlarını kapsar.",
      "Uygulamalar laboratuvarda yapılır.",
      "Değerlendirme: uygulama sınavı yüzde 50, dönem sonu yüzde 50.",
    ],
  },
  {
    dosya: "bp106-laboratuvar-foyleri.pdf",
    baslik: "BP106 laboratuvar föyleri",
    mime: PDF,
    kaynak: "yukleme",
    tarih: "2026-03-15",
    olcutler: ["Ö-4", "Ö-7"],
    parcalar: [
      "Föy 1: Kablo hazırlama ve test.",
      "Föy 2: Alt ağlara bölme alıştırmaları.",
      "Föy 3: Küçük bir yerel ağın kurulması.",
    ],
  },
  {
    dosya: "laboratuvar-envanteri-2026.xlsx",
    baslik: "Laboratuvar envanteri 2026",
    mime: XLSX,
    kaynak: "yukleme",
    tarih: "2026-08-30",
    olcutler: ["Ö-7"],
    parcalar: [
      "Bilgisayar laboratuvarında 30 öğrenci bilgisayarı bulunmaktadır.",
      "Ağ laboratuvarında 6 anahtar ve 4 yönlendirici vardır.",
      "Bilgisayarların 12'si 2026 yılında yenilendi.",
    ],
  },
  {
    dosya: "ogrenci-memnuniyet-anketi-2026-bahar.xlsx",
    baslik: "Öğrenci memnuniyet anketi, Bahar 2026",
    mime: XLSX,
    kaynak: "uretilen",
    tarih: "2026-06-30",
    olcutler: ["Ö-5"],
    parcalar: [
      "Ankete 112 öğrenci katıldı.",
      "Laboratuvar olanaklarına memnuniyet ortalaması 3,4 / 5.",
      "Danışmanlık hizmetine memnuniyet ortalaması 3,9 / 5.",
    ],
  },
  {
    dosya: "akademik-danismanlik-raporu-2026.docx",
    baslik: "Akademik danışmanlık raporu 2026",
    mime: DOCX,
    kaynak: "yukleme",
    tarih: "2026-07-15",
    olcutler: ["Ö-6"],
    parcalar: [
      "Her danışman dönemde en az iki görüşme yaptı.",
      "Devamsızlık riski taşıyan öğrencilerle ek görüşmeler planlandı.",
      "Görüşme kayıtları danışmanlık sisteminde tutuldu.",
    ],
  },
  {
    dosya: "program-ciktilari-guncelleme-taslagi.docx",
    baslik: "Program çıktıları güncelleme taslağı",
    mime: DOCX,
    kaynak: "uretilen",
    tarih: "2026-10-01",
    olcutler: ["Ö-1"],
    parcalar: [
      "PÇ2 metnine sorgu yazma becerisi açıkça eklenmiştir.",
      "PÇ6 metni etik ve ekip çalışması olarak iki bölüme ayrılmıştır.",
      "Taslak bölüm kurulunun görüşüne sunulacaktır.",
    ],
  },
  {
    dosya: "is-yeri-egitimi-protokolu.pdf",
    baslik: "İş yeri eğitimi protokolü",
    mime: PDF,
    kaynak: "eposta",
    tarih: "2026-04-12",
    olcutler: ["Ö-2", "Ö-5"],
    parcalar: [
      "Protokol örnek bir yazılım firması ile imzalanmıştır.",
      "Her yıl en çok 10 öğrenci iş yeri eğitimi alabilir.",
      "Protokol süresi iki yıldır.",
    ],
  },
  {
    dosya: "ogretim-elemani-egitimi-katilim.pdf",
    baslik: "Öğretim elemanı eğitimi katılım listesi",
    mime: PDF,
    kaynak: "yukleme",
    tarih: "2026-02-25",
    olcutler: ["Ö-8"],
    parcalar: [
      "Eğitim konusu: ölçme ve değerlendirmede rubrik kullanımı.",
      "Eğitime programdan 5 öğretim elemanı katıldı.",
      "Eğitim süresi 6 saattir.",
    ],
  },
  {
    dosya: "kalite-komisyonu-tutanagi-2026-06.pdf",
    baslik: "Birim kalite komisyonu tutanağı, Haziran 2026",
    mime: PDF,
    kaynak: "eposta",
    tarih: "2026-06-12",
    olcutler: ["Ö-1", "Ö-8"],
    parcalar: [
      "Birim öz değerlendirme takvimi görüşüldü.",
      "Kanıt toplama sorumluları belirlendi.",
      "Bir sonraki toplantı Eylül ayında yapılacaktır.",
    ],
  },
  {
    dosya: "bologna-bp106-2026.pdf",
    baslik: "BP106 ders bilgi paketi çıktısı",
    mime: PDF,
    kaynak: "baglayici",
    tarih: "2026-09-20",
    olcutler: ["Ö-3"],
    parcalar: [
      "AKTS: 4. Yerel kredi: 3.",
      "Dersin ön koşulu yoktur.",
      "Haftalık konular bölümünde 9-14. haftalar boş bırakılmıştır.",
    ],
  },
];

export const KANITLAR: KanitGorunumu[] = kanitTanimlari.map((t, i) => ({
  id: `kanit-${String(i + 1).padStart(2, "0")}` as KanitId,
  kurumId: ORNEK_KURUM,
  ozet: ornekOzet(t.dosya),
  dosyaAdi: t.dosya,
  mime: t.mime,
  boyut: 40_000 + i * 7_919,
  kaynakTuru: t.kaynak,
  kaynakAyrinti: {},
  belgeTarihi: t.tarih,
  kapsamlar: [{ tur: "program", id: PROGRAM_ID }],
  eklenme: `${t.tarih}T10:00:00.000Z`,
  kisiselVeri: "yok",
  baslik: t.baslik,
  olcutler: t.olcutler,
}));

export const PARCALAR: KanitParcasi[] = kanitTanimlari.flatMap((t, i) =>
  t.parcalar.map((metin, s) => ({
    id: `parca-${i + 1}-${s + 1}` as ParcaId,
    kanitId: `kanit-${String(i + 1).padStart(2, "0")}` as KanitId,
    sira: s + 1,
    capa: { sayfa: s + 1 },
    metin,
  })),
);

/** Kanıtın `s`. parçasına (1'den) atıf; alıntı parçanın ilk cümlesinden birebir alınır. */
export function ornekAtif(kanitSirasi: number, parcaSirasi: number): KanitAtfi {
  const parca = PARCALAR.find((p) => p.id === `parca-${kanitSirasi}-${parcaSirasi}`);
  if (!parca) throw new Error(`Örnek veride parça yok: ${kanitSirasi}-${parcaSirasi}`);
  const alinti = parca.metin.length > 90 ? `${parca.metin.slice(0, 90).trimEnd()}` : parca.metin;
  return { kanitId: parca.kanitId, parcaId: parca.id, capa: parca.capa, alinti };
}

// ---------- Öneriler ----------

interface OneriTaslagi {
  tur: OneriTuru;
  risk: RiskDuzeyi;
  baslik: string;
  metin: string;
  gerekce: string;
  konum: string;
  hedef: { tur: string; id: string };
  atiflar: KanitAtfi[];
  guven: number | null;
}

function oneriTaslaklari(): OneriTaslagi[] {
  const sonuc: OneriTaslagi[] = [];
  // Düşük risk: her kanıt için ölçüt etiketi önerisi (20 öneri).
  KANITLAR.forEach((k, i) => {
    sonuc.push({
      tur: "kanit_etiketi",
      risk: "dusuk",
      baslik: `"${k.baslik}" kanıtını ${k.olcutler.join(", ")} ölçütüne bağla`,
      metin: `Bu kanıt ${k.olcutler.join(" ve ")} kapsamında kanıt olarak etiketlensin.`,
      gerekce: "Belgenin içeriği ölçütün kanıt gereksinimiyle örtüşüyor.",
      konum: "Kanıt arşivi",
      hedef: { tur: "kanit", id: k.id },
      atiflar: [ornekAtif(i + 1, 1)],
      guven: 0.7 + ((i * 7) % 29) / 100,
    });
  });
  // Orta risk: matris katkı önerileri (18 öneri).
  DERSLER.forEach((ders, d) => {
    for (let c = 0; c < 3; c++) {
      const dc = ders.ciktilar[c];
      const pc = programCiktilari[(d + c) % programCiktilari.length];
      if (!dc || !pc) continue;
      const puan = ((d + c) % 4) + 2;
      const kanitSirasi = [1, 9, 11, 7, 10, 12][d] ?? 1;
      sonuc.push({
        tur: "matris_katkisi",
        risk: "orta",
        baslik: `${ders.kod} ${dc.kod} → ${pc.kod} katkısı: ${puan}`,
        metin: `${ders.kod} dersinin ${dc.kod} çıktısının ${pc.kod} çıktısına katkısı ${puan} puan olarak işlensin.`,
        gerekce: "Ders izlencesindeki konular ve ölçme araçları bu program çıktısıyla ilişkili.",
        konum: `${ders.kod} ${ders.ad}`,
        hedef: { tur: "cikti_cifti", id: `${dc.id}|${pc.id}` },
        atiflar: [ornekAtif(kanitSirasi, (c % 3) + 1)],
        guven: 0.55 + ((d * 11 + c * 5) % 40) / 100,
      });
    }
  });
  // Yüksek risk: olgunluk düzeyi, yazma planı ve dış gönderim (16 öneri).
  OLCUTLER.forEach((olcut, i) => {
    const duzey = (i % 4) + 2;
    const kanitSirasi = [3, 4, 1, 2, 5, 15, 13, 18][i] ?? 1;
    sonuc.push({
      tur: "olgunluk_duzeyi",
      risk: "yuksek",
      baslik: `${olcut} için olgunluk düzeyi: ${duzey}`,
      metin: `${olcut} ölçütünde program olgunluk düzeyi ${duzey} olarak beyan edilsin.`,
      gerekce: "Kanıtlar planlama ve uygulama adımlarının yapıldığını gösteriyor; izleme kanıtı sınırlı.",
      konum: "Program öz değerlendirmesi",
      hedef: { tur: "olcut", id: olcut },
      atiflar: i === 7 ? [] : [ornekAtif(kanitSirasi, 2)],
      guven: 0.5 + ((i * 9) % 40) / 100,
    });
  });
  for (let i = 0; i < 4; i++) {
    sonuc.push({
      tur: "yazma_plani",
      risk: "yuksek",
      baslik: `Öz değerlendirme raporu bölüm ${i + 1} yazma planı`,
      metin: `Bölüm ${i + 1} için ana başlıklar ve kullanılacak kanıtlar bu plana göre yazılsın.`,
      gerekce: "Bölümün ölçütlerine bağlı kanıtlar gruplandı.",
      konum: "Program öz değerlendirme raporu",
      hedef: { tur: "rapor_bolumu", id: `rapor-odr-b${i + 1}` },
      atiflar: [ornekAtif(19, 1), ornekAtif(16, 3)],
      guven: 0.62 + i * 0.05,
    });
  }
  for (let i = 0; i < 4; i++) {
    sonuc.push({
      tur: "dis_gonderim",
      risk: "yuksek",
      baslik: `Ders bilgi paketi güncellemesini gönder (${DERSLER[i]?.kod ?? ""})`,
      metin: "Onaylanan ders bilgi paketi güncellemesi üniversite bilgi sistemine gönderilsin.",
      gerekce: "Güncelleme taslağı hazır; son gönderim kişinin kararıdır.",
      konum: `${DERSLER[i]?.kod ?? ""} ${DERSLER[i]?.ad ?? ""}`,
      hedef: { tur: "ders", id: DERSLER[i]?.id ?? "" },
      atiflar: [ornekAtif(20, 3)],
      guven: null,
    });
  }
  return sonuc;
}

export function ornekOneriler(): OneriGorunumu[] {
  return oneriTaslaklari().map((t, i) => ({
    id: `oneri-${String(i + 1).padStart(3, "0")}` as OneriId,
    kurumId: ORNEK_KURUM,
    tur: t.tur,
    hedef: t.hedef,
    icerik: { baslik: t.baslik, metin: t.metin },
    gerekce: t.gerekce,
    atiflar: t.atiflar,
    guven: t.guven === null ? null : Math.round(t.guven * 100) / 100,
    uretici:
      t.tur === "kanit_etiketi"
        ? { tur: "kural", kural: "kanit-olcut-esleme", surum: "1" }
        : { tur: "yz", model: "ornek-model", istemOzeti: ornekOzet(t.baslik).slice(0, 16) },
    risk: t.risk,
    olusturma: `2026-10-2${i % 7}T08:00:00.000Z`,
    konum: t.konum,
  }));
}

// ---------- Raporlar ----------

export const RAPORLAR: Rapor[] = [
  {
    id: "rapor-odr",
    ad: "Program öz değerlendirme raporu (taslak)",
    donem: "2026-2027",
    durum: "taslak",
    bolumler: [
      {
        id: "rapor-odr-b1",
        baslik: "Program yönetimi ve paydaş katılımı",
        olcut: "Ö-1",
        paragraflar: [
          {
            metin: "Program çıktılarının gözden geçirilmesi için bölüm kurulunda bir çalışma grubu kuruldu.",
            atiflar: [ornekAtif(3, 2)],
            eksik: false,
          },
          {
            metin: "Birim kalite komisyonu öz değerlendirme takvimini görüştü.",
            atiflar: [ornekAtif(19, 1)],
            eksik: false,
          },
          {
            metin: "Çalışma grubunun önerilerinin uygulanma durumuna ilişkin izleme kaydı bulunamadı.",
            atiflar: [],
            eksik: true,
          },
        ],
      },
      {
        id: "rapor-odr-b2",
        baslik: "Dış paydaşlarla iş birliği",
        olcut: "Ö-2",
        paragraflar: [
          {
            metin: "Danışma kurulunda sektör temsilcileri veri tabanı becerilerinin önemini vurguladı.",
            atiflar: [ornekAtif(4, 1)],
            eksik: false,
          },
          {
            metin: "Programın bir yazılım firmasıyla iş yeri eğitimi protokolü bulunmaktadır.",
            atiflar: [ornekAtif(17, 1)],
            eksik: false,
          },
        ],
      },
      {
        id: "rapor-odr-b3",
        baslik: "Öğrenci geri bildirimi",
        olcut: "Ö-5",
        paragraflar: [
          {
            metin: "Bahar döneminde öğrenci memnuniyet anketi uygulandı.",
            atiflar: [ornekAtif(14, 1)],
            eksik: false,
          },
          {
            metin: "Anket sonuçlarına göre alınan önlemler ve etkileri.",
            atiflar: [],
            eksik: true,
          },
        ],
      },
    ],
  },
  {
    id: "rapor-olcme-bp102",
    ad: "BP102 ölçme değerlendirme raporu (taslak)",
    donem: "2025-2026 Bahar",
    durum: "incelemede",
    bolumler: [
      {
        id: "rapor-olcme-b1",
        baslik: "Ölçme araçları",
        olcut: "Ö-4",
        paragraflar: [
          {
            metin: "Derste proje ödevi ve rubrik ile değerlendirme kullanıldı.",
            atiflar: [ornekAtif(8, 3)],
            eksik: false,
          },
          {
            metin: "Proje teslimleri varlık ilişki çizeneği, tablo tanımları ve beş sorgudan oluştu.",
            atiflar: [ornekAtif(8, 2)],
            eksik: false,
          },
        ],
      },
      {
        id: "rapor-olcme-b2",
        baslik: "İyileştirme önerileri",
        olcut: "Ö-4",
        paragraflar: [{ metin: "Bir sonraki dönem için iyileştirme kararları.", atiflar: [], eksik: true }],
      },
    ],
  },
];

// ---------- Süreçler ----------

export const SURECLER: SurecGorevi[] = [
  {
    id: "g1",
    baslik: "BP106 ders bilgi paketini tamamla",
    sonTarih: "2026-10-31",
    sorumlu: "Ders sorumlusu",
    durum: "devam",
    ilgili: "BP106",
  },
  {
    id: "g2",
    baslik: "Danışma kurulu toplantısı",
    sonTarih: "2026-11-12",
    sorumlu: "Program sorumlusu",
    durum: "bekliyor",
    ilgili: "Ö-2",
  },
  {
    id: "g3",
    baslik: "Ara sınav sorularını ders dosyasına ekle",
    sonTarih: "2026-11-20",
    sorumlu: "Ders sorumluları",
    durum: "bekliyor",
    ilgili: "Ders dosyası",
  },
  {
    id: "g4",
    baslik: "Öz değerlendirme raporu bölüm 1 incelemesi",
    sonTarih: "2026-12-01",
    sorumlu: "Kalite komisyonu",
    durum: "bekliyor",
    ilgili: "Ö-1",
  },
  {
    id: "g5",
    baslik: "Güz dönemi öğrenci anketi",
    sonTarih: "2027-01-10",
    sorumlu: "Birim kalite sorumlusu",
    durum: "bekliyor",
    ilgili: "Ö-5",
  },
  {
    id: "g6",
    baslik: "Program çıktıları güncelleme taslağını kurula sun",
    sonTarih: "2026-10-20",
    sorumlu: "Program sorumlusu",
    durum: "tamam",
    ilgili: "Ö-1",
  },
];

export function ornekAyarlar(): Ayarlar {
  return {
    kurumAdi: "Örnek Üniversitesi",
    kurumKisaAdi: "ÖÜ",
    yzSaglayici: "kurum_sunucusu",
    yurtDisiIzni: false,
    webArama: { acik: false, enCokSonuc: 5 },
    yzAnahtar: null,
    politikalar: [
      {
        id: "politika-1",
        ad: "Kanıt etiketleri",
        kapsam: { oneriTurleri: ["kanit_etiketi"], enYuksekRisk: "dusuk", enDusukGuven: 0.9 },
        durum: "imzali",
        olusturan: ORNEK_KULLANICI.ad,
        olusturma: "2026-10-01T09:00:00.000Z",
        imzalayan: ORNEK_KULLANICI.ad,
        imzaZamani: "2026-10-01T09:05:00.000Z",
      },
    ],
  };
}

/** Bu dönem verilmiş kararlar için örnek sayılar (panelde "harcadığınız süre" kutusu). */
export const ORNEK_DONEM = { oncekiKararSayisi: 42, kararBasinaSaniye: 20 };
