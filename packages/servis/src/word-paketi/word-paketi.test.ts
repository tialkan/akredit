// Word paketi gidiş-dönüş (İP-37): taslak → .docx indir → Word'de düzenle (XML'i değiştirerek) → yükle →
// alan alan fark → hocanın kendi kararı (öneri + doğrudan onay, günlük). PGlite + sahte YZ; adlar uydurmadır.

import { type BolognaVerisi, ozetHesapla } from "@akredit/cekirdek";
import { kiraciIslemi, sema } from "@akredit/vt";
import { bolognaOrnek, sahteSaglayici } from "@akredit/yz";
import { and, eq } from "drizzle-orm";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ortam } from "../../test/yardimci.ts";
import type { ServisBaglami } from "../baglam.ts";
import * as bologna from "../bologna/index.ts";
import { ServisHatasi } from "../hata.ts";
import { alanUygula, paketAlanlari, wordPaketi, wordYukle } from "./index.ts";

let o: Awaited<ReturnType<typeof ortam>>;
let hoca: ServisBaglami;
let taslakId: string;
let docx: Uint8Array;
const depo = new Map<string, Uint8Array>();

function okuma(): BolognaVerisi {
  const pler = bolognaOrnek.ornekGirdi().sabit.programCiktilari;
  const c = bolognaOrnek.ornekCikti();
  return {
    adres: "https://bologna.ornek.edu.tr/program",
    okundu: "2026-10-20T08:00:00Z",
    programCiktilari: pler.map((p) => ({ kod: p, metin: `${p} program çıktısı metni.` })),
    matris: { pkodlar: pler, dersler: [] },
    tyycIsaret: 5,
    dersler: [
      {
        kod: "BPA102",
        ad: "Veri Tabanı",
        zorunlu: true,
        bos: false,
        kaynak: "https://bologna.ornek.edu.tr/ders/BPA102",
        yariyil: 2,
        tul: "2+1+0",
        kredi: 3,
        akts: 5,
        // Amaç Bologna'da zaten aynı: Word'de "Bologna'da aynı" diye işaretlenir, öneri sayılmaz.
        bilgiler: { Amaç: c.amac.tr },
        degerlendirme: [{ ad: "Ara Sınav", sayi: 1, katki: 40 }],
        isyuku: [{ ad: "Ders Süresi", sayi: 14, sure: 3, toplam: 42 }],
        dersYapisi: [],
        ciktilar: [{ kod: "Ö1", metin: "SQL sorgusu yazar." }],
        haftalar: 10,
        katki: {},
      },
    ],
  };
}

const xmlKacis = (s: string) => s.replace(/&/gu, "&amp;").replace(/</gu, "&lt;").replace(/>/gu, "&gt;");

/** Word'de düzenlemeyi taklit eder: document.xml içinde bir hücre metnini değiştirir. */
function duzenle(veri: Uint8Array, degisimler: [string, string][]): Uint8Array {
  const z = unzipSync(veri);
  let xml = strFromU8(z["word/document.xml"] as Uint8Array);
  for (const [eski, yeni] of degisimler) {
    const aranan = `>${xmlKacis(eski)}</w:t>`;
    if (!xml.includes(aranan)) throw new Error(`belgede yok: ${eski.slice(0, 40)}`);
    xml = xml.replace(aranan, `>${xmlKacis(yeni)}</w:t>`);
  }
  z["word/document.xml"] = strToU8(xml);
  return zipSync(z);
}

const b64 = (v: Uint8Array) => Buffer.from(v).toString("base64");

beforeAll(async () => {
  o = await ortam();
  await kiraciIslemi(o.db, o.a.kurumId, async (tx) => {
    await tx.update(sema.kisi).set({ eposta: "deneme.hoca@ornek.edu.tr" }).where(eq(sema.kisi.id, o.a.ogretim));
    await tx.update(sema.ders).set({ teorik: 2, uygulama: 1 }).where(eq(sema.ders.id, o.a.dersId));
  });
  hoca = await o.baglam(o.a, o.a.ogretim);
  bologna.bolognaKoprusuAyarla({
    oku: null,
    depo: {
      async koy(kurumId, veri) {
        const ozet = ozetHesapla(veri);
        depo.set(ozet, veri);
        return { ozet, anahtar: `${kurumId}/${ozet}` };
      },
    },
    saglayici: sahteSaglayici(
      [
        (istek) => {
          const m = JSON.stringify(istek.mesajlar).match(/\[K:([0-9a-f]{8}) b\.program\./u);
          return JSON.stringify(bolognaOrnek.ornekCikti((m?.[1] ?? "0").padEnd(64, "0"), "BPA102"));
        },
      ],
      { sonuTekrarla: true },
    ),
  });
  await bologna.okumaKaydet(await o.baglam(o.a, o.a.yonetici), o.a.programId, { veri: okuma() });
});
afterAll(async () => {
  await o.kapat();
});

describe("Word paketi", () => {
  it("taslak yoksa ne yapılacağını söyler", async () => {
    await expect(wordPaketi(hoca, o.a.dersId)).rejects.toThrow(/Eksikleri gider/u);
  });

  it("indirme: OBS (Proliz) alan sırası, Akredit önerileri işaretli, bulgular ve kaynakça var", async () => {
    taslakId = (await bologna.eksikleriGider(hoca, { dersId: o.a.dersId })).taslak.oneriId;
    const p = await wordPaketi(hoca, o.a.dersId);
    expect(p.mime).toBe("application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    expect(p.dosyaAdi).toBe("BPA102-ders-bilgi-paketi.docx");
    docx = new Uint8Array(Buffer.from(p.icerikBase64, "base64"));
    expect(p.ozet).toBe(ozetHesapla(docx));
    const xml = strFromU8(unzipSync(docx)["word/document.xml"] as Uint8Array);
    expect(xml).toContain("Akredit önerisi");
    expect(xml).toContain("FFF4C2");
    expect(xml).toMatch(/Bologna(&apos;|')da aynı/u);
    expect(xml).toContain("Kaynakça");
    expect(xml).toContain("Bulgular");
    expect(xml).toContain("akts-isyuku");
    // Tablo sırası yazma planıyla (OBS ekran sırası) birebir aynı.
    const t = bolognaOrnek.ornekCikti() as unknown as Parameters<typeof paketAlanlari>[0];
    const sabit = {
      ...t,
      kod: "BPA102",
      ad: "Veri Tabanı",
      akts: 5,
      tul: "2+1+0",
      programCiktilari: [],
      yetkililer: [],
    };
    expect(paketAlanlari(sabit, null).map((a) => `${a.sekme}/${a.alan}`)).toEqual(
      bologna.yazmaPlaniKur(sabit, "").map((a) => `${a.sekme}/${a.alan}`),
    );
  });

  it("değişmemiş dosya yüklenirse kayıt açılmaz", async () => {
    const r = await wordYukle(hoca, o.a.dersId, { dosyaAdi: "paket.docx", icerikBase64: b64(docx) });
    expect(r).toMatchObject({ oneriId: null, kararId: null, degisen: [] });
  });

  it("gidiş-dönüş: alan farkı hocanın kararı olarak kaydedilir; geçersiz değer ve sistem alanı reddedilir", async () => {
    const c = bolognaOrnek.ornekCikti();
    const yeniAmac = `${c.amac.tr} Ayrıca veri bütünlüğü ele alınır.`;
    const duzenli = duzenle(docx, [
      [c.amac.tr, yeniAmac],
      ["Bilgi", "Yetkinlik"],
      [`${c.degerlendirme[0]?.sayi} adet, %${c.degerlendirme[0]?.katki}`, "bir adet, kırk"],
      ["Öğr. Gör. Deneme Hoca A <deneme.hoca@ornek.edu.tr>", "Başka Biri <baska@ornek.edu.tr>"],
    ]);
    const r = await wordYukle(hoca, o.a.dersId, { dosyaAdi: "BPA102 düzenlenmiş.docx", icerikBase64: b64(duzenli) });
    expect(r.degisen.map((x) => x.alan)).toEqual(["Dersin Amacı", expect.stringMatching(/^Ö\d+ Türü$/u)]);
    expect(r.degisen[0]).toMatchObject({ eski: c.amac.tr, yeni: yeniAmac });
    expect(r.reddedilen.map((x) => x.neden)).toEqual([
      expect.stringContaining("1 adet, %40"),
      expect.stringContaining("Word'den değiştirilemez"),
    ]);
    const [yo] = await kiraciIslemi(o.db, o.a.kurumId, (tx) =>
      tx
        .select()
        .from(sema.oneri)
        .where(eq(sema.oneri.id, r.oneriId as string)),
    );
    expect(yo).toMatchObject({ tur: "bologna_taslagi", ureticiTuru: "kisi", hedefId: o.a.dersId });
    const ic = yo?.icerik as { taslak: { amac: { tr: string } }; temelOneriId: string; wordKanitId: string };
    expect(ic.taslak.amac.tr).toBe(yeniAmac);
    expect(ic.temelOneriId).toBe(taslakId);
    // Karar: hocanın kendisi, doğrudan.
    const [k] = await kiraciIslemi(o.db, o.a.kurumId, (tx) =>
      tx
        .select()
        .from(sema.karar)
        .where(eq(sema.karar.id, r.kararId as string)),
    );
    expect(k).toMatchObject({ sonuc: "onaylandi", kararVerenKisiId: o.a.ogretim, dayanak: "dogrudan" });
    // Yüklenen dosya kanıt olarak saklandı (özetiyle), günlükte iz var.
    const [kn] = await kiraciIslemi(o.db, o.a.kurumId, (tx) =>
      tx.select().from(sema.kanit).where(eq(sema.kanit.id, ic.wordKanitId)),
    );
    expect(kn?.ozet).toBe(ozetHesapla(duzenli));
    const g = await kiraciIslemi(o.db, o.a.kurumId, (tx) =>
      tx
        .select()
        .from(sema.gunluk)
        .where(and(eq(sema.gunluk.eylem, "word_paketi.yuklendi"), eq(sema.gunluk.hedefId, r.oneriId as string))),
    );
    expect(g).toHaveLength(1);
    // Sonraki indirme yeni (hocanın) taslağını verir.
    const p2 = await wordPaketi(hoca, o.a.dersId);
    expect(strFromU8(unzipSync(Buffer.from(p2.icerikBase64, "base64"))["word/document.xml"] as Uint8Array)).toContain(
      "veri bütünlüğü",
    );
  });

  it("başka dersin ya da paket kimliksiz dosya reddedilir", async () => {
    await expect(
      wordYukle(hoca, o.a.dersId, { dosyaAdi: "x.docx", icerikBase64: b64(strToU8("düz metin")) }),
    ).rejects.toBeInstanceOf(ServisHatasi);
  });

  it("alan uygulama: biçim denetimi", () => {
    const t = structuredClone(bolognaOrnek.ornekCikti()) as unknown as Parameters<typeof alanUygula>[0];
    alanUygula(t, "İş Yükü", t.isyuku[0]?.ad as string, "10 x 2 saat");
    expect(t.isyuku[0]).toMatchObject({ sayi: 10, sure: 2 });
    alanUygula(t, "Genel", "Sürdürülebilir Kalkınma Amaçları", "4, 9");
    expect(t.ska).toEqual([4, 9]);
    expect(() => alanUygula(t, "Genel", "Sürdürülebilir Kalkınma Amaçları", "18")).toThrow(/1-17/u);
    alanUygula(t, "Kaynaklar", "Kaynak 1", "Yazar A, Eser B, Yayınevi C, 2020");
    expect(t.kaynaklar[0]).toMatchObject({ yazar: "Yazar A", eser: "Eser B", yayinevi: "Yayınevi C", yil: 2020 });
  });
});
