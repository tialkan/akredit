import { describe, expect, it } from "vitest";
import { type ParcaErisimi, raporDenetle } from "../src/index.ts";

// Uydurma kanıtlar; özetler elle yazılmış onaltılık dizelerdir.
const kanitlar = [
  { ozet: "1a2b3c4d".padEnd(64, "0"), ad: "kurul-tutanagi.pdf" },
  { ozet: "abcdef01".padEnd(64, "1"), ad: "anket.xlsx" },
  { ozet: "abcdef02".padEnd(64, "2"), ad: "anket-2.xlsx" },
];

const parca: ParcaErisimi = (onek, capa) =>
  onek === "1a2b3c4d" && capa?.sayfa === 3 ? "Danışma kurulu 12 Mart'ta toplandı ve müfredatı görüştü." : null;

const kurallar = (m: string, p?: ParcaErisimi) => raporDenetle(m, kanitlar, p).bulgular.map((b) => b.kural);

describe("rapor atıf denetimi", () => {
  it("geçerli atıf kanıta çıkar, kullanılan kanıt listelenir", () => {
    const s = raporDenetle("Kurul 12 kez toplandı [K:1A2B3C4D].\n\nİkinci kez [K:1a2b3c4d s.3].", kanitlar);
    expect(s.bulgular).toEqual([]);
    expect(s.kullanilanKanitlar).toEqual(["kurul-tutanagi.pdf"]);
  });

  it("geçersiz atıf hata verir", () => {
    const s = raporDenetle("Bir şey oldu [K:ffffff99].", kanitlar);
    expect(s.bulgular).toEqual([
      {
        duzey: "hata",
        kural: "atif-gecersiz",
        konu: "1",
        aciklama: "Paragraf 1: [K:ffffff99] hiçbir kanıta karşılık gelmiyor.",
      },
    ]);
  });

  it("belirsiz (çok eşleşen) atıf hata verir", () => {
    const s = raporDenetle("Başlık yok.\n\nAnket yapıldı [K:abcdef].", kanitlar);
    expect(s.bulgular[0]?.kural).toBe("atif-belirsiz");
    expect(s.bulgular[0]?.aciklama).toBe("Paragraf 2: [K:abcdef] birden fazla kanıta uyuyor.");
    expect(s.kullanilanKanitlar).toEqual([]);
  });

  it("alıntı parçada geçiyorsa temiz, geçmiyorsa hata", () => {
    // Tipografik tırnak ve büyük harf farkı normalleştirmeyle tolere edilir.
    expect(kurallar('Kurul toplandı [K:1a2b3c4d s.3 "DANIŞMA KURULU 12 Mart’ta toplandı"].', parca)).toEqual([]);
    expect(kurallar('Kurul toplandı [K:1a2b3c4d s.3 "kurul iptal edildi"].', parca)).toEqual(["alinti-gecmiyor"]);
  });

  it("alıntının konumunda metin yoksa ya da parça erişimi verilmemişse doğrulanamadı hatası", () => {
    expect(kurallar('Kurul toplandı [K:1a2b3c4d s.9 "kurul"].', parca)).toEqual(["alinti-dogrulanamadi"]);
    expect(kurallar('Kurul toplandı [K:1a2b3c4d s.3 "kurul"].')).toEqual(["alinti-dogrulanamadi"]);
  });

  it("tanınmayan konum yazımı uyarı verir", () => {
    const s = raporDenetle("Kurul toplandı [K:1a2b3c4d sayfa3].", kanitlar);
    expect(s.bulgular).toEqual([
      {
        duzey: "uyari",
        kural: "konum-taninmadi",
        konu: "1",
        aciklama: 'Paragraf 1: [K:1a2b3c4d] konum yazımı tanınmadı: "sayfa3".',
      },
    ]);
  });

  it("sayı içeren kaynaksız paragraf uyarı verir; yıl ve yıl aralığı sayılmaz; EKSİK işareti yeterlidir", () => {
    const metin = [
      "Programda 45 öğrenci var.",
      "2024 yılında ve 2023-2024 döneminde öz değerlendirme yapıldı.",
      "Mezun sayısı 30 [EKSİK: mezun listesi yok].",
      "Toplam 12 toplantı [eksik].",
    ].join("\n\n");
    const s = raporDenetle(metin, kanitlar);
    expect(s.bulgular).toHaveLength(1);
    expect(s.bulgular[0]).toMatchObject({ duzey: "uyari", kural: "sayi-kaynaksiz", konu: "1" });
    expect(s.bulgular[0]?.aciklama).toBe(
      'Paragraf 1: sayı içeriyor ama kaynak göstergesi yok: "Programda 45 öğrenci var.…"',
    );
    expect(s.eksikler).toEqual(["mezun listesi yok", ""]);
  });

  it("başlık, tablo ve kod blokları paragraf sayılmaz", () => {
    const metin = ["# 3. Bölüm 2", "| Ölçüt | 4 |\n|---|---|", "```\nx = 5 [K:ffffff99]\n```", "Düz metin."].join(
      "\n\n",
    );
    expect(raporDenetle(metin, kanitlar).bulgular).toEqual([]);
  });

  it("paragraf numarası boş satırlarla ayrılan bloklara göre sayılır", () => {
    const s = raporDenetle("Giriş.\n\n\n\nİkinci [K:000000].", kanitlar);
    expect(s.bulgular[0]?.konu).toBe("2");
  });
});
