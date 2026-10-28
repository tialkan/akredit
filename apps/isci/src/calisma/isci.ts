// İşçinin kalbi: bütün kuyrukları pg-boss'a kaydeder, zamanlanmış işleri kurar, sağlık durumunu tutar.
// Bağımlılıklar dışarıdan verilir (ana.ts üretimde gerçeklerini, testler PGlite + sahte saat/ağ verir).
//
// Kuyruklar
//   kanit.cikar | kanit.ocr | kanit.zenginlestir | kanit.sinifla   kanıt hattı (İP-10), ölü mektup `.olu`
//   baglayici.planla {tur}            (tur: bologna|avesis|yokatlas|eposta|drive|site) zamanlayıcı tetikler; bağlayıcısı açık kurumlara eşitleme işi koyar
//   baglayici.esitle {kurumId, tur}   tek kurumun tek bağlayıcısı (elle de konabilir: YÖK Atlas)
//   surec.tik {}                      bütün kurumlarda süreç motoru turu: takvim, hatırlatma, yükseltme, e-posta
//   bildirim.eposta {kurumId}         bekleyen bildirim e-postalarını hemen gönderir (web görev kapatınca koyar)
//   gunluk.dogrula {}                 bütün kurumlarda değiştirilemez günlük zincirini doğrular
//   rapor.kidr {kurumId, kisiId, girdi}  KİDR taslağı; isteyen kişinin yetkisiyle derlenir
//   bologna.devir {}                  sessiz devir (İP-38): dönem başı devir önerileri, süre dolumuyla varsayılan onay, izinliyse kaynağa yazma

import type { NesneDeposu } from "@akredit/depo";
import { aktorYukle, type FabrikaSecenegi, kidr } from "@akredit/servis";
import type { EpostaTasiyici, Saat } from "@akredit/surec";
import { type Vt, zinciriDogrula } from "@akredit/vt";
import type { Saglayici } from "@akredit/yz";
import type { PgBoss } from "pg-boss";
import { z } from "zod";
import { DEMO_CRON, DEMO_KUYRUGU, demoIsi } from "../demo/index.ts";
import { devirIscisi } from "../devir/index.ts";
import {
  type HatBaglami,
  kanitHattiniBaslat,
  type OcrMotoru,
  pgBossKuyrugu,
  type VirusTarayici,
} from "../kanit-hatti/index.ts";
import { epostalariGonder, type SurecBaglami, tik } from "../surec/index.ts";
import { baglayiciEsitle, type EsitlemeBaglami } from "./baglayici-isleri.ts";
import { BAGLAYICI_TURLERI, type BaglayiciTuru, baglayiciAyari, kurumlariListele } from "./kurumlar.ts";

export const ISCI_KUYRUK = {
  baglayiciPlanla: "baglayici.planla",
  baglayiciEsitle: "baglayici.esitle",
  surecTik: "surec.tik",
  bildirimEposta: "bildirim.eposta",
  gunlukDogrula: "gunluk.dogrula",
  raporKidr: "rapor.kidr",
  bolognaDevir: "bologna.devir",
} as const;

/**
 * Zamanlama çizelgesi (cron, kurum saat dilimi). YÖK Atlas yılda bir (yerleştirme sonuçlarından sonra),
 * ayrıca `baglayici.esitle` ile elle. Dakikalar kasıtlı olarak saat başı değildir.
 */
export const ZAMANLAMA: { kuyruk: string; anahtar: string; cron: string; veri: object }[] = [
  { kuyruk: ISCI_KUYRUK.baglayiciPlanla, anahtar: "bologna", cron: "17 3 * * 1", veri: { tur: "bologna" } },
  { kuyruk: ISCI_KUYRUK.baglayiciPlanla, anahtar: "avesis", cron: "37 3 * * 2", veri: { tur: "avesis" } },
  { kuyruk: ISCI_KUYRUK.baglayiciPlanla, anahtar: "yokatlas", cron: "47 4 15 9 *", veri: { tur: "yokatlas" } },
  { kuyruk: ISCI_KUYRUK.baglayiciPlanla, anahtar: "eposta", cron: "*/15 * * * *", veri: { tur: "eposta" } },
  { kuyruk: ISCI_KUYRUK.baglayiciPlanla, anahtar: "drive", cron: "7-59/15 * * * *", veri: { tur: "drive" } },
  // Kurum sitesi: haftada bir, gece; yalnız ayarı açık kurumlar (tarayıcı istekler arası ≥1 sn bekler).
  { kuyruk: ISCI_KUYRUK.baglayiciPlanla, anahtar: "site", cron: "41 1 * * 6", veri: { tur: "site" } },
  { kuyruk: ISCI_KUYRUK.surecTik, anahtar: "tik", cron: "*/5 * * * *", veri: {} },
  { kuyruk: ISCI_KUYRUK.gunlukDogrula, anahtar: "gunluk", cron: "23 2 * * *", veri: {} },
  // Sessiz devir: her gün sabah; dönem başlangıcını ve dolan itiraz sürelerini yakalar.
  { kuyruk: ISCI_KUYRUK.bolognaDevir, anahtar: "devir", cron: "11 5 * * *", veri: {} },
];

export interface Gunlukcu {
  info(o: object, m?: string): void;
  warn(o: object, m?: string): void;
  error(o: object, m?: string): void;
}

export interface IsciBagimliliklari {
  db: Vt;
  boss: PgBoss;
  depo: NesneDeposu;
  eposta: EpostaTasiyici;
  saat: Saat;
  kurumFabrikasi: FabrikaSecenegi;
  /** Yalnız testte: sabit sağlayıcı. */
  saglayici?: Saglayici;
  esitleme: Omit<EsitlemeBaglami, "hat">;
  ocr?: OcrMotoru;
  virus?: VirusTarayici;
  zamanlama: boolean;
  /** Sentetik demo kiracısı (İP-41): gece yenilemesi yalnız true iken kurulur. */
  demo?: boolean;
  saatDilimi: string;
  gunluk: Gunlukcu;
  /** İP-38: kurumun Proliz tarayıcı ajanı; verilmezse onaylı devir taslakları kaynağa yazılmayı bekler. */
  devirYazici?: Parameters<typeof devirIscisi>[0]["yazici"];
  /** İP-38: gerçek yazma istensin mi (kurum izninde de açık olmalı); varsayılan kuru çalıştırma. */
  devirGercekYazma?: boolean;
}

const KurumIsi = z.object({ kurumId: z.uuid() });
const PlanIsi = z.object({ tur: z.enum(BAGLAYICI_TURLERI) });
const EsitleIsi = KurumIsi.extend({ tur: z.enum(BAGLAYICI_TURLERI) });
const RaporIsi = KurumIsi.extend({ kisiId: z.uuid(), girdi: z.unknown().optional() });

export interface IsciDurumu {
  basladi: boolean;
  kapaniyor: boolean;
  sonHata: string | null;
  sonTik: string | null;
  bozukZincir: string[];
}

/** Bütün kuyrukları kaydeder ve (istenirse) zamanlamaları kurar. `boss.start()` çağrılmış olmalı. */
export async function isciKur(d: IsciBagimliliklari) {
  const durum: IsciDurumu = { basladi: false, kapaniyor: false, sonHata: null, sonTik: null, bozukZincir: [] };
  const hat: HatBaglami = {
    db: d.db,
    depo: d.depo,
    kuyruk: pgBossKuyrugu(d.boss),
    kurumFabrikasi: d.kurumFabrikasi,
    ...(d.saglayici ? { saglayici: d.saglayici } : {}),
    ...(d.ocr ? { ocr: d.ocr } : {}),
    ...(d.virus ? { virus: d.virus } : {}),
  };
  const surec: SurecBaglami = { db: d.db, saat: d.saat, eposta: d.eposta };
  const esitleme: EsitlemeBaglami = { ...d.esitleme, hat };

  await kanitHattiniBaslat(hat);

  const kayit = async <T>(
    ad: string,
    sema: { parse(v: unknown): T },
    is: (v: T) => Promise<void>,
    secenek: Parameters<PgBoss["createQueue"]>[1] = {},
  ) => {
    await d.boss.createQueue(ad, { retryLimit: 2, retryDelay: 60, retryBackoff: true, ...secenek });
    await d.boss.work(ad, async (isler) => {
      for (const j of isler) await is(sema.parse(j.data));
    });
  };

  await kayit(ISCI_KUYRUK.baglayiciPlanla, PlanIsi, async ({ tur }) => {
    let konan = 0;
    for (const kurumId of await kurumlariListele(d.db)) {
      if (!(await baglayiciAyari(d.db, kurumId, tur))) continue;
      await d.boss.send(ISCI_KUYRUK.baglayiciEsitle, { kurumId, tur }, { singletonKey: `${tur}:${kurumId}` });
      konan++;
    }
    d.gunluk.info({ tur, konan }, "bağlayıcı eşitlemeleri kuyruğa kondu");
  });

  await kayit(
    ISCI_KUYRUK.baglayiciEsitle,
    EsitleIsi,
    async ({ kurumId, tur }) => {
      const o = await baglayiciEsitle(esitleme, kurumId, tur as BaglayiciTuru);
      const kayitDuzeyi = o.durum === "hata" ? "warn" : "info";
      d.gunluk[kayitDuzeyi]({ kurumId, ...o }, "bağlayıcı eşitlemesi");
    },
    { policy: "stately", retryLimit: 1, expireInSeconds: 3600 },
  );

  await kayit(
    ISCI_KUYRUK.surecTik,
    z.object({}).passthrough(),
    async () => {
      for (const kurumId of await kurumlariListele(d.db)) {
        try {
          await tik(surec, kurumId);
        } catch (e) {
          durum.sonHata = "Süreç turu bir kurumda başarısız oldu.";
          d.gunluk.error({ kurumId, hata: e instanceof Error ? e.message : String(e) }, "süreç turu");
        }
      }
      durum.sonTik = d.saat.simdi().toISOString();
    },
    { policy: "singleton", retryLimit: 0, expireInSeconds: 900 },
  );

  await kayit(ISCI_KUYRUK.bildirimEposta, KurumIsi, async ({ kurumId }) => {
    await epostalariGonder(surec, kurumId);
  });

  await kayit(
    ISCI_KUYRUK.gunlukDogrula,
    z.object({}).passthrough(),
    async () => {
      const bozuk: string[] = [];
      for (const kurumId of await kurumlariListele(d.db)) {
        const ilk = await zinciriDogrula(d.db, kurumId);
        if (ilk) {
          bozuk.push(kurumId);
          d.gunluk.error({ kurumId, ilkBozukKayit: ilk }, "günlük zinciri bozuk");
        }
      }
      durum.bozukZincir = bozuk;
      d.gunluk.info({ bozuk: bozuk.length }, "günlük zinciri doğrulandı");
    },
    { policy: "singleton", retryLimit: 0 },
  );

  await kayit(
    ISCI_KUYRUK.raporKidr,
    RaporIsi,
    async ({ kurumId, kisiId, girdi }) => {
      const aktor = await aktorYukle(d.db, kurumId, kisiId);
      const s = await kidr.kidrDerle({ db: d.db, aktor, simdi: () => d.saat.simdi() }, girdi ?? {});
      d.gunluk.info({ kurumId, raporId: s.raporId }, "KİDR taslağı derlendi");
    },
    { retryLimit: 1 },
  );

  if (d.demo) {
    await kayit(
      DEMO_KUYRUGU,
      z.object({ zorla: z.boolean().optional() }).passthrough(),
      async ({ zorla }) => {
        const o = await demoIsi(d.db, d.saat.simdi(), zorla ? { zorla } : {});
        d.gunluk.info(o, "demo kiracısı yenilendi");
      },
      { policy: "singleton", retryLimit: 1, expireInSeconds: 3600 },
    );
    if (d.zamanlama) {
      await d.boss.schedule(DEMO_KUYRUGU, DEMO_CRON, {}, { tz: d.saatDilimi, key: "demo" });
      // Açılışta: etkin nesil yoksa hemen yüklensin.
      await d.boss.send(DEMO_KUYRUGU, {});
    }
  }
  const devir = devirIscisi({
    db: d.db,
    kurumlar: () => kurumlariListele(d.db),
    saat: () => d.saat.simdi(),
    ...(d.devirYazici ? { yazici: d.devirYazici } : {}),
    gercekYazmaIste: d.devirGercekYazma === true,
    hata: (kurumId, e) => d.gunluk.error({ kurumId, hata: e instanceof Error ? e.message : String(e) }, "sessiz devir"),
  });
  await kayit(
    ISCI_KUYRUK.bolognaDevir,
    z.object({}).passthrough(),
    async () => {
      d.gunluk.info({ ...(await devir.tur()) }, "sessiz devir turu");
    },
    { policy: "singleton", retryLimit: 0, expireInSeconds: 3600 },
  );

  if (d.zamanlama) {
    for (const z_ of ZAMANLAMA)
      await d.boss.schedule(z_.kuyruk, z_.cron, z_.veri, { tz: d.saatDilimi, key: z_.anahtar });
    // Açılışta bir süreç turu: işçi yeniden başlarken kaçan hatırlatma beklemesin.
    await d.boss.send(ISCI_KUYRUK.surecTik, {});
  }
  durum.basladi = true;
  return { durum, hat, surec, esitleme };
}
