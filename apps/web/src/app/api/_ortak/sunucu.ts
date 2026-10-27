// Sunucu tarafı tekil nesneler: veritabanı, kimlik sunucusu, `/api/v1` işleyicisi. Yalnız sunucuda
// (rota işleyicileri ve sunucu bileşenleri) kullanılır.
//
// Ortam değişkenleri:
// - NEXT_PUBLIC_AKREDIT_VERI=gercek: panel gerçek veritabanıyla çalışır (yoksa örnek veri).
// - AKREDIT_VT_ADRES: PostgreSQL bağlantı adresi; yoksa AKREDIT_VT_DIZIN (PGlite, geliştirme).
// - AKREDIT_ADRES, AKREDIT_KIMLIK_GIZLI, AKREDIT_SSO: kimlik ayarı (`kimlik/ayar.ts`).
// - AKREDIT_GELISTIRME_EPOSTA=konsol: geliştirmede giriş bağlantısını sunucu konsoluna yazar (üretimde kapalı).

import { apiIsleyici, HizSiniri, vtTekrarDeposu } from "@akredit/servis";
import { gocleriUygula, pgliteBaglantisi, postgresBaglantisi, type Vt } from "@akredit/vt";
import { ortamdanAyar } from "../../../kimlik/ayar.ts";
import { type EpostaGonderici, type KimlikSunucusu, kimlikSunucusuOlustur } from "../../../kimlik/sunucu.ts";

export const gercekVeriMi = (): boolean => process.env.NEXT_PUBLIC_AKREDIT_VERI === "gercek";

function epostaGonderici(): EpostaGonderici {
  const konsol = process.env.NODE_ENV !== "production" && process.env.AKREDIT_GELISTIRME_EPOSTA === "konsol";
  return {
    async sihirliBaglanti(alici, baglanti) {
      // Bağlantı giriş bilgisidir: günlüğe ve modele girmez. Yalnız açıkça istenen geliştirme kipinde
      // geliştiricinin kendi konsoluna yazılır.
      if (konsol) {
        console.info(`[geliştirme] ${alici} için giriş bağlantısı: ${baglanti}`);
        return;
      }
      throw new Error("E-posta gönderici yapılandırılmadı (İP-14).");
    },
    async supheliGiris() {
      // Bildirim gönderici İP-14'te; şüpheli giriş günlüğe yine yazılır.
    },
  };
}

interface Tekiller {
  db: Vt;
  kimlik: KimlikSunucusu;
  api: ReturnType<typeof apiIsleyici>;
}

const kuresel = globalThis as unknown as { __akredit?: Promise<Tekiller> };

async function kur(): Promise<Tekiller> {
  const adres = process.env.AKREDIT_VT_ADRES;
  let db: Vt;
  if (adres) db = postgresBaglantisi(adres).db;
  else {
    db = (await pgliteBaglantisi(process.env.AKREDIT_VT_DIZIN)).db;
    // Geliştirme veritabanında göçler açılışta uygulanır; üretimde göç ayrı adımdır (İP-26).
    await gocleriUygula(db);
  }
  const kimlik = kimlikSunucusuOlustur({ db, ayar: ortamdanAyar(process.env), eposta: epostaGonderici() });
  const api = apiIsleyici({
    db,
    hiz: new HizSiniri({ kapasite: 120, saniyede: 4 }),
    tekrar: vtTekrarDeposu(db),
    kayitci: (e) => console.error("API beklenmeyen hata:", e instanceof Error ? e.name : "bilinmeyen"),
  });
  return { db, kimlik, api };
}

/** Süreç başına tek örnek (geliştirmede sıcak yeniden yüklemede de korunur). */
export function tekiller(): Promise<Tekiller> {
  kuresel.__akredit ??= kur().catch((e) => {
    kuresel.__akredit = undefined;
    throw e;
  });
  return kuresel.__akredit;
}
