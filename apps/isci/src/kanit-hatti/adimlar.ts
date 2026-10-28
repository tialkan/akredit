// Hat adımları: metin çıkarma → OCR → kişisel veri taraması → parçalama → gömme → sınıflama → öneri.
// Her adım ayrı kuyruk işidir; ara sonuç (çıkarılan metin) depoya içerik adresli JSON olarak konur.
// Adımlar yeniden denemeye dayanıklıdır: parça ve öneri eklemeden önce var olan kayıt denetlenir.

import type { BelgeMetni } from "@akredit/belge";
import { parcala } from "@akredit/belge";
import { type Capa, ozetHesapla } from "@akredit/cekirdek";
import { gunlugeYaz, kiraciIslemi, sema } from "@akredit/vt";
import {
  gorevCalistir,
  InsanGerekliHatasi,
  type KurumYzAyari,
  kanitSiniflama,
  maskele,
  maskeleyici,
  politikaUygula,
  type VeriTuru,
  YzHatasi,
} from "@akredit/yz";
import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { type HatBaglami, KUYRUK, kurumYzAyari, olcutListesi, saglayiciCoz } from "./baglam.ts";
import { yalitilmisMetinCikar } from "./cikarma.ts";
import { type Asama, durumYaz, type IslemeDurumu } from "./durum.ts";

export const IsVerisi = z.object({ kurumId: z.uuid(), kanitId: z.uuid() });
export const MetinIsVerisi = IsVerisi.extend({ metinAnahtari: z.string() });
export type IsVerisi = z.infer<typeof IsVerisi>;

const GOMME_PAKETI = 64;
const GOMME_BOYUTU = sema.GOMME_BOYUTU;

async function durum(b: HatBaglami, v: IsVerisi, d: IslemeDurumu, asama: Asama, ek: Record<string, unknown> = {}) {
  await kiraciIslemi(b.db, v.kurumId, (tx) => durumYaz(tx, v.kurumId, v.kanitId, d, { asama, ...ek }));
}

async function kanitSatiri(b: HatBaglami, v: IsVerisi) {
  const [k] = await kiraciIslemi(b.db, v.kurumId, (tx) =>
    tx.select().from(sema.kanit).where(eq(sema.kanit.id, v.kanitId)),
  );
  if (!k) throw new Error("Kanıt bulunamadı.");
  return k;
}

async function metniSakla(b: HatBaglami, v: IsVerisi, m: BelgeMetni): Promise<string> {
  const nesne = await b.depo.koy(v.kurumId, new TextEncoder().encode(JSON.stringify(m)), {
    mime: "application/json",
  });
  return nesne.anahtar;
}

const BelgeMetniSemasi = z.object({
  tur: z.string(),
  ozet: z.string(),
  bolumler: z.array(z.object({ capa: z.record(z.string(), z.unknown()), metin: z.string() }).loose()),
  tablolar: z.array(
    z.object({ capa: z.record(z.string(), z.unknown()), satirlar: z.array(z.array(z.unknown())) }).loose(),
  ),
  ocrGerekli: z.boolean(),
  uyarilar: z.array(z.string()),
});

async function metniOku(b: HatBaglami, anahtar: string): Promise<BelgeMetni> {
  const ham = JSON.parse(new TextDecoder().decode(await b.depo.al(anahtar)));
  return BelgeMetniSemasi.parse(ham) as unknown as BelgeMetni;
}

// ---------- 1. Metin çıkarma ----------

export async function cikarAdimi(b: HatBaglami, v: IsVerisi): Promise<void> {
  const k = await kanitSatiri(b, v);
  const veri = await b.depo.al(k.depoAnahtari);
  const secenek = b.cikarmaSureMs !== undefined ? { toplamSureMs: b.cikarmaSureMs } : {};
  const m = await yalitilmisMetinCikar(veri, { ad: k.dosyaAdi, mime: k.mime }, secenek);
  if (m.ocrGerekli) {
    await durum(b, v, "ocr_gerekli", "ocr", { tur: m.tur, uyarilar: m.uyarilar });
    await b.kuyruk.gonder(KUYRUK.ocr, v, { tekilAnahtar: `${KUYRUK.ocr}:${v.kanitId}` });
    return;
  }
  if (!m.bolumler.length && !m.tablolar.length) {
    // Bozuk ya da desteklenmeyen dosya: kalıcı hata, yeniden denenmez; hat diğer belgelerle sürer.
    await durum(b, v, "hata", "cikarma", {
      ileti: m.uyarilar[0] ?? "Dosyadan metin çıkarılamadı.",
      kalici: true,
      tur: m.tur,
    });
    return;
  }
  const metinAnahtari = await metniSakla(b, v, m);
  await durum(b, v, "metin_cikarildi", "cikarma", {
    tur: m.tur,
    metinAnahtari,
    sayfaSayisi: m.sayfaSayisi ?? null,
    uyarilar: m.uyarilar,
  });
  await b.kuyruk.gonder(
    KUYRUK.zenginlestir,
    { ...v, metinAnahtari },
    { tekilAnahtar: `${KUYRUK.zenginlestir}:${v.kanitId}` },
  );
}

// ---------- 2. OCR (kurum içi) ----------

export async function ocrAdimi(b: HatBaglami, v: IsVerisi): Promise<void> {
  if (!b.ocr) {
    await durum(b, v, "ocr_gerekli", "ocr", {
      ileti: "Bu belge taranmış görünüyor. Metin tanıma açıldığında otomatik okunacak.",
    });
    return;
  }
  const k = await kanitSatiri(b, v);
  const veri = await b.depo.al(k.depoAnahtari);
  const pdfMi = veri[0] === 0x25 && veri[1] === 0x50 && veri[2] === 0x44 && veri[3] === 0x46;
  const sayfalar = await b.ocr.oku(veri, pdfMi ? "pdf" : "gorsel");
  const bolumler = sayfalar.filter((s) => s.metin.trim()).map((s) => ({ capa: { sayfa: s.sayfa }, metin: s.metin }));
  if (!bolumler.length) {
    await durum(b, v, "hata", "ocr", { ileti: "Taranmış belgede okunabilir yazı bulunamadı.", kalici: true });
    return;
  }
  const m: BelgeMetni = {
    tur: pdfMi ? "pdf" : "gorsel",
    ozet: k.ozet as BelgeMetni["ozet"],
    bolumler,
    tablolar: [],
    ocrGerekli: false,
    uyarilar: ["Metin, taranmış görüntüden otomatik okundu; yazım hataları olabilir."],
    sayfaSayisi: sayfalar.length,
  };
  const metinAnahtari = await metniSakla(b, v, m);
  await durum(b, v, "metin_cikarildi", "ocr", { motor: b.ocr.ad, metinAnahtari, sayfaSayisi: sayfalar.length });
  await b.kuyruk.gonder(
    KUYRUK.zenginlestir,
    { ...v, metinAnahtari },
    { tekilAnahtar: `${KUYRUK.zenginlestir}:${v.kanitId}` },
  );
}

// ---------- 3. Kişisel veri taraması, parçalama, gömme ----------

/** Metindeki kişisel veri türlerini sayar (değerler saklanmaz). */
export function kisiselVeriTara(metinler: string[], ayar: KurumYzAyari): Partial<Record<VeriTuru, number>> {
  const sayac: Partial<Record<VeriTuru, number>> = {};
  for (const m of metinler)
    for (const e of maskele(m, ayar.maske ?? {}).eslemeler) sayac[e.tur] = (sayac[e.tur] ?? 0) + 1;
  return sayac;
}

export async function zenginlestirAdimi(b: HatBaglami, v: z.infer<typeof MetinIsVerisi>): Promise<void> {
  const m = await metniOku(b, v.metinAnahtari);
  const parcalar = parcala(m);
  const ayar = await kurumYzAyari(b, v.kurumId);

  const bulgular = kisiselVeriTara(
    parcalar.map((p) => p.metin),
    ayar,
  );
  const kisiselVeri = Object.keys(bulgular).length ? "var" : "yok";
  await kiraciIslemi(b.db, v.kurumId, async (tx) => {
    await durumYaz(tx, v.kurumId, v.kanitId, "metin_cikarildi", { asama: "kvkk", kisiselVeri, turler: bulgular });
    if (kisiselVeri === "var")
      await gunlugeYaz(tx, {
        aktor: { tur: "sistem", id: null },
        eylem: "kanit.kisisel_veri_isaretlendi",
        hedef: { tur: "kanit", id: v.kanitId },
        ayrinti: { turler: bulgular as Record<string, number> },
      });
  });

  // Gömme: yurt dışı sağlayıcıya yalnız izinle ve her zaman maskeli metin gider.
  let gommeler: (number[] | null)[] = parcalar.map(() => null);
  let gommeNotu: string | null = null;
  const s = b.saglayici;
  if (!s?.gomme) gommeNotu = "Gömme hizmeti tanımlı değil; arama yalnız metinle çalışır.";
  else if (!s.yurtIci && !ayar.yurtDisiIzin)
    gommeNotu = "Kurum yurt dışı yapay zekâ hizmetine izin vermediği için gömme yapılmadı.";
  else {
    const mk = maskeleyici(ayar.maske ?? {});
    const girdiler = parcalar.map((p) => (s.yurtIci ? p.metin : mk.maskele(p.metin)));
    gommeler = [];
    for (let i = 0; i < girdiler.length; i += GOMME_PAKETI) {
      const paket = await s.gomme(girdiler.slice(i, i + GOMME_PAKETI));
      for (const g of paket) gommeler.push(g.length === GOMME_BOYUTU && g.every(Number.isFinite) ? g : null);
    }
    if (gommeler.some((g) => g === null)) gommeNotu = "Bazı parçaların gömmesi beklenen boyutta değildi, atlandı.";
  }

  await kiraciIslemi(b.db, v.kurumId, async (tx) => {
    const varolan = await tx
      .select({ sira: sema.kanitParcasi.sira })
      .from(sema.kanitParcasi)
      .where(eq(sema.kanitParcasi.kanitId, v.kanitId));
    const olan = new Set(varolan.map((x) => x.sira));
    const yeni = parcalar
      .map((p, i) => ({
        kurumId: v.kurumId,
        kanitId: v.kanitId,
        sira: p.sira,
        capa: p.capa,
        metin: p.metin,
        gomme: gommeler[i] ?? null,
      }))
      .filter((p) => !olan.has(p.sira));
    for (let i = 0; i < yeni.length; i += 200)
      await tx
        .insert(sema.kanitParcasi)
        .values(yeni.slice(i, i + 200))
        .onConflictDoNothing();
    await durumYaz(tx, v.kurumId, v.kanitId, "gomme_tamam", {
      asama: "gomme",
      parcaSayisi: parcalar.length,
      gommeli: gommeler.filter(Boolean).length,
      ...(gommeNotu ? { ileti: gommeNotu } : {}),
    });
  });
  await b.kuyruk.gonder(
    KUYRUK.sinifla,
    { kurumId: v.kurumId, kanitId: v.kanitId },
    {
      tekilAnahtar: `${KUYRUK.sinifla}:${v.kanitId}`,
    },
  );
}

// ---------- 4. Sınıflama ve öneri ----------

export async function siniflaAdimi(b: HatBaglami, v: IsVerisi): Promise<void> {
  const bitir = (ek: Record<string, unknown>) => durum(b, v, "gomme_tamam", "tamam", ek);
  if (!b.saglayici && !b.kurumFabrikasi)
    return bitir({ ileti: "Yapay zekâ hizmeti tanımlı değil; ölçüt önerisi yapılmadı." });
  const k = await kanitSatiri(b, v);
  const { parcalar, oneriVar } = await kiraciIslemi(b.db, v.kurumId, async (tx) => ({
    parcalar: await tx
      .select({ capa: sema.kanitParcasi.capa, metin: sema.kanitParcasi.metin })
      .from(sema.kanitParcasi)
      .where(eq(sema.kanitParcasi.kanitId, v.kanitId))
      .orderBy(asc(sema.kanitParcasi.sira))
      .limit(40),
    oneriVar:
      (
        await tx
          .select({ id: sema.oneri.id })
          .from(sema.oneri)
          .where(
            and(
              eq(sema.oneri.tur, "kanit_etiketi"),
              eq(sema.oneri.hedefTuru, "kanit"),
              eq(sema.oneri.hedefId, v.kanitId),
            ),
          )
      ).length > 0,
  }));
  if (oneriVar) return bitir({ ileti: "Öneri daha önce üretilmişti." });
  const olcutler = await olcutListesi(b, v.kurumId);
  if (!olcutler.length) return bitir({ ileti: "Ölçüt listesi boş; ölçüt önerisi yapılmadı." });
  const ayar = await kurumYzAyari(b, v.kurumId);
  let saglayici: NonNullable<typeof b.saglayici>;
  try {
    // Sağlayıcı iş anında çözülür (kurum anahtarı kasadan); iş yükünde anahtar yoktur.
    const c = await saglayiciCoz(b, v.kurumId);
    if (!c.saglayici) return bitir({ ileti: c.ileti, ...(c.anahtarYok ? { atlandi: "anahtar_yok" } : {}) });
    // Yurt dışı sağlayıcı: izin yoksa çağrı yapılmaz; izin varsa mesajlar maskelenerek gider.
    saglayici = c.politikaUygulandi ? c.saglayici : politikaUygula(c.saglayici, ayar);
  } catch (e) {
    if (e instanceof YzHatasi && e.tur === "politika") return bitir({ ileti: e.message, atlandi: "politika" });
    throw e;
  }
  const kaynak = { ozet: k.ozet, parcalar: parcalar.map((p) => ({ capa: p.capa as Capa, metin: p.metin })) };
  let sonuc: Awaited<ReturnType<typeof gorevCalistir<unknown, typeof kanitSiniflama.sema>>>;
  try {
    sonuc = await gorevCalistir(kanitSiniflama, { kanit: kaynak, olcutler }, saglayici);
  } catch (e) {
    if (e instanceof InsanGerekliHatasi)
      return bitir({ ileti: "Belge otomatik sınıflanamadı; bir kişinin etiketlemesi gerekiyor.", insanGerekli: true });
    throw e;
  }
  const { veri, sorunlar, gecerli } = sonuc;
  const guven = veri.olcutOnerileri.length ? Math.max(...veri.olcutOnerileri.map((o) => o.guven)) : null;
  const oneriId = await kiraciIslemi(b.db, v.kurumId, async (tx) => {
    const [o] = await tx
      .insert(sema.oneri)
      .values({
        kurumId: v.kurumId,
        tur: "kanit_etiketi",
        hedefTuru: "kanit",
        hedefId: v.kanitId,
        icerik: { belgeTuru: veri.belgeTuru, olcutOnerileri: veri.olcutOnerileri, sorunlar },
        gerekce: gecerli
          ? "Belge içeriğine göre önerilen ölçütler."
          : "Önerilerde atıf sorunu var; bir kişinin incelemesi gerekiyor.",
        atiflar: veri.olcutOnerileri.map((x) => ({ kanitId: v.kanitId, atif: x.atif })),
        guven,
        ureticiTuru: "yz",
        uretici: {
          gorev: kanitSiniflama.ad,
          saglayici: saglayici.ad,
          model: saglayici.model,
          istemOzeti: ozetHesapla(
            JSON.stringify(kanitSiniflama.istem({ kanit: { ozet: "", parcalar: [] }, olcutler })),
          ),
        },
        risk: gecerli ? "dusuk" : "orta",
      })
      .returning({ id: sema.oneri.id });
    if (!o) throw new Error("Öneri eklenemedi.");
    await gunlugeYaz(tx, {
      aktor: { tur: "yz", id: null },
      eylem: "oneri.uretildi",
      hedef: { tur: "oneri", id: o.id },
      ayrinti: { kanitId: v.kanitId, tur: "kanit_etiketi", gecerli },
    });
    return o.id;
  });
  await bitir({ oneriId, belgeTuru: veri.belgeTuru, oneriSayisi: veri.olcutOnerileri.length, gecerli });
}
