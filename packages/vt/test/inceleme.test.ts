// Bağımsız inceleme (dalga 1): öneri türünün riski veritabanında da uygulanır.
// Önceden `oneri.risk` sütunu türün riskinden düşük yazılabiliyordu (ör. dis_gonderim + dusuk); bu durumda
// türü yüksek riskli bir öneri yetki politikasıyla karara bağlanabiliyordu (CLAUDE.md ilke 3).

import { sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { kiraciIslemi } from "../src/baglanti.ts";
import * as s from "../src/sema/index.ts";
import { gocluVt, hataKodu, hataMetni, KURUM_A, kurumVerisiEkle, type OrnekKimlikler, reddedilir } from "./yardimci.ts";

let b: Awaited<ReturnType<typeof gocluVt>>;
let a: OrnekKimlikler;

beforeAll(async () => {
  b = await gocluVt();
  a = await kurumVerisiEkle(b.db, KURUM_A, "A");
});
afterAll(async () => {
  await b.kapat();
});

const oneriDegeri = (tur: "dis_gonderim" | "matris_katkisi" | "olgunluk_duzeyi") => ({
  kurumId: KURUM_A,
  tur,
  hedefTuru: "x",
  hedefId: "x",
  icerik: {},
  gerekce: "x",
  guven: 0.99,
  ureticiTuru: "yz" as const,
  uretici: {},
  risk: "dusuk" as const,
});

const politikaDegeri = (oneriTurleri: ("kanit_etiketi" | "dis_gonderim" | "olgunluk_duzeyi")[]) => ({
  kurumId: KURUM_A,
  ad: "Deneme",
  oneriTurleri,
  enYuksekRisk: "dusuk" as const,
  enDusukGuven: 0,
  imzalayanKisiId: a.kisi,
  baslangic: new Date("2026-01-01T00:00:00Z"),
});

describe("tür riski veritabanında da uygulanır", () => {
  it("yüksek riskli türdeki öneri düşük riskle eklenemez", async () => {
    const h = await reddedilir(() =>
      kiraciIslemi(b.db, KURUM_A, (tx) => tx.insert(s.oneri).values(oneriDegeri("dis_gonderim"))),
    );
    expect(hataKodu(h)).toBe("23514");
    expect(hataMetni(h)).toMatch(/türünün riskinden düşük/u);
  });

  it("orta riskli türdeki öneri düşük riskle eklenemez", async () => {
    const h = await reddedilir(() =>
      kiraciIslemi(b.db, KURUM_A, (tx) => tx.insert(s.oneri).values(oneriDegeri("matris_katkisi"))),
    );
    expect(hataKodu(h)).toBe("23514");
  });

  it("yetki politikası yüksek riskli öneri türünü kapsayamaz", async () => {
    const h = await reddedilir(() =>
      kiraciIslemi(b.db, KURUM_A, (tx) =>
        tx.insert(s.yetkiPolitikasi).values(politikaDegeri(["kanit_etiketi", "dis_gonderim"])),
      ),
    );
    expect(hataKodu(h)).toBe("23514");
    expect(hataMetni(h)).toMatch(/yüksek riskli öneri türünü kapsayamaz/u);
  });

  it("tetikleyici atlanarak eklenmiş eski satırlarda da karar tetikleyicisi tür riskine bakar", async () => {
    // Göçten önce eklenmiş satırları taklit et: sahip rolüyle kullanıcı tetikleyicilerini atla.
    const { oneriId, politikaId } = await b.db.transaction(async (tx) => {
      await tx.execute(sql`set local session_replication_role = replica`);
      const [o] = await tx.insert(s.oneri).values(oneriDegeri("olgunluk_duzeyi")).returning();
      const [p] = await tx
        .insert(s.yetkiPolitikasi)
        .values(politikaDegeri(["olgunluk_duzeyi"]))
        .returning();
      return { oneriId: o?.id ?? "", politikaId: p?.id ?? "" };
    });
    const h = await reddedilir(() =>
      kiraciIslemi(b.db, KURUM_A, (tx) =>
        tx.insert(s.karar).values({
          kurumId: KURUM_A,
          oneriId,
          sonuc: "onaylandi",
          kararVerenKisiId: a.kisi,
          dayanak: "politika",
          politikaId,
        }),
      ),
    );
    expect(hataKodu(h)).toBe("23514");
    expect(hataMetni(h)).toMatch(/Yüksek riskli öneri/u);
  });
});
