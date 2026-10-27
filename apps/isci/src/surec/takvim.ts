// Akademik takvim içe aktarma (kurum ayarına yazar) ve .ics takvim çıktısı (açık görevlerin son
// tarihleri ve kurum takvimi).

import { akademikTakvimEsle, icsUret, SurecTanimi, surecAyariOku, type TakvimOlayi } from "@akredit/surec";
import { gunlugeYaz, kiraciIslemi, sema } from "@akredit/vt";
import { and, eq } from "drizzle-orm";
import { type Aktor, type SurecBaglami, SurecHatasi } from "./motor.ts";

/**
 * .ics akademik takvimini eşleşmeye göre kurum takvimine yazar. Çatışan anahtarlar yazılmaz,
 * eskisi korunur; kullanıcıya gösterilir. Yalnız değişen anahtarlar günlüğe girer.
 */
export async function akademikTakvimIceAktar(
  b: SurecBaglami,
  kurumId: string,
  ics: string,
  eslesme: unknown,
  aktor: Aktor,
) {
  const sonuc = akademikTakvimEsle(ics, eslesme);
  await kiraciIslemi(b.db, kurumId, async (tx) => {
    const [k] = await tx.select({ a: sema.kurum.ayarlar }).from(sema.kurum).where(eq(sema.kurum.id, kurumId));
    if (!k) throw new SurecHatasi("Kurum bulunamadı.");
    const ham = (k.a ?? {}) as Record<string, unknown>;
    const surec = { ...((ham.surec as Record<string, unknown>) ?? {}) };
    const eski = surecAyariOku(ham).takvim;
    const yeni = { ...eski, ...sonuc.takvim };
    surec.takvim = yeni;
    surecAyariOku({ surec }); // yazmadan önce doğrula
    await tx
      .update(sema.kurum)
      .set({ ayarlar: { ...ham, surec } })
      .where(eq(sema.kurum.id, kurumId));
    const degisen = Object.keys(sonuc.takvim).filter((a) => eski[a] !== sonuc.takvim[a]);
    await gunlugeYaz(tx, {
      aktor,
      eylem: "surec.takvim_ice_aktarildi",
      hedef: { tur: "kurum", id: kurumId },
      ayrinti: {
        degisen: Object.fromEntries(degisen.map((a) => [a, { eski: eski[a] ?? null, yeni: sonuc.takvim[a] ?? null }])),
        catisan: sonuc.catisan.map((c) => c.anahtar),
      },
      zaman: b.saat.simdi(),
    });
  });
  return sonuc;
}

/**
 * Takvim çıktısı: açık görevlerin son tarihleri (kişiye süzülebilir) ve kurum takvimindeki tarihler.
 * UID kalıcıdır, böylece abone olan istemci olayları güncelleyebilir.
 */
export async function takvimDisaAktar(b: SurecBaglami, kurumId: string, secenek: { kisiId?: string } = {}) {
  return kiraciIslemi(b.db, kurumId, async (tx) => {
    const [k] = await tx
      .select({ a: sema.kurum.ayarlar, ad: sema.kurum.ad })
      .from(sema.kurum)
      .where(eq(sema.kurum.id, kurumId));
    if (!k) throw new SurecHatasi("Kurum bulunamadı.");
    const ayar = surecAyariOku(k.a);
    const gorevler = await tx
      .select({ id: sema.gorev.id, baslik: sema.gorev.baslik, ayrinti: sema.gorev.ayrinti, tarih: sema.sonTarih.tarih })
      .from(sema.gorev)
      .innerJoin(sema.sonTarih, eq(sema.sonTarih.gorevId, sema.gorev.id))
      .where(
        and(eq(sema.gorev.durum, "acik"), secenek.kisiId ? eq(sema.gorev.atananKisiId, secenek.kisiId) : undefined),
      );
    const olaylar: TakvimOlayi[] = gorevler.map((g) => ({
      uid: `gorev-${g.id}`,
      baslik: `Son tarih: ${g.baslik}`,
      ...((g.ayrinti as { aciklama?: string }).aciklama
        ? { aciklama: (g.ayrinti as { aciklama: string }).aciklama }
        : {}),
      baslangic: g.tarih,
      bitis: g.tarih,
      alarmGunOnce: [1],
    }));
    // Kurum takvimi: anahtarın adı, tanımlardaki adlardan.
    const adlar: Record<string, string> = {};
    for (const t of await tx.select({ tanim: sema.surecTanimi.tanim }).from(sema.surecTanimi)) {
      const p = SurecTanimi.safeParse(t.tanim);
      if (p.success) Object.assign(adlar, p.data.takvimAnahtarlari);
    }
    if (!secenek.kisiId)
      for (const [anahtar, tarih] of Object.entries(ayar.takvim).sort())
        olaylar.push({ uid: `takvim-${kurumId}-${anahtar}`, baslik: adlar[anahtar] ?? anahtar, tarih });
    return icsUret(olaylar, { ad: `${k.ad} kalite takvimi`, damga: b.saat.simdi() });
  });
}
