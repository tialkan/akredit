import { describe, expect, it } from "vitest";
import { calistir } from "../src/degerlendirme/cli.ts";
import { degerlendir, sonucTablosu } from "../src/degerlendirme/duzenek.ts";
import { KANIT_SINIFLAMA_ORNEKLERI, KURGU_OLCUTLER, KURGU_TUTANAK } from "../src/degerlendirme/ornekler.ts";
import { gorevCalistir } from "../src/gorevler/gorev.ts";
import { kanitSiniflama } from "../src/gorevler/kanit-siniflama.ts";
import { toplantiBilgisi, tutanagiMaskele } from "../src/gorevler/toplanti-bilgisi.ts";
import { maskeleyen, politikaUygula, saglayiciSec } from "../src/guvence/politika.ts";
import { YzHatasi } from "../src/saglayici.ts";
import { sahteSaglayici } from "../src/saglayicilar/sahte.ts";

describe("sağlayıcı politikası", () => {
  it("yurt dışı sağlayıcı, izin yokken çağrılamaz", () => {
    const disari = sahteSaglayici(["x"], { yurtIci: false });
    expect(() => politikaUygula(disari, { yurtDisiIzin: false })).toThrow(YzHatasi);
    expect(() => politikaUygula(disari, { yurtDisiIzin: false })).toThrow(/izin vermiyor/u);
    expect(() => saglayiciSec([disari], { yurtDisiIzin: false })).toThrow(/izin vermiyor/u);
    expect(() => saglayiciSec([], { yurtDisiIzin: true })).toThrow(YzHatasi);
    expect(disari.istekler).toHaveLength(0);
  });

  it("yurt içi sağlayıcı olduğu gibi döner ve öncelik alır", () => {
    const ic = sahteSaglayici([]);
    const disari = sahteSaglayici([], { yurtIci: false });
    expect(politikaUygula(ic, { yurtDisiIzin: false })).toBe(ic);
    expect(saglayiciSec([disari, ic], { yurtDisiIzin: true })).toBe(ic);
  });

  it("izin varsa maskeleme zorunlu: sağlayıcı kişisel veriyi görmez, yanıt geri çevrilir", async () => {
    const disari = sahteSaglayici(
      [
        (i) => ({
          icerik: `Özet: ${i.mesajlar[0]?.icerik}`,
          aracCagrilari: [{ id: "a", ad: "yaz", argumanlar: { kisi: "[KİŞİ-1]" }, ham: '{"kisi":"[KİŞİ-1]"}' }],
        }),
      ],
      { yurtIci: false, yapilandirilmisCikti: true },
    );
    const s = politikaUygula(disari, { yurtDisiIzin: true, maske: { adlar: ["Ayla Deniz"] } });
    expect(s.yapilandirilmisCikti).toBe(true);
    const y = await s.sohbet({
      mesajlar: [
        { rol: "kullanici", icerik: "Ayla Deniz (ayla@ornek.org) katıldı." },
        {
          rol: "asistan",
          icerik: "",
          aracCagrilari: [{ id: "b", ad: "ara", argumanlar: { q: "Ayla Deniz" }, ham: '{"q":"Ayla Deniz"}' }],
        },
      ],
    });
    const giden = JSON.stringify(disari.istekler[0]);
    expect(giden).not.toContain("Ayla");
    expect(giden).not.toContain("ayla@ornek.org");
    expect(y.icerik).toBe("Özet: Ayla Deniz (ayla@ornek.org) katıldı.");
    expect(y.aracCagrilari[0]?.argumanlar).toEqual({ kisi: "Ayla Deniz" });
    expect(y.aracCagrilari[0]?.ham).toBe('{"kisi":"Ayla Deniz"}');
    expect(saglayiciSec([disari], { yurtDisiIzin: true }).ad).toBe("sahte");
  });

  it("maskeleyen, yapılandırılmış çıktı bilgisi yoksa eklemez", () => {
    const { yapilandirilmisCikti: _y, ...yalin } = sahteSaglayici([]);
    expect(maskeleyen(yalin, {}).yapilandirilmisCikti).toBeUndefined();
  });
});

describe("kanıt sınıflama görevi", () => {
  it("altın örnekte geçerli; istemde belge veri etiketiyle sarılıdır", async () => {
    const o = KANIT_SINIFLAMA_ORNEKLERI[0];
    if (!o) throw new Error("örnek yok");
    const s = sahteSaglayici([o.sahteYanit ?? ""]);
    const r = await gorevCalistir(kanitSiniflama, o.girdi, s);
    expect(r.gecerli).toBe(true);
    expect(r.veri.belgeTuru).toBe("izlence");
    const kullanici = s.istekler[0]?.mesajlar.find((m) => m.rol === "kullanici")?.icerik ?? "";
    expect(kullanici).toContain('<akredit-veri kaynak="belge">');
    expect(kullanici).toContain("[K:0f1e2d3c s.1]");
  });

  it("listede olmayan ölçüt, tekrar, bozuk ve uydurma atıf yakalanır", async () => {
    const yanit = JSON.stringify({
      belgeTuru: "tutanak",
      olcutOnerileri: [
        { olcutKod: "Z.9", gerekce: "x", atif: "[K:a1b2c3d4 s.1]", guven: 0.5 },
        { olcutKod: "B.1", gerekce: "x", atif: '[K:a1b2c3d4 s.2 "hiç geçmeyen alıntı"]', guven: 0.5 },
        { olcutKod: "B.1", gerekce: "x", atif: "[K:ffffffff]", guven: 0.5 },
      ],
    });
    const r = await gorevCalistir(
      kanitSiniflama,
      { kanit: KURGU_TUTANAK, olcutler: KURGU_OLCUTLER },
      sahteSaglayici([yanit]),
    );
    expect(r.gecerli).toBe(false);
    expect(r.sorunlar.map((s) => s.aciklama)).toEqual([
      "Listede olmayan ölçüt: Z.9",
      "Alıntı kanıtın metninde geçmiyor.",
      "Ölçüt iki kez önerilmiş: B.1",
      "Atıf yapılan kanıt bulunamadı.",
    ]);
  });
});

describe("toplantı bilgisi görevi", () => {
  const girdi = { kanit: KURGU_TUTANAK, adlar: ["Ayla Deniz", "Kerem Toprak", "İlknur Yaz"] };

  it("adlar modele maskeli gider", async () => {
    const s = sahteSaglayici(["{}"], { sonuTekrarla: true });
    await gorevCalistir(toplantiBilgisi, girdi, s).catch(() => undefined);
    const giden = JSON.stringify(s.istekler);
    for (const ad of ["Ayla", "Kerem", "İlknur"]) expect(giden).not.toContain(ad);
    expect(tutanagiMaskele(girdi).eslemeler).toHaveLength(3);
    expect(tutanagiMaskele({ kanit: KURGU_TUTANAK }).eslemeler).toHaveLength(0);
  });

  it("uydurma tarih, sayı ve atıfsız alanlar reddedilir", async () => {
    const yanit = JSON.stringify({
      tarih: "2026-03-15",
      tarihAtif: '[K:a1b2c3d4 s.1 "tarihinde yapıldı"]',
      toplantiTuru: "kurul",
      katilimciSayisi: 7,
      katilimciAtif: "[K:a1b2c3d4 s.1]",
      kararlar: [{ metin: "Bütçe artırıldı.", atif: '[K:a1b2c3d4 s.2 "bütçe artırıldı"]' }],
      eylemAdaylari: [{ metin: "x", sorumlu: null, atif: "[K:a1b2c3d4 s.5]" }],
    });
    const r = await gorevCalistir(toplantiBilgisi, girdi, sahteSaglayici([yanit]));
    expect(r.sorunlar.map((s) => `${s.alan}: ${s.aciklama}`)).toEqual([
      "tarih: Tarih atıf yapılan yerde geçmiyor.",
      "katilimciSayisi: Katılımcı sayısı tutanakta yazılı değil ve sayılamıyor.",
      "kararlar.0.atif: Alıntı kanıtın metninde geçmiyor.",
      "eylemAdaylari.0.atif: Atıftaki konum kanıtta yok.",
    ]);
    const atifsiz = JSON.stringify({
      ...JSON.parse(yanit),
      tarihAtif: null,
      katilimciAtif: null,
      kararlar: [],
      eylemAdaylari: [],
    });
    const r2 = await gorevCalistir(toplantiBilgisi, girdi, sahteSaglayici([atifsiz]));
    expect(r2.sorunlar.map((s) => s.alan)).toEqual(["tarih", "katilimciSayisi"]);
  });

  it("yazılı katılımcı sayısı kabul edilir; boş alanlar sorun değildir", async () => {
    const kanit = { ozet: KURGU_TUTANAK.ozet, parcalar: [{ capa: { sayfa: 1 }, metin: "Toplantıya 12 üye katıldı." }] };
    const yanit = JSON.stringify({
      tarih: null,
      tarihAtif: null,
      toplantiTuru: "kurul",
      katilimciSayisi: 12,
      katilimciAtif: '[K:a1b2c3d4 s.1 "12 üye katıldı"]',
      kararlar: [],
      eylemAdaylari: [],
    });
    expect((await gorevCalistir(toplantiBilgisi, { kanit }, sahteSaglayici([yanit]))).gecerli).toBe(true);
  });
});

describe("değerlendirme düzeneği", () => {
  it("sahte sağlayıcıyla iki görev de eşiği geçer", async () => {
    for (const gorev of ["kanit-siniflama", "toplanti-bilgisi"]) {
      const { sonuc, cikti } = await calistir(["--gorev", gorev, "--saglayici", "sahte"]);
      expect(sonuc.gecti).toBe(true);
      expect(sonuc.atifOrani).toBe(1);
      expect(sonuc.alanOrani).toBe(1);
      expect(cikti).toContain("eşik karşılandı");
    }
  });

  it("bilinmeyen görev ve gerçek sağlayıcı reddedilir", async () => {
    await expect(calistir(["--gorev", "yok"])).rejects.toThrow(/Görev adı bilinmiyor/u);
    await expect(calistir(["--gorev", "kanit-siniflama", "--saglayici", "evren"])).rejects.toThrow(/yalnız sahte/u);
  });

  it("şema hatası ve atıf hatası eşiği düşürür, tabloda görünür", async () => {
    const ornekler = [
      { ad: "bozuk", girdi: { kanit: KURGU_TUTANAK, olcutler: KURGU_OLCUTLER }, beklenen: { belgeTuru: "tutanak" } },
      {
        ad: "uydurma",
        girdi: { kanit: KURGU_TUTANAK, olcutler: KURGU_OLCUTLER },
        beklenen: { belgeTuru: "izlence" },
        sahteYanit: JSON.stringify({
          belgeTuru: "tutanak",
          olcutOnerileri: [{ olcutKod: "A.1", gerekce: "x", atif: "[K:ffffffff]", guven: 1 }],
        }),
      },
    ];
    const s = await degerlendir(kanitSiniflama, ornekler, (o) =>
      sahteSaglayici([o.sahteYanit ?? "değil"], { sonuTekrarla: true }),
    );
    expect(s.gecti).toBe(false);
    expect(s.semaOrani).toBe(0.5);
    expect(s.atifOrani).toBe(0);
    expect(s.alanOrani).toBe(0);
    const t = sonucTablosu(s);
    expect(t).toContain("| bozuk | kaldı | kaldı | %0 |");
    expect(t).toContain("eşik karşılanmadı");
    expect((await degerlendir(kanitSiniflama, [], () => sahteSaglayici([]))).gecti).toBe(false);
  });
});
