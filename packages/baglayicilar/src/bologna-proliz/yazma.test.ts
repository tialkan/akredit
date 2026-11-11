// Proliz'e geri yazma (İP-38), birim testleri: bellek sayfasıyla, tarayıcı gerekmez. Gerçek Chromium'lu
// uçtan uca test yazma.tarayici.test.ts dosyasındadır (`test:tarayici`). Adlar uydurmadır.

import { describe, expect, it } from "vitest";
import {
  alanSecicisi,
  type DuzenlemeSayfasi,
  type KaynakYazmaAlani,
  prolizaYaz,
  VARSAYILAN_PROLIZ_SECICILERI,
} from "./yazma.ts";

const PLAN: KaynakYazmaAlani[] = [
  { sekme: "Genel", alan: "Dersin Amacı", deger: "Veri tabanı tasarımını öğretmek." },
  { sekme: "Genel", alan: "Dersin İçeriği", deger: "İlişkisel model, SQL, normalizasyon." },
  { sekme: "Genel", alan: "Ön Koşul", deger: "Yok" },
  { sekme: "Öğrenme Çıktıları", alan: "Ö1", deger: "İlişkisel şema tasarlar." },
  { sekme: "Ders Akışı", alan: "1. Hafta Konu", deger: "Giriş ve kavramlar" },
  // Seçicisi tanımlı değil: yazılmaz.
  { sekme: "Değerlendirme", alan: "Ara Sınav", deger: "1 adet, %40" },
  // Giriş bilgisi alanı: hiçbir koşulda yazılmaz.
  { sekme: "Genel", alan: "Şifre", deger: "x" },
];

/** Bellek sayfası: kayıtlı değerler, yazılan ama kaydedilmemiş değerler kaydet'e kadar ayrı. */
function bellekSayfa(baslangic: Record<string, string>, secenek: { bozukKayit?: string } = {}) {
  const kayitli = { ...baslangic };
  let taslak = { ...kayitli };
  const yazilan: string[] = [];
  let kayit = 0;
  const sayfa: DuzenlemeSayfasi = {
    async ac() {
      taslak = { ...kayitli };
    },
    async sekme() {},
    async oku(s) {
      return s in taslak ? (taslak[s] as string) : null;
    },
    async yaz(s, d) {
      yazilan.push(s);
      taslak[s] = d;
    },
    async kaydet() {
      kayit++;
      Object.assign(kayitli, taslak);
      if (secenek.bozukKayit) kayitli[secenek.bozukKayit] = "sunucu değiştirdi";
    },
  };
  return { sayfa, kayitli, yazilan, kayitSayisi: () => kayit };
}

const BASLANGIC = {
  "#txtDersAmaci": "Eski amaç.",
  "#txtDersIcerigi": "İlişkisel model, SQL, normalizasyon.",
  "#txtOnKosul": "Yok",
  "#txtCikti_Ö1": "Eski çıktı.",
  "#txtHafta1Konu": "Eski konu",
  "#txtKoordinator": "Deneme Hoca",
};

describe("prolizaYaz (bellek sayfası)", () => {
  it("seçiciler: doğrudan tablo, desen ve tanımsız alan", () => {
    const s = VARSAYILAN_PROLIZ_SECICILERI;
    expect(alanSecicisi(s, { sekme: "Genel", alan: "Dersin Amacı" })).toBe("#txtDersAmaci");
    expect(alanSecicisi(s, { sekme: "Öğrenme Çıktıları", alan: "Ö3" })).toBe("#txtCikti_Ö3");
    expect(alanSecicisi(s, { sekme: "Öğrenme Çıktıları", alan: "Ö3 (İngilizce)" })).toBe("#txtCiktiEn_Ö3");
    expect(alanSecicisi(s, { sekme: "Ders Akışı", alan: "12. Hafta Konu" })).toBe("#txtHafta12Konu");
    expect(alanSecicisi(s, { sekme: "Değerlendirme", alan: "Ara Sınav" })).toBeNull();
    expect(VARSAYILAN_PROLIZ_SECICILERI.durum).toBe("DOĞRULANMADI");
  });

  it("kuru çalıştırma hiçbir şey yazmaz ve kaydetmez; neyin değişeceğini raporlar", async () => {
    const b = bellekSayfa(BASLANGIC);
    const r = await prolizaYaz(b.sayfa, { dersKodu: "BPA102", alanlar: PLAN, kuru: true });
    expect(b.yazilan).toEqual([]);
    expect(b.kayitSayisi()).toBe(0);
    expect(b.kayitli).toEqual(BASLANGIC);
    const d = Object.fromEntries(r.alanlar.map((a) => [a.alan, a.durum]));
    // Amaç, Ö1 ve 1. hafta farklı → yazılacak; içerik ve ön koşul aynı → dokunulmaz.
    expect(d).toEqual({
      "Dersin Amacı": "yazilacak",
      "Dersin İçeriği": "ayni",
      "Ön Koşul": "ayni",
      Ö1: "yazilacak",
      "1. Hafta Konu": "yazilacak",
      "Ara Sınav": "eslesmedi",
      Şifre: "atlandi",
    });
    expect(r.alanlar.find((a) => a.alan === "Dersin Amacı")?.onceki).toBe("Eski amaç.");
    expect(r).toMatchObject({ kuru: true, kaydedildi: false, tamam: true, hata: null });
  });

  it("gerçek yazma: önce okur, yalnız farklı ve onaylı alanları yazar, kaydeder, geri okuyup doğrular", async () => {
    const b = bellekSayfa(BASLANGIC);
    const r = await prolizaYaz(b.sayfa, { dersKodu: "BPA102", alanlar: PLAN, kuru: false });
    expect(b.yazilan).toEqual(["#txtDersAmaci", "#txtCikti_Ö1", "#txtHafta1Konu"]);
    expect(b.kayitSayisi()).toBe(1);
    expect(b.kayitli["#txtKoordinator"]).toBe("Deneme Hoca"); // planda yok: dokunulmadı
    expect(r.alanlar.filter((a) => a.durum === "dogrulandi").map((a) => a.alan)).toEqual([
      "Dersin Amacı",
      "Ö1",
      "1. Hafta Konu",
    ]);
    expect(r).toMatchObject({ kaydedildi: true, tamam: true, hata: null });
  });

  it("geri okunan değer farklıysa doğrulanamadı ve tamam değil", async () => {
    const b = bellekSayfa(BASLANGIC, { bozukKayit: "#txtCikti_Ö1" });
    const r = await prolizaYaz(b.sayfa, { dersKodu: "BPA102", alanlar: PLAN, kuru: false });
    expect(r.alanlar.find((a) => a.alan === "Ö1")?.durum).toBe("dogrulanamadi");
    expect(r.tamam).toBe(false);
    expect(r.hata).toMatch(/geri okununca/u);
  });

  it("değişiklik yoksa kaydet'e basılmaz", async () => {
    const b = bellekSayfa({ ...BASLANGIC, "#txtDersAmaci": PLAN[0]?.deger ?? "" });
    const r = await prolizaYaz(b.sayfa, { dersKodu: "X", alanlar: PLAN.slice(0, 3), kuru: false });
    expect(b.kayitSayisi()).toBe(0);
    expect(r.alanlar.every((a) => a.durum === "ayni")).toBe(true);
  });

  it("hata iletisinde adres sorgusu ve giriş izi yok", async () => {
    const b = bellekSayfa(BASLANGIC);
    b.sayfa.ac = async () => {
      throw new Error("net::ERR at https://obs.ornek.edu.tr/x?oturum=GIZLI123\nyığın");
    };
    const r = await prolizaYaz(b.sayfa, { dersKodu: "X", alanlar: PLAN, kuru: false });
    expect(r.tamam).toBe(false);
    expect(r.hata).not.toContain("GIZLI123");
  });
});
