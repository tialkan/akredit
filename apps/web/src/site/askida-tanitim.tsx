// Askıdaki sayfaların tanıtımı (ADR 0008, kurucu isteği 2026-11-12: "çalışmayan sayfa kalmasın, en azından burada ne
// hedefleniyor onun tanıtımı olsun"). Barındırma kapalıyken /kurum-ac, /kurulum, /pilot, /giris, /davet ve
// /kurum-demosu bu bileşenle, hizmet açılınca o sayfada ne yapılacağını anlatır. Askı notu ve sponsor çağrısı
// sayfalarda PlatformDurumu ile ayrıca durur.
//
// İçerik yalnız depoda yazılı ve kodu olan özelliklerden alınır, sayı ve kurum adı yazılmaz. Dayanaklar:
// kurum-ac ve kurulum: icerik.ts KURUM_ACILIS_ADIMLARI, kimlik/kurum-acilisi.ts, app/kurulum (İP-35);
// pilot: app/(site)/pilot/page.tsx "Pilotta ne olur", İP-30; giris: app/(site)/giris (parolasız bağlantı, tek oturum),
// kimlik/; davet: app/(site)/davet, kimlik/yonetim.ts davetKabulEt; kurum-demosu: demo/roller.ts, İP-41.

import Link from "next/link";
import { GORSELLER, Gorsel, type GorselBilgisi } from "./gorsel.tsx";

export interface AskidaTanitimIcerigi {
  /** "Hizmet açılınca burada…" maddeleri (2-4). */
  maddeler: string[];
  /** Kimin işine yarayacağı, tek cümle. */
  kimin: string;
  gorsel: GorselBilgisi;
}

export const ASKIDA_TANITIMLARI = {
  kurumAc: {
    gorsel: GORSELLER.kurumPlatformu,
    maddeler: [
      "Kurumunuzu kurumsal e-postanızla açarsınız. E-postanıza gelen bağlantıyla kurum ve yönetici hesabı oluşur.",
      "Programın Bologna sayfasının adresini yapıştırırsınız. Program çıktıları ve dersler öneri olarak gelir, siz onaylayınca kaydedilir.",
      "Dersi verenlerin adları öneri olarak gelir. E-posta adreslerini siz yazarsınız, hocalara davet gider.",
      "Kurumun izleyeceği çerçeveyi seçersiniz. Kanıtlar, kararlar ve raporlar kurumunuzun panelinde toplanır.",
    ],
    kimin: "Kalite birimi ve kurum yöneticisi için. Hocalar yalnız davet e-postasını açar.",
  },
  kurulum: {
    gorsel: GORSELLER.kurumPlatformu,
    maddeler: [
      "Kurum yöneticisi kurumu adım adım hazırlar. Her adım ayrı kaydedilir, istenen adıma dönülür.",
      "Yapay zekâ anahtarı girilir. Verinin yurt dışına gidip gitmeyeceği kararı adla imzalanır ve günlüğe yazılır.",
      "Programlar Bologna sayfasından öneri olarak gelir, hocalara davet gönderilir.",
    ],
    kimin: "Kalite birimi ve kurum yöneticisi için. Hocalara yalnız davet e-postası gider.",
  },
  pilot: {
    gorsel: GORSELLER.pilot,
    maddeler: [
      "Kurumunuz bir birim ve bir süreçle başlar. Örneğin bir programın Bologna sayfaları ya da ders dosyaları.",
      "Hocaların onay ekranında geçirdiği süre ölçülür, önceki dönemle karşılaştırılır. Sonuç kurumla paylaşılır.",
      "Öğrenci numarası takma ada çevrilir. Kişisel veri, kurum izin vermedikçe yurt dışına gitmez.",
    ],
    kimin: "Hocalarının kalite işine ayırdığı süreyi azaltmak isteyen kalite birimleri için.",
  },
  giris: {
    gorsel: GORSELLER.giris,
    maddeler: [
      "Parola yoktur. Kurumsal e-postanıza tek kullanımlık bir giriş bağlantısı gelir ya da kurumunuzun tek oturum sistemiyle girersiniz.",
      "Hoca, kendisine gelen önerileri görür ve onaylar ya da düzeltir. Onay adınız ve zamanıyla kaydedilir.",
      "Kalite birimi kanıtları, kararları ve göstergeleri tek yerden izler.",
    ],
    kimin: "Kurumu açılmış hocalar ve kalite birimi için. Giriş bilgileriniz yapay zekâya gösterilmez.",
  },
  davet: {
    gorsel: GORSELLER.giris,
    maddeler: [
      "Kalite birimi size bir davet e-postası gönderir. Bağlantıyı açıp kuruma katılırsınız.",
      "Hesap kurmanız, parola belirlemeniz gerekmez. Sonraki girişler e-postanıza gelen bağlantıyla olur.",
      "Katıldıktan sonra yalnız size gelen önerileri onaylarsınız.",
    ],
    kimin: "Kurumu tarafından davet edilen hocalar için.",
  },
  kurumDemosu: {
    gorsel: GORSELLER.kurumDemosu,
    maddeler: [
      "Sentetik bir örnek üniversitede rol seçip kurum platformunu kurulumsuz denersiniz.",
      "Kanıt deposu, onay günlüğü, ÇK/PÇ göstergeleri ve raporlar örnek veriyle açılır.",
      "Öğretim elemanı, bölüm başkanı, kalite komisyonu, rektörlük ve dış değerlendirici gözüyle bakabilirsiniz.",
    ],
    kimin: "Platformu kurmadan önce görmek isteyen hocalar ve kalite birimleri için.",
  },
} as const satisfies Record<string, AskidaTanitimIcerigi>;

export type AskidaSayfa = keyof typeof ASKIDA_TANITIMLARI;

const BAG = "inline-flex min-h-11 items-center font-semibold text-vurgu underline underline-offset-4";

export function AskidaTanitim({ sayfa, baslikId = "askida-tanitim" }: { sayfa: AskidaSayfa; baslikId?: string }) {
  const t: AskidaTanitimIcerigi = ASKIDA_TANITIMLARI[sayfa];
  return (
    <section
      aria-labelledby={baslikId}
      data-askida-tanitim={sayfa}
      className="overflow-hidden rounded-sm border border-cizgi bg-yuzey"
    >
      <Gorsel gorsel={t.gorsel} alt="" boyutlar="(min-width: 768px) 48rem, 100vw" />
      <div className="p-5 sm:p-6">
        <h2 id={baslikId} className="text-xl font-semibold text-metin">
          Hizmet açılınca burada
        </h2>
        <ul className="mt-3 grid list-disc gap-2 pl-5">
          {t.maddeler.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
        <p className="mt-4">
          <span className="font-semibold">Kimin işine yarar: </span>
          {t.kimin}
        </p>
        <p className="mt-4">Şu an kullanabilecekleriniz:</p>
        <p className="mt-1 flex flex-wrap gap-x-6 gap-y-1">
          <Link href="/mcp-kullan" className={BAG}>
            Kendi yapay zekânıza eklenen ücretsiz araçlar
          </Link>
          <Link href="/deneyin" className={BAG}>
            Tarayıcıda deneyin
          </Link>
        </p>
      </div>
    </section>
  );
}
