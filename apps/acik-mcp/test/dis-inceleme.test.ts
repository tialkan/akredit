// Dış inceleme 2026-11-05 bulgularının davranış testleri: sahte başlıkla kota atlatılamaz, adres tablosu
// taşırılamaz, akış gövdesi sınırda kesilir, Bologna'da kimlik verisi reddedilir, büyük HTML taraması hızlıdır,
// teyitsiz yüzde ve doğrulanmamış kaynak yazma paketine giremez, sekmeli düz metinden katkı matrisi okunur.
// Bütün veriler kurgudur.

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { describe, expect, it } from "vitest";
import {
  ACIK_ARACLAR,
  AdresKovasi,
  acikMcpIsleyici,
  aracCalistir,
  genelAyristir,
  govdeOku,
  ingilizceAlanVar,
  istemciAdresi,
  kaynakDurumu,
  kaynakImzasi,
  kisiselVeriTurleri,
  obsKarsilastir,
  prolizMetniMi,
} from "../src/index.ts";

const SIMDI = () => new Date("2026-11-05T10:00:00Z");
const calistir = (ad: string, girdi: unknown) => {
  const a = ACIK_ARACLAR.find((x) => x.ad === ad);
  if (!a) throw new Error(ad);
  return aracCalistir(a, girdi, { simdi: SIMDI });
};
// biome-ignore lint/suspicious/noExplicitAny: test yardımcı erişimi
const sonuc = (r: { veri: Record<string, unknown> }) => r.veri.sonuc as any;

const rpc = (ad = "olcut_ara", argumanlar: Record<string, unknown> = { sorgu: "kalite" }) =>
  JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/call", params: { name: ad, arguments: argumanlar } });
const istek = (basliklar: Record<string, string>, govde = rpc()) =>
  new Request("https://akredit.org/mcp", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json, text/event-stream", ...basliklar },
    body: govde,
  });

// ---------------------------------------------------------------- 1-3. HTTP katmanı

describe("istemci adresi ve hız sınırı", () => {
  it("cf-connecting-ip, sonra x-real-ip, sonra x-forwarded-for'un sondan güvenilen öğesi", () => {
    const h = (o: Record<string, string>) => new Headers(o);
    expect(istemciAdresi(h({ "cf-connecting-ip": "203.0.113.7", "x-forwarded-for": "1.1.1.1" }))).toBe("203.0.113.7");
    expect(istemciAdresi(h({ "x-real-ip": "203.0.113.8", "x-forwarded-for": "1.1.1.1" }))).toBe("203.0.113.8");
    // İstemci "1.1.1.1" yazdı, vekil gerçek adresi sona ekledi.
    expect(istemciAdresi(h({ "x-forwarded-for": "1.1.1.1, 203.0.113.9" }))).toBe("203.0.113.9");
    // İki güvenilen vekil: sondan ikinci öğe.
    expect(istemciAdresi(h({ "x-forwarded-for": "1.1.1.1, 203.0.113.9, 10.0.0.2" }), 2)).toBe("203.0.113.9");
    expect(istemciAdresi(h({}))).toBe("bilinmeyen");
  });

  it("sahte x-forwarded-for ilk öğesini her istekte değiştiren istemci kotayı aşamaz", async () => {
    const isle = acikMcpIsleyici({ simdi: SIMDI, hiz: { kapasite: 3, saniyede: 0.001 }, gunluk: () => {} });
    const durumlar: number[] = [];
    for (let i = 0; i < 6; i++)
      durumlar.push((await isle(istek({ "x-forwarded-for": `10.0.0.${i}, 198.51.100.4` }))).status);
    // Kapasite 3: ilk üç geçer, sonrakiler 429. Sahte ilk öğe yeni adres sayılmaz.
    expect(durumlar.slice(0, 3).every((d) => d !== 429)).toBe(true);
    expect(durumlar.slice(3)).toEqual([429, 429, 429]);
  });

  it("adres tablosu dolunca süresi geçenler temizlenir; yine doluysa yeni adres reddedilir, eskiler sıfırlanmaz", () => {
    const k = new AdresKovasi(2, 1, 3);
    // a, b, c tabloyu doldurur; a iki jetonunu da harcar.
    expect(k.al("a", 0).izin).toBe(true);
    expect(k.al("a", 0).izin).toBe(true);
    expect(k.al("a", 0).izin).toBe(false);
    k.al("b", 0);
    k.al("c", 0);
    // Tablo dolu ve hiçbir kova dolmadı: yeni adres reddedilir, a'nın sayacı silinmez.
    expect(k.al("d", 0).izin).toBe(false);
    expect(k.boyut).toBe(3);
    expect(k.al("a", 0).izin).toBe(false);
    // 2 saniye sonra kovalar yeniden dolar (saniyede 1, kapasite 2): temizlenir, yeni adres kabul edilir.
    expect(k.al("d", 2000).izin).toBe(true);
    expect(k.boyut).toBe(1);
  });

  it("kaynak_dogrula için adres başına ayrı, sıkı kota (dakikada 5)", async () => {
    const isle = acikMcpIsleyici({ simdi: SIMDI, gunluk: () => {} });
    const govde = rpc("kaynak_dogrula", { kaynaklar: [{ doi: "gecersiz" }] });
    const durumlar: number[] = [];
    for (let i = 0; i < 7; i++)
      durumlar.push((await isle(istek({ "cf-connecting-ip": "198.51.100.20" }, govde))).status);
    expect(durumlar.slice(0, 5).every((d) => d === 200)).toBe(true);
    expect(durumlar.slice(5)).toEqual([429, 429]);
    // Öbür araçlar bu kotadan etkilenmez.
    expect((await isle(istek({ "cf-connecting-ip": "198.51.100.20" }))).status).toBe(200);
  });
});

describe("gövde sınırı (akış)", () => {
  /** content-length göndermeyen (chunked) sonsuz akış: her parça 64 KB. */
  const akis = () => {
    let gonderilen = 0;
    const govde = new ReadableStream<Uint8Array>({
      pull(c) {
        gonderilen += 65_536;
        c.enqueue(new Uint8Array(65_536).fill(32));
        if (gonderilen > 50_000_000) c.close();
      },
    });
    return { govde, gonderilen: () => gonderilen };
  };

  it("content-length yokken sınır aşılınca okuma kesilir; tamamı belleğe alınmaz", async () => {
    const a = akis();
    const r = new Request("https://akredit.org/mcp", { method: "POST", body: a.govde, duplex: "half" } as RequestInit);
    expect((await govdeOku(r, 512 * 1024)).tur).toBe("buyuk");
    expect(a.gonderilen()).toBeLessThan(1_000_000);
  });

  it("işleyici 413 döner", async () => {
    const a = akis();
    const isle = acikMcpIsleyici({ simdi: SIMDI, gunluk: () => {} });
    const r = await isle(
      new Request("https://akredit.org/mcp", {
        method: "POST",
        headers: { "content-type": "application/json", "x-real-ip": "198.51.100.30" },
        body: a.govde,
        duplex: "half",
      } as RequestInit),
    );
    expect(r.status).toBe(413);
    expect(a.gonderilen()).toBeLessThan(1_000_000);
  });

  it("şema sınırları HTTP sınırıyla tutarlı: not tablosu en çok 400.000 karakter", () => {
    const r = calistir("not_tablosu_ayristir", { tablo: "1\t2\n".repeat(110_000) });
    expect(r.veri.kod).toBe("gecersiz_girdi");
  });
});

// ---------------------------------------------------------------- 5-6. Kişisel veri ve başarım

describe("Bologna araçlarında kişisel veri", () => {
  // Kurgu T.C. kimlik no: 1,0,0,0,0,0,0,0,1 → 10. hane ((1+0+0+0+1) x 7 - 0) mod 10 = 4,
  // 11. hane (1+0+0+0+0+0+0+0+1+4) mod 10 = 6 → 10000000146.
  const TCKN = "10000000146";

  it("T.C. kimlik no, öğrenci numarası ve IBAN reddedilir; yayımlanmış öğretim elemanı adı serbesttir", () => {
    const ders = { kod: "KRG101", ad: "Kurgu", akts: 5 };
    const amac = (tr: string) => ({ ders, secenekler: [{ etiket: "A", alanlar: { amac: { tr } } }] });
    for (const tr of [
      `Sorumlu kimlik: ${TCKN}`,
      "Örnek öğrenci: Öğrenci No: 2026000123",
      "Ödeme: TR330006100519786457841326",
    ]) {
      const r = calistir("bologna_taslak_denetle", amac(tr));
      expect(r.veri.kod).toBe("kisisel_veri");
      expect(JSON.stringify(r.veri)).not.toMatch(/10000000146|2026000123|TR33/u);
    }
    const serbest = calistir("bologna_taslak_denetle", {
      ...amac("Ders Prof. Dr. Ece Kurgu ve Dr. Ali Örnek tarafından yürütülür."),
      ders: { ...ders, yetkililer: [{ rol: "Dersi Verenler", deger: "Doç. Dr. Ece Kurgu, 0 (212) 000 00 00" }] },
    });
    expect(serbest.hata).toBe(false);
  });

  it("künyedeki ISBN-10 ve görev satırı numara sayılmaz; künye dışında 10 haneli numara sayılır", () => {
    // 0306406152 bilinen geçerli ISBN-10 örneğidir; etiketsiz 10 hane öğrenci numarası desenine de uyar.
    expect(
      kisiselVeriTurleri({ kaynaklar: ["Kurgucu, A. (2020). Kurgu. ISBN 0306406152"] }, ["kaynaklar"], "ogrenci"),
    ).toEqual([]);
    expect(
      kisiselVeriTurleri({ yetkililer: [{ rol: "Telefon", deger: "4240000000" }] }, ["yetkililer"], "ogrenci"),
    ).toEqual([]);
    expect(kisiselVeriTurleri({ amac: "ISBN 0306406152" }, ["kaynaklar"], "ogrenci")).toEqual(["öğrenci numarası"]);
  });

  it("HTML'de yalnız görünen metin taranır: öznitelikteki numara ve betik numara sayılmaz", () => {
    const html =
      '<table><tr><td data-id="2026000123"><a href="/ders?id=2026000124">Amaç</a></td></tr></table><script>var k=2026000125;</script>';
    expect(kisiselVeriTurleri({ html }, [], "ogrenci")).toEqual([]);
    expect(kisiselVeriTurleri({ html: `${html}<p>Öğrenci No: 2026000126</p>` }, [], "ogrenci")).toEqual([
      "öğrenci numarası",
    ]);
  });

  it("512 KB Bologna HTML'i 300 ms altında taranır ve ayrıştırılır", () => {
    const satir =
      '<tr><td class="etiket" data-kimlik="12345678">Dersin İçeriği</td><td>Bu ders kurgu ölçme yöntemlerini, gösterge türlerini ve Prof. Dr. Ece Kurgu ile yürütülen uygulamaları kapsar.</td></tr>\n';
    const html = `<html><body><table>${satir.repeat(Math.ceil((512 * 1024) / satir.length))}</table></body></html>`;
    expect(html.length).toBeGreaterThan(512 * 1024);
    const bas = performance.now();
    expect(kisiselVeriTurleri({ html }, ["kaynaklar", "yetkililer"], "ogrenci")).toEqual([]);
    expect(performance.now() - bas).toBeLessThan(300);
  });

  it("giriş bilgisi iletisi 'hiç girmez' demez; reddedildiğini ve kaydedilmediğini söyler", () => {
    const r = calistir("rapor_dil_denetle", { metin: "OBS parola: Gizli.Parola-1" });
    expect(String(r.veri.hata)).toMatch(/istemez; görülen istek reddedildi ve kaydedilmedi/u);
    expect(String(r.veri.hata)).not.toMatch(/hiç verilmez|hiç girmez/u);
  });
});

// ---------------------------------------------------------------- 7. akredit_basla

describe("akredit_basla", () => {
  it("parametresiz; menüyü, kısa kuralları ve her seçimin akışını yapılandırılmış döndürür", async () => {
    const a = ACIK_ARACLAR.find((x) => x.ad === "akredit_basla");
    expect(a?.aciklama).toMatch(/^Kullanıcı 'akredit' yazar ya da ne yapacağını sorarsa İLK bu aracı çağır/u);
    expect(ACIK_ARACLAR[0]?.ad).toBe("akredit_basla");
    const s = sonuc(calistir("akredit_basla", {}));
    expect(s.hocayaGoster).toMatch(/^Merhaba\. Neye odaklanalım\?/u);
    expect(s.menu.map((m: { no: string }) => m.no)).toEqual(["1", "2", "3", "4", "5", "6"]);
    expect(Object.keys(s.akislar)).toEqual(["1", "2", "3", "4", "5"]);
    expect(s.akislar["1"]).toContain("Odak: Bologna");
    expect(s.kisaKurallar.join(" ")).toMatch(/TEK mesajda/u);
    // SDK üzerinden de parametresiz çağrılır.
    const isle = acikMcpIsleyici({ simdi: SIMDI, gunluk: () => {} });
    const c = new Client({ name: "test", version: "1.0.0" });
    await c.connect(
      new StreamableHTTPClientTransport(new URL("https://akredit.org/mcp"), {
        fetch: (u, i) => isle(new Request(u, i)),
      }),
    );
    const r = (await c.callTool({ name: "akredit_basla", arguments: {} })) as unknown as {
      structuredContent: { sonuc: { menu: unknown[] } };
    };
    expect(r.structuredContent.sonuc.menu).toHaveLength(6);
    await c.close();
  });
});

// ---------------------------------------------------------------- 10-11. Yazma paketi ve kaynak doğrulaması

describe("yazma paketi kapısı", () => {
  const ders = { kod: "KRG101", ad: "Kurgu Bilimine Giriş", akts: 5, tul: "2+1+0", donem: "2026-2027 Güz" };
  const degerlendirme = [
    { ad: "Ara Sınav", sayi: 1, katki: 40 },
    { ad: "Yarıyıl Sonu Sınavı", sayi: 1, katki: 60 },
  ];
  const kunye = "Kurgucu, A. (2020). Kurgu ölçme. Kurgu Yayınları.";
  const baglanti = "https://openlibrary.org/books/OL0000001M";

  it("teyitsiz değerlendirme yüzdesi yazma paketine giremez; sayfadan ya da hocadan gelince girer", () => {
    const teyitsiz = sonuc(calistir("bologna_kopya_metni", { ders, alanlar: { degerlendirme } }));
    expect(teyitsiz.metin).not.toContain("Ara Sınav\t1\t40");
    expect(teyitsiz.obsKarsilastirGirdisi.beklenen).toEqual([]);
    expect(teyitsiz.yazilamayan[0]).toMatchObject({ alan: "Değerlendirme" });
    const oneri = sonuc(
      calistir("bologna_kopya_metni", { ders, alanlar: { degerlendirme, degerlendirmeDayanagi: "oneri" } }),
    );
    expect(oneri.metin).not.toContain("Ara Sınav\t1\t40");
    const hoca = sonuc(
      calistir("bologna_kopya_metni", { ders, alanlar: { degerlendirme, degerlendirmeDayanagi: "hoca" } }),
    );
    expect(hoca.metin).toContain("Ara Sınav\t1\t40");
    expect(hoca.yazilamayan).toEqual([]);
  });

  it("doğrulanmamış (düz metin, imzasız ya da sahte imzalı) kaynak yazılamaz; katalog imzalı ve hoca beyanı yazılır", () => {
    const imza = kaynakImzasi(kunye, baglanti);
    const kaynaklar = [
      kunye,
      { kunye, dogrulama: { durum: "katalogda_bulundu", baglanti } },
      { kunye, dogrulama: { durum: "katalogda_bulundu", baglanti, imza: "0".repeat(32) } },
      {
        kunye: "Uydurma, B. (2022). İleri algoritmalar. Hayal.",
        dogrulama: { durum: "katalogda_bulundu", baglanti, imza },
      },
      { kunye, dogrulama: { durum: "katalogda_bulundu", baglanti, imza } },
      { kunye: "Hocabilir, C. (2019). Türkçe ders kitabı. Kurgu.", dogrulama: "hoca_beyani" },
    ];
    expect(kaynaklar.map((k) => kaynakDurumu(k as never))).toEqual([
      "dogrulanmamis",
      "dogrulanmamis",
      "dogrulanmamis",
      "dogrulanmamis",
      "katalogda_bulundu",
      "hoca_beyani",
    ]);
    const td = sonuc(
      calistir("bologna_taslak_denetle", { ders, secenekler: [{ etiket: "A", alanlar: { kaynaklar } }] }),
    );
    const kaynakHatalari = td.secenekler[0].eksikler.filter((e: { neden: string }) =>
      /doğrulanmamış kaynak yazılamaz/u.test(e.neden),
    );
    expect(kaynakHatalari).toHaveLength(4);
    expect(td.secenekler[0].bicimDenetimi).toBe("geçmedi");
    const km = sonuc(calistir("bologna_kopya_metni", { ders, alanlar: { kaynaklar } }));
    expect(km.metin).not.toContain("Uydurma, B.");
    expect(km.metin).toContain("Hocabilir, C.");
    expect(km.yazilamayan.filter((y: { alan: string }) => y.alan === "Kaynaklar")).toHaveLength(4);
    const durum = sonuc(calistir("bologna_durum", { ders, alanlar: { kaynaklar: [kunye, kunye] } }));
    expect(durum.alanlar.find((a: { alan: string }) => a.alan === "kaynaklar").durum).toBe("kurala_uymuyor");
  });

  it("önceki ve yeni değer özeti alan alan döner", () => {
    const amac = { tr: "Yeni amaç metni." };
    const km = sonuc(
      calistir("bologna_kopya_metni", {
        ders,
        alanlar: { amac, onKosul: "Yok" },
        oncekiDegerler: { "Dersin Amacı (Türkçe)": "Eski amaç.", "Ön Koşul": "Yok" },
      }),
    );
    expect(km.degisiklikOzeti).toEqual([
      {
        no: 1,
        sekme: "Ders Bilgileri",
        alan: "Dersin Amacı (Türkçe)",
        onceki: "Eski amaç.",
        yeni: "Yeni amaç metni.",
        degisim: "değişecek",
      },
      { no: 2, sekme: "Ders Bilgileri", alan: "Ön Koşul", onceki: "Yok", yeni: "Yok", degisim: "aynı" },
    ]);
    expect(km.obsKarsilastirGirdisi).toMatchObject({ dersKodu: "KRG101", donem: "2026-2027 Güz" });
  });
});

describe("obs_karsilastir", () => {
  const beklenen = [
    { alan: "Dersin Amacı (Türkçe)", deger: "Bu ders kurgu ölçmeyi tanıtır." },
    { alan: "Değerlendirme", deger: "Ara Sınav\t1\t40\nYarıyıl Sonu Sınavı\t1\t60" },
  ];
  it("eşleşen ve farklı alanları döndürür", () => {
    const s = obsKarsilastir({
      dersKodu: "KRG101",
      beklenen,
      geriOkunan: {
        metin: "<h1>KRG101 Kurgu</h1><p>Bu ders  kurgu ölçmeyi tanıtır.</p><td>Ara Sınav</td><td>1</td><td>30</td>",
      },
    });
    expect(s.dur).toBe(false);
    expect(s.alanlar.map((a) => a.durum)).toEqual(["eslesti", "farkli"]);
    // Tablo satırı tek parça karşılaştırılır: sayfada "ara sınav 1 30" var, beklenen "ara sınav 1 40".
    expect(s.alanlar[1]?.eksikParcalar).toEqual(["ara sınav 1 40", "yarıyıl sonu sınavı 1 60"]);
  });

  it("ders kodu ya da dönem değişmişse dur der", () => {
    const metin = "KRG102 Başka Ders 2025-2026 Bahar Bu ders kurgu ölçmeyi tanıtır.";
    expect(obsKarsilastir({ dersKodu: "KRG101", beklenen, geriOkunan: { metin } }).dur).toBe(true);
    const d = obsKarsilastir({
      dersKodu: "KRG102",
      donem: "2026-2027 Güz",
      beklenen,
      geriOkunan: { metin, donem: "2025-2026 Bahar" },
    });
    expect(d.dur).toBe(true);
    expect(d.nedenler.join(" ")).toMatch(/dönemi \(2025-2026 Bahar\) beklenenden \(2026-2027 Güz\) farklı/u);
  });
});

// ---------------------------------------------------------------- 13-14. İngilizce ve düz metin

describe("sekmeli düz metin (Ctrl+A, Ctrl+C)", () => {
  // Kurgu Proliz düz metni: tablolar sekmeyle ayrılır, boş hücre boş kalır.
  const METIN = [
    "Yarıyıl\tKodu\tAdı\tT+U+L\tKredi\tAKTS",
    "3\tKRG205\tKurgu Veri Çözümlemesi\t2+1+0\t3\t5",
    "Dersin Amacı",
    "Bu ders kurgu verisinin çözümlenmesini tanıtır.",
    "Dersin İçeriği",
    "Kurgu verisinin toplanması, temizlenmesi ve çözümlenmesi.",
    "Öğrenme Çıktıları",
    "1\tKurgu verisini açıklar.",
    "2\tTemel göstergeleri hesaplar.",
    "3\tÇözümleme raporu yazar.",
    "Ders Yapısı",
    "Alan Bilgisi\t%60",
    "Temel Bilim\t%40",
    "Prg.Çıktısına Katkısı",
    "\tP1\tP2\tP3",
    "Ö1\t5\t\t3",
    "Ö2\t\t4\t",
    "Ö3\t2\t\t5",
    "Tüm\t4\t4\t4",
    "Değerlendirme",
    "Ara Sınav\t1\t40",
    "Yarıyıl Sonu Sınavı\t1\t60",
  ].join("\n");

  it("katkı matrisi sütun hizasıyla, ders yapısı yüzdeleriyle okunur; Proliz düz metni tanınır", () => {
    expect(prolizMetniMi(METIN)).toBe(true);
    const g = genelAyristir(METIN);
    expect(g.ders.katki).toEqual({
      Ö1: { P1: "5", P2: "", P3: "3" },
      Ö2: { P1: "", P2: "4", P3: "" },
      Ö3: { P1: "2", P2: "", P3: "5" },
      Tüm: { P1: "4", P2: "4", P3: "4" },
    });
    expect(g.ders.dersYapisi).toEqual([
      { alan: "Alan Bilgisi", yuzde: 60 },
      { alan: "Temel Bilim", yuzde: 40 },
    ]);
    expect(g.ders.ciktilar.map((c) => c.kod)).toEqual(["Ö1", "Ö2", "Ö3"]);
    const r = sonuc(calistir("bologna_ayristir", { metin: METIN }));
    expect(r.bicim).toBe("proliz_duz_metin");
    expect(r.bolognaDenetleGirdisi.ders.katki.Ö1).toEqual({ P1: "5", P2: "", P3: "3" });
    expect(r.ingilizce).toBe(false);
  });

  it("başlıkta satır etiketi sütunu yoksa veri bir sütun kaydırılır", () => {
    const g = genelAyristir(["Dersin Amacı", "Kurgu.", "Program Çıktısına Katkı", "P1\tP2", "Ö1\t3\t5"].join("\n"));
    expect(g.ders.katki).toEqual({ Ö1: { P1: "3", P2: "5" } });
  });

  it("İngilizce alan varsa ingilizce true; yoksa false", () => {
    expect(ingilizceAlanVar("Course Objectives\tThis course...")).toBe(true);
    expect(ingilizceAlanVar("Dersin Amacı (İngilizce)\t...")).toBe(true);
    expect(ingilizceAlanVar("Dersin Amacı\tBu ders...")).toBe(false);
  });
});
