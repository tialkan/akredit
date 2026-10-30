// İP-48: saha soruları görevi. Sahte sağlayıcıyla, ağsız. Ölçüt kodları ve sorular uydurmadır.
import { describe, expect, it } from "vitest";
import { sahteSaglayici } from "../saglayicilar/sahte.ts";
import { gorevCalistir } from "./gorev.ts";
import {
  olguImasi,
  type SahaSorulariGirdisi,
  sahaSorulari,
  sahaSorulariniAyikla,
  soruMetniSorunu,
} from "./saha-sorulari.ts";

const girdi: SahaSorulariGirdisi = {
  sorular: [
    { id: "s1", olcutKod: "P.1", metin: "P.1 Program çıktıları: bu konuda ne yapıyorsunuz ve hangi kanıt gösteriyor?" },
    { id: "s2", olcutKod: "P.2", metin: "P.2 için 2 toplantı neden yapıldı?" },
  ],
  olcutler: [
    { kod: "P.1", baslik: "Program çıktıları" },
    { kod: "P.2", baslik: "Müfredat" },
  ],
};

describe("soru metni kuralı", () => {
  it("tek soru geçer; cevaplı, atıflı, soru olmayan ya da sayı uyduran metin geçmez", () => {
    expect(soruMetniSorunu("Danışma kurulu nasıl çalışıyor?")).toBeNull();
    expect(soruMetniSorunu("Kurul toplandı.")).toContain("soru değil");
    expect(soruMetniSorunu("Kurul toplandı. Neden?")).toContain("tek bir soru");
    expect(soruMetniSorunu("Kurul [K:1a2b3c4d] toplandı mı?")).toContain("cevap");
    expect(soruMetniSorunu("Cevap şudur, kurul mu?")).toContain("cevap");
    expect(soruMetniSorunu("Kaç öğrenci %85 memnun?")).toContain("sayı");
    expect(soruMetniSorunu("Neden 2 toplantı?", ["2"])).toBeNull();
  });
});

describe("soru metni kuralı (inceleme dalga 8)", () => {
  it("satır sonu ya da noktalı virgülle soruya eklenen cevap geçmez", () => {
    expect(
      soruMetniSorunu("P.1 nasıl işliyor\nKomisyon her ay toplanıyor ve tutanaklar arşivde\nbu yeterli mi?"),
    ).toMatch(/tek bir soru/u);
    expect(soruMetniSorunu("P.1 nasıl işliyor; komisyon her ay toplanıyor ve tutanaklar arşivde, yeterli mi?")).toMatch(
      /tek bir soru/u,
    );
    expect(soruMetniSorunu("P.1 için kurul düzenli toplanıyor mu?")).toBeNull();
  });
});

describe("saha soruları görevi (sahte sağlayıcı)", () => {
  it("geçerli düzeltme ve ölçüte bağlı öneri alınır; kodsuz öneri ve cevap metni ayıklanır", async () => {
    const s = sahteSaglayici([
      JSON.stringify({
        duzeltmeler: [
          { soruId: "s1", metin: "P.1 kapsamında program çıktılarını nasıl belirliyorsunuz?" },
          // Cevap yazmış: reddedilir.
          { soruId: "s2", metin: "P.2 için toplantılar yapıldı. Kurul 2 kez toplandı." },
        ],
        oneriler: [
          { olcutKod: "P.2", metin: "P.2 müfredat güncellemesine öğrenciler nasıl katılıyor?" },
          // Ölçüt kodu çerçevede yok: listeye girmez.
          { olcutKod: "Z.9", metin: "Kampüste kaç kafe var?" },
          // Uydurma sayı: girmez.
          { olcutKod: "P.1", metin: "P.1 çıktılarının %90 sağlandığını nasıl gösteriyorsunuz?" },
        ],
      }),
    ]);
    const r = await gorevCalistir(sahaSorulari, girdi, s);
    expect(r.gecerli).toBe(false);
    const a = sahaSorulariniAyikla(r.veri, girdi);
    expect(a.duzeltmeler).toEqual([
      { soruId: "s1", metin: "P.1 kapsamında program çıktılarını nasıl belirliyorsunuz?" },
    ]);
    expect(a.oneriler).toEqual([{ olcutKod: "P.2", metin: "P.2 müfredat güncellemesine öğrenciler nasıl katılıyor?" }]);
    expect(a.reddedilen.map((x) => x.alan)).toEqual(["duzeltmeler.1", "oneriler.1", "oneriler.2"]);
    // İstem soruları güvenilmeyen veri olarak sarar; modelden cevap istemez.
    const sistem = s.istekler[0]?.mesajlar[0]?.icerik ?? "";
    expect(sistem).toContain("Soruları cevaplama");
  });

  it("şemada cevap alanı yok: cevap alanlı çıktı şemayı geçmez", () => {
    const c = sahaSorulari.sema.safeParse({
      duzeltmeler: [],
      oneriler: [{ olcutKod: "P.1", metin: "P.1 nasıl?", cevap: "Şöyle." }],
    });
    expect(c.success).toBe(false);
  });

  it("ölçüt kodunu düşüren düzeltme ve aynı soruya ikinci düzeltme reddedilir; öneri sınırı uygulanır", () => {
    const a = sahaSorulariniAyikla(
      {
        duzeltmeler: [
          { soruId: "s1", metin: "Program çıktılarını nasıl belirliyorsunuz?" },
          { soruId: "yok", metin: "P.1 nedir?" },
        ],
        oneriler: [
          { olcutKod: "P.1", metin: "P.1 çıktıları kimlerle belirlendi?" },
          { olcutKod: "P.1", metin: "P.1 çıktıları nerede yayımlanıyor?" },
          { olcutKod: "P.1", metin: "P.1 çıktıları ne sıklıkla gözden geçiriliyor?" },
        ],
      },
      girdi,
    );
    expect(a.duzeltmeler).toEqual([]);
    expect(a.oneriler).toHaveLength(2);
    expect(a.reddedilen).toHaveLength(3);
  });
});

describe("olgu ima eden soru (inceleme D8-9)", () => {
  it("sıklık, geçmiş ortaç ya da iyelikli etkinlik varsayan öneri yakalanır; tarafsız soru geçer", () => {
    expect(olguImasi("P.2 kurulun haftalık toplantıları nasıl belgeleniyor?")).not.toBeNull();
    expect(olguImasi("P.3 yaptığınız anket sonuçları nerede?")).not.toBeNull();
    expect(olguImasi("P.4 düzenlenen çalıştay kimlere açıktı?")).not.toBeNull();
    expect(olguImasi("P.1 toplantılarınız kayda geçiyor mu?")).not.toBeNull();
    expect(olguImasi("P.5 mezunlarla nasıl iletişim kuruyorsunuz?")).toBeNull();
    expect(olguImasi("P.2 paydaş görüşü alınıyor mu, nasıl?")).toBeNull();
  });
});
