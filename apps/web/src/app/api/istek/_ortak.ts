// Hesapsız belge yükleme ucunun iş kuralları (İP-45). Rota dosyası yalnız bağımlılıkları kurar.
//
// Denetim sırası: köken (Origin), gövde boyutu, biçim, bal küpü ve doldurma süresi, bağlantının geçerliliği
// (dosya depoya konmadan önce), dosya türü ve boyutu, depoya koyma, kayıt. Hız sınırı ve tek kullanım
// servis katmanında, veritabanı işlemi içinde uygulanır. Jeton günlüğe yazılmaz.
//
// Ortam: AKREDIT_ISTEK_GIZLI (en az 32 bayt) bağlantı imza anahtarıdır; yoksa bağlantılar çalışmaz.

import type { NesneDeposu } from "@akredit/depo";
import { belgeIstegi, ServisHatasi } from "@akredit/servis";
import type { Vt } from "@akredit/vt";
import { agParmakIzi } from "@akredit/yetki";

/** Örnek bağlantı: sayfa gösterilir, hiçbir şey kaydedilmez (tanıtım ve erişilebilirlik denetimi için). */
export const ORNEK_JETON = "ornek";
/** Formun açılıp gönderilmesi arasında en az bu kadar süre geçmeli (bot denetimi). */
export const EN_AZ_DOLDURMA_MS = 2000;
/** Çok parçalı gövde için dosyanın üstüne tanınan pay. */
const GOVDE_PAYI = 64 * 1024;

export function istekGizlisi(env: Record<string, string | undefined> = process.env): string | null {
  const g = env.AKREDIT_ISTEK_GIZLI;
  return g && Buffer.byteLength(g) >= 32 ? g : null;
}

export interface YuklemeOrtami {
  db: Vt;
  depo: NesneDeposu | null;
  gizli: string | null;
  simdi: () => Date;
  temelAdres: string;
  izinliKokenler: string[];
  /** Ağ izini tuzlayan gizli değer. */
  tuz: string;
  uyar: (ileti: string) => void;
}

export type YuklemeYaniti = { durum: number; govde: Record<string, unknown> };

const ALINDI: YuklemeYaniti = { durum: 201, govde: { tamam: true } };
const hata = (durum: number, ileti: string): YuklemeYaniti => ({ durum, govde: { hata: ileti } });

function kokenGecerli(o: YuklemeOrtami, istek: Request): boolean {
  const koken = istek.headers.get("origin");
  if (!koken) return false;
  return koken === new URL(o.temelAdres).origin || o.izinliKokenler.includes(koken);
}

function istemciIp(istek: Request): string | null {
  // Güvenilir vekil (Coolify) `x-real-ip` yazar; `x-forwarded-for` ilk değeri istemci tarafından yazılabilir.
  return istek.headers.get("x-real-ip") ?? istek.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() ?? null;
}

const metin = (f: FormData, ad: string) => {
  const v = f.get(ad);
  return typeof v === "string" ? v : "";
};

/** Hesapsız yüklemeyi işler. */
export async function yuklemeIsle(o: YuklemeOrtami, istek: Request): Promise<YuklemeYaniti> {
  if (!kokenGecerli(o, istek)) return hata(403, "İstek bu siteden gelmedi. Sayfayı yenileyip yeniden deneyin.");
  const uzunluk = Number(istek.headers.get("content-length") ?? "0");
  if (uzunluk > belgeIstegi.EN_BUYUK_DOSYA + GOVDE_PAYI)
    return hata(413, `Dosya çok büyük. En çok ${belgeIstegi.EN_BUYUK_DOSYA / 1048576} MB yüklenebilir.`);
  let f: FormData;
  try {
    f = await istek.formData();
  } catch {
    return hata(400, "Form okunamadı. Sayfayı yenileyip yeniden deneyin.");
  }
  const jeton = metin(f, "j");
  const simdi = o.simdi();
  // Bal küpü dolu ya da form insan hızından hızlı gönderilmişse aynı yanıt döner, hiçbir şey yapılmaz.
  const acilis = Number(metin(f, "acilis"));
  if (metin(f, "webSitesi") || !Number.isFinite(acilis) || simdi.getTime() - acilis < EN_AZ_DOLDURMA_MS) return ALINDI;
  if (jeton === ORNEK_JETON) return { durum: 200, govde: { tamam: true, ornek: true } };
  if (!o.gizli || !o.depo) {
    o.uyar("Belge yükleme kapalı: AKREDIT_ISTEK_GIZLI ya da kanıt deposu tanımlı değil.");
    return hata(503, "Belge yükleme şu an kullanılamıyor. Belgeyi isteyen kişiye e-postayla gönderin.");
  }
  const dosya = f.get("dosya");
  if (!(dosya instanceof File)) return hata(400, "Yüklenecek dosyayı seçin.");
  const aciklama = metin(f, "aciklama");
  if (aciklama.length > 1000) return hata(400, "Not en çok 1000 karakter olabilir.");
  try {
    // Önce bağlantı: geçersiz bağlantıyla gelen dosya depoya hiç konmaz.
    const on = await belgeIstegi.istekOnizle(o.db, o.gizli, jeton, simdi);
    if (!on.durum.gecerli) return hata(410, on.durum.neden);
    const veri = new Uint8Array(await dosya.arrayBuffer());
    const d = belgeIstegi.dosyaDenetle(veri, dosya.name);
    if (!d.tamam) return hata(400, d.ileti);
    const { kurumId } = belgeIstegi.jetonCoz(o.gizli, jeton);
    const nesne = await o.depo.koy(kurumId, veri, { mime: d.mime });
    await belgeIstegi.istekYukle(
      o.db,
      o.gizli,
      {
        jeton,
        dosya: {
          ozet: nesne.ozet,
          depoAnahtari: nesne.anahtar,
          dosyaAdi: dosya.name,
          mime: d.mime,
          boyut: veri.byteLength,
        },
        ...(aciklama.trim() ? { aciklama } : {}),
        agIzi: agParmakIzi(istemciIp(istek), o.tuz),
      },
      simdi,
    );
    return ALINDI;
  } catch (e) {
    if (e instanceof ServisHatasi) return hata(e.durum, e.message);
    o.uyar(`Belge yüklenemedi (${e instanceof Error ? e.name : "bilinmeyen"}).`);
    return hata(500, "Belge kaydedilemedi. Biraz sonra yeniden deneyin.");
  }
}
