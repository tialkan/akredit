// İP-47: program tabloları sayfasının saf yardımcıları. Örnek veri kurgudur.
import { odrTablolari } from "@akredit/servis";
import { describe, expect, it } from "vitest";
import { cerceveSec, kararIstekleri, kaynakMetni, ORNEK_BOLOGNA, ornekKayitlari } from "./gorunum.ts";

const ornekDurum = (cerceveKod: string) => {
  const ozet = odrTablolari.tabloCerceveleri().find((c) => c.kod === cerceveKod);
  return odrTablolari.durumKur({
    program: { id: "p1", ad: "Örnek program" },
    cerceve: odrTablolari.cerceveGerekli(cerceveKod),
    okuma: { kanitId: "ornek", okundu: ORNEK_BOLOGNA.okundu, veri: ORNEK_BOLOGNA },
    kayitlar: ornekKayitlari(ozet?.dersKodlari ?? []),
  });
};

describe("program tabloları sayfası", () => {
  it("çerçeve seçimi: tanınmayan değer ilk çerçeveye düşer", () => {
    const c = odrTablolari.tabloCerceveleri();
    expect(cerceveSec("sabak-genel", c)).toBe("sabak-genel");
    expect(cerceveSec("mudek-yl", c)).toBe("mudek-lisans");
    expect(cerceveSec(undefined, c)).toBe("mudek-lisans");
  });

  it("kaynak metni okunur", () => {
    expect(kaynakMetni("bologna:ORN101#akts")).toBe("Bologna, ORN101, AKTS");
    expect(kaynakMetni("esleme:ders-kategorisi#ORN101")).toBe("Kurum kararı: ders eşlemesi (ORN101)");
    expect(kaynakMetni("hesap:toplam#MTB;esleme:secmeli-yer#2")).toBe(
      "Hesap: toplam; Kurum kararı: seçmeli yer sayısı (2. yarıyıl)",
    );
  });

  it("örnek kipte öneri tabloya girmez, eşlemesiz ders EKSİK", () => {
    const d = ornekDurum("mudek-lisans");
    const t51 = d.tablolar.find((t) => t.tanimKod === "mudek-lisans.5.1");
    const veri = t51?.satirlar.filter((s) => s.tur === "veri") ?? [];
    // ORN101 kararlı (MTB, kredi 3 AKTS 6 → "3-6"); ORN102 yalnız öneri → kategori hücreleri EKSİK.
    const satir = (kod: string) => {
      const s = veri.find((x) => x.tur !== "ara" && x.hucreler[0]?.tur === "deger" && x.hucreler[0].metin === kod);
      return s && s.tur !== "ara" ? s.hucreler.slice(3).map((h) => h.tur) : [];
    };
    expect(satir("ORN101")).toEqual(["deger", "bos", "bos", "bos"]);
    expect(satir("ORN102")).toEqual(["eksik", "eksik", "eksik", "eksik"]);
    expect(d.eslemeler.dersler[1]?.oneri?.uretici).toBe("yz");
    expect(d.eslemeler.secmeliYer.map((s) => s.anahtar)).toEqual(["2"]);
  });

  it("onay formu yalnız seçilen ve değişen satırları karar yapar", () => {
    const d = ornekDurum("mudek-lisans");
    const f = new FormData();
    f.set("ders:ORN101", "MTB"); // mevcut kararla aynı: gönderilmez
    f.set("ders:ORN102", "MK");
    f.set("ders:ORN201", ""); // değiştirme
    f.append("pc:P1", "3.C2");
    f.append("pc:P1", "3.C1");
    f.set("pc-onay:P1", "1");
    f.append("pc:P2", "3.C3"); // onay kutusu işaretsiz: gönderilmez
    f.set("yer:2", "1");
    expect(kararIstekleri(f, d)).toEqual([
      { tur: "ders_kategorisi", anahtar: "ORN102", deger: "MK" },
      { tur: "pc_kurul", anahtar: "P1", deger: ["3.C1", "3.C2"] },
      { tur: "secmeli_yer", anahtar: "2", deger: 1 },
    ]);
  });
});
