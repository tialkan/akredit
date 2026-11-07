// Otonomi sözleşmesi: sahte (kural tabanlı) asistan sunucunun yanıtlarını izler ve yalnız hocayaSimdiSor true
// olduğunda durup hocaya sorar. Ölçüt, bütün tur boyunca hocaya kaç kez danışıldığıdır.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ACIK_ARACLAR, aracCalistir } from "../src/index.ts";

const SIMDI = () => new Date("2026-11-07T09:00:00Z");
const arac = (ad: string) => {
  const a = ACIK_ARACLAR.find((x) => x.ad === ad);
  if (!a) throw new Error(ad);
  return a;
};
const sayfa = (n: string) =>
  readFileSync(
    join(import.meta.dirname, `../../../packages/baglayicilar/test/fixtures/bologna/ders-${n}.html`),
    "utf8",
  );

/** Sahte asistan: çağrı sırasını ve hocaya danıştığı durakları kaydeder. */
function sahteAsistan() {
  const cagrilar: string[] = [];
  const duraklar: string[] = [];
  return {
    cagrilar,
    duraklar,
    cagir(ad: string, girdi: unknown) {
      const r = aracCalistir(arac(ad), girdi, { simdi: SIMDI });
      expect(r.hata, `${ad}: ${JSON.stringify(r.veri).slice(0, 300)}`).toBe(false);
      cagrilar.push(ad);
      // biome-ignore lint/suspicious/noExplicitAny: test erişimi
      const v = r.veri as any;
      if (v.hocayaSimdiSor) duraklar.push(ad);
      return v;
    },
    /** Asistanın kendi yazdığı rapor mesajı da bir duraktır (teyit + seçim tek mesajda). */
    hocayaSor(neden: string) {
      duraklar.push(neden);
    },
  };
}

describe("otonomi senaryosu: 'akredit ders paketimi doldur' → tarama → tek rapor → tek kayıt onayı", () => {
  it("iki dersi tarar; hocaya en çok iki kez danışır (rapor+teyit, kayıt onayı)", () => {
    const a = sahteAsistan();
    // 1. Niyet sunucuda çözülür: menü yok, durak yok.
    const basla = a.cagir("akredit_basla", { kullaniciMesaji: "akredit ders paketimi doldur" });
    expect(basla.sonuc.odak.no).toBe("1");

    // 2. Ders listesi açıldı: "hangi ders?" yok.
    const liste = a.cagir("obs_ders_listesi", {
      dersler: [
        { kod: "KRG9001", ad: "Kurgu 1" },
        { kod: "KRG9002", ad: "Kurgu 2" },
      ],
    });
    expect(liste.taramaPlani ?? liste.sonuc.taramaPlani).toHaveLength(2);

    // 3. Her ders tek çağrıyla ayrıştırılır ve denetlenir (bologna_denetle ayrıca çağrılmaz).
    const taranan = ["9001", "9002"].map((n) => a.cagir("bologna_ayristir", { html: sayfa(n) }).sonuc);
    for (const t of taranan) expect(t.denetim, "ayrıştırma denetimi gömülü döndürmeli").toBeDefined();
    expect(a.cagrilar).not.toContain("bologna_denetle");

    // 4. Tek rapor: eksikler + sayfada olmayan resmî bilgi tek mesajda sorulur.
    a.hocayaSor("rapor ve teyit");
    // Hoca: "1. vize 40 final 60, kaynak sayfadaki" → hocanın yanıtı kanıt olarak verilir.
    const ders = { kod: "KRG9001", ad: "Kurgu 1", akts: 5, tul: "2+1+0" };
    const kopya = a.cagir("bologna_kopya_metni", {
      ders,
      alanlar: {
        amac: { tr: "Kurgu biliminin temel kavramlarını tanıtmak ve uygulamalı örneklerle pekiştirmek." },
        degerlendirme: [
          { ad: "Ara Sınav", sayi: 1, katki: 40 },
          { ad: "Yarıyıl Sonu Sınavı", sayi: 1, katki: 60 },
        ],
        degerlendirmeDayanagi: "hoca",
        degerlendirmeKaniti: "vize 40 final 60",
      },
    });
    // 5. Kayıt onayı durağı (özetle aynı mesaj).
    expect(kopya.hocayaSimdiSor).toBe(true);
    expect(kopya.sonuc.yazilamayan).toEqual([]);

    // 6. Kayıttan sonra geri okuma: eşleşirse durak yok.
    const beklenen = kopya.sonuc.obsKarsilastirGirdisi;
    const geri = a.cagir("obs_karsilastir", {
      ...beklenen,
      geriOkunan: {
        // Geri okunan sayfa ders kodunu ve kaydedilen değerleri içerir.
        metin: ["KRG9001 Kurgu 1", ...beklenen.beklenen.map((x: { deger: string }) => x.deger)].join("\n"),
        dersKodu: "KRG9001",
      },
    });
    expect(geri.sonuc.dur).toBe(false);

    expect(a.duraklar).toEqual(["rapor ve teyit", "bologna_kopya_metni"]);
    expect(a.duraklar.length).toBeLessThanOrEqual(2);
  });

  it("uydurma koruması: asistan hocaya sormadan yüzde yazarsa paket reddeder ve durak açar", () => {
    const a = sahteAsistan();
    const kopya = a.cagir("bologna_kopya_metni", {
      ders: { kod: "KRG9001", ad: "Kurgu 1", akts: 5 },
      alanlar: {
        degerlendirme: [
          { ad: "Ara Sınav", sayi: 1, katki: 40 },
          { ad: "Yarıyıl Sonu Sınavı", sayi: 1, katki: 60 },
        ],
        // Sayfada tablo yok; asistan 'sayfa' diyor ama kanıt metninde yüzdeler geçmiyor.
        degerlendirmeDayanagi: "sayfa",
        degerlendirmeKaniti: "Değerlendirme tablosu boş.",
      },
    });
    expect(kopya.sonuc.yazilamayan.map((x: { alan: string }) => x.alan)).toEqual(["Değerlendirme"]);
    expect(kopya.sonuc.metin).not.toContain("Ara Sınav\t1\t40");
  });
});
