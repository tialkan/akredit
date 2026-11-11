// Dış inceleme (06.11.2026): asistan her araç yanıtından sonra en son okuduğu sonrakiAdim'e uyar. Bu yüzden
// sonrakiAdim metinleri ara adımda hocaya soru sordurmamalı; zorunlu duraklar yalnız sayfada olmayan resmî bilgi
// (değerlendirme yüzdesi, kaynak) ve OBS kayıt onayıdır. Yüzdeye varsayılan konmaz (uydurma yok).
import { describe, expect, it } from "vitest";
import { ACIK_ARACLAR, aracCalistir } from "../src/index.ts";
import { ACIK_ISTEMLER, baslangic } from "../src/promptlar.ts";
import { ASISTAN_KURALI, SUNUCU_TALIMATI } from "../src/sunucu.ts";

const SIMDI = () => new Date("2026-11-06T10:00:00Z");
const calistir = (ad: string, girdi: unknown) => {
  const a = ACIK_ARACLAR.find((x) => x.ad === ad);
  if (!a) throw new Error(ad);
  return aracCalistir(a, girdi, { simdi: SIMDI });
};

describe("otonom akış", () => {
  it("hiçbir aracın varsayılan sonrakiAdim'i hocaya tek tek ya da A/B/C sordurmaz", () => {
    for (const a of ACIK_ARACLAR) {
      const m = a.sonrakiAdim ?? "";
      expect(m, a.ad).not.toMatch(
        /tek tek, seçenekle sorun|her kanıt için 1\) var|Hoca harfle seçer|2-3 numaralı düzeltme seçeneği/u,
      );
    }
  });

  it("her araç yanıtı aynı kısa asistan kuralını taşır", () => {
    const r = calistir("olcut_ara", { sorgu: "kalite" });
    expect(r.veri.asistanKurali).toBe(ASISTAN_KURALI);
    expect(ASISTAN_KURALI).toContain("Ara adımda hocaya A/B/C sorma");
    expect(ASISTAN_KURALI).toContain("değerlendirme yüzdesi uydurma");
  });

  it("akredit_basla niyet verilince menüyü atlar, yalnız o akışı döndürür", () => {
    const r = calistir("akredit_basla", { odak: "3" });
    // biome-ignore lint/suspicious/noExplicitAny: test erişimi
    const s = r.veri.sonuc as any;
    expect(s.hocayaGoster).toBe("Tamam: ÇK ve PÇ sağlanma düzeyini hesapla. Başlıyorum.");
    expect(s.odak.istem).toBe("ck_pc_hesabi");
    expect(s.akis).toContain("ÇK ve PÇ sağlanma düzeyi hesabı");
    // Parametresiz çağrı menüyü döndürür.
    // biome-ignore lint/suspicious/noExplicitAny: test erişimi
    const m = calistir("akredit_basla", {}).veri.sonuc as any;
    expect(m.hocayaGoster).toBe(baslangic().hocayaGoster);
  });

  it("değerlendirme yüzdesine varsayılan konmaz; uygulama/lab sorulmaz, T+U+L'den okunur", () => {
    const b = ACIK_ISTEMLER.find((i) => i.ad === "bologna_doldur")?.metin({}) ?? "";
    expect(b).not.toContain("Vize %40, Final %60 (varsayılan)");
    expect(b).toContain("Değerlendirme yüzdesine varsayılan uydurma; hoca yazar.");
    expect(b).toContain("Uygulama/lab sorulmaz: T+U+L'den okunur");
    expect(b).toContain("Nasıl doldurulacağını SORMA");
  });

  it("dil denetimi ve ölçüt rehberi ara soru sormaz", () => {
    const d = ACIK_ISTEMLER.find((i) => i.ad === "dil_denetimi")?.metin({}) ?? "";
    expect(d).toContain("çıkaramazsan sorma, dönemsiz denetle");
    expect(d).toContain("Nasıl düzeltileceğini SORMA");
    const o = ACIK_ISTEMLER.find((i) => i.ad === "olcut_rehberi")?.metin({}) ?? "";
    expect(o).toContain("Ne istendiğini ayrıca SORMA");
    expect(SUNUCU_TALIMATI).toContain("KURAL 5: Ara adımda hocaya soru sorma");
  });
});

describe("ders listesi: önce tara, eksik yoksa kalite önerisi", () => {
  it("obs_ders_listesi hocaya soru sordurmaz; ilk 15 dersi tarama planına alır, rapor biçimini verir", () => {
    const dersler = Array.from({ length: 17 }, (_, i) => ({ kod: `KRG${100 + i}`, ad: `Kurgu Ders ${i + 1}` }));
    const r = calistir("obs_ders_listesi", { dersler });
    // biome-ignore lint/suspicious/noExplicitAny: test erişimi
    const s = r.veri.sonuc as any;
    // 17 ders: ilk dilimde 15'i taranır, 2 ders kalır; sonraki dilim 15. sıradan başlar.
    expect(s.hocayaGoster).toBe(
      "17 dersiniz var. 15'erli dilimlerle hepsini tarıyorum; eksikleri ve önerilerimi birazdan tek listede göstereceğim.",
    );
    expect(s.taramaPlani).toHaveLength(15);
    expect(s.taranmayan).toBe(2);
    expect(s.sonrakiBaslangic).toBe(15);
    expect(r.veri.hocayaSimdiSor).toBe(false);
    expect(String(r.veri.sonrakiAdim)).toContain("baslangic=15");
    // İkinci dilim: kalan 2 ders, sıra numaraları 16-17.
    const r2 = calistir("obs_ders_listesi", { dersler, baslangic: 15 });
    // biome-ignore lint/suspicious/noExplicitAny: test erişimi
    const s2 = r2.veri.sonuc as any;
    expect(s2.hocayaGoster).toBe("Sıradaki 2 dersi tarıyorum (16-17 / 17).");
    expect(s2.taramaPlani.map((x: { sira: number }) => x.sira)).toEqual([16, 17]);
    expect(s2.taranmayan).toBeUndefined();
    expect(s.raporBicimi.join(" ")).toContain("Şu eksiklikleri tespit ettim, önerilerim şunlar.");
    expect(s.raporBicimi.join(" ")).toContain("eksik görünmüyor");
  });

  it("araç açıklaması 'hangi ders?' sorusunu yasaklar; sunucu talimatı kalite önerisini ister", () => {
    const a = ACIK_ARACLAR.find((x) => x.ad === "obs_ders_listesi");
    expect(a?.aciklama).toContain("hocaya 'hangi ders?' diye SORMADAN İLK bu aracı çağır");
    expect(SUNUCU_TALIMATI).toContain("Eksik yoksa 'eksik görünmüyor' de ve kaliteyi artıracak somut öneriler ver.");
  });
});

describe("niyet çözümü ve sorma bayrağı (0.6.2)", () => {
  it("akredit_basla kullanıcının cümlesinden odağı sunucuda çözer; çözemezse menü gösterir", () => {
    const bologna = calistir("akredit_basla", { kullaniciMesaji: "akredit ders paketimi doldur" });
    // biome-ignore lint/suspicious/noExplicitAny: test erişimi
    expect((bologna.veri.sonuc as any).odak.no).toBe("1");
    expect(bologna.veri.hocayaSimdiSor).toBe(false);
    // biome-ignore lint/suspicious/noExplicitAny: test erişimi
    expect((calistir("akredit_basla", { kullaniciMesaji: "ÇK PÇ hesabı" }).veri.sonuc as any).odak.no).toBe("3");
    // biome-ignore lint/suspicious/noExplicitAny: test erişimi
    expect((calistir("akredit_basla", { kullaniciMesaji: "MÜDEK ölçütleri" }).veri.sonuc as any).odak.no).toBe("4");
    const menu = calistir("akredit_basla", { kullaniciMesaji: "akredit" });
    // biome-ignore lint/suspicious/noExplicitAny: test erişimi
    expect((menu.veri.sonuc as any).menu).toHaveLength(6);
    expect(menu.veri.hocayaSimdiSor).toBe(true);
  });

  it("ara araçlar sormadan devam der; kayıt onayı durağında bayrak true olur", () => {
    const ara = calistir("bologna_alan_rehberi", { alan: "amac" });
    expect(ara.veri.hocayaSimdiSor).toBe(false);
    expect(String(ara.veri.simdiYap)).toContain("hocaya soru sormayın");
    const kopya = calistir("bologna_kopya_metni", {
      ders: { kod: "KRG101", ad: "Kurgu Bilimine Giriş" },
      alanlar: { amac: { tr: "Kurgu biliminin temel kavramlarını tanıtmak." } },
    });
    expect(kopya.veri.hocayaSimdiSor).toBe(true);
    // Eksik kalmadığında dönen varsayılan adım: özet + kayıt onayı tek mesajda; eski "yapıştırdım" sorusu yok.
    const varsayilan = ACIK_ARACLAR.find((x) => x.ad === "bologna_kopya_metni")?.sonrakiAdim ?? "";
    expect(varsayilan).not.toContain("OBS'ye yapıştırdım");
    expect(varsayilan).toContain("1) OBS'ye yaz ve kaydet");
  });

  it("engel_coz çerçeve ve okunamayan sayfada önce asistanın kendisi dener", () => {
    const r = calistir("engel_coz", { engel: "cerceve" });
    // biome-ignore lint/suspicious/noExplicitAny: test erişimi
    expect((r.veri.sonuc as any).asistanOnceKendisiDener).toContain("iframe");
    expect(r.veri.hocayaSimdiSor).toBe(false);
    expect(calistir("engel_coz", { engel: "captcha" }).veri.hocayaSimdiSor).toBe(true);
  });
});

describe("Chrome eklentisi önce (kurucu kararı 12.11.2026)", () => {
  it("tarayıcı aracı yoksa akış kopyalamadan önce eklenti kurulumunu önerir; kopyalama yalnız yedektir", () => {
    const akis = baslangic().akislar["1"] as string;
    const eklenti = akis.indexOf("ÖNCE eklentiyi kurdur");
    const kopya = akis.indexOf("Ctrl+A ile seçip Ctrl+C");
    expect(eklenti).toBeGreaterThan(-1);
    expect(kopya).toBeGreaterThan(eklenti);
    expect(akis).toContain("1) kuralım (önerilen) 2) kurmadan devam");
    expect(SUNUCU_TALIMATI).toContain("otonom akış ancak eklentiyle çalışır");
  });
});

describe("ck_pc_hesapla bozuk girdiyi hesaplamaz (kurucu kararı 12.11.2026)", () => {
  it("tam puanı aşan puanda hata döner ve sayı üretmez", () => {
    const a = ACIK_ARACLAR.find((x) => x.ad === "ck_pc_hesapla");
    if (!a) throw new Error("araç yok");
    const r = aracCalistir(
      a,
      {
        dersKodu: "KRG101",
        donem: "2026-2027 Güz",
        ciktilar: [{ kod: "Ö1" }],
        araclar: [
          {
            id: "vize",
            agirlik: 100,
            sorular: [{ no: "1", tamPuan: 10, eslemeler: [{ ciktiKod: "Ö1", agirlik: 1 }] }],
          },
        ],
        puanlar: [{ ogrenci: "o1", aracId: "vize", soruNo: "1", puan: 15 }],
      },
      { simdi: () => new Date("2026-11-12T09:00:00Z") },
    );
    expect(r.hata).toBe(true);
    expect(String((r.veri as { hata: string }).hata)).toContain("puanı (15) tam puanı (10) aşıyor");
  });
});
