import type { Metadata } from "next";
import Link from "next/link";
import { Bolum, Dayanak, Dayanaklar, Metin, SayfaBasi, YapisalVeri } from "../../../site/bilesenler.tsx";
import { SAYFALAR } from "../../../site/icerik.ts";
import { sayfaUstVerisi } from "../../../site/yapisal.ts";

export const metadata: Metadata = sayfaUstVerisi(SAYFALAR.yz);

const DAYANAKLAR = [
  "Kurulum sihirbazının ilk adımı anahtardır: apps/web/src/app/kurulum/sihirbaz.tsx; docs/raporlar/IP-35.md.",
  "Bütün yapay zekâ işleri kurum anahtarıyla, iş anında kasadan çözülerek yapılır: packages/servis/src/yz-fabrika.ts.",
  "Şifreleme ve kuruma özgü anahtar türetme: packages/yz/src/anahtar-kasasi.ts.",
  "Yalnız son dört karakter, model, kaydeden ve tarih gösterilir: apps/web/src/app/panel/ayarlar/yz-anahtari.tsx.",
  "Model boşsa openrouter/auto: packages/servis/src/politika.ts (VARSAYILAN_OPENROUTER_MODELI).",
  "Anahtar yoksa iş durur, bildirim yalnız kurum yöneticisine ve 24 saatte bir gider: docs/raporlar/IP-35.md.",
  "Yurt dışı izni yoksa çağrı reddedilir, izin varsa maskeleme zorunludur: packages/yz/src/guvence/politika.ts ve kvkk.ts.",
  "Kurum içi model ve yurt dışı izninin kapalı kalması: infra/kurum-ici/yz-ayari.ts.",
  "Web araması, parametre adları ve fiyat OpenRouter belgesinden (openrouter.ai/docs/guides/features/server-tools/web-search, 28 Ekim 2026): packages/yz/src/web-arama/index.ts; docs/raporlar/IP-37.md.",
  "Başka kurum örneğinin kanıt sayılamaması: packages/vt/src/gocler/0011_dis_ornek.sql ve packages/servis/src/arastirma/index.ts.",
];

const ADIMLAR: { baslik: string; metin: string }[] = [
  {
    baslik: "Kurum adına hesap açın",
    metin:
      "openrouter.ai adresinde bir hesap açın. Kişisel e-postanızı değil, kurumun ortak bir adresini kullanın. Görevi devrettiğinizde hesap kurumda kalır.",
  },
  {
    baslik: "Kredi yükleyin",
    metin:
      "Hesaba ön ödemeli kredi yükleyin. Kullanım bu krediden düşer. Fatura ve ödeme OpenRouter ile kurum arasındadır.",
  },
  {
    baslik: "Anahtar oluşturun",
    metin:
      "Hesabın anahtar (API keys) bölümünde yeni bir anahtar oluşturun. Anahtara tanınır bir ad verin, örneğin kurumun kısa adı ve Akredit.",
  },
  {
    baslik: "Harcama sınırı koyun",
    metin:
      "Anahtar için bir kredi sınırı yazın. Sınır, beklenmedik bir kullanımın bütçeyi aşmasını önler. Başlangıç için küçük bir tutar seçip kullanımı izleyin.",
  },
  {
    baslik: "Anahtarı kopyalayın",
    metin:
      "OpenRouter anahtarın tamamını yalnız oluşturulduğu anda gösterir. Kopyalayın, bir yere yazmadan Akredit'e yapıştırın.",
  },
  {
    baslik: "Akredit'e girin",
    metin:
      "Kurulum sihirbazının ilk adımına ya da Panel, Ayarlar, Yapay zekâ hizmeti bölümüne yapıştırıp kaydedin. Model alanını boş bırakabilirsiniz.",
  },
  {
    baslik: "Bağlantıyı deneyin",
    metin: "Bağlantıyı dene düğmesine basın. Sonuç aynı ekranda yazar. İstekte kurum verisi yoktur.",
  },
];

export default function YapayZeka() {
  return (
    <>
      <YapisalVeri sayfa={SAYFALAR.yz} />
      <SayfaBasi
        sayfa={SAYFALAR.yz}
        ozet="Akredit ilk etapta ücretsizdir. Yapay zekâ için kurum yöneticisi kurumun OpenRouter anahtarını bir kez girer. Kurumdaki herkes bu anahtarla çalışır, ücret kurumun OpenRouter hesabına yansır."
      />
      <Bolum no={1} id="ozet" baslik="Kısaca" not="Altı soru, altı cevap.">
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-[13rem_1fr]">
          <dt className="font-semibold">Anahtarı kim girer?</dt>
          <dd>
            Kurum yöneticisi, bir kez. Kurulum sihirbazının ilk adımıdır.
            <Dayanak n={1} />
          </dd>
          <dt className="font-semibold">Kim kullanır?</dt>
          <dd>
            Kurumdaki herkes. Hocaların ayrı anahtar alması gerekmez.
            <Dayanak n={2} />
          </dd>
          <dt className="font-semibold">Ücreti kim öder?</dt>
          <dd>Kurum. Kullanım kurumun OpenRouter kredisinden düşer. Akredit ücret almaz.</dd>
          <dt className="font-semibold">Nasıl saklanır?</dt>
          <dd>
            Sunucuda şifreli. Ekranda yalnız son dört karakteri görünür.
            <Dayanak n={3} />
            <Dayanak n={4} />
          </dd>
          <dt className="font-semibold">Hangi model?</dt>
          <dd>
            Siz seçersiniz. Alan boşsa openrouter/auto kullanılır; OpenRouter isteğe uygun modeli kendisi seçer.
            <Dayanak n={5} />
          </dd>
          <dt className="font-semibold">Anahtar yoksa?</dt>
          <dd>
            Yapay zekâ işi başlamaz, sessizce de geçilmez. Kurum yöneticisine günde en çok bir bildirim düşer.
            <Dayanak n={6} />
          </dd>
        </dl>
      </Bolum>

      <Bolum
        no={2}
        id="anahtar-alma"
        baslik="OpenRouter anahtarı alın"
        not="OpenRouter ekranlarının adı değişebilir; adımların özü aynı kalır."
        zemin
      >
        <ol className="border-b border-cizgi">
          {ADIMLAR.map((a, i) => (
            <li key={a.baslik} className="grid grid-cols-[2.5rem_1fr] gap-2 border-t border-cizgi py-4">
              <span className="paragraf-no text-xl">{i + 1}</span>
              <div>
                <p className="font-semibold">{a.baslik}</p>
                <p className="mt-1 text-soluk">{a.metin}</p>
              </div>
            </li>
          ))}
        </ol>
      </Bolum>

      <Bolum no={3} id="neden" baslik="Neden kendi anahtarınız" not="Maliyet ve denetim kurumda kalır.">
        <Metin>
          <p>
            Akredit bir yapay zekâ hizmeti satmaz. Taslak yazma ve belge sınıflama gibi işler için kurum kendi seçtiği
            hizmeti kullanır. Ne kadar harcandığını kurum kendi hesabında görür ve sınırını kendisi koyar.
          </p>
          <p>
            OpenRouter, tek anahtarla birçok modele erişim sağlayan bir aracı hizmettir. İlk etapta desteklenen hizmet
            budur. Yapay zekâ katmanı sağlayıcıdan bağımsız yazıldı: EVREN, OpenAI uyumlu kurum sunucuları ve yerel
            modeller ileride aynı ayardan seçilebilecek.
          </p>
        </Metin>
      </Bolum>

      <Bolum no={4} id="saklama" baslik="Anahtar nasıl saklanır" not="Koddaki akış, olduğu gibi." zemin>
        <Metin>
          <ul>
            <li>
              Anahtarı yalnız <strong>kurum yöneticisi</strong> girebilir. Ayar yetkisi olmayan kişi bu ekranı
              değiştiremez.
            </li>
            <li>
              Anahtar sunucuda AES-256-GCM ile şifrelenir. Şifreleme anahtarı, sunucudaki ana anahtardan kuruma özgü
              olarak türetilir. Bir kurumun şifreli anahtarı başka bir kurumun kaydına taşınsa açılmaz.
            </li>
            <li>
              Düz hâli veritabanına yazılmaz. Sunucuda ana anahtar ayarlı değilse kayıt açık bir hatayla reddedilir.
            </li>
            <li>
              Anahtar hiçbir yanıtla tarayıcıya geri gönderilmez. Ekranda son dört karakteri, model, kaydedenin adı ve
              tarih görünür.
            </li>
            <li>
              Kaydetme ve kaldırma değiştirilemez günlüğe yazılır. Günlükte, iş kayıtlarında ve hata iletilerinde
              anahtarın kendisi ya da bir parçası yoktur.
            </li>
            <li>Yeni anahtar eskisinin yerine geçer. Anahtar ekrandan kaldırılabilir.</li>
          </ul>
        </Metin>
      </Bolum>

      <Bolum no={5} id="veri" baslik="Modele giden veriyi sınırlayın" not="İşin gerektirdiği en az veri.">
        <Metin>
          <ul>
            <li>
              Belge parçaları: ilgili ölçütü önermek ya da taslağa atıf vermek için gereken bölüm. Metin modele veri
              olarak etiketlenip gider; içindeki cümleler talimat olarak işlenmez.
            </li>
            <li>Ders sayfası ve toplantı notu gibi taslağı yazılan işin kaynağı.</li>
            <li>
              Gitmeyenler: parola, doğrulama kodu, oturum çerezi, API anahtarları. Öğrenci adı ve kimlik numarası zaten
              okunmaz; öğrenci numarası takma ada çevrilir.
            </li>
          </ul>
          <h3>Yurt dışı izni ve maskeleme</h3>
          <p>
            OpenRouter yurt dışında bir hizmettir. Kurum yurt dışı aktarımına izin vermediyse yurt dışı hizmete hiçbir
            çağrı yapılmaz.
            <Dayanak n={7} /> İzin verildiyse giden metin önce maskelenir: T.C. kimlik numarası, telefon, e-posta, IBAN,
            öğrenci numarası ve kişi adları yer tutucuyla değiştirilir, yanıt gelince geri çevrilir.
          </p>
          <p>
            İzin kararı kurulum sihirbazının ikinci adımıdır. Karar metnini okuyup adınızla imzalarsınız, karar günlüğe
            yazılır. Bu kararı kurumun veri sorumlusuyla birlikte verin. Yurt dışı aktarımın hukuki değerlendirmesi
            taslaktır ve avukat incelemesi bekler.
          </p>
          <p>
            OpenRouter hesabınızın gizlilik ayarlarında, istemlerin model eğitiminde kullanılmasına izin veren
            seçenekleri kapatın.
          </p>
        </Metin>
      </Bolum>

      <Bolum
        no={6}
        id="kurum-ici"
        baslik="Kurum içi model kullanın"
        not="Veri kurumdan çıkmasın isteyenler için."
        zemin
      >
        <Metin>
          <p>
            Akredit tek kurumluk bir paketle kurumun kendi sunucusuna kurulabilir. Model de kurumun sunucusunda çalışır
            (Ollama ya da vLLM). Bu kurulumda yurt dışı izni açılamaz ve yalnız iç adresli model kabul edilir.
            <Dayanak n={8} /> Anahtar ve kullanım ücreti gerekmez; donanım kurumundur.
          </p>
          <p>Paket yazıldı ve yükseltme zinciri sınandı. Temiz bir sunucuda tam kurulum denemesi henüz yapılmadı.</p>
        </Metin>
        <p className="mt-6">
          <Link href="/guvenlik" className="font-semibold text-vurgu underline underline-offset-4">
            Güvenlik ve kişisel verileri okuyun
          </Link>
        </p>
      </Bolum>
      <Bolum no={7} id="web-aramasi" baslik="Web araması" not="Başka kurumların örneklerini bulmak için.">
        <Metin>
          <p>
            Kanıt ararken isterseniz başka üniversitelerin örnek uygulamaları da aranır. Arama OpenRouter&apos;ın web
            arama aracıyla yapılır. Motor varsayılan olarak modelin kendi aramasıdır, yoksa Exa kullanılır. OpenRouter
            belgesine göre Exa ile istek başına 0,007 dolar ödenir ve 10 sonuca kadar dahildir; model kullanım ücreti
            ayrıca yansır.
            <Dayanak n={9} /> Akredit bir aramada en çok 10 sonuç ister. Kurum yöneticisi bu sınırı düşürebilir.
          </p>
          <p>
            Yanıttan yalnız bağlantı, başlık ve kısa alıntı alınır; modelin yazdığı özet kullanılmaz. Kurumun yurt dışı
            izni yoksa ya da yönetici web aramasını açmadıysa hiçbir arama yapılmaz.
          </p>
          <p>
            Bulunan sayfalar kanıt değildir. Ayrı bir türde, kanıt değildir etiketiyle gösterilir; kanıt kaydına, ölçüt
            bağlantısına ve rapora kanıt olarak giremez.
            <Dayanak n={10} /> Kurumunuzun kendi sitesi ise ayrıca taranabilir: yalnız kendi alan adınız, robots.txt
            kurallarına uyarak ve saniyede en çok bir istekle. Oradan bulunan belgeler adresi, erişim zamanı ve içerik
            özetiyle kanıt havuzuna girer.
          </p>
        </Metin>
      </Bolum>
      <Dayanaklar ogeler={DAYANAKLAR} />
    </>
  );
}
