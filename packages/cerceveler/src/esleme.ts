// Çerçeveler arası eşleme. Eşleme bir öneridir; geçerli sayılması için kişi kararı gerekir.
// @akredit/cekirdek öneri türlerinde henüz "cerceve_eslemesi" yok; küçük yerel arayüz
// tanımlandı, gerçek öneri/karar kaydına bağlantı sonraki İP'ye bırakıldı.

import { z } from "zod";
import type { Cerceve } from "./sema.ts";
import { tumOlcutler } from "./sema.ts";

const olcutRef = z.object({ cerceveKod: z.string(), cerceveSurum: z.string(), olcutKod: z.string() });
export type OlcutRef = z.infer<typeof olcutRef>;

export const eslemeOnerisiSemasi = z.object({
  id: z.string().min(1),
  kaynak: olcutRef,
  hedef: olcutRef,
  gerekce: z.string().min(1),
  uretici: z.enum(["kural", "yz", "kisi"]),
  /** Eşleme önerisi orta risklidir; politika ile değil, kişi kararıyla kesinleşir. */
  risk: z.literal("orta"),
  olusturma: z.string().min(1),
});
export type EslemeOnerisi = z.infer<typeof eslemeOnerisiSemasi>;

export const eslemeKarariSemasi = z.object({
  oneriId: z.string().min(1),
  sonuc: z.enum(["onaylandi", "reddedildi"]),
  kararVeren: z.string(),
  zaman: z.string().min(1),
});
export type EslemeKarari = z.infer<typeof eslemeKarariSemasi>;

const olcutVarMi = (cerceveler: readonly Cerceve[], r: OlcutRef) => {
  const c = cerceveler.find((x) => x.kod === r.cerceveKod && x.surum === r.cerceveSurum);
  return !!c && tumOlcutler(c.olcutler).some((o) => o.kod === r.olcutKod);
};

/** Önerinin her iki ucu da kütüphanedeki bir ölçüte işaret etmeli. */
export function eslemeOnerisiDogrula(oneri: unknown, cerceveler: readonly Cerceve[]): string[] {
  const p = eslemeOnerisiSemasi.safeParse(oneri);
  if (!p.success) return p.error.issues.map((i) => i.message);
  const hatalar: string[] = [];
  if (!olcutVarMi(cerceveler, p.data.kaynak)) hatalar.push(`Kaynak ölçüt bulunamadı: ${p.data.kaynak.olcutKod}`);
  if (!olcutVarMi(cerceveler, p.data.hedef)) hatalar.push(`Hedef ölçüt bulunamadı: ${p.data.hedef.olcutKod}`);
  if (p.data.kaynak.cerceveKod === p.data.hedef.cerceveKod) hatalar.push("Eşleme iki farklı çerçeve arasında olmalı.");
  return hatalar;
}

/** Kararın kurallara uygunluğu. Bir öneriye tek karar verilir. */
export function eslemeKarariDogrula(
  oneri: EslemeOnerisi,
  karar: EslemeKarari,
  oncekiKararlar: readonly EslemeKarari[] = [],
): string[] {
  const hatalar: string[] = [];
  if (karar.oneriId !== oneri.id) hatalar.push("Karar bu öneriye ait değil.");
  if (!karar.kararVeren.trim()) hatalar.push("Kararı kimin verdiği yazılmalı. Kararı yapay zekâ veremez.");
  if (oncekiKararlar.some((k) => k.oneriId === oneri.id))
    hatalar.push("Bu öneri için zaten karar verilmiş. Değişiklik için yeni öneri aç.");
  return hatalar;
}

/** Yalnız onaylanmış öneriler geçerli eşlemedir. */
export function gecerliEslemeler(
  oneriler: readonly EslemeOnerisi[],
  kararlar: readonly EslemeKarari[],
): EslemeOnerisi[] {
  const onayli = new Set(kararlar.filter((k) => k.sonuc === "onaylandi" && k.kararVeren.trim()).map((k) => k.oneriId));
  return oneriler.filter((o) => onayli.has(o.id));
}
