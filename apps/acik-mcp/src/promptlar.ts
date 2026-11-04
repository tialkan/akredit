// MCP istemleri (prompts). İstemciler bunları eğik çizgi komutu ya da hazır başlangıç olarak gösterir.
// İstem asistana akışı tarif eder: kısa sorular, her adımda 2-3 numaralı seçenek, tek rakam ya da harfle seçim,
// toplu onay, sonunda kopyalanabilir çıktı. İstem metni veri değil asistana yönergedir; içinde hocanın girdisi
// yalnız isteğe bağlı kısa bağımsız değişkenler olarak yer alır (ders kodu, çerçeve) ve sınırlanır.

import { z } from "zod";

export interface AcikIstem {
  ad: string;
  baslik: string;
  aciklama: string;
  /** Bağımsız değişkenler: hepsi isteğe bağlı kısa metin. */
  argumanlar: Record<string, string>;
  metin: (a: Record<string, string | undefined>) => string;
}

/** Bütün istemlerde ortak çalışma biçimi. */
export const ORTAK_KURALLAR = [
  "Çalışma biçimi:",
  "- Hocanın dilini kullan: kısa, sade Türkçe. Araç adı, JSON ve teknik terim gösterme.",
  "- Her adımda tek kısa soru sor ve 2-3 numaralı seçenek ver. İlk seçenek önerilendir, yanına (önerilen) yaz.",
  '- Hoca tek rakam ya da harfle seçer. "sen seç" derse önerileni seç ve bunu söyle.',
  '- Toplu onayı kabul et: "hepsini 1 ile doldur", "hepsi A" gibi bir yanıt kalan bütün adımlara uygulanır; her adımı yeniden sorma.',
  "- Sunucu metin üretmez. Seçenek metinlerini sen yazarsın; sunucu kural verir, denetler ve sayıları hesaplar.",
  "- Sayıları (toplam, yüzde, iş yükü, sağlanma düzeyi) yalnız araç yanıtından al, kendin toplama.",
  "- Uydurma: kişi, kitap, ISBN, tarih, toplantı, sayı uydurma. Hocanın vermediği bilgi EKSİK kalır.",
  "- Kişisel veri gönderme: öğrenci adı ve numarası, hoca adı, e-posta, telefon. Öğrenciler için o1, o2 gibi takma ad kullan.",
  "- Her araç yanıtındaki sonrakiAdim önerisine uy.",
  "- Sonunda kopyalanabilir bir çıktı ver. Kaydı, onayı ve gönderimi hoca yapar; sen yapmazsın.",
].join("\n");

const kisa = (v: string | undefined, n = 40) =>
  v
    ? v
        .replace(/[\r\n`]/gu, " ")
        .trim()
        .slice(0, n)
    : "";

const ODAKLAR = [
  ["1", "Bologna ders paketini denetle ve boş alanları doldur", "bologna_doldur"],
  ["2", "Ders öğrenme çıktısı yaz ya da iyileştir", "cikti_yaz"],
  ["3", "ÇK ve PÇ sağlanma düzeyini hesapla", "ck_pc_hesabi"],
  ["4", "YÖKAK, MÜDEK, FEDEK, EPDAD ya da SABAK ölçüt ve kanıt rehberi", "olcut_rehberi"],
  ["5", "Öz değerlendirme metninin dil denetimi", "dil_denetimi"],
] as const;

const bolognaAkisi = (dersKodu: string) =>
  [
    `Odak: Bologna ders bilgi paketini denetle ve boş ya da zayıf alanları doldur.${dersKodu ? ` Ders: ${dersKodu}.` : ""}`,
    "",
    "Akış:",
    "1. Sayfayı al. Sor: Ders sayfasını nasıl alalım? 1) Bologna sayfasının adresini ver, kendi web aracımla okuyayım (önerilen, web aracın varsa) 2) Sayfanın kaynağını ya da metnini yapıştır 3) Sıfırdan: ders adı, AKTS ve T+U+L yeter.",
    "   Göndermeden önce Dersi Verenler, Dersin Yardımcıları ve yetkili satırlarını, kaynaklardaki yazar adlarını ve e-postaları çıkar.",
    "   HTML varsa bologna_ayristir ile çöz. Program çıktıları sayfası da varsa onu da ayrıştır ve P kodlarını sakla; P kodlarını asla ezberden yazma.",
    "2. Denetle. bologna_denetle'yi çağır. Sonucu tek tabloda göster: numara, alan, durum (boş, zayıf, tamam), kısa neden.",
    "   Sor: 1) hepsini sırayla dolduralım (önerilen) 2) yalnız boş olanlar 3) numaraları kendim seçeyim.",
    "3. Bağlam. Tek mesajda, eksikse sor: dersin odağı ve kullanılan araç ya da yöntem (2-3 seçenekle), uygulama ya da proje var mı (1 evet, 2 hayır). Bilinenleri yeniden sorma.",
    "4. Her alan için: bologna_alan_rehberi'ni çağır (iş yükü için AKTS ve T+U+L ile). Kurala uyan 2-3 kısa seçenek (A, B, C) yaz.",
    "   Seçenekleri bologna_taslak_denetle ile denetle; geçmeyeni düzelt, hocaya yalnız geçenleri göster. Uzun metinlerde yalnız ilk cümleyi ve kelime sayısını göster.",
    '   Hoca harfle seçer. "hepsi A" derse kalan alanlarda hep A seçeneğini kullan, ama yine de denetle.',
    "   İş yükünde saatleri sen önerirsin, toplamı ve hedefi araç hesaplar. AKTS'yi değiştirme.",
    "5. Kaynaklar ve Dersin Yetkilileri kişi adı içerir: hocadan OBS'de kendisinin yazmasını iste. Kaynak kitabı uydurma.",
    "6. Bitiş. bologna_kopya_metni ile seçilen bütün alanları al; metni kod bloğu içinde olduğu gibi göster.",
    "   Sor: 1) OBS'ye yapıştırdım, yeniden denetle 2) bir alanı değiştir 3) başka ders.",
  ].join("\n");

const ciktiAkisi = (dersKodu: string) =>
  [
    `Odak: ders öğrenme çıktısı yaz ya da iyileştir.${dersKodu ? ` Ders: ${dersKodu}.` : ""}`,
    "",
    "Akış:",
    "1. Sor: 1) mevcut çıktılarımı yapıştırayım, iyileştir (önerilen) 2) sıfırdan yaz: ders adı, AKTS, T+U+L ve kısa içerik vereyim.",
    "2. bologna_alan_rehberi'ni alan=ciktilar ile çağır: kurallar, Bloom fiilleri, 8-12 sınırı.",
    "3. Her çıktı için 2-3 seçenek (A, B, C) yaz: farklı Bloom düzeyi ya da farklı ölçme biçimi. Türünü (Bilgi, Beceri, Yetkinlik) yaz.",
    "4. Bütün listeyi bologna_taslak_denetle ile denetle (ciktilar alanı; İngilizce isteniyorsa en alanıyla). Geçmeyeni düzelt.",
    '5. Hoca her çıktı için harf seçer ya da "hepsi A" der. Sonra sor: program çıktısı katkısını da dolduralım mı? 1) evet, P kodlarını vereyim 2) hayır.',
    "6. bologna_kopya_metni ile Öğrenme Çıktıları sekmesine kopyalanacak metni ver.",
  ].join("\n");

const ckPcAkisi = (dersKodu: string) =>
  [
    `Odak: ÇK ve PÇ sağlanma düzeyi hesabı.${dersKodu ? ` Ders: ${dersKodu}.` : ""}`,
    "",
    "Akış:",
    "1. Sor: puanlar nerede? 1) Excel ya da tablo yapıştıracağım (önerilen) 2) adım adım birlikte girelim.",
    "2. Tablo için gereken sütunları tek mesajda söyle: öğrenci takma adı (o1, o2), sınav ya da ödev, soru numarası, puan. Ayrıca her sorunun tam puanı ve hangi ders çıktısını ölçtüğü, her ölçme aracının ders notundaki yüzdesi.",
    "   Tabloda ad ya da numara varsa göndermeden önce o1, o2 diye değiştir ve bunu hocaya söyle.",
    "3. Eksik eşleme varsa seçenekle sor: S3 hangi çıktıyı ölçüyor? 1) Ö2 2) Ö3 3) ikisi eşit.",
    "4. Eşik sor: 1) 60 (önerilen) 2) 50 3) başka.",
    "5. ck_pc_hesapla'yı çağır. Sonucu tablo olarak göster; sayıları yalnız yanıttan al.",
    "6. Sor: 1) eşiğin altındaki çıktılar için iyileştirme notu taslağı 2) farklı eşikle yeniden hesapla 3) bitir. Not taslağında sayı uydurma.",
  ].join("\n");

const olcutAkisi = (cerceve: string) =>
  [
    `Odak: ölçüt ve kanıt rehberi.${cerceve ? ` Çerçeve: ${cerceve}.` : ""}`,
    "",
    "Akış:",
    `1. ${cerceve ? "Çerçeve verildi, sorma." : "Sor: hangi çerçeve? 1) YÖKAK kurumsal (önerilen) 2) program akreditasyonu: MÜDEK, FEDEK, EPDAD ya da SABAK."}`,
    "2. Sor: ne arıyorsunuz? 1) bir ölçütün resmî metni 2) bir konuda hangi ölçütler var 3) öz değerlendirme iskeleti.",
    "3. olcut_ara ile ara, en uygun 2-3 sonucu numaralı göster. Hoca seçince olcut_getir ile resmî metni kaynağıyla göster.",
    "4. YÖKAK alt ölçütüyse olgunluk_duzeyleri ile düzeyleri ve örnek kanıtları göster. Her kanıt için sor: 1) var 2) yok 3) emin değilim. Yok olanlar EKSİK listesine girer.",
    "5. Programın disiplinini ya da programa özgü bölümünü sen tahmin etme; hocaya seçenek olarak sor.",
    "6. Ölçüt metnini yalnız araç yanıtından alıntıla. DOĞRULANMADI işaretli metni tahminle doldurma.",
    "7. Sonunda kopyalanabilir kanıt kontrol listesi ver: kanıt, durum (var, yok, EKSİK), not.",
  ].join("\n");

const dilAkisi = () =>
  [
    "Odak: öz değerlendirme ya da faaliyet raporu metninin dil denetimi.",
    "",
    "Akış:",
    "1. Hocadan metni yapıştırmasını iste. Kişi adı ve e-posta varsa göndermeden önce [KİŞİ-1] gibi maskele.",
    "2. Rapor dönemini sor: 1) 2025-2026 (önerilen) 2) başka.",
    "3. rapor_dil_denetle'yi çağır. Bulguları önem sırasıyla numaralı göster.",
    "4. Her bulgu için 2-3 düzeltme seçeneği (A, B, C) yaz. Kanıt ya da sayı ekleyen seçenekte, eklenecek şeyi hocadan iste; uydurma, gerekiyorsa EKSİK yaz.",
    '5. Hoca harfle seçer; "hepsi A" toplu onaydır. Düzeltilmiş metni yeniden denetle.',
    "6. Sonunda düzeltilmiş metnin tamamını kopyalanabilir biçimde ver.",
  ].join("\n");

const baslangic = (odak: string) => {
  const secilen = ODAKLAR.find(([no, , ad]) => odak === no || odak === ad);
  if (secilen) return AKISLAR[secilen[2]]?.({}) ?? "";
  return [
    "Akredit açık araçlarıyla hocaya yardım edeceksin. Önce odağı seçtir.",
    "",
    "Hocaya tam olarak şunu göster ve yanıtını bekle:",
    "",
    "Merhaba. Bugün neye odaklanalım? Numarasını yazmanız yeter.",
    ...ODAKLAR.map(([no, ad]) => `${no}) ${ad}`),
    "",
    "Seçime göre aşağıdaki akışlardan ilgili olanı izle:",
    "",
    ...ODAKLAR.map(([no, , ad]) => `Seçim ${no}:\n${AKISLAR[ad]?.({}) ?? ""}\n`),
  ].join("\n");
};

const AKISLAR: Record<string, (a: Record<string, string | undefined>) => string> = {
  bologna_doldur: (a) => bolognaAkisi(kisa(a.ders_kodu)),
  cikti_yaz: (a) => ciktiAkisi(kisa(a.ders_kodu)),
  ck_pc_hesabi: (a) => ckPcAkisi(kisa(a.ders_kodu)),
  olcut_rehberi: (a) => olcutAkisi(kisa(a.cerceve)),
  dil_denetimi: () => dilAkisi(),
};

const ile = (govde: string) => `${govde}\n\n${ORTAK_KURALLAR}`;

export const ACIK_ISTEMLER: readonly AcikIstem[] = [
  {
    ad: "baslangic",
    baslik: "Başlangıç: neye odaklanalım?",
    aciklama:
      "Akredit ile ilk adım. Odağınızı seçin: Bologna paketi, öğrenme çıktısı, ÇK/PÇ hesabı, ölçüt rehberi ya da dil denetimi.",
    argumanlar: { odak: "İsteğe bağlı: 1-5 arası odak numarası" },
    metin: (a) => ile(baslangic(kisa(a.odak, 20))),
  },
  {
    ad: "bologna_doldur",
    baslik: "Bologna paketini denetle ve doldur",
    aciklama:
      "Dersinizin Bologna paketindeki boş ve zayıf alanları bulur, her alan için seçenek sunar, OBS'ye kopyalanacak metni verir.",
    argumanlar: { ders_kodu: "İsteğe bağlı: ders kodu, ör. KRG101" },
    metin: (a) => ile(bolognaAkisi(kisa(a.ders_kodu))),
  },
  {
    ad: "cikti_yaz",
    baslik: "Öğrenme çıktısı yaz ya da iyileştir",
    aciklama: "Ders öğrenme çıktılarını ölçülebilir fiillerle yazar ya da iyileştirir; her çıktı için seçenek sunar.",
    argumanlar: { ders_kodu: "İsteğe bağlı: ders kodu" },
    metin: (a) => ile(ciktiAkisi(kisa(a.ders_kodu))),
  },
  {
    ad: "ck_pc_hesabi",
    baslik: "ÇK ve PÇ sağlanma hesabı",
    aciklama: "Takma adlı puan tablonuzdan ders ve program çıktısı sağlanma düzeyini hesaplar.",
    argumanlar: { ders_kodu: "İsteğe bağlı: ders kodu" },
    metin: (a) => ile(ckPcAkisi(kisa(a.ders_kodu))),
  },
  {
    ad: "olcut_rehberi",
    baslik: "Ölçüt ve kanıt rehberi",
    aciklama: "YÖKAK, MÜDEK, FEDEK, EPDAD ya da SABAK ölçütünü resmî metniyle bulur, kanıt kontrol listesi çıkarır.",
    argumanlar: { cerceve: "İsteğe bağlı: YÖKAK, MÜDEK, FEDEK, EPDAD ya da SABAK" },
    metin: (a) => ile(olcutAkisi(kisa(a.cerceve, 20))),
  },
  {
    ad: "dil_denetimi",
    baslik: "Öz değerlendirme dil denetimi",
    aciklama: "Rapor metnindeki kanıtsız üstünlük, belirsiz özne gibi sorunları bulur, düzeltme seçenekleri sunar.",
    argumanlar: {},
    metin: () => ile(dilAkisi()),
  },
];

/** SDK için bağımsız değişken şeması: hepsi isteğe bağlı, kısa metin. */
export const istemSemasi = (i: AcikIstem) =>
  Object.fromEntries(
    Object.entries(i.argumanlar).map(([k, d]) => [k, z.string().max(60).optional().describe(d)]),
  ) as Record<string, z.ZodOptional<z.ZodString>>;
