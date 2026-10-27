// Süreç motoru uçtan uca: PGlite (satır güvenliği, günlük zinciri), sahte saat, bellek e-posta taşıyıcısı.
// Bütün kişiler, adresler ve tarihler uydurmadır.

import { bellekTasiyici, icsOku, type SahteSaat, sahteSaat } from "@akredit/surec";
import { gocleriUygula, kiraciIslemi, pgliteBaglantisi, sema, type Vt, zinciriDogrula } from "@akredit/vt";
import { asc } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import {
  akademikTakvimIceAktar,
  bildirimler,
  gorevTamamla,
  hazirSurecleriYukle,
  kanitBagla,
  olayYayinla,
  SISTEM,
  type SurecBaglami,
  SurecHatasi,
  surecBaslat,
  surecDurumu,
  surecZamanlayicisi,
  takvimDisaAktar,
  tik,
} from "./index.ts";

const KURUM = "01900000-0000-7000-8000-0000000000a1";
const KURUM_B = "01900000-0000-7000-8000-0000000000b2";
const HOCA = "01900000-0000-7000-8000-000000000c01";
const PS = "01900000-0000-7000-8000-000000000c02"; // program sorumlusu
const BASKAN = "01900000-0000-7000-8000-000000000c03";
const B_KISI = "01900000-0000-7000-8000-000000000c04";

// Uydurma takvim: dönem sonu 12 Ocak 2026, not girişi son günü 20 Ocak 2026. Saat dilimi İstanbul (UTC+3),
// takvim günleri 09:00 yerel = 06:00Z sayılır.
const AYAR = { surec: { takvim: { donem_sonu: "2026-01-12", not_giris_son: "2026-01-20" } } };

let kapatici: (() => Promise<void>) | null = null;
afterEach(async () => {
  await kapatici?.();
  kapatici = null;
});

async function kur(baslangic = "2026-01-10T00:00:00Z", ayar: object = AYAR) {
  const bag = await pgliteBaglantisi();
  kapatici = async () => {
    await bag.kapat();
  };
  const db: Vt = bag.db;
  await gocleriUygula(db);
  await db.insert(sema.kurum).values([
    { id: KURUM, ad: "Uydurma Üniversitesi", ayarlar: ayar },
    { id: KURUM_B, ad: "Başka Uydurma Üniversitesi" },
  ]);
  await db.insert(sema.kisi).values([
    { id: HOCA, kurumId: KURUM, adSoyad: "Ayşe Uydurma", eposta: "ayse@uydurma.edu.tr" },
    { id: PS, kurumId: KURUM, adSoyad: "Mehmet Örnek", eposta: "mehmet@uydurma.edu.tr" },
    { id: BASKAN, kurumId: KURUM, adSoyad: "Zeynep Deneme", eposta: "zeynep@uydurma.edu.tr" },
    { id: B_KISI, kurumId: KURUM_B, adSoyad: "Başka Kişi", eposta: "baska@baska.edu.tr" },
  ]);
  const t0 = new Date("2025-09-01T00:00:00Z");
  await db.insert(sema.rolAtamasi).values([
    { kurumId: KURUM, kisiId: HOCA, rol: "ogretim_elemani", kapsamTuru: "kurum", kapsamId: KURUM, baslangic: t0 },
    { kurumId: KURUM, kisiId: PS, rol: "program_sorumlusu", kapsamTuru: "kurum", kapsamId: KURUM, baslangic: t0 },
    {
      kurumId: KURUM,
      kisiId: BASKAN,
      rol: "kalite_komisyonu_baskani",
      kapsamTuru: "kurum",
      kapsamId: KURUM,
      baslangic: t0,
    },
  ]);
  const saat: SahteSaat = sahteSaat(new Date(baslangic));
  const eposta = bellekTasiyici();
  const b: SurecBaglami = { db, saat, eposta };
  await hazirSurecleriYukle(b, KURUM);
  return { db, saat, eposta, b };
}

async function kanitEkle(db: Vt, ad: string) {
  return kiraciIslemi(db, KURUM, async (tx) => {
    const ozet = ad
      .padEnd(64, "0")
      .replace(/[^0-9a-f]/gu, "a")
      .slice(0, 64);
    const [k] = await tx
      .insert(sema.kanit)
      .values({
        kurumId: KURUM,
        ozet,
        dosyaAdi: `${ad}.pdf`,
        mime: "application/pdf",
        boyut: 10,
        depoAnahtari: `${KURUM}/${ozet}`,
        kaynakTuru: "yukleme",
      })
      .returning({ id: sema.kanit.id });
    if (!k) throw new Error();
    return k.id;
  });
}

async function gunlukEylemleri(db: Vt) {
  const l = await kiraciIslemi(db, KURUM, (tx) =>
    tx
      .select({ eylem: sema.gunluk.eylem, zaman: sema.gunluk.zaman, ayrinti: sema.gunluk.ayrinti })
      .from(sema.gunluk)
      .orderBy(asc(sema.gunluk.zaman)),
  );
  return l;
}

const GUN = 86_400_000;

describe("süreç motoru: dönem sonu uçtan uca (sahte saat)", { timeout: 180_000 }, () => {
  it("başlat → görev → hatırlat → kanıt → kapanış", async () => {
    const { db, saat, eposta, b } = await kur();
    const hatalar: unknown[] = [];
    // Motor uyanmayı kendisi hesaplar; aralık yalnız üst sınırdır (testi hızlandırmak için 7 gün).
    const z = surecZamanlayicisi(b, {
      kurumlar: async () => [KURUM, KURUM_B],
      aralikMs: 7 * GUN,
      hata: (_k, e) => hatalar.push(e),
    });
    await z.baslat();
    // 10 Ocak: dönem sonu gelmedi, örnek yok.
    expect(await surecDurumu(b, KURUM)).toEqual([]);

    // 12 Ocak 06:00Z (09:00 yerel): süreç kendiliğinden başlar, ilk görev hocaya açılır, e-posta hemen gider.
    await saat.ilerlet(2 * GUN + 6 * 3_600_000);
    let durum = await surecDurumu(b, KURUM);
    expect(durum).toHaveLength(1);
    const ornek = durum[0];
    expect(ornek?.kod).toBe("donem_sonu_ders_dosyasi");
    expect(ornek?.adimlar.map((a) => a.durum)).toEqual(["acik", "bekliyor", "bekliyor"]);
    // son tarih = not girişi son günü + 2 gün = 22 Ocak 09:00 yerel
    expect(ornek?.adimlar[0]?.sonTarih).toBe("2026-01-22T06:00:00.000Z");
    expect(ornek?.adimlar[0]?.sorumluKisiId).toBe(HOCA);
    expect(eposta.kutu.map((e) => [e.alici, e.konu])).toEqual([["ayse@uydurma.edu.tr", "Akredit: Yeni görev"]]);

    // 19 Ocak 06:00Z: 3 gün kala hatırlatma; tam o anda gönderilir (zamanlayıcı o ana uyanır).
    await saat.ilerlet(7 * GUN - 1000);
    expect(eposta.kutu).toHaveLength(1);
    await saat.ilerlet(1000);
    expect(eposta.kutu).toHaveLength(2);
    expect(eposta.kutu[1]?.metin).toContain("Son tarihe 3 gün kaldı (22.01.2026)");

    // 20 Ocak: hoca kanıtsız kapatmaya çalışır → reddedilir.
    await saat.ilerlet(GUN);
    const gorevId = (await surecDurumu(b, KURUM))[0]?.adimlar[0]?.gorevId;
    if (!gorevId) throw new Error("görev yok");
    const kisi = { tur: "kisi" as const, id: HOCA };
    await expect(gorevTamamla(b, KURUM, gorevId, kisi)).rejects.toThrow(/kanıtsız kapanamaz/u);
    // B kurumu görevi göremez, kanıt bağlayamaz.
    await expect(
      kanitBagla(b, KURUM_B, gorevId, await kanitEkle(db, "b1"), { tur: "kisi", id: B_KISI }),
    ).rejects.toThrow(SurecHatasi);
    expect(await surecDurumu(b, KURUM_B)).toEqual([]);

    // Kanıt bağlanır, görev kapanır; sonraki adım hemen açılır.
    const kanitId = await kanitEkle(db, "notcizelgesi");
    await kanitBagla(b, KURUM, gorevId, kanitId, kisi);
    await kanitBagla(b, KURUM, gorevId, kanitId, kisi); // ikinci bağ etkisiz
    await gorevTamamla(b, KURUM, gorevId, kisi);
    durum = await surecDurumu(b, KURUM);
    expect(durum[0]?.adimlar.map((a) => a.durum)).toEqual(["tamam", "acik", "bekliyor"]);
    expect(durum[0]?.adimlar[0]?.kanitIdleri).toEqual([kanitId]);
    // ders dosyası: 20 Ocak 06:00Z + 14 gün
    expect(durum[0]?.adimlar[1]?.sonTarih).toBe("2026-02-03T06:00:00.000Z");
    await expect(kanitBagla(b, KURUM, gorevId, kanitId, kisi)).rejects.toThrow(/Kapanmış/u);

    // Kapanan görev için 21 Ocak hatırlatması gönderilmez.
    const once = eposta.kutu.length;
    await saat.ilerlet(GUN);
    expect(eposta.kutu.slice(once).some((e) => e.metin.includes("Ders notlarını"))).toBe(false);

    // Kalan adımlar kanıtla kapanır → süreç kapanır.
    for (const sira of [1, 2]) {
      const g = (await surecDurumu(b, KURUM))[0]?.adimlar[sira];
      if (!g?.gorevId) throw new Error(`adım ${sira} açılmadı`);
      const sahip = sira === 1 ? kisi : { tur: "kisi" as const, id: PS };
      expect(g.sorumluKisiId).toBe(sahip.id);
      await kanitBagla(b, KURUM, g.gorevId, await kanitEkle(db, `kanit${sira}`), sahip);
      await gorevTamamla(b, KURUM, g.gorevId, sahip);
    }
    durum = await surecDurumu(b, KURUM);
    expect(durum[0]?.durum).toBe("kapali");
    expect(durum[0]?.tamamlanan).toBe(3);

    // Bir yıl daha geçse de aynı takvim tarihi için ikinci örnek açılmaz, kapalı süreç bildirim üretmez.
    await z.simdiCalistir(); // elle kapatılan görevlerin bildirim e-postaları sıradaki turda gider
    const sayi = eposta.kutu.length;
    await saat.ilerlet(30 * GUN);
    expect(await surecDurumu(b, KURUM)).toHaveLength(1);
    expect(eposta.kutu.length).toBe(sayi);
    z.durdur();
    expect(hatalar).toEqual([]);

    // Günlük: sıra ve zincir.
    const eylemler = (await gunlukEylemleri(db)).map((g) => g.eylem);
    const surecEylemleri = eylemler.filter((e) => e.startsWith("surec.") && e !== "surec.tanim_kaydedildi");
    expect(surecEylemleri.slice(0, 5)).toEqual([
      "surec.baslatildi",
      "surec.gorev_acildi",
      "surec.hatirlatildi",
      "surec.kanit_baglandi",
      "surec.gorev_tamamlandi",
    ]);
    expect(surecEylemleri.at(-1)).toBe("surec.kapandi");
    expect(await zinciriDogrula(db, KURUM)).toBeNull();
    // Uygulama içi bildirimler hocada görünür.
    const bl = await bildirimler(b, KURUM, HOCA);
    expect(bl.map((x) => x.baslik)).toContain("Hatırlatma");
  });

  it("geciken görev: gecikme bildirimi ve program sorumlusuna yükseltme", async () => {
    const { saat, eposta, b } = await kur("2026-01-12T06:00:00Z");
    await tik(b, KURUM);
    // Motor 23 Ocak'a kadar hiç çalışmadı: yalnız gecikme bildirilir, eski hatırlatmalar yağmaz.
    await saat.ilerlet(10 * GUN + 18 * 3_600_000); // 23 Ocak 00:00Z = 03:00 yerel (sessiz saat)
    await tik(b, KURUM);
    const yeni = await bildirimler(b, KURUM, HOCA);
    expect(yeni.map((x) => x.baslik)).toEqual(["Son tarih geçti", "Yeni görev"]);
    // Sessiz saat: e-posta 08:00 yerel (05:00Z) gelince gider.
    expect(eposta.kutu).toHaveLength(1);
    const sonraki = await tik(b, KURUM);
    expect(sonraki?.toISOString()).toBe("2026-01-23T05:00:00.000Z");
    await saat.ilerlet(5 * 3_600_000);
    await tik(b, KURUM);
    expect(eposta.kutu.map((e) => e.konu)).toEqual(["Akredit: Yeni görev", "Akredit: Son tarih geçti"]);
    // 22 Ocak + 3 gün = 25 Ocak 06:00Z: program sorumlusuna yükseltme.
    await saat.ilerlet(2 * GUN + 3_600_000);
    await tik(b, KURUM);
    const ps = await bildirimler(b, KURUM, PS);
    expect(ps.map((x) => x.baslik)).toEqual(["Geciken görev size iletildi"]);
    expect(ps[0]?.metin).toContain("22.01.2026");
  });

  it("günlük özet tercihi: bildirimler tek e-postada toplanır", async () => {
    const { saat, eposta, b } = await kur("2026-01-12T06:00:00Z", {
      surec: { ...AYAR.surec, bildirim: { kisiler: { [HOCA]: { eposta: "gunluk" } } } },
    });
    // Aynı gün iki görev açılır (ikinci örnek elle başlatılır).
    await tik(b, KURUM);
    await surecBaslat(b, KURUM, { kod: "donem_sonu_ders_dosyasi" }, { tur: "kisi", id: BASKAN });
    expect(await bildirimler(b, KURUM, HOCA)).toHaveLength(2);
    // Özet saati 08:30 yerel = 05:30Z; 13 Ocak 05:00Z'de henüz bir şey gitmez.
    await saat.ilerlet(23 * 3_600_000);
    expect((await tik(b, KURUM))?.toISOString()).toBe("2026-01-13T05:30:00.000Z");
    expect(eposta.kutu).toEqual([]);
    await saat.ilerlet(30 * 60_000);
    await tik(b, KURUM);
    expect(eposta.kutu.map((e) => e.konu)).toEqual(["Akredit: 2 yeni bildirim"]);
    expect(eposta.kutu[0]?.metin).toContain("- Yeni görev: Ders notlarını aktarın");
  });

  it("takvimde tarih yoksa adım açılmaz; komisyon başkanı uyarılır; içe aktarınca açılır", async () => {
    const { saat, eposta, b, db } = await kur("2026-01-12T06:00:00Z", {
      surec: { takvim: { donem_sonu: "2026-01-12" } },
    });
    await tik(b, KURUM);
    expect((await surecDurumu(b, KURUM))[0]?.adimlar[0]?.durum).toBe("bekliyor");
    expect((await bildirimler(b, KURUM, BASKAN)).map((x) => x.baslik)).toEqual(["Takvimde tarih eksik"]);
    await tik(b, KURUM);
    expect(await bildirimler(b, KURUM, BASKAN)).toHaveLength(1); // bir kez
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "BEGIN:VEVENT",
      "DTSTART;VALUE=DATE:20260119",
      "DTEND;VALUE=DATE:20260121",
      "SUMMARY:Not girişi",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const r = await akademikTakvimIceAktar(
      b,
      KURUM,
      ics,
      [{ icerir: "not girişi", anahtar: "not_giris_son", gun: "bitis" }],
      {
        tur: "kisi",
        id: BASKAN,
      },
    );
    expect(r.takvim).toEqual({ not_giris_son: "2026-01-20" });
    await saat.ilerlet(60_000);
    await tik(b, KURUM);
    expect((await surecDurumu(b, KURUM))[0]?.adimlar[0]?.sonTarih).toBe("2026-01-22T06:00:00.000Z");
    expect(eposta.kutu.some((e) => e.alici === "ayse@uydurma.edu.tr")).toBe(true);
    const ice = (await gunlukEylemleri(db)).find((g) => g.eylem === "surec.takvim_ice_aktarildi");
    expect(ice?.ayrinti).toMatchObject({ degisen: { not_giris_son: { eski: null, yeni: "2026-01-20" } } });
  });

  it("olayla başlayan süreç ve elle başlatma; bilinmeyen süreç reddedilir", async () => {
    const { b } = await kur("2026-03-01T06:00:00Z");
    const ids = await olayYayinla(b, KURUM, "eylem_acildi", SISTEM, { atamalar: { birim_kalite_sorumlusu: PS } });
    expect(ids).toHaveLength(1);
    const d = await surecDurumu(b, KURUM);
    expect(d[0]?.kod).toBe("puko_eylem_izleme");
    expect(d[0]?.adimlar[0]?.sorumluKisiId).toBe(PS);
    await expect(surecBaslat(b, KURUM, { kod: "yok_boyle" }, SISTEM)).rejects.toThrow(/tanımlı değil/u);
    await expect(
      surecBaslat(b, KURUM, { kod: "program_akreditasyonu", atamalar: { program_sorumlusu: B_KISI } }, SISTEM),
    ).rejects.toThrow(/bulunamadı/u);
    // Program akreditasyonu: takvim yok → başlar ama ilk adım tarih bekler.
    await surecBaslat(b, KURUM, { kod: "program_akreditasyonu" }, { tur: "kisi", id: BASKAN });
    const pa = (await surecDurumu(b, KURUM)).find((x) => x.kod === "program_akreditasyonu");
    expect(pa?.adimlar[0]?.durum).toBe("bekliyor");
  });

  it(".ics çıktısı açık görevleri ve kurum takvimini içerir, kişiye süzülebilir", async () => {
    const { b } = await kur("2026-01-12T06:00:00Z");
    await tik(b, KURUM);
    const ics = await takvimDisaAktar(b, KURUM);
    const { olaylar, hatalar } = icsOku(ics);
    expect(hatalar).toEqual([]);
    expect(olaylar.map((o) => [o.baslik, o.tarih])).toEqual([
      ["Son tarih: Ders notlarını aktarın", "2026-01-22"],
      ["Dönem sonu", "2026-01-12"],
      ["Not girişi son günü", "2026-01-20"],
    ]);
    expect(ics).toMatch(/^BEGIN:VCALENDAR\r\n/u);
    const kisisel = icsOku(await takvimDisaAktar(b, KURUM, { kisiId: PS })).olaylar;
    expect(kisisel).toEqual([]);
    // RLS: B kurumu görevleri görmez.
    expect(icsOku(await takvimDisaAktar(b, KURUM_B)).olaylar).toEqual([]);
  });
});
