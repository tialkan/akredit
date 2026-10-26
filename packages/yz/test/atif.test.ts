import { describe, expect, it } from "vitest";
import { type AtifKaynagi, atifDenetle, atifsizlariIsaretle, cumlelereBol, olgusalMi } from "../src/guvence/atif.ts";

const KANIT: AtifKaynagi = {
  ozet: "1a2b3c4d5e6f7a8b9c0d1a2b3c4d5e6f7a8b9c0d1a2b3c4d5e6f7a8b9c0d1a2b",
  parcalar: [
    { capa: { sayfa: 3 }, metin: "Danışma kurulu 12 Mart 2026 tarihinde toplandı ve 4 karar aldı." },
    { capa: { sayfa: 4 }, metin: "Paydaş anketi sonuçları değerlendirildi." },
    { capa: { bolum: "Ek-1" }, metin: "Katılım listesi." },
  ],
};
// Aynı önekle başlayan iki kanıt: belirsiz özet denemesi için.
const IKIZ: AtifKaynagi[] = [
  { ozet: "abcdef0011", parcalar: [] },
  { ozet: "abcdef0022", parcalar: [] },
];

describe("cümlelere bölme", () => {
  it("kısaltmalarda bölmez: Prof. Dr., vb., s., No.", () => {
    const c = cumlelereBol(
      "Prof. Dr. Ayla Deniz sundu. Konular: ölçme, anket vb. konular ele alındı. Bkz. s. 4 ve No. 12 karar.",
    );
    expect(c.map((x) => x.metin)).toEqual([
      "Prof. Dr. Ayla Deniz sundu.",
      "Konular: ölçme, anket vb. konular ele alındı.",
      "Bkz. s. 4 ve No. 12 karar.",
    ]);
  });
  it("atıf içindeki noktalarda bölmez; noktadan sonraki atıfı önceki cümleye bağlar", () => {
    const c = cumlelereBol('Kurul toplandı [K:1a2b3c4d s.3 "toplandı"]. Sonra dağıldı. [K:1a2b3c4d s.4] Yeni cümle!');
    expect(c.map((x) => x.metin)).toEqual([
      'Kurul toplandı [K:1a2b3c4d s.3 "toplandı"].',
      "Sonra dağıldı. [K:1a2b3c4d s.4]",
      "Yeni cümle!",
    ]);
  });
  it("sıra sayısında ve baş harfte bölmez, paragrafta böler", () => {
    const c = cumlelereBol("3. madde kabul edildi. A. Yılmaz konuştu\n\nYeni paragraf burada");
    expect(c.map((x) => x.metin)).toEqual(["3. madde kabul edildi.", "A. Yılmaz konuştu", "Yeni paragraf burada"]);
  });
  it("konumlar özgün metne denk gelir", () => {
    const m = "  Bir iki üç. Dört beş altı.";
    for (const c of cumlelereBol(m)) expect(m.slice(c.baslangic, c.bitis)).toBe(c.metin);
  });
});

describe("olgusallık", () => {
  it("soru, başlık, kısa ifade ve EKSİK olgusal değildir", () => {
    expect(olgusalMi("Kurul ne zaman toplandı?")).toBe(false);
    expect(olgusalMi("## Liderlik ve kalite")).toBe(false);
    expect(olgusalMi("Giriş.")).toBe(false);
    expect(olgusalMi("[EKSİK: toplantı tutanağı yok]")).toBe(false);
    expect(olgusalMi("Kurul düzenli olarak toplanmaktadır.")).toBe(true);
  });
});

describe("atıf denetimi", () => {
  it("geçerli atıf ve alıntı geçer", () => {
    const d = atifDenetle(
      'Danışma kurulu toplandı [K:1a2b3c4d s.3 "danışma kurulu 12 Mart 2026 tarihinde toplandı"].',
      [KANIT],
    );
    expect(d.gecerli).toBe(true);
  });
  it("var olmayan kanıt: kanit_yok", () => {
    const d = atifDenetle("Kurul düzenli toplanır [K:ffffeeee s.3].", [KANIT]);
    expect(d.cumleler[0]?.sorunlar.map((s) => s.tur)).toEqual(["kanit_yok"]);
    expect(d.gecerli).toBe(false);
  });
  it("alıntısı uyuşmayan: alinti_uyusmuyor", () => {
    const d = atifDenetle('Kurul toplandı ve oy birliği sağlandı [K:1a2b3c4d s.3 "oy birliğiyle kabul edildi"].', [
      KANIT,
    ]);
    expect(d.cumleler[0]?.sorunlar.map((s) => s.tur)).toEqual(["alinti_uyusmuyor"]);
  });
  it("alıntı doğru ama başka sayfada: konum aralığına göre denetlenir", () => {
    const d = atifDenetle('Anket değerlendirildi demek doğru [K:1a2b3c4d s.3 "anketi sonuçları değerlendirildi"].', [
      KANIT,
    ]);
    expect(d.cumleler[0]?.sorunlar.map((s) => s.tur)).toEqual(["alinti_uyusmuyor"]);
    const aralik = atifDenetle(
      'Anket değerlendirildi demek doğru [K:1a2b3c4d s.3-4 "anketi sonuçları değerlendirildi"].',
      [KANIT],
    );
    expect(aralik.gecerli).toBe(true);
  });
  it("kanıtta olmayan sayfa ve bölüm: konum_yok", () => {
    expect(atifDenetle("Kurul toplantısı yapıldı [K:1a2b3c4d s.9].", [KANIT]).cumleler[0]?.sorunlar[0]?.tur).toBe(
      "konum_yok",
    );
    expect(atifDenetle("Liste ekte verilmiştir [K:1a2b3c4d b.Ek-1].", [KANIT]).gecerli).toBe(true);
    expect(atifDenetle("Liste ekte verilmiştir [K:1a2b3c4d b.Ek-2].", [KANIT]).gecerli).toBe(false);
  });
  it("atıfsız olgusal cümle: atif_yok", () => {
    const d = atifDenetle("Kurul her ay toplanmaktadır. Peki ne zaman?", [KANIT]);
    expect(d.cumleler.map((c) => c.gecti)).toEqual([false, true]);
    expect(d.cumleler[0]?.sorunlar[0]?.tur).toBe("atif_yok");
  });
  it("kısaltma içeren atıflı cümle tek cümle sayılır ve geçer", () => {
    const d = atifDenetle(
      'Prof. Dr. Ayla Deniz başkanlığında kurul toplandı vb. işler yapıldı [K:1a2b3c4d s.3 "toplandı"].',
      [KANIT],
    );
    expect(d.cumleler).toHaveLength(1);
    expect(d.gecerli).toBe(true);
  });
  it("belirsiz özet öneki reddedilir", () => {
    const d = atifDenetle("Kurul toplantısı yapıldı burada [K:abcdef].", IKIZ);
    expect(d.cumleler[0]?.sorunlar[0]?.tur).toBe("belirsiz_ozet");
  });
  it("tanınmayan konum yalnız uyarıdır", () => {
    const d = atifDenetle("Kurul toplantısı yapıldı burada [K:1a2b3c4d sayfa3].", [KANIT]);
    expect(d.cumleler[0]?.sorunlar[0]?.tur).toBe("taninmayan_konum");
    expect(d.gecerli).toBe(true);
  });
  it("özel olgusallık ölçütü kullanılabilir", () => {
    expect(atifDenetle("Her şey yolunda gidiyor.", [KANIT], { olgusalMi: () => false }).gecerli).toBe(true);
  });
});

describe("atifsizlariIsaretle", () => {
  it("geçmeyen cümleleri EKSİK ile değiştirir, geçenlere dokunmaz", () => {
    const metin = 'Kurul toplandı [K:1a2b3c4d s.3 "toplandı"]. Bütçe iki katına çıktı. Rapor onaylandı [K:99999999].';
    const s = atifsizlariIsaretle(metin, [KANIT]);
    expect(s.degisen).toBe(2);
    expect(s.metin).toBe(
      'Kurul toplandı [K:1a2b3c4d s.3 "toplandı"]. [EKSİK: kanıtla doğrulanamadı (Olgusal cümle bir kanıta bağlanmamış): Bütçe iki katına çıktı.] [EKSİK: kanıtla doğrulanamadı (Atıf yapılan kanıt bulunamadı): Rapor onaylandı .]',
    );
    // Sonuç yeniden denetlendiğinde geçerlidir.
    expect(atifDenetle(s.metin, [KANIT]).gecerli).toBe(true);
  });
});
