// Web sunucusunun dış bağlantıları (İP-37): kanıt nesne deposu, kurum sitesi tarayıcısı ve belgeden metin.
// `@akredit/servis` bu parçaları köprü olarak bekler (`arastirmaKoprusuAyarla`, `bolognaKoprusuAyarla`);
// bağlanmazsa ilgili uç ne yapılacağını söyleyen 400 verir. Burada gerçek bileşenlerle kurulur.
//
// Ortam (işçiyle aynı adlar, `apps/isci/src/calisma/yapilandirma.ts`):
// - S3_UC_NOKTASI, S3_BOLGE, S3_KOVA, S3_ERISIM_ANAHTARI, S3_GIZLI_ANAHTAR, S3_KILIT_GUN: S3 nesne deposu.
// - ya da AKREDIT_DEPO_DIZINI + AKREDIT_DEPO_IMZA_GIZLISI (≥32 karakter): yerel dizin (Coolify: `akredit-kanit`
//   birimi, işçiyle ortak).
// Üretimde depo tanımsız ya da eksikse sunucu açılmaz ve hata hangi değişkenin eksik olduğunu söyler (değerini
// yazmaz). Geliştirmede depo yoksa köprüler kurulmaz ve bir kez Türkçe uyarı yazılır.

import { gercekBaglam, siteTara } from "@akredit/baglayicilar";
import { metinCikar, parcala } from "@akredit/belge";
import { type NesneDeposu, s3Depo, yerelDepo } from "@akredit/depo";
import { arastirma, bologna } from "@akredit/servis";

type Ortam = Record<string, string | undefined>;

export class KopruYapilandirmaHatasi extends Error {}

const dolu = (v: string | undefined) => (v && v.trim() ? v.trim() : undefined);

/** Ortamdan nesne deposunu kurar. Hiç tanım yoksa `null`; yarım ya da hatalı tanımda açık Türkçe hata. */
export function ortamdanDepo(o: Ortam): NesneDeposu | null {
  const s3 = {
    ucNokta: dolu(o.S3_UC_NOKTASI),
    kova: dolu(o.S3_KOVA),
    erisim: dolu(o.S3_ERISIM_ANAHTARI),
    gizli: dolu(o.S3_GIZLI_ANAHTAR),
  };
  if (s3.ucNokta) {
    const eksik = Object.entries({
      S3_KOVA: s3.kova,
      S3_ERISIM_ANAHTARI: s3.erisim,
      S3_GIZLI_ANAHTAR: s3.gizli,
    })
      .filter(([, v]) => !v)
      .map(([k]) => k);
    if (eksik.length)
      throw new KopruYapilandirmaHatasi(
        `Kanıt deposu eksik tanımlı: S3_UC_NOKTASI verildi ama ${eksik.join(", ")} tanımlı değil.`,
      );
    const kilit = Number(dolu(o.S3_KILIT_GUN) ?? 0);
    return s3Depo({
      ucNokta: s3.ucNokta,
      bolge: dolu(o.S3_BOLGE) ?? "us-east-1",
      kova: s3.kova as string,
      erisimAnahtari: s3.erisim as string,
      gizliAnahtar: s3.gizli as string,
      ...(Number.isInteger(kilit) && kilit > 0 ? { kilitGun: kilit } : {}),
    });
  }
  const dizin = dolu(o.AKREDIT_DEPO_DIZINI);
  if (dizin) {
    const imza = dolu(o.AKREDIT_DEPO_IMZA_GIZLISI);
    if (!imza || imza.length < 32)
      throw new KopruYapilandirmaHatasi(
        "Kanıt deposu eksik tanımlı: AKREDIT_DEPO_IMZA_GIZLISI en az 32 karakter olmalı (AKREDIT_DEPO_DIZINI ile).",
      );
    return yerelDepo({ kok: dizin, imzaGizlisi: imza });
  }
  return null;
}

/** Tarayıcıyı servis köprüsünün beklediği biçime çevirir. Sayfa metni modele gitmez. */
export function tarayiciKur(baglam = gercekBaglam()) {
  return async (a: { baslangic: string; alanAdi: string; derinlik: number; enCokSayfa: number }) => {
    const r = await siteTara(baglam, a);
    const belgeler: arastirma.TaranmisBelgeGirdisi[] = r.belgeler.map((b) => ({
      veri: b.veri,
      dosyaAdi: b.dosyaAdi,
      ...(b.mime ? { mime: b.mime } : {}),
      adres: b.adres,
      erisim: b.erisim,
      ozet: b.ozet,
      kaynakAyrinti: b.kaynakAyrinti,
    }));
    return { belgeler, atlanan: r.atlanan.map((x) => ({ adres: x.adres, neden: x.neden })) };
  };
}

/** Belgeden çapalı metin parçaları (`@akredit/belge`). Okunamayan belge boş liste verir. */
export async function metinParcalari(veri: Uint8Array, ad: string) {
  const belge = await metinCikar(veri, { ad });
  return parcala(belge).map((p) => ({ capa: p.capa as unknown as Record<string, unknown>, metin: p.metin }));
}

export type KopruDurumu = { kuruldu: true } | { kuruldu: false; neden: string };

/** Köprüleri kurar. Üretimde depo yoksa ya da hatalıysa fırlatır; geliştirmede kurmadan nedenini döndürür. */
export function kopruleriKur(o: Ortam = process.env): KopruDurumu {
  const uretim = o.NODE_ENV === "production";
  let depo: NesneDeposu | null;
  try {
    depo = ortamdanDepo(o);
  } catch (e) {
    if (uretim) throw e;
    return { kuruldu: false, neden: (e as Error).message };
  }
  if (!depo) {
    const neden =
      "Kanıt deposu tanımlı değil: S3_UC_NOKTASI, S3_KOVA, S3_ERISIM_ANAHTARI, S3_GIZLI_ANAHTAR ya da AKREDIT_DEPO_DIZINI ve AKREDIT_DEPO_IMZA_GIZLISI verin.";
    if (uretim) throw new KopruYapilandirmaHatasi(neden);
    return { kuruldu: false, neden };
  }
  arastirma.arastirmaKoprusuAyarla({ tara: tarayiciKur(), metin: metinParcalari, depo });
  bologna.bolognaKoprusuAyarla({ depo });
  return { kuruldu: true };
}
