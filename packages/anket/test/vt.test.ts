// Anket veritabanı tarafı uçtan uca: PGlite (satır güvenliği, tetikleyiciler), sahte saat, bellek e-posta.
// Bütün kurumlar, kişiler ve adresler uydurmadır.

import { bellekTasiyici, type SahteSaat, sahteSaat } from "@akredit/surec";
import { gocleriUygula, kiraciIslemi, pgliteBaglantisi, sema, type Vt } from "@akredit/vt";
import { sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { anketRaporu } from "../src/index.ts";
import {
  type AnketBaglami,
  AnketHatasi,
  anketBaglantisi,
  anketFormu,
  anketListesi,
  anketOlustur,
  anketSonuclari,
  anketTik,
  anketYayimla,
  SISTEM,
  yanitKaydet,
  yanitlariIceAktar,
} from "../src/vt.ts";

const KURUM = "01900000-0000-7000-8000-0000000000a1";
const KURUM_B = "01900000-0000-7000-8000-0000000000b2";
const GIZLI = "uydurma-test-gizli-anahtari-0123";
const ALICILAR = [
  "ogr1@uydurma.edu.tr",
  "ogr2@uydurma.edu.tr",
  "ogr3@uydurma.edu.tr",
  "ogr4@uydurma.edu.tr",
  "ogr5@uydurma.edu.tr",
];
const AYAR = { baslangic: "2026-01-05T06:00:00Z", bitis: "2026-01-20T06:00:00Z", hatirlatmalar: [3] };
const TAM = { hedef: 4, icerik: 4, olcme: 3, geri_bildirim: 5, genel: 4 };

let kapat: (() => Promise<void>) | null = null;
afterEach(async () => {
  await kapat?.();
  kapat = null;
});

async function kur() {
  const bag = await pgliteBaglantisi();
  kapat = () => bag.kapat();
  const db: Vt = bag.db;
  await gocleriUygula(db);
  await db.insert(sema.kurum).values([
    { id: KURUM, ad: "Uydurma Üniversitesi" },
    { id: KURUM_B, ad: "Başka Uydurma Üniversitesi" },
  ]);
  const saat: SahteSaat = sahteSaat(new Date("2026-01-04T09:00:00Z"));
  const eposta = bellekTasiyici();
  const olaylar: string[] = [];
  const b: AnketBaglami = {
    db,
    saat,
    eposta,
    gizli: GIZLI,
    adres: "https://akredit.invalid",
    olay: async (_k, o) => {
      olaylar.push(o);
    },
  };
  return { db, saat, eposta, olaylar, b };
}

const git = (s: SahteSaat, an: string) => s.ilerlet(new Date(an).getTime() - s.simdi().getTime());

/** E-postadaki bağlantıdan belirteci çıkarır. */
const belirtec = (metin: string) =>
  new URL((metin.match(/https:\/\/\S+/u) as RegExpMatchArray)[0]).searchParams.get("b");

async function sorgu<T>(db: Vt, q: ReturnType<typeof sql>): Promise<T[]> {
  const r = (await db.execute(q)) as unknown as { rows?: T[] } | T[];
  return Array.isArray(r) ? r : (r.rows ?? []);
}

describe("anket: davet, hatırlatma, anonim yanıt", () => {
  it("uçtan uca: yayımla → davet → yanıt → hatırlatma yalnız yanıtlamayana → kapanış", async () => {
    const { db, saat, eposta, olaylar, b } = await kur();
    const id = await anketOlustur(
      b,
      KURUM,
      { sablon: "ders_degerlendirme", ayar: AYAR, baglam: { ders: "HUK101" } },
      {
        tur: "sistem",
        id: null,
      },
    );
    expect(
      (await anketYayimla(b, KURUM, id, { alicilar: [...ALICILAR, "OGR1@uydurma.edu.tr"] }, SISTEM)).davetSayisi,
    ).toBe(5);
    expect(olaylar).toEqual(["anket_yayimlandi"]);
    await expect(anketYayimla(b, KURUM, id, {}, SISTEM)).rejects.toThrow(AnketHatasi);

    // Başlangıçtan önce e-posta yok; başlangıç anında (09:00 İstanbul) davetler gider.
    expect(await anketTik(b, KURUM)).toEqual(new Date(AYAR.baslangic));
    expect(eposta.kutu).toHaveLength(0);
    await git(saat, AYAR.baslangic);
    await anketTik(b, KURUM);
    expect(eposta.kutu.map((e) => e.alici)).toEqual(ALICILAR);
    expect(eposta.kutu[0]?.metin).toContain("anonimdir");
    await anketTik(b, KURUM);
    expect(eposta.kutu).toHaveLength(5); // tekrar gönderilmez

    const form = await anketFormu(b, KURUM, id);
    expect(form).toMatchObject({ acik: true, erisim: "davet" });

    // ogr1 ve ogr2 yanıtlar; ogr1 ikinci kez yanıt veremez.
    const b1 = belirtec(eposta.kutu[0]?.metin ?? "");
    const b2 = belirtec(eposta.kutu[1]?.metin ?? "");
    await yanitKaydet(b, { kurumId: KURUM, anketId: id, belirtec: b1, yanit: { ...TAM, oneri: "Daha çok örnek" } });
    await yanitKaydet(b, { kurumId: KURUM, anketId: id, belirtec: b2, yanit: TAM });
    await expect(yanitKaydet(b, { kurumId: KURUM, anketId: id, belirtec: b1, yanit: TAM })).rejects.toThrow(
      /daha önce yanıt/u,
    );
    await expect(
      yanitKaydet(b, { kurumId: KURUM, anketId: id, belirtec: "uydurma-belirtec-gecersiz-0000", yanit: TAM }),
    ).rejects.toThrow(/geçersiz/u);
    await expect(yanitKaydet(b, { kurumId: KURUM, anketId: id, belirtec: "x", yanit: TAM })).rejects.toThrow(
      /geçersiz/u,
    );
    await expect(
      yanitKaydet(b, {
        kurumId: KURUM,
        anketId: id,
        belirtec: belirtec(eposta.kutu[2]?.metin ?? ""),
        yanit: { genel: 9 },
      }),
    ).rejects.toThrow(AnketHatasi);

    // Hatırlatma: bitişten 3 gün önce, yalnız yanıtlamayan 3 kişiye.
    await git(saat, "2026-01-17T06:00:00Z");
    await anketTik(b, KURUM);
    const hatirlatma = eposta.kutu.slice(5);
    expect(hatirlatma.map((e) => e.alici)).toEqual(ALICILAR.slice(2));
    expect(hatirlatma[0]?.konu).toMatch(/^Hatırlatma/u);
    // Hatırlatmadaki bağlantı davetteki ile aynı (eşleme saklanmadan yeniden üretilir).
    expect(belirtec(hatirlatma[0]?.metin ?? "")).toBe(belirtec(eposta.kutu[2]?.metin ?? ""));

    const s = await anketSonuclari(b, KURUM, id);
    expect(s.sonuc.yanitSayisi).toBe(2);
    expect(s.sonuc.yanitOrani).toBe(0.4); // 2/5
    expect(s.sonuc.sorular.find((x) => x.kod === "genel")?.gizli).toBe(true); // 2 < eşik 5
    expect(s.acikYanitlar.oneri?.map((x) => x.metin)).toEqual(["Daha çok örnek"]);
    expect((await anketListesi(b, KURUM))[0]).toMatchObject({ id, yanitSayisi: 2, davetSayisi: 5, yanitOrani: 0.4 });

    // Bitiş: kapanır, alıcı listesi silinir, süreç motoruna olay gider; yanıt alınmaz.
    await git(saat, AYAR.bitis);
    expect(await anketTik(b, KURUM)).toBeNull();
    expect(olaylar).toEqual(["anket_yayimlandi", "anket_kapandi"]);
    await expect(
      yanitKaydet(b, { kurumId: KURUM, anketId: id, belirtec: belirtec(eposta.kutu[3]?.metin ?? ""), yanit: TAM }),
    ).rejects.toThrow(/kabul etmiyor/u);

    // ANONİMLİK: kapanıştan sonra veritabanının hiçbir tablosunda alıcı e-postası ya da belirteç yoktur.
    const tablolar = await sorgu<{ t: string }>(
      db,
      sql`select table_name as t from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'`,
    );
    const belirtecler = eposta.kutu.map((e) => belirtec(e.metin) as string);
    for (const { t } of tablolar) {
      const metin = JSON.stringify(await sorgu(db, sql.raw(`select * from "${t}"`)));
      for (const e of ALICILAR) expect(metin, `${t} tablosunda e-posta`).not.toContain(e);
      for (const k of belirtecler) expect(metin, `${t} tablosunda belirteç`).not.toContain(k);
    }
    expect(eposta.kutu.length).toBe(8);
    expect(s.baglam).toEqual({ ders: "HUK101" });
  });

  it("ANONİMLİK: yanıt ile kişi arasında bağ saklanmaz", async () => {
    const { db, saat, eposta, b } = await kur();
    await git(saat, "2026-01-06T10:17:33Z");
    const id = await anketOlustur(b, KURUM, { sablon: "ders_degerlendirme", ayar: AYAR }, SISTEM);
    await anketYayimla(b, KURUM, id, { alicilar: ALICILAR }, SISTEM);
    await anketTik(b, KURUM);
    await yanitKaydet(b, { kurumId: KURUM, anketId: id, belirtec: belirtec(eposta.kutu[3]?.metin ?? ""), yanit: TAM });

    // 1) Yanıt tablosunun sütunları: kişi, e-posta, belirteç, IP, belirteç kimliği yok.
    const sutunlar = async (t: string) =>
      (
        await sorgu<{ c: string }>(
          db,
          sql`select column_name as c from information_schema.columns where table_name = ${t} order by column_name`,
        )
      ).map((r) => r.c);
    expect(await sutunlar("anket_yaniti")).toEqual(["anket_id", "id", "kurum_id", "olusturma", "yanitlar"]);
    // 2) Belirteç tablosunda kişi, zaman ya da yanıt bağı yok.
    expect(await sutunlar("anket_belirteci")).toEqual(["anket_id", "id", "kaynak", "kullanildi", "kurum_id", "ozet"]);
    // 3) Yanıt zamanı güne yuvarlanır (10:17:33 değil, gece yarısı; saat eşleştirmesi yapılamaz).
    const [y] = await sorgu<{ o: number; y: unknown }>(
      db,
      sql`select (extract(epoch from olusturma)::bigint % 86400)::int as o, yanitlar as y from anket_yaniti`,
    );
    expect(y?.o).toBe(0); // UTC gece yarısı
    expect(Object.keys(y?.y as object).sort()).toEqual(
      ["genel", "geri_bildirim", "guclu", "hedef", "icerik", "olcme", "oneri"].sort(),
    );
    // 4) Belirteç tablosu davet sırasıyla değil özet sırasıyla yazılmış; satırlardan kişi çıkarılamaz.
    const ozetler = await sorgu<{ ozet: string; kullanildi: boolean }>(
      db,
      sql`select ozet, kullanildi from anket_belirteci`,
    );
    expect(ozetler.filter((r) => r.kullanildi)).toHaveLength(1);
    // 5) Günlükte yanıt kaydı yok; davet kaydında yalnız sayı var.
    const gunluk = await sorgu<{ eylem: string; ayrinti: unknown }>(db, sql`select eylem, ayrinti from gunluk`);
    expect(gunluk.map((g) => g.eylem)).toEqual(["anket.olusturuldu", "anket.yayimlandi", "anket.davet_gonderildi"]);
    expect(JSON.stringify(gunluk)).not.toMatch(/@/u);
    // 6) Veritabanı, kişi alanı içeren yanıtı reddeder; uygulama rolü yanıtı değiştiremez ve silemez.
    await expect(
      kiraciIslemi(db, KURUM, (tx) =>
        tx.insert(sema.anketYaniti).values({ kurumId: KURUM, anketId: id, yanitlar: { eposta: "x@y.z" } }),
      ),
    ).rejects.toThrow();
    await expect(
      kiraciIslemi(db, KURUM, (tx) => tx.execute(sql`update anket_yaniti set yanitlar = '{}'::jsonb`)),
    ).rejects.toThrow();
    await expect(kiraciIslemi(db, KURUM, (tx) => tx.execute(sql`delete from anket_yaniti`))).rejects.toThrow();
    // 7) Kullanılmış belirteç geri alınamaz.
    await expect(
      kiraciIslemi(db, KURUM, (tx) => tx.execute(sql`update anket_belirteci set kullanildi = false`)),
    ).rejects.toThrow();
    // 8) Başka kurum anketi ve yanıtları göremez.
    await expect(anketSonuclari(b, KURUM_B, id)).rejects.toThrow(/bulunamadı/u);
    expect(await kiraciIslemi(db, KURUM_B, (tx) => tx.select().from(sema.anketBelirteci))).toEqual([]);
  });

  it("açık bağlantı: kimliksiz belirteçle tekrar engeli ve yanıt kotası", async () => {
    const { saat, eposta, b } = await kur();
    await git(saat, "2026-01-06T09:00:00Z");
    const id = await anketOlustur(
      b,
      KURUM,
      { sablon: "ders_degerlendirme", ayar: { ...AYAR, erisim: "baglanti", kota: 2 } },
      SISTEM,
    );
    expect((await anketYayimla(b, KURUM, id, {}, SISTEM)).davetSayisi).toBe(0);
    await anketTik(b, KURUM);
    expect(eposta.kutu).toHaveLength(0);
    const c1 = "cihaz-belirteci-uydurma-000001";
    await yanitKaydet(b, { kurumId: KURUM, anketId: id, belirtec: c1, yanit: TAM });
    await expect(yanitKaydet(b, { kurumId: KURUM, anketId: id, belirtec: c1, yanit: TAM })).rejects.toThrow(
      /daha önce/u,
    );
    await yanitKaydet(b, { kurumId: KURUM, anketId: id, belirtec: "cihaz-belirteci-uydurma-000002", yanit: TAM });
    await expect(
      yanitKaydet(b, { kurumId: KURUM, anketId: id, belirtec: "cihaz-belirteci-uydurma-000003", yanit: TAM }),
    ).rejects.toThrow(/yeterli yanıta/u);
    expect(anketBaglantisi("https://akredit.invalid", KURUM, id)).toBe(`https://akredit.invalid/anket/${KURUM}/${id}`);
  });

  it("içe aktarma, rapor; geçersiz girdiler", async () => {
    const { b } = await kur();
    const id = await anketOlustur(b, KURUM, { sablon: "mezun_izleme", ayar: AYAR }, SISTEM);
    const yanitlar = [3, 4, 4, 5, 5].map((h) => ({ durum: "Alanımda çalışıyorum", hazirlik: h, ilk_is_ay: h }));
    expect(await yanitlariIceAktar(b, KURUM, id, yanitlar, SISTEM)).toBe(5);
    const s = await anketSonuclari(b, KURUM, id);
    // hazirlik: (3+4+4+5+5)/5 = 4,2
    expect(s.sonuc.sorular.find((x) => x.kod === "hazirlik")?.ozet?.ortalama).toBeCloseTo(4.2, 12);
    expect(anketRaporu(s.baslik, s.sonuc).metin).toContain("Ortalama 4,2");
    await expect(anketOlustur(b, KURUM, { sablon: "yok", ayar: AYAR }, SISTEM)).rejects.toThrow(/Şablon/u);
    await expect(anketYayimla(b, KURUM, id, { alicilar: ["gecersiz"] }, SISTEM)).rejects.toThrow(/geçersiz e-posta/u);
    await expect(anketYayimla(b, KURUM, id, { alicilar: [] }, SISTEM)).rejects.toThrow(/en az bir/u);
    await expect(anketFormu(b, KURUM, "yok")).rejects.toThrow(/bulunamadı/u);
    expect((await anketFormu(b, KURUM, id)).acik).toBe(false);
  });
});
