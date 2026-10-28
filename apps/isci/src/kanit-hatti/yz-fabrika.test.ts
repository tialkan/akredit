// İP-35: işçi, kurumun kayıtlı OpenRouter anahtarını iş anında kasadan çözer. Ağ yok; anahtar uydurmadır.
import { sema } from "@akredit/vt";
import { saglayiciAnahtarKasasi } from "@akredit/yz";
import { eq, sql } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { kanitAl } from "./alma.ts";
import { durumGecmisi } from "./durum.ts";
import { hatKur, KURUM } from "./test/yardimci.ts";

const ANAHTAR = "sk-or-v1-uydurmaisci000000000000042";
const kasa = saglayiciAnahtarKasasi(new Uint8Array(32).fill(9));
const metin = (s: string) => new TextEncoder().encode(s);
let kapat: (() => Promise<void>) | undefined;
afterEach(async () => {
  await kapat?.();
  kapat = undefined;
});

describe("kurum anahtarıyla YZ işleri", () => {
  it("anahtar yoksa sınıflama 'Yapay zekâ anahtarı tanımlı değil' diye durur", async () => {
    const h = await hatKur({ saglayici: undefined, kurumFabrikasi: { kasa } });
    kapat = h.kapat;
    const a = await kanitAl(h.b, {
      kurumId: KURUM,
      veri: metin("Yönerge metni."),
      dosyaAdi: "y.txt",
      kaynakTuru: "yukleme",
    });
    await h.kuyruk.bosalt();
    const g = await durumGecmisi(h.db, KURUM, (a as { kanitId: string }).kanitId);
    expect(g.at(-1)?.ayrinti).toMatchObject({ atlandi: "anahtar_yok" });
    expect(JSON.stringify(g.at(-1)?.ayrinti)).toContain("Yapay zekâ anahtarı tanımlı değil");
  });

  it("kayıtlı anahtar iş anında çözülür; iş yüküne, durum kaydına ve günlüğe girmez", async () => {
    const giden: string[] = [];
    const sahte = async (_u: string | URL | Request, i?: RequestInit) => {
      giden.push(String((i?.headers as Record<string, string>)?.authorization ?? ""));
      const icerik = JSON.stringify({ belgeTuru: "diger", olcutOnerileri: [] });
      return new Response(JSON.stringify({ choices: [{ message: { content: icerik } }] }), { status: 200 });
    };
    const h = await hatKur({
      saglayici: undefined,
      kurumFabrikasi: { kasa, fetch: sahte as never },
    });
    kapat = h.kapat;
    await h.db
      .update(sema.kurum)
      .set({
        ayarlar: {
          yz: { yurtDisiIzin: true },
          yzAnahtar: {
            saglayici: "openrouter",
            sifreli: kasa.sifrele(ANAHTAR, KURUM),
            son4: "0042",
            model: "openrouter/auto",
            kayitZamani: "2026-10-28T00:00:00Z",
            kaydeden: "Deneme Yönetici",
          },
        },
      })
      .where(eq(sema.kurum.id, KURUM));
    await kanitAl(h.b, {
      kurumId: KURUM,
      veri: metin("Kalite komisyonu toplandı ve program çıktılarını değerlendirdi."),
      dosyaAdi: "t.txt",
      kaynakTuru: "yukleme",
    });
    await h.kuyruk.bosalt();
    expect(giden.length).toBeGreaterThan(0);
    expect(giden.every((x) => x === `Bearer ${ANAHTAR}`)).toBe(true);
    expect(JSON.stringify(h.kuyruk.tamamlanan)).not.toContain(ANAHTAR);
    expect(JSON.stringify(h.kuyruk.olu)).not.toContain(ANAHTAR);
    const durum = await h.db.select().from(sema.kanitIsleme);
    expect(JSON.stringify(durum)).not.toContain(ANAHTAR);
    const gunluk = await h.db.execute(sql`select * from gunluk`);
    expect(JSON.stringify(gunluk)).not.toContain(ANAHTAR);
  });
});
