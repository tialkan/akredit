// İP-43 kuralları: kâğıt sınırı, numara okuma, onaya düşme (toplam ve azami her zaman Katman 2), yalnız kurum içi
// model. Uçtan uca akış `apps/isci/src/sinav-tarama/sinav-tarama.test.ts` içindedir. Numaralar uydurmadır.

import { readdirSync, readFileSync } from "node:fs";
import { sahteSaglayici } from "@akredit/yz";
import { describe, expect, it } from "vitest";
import { ServisHatasi } from "../hata.ts";
import {
  hucreKatmani,
  istemGuvenliMi,
  kagidiDegerlendir,
  kagitlaraBol,
  metindeSayiVarMi,
  numarayiOku,
  okuyucuKur,
  ortamdanYerelModel,
  Sablon,
  yerelOkuyucuKur,
} from "./index.ts";

const AZAMI = new Map([
  ["1", 10],
  ["2", 10],
  ["3", 20],
]);
const h = (alan: string, deger: number | null, guven = 0.99) => ({ alan, deger, guven });

describe("kâğıt sınırı", () => {
  it("sabit sayfa düzeni: 6 sayfa, kâğıt başına 2 sayfa → 3 kâğıt; bölünmezse hata", () => {
    expect(kagitlaraBol({ tur: "sayfa", sayfaSayisi: 2 }, ["", "", "", "", "", ""])).toEqual([
      [0, 1],
      [2, 3],
      [4, 5],
    ]);
    expect(() => kagitlaraBol({ tur: "sayfa", sayfaSayisi: 2 }, ["", "", ""])).toThrow(/3 sayfa/u);
    expect(() => kagitlaraBol({ tur: "sayfa", sayfaSayisi: 1 }, [])).toThrow(/sayfa yok/u);
  });
  it("kapak işareti: büyük-küçük harf ve boşluktan bağımsız; ilk sayfa kapak değilse hata", () => {
    const s = { tur: "kapak", isaret: "Akredit Sınav Kapak" } as const;
    expect(kagitlaraBol(s, ["akredit  sınav kapak", "devam"])).toEqual([[0, 1]]);
    expect(kagitlaraBol(s, ["AKREDIT SINAV KAPAK", "devam", "AKREDIT SINAV KAPAK", "devam", "devam"])).toEqual([
      [0, 1],
      [2, 3, 4],
    ]);
    expect(() => kagitlaraBol(s, ["devam", "AKREDIT SINAV KAPAK"])).toThrow(/İlk sayfada/u);
  });
});

describe("öğrenci numarası", () => {
  it("boşluk ve rakama benzeyen harfler düzeltilir; uzunluk tutmazsa ya da iki aday varsa null", () => {
    expect(numarayiOku(" 2099 000 101 ")).toBe("2099000101");
    expect(numarayiOku("20990OO1O3", 10)).toBe("2099000103");
    expect(numarayiOku("2099000101", 9)).toBeNull();
    expect(numarayiOku("okunaksız")).toBeNull();
    expect(numarayiOku("2099000101 2099000102")).toBeNull();
  });
  it("istem güvenliği: 5 ve üzeri ardışık rakam (araya boşluk ya da nokta girse de) istemde olamaz", () => {
    expect(istemGuvenliMi("soru 3 (en çok 20 puan) «7,5»")).toBe(true);
    expect(istemGuvenliMi("«2099000101»")).toBe(false);
    expect(istemGuvenliMi("«20 99 0»")).toBe(false);
  });
  it("inceleme dalga 8: dört haneli ya da her rakamı ayraçlı numara da istemde olamaz", () => {
    expect(istemGuvenliMi("soru 3 (en çok 100 puan) «12,5»")).toBe(true);
    expect(istemGuvenliMi("Kutu: kâğıttaki toplam puan (en çok 100 puan)\nTaranan metin: «85»")).toBe(true);
    for (const m of ["«2099»", "«2 0 9 9»", "«2, 0, 9, 9»", "«2-0-9-9»", "«2 / 0 / 9 / 9»", "«2|0|9|9»"])
      expect(istemGuvenliMi(m), m).toBe(false);
  });
});

describe("onaya düşme", () => {
  it("hepsi tutarsa her hücre otomatik (Katman 0), numara da", () => {
    // 8 + 7,5 + 15 = 30,5 = kâğıttaki toplam.
    const r = kagidiDegerlendir({
      sorular: [h("1", 8), h("2", 7.5), h("3", 15)],
      toplam: h("*toplam", 30.5),
      numaraOkundu: true,
      azami: AZAMI,
      esik: 0.9,
    });
    expect(r.map((x) => [x.alan, x.durum, x.katman])).toEqual([
      ["*numara", "otomatik", 0],
      ["1", "otomatik", 0],
      ["2", "otomatik", 0],
      ["3", "otomatik", 0],
      ["*toplam", "otomatik", 0],
    ]);
  });
  it("toplam tutarsızlığı ve azami aşımı güven 1 ve eşik en düşükken bile onaya düşer", () => {
    // 9 + 6 + 12 = 27 ≠ 28 → dört hücre de toplam_tutarsiz. 3. soruda 21 > 20 ayrı kâğıtta azami aşımı.
    const t = kagidiDegerlendir({
      sorular: [h("1", 9, 1), h("2", 6, 1), h("3", 12, 1)],
      toplam: h("*toplam", 28, 1),
      numaraOkundu: true,
      azami: AZAMI,
      esik: 0,
    });
    expect(t.filter((x) => x.durum === "onay_bekliyor").map((x) => x.alan)).toEqual(["1", "2", "3", "*toplam"]);
    expect(t.every((x) => x.alan === "*numara" || x.nedenler.includes("toplam_tutarsiz"))).toBe(true);
    const a = kagidiDegerlendir({
      sorular: [h("1", 10, 1), h("2", 10, 1), h("3", 21, 1)],
      toplam: null,
      numaraOkundu: true,
      azami: AZAMI,
      esik: 0,
    });
    expect(a.find((x) => x.alan === "3")).toMatchObject({
      durum: "onay_bekliyor",
      katman: 2,
      nedenler: ["azami_asimi"],
    });
    // Eksi puan da aşım sayılır; kâğıttaki toplam azami toplamı (40) aşarsa toplam hücresi onaya düşer.
    const e = kagidiDegerlendir({
      sorular: [h("1", -1), h("2", 10), h("3", 20)],
      toplam: h("*toplam", 41),
      numaraOkundu: true,
      azami: AZAMI,
      esik: 0.5,
    });
    expect(e.find((x) => x.alan === "1")?.nedenler).toContain("azami_asimi");
    expect(e.find((x) => x.alan === "*toplam")?.nedenler).toContain("azami_asimi");
  });
  it("binde bir ölçekte karşılaştırır: 0,1 + 0,2 = 0,3 tutar (kayan nokta hatası yok)", () => {
    const r = kagidiDegerlendir({
      sorular: [h("1", 0.1), h("2", 0.2)],
      toplam: h("*toplam", 0.3),
      numaraOkundu: true,
      azami: AZAMI,
      esik: 0.9,
    });
    expect(r.every((x) => x.durum === "otomatik")).toBe(true);
  });
  it("düşük güven, okunamayan değer ve okunamayan numara onaya düşer", () => {
    const r = kagidiDegerlendir({
      sorular: [h("1", 5, 0.4), h("2", null, 0)],
      toplam: null,
      numaraOkundu: false,
      azami: AZAMI,
      esik: 0.9,
    });
    expect(r.map((x) => [x.alan, x.nedenler])).toEqual([
      ["*numara", ["numara_okunamadi"]],
      ["1", ["dusuk_guven"]],
      ["2", ["dusuk_guven", "okunamadi"]],
    ]);
  });
  it("inceleme: modelin kutu metninde olmayan sayısı güven 1 olsa da otomatik kabul edilmez", () => {
    // Kutu metni "yedi" ya da boş; model 7 ve güven 1 dönüyor. Sayı metinde yok → onaya düşmeli.
    expect(metindeSayiVarMi("yedi", 7)).toBe(false);
    expect(metindeSayiVarMi("", 9)).toBe(false);
    expect(metindeSayiVarMi("7,5", 7.5)).toBe(true);
    expect(metindeSayiVarMi("l0", 10)).toBe(true);
    expect(metindeSayiVarMi("12", 1)).toBe(false);
    expect(metindeSayiVarMi("??", null)).toBe(true);
    const r = kagidiDegerlendir({
      sorular: [{ alan: "1", deger: 7, guven: 1, metinde: false }, h("2", 3, 1)],
      toplam: null,
      numaraOkundu: true,
      azami: AZAMI,
      esik: 0.5,
    });
    expect(r.find((x) => x.alan === "1")).toMatchObject({
      durum: "onay_bekliyor",
      katman: 2,
      nedenler: ["metinde_yok"],
    });
    expect(r.find((x) => x.alan === "1")).not.toHaveProperty("metinde");
  });
  it("onay kartı her zaman Katman 2, devredilemez; toplam ve azami kuralı öne çıkar", () => {
    expect(hucreKatmani(["dusuk_guven", "toplam_tutarsiz"])).toMatchObject({
      katman: 2,
      kural: "K2-sinav-toplam-tutarsiz",
      devredilemez: true,
    });
    expect(hucreKatmani(["azami_asimi"]).kural).toBe("K2-sinav-azami-asimi");
    expect(hucreKatmani(["dusuk_guven"]).gerekce).toMatch(/eşiğin altında/u);
  });
});

describe("şablon", () => {
  const kutu = { sayfa: 1, x: 0.1, y: 0.1, genislik: 0.1, yukseklik: 0.1 };
  it("taşan kutu ve tekrar eden soru reddedilir", () => {
    const s = { sinir: { tur: "sayfa", sayfaSayisi: 1 }, numara: kutu, sorular: [{ soruNo: "1", kutu }] };
    expect(Sablon.safeParse(s).success).toBe(true);
    expect(Sablon.safeParse({ ...s, numara: { ...kutu, x: 0.95 } }).success).toBe(false);
    expect(
      Sablon.safeParse({
        ...s,
        sorular: [
          { soruNo: "1", kutu },
          { soruNo: "1", kutu },
        ],
      }).success,
    ).toBe(false);
  });
});

describe("yalnız kurum içi model", () => {
  const istekler: string[] = [];
  const fetch = async (adres: string) => {
    istekler.push(adres);
    return new Response("{}", { status: 200 });
  };
  it("ayar yoksa, uzak bir hazır ad ya da kurum dışı adres verilirse kurulmaz; hiç istek gitmez", () => {
    for (const ayar of [
      null,
      undefined,
      {},
      { hazir: "openrouter", adres: "http://model/v1", model: "m" },
      { hazir: "openai", adres: "http://model/v1", model: "m" },
      { hazir: "evren", adres: "http://model/v1", model: "m" },
      { hazir: "anthropic", adres: "http://model/v1", model: "m" },
      { hazir: "ollama", adres: "https://openrouter.ai/api/v1", model: "m" },
      { hazir: "ollama", adres: "https://api.openai.com/v1", model: "m" },
      { hazir: "vllm", adres: "http://8.8.8.8:8000/v1", model: "m" },
      { hazir: "vllm", adres: "http://kullanici:parola@model:8000/v1", model: "m" },
      { hazir: "ollama", adres: "ftp://model/v1", model: "m" },
      { hazir: "ollama", adres: "http://model/v1", model: "m", yurtDisiIzin: true },
    ]) {
      expect(() => yerelOkuyucuKur(ayar, { fetch }), JSON.stringify(ayar)).toThrow(ServisHatasi);
    }
    expect(istekler).toHaveLength(0);
  });
  it("kurum ağındaki adresler kabul edilir", () => {
    for (const adres of [
      "http://model:11434/v1",
      "http://localhost:8000/v1",
      "http://10.0.0.5:8000/v1",
      "http://192.168.1.20:8000/v1",
      "http://akredit-model.akredit.svc.cluster.local:8000/v1",
    ])
      expect(yerelOkuyucuKur({ hazir: "vllm", adres, model: "m" }, { fetch }).ad).toBe("vllm");
  });
  it("inceleme dalga 8: ad kurum dışına çözülürse ya da sunucu yönlendirirse istek gitmez", async () => {
    const giden: string[] = [];
    const yanit = (govde: string, durum = 200, ek: Record<string, string> = {}) =>
      new Response(govde, { status: durum, headers: { "content-type": "application/json", ...ek } });
    const tamam = JSON.stringify({ choices: [{ message: { content: '{"deger":7.5,"guven":0.9}' } }] });
    const ic = async (adres: string, ayar: RequestInit) => {
      giden.push(adres);
      expect(ayar.redirect).toBe("manual");
      return yanit(tamam);
    };
    const ayar = { hazir: "vllm", adres: "http://model.internal:8000/v1", model: "m" };
    const HIZLI = { bekle: async () => {} };
    // Ad dışarıya çözülüyor: istek gitmez.
    const disari = yerelOkuyucuKur(ayar, { fetch: ic, http: HIZLI, coz: async () => ["8.8.8.8"] });
    await expect(disari.oku({ alan: "1", azami: 10, metin: "7,5" })).rejects.toThrow();
    // Adreslerden biri dışarıdaysa da gitmez; çözülemezse de gitmez.
    const karisik = yerelOkuyucuKur(ayar, { fetch: ic, http: HIZLI, coz: async () => ["10.0.0.5", "203.0.113.9"] });
    await expect(karisik.oku({ alan: "1", azami: 10, metin: "7,5" })).rejects.toThrow();
    const yok = yerelOkuyucuKur(ayar, { fetch: ic, http: HIZLI, coz: async () => [] });
    await expect(yok.oku({ alan: "1", azami: 10, metin: "7,5" })).rejects.toThrow();
    expect(giden).toHaveLength(0);
    // Kurum içine çözülen ad kabul edilir; yönlendirme izlenmez.
    const icerde = yerelOkuyucuKur(ayar, {
      fetch: ic,
      http: HIZLI,
      coz: async () => ["10.0.0.5", "::ffff:192.168.1.4"],
    });
    expect(await icerde.oku({ alan: "1", azami: 10, metin: "7,5" })).toEqual({ deger: 7.5, guven: 0.9 });
    expect(giden).toHaveLength(1);
    const yonlendiren = yerelOkuyucuKur(ayar, {
      http: HIZLI,
      fetch: async () => yanit("", 302, { location: "https://disari.example/v1" }),
      coz: async () => ["10.0.0.5"],
    });
    await expect(yonlendiren.oku({ alan: "1", azami: 10, metin: "7,5" })).rejects.toThrow();
  });
  it("ortamdan okuma: eksik değişkende null", () => {
    expect(ortamdanYerelModel({})).toBeNull();
    expect(
      ortamdanYerelModel({
        AKREDIT_YZ_HAZIR: "ollama",
        AKREDIT_YZ_ADRES: "http://model:11434/v1",
        AKREDIT_YZ_MODEL: "m",
      }),
    ).toEqual({ hazir: "ollama", adres: "http://model:11434/v1", model: "m" });
  });
  it("yurt içi olmayan sağlayıcı okuyucu olamaz; olan okuyucu numara biçimli metni modele göndermez", async () => {
    expect(() => okuyucuKur(sahteSaglayici(['{"deger":1,"guven":1}'], { yurtIci: false }))).toThrow(ServisHatasi);
    const s = sahteSaglayici(['{"deger":7.5,"guven":0.95}', "bozuk"], { yurtIci: true });
    const o = okuyucuKur(s);
    expect(await o.oku({ alan: "1", azami: 10, metin: "7,5" })).toEqual({ deger: 7.5, guven: 0.95 });
    expect(await o.oku({ alan: "1", azami: 10, metin: "20990001" })).toEqual({ deger: null, guven: 0 });
    // Bozuk yanıt okunamadı sayılır (onaya düşer).
    expect(await o.oku({ alan: "1", azami: 10, metin: "8" })).toEqual({ deger: null, guven: 0 });
    expect(s.istekler).toHaveLength(2);
  });
  it("kaynak taraması: modül kurumun YZ fabrikasını, uzak sağlayıcıları ya da yurt dışı iznini kullanmaz", () => {
    const dizin = new URL("./", import.meta.url);
    for (const ad of readdirSync(dizin).filter((d) => d.endsWith(".ts") && !d.endsWith(".test.ts"))) {
      const kod = readFileSync(new URL(ad, dizin), "utf8")
        .split("\n")
        .filter((s) => !s.trim().startsWith("//") && !s.trim().startsWith("*"))
        .join("\n");
      expect(kod, ad).not.toMatch(/kurumSaglayicisi|politikaUygula|anthropic\(|hazir:\s*"(openrouter|openai|evren)"/u);
      expect(kod, ad).not.toMatch(/yurtDisiIzin:\s*true|kip:\s*"yurt_disi"|fetch\(/u);
    }
  });
});
