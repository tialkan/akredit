// İş kuyruğu soyutlaması. Üretimde pg-boss (yeniden deneme + ölü mektup kuyruğu), testte aynı anlamı taşıyan
// bellek kuyruğu. Hat adımları yalnız bu arayüzü bilir.

import type { PgBoss } from "pg-boss";

export interface IsSecenegi {
  /** Aynı anahtarlı bekleyen iş varsa yenisi eklenmez. */
  tekilAnahtar?: string;
}

export type Isleyici<T> = (veri: T, deneme: number) => Promise<void>;

export interface KuyrukAyari {
  /** İlk denemeden sonra en çok kaç kez yeniden denensin. */
  yenidenDeneme: number;
  /** Yeniden denemeler arası bekleme (sn). */
  beklemeSn?: number;
  /** Her denemenin süre sınırı (sn). */
  sureSiniriSn?: number;
}

export interface Kuyruk {
  gonder<T extends object>(kuyruk: string, veri: T, secenek?: IsSecenegi): Promise<void>;
  /** İşleyiciyi bağlar. Bütün denemeler biterse iş `<kuyruk>.olu` kuyruğuna düşer ve `oluIsleyici` çağrılır. */
  isle<T extends object>(
    kuyruk: string,
    ayar: KuyrukAyari,
    isleyici: Isleyici<T>,
    oluIsleyici: (veri: T, hata: string) => Promise<void>,
  ): Promise<void>;
}

export const oluKuyrukAdi = (kuyruk: string) => `${kuyruk}.olu`;

/** Bellek kuyruğu: sıralı, belirlenimci. `bosalt()` bütün işler bitene kadar çalıştırır. */
export function bellekKuyrugu() {
  interface Bekleyen {
    kuyruk: string;
    veri: object;
    deneme: number;
    anahtar?: string;
  }
  const bekleyen: Bekleyen[] = [];
  const isleyiciler = new Map<
    string,
    { ayar: KuyrukAyari; is: Isleyici<object>; olu: (v: object, h: string) => Promise<void> }
  >();
  const olu: { kuyruk: string; veri: object; hata: string }[] = [];
  const tamamlanan: { kuyruk: string; veri: object }[] = [];
  const k: Kuyruk & {
    bosalt(): Promise<void>;
    readonly olu: typeof olu;
    readonly tamamlanan: typeof tamamlanan;
  } = {
    olu,
    tamamlanan,
    async gonder(kuyruk, veri, secenek) {
      if (secenek?.tekilAnahtar && bekleyen.some((b) => b.kuyruk === kuyruk && b.anahtar === secenek.tekilAnahtar))
        return;
      const b: Bekleyen = { kuyruk, veri: structuredClone(veri), deneme: 0 };
      if (secenek?.tekilAnahtar) b.anahtar = secenek.tekilAnahtar;
      bekleyen.push(b);
    },
    async isle(kuyruk, ayar, isleyici, oluIsleyici) {
      isleyiciler.set(kuyruk, {
        ayar,
        is: isleyici as Isleyici<object>,
        olu: oluIsleyici as (v: object, h: string) => Promise<void>,
      });
    },
    async bosalt() {
      for (let sinir = 0; bekleyen.length; sinir++) {
        if (sinir > 1_000_000) throw new Error("Kuyruk bitmiyor.");
        const b = bekleyen.shift() as Bekleyen;
        const h = isleyiciler.get(b.kuyruk);
        if (!h) throw new Error(`İşleyici yok: ${b.kuyruk}`);
        try {
          await h.is(b.veri, b.deneme);
          tamamlanan.push({ kuyruk: b.kuyruk, veri: b.veri });
        } catch (e) {
          const hata = e instanceof Error ? e.message : String(e);
          if (b.deneme < h.ayar.yenidenDeneme) bekleyen.push({ ...b, deneme: b.deneme + 1 });
          else {
            olu.push({ kuyruk: oluKuyrukAdi(b.kuyruk), veri: b.veri, hata });
            await h.olu(b.veri, hata);
          }
        }
      }
    },
  };
  return k;
}

/** pg-boss bağdaştırıcısı. Kuyruklar ölü mektup kuyruğuyla birlikte oluşturulur. */
export function pgBossKuyrugu(boss: PgBoss): Kuyruk {
  return {
    async gonder(kuyruk, veri, secenek) {
      await boss.send(kuyruk, veri, secenek?.tekilAnahtar ? { singletonKey: secenek.tekilAnahtar } : {});
    },
    async isle<T extends object>(
      kuyruk: string,
      ayar: KuyrukAyari,
      isleyici: Isleyici<T>,
      oluIsleyici: (veri: T, hata: string) => Promise<void>,
    ) {
      const olu = oluKuyrukAdi(kuyruk);
      await boss.createQueue(olu);
      await boss.createQueue(kuyruk, {
        retryLimit: ayar.yenidenDeneme,
        retryDelay: ayar.beklemeSn ?? 30,
        retryBackoff: true,
        expireInSeconds: ayar.sureSiniriSn ?? 900,
        deadLetter: olu,
      });
      await boss.work<T>(kuyruk, async (isler) => {
        for (const is of isler) await isleyici(is.data, is.retryCount ?? 0);
      });
      await boss.work<T>(olu, async (isler) => {
        for (const is of isler) {
          const cikti = (is as { output?: { message?: string } }).output;
          await oluIsleyici(is.data, cikti?.message ?? "İş tekrar tekrar başarısız oldu.");
        }
      });
    },
  };
}
