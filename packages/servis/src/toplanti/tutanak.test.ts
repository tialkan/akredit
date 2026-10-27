// Saf tutanak ve gündem mantığı. Bütün adlar uydurmadır.

import { describe, expect, it } from "vitest";
import { ebysTutanagi, gundemTaslagi } from "./gundem.ts";
import { atifMetni, kayitKarariTasiyorMu, kayittanKararlar, taslakMetni, tutanakTaslagiKur } from "./tutanak.ts";

const OZET = "ab12cd34".padEnd(64, "0");
const KAYIT = {
  ozet: OZET,
  parcalar: [
    { capa: { sayfa: 1 }, metin: "Katılanlar: Ali Uydurma, Ayşe Örnek.\nGündem 1 görüşüldü." },
    {
      capa: { sayfa: 2 },
      metin:
        "Karar 1: B.1.2 kapsamında ders izlencelerinin 15.12.2026 tarihine kadar Ayşe Örnek tarafından güncellenmesine.\nKarar 2: Danışma kurulunun dönem başında toplanmasına.",
    },
  ],
};
const KATILIMCILAR = [
  { kisiId: "k1", ad: "Ali Uydurma" },
  { kisiId: "k2", ad: "Ayşe Örnek" },
  { kisiId: "k3", ad: "Veli Deneme" },
];

describe("kayıttan karar", () => {
  it("'Karar n:' satırlarını atıflı aday yapar", () => {
    const a = kayittanKararlar(KAYIT);
    expect(a).toHaveLength(2);
    expect(a[0]?.atif).toMatch(/^\[K:ab12cd34 s\.2 "/u);
  });

  it("atıf yeri: başka kaydın özeti ya da olmayan sayfa reddedilir", () => {
    expect(atifMetni("[K:ab12cd34 s.2]", KAYIT)).toContain("Karar 2");
    expect(atifMetni("[K:ffffffff s.2]", KAYIT)).toBeNull();
    expect(atifMetni("[K:ab12cd34 s.9]", KAYIT)).toBeNull();
    expect(atifMetni('[K:ab12cd34 s.1 "yeni bilgisayar alındı"]', KAYIT)).toBeNull();
  });

  it("kararın kelimelerinin en az %70'i atıf yerinde geçmeli", () => {
    // "danışma kurulunun dönem başında toplanmasına": anlamlı kelimeler danışma, kurulunun, dönem(5), başında,
    // toplanmasına → 5/5 geçer.
    expect(kayitKarariTasiyorMu("Danışma kurulunun dönem başında toplanmasına", KAYIT.parcalar[1]?.metin ?? "")).toBe(
      true,
    );
    expect(kayitKarariTasiyorMu("Laboratuvara yeni bilgisayarlar alınmasına", KAYIT.parcalar[1]?.metin ?? "")).toBe(
      false,
    );
  });
});

describe("tutanak taslağı", () => {
  it("kayıtta olmayan karar üretilmez; model adayı da aynı denetimden geçer", () => {
    const t = tutanakTaslagiKur({
      kayit: KAYIT,
      katilimcilar: KATILIMCILAR,
      adaylar: [
        { metin: "Danışma kurulunun dönem başında toplanmasına", atif: "[K:ab12cd34 s.2]" },
        // Uydurma karar, geçerli bir atıfla: atıf yeri kararı taşımıyor.
        { metin: "Laboratuvara yeni bilgisayarlar alınmasına", atif: "[K:ab12cd34 s.2]" },
        // Atıfsız karar.
        { metin: "Öğrenci temsilcisinin kurula katılmasına", atif: "" },
        // Başka belgeye atıf.
        { metin: "Danışma kurulunun dönem başında toplanmasına", atif: "[K:99999999 s.2]" },
        "biçimsiz",
      ],
    });
    expect(t.kararlar.map((k) => k.metin)).toEqual(["Danışma kurulunun dönem başında toplanmasına"]);
    expect(t.reddedilenler).toHaveLength(4);
    expect(t.reddedilenler.map((r) => r.neden)).toContain("Karar, atıf yapılan yerde geçmiyor.");
  });

  it("katılımcı uydurulmaz: kayıtta adı geçmeyen kişi EKSİK", () => {
    const t = tutanakTaslagiKur({ kayit: KAYIT, katilimcilar: KATILIMCILAR });
    expect(t.katilimcilar.map((k) => k.durum)).toEqual(["kayitta", "kayitta", "eksik"]);
    expect(t.eksikler).toContain("Veli Deneme: katılımı kayıtta doğrulanmadı.");
    expect(taslakMetni("Komisyon", "2026-10-27", t)).toContain("Veli Deneme [EKSİK");
  });

  it("eylem önerisi: sorumlu, tarih ve ölçüt yalnız kayıtta yazılıysa", () => {
    const t = tutanakTaslagiKur({ kayit: KAYIT, katilimcilar: KATILIMCILAR, gundemOlcutKodlari: ["A.1.1"] });
    expect(t.kararlar).toHaveLength(2);
    const [k1, k2] = t.kararlar;
    expect(k1?.eylem).toMatchObject({ sorumluKisiId: "k2", hedefTarih: "2026-12-15", olcutKodlari: ["B.1.2"] });
    // Karar 2'nin kendi metninde ad ve tarih yok: aynı sayfada ad geçse de sorumlu seçilmez.
    expect(k2?.eylem).toMatchObject({ sorumluKisiId: null, hedefTarih: null });
    expect(t.olcutKodlari).toEqual(["A.1.1", "B.1.2"]);
  });

  it("karar yoksa EKSİK yazılır", () => {
    const t = tutanakTaslagiKur({
      kayit: { ozet: OZET, parcalar: [{ capa: {}, metin: "Görüşüldü." }] },
      katilimcilar: [],
    });
    expect(t.kararlar).toEqual([]);
    expect(taslakMetni("X", "2026-01-01", t)).toContain("[EKSİK: kayıtta atıflanabilir karar yok]");
  });
});

describe("gündem ve EBYS", () => {
  const simdi = new Date("2026-10-27T00:00:00Z");
  it("gecikmişler önce; tamamlanmış (önlem al) eylem gündeme girmez", () => {
    const g = gundemTaslagi({
      simdi,
      eylemler: [
        {
          id: "e1",
          tanim: "İzlence güncelle",
          pukoAsamasi: "uygula",
          hedefTarih: new Date("2026-12-01"),
          olcutKodlari: [],
        },
        {
          id: "e2",
          tanim: "Anket yap",
          pukoAsamasi: "planla",
          hedefTarih: new Date("2026-09-01"),
          olcutKodlari: ["B.3"],
        },
        { id: "e3", tanim: "Bitti", pukoAsamasi: "onlem_al", hedefTarih: null, olcutKodlari: [] },
      ],
      gorevler: [{ id: "g1", baslik: "Ders dosyası", sonTarih: null }],
    });
    expect(g.map((m) => m.kaynak.id)).toEqual([null, "e2", "e1", "g1", null]);
    expect(g[1]?.gecikmis).toBe(true);
    expect(g.map((m) => m.sira)).toEqual([1, 2, 3, 4, 5]);
  });

  it("EBYS metni onaysız üretilmez; onaylayan ve zaman yazılır", () => {
    const t = tutanakTaslagiKur({ kayit: KAYIT, katilimcilar: KATILIMCILAR });
    const temel = {
      kurumAdi: "Örnek Üniversitesi",
      baslik: "Kalite komisyonu",
      zaman: simdi,
      gundem: [],
      katilimcilar: t.katilimcilar,
      kararlar: t.kararlar,
    };
    expect(() => ebysTutanagi({ ...temel, onay: null })).toThrow();
    const m = ebysTutanagi({ ...temel, onay: { onaylayan: "Ali Uydurma", zaman: simdi, sonuc: "onaylandi" } });
    expect(m).toContain("Onaylayan: Ali Uydurma\r\n");
    expect(m).toContain("Karar 1: B.1.2");
    expect(m).toContain("Veli Deneme (katılımı kayıtta doğrulanmadı)");
  });
});
