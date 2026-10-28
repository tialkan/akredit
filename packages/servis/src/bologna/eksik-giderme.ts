// Bologna eksik giderme (İP-37): son okumanın deterministik denetim bulgularından (boş alan, AKTS/iş yükü
// uyumsuzluğu, ÇK sayısı, matris çelişkisi, eksik hafta…) dersin düzeltme taslağını üretir. Mevcut taslak
// görevi (`bologna-taslagi`) kullanılır; sonuç hocanın onay kutusuna `bologna_taslagi` önerisi olarak düşer.
//
// - Sayılar deterministik hesaptan gelir (ders kaydı, okuma); istemde "değiştirme" diye verilir, taslakta K8
//   (iş yükü = AKTS × 30) ve değerlendirme %100 denetimiyle zorlanır.
// - Başka kurumların örnekleri (dış örnek) modele HİÇ gönderilmez; öneride yalnız kaynakça olarak (adres,
//   başlık, erişim) gösterilir. Taslakta bir dış örneğin cümlesine çok benzeyen cümle varsa uyarı verilir.

import {
  type BolognaOkunanDers,
  type BolognaTaslagi,
  type BolognaVerisi,
  type Bulgu,
  bolognaDenetle,
  okunamadiMi,
} from "@akredit/cekirdek";
import { sema } from "@akredit/vt";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { disOrnekleriOku } from "../arastirma/index.ts";
import { islem, type ServisBaglami } from "../baglam.ts";
import { bulunamadi, ServisHatasi } from "../hata.ts";
import { okumalar, type TaslakSonucu, taslakUret } from "./index.ts";
import { benzerlik, KOPYA_ESIGI } from "./saf.ts";

export const EksikGidermeGirdisi = z
  .object({
    dersId: z.string().uuid("Geçersiz kimlik."),
    /** Hocanın isteğe bağlı birkaç cümlesi (kanıt olarak saklanır). */
    beyan: z.string().trim().max(4000).optional(),
  })
  .strict();

const Hesap = z.object({ ad: z.string(), deger: z.string() });
const Kaynak = z.object({ adres: z.string(), baslik: z.string(), erisim: z.string(), olcutKod: z.string() });

export const EksikGidermeSonucu = z.object({
  taslak: z.object({
    oneriId: z.string(),
    hata: z.number(),
    uyari: z.number(),
    fark: z.array(z.object({ alan: z.string(), neden: z.array(z.string()) })),
  }),
  giderilecek: z.array(z.object({ duzey: z.string(), kural: z.string(), aciklama: z.string() })),
  hesaplar: z.array(Hesap),
  /** Başka kurumdan örnekler: yalnız kaynak; kanıt değildir, metinleri kullanılmadı. */
  kaynakca: z.array(Kaynak),
});
export type EksikGidermeSonucu = z.infer<typeof EksikGidermeSonucu>;

/** Okumadaki bu derse ait denetim bulguları (bolognaDenetle; konu = ders kodu). */
export function dersBulgulari(veri: BolognaVerisi, kod: string, simdi: number): Bulgu[] {
  return bolognaDenetle(veri, { simdi }).filter((b) => b.konu === kod);
}

interface DersKaydi {
  akts: number;
  teorik: number;
  uygulama: number;
  laboratuvar: number;
}

/**
 * Deterministik hesaplar: ders kaydından ve okumadan. Hepsi elle doğrulanabilir; model bunları üretmez.
 * Ör. AKTS 5 → hedef iş yükü 5 × 30 = 150 saat.
 */
export function deterministikHesaplar(d: DersKaydi, okunan: BolognaOkunanDers | null): { ad: string; deger: string }[] {
  const h: { ad: string; deger: string }[] = [
    { ad: "AKTS (ders kaydı)", deger: String(d.akts) },
    { ad: "Hedef toplam iş yükü (AKTS × 30)", deger: `${d.akts * 30} saat` },
    { ad: "Haftalık ders süresi (T+U+L)", deger: `${d.teorik + d.uygulama + d.laboratuvar} saat` },
    { ad: "Değerlendirme katkıları toplamı (hedef)", deger: "%100" },
    { ad: "Öğrenme çıktısı sayısı (hedef)", deger: "8-12" },
    { ad: "Hafta sayısı (hedef)", deger: "14-16" },
  ];
  if (okunan && !okunan.bos) {
    const is = (okunan.isyuku ?? []).reduce((t, x) => t + (x.toplam ?? 0), 0);
    const deg = (okunan.degerlendirme ?? []).reduce((t, x) => t + (x.katki ?? 0), 0);
    h.push(
      { ad: "Okumadaki iş yükü toplamı", deger: `${is} saat` },
      { ad: "Okumadaki değerlendirme katkıları toplamı", deger: `%${deg}` },
      { ad: "Okumadaki öğrenme çıktısı sayısı", deger: String((okunan.ciktilar ?? []).length) },
      { ad: "Okumadaki hafta sayısı", deger: String(okunan.haftalar ?? 0) },
    );
  }
  return h;
}

function cumleler(metin: string): string[] {
  return metin
    .split(/(?<=[.!?])\s+|\n+|\s*\[\.\.\.\]\s*/u)
    .map((c) => c.trim())
    .filter((c) => c.split(/\s+/u).length >= 6);
}

/** Taslak metinlerinde dış örneğin alıntısına çok benzeyen cümle varsa uyarı (kopyalama yapılmamalı). */
export function disKopyaUyarilari(t: BolognaTaslagi, kaynaklar: { adres: string; alinti: string }[]): Bulgu[] {
  const alanlar: [string, string][] = [
    ["amac", t.amac.tr],
    ["icerik", t.icerik.tr],
    ["yontem", t.yontem.tr],
    ...t.ciktilar.map((c) => [`ciktilar.${c.kod}`, c.tr] as [string, string]),
    ...t.haftalar.map((h) => [`haftalar.${h.hafta}`, h.konu.tr] as [string, string]),
  ];
  const bulgular: Bulgu[] = [];
  for (const k of kaynaklar) {
    const dis = cumleler(k.alinti);
    if (!dis.length) continue;
    for (const [alan, metin] of alanlar)
      if (cumleler(metin).some((c) => dis.some((x) => benzerlik(c, x) >= KOPYA_ESIGI)))
        bulgular.push({
          duzey: "uyari",
          kural: "Kaynak",
          konu: alan,
          aciklama: `"${alan}" metni başka bir kurumun örneğine (${k.adres}) çok benziyor. Dış örnekler yalnız kaynaktır; metin kopyalanmamalı.`,
        });
  }
  return bulgular;
}

/** Dersin Bologna eksiklerini giderecek düzeltme taslağını üretir; hocanın onay kutusuna öneri olarak düşer. */
export async function eksikleriGider(b: ServisBaglami, girdi: unknown): Promise<EksikGidermeSonucu> {
  const g = EksikGidermeGirdisi.parse(girdi);
  const bag = await islem(b, async (tx, gerekli) => {
    const [d] = await tx.select().from(sema.ders).where(eq(sema.ders.id, g.dersId));
    if (!d) throw bulunamadi();
    await gerekli("olcme.veri_gir", { tur: "ders", id: d.id });
    const [okuma] = await okumalar(tx, d.programId, 1);
    if (!okuma)
      throw new ServisHatasi(
        "gecersiz_istek",
        "Bu programın Bologna sayfaları henüz okunmadı. Önce program sorumlusu okumayı başlatmalı.",
      );
    const kaynaklar = await disOrnekleriOku(tx, d.id);
    return { d, okuma, kaynaklar };
  });
  const { d, okuma } = bag;
  const ham = okuma.veri.dersler.find((x) => x.kod === d.kod) ?? null;
  const okunan = ham && !okunamadiMi(ham) ? ham : null;
  const bulgular = dersBulgulari(okuma.veri, d.kod, b.simdi().getTime());
  if (!bulgular.length && okunan)
    throw new ServisHatasi(
      "kural_ihlali",
      "Bu dersin Bologna sayfasında giderilecek eksik bulunmadı. Yeni taslak isterseniz Bologna asistanını kullanın.",
    );
  const giderilecek = bulgular.length
    ? bulgular
    : [{ duzey: "hata" as const, kural: "okuma", konu: d.kod, aciklama: "Ders sayfası okumada bulunamadı." }];
  const hesaplar = deterministikHesaplar(d, okunan);
  const kaynakca = bag.kaynaklar.map((k) => ({
    adres: k.adres,
    baslik: k.baslik,
    erisim: k.erisim,
    olcutKod: k.olcutKod,
  }));
  const s: TaslakSonucu = await taslakUret(
    b,
    { dersId: d.id, ...(g.beyan ? { beyan: g.beyan } : {}) },
    {
      giderilecek: { bulgular: giderilecek.map((x) => ({ kural: x.kural, aciklama: x.aciklama })), hesaplar },
      icerik: {
        eksikGiderme: { bulgular: giderilecek, hesaplar },
        kaynakca: kaynakca.map((k) => ({ ...k, kanitDegildir: true })),
      },
      ekBulgular: (t) => disKopyaUyarilari(t, bag.kaynaklar),
      olay: "bologna.eksik_giderme",
    },
  );
  return {
    taslak: { oneriId: s.oneriId, hata: s.denetim.hata, uyari: s.denetim.uyari, fark: s.fark },
    giderilecek: giderilecek.map((x) => ({ duzey: x.duzey, kural: x.kural, aciklama: x.aciklama })),
    hesaplar,
    kaynakca,
  };
}
