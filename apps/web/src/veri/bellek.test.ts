import { etkinRisk, type OneriId } from "@akredit/cekirdek";
import { describe, expect, it } from "vitest";
import { BellekVeriKaynagi } from "./bellek.ts";
import { KANITLAR, PARCALAR } from "./ornek.ts";

const yeni = () => new BellekVeriKaynagi({ simdi: () => "2026-10-27T10:00:00.000Z" });

async function ilkOneri(k: BellekVeriKaynagi, sira = 0) {
  const o = (await k.bekleyenOneriler())[sira];
  if (!o) throw new Error("örnek öneri yok");
  return o;
}

describe("örnek veri", () => {
  it("İP-07'nin istediği büyüklükte", async () => {
    const k = yeni();
    expect(KANITLAR).toHaveLength(20);
    expect(await k.dersler()).toHaveLength(6);
    expect(await k.raporlar()).toHaveLength(2);
    const oneriler = await k.bekleyenOneriler();
    for (const risk of ["dusuk", "orta", "yuksek"] as const)
      expect(oneriler.filter((o) => etkinRisk(o) === risk).length).toBeGreaterThanOrEqual(15);
  });

  it("her alıntı atıf yaptığı parçada birebir geçer", async () => {
    const oneriler = await yeni().bekleyenOneriler();
    for (const o of oneriler)
      for (const a of o.atiflar) {
        const parca = PARCALAR.find((p) => p.id === a.parcaId);
        expect(parca?.kanitId).toBe(a.kanitId);
        expect(parca?.metin).toContain(a.alinti ?? "");
      }
  });

  it("belirlenimci: iki kaynak aynı veriyi üretir", async () => {
    expect(await yeni().bekleyenOneriler()).toEqual(await yeni().bekleyenOneriler());
  });
});

describe("kararVer", () => {
  it("onay kaydeder, öneriyi bekleyenlerden çıkarır", async () => {
    const k = yeni();
    const ilk = await ilkOneri(k);
    const s = await k.kararVer({ oneriId: ilk.id, sonuc: "onaylandi" });
    expect(s.tamam).toBe(true);
    expect((await k.bekleyenOneriler()).some((o) => o.id === ilk.id)).toBe(false);
    const [karar] = await k.kararlar();
    expect(karar).toMatchObject({
      sonuc: "onaylandi",
      dayanak: { tur: "dogrudan" },
      zaman: "2026-10-27T10:00:00.000Z",
    });
  });

  it("aynı öneriye ikinci karar verilemez", async () => {
    const k = yeni();
    const ilk = await ilkOneri(k);
    await k.kararVer({ oneriId: ilk.id, sonuc: "onaylandi" });
    const s = await k.kararVer({ oneriId: ilk.id, sonuc: "reddedildi" });
    expect(s.tamam).toBe(false);
    expect(await k.kararlar()).toHaveLength(1);
  });

  it("düzeltme metni saklar, boş düzeltmeyi reddeder", async () => {
    const k = yeni();
    const ilk = await ilkOneri(k);
    expect((await k.kararVer({ oneriId: ilk.id, sonuc: "duzeltildi", duzeltme: "  " })).tamam).toBe(false);
    const s = await k.kararVer({ oneriId: ilk.id, sonuc: "duzeltildi", duzeltme: "Yeni metin" });
    expect(s.tamam && s.deger.duzeltme?.metin).toBe("Yeni metin");
  });

  it("ret gerekçesi isteğe bağlıdır", async () => {
    const k = yeni();
    const a = await ilkOneri(k, 0);
    const b = await ilkOneri(k, 1);
    const s1 = await k.kararVer({ oneriId: a.id, sonuc: "reddedildi" });
    const s2 = await k.kararVer({ oneriId: b.id, sonuc: "reddedildi", gerekce: "Kanıt eski" });
    expect(s1.tamam && s1.deger.gerekce).toBeNull();
    expect(s2.tamam && s2.deger.gerekce).toBe("Kanıt eski");
  });

  it("bilinmeyen öneri hata verir", async () => {
    const s = await yeni().kararVer({ oneriId: "yok" as OneriId, sonuc: "onaylandi" });
    expect(s.tamam).toBe(false);
  });
});

describe("topluKararVer", () => {
  it("düşük ve orta riskli önerileri birlikte onaylar", async () => {
    const k = yeni();
    const tum = await k.bekleyenOneriler();
    const secim = [
      ...tum.filter((o) => etkinRisk(o) === "dusuk").slice(0, 3),
      ...tum.filter((o) => etkinRisk(o) === "orta").slice(0, 2),
    ];
    const s = await k.topluKararVer(secim.map((o) => o.id));
    expect(s.tamam && s.deger).toHaveLength(5);
  });

  it("seçimde yüksek risk varsa hiçbirini onaylamaz", async () => {
    const k = yeni();
    const tum = await k.bekleyenOneriler();
    const dusuk = tum.find((o) => etkinRisk(o) === "dusuk");
    const yuksek = tum.find((o) => etkinRisk(o) === "yuksek");
    if (!dusuk || !yuksek) throw new Error("örnek veri eksik");
    const s = await k.topluKararVer([dusuk.id, yuksek.id]);
    expect(s.tamam).toBe(false);
    expect(await k.kararlar()).toHaveLength(0);
  });

  it("biri geçersizse hiçbiri kaydedilmez", async () => {
    const k = yeni();
    const a = await ilkOneri(k, 0);
    const b = await ilkOneri(k, 1);
    await k.kararVer({ oneriId: b.id, sonuc: "onaylandi" });
    const s = await k.topluKararVer([a.id, b.id]);
    expect(s.tamam).toBe(false);
    expect(await k.kararlar()).toHaveLength(1);
  });

  it("boş seçim hata verir", async () => {
    expect((await yeni().topluKararVer([])).tamam).toBe(false);
  });
});

describe("politika taslağı", () => {
  it("imza bekleyen taslak oluşturur, ad yazılınca imzalar", async () => {
    const k = yeni();
    const s = await k.politikaTaslagiOlustur({
      ad: "Matris katkıları",
      oneriTurleri: ["matris_katkisi"],
      enYuksekRisk: "orta",
      enDusukGuven: 0.8,
    });
    expect(s.tamam && s.deger.durum).toBe("imza_bekliyor");
    if (!s.tamam) return;
    expect((await k.politikaImzala(s.deger.id, "Başka Biri")).tamam).toBe(false);
    const imza = await k.politikaImzala(s.deger.id, "Dr. Öğr. Üyesi Deniz Örnek");
    expect(imza.tamam && imza.deger).toMatchObject({ durum: "imzali", imzaZamani: "2026-10-27T10:00:00.000Z" });
    expect((await k.politikaImzala(s.deger.id, "Dr. Öğr. Üyesi Deniz Örnek")).tamam).toBe(false);
  });

  it("yüksek risk düzeyi için politika oluşturulamaz", async () => {
    const s = await yeni().politikaTaslagiOlustur({
      ad: "X",
      oneriTurleri: ["kanit_etiketi"],
      enYuksekRisk: "yuksek",
      enDusukGuven: 0.5,
    });
    expect(s.tamam).toBe(false);
  });

  it("yüksek riskli tür politikaya bağlanamaz", async () => {
    const s = await yeni().politikaTaslagiOlustur({
      ad: "X",
      oneriTurleri: ["kanit_etiketi", "dis_gonderim"],
      enYuksekRisk: "orta",
      enDusukGuven: 0.5,
    });
    expect(s.tamam).toBe(false);
  });

  it("eksik ad, boş tür ve geçersiz eşik reddedilir", async () => {
    const k = yeni();
    const temel = {
      ad: "A",
      oneriTurleri: ["kanit_etiketi" as const],
      enYuksekRisk: "dusuk" as const,
      enDusukGuven: 0.5,
    };
    expect((await k.politikaTaslagiOlustur({ ...temel, ad: " " })).tamam).toBe(false);
    expect((await k.politikaTaslagiOlustur({ ...temel, oneriTurleri: [] })).tamam).toBe(false);
    expect((await k.politikaTaslagiOlustur({ ...temel, enDusukGuven: 1.5 })).tamam).toBe(false);
  });
});

describe("okuma", () => {
  it("kanıtları aksan duyarsız arar ve süzer", async () => {
    const k = yeni();
    // "Öğrenci" geçen iki başlık: memnuniyet anketi (14) ve öğretim elemanı eğitimi değil; danışmanlık değil.
    expect((await k.kanitlar({ arama: "ogrenci" })).map((x) => x.id)).toEqual(["kanit-14"]);
    expect((await k.kanitlar({ olcut: "Ö-7" })).map((x) => x.id)).toEqual(["kanit-12", "kanit-13"]);
    expect((await k.kanitlar({ kaynakTuru: "eposta" })).map((x) => x.id)).toEqual(["kanit-03", "kanit-17", "kanit-19"]);
  });

  it("panel özeti: bekleyen sayılar kararlarla azalır, süre karar sayısından hesaplanır", async () => {
    const k = yeni();
    const once = await k.panelOzeti();
    // 42 önceki karar × 20 sn = 840 sn = 14 dk
    expect(once.harcananDakika).toBe(14);
    // 20 kanıt etiketi, 6 ders × 3 matris önerisi, 8 olgunluk + 4 plan + 4 gönderim
    expect(once.bekleyen).toEqual({ dusuk: 20, orta: 18, yuksek: 16 });
    const ilk = await ilkOneri(k);
    await k.kararVer({ oneriId: ilk.id, sonuc: "onaylandi" });
    expect((await k.panelOzeti()).bekleyen.dusuk).toBe(19);
  });

  it("bilinmeyen kimlikler null döner", async () => {
    const k = yeni();
    expect(await k.kanit("yok")).toBeNull();
    expect(await k.program("yok")).toBeNull();
    expect(await k.ders("yok")).toBeNull();
    expect(await k.rapor("yok")).toBeNull();
  });
});

describe("yurt dışı izni (örnek kip, sunucu kuralının aynısı)", () => {
  it("ayarlardan açılamaz; yalnız doğru adla imzalanan kararla açılır; ayarlardan kapatılır", async () => {
    const k = new BellekVeriKaynagi();
    await expect(k.ayarlariGuncelle({ yurtDisiIzni: true })).rejects.toThrow(/imzalayın/u);
    expect((await k.ayarlar()).yurtDisiIzni).toBe(false);
    const m = await k.yurtDisiMetni();
    expect((await k.yurtDisiIzniImzala("Başka Biri", m.ozet)).tamam).toBe(false);
    expect((await k.yurtDisiIzniImzala("Dr. Öğr. Üyesi Deniz Örnek", "eski")).tamam).toBe(false);
    const s = await k.yurtDisiIzniImzala("  dr. öğr. üyesi  deniz örnek ", m.ozet);
    expect(s.tamam && s.deger.yurtDisiIzni).toBe(true);
    expect((await k.ayarlariGuncelle({ yurtDisiIzni: false })).yurtDisiIzni).toBe(false);
  });
});
