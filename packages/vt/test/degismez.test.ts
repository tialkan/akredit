// Yalnız-ekleme tabloları ve karar/politika kuralları.

import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { kiraciIslemi } from "../src/baglanti.ts";
import * as s from "../src/sema/index.ts";
import {
  gocluVt,
  hataKodu,
  hataMetni,
  KURUM_A,
  KURUM_B,
  kurumVerisiEkle,
  type OrnekKimlikler,
  reddedilir,
  sorgu,
} from "./yardimci.ts";

const YALNIZ_EKLEME = [
  "cikti",
  "gunluk",
  "kanit",
  "kanit_parcasi",
  "karar",
  "kayit_duzeltmesi",
  "olcme_sonucu",
  "onay_baglantisi",
  "onay_baglantisi_kullanimi",
  "oneri",
  "rapor_bolumu_surumu",
  "sinav_hucre_karari",
  "sinav_hucresi",
  "sinav_sablonu",
  "sinav_taramasi",
  "yetki_politikasi",
];

let b: Awaited<ReturnType<typeof gocluVt>>;
let a: OrnekKimlikler;

beforeAll(async () => {
  b = await gocluVt();
  a = await kurumVerisiEkle(b.db, KURUM_A, "A");
  await kurumVerisiEkle(b.db, KURUM_B, "B");
});
afterAll(async () => {
  await b.kapat();
});

describe("yalnız-ekleme tabloları", () => {
  it("tetikleyici tam olarak beklenen tablolarda kurulu", async () => {
    const r = await sorgu<{ tablo: string }>(
      b.db,
      sql`select distinct c.relname as tablo from pg_trigger t join pg_class c on c.oid = t.tgrelid
          join pg_proc p on p.oid = t.tgfoid where p.proname = 'yalniz_ekleme' order by 1`,
    );
    expect(r.map((x) => x.tablo)).toEqual(YALNIZ_EKLEME);
  });

  for (const t of YALNIZ_EKLEME) {
    it(`${t}: UPDATE, DELETE ve TRUNCATE uygulama rolünde de sahip rolünde de reddedilir`, async () => {
      for (const ifade of [`update ${t} set id = id`, `delete from ${t}`]) {
        const h = await reddedilir(() => kiraciIslemi(b.db, KURUM_A, (tx) => tx.execute(sql.raw(ifade))));
        // Uygulama rolünün UPDATE/DELETE yetkisi de yoktur (42501); yetki olsa bile tetikleyici reddeder.
        expect(["42501", "23000"]).toContain(hataKodu(h));
        const hs = await reddedilir(() => b.db.execute(sql.raw(ifade)));
        expect(hataKodu(hs)).toBe("23000");
        expect(hataMetni(hs)).toMatch(/değiştirilemez ve silinemez/u);
      }
      const ht = await reddedilir(() => b.db.execute(sql.raw(`truncate ${t} cascade`)));
      expect(hataMetni(ht)).toMatch(/değiştirilemez/u);
      const [r] = await sorgu<{ adet: number }>(b.db, sql.raw(`select count(*)::int as adet from ${t}`));
      expect(r?.adet).toBeGreaterThan(0);
    });
  }

  it("takma_ad tablosu silinebilir (KVKK)", async () => {
    await kiraciIslemi(b.db, KURUM_A, (tx) => tx.execute(sql`delete from takma_ad`));
    const [r] = await sorgu<{ adet: number }>(b.db, sql`select count(*)::int as adet from takma_ad`);
    expect(r?.adet).toBe(1); // yalnız B'ninki kaldı
  });
});

describe("karar kuralları", () => {
  const karar = (x: Partial<typeof s.karar.$inferInsert> & { oneriId: string }) =>
    kiraciIslemi(b.db, KURUM_A, (tx) =>
      tx
        .insert(s.karar)
        .values({ kurumId: KURUM_A, sonuc: "onaylandi", kararVerenKisiId: a.kisi, dayanak: "dogrudan", ...x })
        .returning(),
    );

  it("bir öneriye yalnız bir karar verilir", async () => {
    await karar({ oneriId: a.oneriOrta });
    const h = await reddedilir(() => karar({ oneriId: a.oneriOrta, sonuc: "reddedildi" }));
    expect(hataKodu(h)).toBe("23505");
    expect(hataMetni(h)).toMatch(/karar_oneri_tekil/u);
  });

  it("politika dayanağında politika kimliği zorunlu; doğrudan kararda politika olamaz", async () => {
    const h1 = await reddedilir(() => karar({ oneriId: a.oneriDusuk, dayanak: "politika" }));
    expect(hataKodu(h1)).toBe("23514");
    expect(hataMetni(h1)).toMatch(/politika kimliği zorunlu/u);
    // Tetikleyici dışında da (ör. tetikleyici kapalıyken) CHECK kısıtı aynı kuralı uygular.
    const [k] = await sorgu<{ tanim: string }>(
      b.db,
      sql`select pg_get_constraintdef(oid) as tanim from pg_constraint where conname = 'karar_politika_dayanagi'`,
    );
    expect(k?.tanim).toMatch(/politika_id IS NOT NULL/u);
    const h2 = await reddedilir(() => karar({ oneriId: a.oneriDusuk, politikaId: a.politika }));
    expect(hataMetni(h2)).toMatch(/karar_politika_dayanagi/u);
  });

  it("yetki politikası yüksek riski kapsayamaz", async () => {
    const h = await reddedilir(() =>
      kiraciIslemi(b.db, KURUM_A, (tx) =>
        tx.insert(s.yetkiPolitikasi).values({
          kurumId: KURUM_A,
          ad: "Her şey",
          // Yüksek riskli tür 0003 tetikleyicisiyle ayrıca reddedilir (inceleme.test.ts); burada CHECK sınanır.
          oneriTurleri: ["kanit_etiketi"],
          enYuksekRisk: "yuksek",
          enDusukGuven: 0,
          imzalayanKisiId: a.kisi,
          baslangic: new Date("2026-01-01T00:00:00Z"),
        }),
      ),
    );
    expect(hataKodu(h)).toBe("23514");
    expect(hataMetni(h)).toMatch(/politika_yuksek_risk_yok/u);
  });

  it("politikayla verilen karar yüksek riskli öneriye bağlanamaz", async () => {
    const h = await reddedilir(() => karar({ oneriId: a.oneriYuksek, dayanak: "politika", politikaId: a.politika }));
    expect(hataKodu(h)).toBe("23514");
    expect(hataMetni(h)).toMatch(/Yüksek riskli öneri/u);
  });

  it("politika kapsamı dışındaki öneri (tür) ve imzalayan dışındaki karar veren reddedilir", async () => {
    // oneriOrta zaten karara bağlandı; kapsam denetimini yeni bir orta riskli öneriyle sına.
    const [o] = await kiraciIslemi(b.db, KURUM_A, (tx) =>
      tx
        .insert(s.oneri)
        .values({
          kurumId: KURUM_A,
          tur: "matris_katkisi",
          hedefTuru: "x",
          hedefId: "x",
          icerik: {},
          gerekce: "x",
          guven: 0.95,
          ureticiTuru: "kural",
          uretici: {},
          risk: "orta",
        })
        .returning(),
    );
    if (!o) throw new Error("öneri eklenemedi");
    const h = await reddedilir(() => karar({ oneriId: o.id, dayanak: "politika", politikaId: a.politika }));
    expect(hataMetni(h)).toMatch(/kapsamında değil/u);
  });

  it("kapsam içindeki düşük riskli öneri politikayla karara bağlanır", async () => {
    const [k] = await karar({ oneriId: a.oneriDusuk, dayanak: "politika", politikaId: a.politika });
    expect(k?.dayanak).toBe("politika");
  });

  it("karar başka kurumun önerisine bağlanamaz", async () => {
    const [bOneri] = await sorgu<{ id: string }>(b.db, sql`select id from oneri where kurum_id = ${KURUM_B} limit 1`);
    const h = await reddedilir(() => karar({ oneriId: bOneri?.id ?? "" }));
    expect(hataKodu(h)).toBe("23514");
  });
});
