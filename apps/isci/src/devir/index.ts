// Sessiz devir işçisi (İP-38). Kural ve kayıt `@akredit/servis` bologna/devir* içindedir; burası yalnız zamanlar:
//   1. başlamış dönemlerde devir önerilerini açar (dönem takvimi tetikler; tekrar çalıştırmak bir şey değiştirmez),
//   2. itiraz süresi dolan düşük riskli önerilere politika dayanağıyla varsayılan onay verir,
//   3. onaylanmış taslakları, kurumun yazılı izni varsa, kaynağa yazar (izin yoksa yazıcı hiç çağrılmaz;
//      kuru çalıştırma varsayılan, gerçek yazma yalnız izinde açıksa).
// Tarayıcı ajanı (Playwright) dışarıdan verilir; giriş bilgisi yalnız yazıcının giriş adımına gider, günlüğe girmez.

import { bologna } from "@akredit/servis";
import type { Vt } from "@akredit/vt";

export interface DevirIsciAyari {
  db: Vt;
  kurumlar: () => Promise<string[]>;
  saat: () => Date;
  /** Kurumun tarayıcı ajanı; verilmezse kaynağa yazma adımı atlanır (onaylı taslaklar bekler). */
  yazici?: (kurumId: string) => bologna.DevirYazici | null;
  /** Gerçek yazmayı isteyip istemediği; kurum izninde gerçek yazma kapalıysa yine kuru çalışır. */
  gercekYazmaIste?: boolean;
  hata?: (kurumId: string, e: unknown) => void;
}

export interface DevirTuru {
  acilan: number;
  varsayilanOnay: number;
  yazilan: number;
  kuru: number;
  izinYok: number;
  hata: number;
}

export function devirIscisi(ayar: DevirIsciAyari) {
  async function kurumTuru(kurumId: string, t: DevirTuru) {
    const simdi = ayar.saat();
    t.acilan += (await bologna.devirBaslat(ayar.db, kurumId, simdi)).acilan.length;
    t.varsayilanOnay += (await bologna.varsayilanOnaylariUygula(ayar.db, kurumId, simdi)).onaylanan.length;
    const yazici = ayar.yazici?.(kurumId) ?? null;
    if (!yazici) return;
    for (const oneriId of await bologna.yazilacakDevirler(ayar.db, kurumId)) {
      const s = await bologna.devirKaynagaYaz(ayar.db, kurumId, oneriId, yazici, simdi, {
        kuru: !ayar.gercekYazmaIste,
      });
      if (s.durum === "yazildi") t.yazilan++;
      else if (s.durum === "kuru") t.kuru++;
      else if (s.durum === "izin_yok") {
        t.izinYok++;
        break; // İzin kurum düzeyinde: diğer taslaklar da yazılmaz (her biri için ayrı kayıt gerekmez).
      } else t.hata++;
    }
  }
  return {
    /** Bütün kurumlarda bir tur. Bir kurumdaki hata diğerlerini durdurmaz. */
    async tur(): Promise<DevirTuru> {
      const t: DevirTuru = { acilan: 0, varsayilanOnay: 0, yazilan: 0, kuru: 0, izinYok: 0, hata: 0 };
      for (const k of await ayar.kurumlar()) {
        try {
          await kurumTuru(k, t);
        } catch (e) {
          ayar.hata?.(k, e);
        }
      }
      return t;
    },
  };
}
