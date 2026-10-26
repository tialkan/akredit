// Kanıt servisi: liste (süzgeç + sayfalama), ayrıntı (parçalar), kanıt hattı iş durumu.
// Kanıt yalnız okunur; yükleme kanıt hattında (apps/isci) yapılır.

import { type Islem, type SorguSonucu, satirlar, sema } from "@akredit/vt";
import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import type { z } from "zod";
import { type Hedef, islem, type ServisBaglami } from "./baglam.ts";
import { bulunamadi } from "./hata.ts";
import {
  type KanitAyrintisi,
  KanitFiltresi,
  type KanitGorunumu,
  type KanitHattiOzeti,
  type Sayfa,
  sayfala,
} from "./semalar.ts";
import { aramaAnahtari } from "./yardimci.ts";

type Gorunum = z.infer<typeof KanitGorunumu>;

const OZGULLUK = { ders: 3, program: 2, birim: 1 } as const;

/** Kanıtın yetki hedefi: kapsamlarından en özgül olanı (ders > program > birim), yoksa kurum. */
export function kanitHedefi(kurumId: string, kapsamlar: unknown): Hedef {
  let en: Hedef = { tur: "kurum", id: kurumId };
  let puan = 0;
  for (const k of Array.isArray(kapsamlar) ? kapsamlar : []) {
    const tur = (k as { tur?: string })?.tur;
    const id = (k as { id?: unknown })?.id;
    if ((tur === "ders" || tur === "program" || tur === "birim") && typeof id === "string" && OZGULLUK[tur] > puan) {
      en = { tur, id };
      puan = OZGULLUK[tur];
    }
  }
  return en;
}

interface IslemeSatiri {
  kanit_id: string;
  durum: NonNullable<Gorunum["isleme"]>["durum"];
  ayrinti: { asama?: string; ileti?: unknown; kisiselVeri?: unknown };
  olusturma: string | Date;
}

async function sonDurumlar(tx: Islem, kanitIdleri: string[]): Promise<Map<string, IslemeSatiri>> {
  if (kanitIdleri.length === 0) return new Map();
  const rows = satirlar(
    (await tx.execute(sql`
      select distinct on (kanit_id) kanit_id, durum, ayrinti, olusturma from kanit_isleme
      where kanit_id in (${sql.join(
        kanitIdleri.map((i) => sql`${i}::uuid`),
        sql`, `,
      )})
      order by kanit_id, olusturma desc, id desc`)) as unknown as SorguSonucu<IslemeSatiri>,
  );
  return new Map(rows.map((r) => [r.kanit_id, r]));
}

async function gorunumler(tx: Islem, satir: (typeof sema.kanit.$inferSelect)[]): Promise<Gorunum[]> {
  const idler = satir.map((k) => k.id);
  const baglar = idler.length
    ? await tx
        .select({ kanitId: sema.kanitOlcutBaglantisi.kanitId, kod: sema.olcut.kod })
        .from(sema.kanitOlcutBaglantisi)
        .innerJoin(sema.olcut, eq(sema.olcut.id, sema.kanitOlcutBaglantisi.olcutId))
        .where(inArray(sema.kanitOlcutBaglantisi.kanitId, idler))
    : [];
  const durumlar = await sonDurumlar(tx, idler);
  return satir.map((k) => {
    const d = durumlar.get(k.id);
    const ayrinti = k.kaynakAyrinti as Record<string, unknown>;
    const olcutler = [...new Set(baglar.filter((b) => b.kanitId === k.id).map((b) => b.kod))].sort();
    return {
      id: k.id,
      kurumId: k.kurumId,
      ozet: k.ozet,
      dosyaAdi: k.dosyaAdi,
      mime: k.mime,
      boyut: k.boyut,
      kaynakTuru: k.kaynakTuru,
      kaynakAyrinti: ayrinti,
      belgeTarihi: k.belgeTarihi,
      kapsamlar: Array.isArray(k.kapsamlar) ? (k.kapsamlar as { tur: string; id: string }[]) : [],
      eklenme: k.olusturma.toISOString(),
      // `kanit.kisisel_veri` sütunu hatta güncellenmez (yalnız ekleme); güncel tarama sonucu işleme kaydındadır.
      kisiselVeri: d?.ayrinti.kisiselVeri === "var" ? "var" : d?.ayrinti.kisiselVeri === "yok" ? "yok" : "bilinmiyor",
      baslik: typeof ayrinti.baslik === "string" && ayrinti.baslik.trim() ? ayrinti.baslik : k.dosyaAdi,
      olcutler,
      isleme: d
        ? {
            durum: d.durum,
            asama: typeof d.ayrinti.asama === "string" ? d.ayrinti.asama : "bilinmiyor",
            ileti: typeof d.ayrinti.ileti === "string" ? d.ayrinti.ileti : null,
            zaman: new Date(d.olusturma).toISOString(),
          }
        : null,
    };
  });
}

/** Aktörün görebildiği kanıtlar (en yeni önce), süzgeç ve sayfalamayla. */
export async function kanitlar(b: ServisBaglami, girdi: z.input<typeof KanitFiltresi> = {}): Promise<Sayfa<Gorunum>> {
  const f = KanitFiltresi.parse(girdi);
  return islem(b, async (tx, _g, d) => {
    const satir = await tx.select().from(sema.kanit).orderBy(desc(sema.kanit.olusturma), desc(sema.kanit.id));
    const gorunur = await d.suz("kanit.oku", satir, (k) => kanitHedefi(b.aktor.kurumId, k.kapsamlar));
    let liste = await gorunumler(tx, gorunur);
    const arama = f.arama ? aramaAnahtari(f.arama) : "";
    liste = liste.filter((k) => {
      if (f.kaynakTuru && k.kaynakTuru !== f.kaynakTuru) return false;
      if (f.olcut && !k.olcutler.includes(f.olcut)) return false;
      if (arama && !aramaAnahtari(`${k.baslik} ${k.dosyaAdi}`).includes(arama)) return false;
      return true;
    });
    return sayfala(liste, { sinir: f.sinir, ...(f.imlec ? { imlec: f.imlec } : {}) });
  });
}

/** Tek kanıt ve parçaları. Görme yetkisi yoksa 403, başka kurumun ya da olmayan kanıt 404. */
export async function kanit(b: ServisBaglami, id: string): Promise<z.infer<typeof KanitAyrintisi>> {
  return islem(b, async (tx, gerekli) => {
    const [k] = /^[0-9a-f-]{36}$/iu.test(id) ? await tx.select().from(sema.kanit).where(eq(sema.kanit.id, id)) : [];
    if (!k) throw bulunamadi();
    await gerekli("kanit.oku", kanitHedefi(b.aktor.kurumId, k.kapsamlar));
    const [g] = await gorunumler(tx, [k]);
    const parcalar = await tx
      .select()
      .from(sema.kanitParcasi)
      .where(eq(sema.kanitParcasi.kanitId, id))
      .orderBy(asc(sema.kanitParcasi.sira));
    return {
      kanit: g as Gorunum,
      parcalar: parcalar.map((p) => ({
        id: p.id,
        kanitId: p.kanitId,
        sira: p.sira,
        capa: (p.capa ?? {}) as Record<string, never>,
        metin: p.metin,
      })),
    };
  });
}

/**
 * Kanıt hattının iş durumu (panel için): her kanıtın son işleme kaydına göre sayaçlar. Sayım
 * `apps/isci` `durumOzeti` ile aynı kuralı izler; yalnız aktörün görebildiği kanıtlar sayılır.
 */
export async function kanitHattiOzeti(b: ServisBaglami): Promise<z.infer<typeof KanitHattiOzeti>> {
  return islem(b, async (tx, _g, d) => {
    const satir = await tx.select({ id: sema.kanit.id, kapsamlar: sema.kanit.kapsamlar }).from(sema.kanit);
    const gorunur = await d.suz("kanit.oku", satir, (k) => kanitHedefi(b.aktor.kurumId, k.kapsamlar));
    const durumlar = await sonDurumlar(
      tx,
      gorunur.map((k) => k.id),
    );
    const sayac = { isleniyor: 0, tamam: 0, hata: 0, ocr_bekliyor: 0, kisisel_veri: 0 };
    for (const r of durumlar.values()) {
      if (r.durum === "hata") sayac.hata++;
      else if (r.ayrinti.asama === "tamam") sayac.tamam++;
      else if (r.durum === "ocr_gerekli") sayac.ocr_bekliyor++;
      else sayac.isleniyor++;
    }
    // Kişisel veri: son taramada "var" bulunan kanıtlar.
    if (gorunur.length) {
      const kv = satirlar(
        (await tx.execute(sql`
          select distinct on (kanit_id) kanit_id, ayrinti->>'kisiselVeri' as kv from kanit_isleme
          where ayrinti ? 'kisiselVeri' and kanit_id in (${sql.join(
            gorunur.map((k) => sql`${k.id}::uuid`),
            sql`, `,
          )})
          order by kanit_id, olusturma desc, id desc`)) as unknown as SorguSonucu<{ kv: string }>,
      );
      sayac.kisisel_veri = kv.filter((x) => x.kv === "var").length;
    }
    return { sayac };
  });
}
