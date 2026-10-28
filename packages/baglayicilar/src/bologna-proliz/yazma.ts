// Proliz Bologna/OBS'ye geri yazma (İP-38). Proliz'in yazma API'si yok; yazma tarayıcı ajanıyla (Playwright)
// kurumun kendi hesabıyla yapılır. Bu modül iki katmandır:
//
//   1. `prolizaYaz`: tarayıcıdan bağımsız akış. Her alan için önce mevcut değeri okur, yalnız onaylı plandaki ve
//      seçicisi tanımlı alanları değiştirir, kaydeder, sayfayı yeniden açıp geri okur ve doğrular. Kuru çalıştırma
//      (varsayılan) hiçbir şey yazmaz, yalnız neyin değişeceğini raporlar.
//   2. `playwrightDuzenlemeSayfasi`: Playwright sayfasını `DuzenlemeSayfasi` arayüzüne bağlar. Giriş bilgisi
//      yalnız `girisYap` içinde forma yazılır; rapora, hata iletisine ve günlüğe girmez (ilke 8). Model bu akışta
//      yoktur.
//
// DOĞRULANMADI: Proliz'in ders düzenleme ekranı görülmedi. Varsayılan adres, giriş ve alan seçicileri kurgudur;
// kurum ilk kullanımda kendi ekranına göre seçicileri vermeli ve kuru çalıştırmayla denetlemelidir. Kullanım
// koşulları (otomatik erişim) da DOĞRULANMADI; kurumun yazılı izni olmadan servis bu modülü çağırmaz.

import { z } from "zod";

export interface KaynakYazmaAlani {
  sekme: string;
  alan: string;
  deger: string;
}

export type KaynakAlanDurumu =
  /** Kaynakta zaten aynı değer var: dokunulmadı. */
  | "ayni"
  /** Kuru çalıştırma: yazılacaktı. */
  | "yazilacak"
  /** Yazıldı, kaydedildi, geri okununca aynı. */
  | "dogrulandi"
  /** Yazıldı ama geri okunan değer farklı. */
  | "dogrulanamadi"
  /** Bu alan için seçici tanımlı değil: yazılmadı. */
  | "eslesmedi"
  /** Seçici tanımlı ama sayfada alan yok: yazılmadı. */
  | "alan_yok"
  /** Giriş bilgisi alanı: hiçbir koşulda yazılmaz. */
  | "atlandi";

export interface KaynakAlanSonucu {
  sekme: string;
  alan: string;
  durum: KaynakAlanDurumu;
  onceki: string | null;
  yeni: string;
}

export interface KaynakYazmaRaporu {
  kuru: boolean;
  alanlar: KaynakAlanSonucu[];
  kaydedildi: boolean;
  /** Hata yok ve yazılan her alan geri okunup doğrulandı. */
  tamam: boolean;
  hata: string | null;
}

/** Tarayıcıdan bağımsız düzenleme sayfası. Kaydet dışında gönderim yöntemi yoktur. */
export interface DuzenlemeSayfasi {
  ac(dersKodu: string): Promise<void>;
  sekme(ad: string): Promise<void>;
  /** Alan yoksa `null`. */
  oku(secici: string): Promise<string | null>;
  yaz(secici: string, deger: string): Promise<void>;
  kaydet(): Promise<void>;
}

// ---------- Seçiciler ----------

/** Giriş bilgisi alanları: plana hiçbir koşulda giremez (servis `GIRIS_ALANI` ile aynı). */
export const GIRIS_BILGISI_ALANI =
  /parola|şifre|sifre|password|passwd|pass\b|pwd|doğrulama kodu|dogrulama kodu|otp|captcha|token|belirteç|cerez|çerez|cookie|oturum/iu;

export const ProlizYazmaSecicileri = z
  .object({
    /** Ders düzenleme sayfası; `{kod}` ders koduyla değişir. */
    dersAdresi: z.string().min(1).max(2000),
    girisAdresi: z.string().min(1).max(2000),
    girisKullanici: z.string().min(1).max(300),
    girisParola: z.string().min(1).max(300),
    girisDugme: z.string().min(1).max(300),
    /** Girişten sonra görünen öğe (giriş başarısını anlamak için). */
    girisSonrasi: z.string().min(1).max(300),
    /** `{sekme}` sekme adıyla değişir. */
    sekme: z.string().min(1).max(300),
    kaydet: z.string().min(1).max(300),
    /** Kayıttan sonra görünen başarı iletisi. */
    kayitBasarili: z.string().min(1).max(300),
    /** `Sekme::Alan` → CSS seçicisi. Tanımsız alan yazılmaz. */
    alanlar: z.record(z.string().max(300), z.string().max(300)),
    /** `Sekme::Alan` deseni (düzenli ifade, `$1` yakalama) → seçici şablonu; ör. öğrenme çıktıları. */
    desenler: z.array(z.object({ desen: z.string().max(300), secici: z.string().max(300) })).max(50),
  })
  .strict();
export type ProlizYazmaSecicileri = z.infer<typeof ProlizYazmaSecicileri>;

/**
 * Varsayılan seçiciler. DOĞRULANMADI: gerçek Proliz düzenleme ekranından alınmadı (ASP.NET WebForms adlandırması
 * tahminidir). Kurum kendi ekranına göre değiştirmeli; kayıtlı sahte sayfa (`test/yazma/`) bu seçicilerle yazıldı.
 */
export const VARSAYILAN_PROLIZ_SECICILERI: ProlizYazmaSecicileri & { durum: "DOĞRULANMADI" } = {
  durum: "DOĞRULANMADI",
  dersAdresi: "/oibs/bologna/dersDuzenle.aspx?kod={kod}",
  girisAdresi: "/oibs/bologna/giris.aspx",
  girisKullanici: "#txtKullaniciAdi",
  girisParola: "#txtSifre",
  girisDugme: "#btnGiris",
  girisSonrasi: "#frmDersDuzenle",
  sekme: '[data-sekme="{sekme}"]',
  kaydet: "#btnKaydet",
  kayitBasarili: "#lblKayitSonucu.basarili",
  alanlar: {
    "Genel::Dersin Amacı": "#txtDersAmaci",
    "Genel::Dersin Amacı (İngilizce)": "#txtDersAmaciEn",
    "Genel::Dersin İçeriği": "#txtDersIcerigi",
    "Genel::Dersin İçeriği (İngilizce)": "#txtDersIcerigiEn",
    "Genel::Öğretim Yöntem ve Teknikleri": "#txtYontem",
    "Genel::Öğretim Yöntem ve Teknikleri (İngilizce)": "#txtYontemEn",
    "Genel::Ders Notları": "#txtDersNotlari",
    "Genel::Ders Notları (İngilizce)": "#txtDersNotlariEn",
    "Genel::Ön Koşul": "#txtOnKosul",
  },
  desenler: [
    { desen: "^Öğrenme Çıktıları::(Ö\\d+)$", secici: "#txtCikti_$1" },
    { desen: "^Öğrenme Çıktıları::(Ö\\d+) \\(İngilizce\\)$", secici: "#txtCiktiEn_$1" },
    { desen: "^Ders Akışı::(\\d+)\\. Hafta Konu$", secici: "#txtHafta$1Konu" },
    { desen: "^Ders Akışı::(\\d+)\\. Hafta Konu \\(İngilizce\\)$", secici: "#txtHafta$1KonuEn" },
  ],
};

/** Plan alanının seçicisi; tanımsızsa `null` (alan yazılmaz). */
export function alanSecicisi(s: ProlizYazmaSecicileri, a: Pick<KaynakYazmaAlani, "sekme" | "alan">): string | null {
  const anahtar = `${a.sekme}::${a.alan}`;
  const dogrudan = s.alanlar[anahtar];
  if (dogrudan) return dogrudan;
  for (const d of s.desenler) {
    const m = new RegExp(d.desen, "u").exec(anahtar);
    if (m) return d.secici.replace(/\$(\d)/gu, (_, i: string) => (m[Number(i)] ?? "").replace(/[^\p{L}\p{N}_-]/gu, ""));
  }
  return null;
}

const esit = (a: string | null, b: string) =>
  (a ?? "").replace(/\r\n/gu, "\n").trim() === b.replace(/\r\n/gu, "\n").trim();

/** Hata iletisinden adres sorgusu ve olası giriş bilgisi izleri çıkarılır. */
function temizHata(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e);
  const ilk = (m.split("\n")[0] ?? "").replace(/\?[^\s"']*/gu, "?…").slice(0, 300);
  return GIRIS_BILGISI_ALANI.test(ilk) ? "Kaynak sistemde giriş ya da sayfa hatası." : ilk;
}

// ---------- Akış ----------

/**
 * Onaylı planı düzenleme sayfasına uygular. Sıra: aç → her alan için oku, farklıysa (kuru değilse) yaz → kaydet →
 * yeniden aç → yazılan alanları geri oku. Planda olmayan alana hiçbir koşulda dokunulmaz.
 */
export async function prolizaYaz(
  sayfa: DuzenlemeSayfasi,
  is: { dersKodu: string; alanlar: readonly KaynakYazmaAlani[]; kuru: boolean },
  secici: ProlizYazmaSecicileri = VARSAYILAN_PROLIZ_SECICILERI,
): Promise<KaynakYazmaRaporu> {
  const alanlar: KaynakAlanSonucu[] = [];
  const yazilan: { i: number; secici: string; sekme: string }[] = [];
  let kaydedildi = false;
  try {
    await sayfa.ac(is.dersKodu);
    let sekme = "";
    for (const a of is.alanlar) {
      const sonuc: KaynakAlanSonucu = { sekme: a.sekme, alan: a.alan, durum: "eslesmedi", onceki: null, yeni: a.deger };
      alanlar.push(sonuc);
      if (GIRIS_BILGISI_ALANI.test(a.alan) || GIRIS_BILGISI_ALANI.test(a.sekme)) {
        sonuc.durum = "atlandi";
        continue;
      }
      const s = alanSecicisi(secici, a);
      if (!s) continue;
      if (a.sekme !== sekme) {
        await sayfa.sekme(a.sekme);
        sekme = a.sekme;
      }
      const onceki = await sayfa.oku(s);
      sonuc.onceki = onceki;
      if (onceki === null) {
        sonuc.durum = "alan_yok";
        continue;
      }
      if (esit(onceki, a.deger)) {
        sonuc.durum = "ayni";
        continue;
      }
      if (is.kuru) {
        sonuc.durum = "yazilacak";
        continue;
      }
      await sayfa.yaz(s, a.deger);
      sonuc.durum = "dogrulanamadi"; // Geri okumada doğrulanınca değişir.
      yazilan.push({ i: alanlar.length - 1, secici: s, sekme: a.sekme });
    }
    if (yazilan.length) {
      await sayfa.kaydet();
      kaydedildi = true;
      await sayfa.ac(is.dersKodu);
      sekme = "";
      for (const y of yazilan) {
        const sonuc = alanlar[y.i] as KaynakAlanSonucu;
        if (y.sekme !== sekme) {
          await sayfa.sekme(y.sekme);
          sekme = y.sekme;
        }
        if (esit(await sayfa.oku(y.secici), sonuc.yeni)) sonuc.durum = "dogrulandi";
      }
    }
    const tamam = alanlar.every((a) => a.durum !== "dogrulanamadi");
    return {
      kuru: is.kuru,
      alanlar,
      kaydedildi,
      tamam,
      hata: tamam ? null : "Bazı alanlar geri okununca farklı çıktı.",
    };
  } catch (e) {
    return { kuru: is.kuru, alanlar, kaydedildi, tamam: false, hata: temizHata(e) };
  }
}

// ---------- Playwright bağlantısı ----------

/** Playwright `Page`'in burada kullanılan kısmı (paket Playwright'a bağımlı olmasın diye yapısal). */
export interface PlaywrightSayfaBenzeri {
  goto(adres: string, secenek?: { waitUntil?: "load" | "domcontentloaded" | "networkidle" }): Promise<unknown>;
  fill(secici: string, deger: string): Promise<void>;
  click(secici: string): Promise<void>;
  inputValue(secici: string): Promise<string>;
  waitForSelector(secici: string, secenek?: { timeout?: number }): Promise<unknown>;
  locator(secici: string): { count(): Promise<number> };
}

/** Giriş bilgisi yalnız bu işlevin içinde forma yazılır; dönen değer yoktur. */
export type GirisBilgisi = () => Promise<{ kullanici: string; parola: string }>;

export function playwrightDuzenlemeSayfasi(
  sayfa: PlaywrightSayfaBenzeri,
  ayar: { tabanAdres: string; giris: GirisBilgisi; secici?: ProlizYazmaSecicileri; zamanAsimiMs?: number },
): DuzenlemeSayfasi {
  const s = ayar.secici ?? VARSAYILAN_PROLIZ_SECICILERI;
  const sure = { timeout: ayar.zamanAsimiMs ?? 15_000 };
  const adres = (yol: string) => new URL(yol, ayar.tabanAdres).toString();
  let girildi = false;
  const girisYap = async () => {
    await sayfa.goto(adres(s.girisAdresi), { waitUntil: "load" });
    const b = await ayar.giris();
    await sayfa.fill(s.girisKullanici, b.kullanici);
    await sayfa.fill(s.girisParola, b.parola);
    await sayfa.click(s.girisDugme);
    try {
      await sayfa.waitForSelector(s.girisSonrasi, sure);
    } catch {
      throw new Error("Kaynak sisteme giriş yapılamadı. Kurum hesabını ve seçicileri denetleyin.");
    }
    girildi = true;
  };
  return {
    async ac(dersKodu) {
      if (!girildi) await girisYap();
      await sayfa.goto(adres(s.dersAdresi.replace("{kod}", encodeURIComponent(dersKodu))), { waitUntil: "load" });
      try {
        await sayfa.waitForSelector(s.girisSonrasi, sure);
      } catch {
        throw new Error("Ders düzenleme sayfası açılamadı. Ders kodunu ve adres ayarını denetleyin.");
      }
    },
    async sekme(ad) {
      const sec = s.sekme.replace("{sekme}", ad.replace(/["\\]/gu, ""));
      if ((await sayfa.locator(sec).count()) > 0) await sayfa.click(sec);
    },
    async oku(secici) {
      if ((await sayfa.locator(secici).count()) === 0) return null;
      return sayfa.inputValue(secici);
    },
    async yaz(secici, deger) {
      await sayfa.fill(secici, deger);
    },
    async kaydet() {
      await sayfa.click(s.kaydet);
      try {
        await sayfa.waitForSelector(s.kayitBasarili, sure);
      } catch {
        throw new Error("Kaynak sistem kaydı onaylamadı. Sayfadaki uyarıyı denetleyin.");
      }
    },
  };
}
