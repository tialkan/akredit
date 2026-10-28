// Çıkış kapısı (İP-40). Kurum dışına ya da yurt dışına giden her yapay zekâ çağrısı (sohbet, gömme, web araması)
// bu kapıdan geçer. Kural: kişisel veri çıkmaz.
//
// - Yurt dışı kip: kurum izni yoksa çağrı kurulamaz. İzin varsa metin maskelenir; maskelemeden sonra şüpheli içerik
//   kalırsa çağrı yapılmaz, `InsanIncelemesiGerekliHatasi` döner.
// - Kurum içi kip: sağlayıcı yurt içi/yerel (EVREN, vLLM, SGLang, Ollama, kurum sunucusu). Metin olduğu gibi gider,
//   yine de çıkış kaydı yazılır. Kurum içi kapıdan yurt dışı bağdaştırıcı çağrılamaz.
// - Her çağrı için çıkış kaydı: türe göre maskelenen değer sayısı (değerin kendisi yok), sağlayıcı, ülke, amaç.
//
// Bypass yok: ağ isteği yapan her bağdaştırıcı ilk iş `kapiDenetimi` çağırır. Kapı bağlamı modül içindeki bir
// AsyncLocalStorage'dadır ve yalnız bu dosyadaki işlevler kurar; paket dışına bağlam kuran bir işlev açılmaz.
import { AsyncLocalStorage } from "node:async_hooks";
import { type AracCagrisi, type Saglayici, type SohbetIstegi, YzHatasi } from "../saglayici.ts";
import {
  type MaskeSecenegi,
  maskeleyici,
  type SupheBulgusu,
  type SupheTuru,
  supheliIcerik,
  turSayilari,
  type VeriTuru,
} from "./kvkk.ts";

export type CikisKipi = "kurum_ici" | "yurt_disi";
export type CikisIslemi = "sohbet" | "gomme" | "web_arama";
export type CikisSonucu = "gonderildi" | "engellendi" | "reddedildi";

export interface SaglayiciBilgisi {
  /** Sağlayıcı kimliği (`Saglayici.ad`). */
  ad: string;
  /** Okunur ad. */
  gorunenAd: string;
  /** Verinin işlendiği ülke. Kurum sunucusunda "Kurum sunucusu". */
  ulke: string;
  /** Ülke bilgisi resmî bir kaynaktan doğrulandı mı? */
  ulkeDogrulandi: boolean;
  kip: CikisKipi;
  /** Yurt dışı aktarım güvencesi (KVKK m. 9). */
  guvence: string;
  /** Hangi işlemler için kullanılır. */
  islemler: CikisIslemi[];
}

/**
 * Bilinen sağlayıcılar. Ülkeler sağlayıcının kamuya açık şirket bilgisinden yazıldı; resmî sözleşme ya da
 * veri işleme ekiyle doğrulanmadı (`ulkeDogrulandi: false`). Envanter bu listeden üretilir.
 */
export const SAGLAYICI_KATALOGU: readonly SaglayiciBilgisi[] = [
  {
    ad: "evren",
    gorunenAd: "EVREN (yurt içi dil modeli hizmeti)",
    ulke: "Türkiye",
    ulkeDogrulandi: false,
    kip: "kurum_ici",
    guvence: "Yurt dışı aktarım yok; hizmet sağlayıcıyla veri işleme sözleşmesi gerekir.",
    islemler: ["sohbet", "gomme"],
  },
  {
    ad: "vllm",
    gorunenAd: "vLLM (kurum sunucusu)",
    ulke: "Kurum sunucusu",
    ulkeDogrulandi: true,
    kip: "kurum_ici",
    guvence: "Aktarım yok; veri kurumda kalır.",
    islemler: ["sohbet", "gomme"],
  },
  {
    ad: "sglang",
    gorunenAd: "SGLang (kurum sunucusu)",
    ulke: "Kurum sunucusu",
    ulkeDogrulandi: true,
    kip: "kurum_ici",
    guvence: "Aktarım yok; veri kurumda kalır.",
    islemler: ["sohbet", "gomme"],
  },
  {
    ad: "ollama",
    gorunenAd: "Ollama (kurum bilgisayarı)",
    ulke: "Kurum sunucusu",
    ulkeDogrulandi: true,
    kip: "kurum_ici",
    guvence: "Aktarım yok; veri kurumda kalır.",
    islemler: ["sohbet", "gomme"],
  },
  {
    ad: "openrouter",
    gorunenAd: "OpenRouter (model aracısı ve web araması)",
    ulke: "ABD",
    ulkeDogrulandi: false,
    kip: "yurt_disi",
    guvence: "Maskeli metin; kişisel veri çıkmaz. Kişisel veri aktarılacaksa standart sözleşme gerekir (K3, K4).",
    islemler: ["sohbet", "gomme", "web_arama"],
  },
  {
    ad: "anthropic",
    gorunenAd: "Anthropic",
    ulke: "ABD",
    ulkeDogrulandi: false,
    kip: "yurt_disi",
    guvence: "Maskeli metin; kişisel veri çıkmaz. Kişisel veri aktarılacaksa standart sözleşme gerekir (K3, K4).",
    islemler: ["sohbet"],
  },
  {
    ad: "openai",
    gorunenAd: "OpenAI",
    ulke: "ABD",
    ulkeDogrulandi: false,
    kip: "yurt_disi",
    guvence: "Maskeli metin; kişisel veri çıkmaz. Kişisel veri aktarılacaksa standart sözleşme gerekir (K3, K4).",
    islemler: ["sohbet", "gomme"],
  },
];

/** Sağlayıcının kataloğdaki bilgisi; bilinmiyorsa kipten türetilmiş "bilinmiyor" kaydı. */
export function saglayiciBilgisi(ad: string, yurtIci: boolean): SaglayiciBilgisi {
  const k = SAGLAYICI_KATALOGU.find((s) => s.ad === ad);
  if (k) return k;
  return {
    ad,
    gorunenAd: ad,
    ulke: yurtIci ? "Kurumun bildirdiği yurt içi sunucu" : "Bilinmiyor",
    ulkeDogrulandi: false,
    kip: yurtIci ? "kurum_ici" : "yurt_disi",
    guvence: yurtIci ? "Kurum beyanı" : "Bilinmiyor",
    islemler: ["sohbet"],
  };
}

export interface CikisKaydi {
  zaman: string;
  islem: CikisIslemi;
  kip: CikisKipi;
  saglayici: string;
  model: string;
  ulke: string;
  amac: string;
  sonuc: CikisSonucu;
  /** Türe göre maskelenen farklı değer sayısı. Değerin kendisi asla yazılmaz. */
  maskelenen: Partial<Record<VeriTuru, number>>;
  /** Maskelemeden sonra kalan şüphe türleri ve sayıları. */
  supheler: Partial<Record<SupheTuru, number>>;
}

export interface CikisAyari {
  /** Kurum, verinin (maskeli olarak) yurt dışındaki bir sağlayıcıya gitmesine izin verdi mi? */
  yurtDisiIzin: boolean;
  maske?: MaskeSecenegi;
  /** Çağrının amacı (envanterdeki işleme faaliyetiyle aynı ad). Verilmezse "belirtilmedi". */
  amac?: string;
  /** Çıkış kaydını alan işlev (günlüğe, metriğe). Hata verirse çağrı da durur. */
  kaydet?: (k: CikisKaydi) => void;
  simdi?: () => Date;
  /**
   * Yurt içi sağlayıcıyı da yurt dışı kipinde (maskeli) çalıştırmak için "yurt_disi". Kipi gevşetmek mümkün değildir:
   * yurt dışı sağlayıcı her zaman yurt dışı kipindedir.
   */
  kip?: CikisKipi;
}

/** Maskelenemeyen şüpheli içerik: çağrı yapılmadı, bir insan bakmalı. */
export class InsanIncelemesiGerekliHatasi extends YzHatasi {
  readonly supheler: SupheBulgusu[];
  constructor(supheler: SupheBulgusu[]) {
    super(
      "insan_incelemesi",
      "Metinde gizlenemeyen kişisel bilgi olabilir; bu yüzden yapay zekâya gönderilmedi. Bir yetkili metni incelesin ya da kurum içi modeli kullanın.",
    );
    this.name = "InsanIncelemesiGerekliHatasi";
    this.supheler = supheler;
  }
}

const IZIN_YOK =
  "Kurumunuz verilerin yurt dışındaki yapay zekâ hizmetlerine gönderilmesine izin vermiyor. Yurt içi bir hizmet seçin ya da kurum ayarını yöneticinizle değiştirin.";
const KAPI_YOK =
  "Yapay zekâ çağrısı kişisel veri denetiminden geçmeden yapılamaz. Yöneticinize bildirin; bu bir yazılım hatasıdır.";
const KIP_UYUSMAZ =
  "Kurum içi olarak ayarlanmış bir çağrı yurt dışındaki bir hizmete yönelemez. Yöneticinize bildirin.";

interface KapiBaglami {
  kip: CikisKipi;
}

// Modül dışına açılmaz: bağlamı yalnız bu dosyadaki kapı işlevleri kurar.
const kapiBaglami = new AsyncLocalStorage<KapiBaglami>();

/**
 * Ağ isteği yapan her bağdaştırıcı ilk iş bunu çağırır. Kapı bağlamı yoksa ya da kurum içi kapıdan yurt dışı
 * hizmete gidiliyorsa `YzHatasi("politika")` atar; istek hiç gitmez.
 */
export function kapiDenetimi(hedef: { yurtIci: boolean }): void {
  const b = kapiBaglami.getStore();
  if (!b) throw new YzHatasi("politika", KAPI_YOK);
  if (b.kip === "kurum_ici" && !hedef.yurtIci) throw new YzHatasi("politika", KIP_UYUSMAZ);
}

function kipBelirle(yurtIci: boolean, ayar: CikisAyari): CikisKipi {
  if (!yurtIci) return "yurt_disi";
  return ayar.kip ?? "kurum_ici";
}

interface KapiHedefi {
  ad: string;
  model: string;
  yurtIci: boolean;
}

/** Bir çağrı için kapı oturumu: maskeler, şüpheyi denetler, kaydı yazar, iç çağrıyı bağlam içinde yapar. */
function oturum(hedef: KapiHedefi, ayar: CikisAyari, islem: CikisIslemi) {
  const kip = kipBelirle(hedef.yurtIci, ayar);
  const bilgi = saglayiciBilgisi(hedef.ad, hedef.yurtIci);
  const m = maskeleyici(ayar.maske ?? {});
  const kayit = (sonuc: CikisSonucu, supheler: SupheBulgusu[] = []) => {
    const s: Partial<Record<SupheTuru, number>> = {};
    for (const b of supheler) s[b.tur] = b.sayi;
    ayar.kaydet?.({
      zaman: (ayar.simdi?.() ?? new Date()).toISOString(),
      islem,
      kip,
      saglayici: hedef.ad,
      model: hedef.model,
      ulke: bilgi.ulke,
      amac: ayar.amac ?? "belirtilmedi",
      sonuc,
      maskelenen: kip === "yurt_disi" ? turSayilari(m.eslemeler) : {},
      supheler: s,
    });
  };
  return {
    kip,
    /** Yurt dışı kipte maskeler; kurum içinde olduğu gibi bırakır. */
    hazirla(metin: string): string {
      return kip === "yurt_disi" ? m.maskele(metin) : metin;
    },
    geriCevir(metin: string): string {
      return kip === "yurt_disi" ? m.kaldir(metin) : metin;
    },
    /** Hazırlanan metinleri denetler; şüphe yoksa iç çağrıyı kapı bağlamında yapar. */
    async gonder<T>(hazirlanan: string[], is: () => Promise<T>): Promise<T> {
      if (kip === "yurt_disi") {
        const supheler = birlestir(hazirlanan.map(supheliIcerik));
        if (supheler.length) {
          kayit("engellendi", supheler);
          throw new InsanIncelemesiGerekliHatasi(supheler);
        }
      }
      kayit("gonderildi");
      return kapiBaglami.run({ kip }, is);
    },
  };
}

function birlestir(listeler: SupheBulgusu[][]): SupheBulgusu[] {
  const t = new Map<SupheTuru, number>();
  for (const l of listeler) for (const b of l) t.set(b.tur, (t.get(b.tur) ?? 0) + b.sayi);
  return [...t].map(([tur, sayi]) => ({ tur, sayi }));
}

function izinDenetle(hedef: KapiHedefi, ayar: CikisAyari, islem: CikisIslemi): void {
  if (hedef.yurtIci || ayar.yurtDisiIzin) return;
  const bilgi = saglayiciBilgisi(hedef.ad, hedef.yurtIci);
  ayar.kaydet?.({
    zaman: (ayar.simdi?.() ?? new Date()).toISOString(),
    islem,
    kip: "yurt_disi",
    saglayici: hedef.ad,
    model: hedef.model,
    ulke: bilgi.ulke,
    amac: ayar.amac ?? "belirtilmedi",
    sonuc: "reddedildi",
    maskelenen: {},
    supheler: {},
  });
  throw new YzHatasi("politika", IZIN_YOK);
}

/** JSON değerini metin olarak dönüştürür; `undefined` (geçersiz argüman) olduğu gibi kalır. */
function jsonDonustur(deger: unknown, f: (s: string) => string): unknown {
  if (deger === undefined) return undefined;
  return JSON.parse(f(JSON.stringify(deger)));
}

/**
 * Sağlayıcıyı çıkış kapısıyla sarar. Dönen sağlayıcının sohbet ve gömme çağrıları kapıdan geçer.
 * Yurt dışı sağlayıcıda kurum izni yoksa hemen `YzHatasi("politika")` atar.
 */
export function cikisKapisi(saglayici: Saglayici, ayar: CikisAyari): Saglayici {
  izinDenetle(saglayici, ayar, "sohbet");
  const sarili: Saglayici = {
    ad: saglayici.ad,
    model: saglayici.model,
    yurtIci: saglayici.yurtIci,
    async sohbet(istek: SohbetIstegi) {
      const o = oturum(saglayici, ayar, "sohbet");
      const cagriHazirla = (c: AracCagrisi): AracCagrisi => {
        const yeni: AracCagrisi = { ...c, argumanlar: jsonDonustur(c.argumanlar, o.hazirla) };
        if (c.ham !== undefined) yeni.ham = o.hazirla(c.ham);
        return yeni;
      };
      const mesajlar = istek.mesajlar.map((x) => {
        const y = { ...x, icerik: o.hazirla(x.icerik) };
        if (x.aracCagrilari) y.aracCagrilari = x.aracCagrilari.map(cagriHazirla);
        return y;
      });
      const giden = mesajlar.flatMap((x) => [x.icerik, ...(x.aracCagrilari ?? []).map((c) => JSON.stringify(c))]);
      const yanit = await o.gonder(giden, () => saglayici.sohbet({ ...istek, mesajlar }));
      return {
        ...yanit,
        icerik: o.geriCevir(yanit.icerik),
        aracCagrilari: yanit.aracCagrilari.map((c) => {
          const y: AracCagrisi = {
            ...c,
            argumanlar: jsonDonustur(c.argumanlar, o.geriCevir),
          };
          if (c.ham !== undefined) y.ham = o.geriCevir(c.ham);
          return y;
        }),
      };
    },
  };
  if (saglayici.yapilandirilmisCikti !== undefined) sarili.yapilandirilmisCikti = saglayici.yapilandirilmisCikti;
  const gomme = saglayici.gomme?.bind(saglayici);
  if (gomme)
    sarili.gomme = async (metinler: string[]) => {
      const o = oturum(saglayici, ayar, "gomme");
      const hazir = metinler.map((x) => o.hazirla(x));
      return o.gonder(hazir, () => gomme(hazir));
    };
  return sarili;
}

/** Web araması gibi tek metinli işlemler için kapı (web-arama modülü kullanır). Paket dışına açılmaz. */
export async function tekMetinKapisi<T>(
  hedef: KapiHedefi,
  ayar: CikisAyari,
  islem: CikisIslemi,
  metin: string,
  is: (hazir: string) => Promise<T>,
): Promise<T> {
  izinDenetle(hedef, ayar, islem);
  const o = oturum(hedef, ayar, islem);
  const hazir = o.hazirla(metin);
  return o.gonder([hazir], () => is(hazir));
}

/** Kurulumda izin denetimi (çağrı yapılmadan); web araması politikası kullanır. */
export function cikisIzniDenetle(hedef: KapiHedefi, ayar: CikisAyari, islem: CikisIslemi): void {
  izinDenetle(hedef, ayar, islem);
}
