// Dil denetimi, cümle ayrıştırma ve kanıt paneli eşlemesi (İP-44). Örnekler elle hazırlandı; her beklenen
// değerin nedeni yanında yazılı. Model, sağlayıcı ya da ağ yok: denetim saf işlevdir.

import { describe, expect, it } from "vitest";
import { cumlelereAyir, raporCumleleri } from "./cumle.ts";
import { dilDenetle, yuksekOnemliSayisi } from "./dil.ts";
import { capaEslestir, capaYaz, hucreAraligi, vurgulanacaklar } from "./kanit-paneli.ts";

const kurallar = (metin: string, s = {}) => dilDenetle(metin, s).map((b) => `${b.kural}:${b.ifade}`);

describe("cümle ayrıştırma", () => {
  it("cümle sonunda böler, kısaltma ve köşeli ayraç içinde bölmez", () => {
    const p =
      'Kurul toplandı [K:abcdef12 s. 3 "Kurul. Toplandı"]. Prof. Dr. Ayşe Kurgu sundu, vb. konular görüşüldü. Son.';
    expect(cumlelereAyir(p).map((c) => c.metin)).toEqual([
      'Kurul toplandı [K:abcdef12 s. 3 "Kurul. Toplandı"].',
      "Prof. Dr. Ayşe Kurgu sundu, vb. konular görüşüldü.",
      "Son.",
    ]);
  });

  it("noktadan sonra gelen tek başına atıf önceki cümleye eklenir", () => {
    const c = cumlelereAyir("Anket yapıldı. [K:abcdef12] Sonuçlar paylaşıldı.");
    expect(c.map((x) => x.metin)).toEqual(["Anket yapıldı. [K:abcdef12]", "Sonuçlar paylaşıldı."]);
    expect(c[0]?.baslangic).toBe(0);
  });

  it("paragraf sonundaki tek atıf bütün cümlelere geçer; EKSİK cümle kanıtsız kalır", () => {
    const c = raporCumleleri("Birinci cümle. İkinci cümle [K:abcdef12 s. 2]. [EKSİK: tutanak yok] Üçüncü.");
    expect(c.map((x) => [x.kaynak, x.eksik])).toEqual([
      ["paragraf", false],
      ["kendi", false],
      ["yok", true],
    ]);
    expect(c[0]?.atiflar[0]?.capa).toEqual({ sayfa: 2 });
  });

  it("atıfsız paragrafın bütün cümleleri EKSİK; hesap atfı kaynak sayılır", () => {
    expect(raporCumleleri("Atıfsız. Bu da.").every((c) => c.eksik)).toBe(true);
    expect(raporCumleleri("PÇ1 sağlanma düzeyi 62,5 [H:0a1b2c3d].")[0]).toMatchObject({
      kaynak: "kendi",
      hesaplar: ["0a1b2c3d"],
      eksik: false,
    });
  });
});

describe("dil denetimi: yazıyla sayı", () => {
  it("yazıyla sayıları bulur (1. dalga açık bulgusu #4)", () => {
    // "beş toplantı", "on iki öğrenci", "iki yüz kişi": üçü de rakamla yazılmalı.
    expect(
      kurallar("Kurul beş toplantı yaptı [K:abcdef12]. On iki öğrenci ve iki yüz kişi katıldı [K:abcdef12]."),
    ).toEqual(["yaziyla-sayi:beş", "yaziyla-sayi:On iki", "yaziyla-sayi:iki yüz"]);
  });

  it("yanlış pozitif yok: ekli sözcükler, sıra sayısı, deyim, rakam", () => {
    // altında (alt+ında), yüzde, beşinci, onay, binası, "yüz yüze", "bir" ve rakamla sayı işaretlenmez.
    const m =
      "Bina altında bir oda var [K:abcdef12]. Yüzde 40 oranında arttı [K:abcdef12]. Beşinci dönem onay aldı [K:abcdef12]. Rektörlük binası yenilendi [K:abcdef12]. Görüşmeler yüz yüze yapıldı [K:abcdef12]. Kurul 5 toplantı yaptı [K:abcdef12].";
    expect(kurallar(m).filter((x) => x.startsWith("yaziyla"))).toEqual([]);
  });

  it("atıf içindeki alıntıyı denetlemez", () => {
    expect(
      kurallar('Toplantı yapıldı [K:abcdef12 s. 1 "beş toplantı"].').filter((x) => x.startsWith("yaziyla")),
    ).toEqual([]);
  });
});

describe("dil denetimi: kanıtsız üstünlük", () => {
  it("atıfsız cümlede üstünlük ifadesini yüksek önemle işaretler", () => {
    const b = dilDenetle(
      "Program bölgenin en iyi programıdır. Hedefler tamamen sağlanmış ve öğrenciler her zaman memnundur.",
    );
    expect(b.map((x) => [x.kural, x.ifade, x.onem, x.cumle])).toEqual([
      ["ustunluk", "en iyi", "yuksek", 1],
      ["ustunluk", "tamamen", "yuksek", 2],
      ["ustunluk", "her zaman", "yuksek", 2],
    ]);
    expect(yuksekOnemliSayisi(b)).toBe(3);
  });

  it("%100 de üstünlük sayılır; atıflı cümlede ve ekli sözcüklerde işaretlenmez", () => {
    expect(kurallar("Katılım %100 oldu.")).toEqual(["ustunluk:%100"]);
    // Atıf var: iddia kanıta bağlı. "tamamlandı" "tamamen" değil; "en iyileştirme" "en iyi" değil.
    expect(
      kurallar(
        "Katılım %100 oldu [K:abcdef12]. Eylem tamamlandı [K:abcdef12]. Süreç en iyileştirme aşamasında [K:abcdef12].",
      ),
    ).toEqual([]);
  });
});

describe("dil denetimi: ölçüsüz nicelik", () => {
  it("sayı içermeyen cümlede ölçüsüz niceliği işaretler", () => {
    expect(kurallar("Birçok paydaşla görüşüldü [K:abcdef12]. Memnuniyet büyük ölçüde arttı [K:abcdef12].")).toEqual([
      "olcusuz-nicelik:Birçok",
      "olcusuz-nicelik:büyük ölçüde",
    ]);
  });

  it("yanlış pozitif yok: cümlede sayı varsa ve ekli sözcüklerde", () => {
    // Sayı verilmiş: "birçok" yanında ölçü var. "çoğunluk" "çoğu" değil.
    expect(
      kurallar("Birçok paydaştan 42 kişi görüş verdi [K:abcdef12]. Kurul çoğunlukla karar aldı [K:abcdef12]."),
    ).toEqual([]);
  });
});

describe("dil denetimi: öznesiz eylem", () => {
  it("edilgen ve öznesiz eylemi işaretler", () => {
    expect(
      kurallar(
        "Anket yapılmıştır [K:abcdef12]. Eğitimler düzenlenmektedir [K:abcdef12]. Rapor sunulmuştur [K:abcdef12].",
      ),
    ).toEqual(["oznesiz-eylem:yapılmıştır", "oznesiz-eylem:düzenlenmektedir", "oznesiz-eylem:sunulmuştur"]);
  });

  it("yanlış pozitif yok: özne yazılmış ya da eylem edilgen değil", () => {
    // "tarafından" ve "Komisyonca" özneyi verir; olmuştur, gelmiştir, kazanmıştır, bulunmaktadır edilgen değil.
    const m =
      "Anket Kalite Komisyonu tarafından yapılmıştır [K:abcdef12]. Rapor Komisyonca sunulmuştur [K:abcdef12]. Gelişme olmuştur [K:abcdef12]. Yeni üye gelmiştir [K:abcdef12]. Program ödül kazanmıştır [K:abcdef12]. Laboratuvar binada bulunmaktadır [K:abcdef12].";
    expect(kurallar(m)).toEqual([]);
  });
});

describe("dil denetimi: dönem ve tarih", () => {
  it("geçersiz akademik yıl, geçersiz tarih, rapor tarihinden sonraki tarih ve dönem sonrası yıl", () => {
    const s = { donem: "2025-2026", raporTarihi: "2026-10-01" };
    const b = dilDenetle(
      "2024-2026 yılında [K:abcdef12]. Toplantı 31.02.2026 tarihinde [K:abcdef12]. Ziyaret 15.11.2026 günü [K:abcdef12]. 2027 hedefi [K:abcdef12].",
      s,
    );
    expect(b.map((x) => [x.ifade, x.onem])).toEqual([
      ["2024-2026", "yuksek"], // 2026 ≠ 2024 + 1
      ["31.02.2026", "yuksek"], // şubat 31 çekmez
      ["15.11.2026", "yuksek"], // 2026-11-15 > 2026-10-01
      ["2027", "orta"], // 2027 > dönem sonu 2026
    ]);
  });

  it("yanlış pozitif yok: geçerli dönem, artık yıl, dönem içi yıl, ölçüt kodu", () => {
    const s = { donem: "2025-2026", raporTarihi: "2026-10-01" };
    expect(
      kurallar(
        "2025-2026 döneminde 29.02.2024 ve 2026-09-30 tarihlerinde, 2025 yılında B.1.3 kapsamında [K:abcdef12].",
        s,
      ),
    ).toEqual([]);
  });

  it("başlık ve tablo satırları denetlenmez", () => {
    expect(dilDenetle("# En iyi program\n\n| beş toplantı |")).toEqual([]);
  });
});

describe("kanıt paneli eşlemesi", () => {
  const pdf = [1, 2, 3, 4].map((s) => ({ id: `p${s}`, sira: s - 1, metin: `Sayfa ${s}`, capa: { sayfa: s } }));
  it("PDF: sayfa ve sayfa aralığı", () => {
    expect(vurgulanacaklar(pdf, { sayfa: 2 }).map((v) => v.parcaId)).toEqual(["p2"]);
    expect(vurgulanacaklar(pdf, { sayfa: 2, sayfaSon: 3 }).map((v) => v.parcaId)).toEqual(["p2", "p3"]);
    expect(vurgulanacaklar(pdf, null)).toEqual([]);
  });

  it("DOCX: bölüm başlığı ve alt bölümleri", () => {
    const docx = [
      { id: "d1", sira: 0, metin: "a", capa: { bolum: "2 Yöntem" } },
      { id: "d2", sira: 1, metin: "b", capa: { bolum: "2.1" } },
      { id: "d3", sira: 2, metin: "c", capa: { bolum: "2.1.4" } },
      { id: "d4", sira: 3, metin: "d", capa: { bolum: "21" } },
    ];
    // "2.1" kendisi ve "2.1.4" alt bölümü; "21" değil.
    expect(vurgulanacaklar(docx, { bolum: "2.1" }).map((v) => v.parcaId)).toEqual(["d2", "d3"]);
  });

  it("XLSX: hücre ve satır, parça içi satır vurgusu", () => {
    // belge/parcala.ts yazımı: tablo adı, başlık satırı, sonra 3..5 satırları.
    const xlsx = [
      { id: "x1", sira: 0, metin: "Notlar\nNo | Not\n1 | 70\n2 | 80\n3 | 90", capa: { hucre: "Notlar!A3:B5" } },
      { id: "x2", sira: 1, metin: "Notlar\nNo | Not\n4 | 60", capa: { hucre: "Notlar!A6:B6" } },
    ];
    // B4 → 4. satır → x1'in 2. gövde satırı → metin satırı 3 (0: ad, 1: başlık, 2: satır 3, 3: satır 4).
    expect(vurgulanacaklar(xlsx, { hucre: "Notlar!B4" })).toEqual([{ parcaId: "x1", satirlar: [3] }]);
    expect(vurgulanacaklar(xlsx, { satir: 6 })).toEqual([{ parcaId: "x2", satirlar: [2] }]);
    expect(vurgulanacaklar(xlsx, { hucre: "Baska!B4" })).toEqual([]);
    expect(hucreAraligi("A3:D7")).toEqual({ sayfa: null, ilk: 3, son: 7 });
    expect(hucreAraligi("bozuk")).toBeNull();
  });

  it("slayt ve düz metin satırı; okunur çapa yazımı", () => {
    expect(capaEslestir({ id: "s", sira: 0, metin: "", capa: { slayt: 2 } }, { slayt: 2 })).toEqual({
      parcaId: "s",
      satirlar: [],
    });
    expect(capaEslestir({ id: "t", sira: 0, metin: "", capa: { satir: 4 } }, { satir: 4 })).not.toBeNull();
    expect(capaEslestir({ id: "t", sira: 0, metin: "", capa: {} }, { satir: 4 })).toBeNull();
    expect(
      [{ sayfa: 3 }, { sayfa: 3, sayfaSon: 5 }, { hucre: "S!B2" }, { slayt: 1 }, { bolum: "2" }, { satir: 9 }, {}].map(
        capaYaz,
      ),
    ).toEqual(["s. 3", "s. 3-5", "S!B2", "slayt 1", "bölüm 2", "satır 9", ""]);
  });
});
