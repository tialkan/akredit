// Çıkış kapısı (İP-40): kişisel veri çıkmaz; bağdaştırıcılar kapı dışında çağrılamaz. Bütün veriler uydurmadır.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  type CikisKaydi,
  cikisKapisi,
  InsanIncelemesiGerekliHatasi,
  SAGLAYICI_KATALOGU,
  saglayiciBilgisi,
} from "../src/guvence/cikis-kapisi.ts";
import { maskele, supheliIcerik } from "../src/guvence/kvkk.ts";
import { type FetchIslevi, type Saglayici, YzHatasi } from "../src/saglayici.ts";
import { anthropic } from "../src/saglayicilar/anthropic.ts";
import { openaiUyumlu } from "../src/saglayicilar/openai-uyumlu.ts";
import { sahteSaglayici } from "../src/saglayicilar/sahte.ts";
import { openrouterWebArayici, sahteWebArayici, webAramaPolitikasi } from "../src/web-arama/index.ts";

// Kurgu TCKN (sağlaması kvkk.test.ts'te elle gösterildi).
const TCKN = "10000000146";

function sayanFetch(govde: unknown) {
  const cagrilar: { adres: string; govde: string }[] = [];
  const f: FetchIslevi = async (adres, ayar) => {
    cagrilar.push({ adres, govde: String(ayar.body) });
    return new Response(JSON.stringify(govde), { status: 200, headers: { "content-type": "application/json" } });
  };
  return Object.assign(f, { cagrilar });
}

const SOHBET_YANITI = { choices: [{ message: { content: "tamam" }, finish_reason: "stop" }] };
const ANTHROPIC_YANITI = { content: [{ type: "text", text: "tamam" }], stop_reason: "end_turn" };

describe("bypass yok: bağdaştırıcılar kapı dışında ağ isteği yapamaz", () => {
  it("Anthropic sohbet", async () => {
    const f = sayanFetch(ANTHROPIC_YANITI);
    const s = anthropic({ model: "m", anahtar: "kurgu", fetch: f });
    await expect(s.sohbet({ mesajlar: [{ rol: "kullanici", icerik: "x" }] })).rejects.toMatchObject({
      tur: "politika",
    });
    expect(f.cagrilar).toHaveLength(0);
  });

  it("OpenAI uyumlu sohbet ve gömme (yurt dışı ve yurt içi)", async () => {
    for (const hazir of ["openrouter", "openai", "evren", "ollama"] as const) {
      const f = sayanFetch(SOHBET_YANITI);
      const s = openaiUyumlu({ hazir, model: "m", anahtar: "kurgu", fetch: f });
      await expect(s.sohbet({ mesajlar: [{ rol: "kullanici", icerik: "x" }] })).rejects.toMatchObject({
        tur: "politika",
      });
      await expect(s.gomme?.(["x"])).rejects.toMatchObject({ tur: "politika" });
      expect(f.cagrilar).toHaveLength(0);
    }
  });

  it("OpenRouter web araması", async () => {
    const f = sayanFetch(SOHBET_YANITI);
    const a = openrouterWebArayici({ anahtar: "kurgu", model: "m", fetch: f });
    await expect(a.ara({ soru: "x", enCokSonuc: 1 })).rejects.toMatchObject({ tur: "politika" });
    expect(f.cagrilar).toHaveLength(0);
  });

  it("kaynakta ağa çıkan her dosya kapı denetimi yapar; jsonIstek'ten fazla ya da eşit sayıda", () => {
    const kok = join(import.meta.dirname, "..", "src");
    const dosyalar: string[] = [];
    const gez = (d: string) => {
      for (const g of readdirSync(d, { withFileTypes: true })) {
        const y = join(d, g.name);
        if (g.isDirectory()) gez(y);
        else if (g.name.endsWith(".ts") && !g.name.endsWith(".test.ts")) dosyalar.push(y);
      }
    };
    gez(kok);
    const agaCikan: string[] = [];
    for (const d of dosyalar) {
      if (d.endsWith(join("src", "http.ts"))) continue;
      const metin = readFileSync(d, "utf8");
      const istek = [...metin.matchAll(/\bjsonIstek\(/gu)].length;
      const dogrudanFetch = [...metin.matchAll(/\bfetch\(/gu)].length;
      // http.ts dışında doğrudan fetch çağrısı yoktur; ağ yalnız jsonIstek ile.
      expect(dogrudanFetch, d).toBe(0);
      if (istek === 0) continue;
      agaCikan.push(d.slice(kok.length + 1));
      const denetim = [...metin.matchAll(/\bkapiDenetimi\(\{/gu)].length;
      expect(denetim, d).toBeGreaterThanOrEqual(istek);
    }
    expect(agaCikan.sort()).toEqual([
      "saglayicilar/anthropic.ts",
      "saglayicilar/openai-uyumlu.ts",
      "web-arama/index.ts",
    ]);
  });

  it("kapı bağlamını kuran işlev paket dışına açılmaz", async () => {
    const paket = await import("../src/index.ts");
    expect(Object.keys(paket)).not.toContain("tekMetinKapisi");
    expect(Object.keys(paket)).toContain("cikisKapisi");
    expect(Object.keys(paket)).toContain("kapiDenetimi");
  });
});

describe("yurt dışı kip", () => {
  it("izin yoksa kurulmaz ve reddedildi kaydı yazılır", () => {
    const kayitlar: CikisKaydi[] = [];
    const s = sahteSaglayici([], { yurtIci: false, ad: "anthropic" });
    expect(() => cikisKapisi(s, { yurtDisiIzin: false, kaydet: (k) => kayitlar.push(k) })).toThrow(YzHatasi);
    expect(kayitlar.map((k) => [k.sonuc, k.ulke])).toEqual([["reddedildi", "ABD"]]);
  });

  it("kişisel veri maskelenir; kayıtta tür sayıları var, değer yok", async () => {
    const f = sayanFetch(SOHBET_YANITI);
    const kayitlar: CikisKaydi[] = [];
    const s = cikisKapisi(openaiUyumlu({ hazir: "openrouter", model: "m", anahtar: "kurgu", fetch: f }), {
      yurtDisiIzin: true,
      amac: "kanit_siniflama",
      kaydet: (k) => kayitlar.push(k),
      simdi: () => new Date("2026-10-28T10:00:00Z"),
    });
    const icerik = `Doç. Dr. Ayla Deniz (ayla@ornek.edu.tr, ${TCKN}) ile Öğrenci No: 2021123456 görüştü.
Adres: Fevzi Çakmak Mahallesi Kurgu Sokak No: 5
İmza: A. Deniz`;
    await s.sohbet({ mesajlar: [{ rol: "kullanici", icerik }] });
    const giden = f.cagrilar[0]?.govde ?? "";
    for (const parca of ["Ayla", "Deniz", "ayla@", TCKN, "2021123456", "Fevzi", "Kurgu Sokak", "A. Deniz"])
      expect(giden).not.toContain(parca);
    expect(kayitlar).toHaveLength(1);
    const k = kayitlar[0] as CikisKaydi;
    expect(k).toMatchObject({
      zaman: "2026-10-28T10:00:00.000Z",
      islem: "sohbet",
      kip: "yurt_disi",
      saglayici: "openrouter",
      ulke: "ABD",
      amac: "kanit_siniflama",
      sonuc: "gonderildi",
      // Elle sayım: bir kişi (unvanlı ad), bir e-posta, bir TCKN, bir öğrenci no, bir adres, bir imza.
      maskelenen: { KİŞİ: 1, EPOSTA: 1, TCKN: 1, "ÖĞRENCİ-NO": 1, ADRES: 1, İMZA: 1 },
    });
    const kayitMetni = JSON.stringify(kayitlar);
    for (const parca of ["Ayla", TCKN, "ornek.edu.tr", "2021123456", "Fevzi"]) expect(kayitMetni).not.toContain(parca);
  });

  it("şüpheli içerikte çağrı yapılmaz, insan incelemesi döner", async () => {
    const f = sayanFetch(SOHBET_YANITI);
    const kayitlar: CikisKaydi[] = [];
    const s = cikisKapisi(openaiUyumlu({ hazir: "openai", model: "m", anahtar: "kurgu", fetch: f }), {
      yurtDisiIzin: true,
      kaydet: (k) => kayitlar.push(k),
    });
    for (const icerik of [
      "Doğum tarihi: 01.01.2000 olan öğrenci",
      "Öğrencinin sağlık raporu ektedir.",
      "Anne adı: Kurgu",
    ]) {
      const hata = await s.sohbet({ mesajlar: [{ rol: "kullanici", icerik }] }).catch((e: unknown) => e);
      expect(hata).toBeInstanceOf(InsanIncelemesiGerekliHatasi);
      expect((hata as InsanIncelemesiGerekliHatasi).tur).toBe("insan_incelemesi");
    }
    expect(f.cagrilar).toHaveLength(0);
    expect(kayitlar.map((k) => k.sonuc)).toEqual(["engellendi", "engellendi", "engellendi"]);
    expect(kayitlar[1]?.supheler).toEqual({ "ÖZEL-NİTELİKLİ": 1 });
  });

  it("gömme de maskelenir ve kaydedilir", async () => {
    const f = sayanFetch({ data: [{ embedding: [0.1] }] });
    const kayitlar: CikisKaydi[] = [];
    const s = cikisKapisi(openaiUyumlu({ hazir: "openai", model: "m", anahtar: "kurgu", fetch: f }), {
      yurtDisiIzin: true,
      kaydet: (k) => kayitlar.push(k),
    });
    expect(await s.gomme?.(["Ali Veli Yıldız toplantıya katıldı."])).toEqual([[0.1]]);
    expect(f.cagrilar[0]?.govde).not.toContain("Yıldız");
    expect(kayitlar[0]).toMatchObject({ islem: "gomme", maskelenen: { KİŞİ: 1 } });
  });

  it("yurt içi sağlayıcı istenirse yurt dışı kipte (maskeli) çalışır; kip gevşetilemez", async () => {
    const ic = sahteSaglayici(["x"]);
    await cikisKapisi(ic, { yurtDisiIzin: false, kip: "yurt_disi" }).sohbet({
      mesajlar: [{ rol: "kullanici", icerik: "Zeynep Kaya" }],
    });
    expect(ic.istekler[0]?.mesajlar[0]?.icerik).toBe("[KİŞİ-1]");
    const disari = sahteSaglayici(["x"], { yurtIci: false });
    await cikisKapisi(disari, { yurtDisiIzin: true, kip: "kurum_ici" }).sohbet({
      mesajlar: [{ rol: "kullanici", icerik: "Zeynep Kaya" }],
    });
    expect(disari.istekler[0]?.mesajlar[0]?.icerik).toBe("[KİŞİ-1]");
  });
});

describe("kurum içi kip (EVREN, vLLM, Ollama)", () => {
  it("metin olduğu gibi gider, kurum içi kaydı yazılır", async () => {
    const f = sayanFetch(SOHBET_YANITI);
    const kayitlar: CikisKaydi[] = [];
    const s = cikisKapisi(openaiUyumlu({ hazir: "ollama", model: "m", fetch: f }), {
      yurtDisiIzin: false,
      kaydet: (k) => kayitlar.push(k),
    });
    await s.sohbet({ mesajlar: [{ rol: "kullanici", icerik: "Ayla Deniz" }] });
    expect(f.cagrilar[0]?.govde).toContain("Ayla Deniz");
    expect(kayitlar[0]).toMatchObject({ kip: "kurum_ici", ulke: "Kurum sunucusu", maskelenen: {} });
  });

  it("kurum içi kapıdan yurt dışı bağdaştırıcıya gidilemez", async () => {
    const f = sayanFetch(ANTHROPIC_YANITI);
    const gizliDisari = anthropic({ model: "m", anahtar: "kurgu", fetch: f });
    // Kendini yurt içi gösteren ama içeride yurt dışı bağdaştırıcıyı çağıran sarmalayıcı.
    const sahteIc: Saglayici = { ad: "kurum", model: "m", yurtIci: true, sohbet: (i) => gizliDisari.sohbet(i) };
    await expect(
      cikisKapisi(sahteIc, { yurtDisiIzin: false }).sohbet({ mesajlar: [{ rol: "kullanici", icerik: "x" }] }),
    ).rejects.toMatchObject({ tur: "politika" });
    expect(f.cagrilar).toHaveLength(0);
  });
});

describe("web araması kapıdan geçer", () => {
  it("soru maskelenir, şüpheli soru aranmaz, kayıt yazılır", async () => {
    const a = sahteWebArayici([]);
    const kayitlar: CikisKaydi[] = [];
    const p = webAramaPolitikasi(a, {
      yurtDisiIzin: true,
      webArama: { acik: true },
      kaydet: (k) => kayitlar.push(k),
    });
    await p.ara({ soru: "Prof. Dr. Kerem Toprak anket örneği", enCokSonuc: 2 });
    expect(a.istekler[0]?.soru).not.toContain("Kerem");
    await expect(p.ara({ soru: "kan grubu anketi tc no: 12", enCokSonuc: 2 })).rejects.toBeInstanceOf(
      InsanIncelemesiGerekliHatasi,
    );
    expect(a.istekler).toHaveLength(1);
    expect(kayitlar.map((k) => [k.islem, k.sonuc])).toEqual([
      ["web_arama", "gonderildi"],
      ["web_arama", "engellendi"],
    ]);
  });
});

describe("genişletilmiş maskeleyici", () => {
  it("unvan, etiket ve ad listesiyle ad yakalar; sıradan sözcükleri bırakır", () => {
    expect(maskele("Dr. Öğr. Üyesi Selin Aksoy").metin).toBe("Dr. Öğr. Üyesi [KİŞİ-1]");
    expect(maskele("Adı Soyadı: Kurgu Kişi\nBölüm: Hukuk").metin).toBe("Adı Soyadı: [KİŞİ-1]\nBölüm: Hukuk");
    expect(maskele("Mehmet Ali Kurgu raporu yazdı.").metin).toBe("[KİŞİ-1] raporu yazdı.");
    expect(maskele("Karadeniz bölgesi ve deniz kıyısı").metin).toBe("Karadeniz bölgesi ve deniz kıyısı");
    expect(maskele("2024 yılında 35 öğrenci").metin).toBe("2024 yılında 35 öğrenci");
  });

  it("kapatılınca bağlamlı ad yakalama çalışmaz", () => {
    expect(maskele("Mehmet Kurgu", { baglamliAd: false }).metin).toBe("Mehmet Kurgu");
  });

  it("şüphe denetimi yer tutucuyu şüpheli saymaz", () => {
    expect(supheliIcerik("T.C. Kimlik No: [TCKN-1]")).toEqual([]);
    expect(supheliIcerik("T.C. Kimlik No: 123")).toEqual([{ tur: "ETİKETLİ-KİMLİK", sayi: 1 }]);
  });
});

describe("sağlayıcı kataloğu", () => {
  it("doğrulanmamış ülkeler işaretli; bilinmeyen sağlayıcı bilinmiyor döner", () => {
    expect(SAGLAYICI_KATALOGU.filter((s) => s.kip === "yurt_disi").every((s) => !s.ulkeDogrulandi)).toBe(true);
    expect(saglayiciBilgisi("x", false).ulke).toBe("Bilinmiyor");
    expect(saglayiciBilgisi("ollama", true).kip).toBe("kurum_ici");
  });
});
