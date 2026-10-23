import { describe, expect, it } from "vitest";
import { atiflariAyristir, atifYaz, eksikleriAyristir } from "../src/atif.ts";
import { alintiGeciyorMu, kelimeSayisi, normallestir } from "../src/turkce.ts";

describe("atıf sözdizimi", () => {
  it("eski Akreddit biçimini okur", () => {
    const [a] = atiflariAyristir("Toplantı yapıldı [K:1A2B3C4D].");
    expect(a?.ozetOneki).toBe("1a2b3c4d");
    expect(a?.capa).toBeNull();
    expect(a?.alinti).toBeNull();
    expect(a?.taninmayan).toBeNull();
  });

  it("sayfa, sayfa aralığı, bölüm, satır, hücre, slayt ve alıntıyı okur", () => {
    const metin =
      'A [K:abcdef12 s. 3] B [K:abcdef12 s.4-6 "danışma kurulu toplandı"] C [K:0011aa b.2.1 st.14] D [K:0011aa h.Sayfa1!B12] E [K:0011aa sl.7 “Slayt alıntısı”]';
    const [a, b, c, d, e] = atiflariAyristir(metin);
    expect(a?.capa).toEqual({ sayfa: 3 });
    expect(b?.capa).toEqual({ sayfa: 4, sayfaSon: 6 });
    expect(b?.alinti).toBe("danışma kurulu toplandı");
    expect(c?.capa).toEqual({ bolum: "2.1", satir: 14 });
    expect(d?.capa).toEqual({ hucre: "Sayfa1!B12" });
    expect(e?.capa).toEqual({ slayt: 7 });
    expect(e?.alinti).toBe("Slayt alıntısı");
  });

  it("tanınmayan serbest yazımı ayrıca bildirir", () => {
    const [a] = atiflariAyristir("[K:abcdef12 tutanak ikinci sayfa]");
    expect(a?.taninmayan).toBe("tutanak ikinci sayfa");
  });

  it("konumları metindeki yeriyle döndürür", () => {
    const metin = "x [K:abcdef] y";
    const [a] = atiflariAyristir(metin);
    expect(metin.slice(a?.baslangic, a?.bitis)).toBe("[K:abcdef]");
  });

  it("6 karakterden kısa özeti atıf saymaz", () => {
    expect(atiflariAyristir("[K:abc12]")).toHaveLength(0);
  });

  it("EKSİK işaretlerini okur", () => {
    const e = eksikleriAyristir("Plan var [EKSİK: uygulama kanıtı] ve [EKSIK] ile [Eksik: etki ölçümü].");
    expect(e.map((x) => x.aciklama)).toEqual(["uygulama kanıtı", "", "etki ölçümü"]);
  });

  it("kanonik yazım geri okunabilir", () => {
    const yazim = atifYaz("ABCDEF1234567890", { sayfa: 2, satir: 5 }, 'iç "tırnak" var');
    expect(yazim).toBe("[K:abcdef12 s.2 st.5 \"iç 'tırnak' var\"]");
    const [a] = atiflariAyristir(yazim);
    expect(a?.capa).toEqual({ sayfa: 2, satir: 5 });
    expect(a?.alinti).toBe("iç 'tırnak' var");
  });
});

describe("Türkçe normalleştirme", () => {
  it("İ/ı ve tipografik işaretleri doğru çevirir", () => {
    expect(normallestir("İZMİR’de  “Kalite” – Kurulu")).toBe('izmir\'de "kalite" - kurulu');
    expect(normallestir("ILIK")).toBe("ılık");
  });

  it("PDF satır sonu bölmesini birleştirir", () => {
    expect(normallestir("bilgi-\nsayar programcılığı")).toBe("bilgisayar programcılığı");
  });

  it("alıntı parçada geçiyorsa doğrular", () => {
    const parca = "Danışma Kurulu 12.03.2026 tarihinde TOPLANDI ve\nmüfredat önerilerini görüştü.";
    expect(alintiGeciyorMu("danışma kurulu 12.03.2026 tarihinde toplandı", parca)).toBe(true);
    expect(alintiGeciyorMu("toplandı ve müfredat", parca)).toBe(true);
    expect(alintiGeciyorMu("kurul toplanmadı", parca)).toBe(false);
    expect(alintiGeciyorMu("   ", parca)).toBe(false);
  });

  it("kelime sayar", () => {
    expect(kelimeSayisi("  bir  iki\nüç ")).toBe(3);
    expect(kelimeSayisi(undefined)).toBe(0);
  });
});
