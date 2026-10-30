// Rapor okuyucusu modeli (İP-44): cümle atfı, vurgu, EKSİK ve dil bulgusu bağlama. Bütün veriler uydurmadır.

import { describe, expect, it } from "vitest";
import { gorunenMetin, type OkuyucuKaniti, okuyucuModeli } from "./okuyucu-modeli.ts";

const PDF: OkuyucuKaniti = {
  id: "k-pdf",
  baslik: "Kurul tutanağı",
  dosyaAdi: "tutanak.pdf",
  ozet: `aa11bb22${"0".repeat(56)}`,
  parcalar: [1, 2, 3].map((s) => ({ id: `pdf-${s}`, sira: s - 1, metin: `Sayfa ${s} metni`, capa: { sayfa: s } })),
  onay: null,
};
const XLSX: OkuyucuKaniti = {
  id: "k-xlsx",
  baslik: "Not çizelgesi",
  dosyaAdi: "notlar.xlsx",
  ozet: `cc33dd44${"0".repeat(56)}`,
  parcalar: [{ id: "x-1", sira: 0, metin: "Notlar\nNo | Not\n1 | 70\n2 | 80", capa: { hucre: "Notlar!A3:B4" } }],
  onay: null,
};
const DOCX: OkuyucuKaniti = {
  id: "k-docx",
  baslik: "Öz değerlendirme notu",
  dosyaAdi: "not.docx",
  ozet: `ee55ff66${"0".repeat(56)}`,
  parcalar: [
    { id: "d-1", sira: 0, metin: "Giriş", capa: { bolum: "1 Giriş" } },
    { id: "d-2", sira: 1, metin: "Yöntem ayrıntısı", capa: { bolum: "2.1" } },
  ],
  onay: null,
};

describe("okuyucu modeli", () => {
  const bolum = {
    id: "b1",
    baslik: "Bölüm",
    olcut: "A.1",
    paragraflar: [
      {
        // Atıf kimliklerini servis çözdü; metindeki işaretler de aynı kanıtlara çıkar.
        metin:
          "Kurul toplandı [K:aa11bb22 s. 2]. Notlar girildi [K:cc33dd44 h.Notlar!B4]. Yöntem yazıldı [K:ee55ff66 b.2.1].",
        atiflar: [{ kanitId: "k-pdf" }, { kanitId: "k-xlsx" }, { kanitId: "k-docx" }],
      },
      { metin: "Danışma kurulu toplandı. [EKSİK: tutanak yok] İzleme yapılmadı.", atiflar: [] },
      {
        metin: "Örnek veride işaret yok, atıf paragraftan gelir.",
        atiflar: [{ kanitId: "k-pdf", capa: { sayfa: 3 } }],
      },
    ],
  };
  const m = okuyucuModeli(
    [bolum],
    [PDF, XLSX, DOCX],
    [{ bolumId: "b1", paragraf: 2, cumle: 1, kural: "ustunluk", onem: "yuksek", aciklama: "x" }],
  );
  const [p1, p2, p3] = m[0]?.paragraflar ?? [];

  it("PDF sayfası, XLSX satırı ve DOCX bölümü vurgulanır", () => {
    expect(p1?.map((c) => [c.metin, c.atiflar.map((a) => [a.kanitId, a.konum, a.vurgu])])).toEqual([
      ["Kurul toplandı.", [["k-pdf", "s. 2", [{ parcaId: "pdf-2", satirlar: [] }]]]],
      // B4 → 4. satır → parçanın ikinci gövde satırı (0: ad, 1: başlık, 2: satır 3, 3: satır 4).
      ["Notlar girildi.", [["k-xlsx", "Notlar!B4", [{ parcaId: "x-1", satirlar: [3] }]]]],
      ["Yöntem yazıldı.", [["k-docx", "bölüm 2.1", [{ parcaId: "d-2", satirlar: [] }]]]],
    ]);
    expect(p1?.every((c) => !c.eksik)).toBe(true);
  });

  it("atıfsız ve EKSİK işaretli cümleler kanıt yok olarak işaretlenir; dil bulgusu cümleye bağlanır", () => {
    expect(p2?.map((c) => [c.metin, c.eksik])).toEqual([
      ["Danışma kurulu toplandı.", true],
      ["(Kanıt yok: tutanak yok) İzleme yapılmadı.", true],
    ]);
    expect(p2?.[0]?.dilBulgulari).toEqual([{ kural: "ustunluk", onem: "yuksek", aciklama: "x" }]);
  });

  it("metninde işaret olmayan paragraf servis atfını cümlelerine taşır", () => {
    expect(p3?.[0]).toMatchObject({ eksik: false, atiflar: [{ kanitId: "k-pdf", konum: "s. 3" }] });
  });

  it("panele yüklenemeyen (yetkisiz) kanıt atfı kanıtlı kalır, panel yetkiyi söyler", () => {
    const y = okuyucuModeli(
      [
        {
          id: "b",
          baslik: "B",
          olcut: "",
          paragraflar: [{ metin: "Gizli [K:99999999].", atiflar: [{ kanitId: "k-gizli" }] }],
        },
      ],
      [],
    );
    expect(y[0]?.paragraflar[0]?.[0]).toMatchObject({ eksik: false, atiflar: [{ kanitId: "k-gizli", vurgu: [] }] });
  });

  it("hesap atıflı cümle kanıtlıdır, panel açılmaz", () => {
    const h = okuyucuModeli(
      [{ id: "b", baslik: "B", olcut: "", paragraflar: [{ metin: "PÇ1 62,5 [H:0a1b2c3d].", atiflar: [] }] }],
      [],
    );
    expect(h[0]?.paragraflar[0]?.[0]).toMatchObject({ hesapli: true, eksik: false, atiflar: [] });
  });

  it("görünen metin işaretleri ayıklar", () => {
    expect(gorunenMetin('Toplandı [K:aa11bb22 s. 2 "alıntı"].')).toBe("Toplandı.");
    expect(gorunenMetin("[EKSİK] Yok.")).toBe("(Kanıt yok) Yok.");
  });
});
