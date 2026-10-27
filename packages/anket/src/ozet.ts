// Açık uçlu yanıtların atıflı özeti (YZ). Her madde dayandığı yanıt kimliklerini [Y:kimlik] ile gösterir.
// - Yanıtlar modele gitmeden maskelenir (e-posta, telefon, kimlik no, öğrenci no) ve güvenilmeyen veri
//   olarak sarılır (ilke 5, 7).
// - Model sayı yazamaz; maddenin kaç yanıta dayandığı atıflardan deterministik sayılır (ilke 2).
// - Var olmayan yanıta atıf ya da atıfsız madde kural sorunudur; sonuç öneri olarak insan onayına düşer.

import {
  type Gorev,
  gorevCalistir,
  guvenilmeyenSar,
  KALKAN_KURALI,
  type KuralSorunu,
  maskeleyici,
  type Saglayici,
  sayilariCikar,
} from "@akredit/yz";
import { z } from "zod";

export interface AcikYanit {
  /** Yanıt satırının kimliği (anket_yaniti.id); kişiyle bağı yoktur. */
  id: string;
  metin: string;
}

export interface AcikOzetGirdisi {
  soru: string;
  yanitlar: AcikYanit[];
}

export const AcikOzetSemasi = z.object({
  maddeler: z
    .array(
      z.object({
        metin: z.string().min(1).max(500),
        yanitlar: z.array(z.string().min(4)).min(1),
      }),
    )
    .max(20),
});
export type AcikOzetCiktisi = z.infer<typeof AcikOzetSemasi>;

/** Atıflarda kullanılan kısa kimlik: son 12 onaltılık karakter (UUID v7 başı zamandır, çakışır). */
export const kisaKimlik = (id: string) => id.replace(/-/gu, "").slice(-12).toLowerCase();

function eslesen(girdi: AcikOzetGirdisi, atif: string): AcikYanit | undefined {
  const a = atif.replace(/^Y:/u, "").toLowerCase();
  return girdi.yanitlar.find((y) => kisaKimlik(y.id) === a || y.id === a);
}

export const acikOzetGorevi: Gorev<AcikOzetGirdisi, typeof AcikOzetSemasi> = {
  ad: "anket-acik-ozet",
  sema: AcikOzetSemasi,
  istem(g) {
    const m = maskeleyici();
    const govde = g.yanitlar.map((y) => `--- yanıt [Y:${kisaKimlik(y.id)}] ---\n${m.maskele(y.metin)}`).join("\n");
    return [
      {
        rol: "sistem",
        icerik: [
          "Anket açık uçlu yanıtlarını temalara göre özetle.",
          "Her madde için dayandığı yanıtların kimliklerini `yanitlar` alanına yaz (ör. Y:1a2b3c4d5e6f).",
          "Yanıtlarda olmayan bir görüş ekleme. Sayı, oran ya da yüzde yazma; sayıları sistem hesaplar.",
          KALKAN_KURALI,
        ].join("\n"),
      },
      { rol: "kullanici", icerik: `Soru: ${g.soru}\n${guvenilmeyenSar(govde, { kaynak: "anket" }).metin}` },
    ];
  },
  denetle(cikti, g) {
    const sorunlar: KuralSorunu[] = [];
    cikti.maddeler.forEach((md, i) => {
      for (const a of md.yanitlar)
        if (!eslesen(g, a)) sorunlar.push({ alan: `maddeler.${i}`, aciklama: `Var olmayan yanıta atıf: ${a}` });
      if (sayilariCikar(md.metin).length)
        sorunlar.push({ alan: `maddeler.${i}`, aciklama: "Madde metninde sayı var; sayılar yalnız hesaptan gelir." });
    });
    return sorunlar;
  },
};

export interface OzetMaddesi {
  metin: string;
  /** Dayandığı yanıtların tam kimlikleri. */
  yanitIdleri: string[];
  /** Deterministik: kaç farklı yanıta dayandığı. */
  destek: number;
}

export interface AcikOzet {
  soru: string;
  maddeler: OzetMaddesi[];
  sorunlar: KuralSorunu[];
  gecerli: boolean;
}

export async function acikYanitlariOzetle(girdi: AcikOzetGirdisi, saglayici: Saglayici): Promise<AcikOzet> {
  const bos = girdi.yanitlar.filter((y) => y.metin.trim());
  if (!bos.length) return { soru: girdi.soru, maddeler: [], sorunlar: [], gecerli: true };
  const g = { ...girdi, yanitlar: bos };
  const s = await gorevCalistir(acikOzetGorevi, g, saglayici);
  const maddeler = s.veri.maddeler.map((md) => {
    const ids = [...new Set(md.yanitlar.map((a) => eslesen(g, a)?.id).filter((x): x is string => !!x))];
    return { metin: md.metin, yanitIdleri: ids, destek: ids.length };
  });
  return { soru: girdi.soru, maddeler, sorunlar: s.sorunlar, gecerli: s.gecerli };
}
