// Gelen veride kişisel veri ve giriş bilgisi denetimi. Açık sunucu kişisel veri işlemez (CLAUDE.md ilke 7): desen
// görülürse istek reddedilir, kullanıcıdan maskeleyip yeniden göndermesi istenir. Bulunan değer hiçbir yere
// yazılmaz, yalnız türü söylenir. Desenler @akredit/yz KVKK maskeleyicisinden gelir (TCKN, telefon, e-posta, IBAN,
// öğrenci numarası, unvanlı ya da yaygın adla başlayan kişi adı, adres, imza).
//
// Künye kuralı: kaynakçadaki yazar adları yayımlanmış künyedir, kişisel veri sayılmaz. Bu yüzden künye alanlarında
// (araç bunları adıyla bildirir) kişi adı deseni aranmaz; e-posta, telefon, kimlik numarası gibi öbür desenler
// yine aranır.
//
// Giriş bilgisi (ilke 8): parola, doğrulama kodu ve oturum çerezi sunucuya hiç girmez. Böyle bir desen görülürse
// çağrı reddedilir; değer yanıtta tekrarlanmaz.

import { maskele, type VeriTuru } from "@akredit/yz";

const TUR_ADI: Record<VeriTuru, string> = {
  KİŞİ: "kişi adı",
  TCKN: "T.C. kimlik numarası",
  TELEFON: "telefon numarası",
  EPOSTA: "e-posta adresi",
  IBAN: "IBAN",
  "ÖĞRENCİ-NO": "öğrenci numarası",
  ADRES: "adres",
  İMZA: "imza",
};

interface Toplanan {
  genel: string[];
  kunye: string[];
}

/** Bir girdideki bütün metinleri (anahtarlar dahil) gezer; künye alanlarındaki metinleri ayrı toplar. */
function metinler(
  deger: unknown,
  kunyeAnahtarlari: ReadonlySet<string>,
  cikti: Toplanan = { genel: [], kunye: [] },
  kunyede = false,
): Toplanan {
  if (typeof deger === "string") (kunyede ? cikti.kunye : cikti.genel).push(deger);
  else if (Array.isArray(deger)) for (const x of deger) metinler(x, kunyeAnahtarlari, cikti, kunyede);
  else if (deger !== null && typeof deger === "object")
    for (const [k, v] of Object.entries(deger)) {
      cikti.genel.push(k);
      metinler(v, kunyeAnahtarlari, cikti, kunyede || kunyeAnahtarlari.has(k));
    }
  return cikti;
}

/**
 * Girdide kişisel veri olabilecek türlerin adları (değerler değil). Boşsa temiz.
 * `kunyeAnahtarlari`: altındaki metinler künye kuralıyla (yazar adı serbest) değerlendirilen alan adları.
 */
export function kisiselVeriTurleri(girdi: unknown, kunyeAnahtarlari: readonly string[] = []): string[] {
  const turler = new Set<VeriTuru>();
  const m = metinler(girdi, new Set(kunyeAnahtarlari));
  for (const x of m.genel) for (const e of maskele(x).eslemeler) turler.add(e.tur);
  for (const x of m.kunye) for (const e of maskele(x, { kapali: ["KİŞİ"] }).eslemeler) turler.add(e.tur);
  return [...turler].map((t) => TUR_ADI[t]);
}

export function kisiselVeriIletisi(turler: readonly string[]): string {
  return `Gönderdiğiniz veride kişisel veri olabilecek ifadeler var (${turler.join(", ")}). Bu sunucu kişisel veri işlemez. Adları, numaraları ve iletişim bilgilerini maskeleyip (ör. "Öğrenci 1", "[KİŞİ-1]") yeniden gönderin.`;
}

const OTURUM_KIMLIGI =
  /\b(jsessionid|phpsessid|asp\.net_sessionid|aspsessionid\w*|sessionid|connect\.sid|laravel_session|\.aspxauth)\s*=\s*[\w%.-]{6,}/iu;

/** Giriş bilgisi desenleri: etiketli parola ya da doğrulama kodu, çerez başlığı, oturum kimliği, erişim belirteci. */
const GIRIS_DESENLERI: RegExp[] = [
  /(^|[^\p{L}])(parola|şifre|sifre|password|passwd|pwd)\s*[:=]\s*\S+/iu,
  /(doğrulama kodu|dogrulama kodu|onay kodu|tek kullanımlık kod|sms kodu|verification code|otp|2fa kodu)\s*[:=]?\s*\d{4,8}(?!\d)/iu,
  /\b(set-cookie|cookie)\s*:\s*\S+=/iu,
  OTURUM_KIMLIGI,
  /\bBearer\s+[\w.~+/-]{16,}=*/u,
];

/** Girdide giriş bilgisi var mı? Yalnız evet ya da hayır döner, değer döndürmez. */
export function girisBilgisiVar(girdi: unknown): boolean {
  const m = metinler(girdi, new Set());
  return [...m.genel, ...m.kunye].some((x) => GIRIS_DESENLERI.some((d) => d.test(x)));
}

/** Yapıştırılan sayfadan oturum kimliklerini, parola kutularını ve çerez satırlarını bellekte atar. */
export function girisBilgisiAyikla(metin: string): { metin: string; atildi: boolean } {
  let atildi = false;
  const at = () => {
    atildi = true;
    return "";
  };
  const yeni = metin
    .replace(new RegExp(OTURUM_KIMLIGI.source, "giu"), at)
    .replace(/<input\b[^>]*type\s*=\s*["']?password[^>]*>/giu, at)
    .replace(/\b(set-cookie|cookie)\s*:[^\n]*/giu, at);
  return { metin: yeni, atildi };
}

export const GIRIS_BILGISI_ILETISI =
  "Gönderdiğiniz veride parola, doğrulama kodu ya da oturum çerezi olabilecek bir ifade var. Bu bilgiler yapay zekâya ve Akredit'e hiç verilmez; yalnız OBS'nin kendi giriş ekranına siz yazarsınız. O kısmı silip yeniden gönderin. Parolanızı bir sohbete yazdıysanız OBS'de değiştirmeniz iyi olur.";
