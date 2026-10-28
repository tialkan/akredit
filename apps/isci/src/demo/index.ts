// Demo kiracısının gece yenilemesi (İP-41). Yalnız AKREDIT_DEMO=1 iken kaydedilir ve zamanlanır.
// Yeni nesil `@akredit/ornek-veri` ile yüklenir (dış yapay zekâ çağrısı, e-posta, ağ yok); eski nesil silinmez.
// Süresi dolan demo ziyaretçi hesapları kimlik tablolarından temizlenir.

import { demoYenile, suresiDolanDemoHesaplariniSil } from "@akredit/ornek-veri/yukle";
import type { Vt } from "@akredit/vt";

export const DEMO_KUYRUGU = "demo.yenile";
/** Her gece 03:53 (kurum saat dilimi); dakika bilerek saat başı değil. */
export const DEMO_CRON = "53 3 * * *";

export interface DemoIsiSonucu {
  durum: "yuklendi" | "gerek_yok";
  neden: string;
  kurumId: string;
  silinenHesap: number;
}

export async function demoIsi(db: Vt, simdi: Date, s: { zorla?: boolean } = {}): Promise<DemoIsiSonucu> {
  const silinenHesap = await suresiDolanDemoHesaplariniSil(db, simdi);
  const y = await demoYenile(db, s.zorla ? { zorla: true } : {});
  return { ...y, silinenHesap };
}
