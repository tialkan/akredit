// İşçinin üretim giriş noktası: `node apps/isci/src/ana.ts`.
// Ortamı doğrular, ayrıcalıksız uygulama kullanıcısıyla PostgreSQL'e bağlanır, pg-boss'u başlatır, bütün
// kuyrukları ve zamanlanmış işleri kaydeder, `/saglik` ucunu açar ve SIGTERM'de zarifçe kapanır.
// Yapılandırma eksikse iş başlatmaz; sağlık ucu 503 ile eksikleri söyler (değerleri değil).

import { type BelirtecKasasi, belirtecKasasi, gercekBaglam, type IstemciBilgisi } from "@akredit/baglayicilar";
import { type NesneDeposu, s3Depo, yerelDepo } from "@akredit/depo";
import { sinavTarama } from "@akredit/servis";
import {
  EpostaGonderilemediHatasi,
  type EpostaTasiyici,
  gercekSaat,
  ortamdanEpostaAyari,
  smtpTasiyici,
} from "@akredit/surec";
import { postgresBaglantisi, type SorguSonucu, satirlar } from "@akredit/vt";
import type { Saglayici } from "@akredit/yz";
import { sql } from "drizzle-orm";
import { PgBoss } from "pg-boss";
import pino from "pino";
import { kurumIciSaglayici } from "../../../infra/kurum-ici/yz-ayari.ts";
import { isciKur } from "./calisma/isci.ts";
import { type SaglikRaporu, saglikSunucusu } from "./calisma/saglik.ts";
import { type Yapilandirma, yapilandirmaOku } from "./calisma/yapilandirma.ts";

const gunluk = pino({ name: "akredit-isci", redact: ["*.anahtar", "*.belirtec", "*.parola", "*.adres"] });
const ortamSonucu = yapilandirmaOku(process.env);
for (const u of ortamSonucu.uyarilar) gunluk.warn({ uyari: u }, "yapılandırma uyarısı");

let kapaniyor = false;
const kapanislar: (() => Promise<unknown>)[] = [];
let rapor: () => Promise<SaglikRaporu> = async () => ({
  saglikli: false,
  durum: "basliyor",
  hatalar: [],
  uyarilar: ortamSonucu.uyarilar,
});
const saglik = saglikSunucusu(() => rapor());
const port = await saglik.dinle(ortamSonucu.tamam ? ortamSonucu.yapilandirma.ortam.AKREDIT_ISCI_PORT : 8080);
gunluk.info({ port }, "sağlık ucu açıldı");

async function kapat(sinyal: string) {
  if (kapaniyor) return;
  kapaniyor = true;
  gunluk.info({ sinyal }, "kapanıyor: yeni iş alınmıyor, süren işler bekleniyor");
  const zorla = setTimeout(() => {
    gunluk.error({}, "zarif kapanış süresi doldu");
    process.exit(1);
  }, 45_000);
  zorla.unref();
  for (const k of kapanislar.reverse()) await k().catch((e) => gunluk.error({ hata: String(e) }, "kapanış adımı"));
  await saglik.kapat();
  gunluk.info({}, "kapandı");
  process.exit(0);
}
process.on("SIGTERM", () => void kapat("SIGTERM"));
process.on("SIGINT", () => void kapat("SIGINT"));

if (!ortamSonucu.tamam) {
  for (const h of ortamSonucu.hatalar) gunluk.error({ hata: h }, "yapılandırma eksik");
  rapor = async () => ({
    saglikli: false,
    durum: "yapilandirma_eksik",
    hatalar: ortamSonucu.hatalar,
    uyarilar: ortamSonucu.uyarilar,
  });
} else {
  await baslat(ortamSonucu.yapilandirma, ortamSonucu.uyarilar).catch((e) => {
    gunluk.error({ hata: e instanceof Error ? e.message : String(e) }, "işçi başlatılamadı");
    const ileti = e instanceof Error ? e.message : "İşçi başlatılamadı.";
    rapor = async () => ({ saglikli: false, durum: "baslatilamadi", hatalar: [ileti], uyarilar: ortamSonucu.uyarilar });
  });
}

function depoKur(y: Yapilandirma): NesneDeposu | null {
  if (!y.depo) return null;
  if (y.depo.tur === "yerel") return yerelDepo({ kok: y.depo.kok, imzaGizlisi: y.depo.imzaGizlisi });
  return s3Depo({
    ucNokta: y.depo.ucNokta,
    bolge: y.depo.bolge,
    kova: y.depo.kova,
    erisimAnahtari: y.depo.erisimAnahtari,
    gizliAnahtar: y.depo.gizliAnahtar,
    ...(y.depo.kilitGun ? { kilitGun: y.depo.kilitGun } : {}),
  });
}

/** SMTP yoksa e-postalar bekletilir (motor 15 dk sonra yeniden dener, 5 denemeden sonra bırakır). */
function bekletenTasiyici(): EpostaTasiyici {
  return {
    async gonder() {
      throw new EpostaGonderilemediHatasi("E-posta sunucusu yapılandırılmamış.");
    },
  };
}

async function baslat(y: Yapilandirma, uyarilar: string[]) {
  const o = y.ortam;
  const hatalar: string[] = [];
  const vt = postgresBaglantisi(o.AKREDIT_VT_ADRES, { max: 10, onnotice: () => {} });
  kapanislar.push(() => vt.kapat());
  const [rol] = satirlar(
    (await vt.db.execute(
      sql`select rolsuper as super, rolbypassrls as atlar from pg_roles where rolname = current_user`,
    )) as unknown as SorguSonucu<{ super: boolean; atlar: boolean }>,
  );
  if (rol?.super || rol?.atlar) {
    const ileti =
      "İşçi veritabanına süper kullanıcıyla bağlanıyor; ayrıcalıksız uygulama kullanıcısı (UYGULAMA_VT_*) kullanın.";
    if (y.uretim) throw new Error(ileti);
    uyarilar.push(ileti);
  }

  const depo = depoKur(y);
  if (!depo) throw new Error("Nesne deposu tanımlı değil; kanıt hattı çalışamaz.");

  const boss = new PgBoss({
    connectionString: o.AKREDIT_VT_ADRES,
    schema: "pgboss",
    application_name: "akredit-isci",
    max: 5,
  });
  let bossHatasi: string | null = null;
  boss.on("error", (e) => {
    bossHatasi = "İş kuyruğu hatası.";
    gunluk.error({ hata: e.message }, "pg-boss");
  });
  await boss.start();
  kapanislar.push(() => boss.stop({ graceful: true, timeout: 30_000 }));

  const ayar = ortamdanEpostaAyari(process.env);
  const eposta = ayar ? smtpTasiyici(ayar) : bekletenTasiyici();

  let kurumIci: Saglayici | null = null;
  if (o.AKREDIT_YZ_HAZIR) kurumIci = kurumIciSaglayici(o).saglayici;

  let kasa: BelirtecKasasi | null = null;
  if (y.baglayiciAnahtari) kasa = belirtecKasasi(y.baglayiciAnahtari);
  const istemciler: Partial<Record<"google" | "microsoft", IstemciBilgisi>> = {};
  if (o.AKREDIT_GOOGLE_ISTEMCI_KIMLIGI && o.AKREDIT_GOOGLE_ISTEMCI_SIRRI)
    istemciler.google = {
      istemciKimligi: o.AKREDIT_GOOGLE_ISTEMCI_KIMLIGI,
      istemciSirri: o.AKREDIT_GOOGLE_ISTEMCI_SIRRI,
    };
  if (o.AKREDIT_MICROSOFT_ISTEMCI_KIMLIGI && o.AKREDIT_MICROSOFT_ISTEMCI_SIRRI)
    istemciler.microsoft = {
      istemciKimligi: o.AKREDIT_MICROSOFT_ISTEMCI_KIMLIGI,
      istemciSirri: o.AKREDIT_MICROSOFT_ISTEMCI_SIRRI,
    };

  const isci = await isciKur({
    db: vt.db,
    boss,
    depo,
    eposta,
    saat: gercekSaat,
    // Kurum anahtarı iş anında kasadan çözülür (İP-35); kurum içi model varsa anahtarsız kurumlar onu kullanır.
    kurumFabrikasi: kurumIci ? { kurumIci } : {},
    esitleme: { dis: gercekBaglam(), kasa, istemciler },
    zamanlama: o.AKREDIT_ISCI_ZAMANLAMA === "1",
    demo: process.env.AKREDIT_DEMO === "1",
    saatDilimi: o.AKREDIT_SAAT_DILIMI,
    gunluk,
    // İP-43: sınav taraması yalnız sunucunun kurum içi modeliyle (AKREDIT_YZ_*); kurumun anahtarı okunmaz.
    sinavTarama: {
      yerelModel: sinavTarama.ortamdanYerelModel(process.env),
      takmaAdAnahtari: process.env.AKREDIT_TAKMA_AD_ANAHTARI ?? "",
    },
  });
  if (!sinavTarama.ortamdanYerelModel(process.env))
    uyarilar.push("Kurum içi model tanımlı değil; sınav taraması istekleri işlenmez (AKREDIT_YZ_*).");
  gunluk.info({ zamanlama: o.AKREDIT_ISCI_ZAMANLAMA === "1" }, "işçi çalışıyor");

  rapor = async () => {
    const h = [...hatalar];
    try {
      await Promise.race([
        vt.db.execute(sql`select 1`),
        new Promise((_, r) => setTimeout(() => r(new Error("zaman aşımı")), 3000)),
      ]);
    } catch {
      h.push("Veritabanına ulaşılamıyor.");
    }
    if (bossHatasi) h.push(bossHatasi);
    if (isci.durum.bozukZincir.length) h.push(`${isci.durum.bozukZincir.length} kurumda günlük zinciri bozuk.`);
    const saglikli = !kapaniyor && isci.durum.basladi && h.length === 0;
    return {
      saglikli,
      durum: kapaniyor ? "kapaniyor" : saglikli ? "calisiyor" : "sorunlu",
      hatalar: h,
      uyarilar,
      sonSurecTuru: isci.durum.sonTik,
    };
  };
  // Geçici kuyruk hatası kalıcı 503 yapmasın: bir dakika sonra temizlenir.
  setInterval(() => {
    bossHatasi = null;
  }, 60_000).unref();
}
