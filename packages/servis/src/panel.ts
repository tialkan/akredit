// Kullanıcı, panel özeti ve günlük servisi.

import { oturumlariHesapla } from "@akredit/cekirdek";
import { sema } from "@akredit/vt";
import { desc, eq } from "drizzle-orm";
import type { z } from "zod";
import { islem, type ServisBaglami } from "./baglam.ts";
import { bulunamadi } from "./hata.ts";
import { kanitlar } from "./kanit.ts";
import { bekleyenOneriler, riskDagilimi } from "./oneri.ts";
import { surecler } from "./rapor.ts";
import { type GunlukKaydi, type Kullanici, type PanelOzeti, type Sayfa, SayfaGirdisi, sayfala } from "./semalar.ts";

export async function kullanici(b: ServisBaglami): Promise<z.infer<typeof Kullanici>> {
  return islem(b, async (tx) => {
    const [k] = await tx.select().from(sema.kisi).where(eq(sema.kisi.id, b.aktor.kisiId));
    if (!k) throw bulunamadi();
    return { id: k.id, ad: k.adSoyad, unvan: k.unvan ?? "" };
  });
}

/** Sayfalı bir listenin bütün sayfalarını toplar. */
async function hepsi<T>(al: (imlec?: string) => Promise<Sayfa<T>>): Promise<T[]> {
  const sonuc: T[] = [];
  let imlec: string | undefined;
  for (;;) {
    const s = await al(imlec);
    sonuc.push(...s.ogeler);
    if (!s.sonraki) return sonuc;
    imlec = s.sonraki;
  }
}

/**
 * Panel özeti. Harcanan süre, kişinin kararlarının zaman damgalarından `@akredit/cekirdek oturumlariHesapla`
 * ile hesaplanan etkin süredir (iki karar arası 2 saatten uzunsa yeni oturum).
 */
export async function panelOzeti(b: ServisBaglami): Promise<z.infer<typeof PanelOzeti>> {
  const bekleyen = await hepsi((imlec) => bekleyenOneriler(b, { sinir: 100, ...(imlec ? { imlec } : {}) }));
  const kanitListesi = await hepsi((imlec) => kanitlar(b, { sinir: 100, ...(imlec ? { imlec } : {}) }));
  const gorevler = await surecler(b);
  const zamanlar = await islem(b, async (tx) =>
    (
      await tx.select({ z: sema.karar.zaman }).from(sema.karar).where(eq(sema.karar.kararVerenKisiId, b.aktor.kisiId))
    ).map((x) => x.z.getTime()),
  );
  const sayac = new Map<string, number>();
  for (const k of kanitListesi) for (const o of k.olcutler) sayac.set(o, (sayac.get(o) ?? 0) + 1);
  return {
    bekleyen: riskDagilimi(bekleyen),
    yaklasanlar: gorevler.filter((g) => g.durum !== "tamam" && g.sonTarih).slice(0, 4),
    kapsama: [...sayac]
      .sort(([a], [c]) => a.localeCompare(c, "tr"))
      .map(([olcut, kanitSayisi]) => ({ olcut, kanitSayisi })),
    kararSayisi: zamanlar.length,
    harcananDakika: Math.round(oturumlariHesapla(zamanlar).etkinSaat * 60),
  };
}

/** Kurumun değiştirilemez günlüğü (en yeni önce). Yalnız kurum düzeyinde `gunluk.oku` yetkisiyle. */
export async function gunluk(b: ServisBaglami, g: SayfaGirdisi = {}): Promise<Sayfa<z.infer<typeof GunlukKaydi>>> {
  const s = SayfaGirdisi.parse(g);
  return islem(b, async (tx, gerekli) => {
    await gerekli("gunluk.oku", { tur: "kurum", id: b.aktor.kurumId });
    const satir = await tx.select().from(sema.gunluk).orderBy(desc(sema.gunluk.sira));
    return sayfala(
      satir.map((x) => ({
        sira: x.sira,
        zaman: x.zaman.toISOString(),
        aktor: { tur: x.aktorTuru, id: x.aktorId },
        eylem: x.eylem,
        hedef: x.hedefTuru && x.hedefId ? { tur: x.hedefTuru, id: x.hedefId } : null,
        ozet: x.ozet,
      })),
      { sinir: s.sinir, ...(s.imlec ? { imlec: s.imlec } : {}) },
    );
  });
}
