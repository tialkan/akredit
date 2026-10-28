import type { Metadata } from "next";
import Link from "next/link";
import { Bolum, Metin, SayfaBasi, TaslakNotu, YapisalVeri } from "../../../site/bilesenler.tsx";
import { SAYFALAR } from "../../../site/icerik.ts";
import { sayfaUstVerisi } from "../../../site/yapisal.ts";

export const metadata: Metadata = sayfaUstVerisi(SAYFALAR.yz);

// Dayanak: packages/yz/src/anahtar-kasasi.ts, packages/servis/src/politika.ts (yzAnahtariKaydet,
// yzBaglantiDene), apps/web/src/app/panel/ayarlar/yz-anahtari.tsx, packages/yz/src/guvence/politika.ts ve kvkk.ts.

const ADIMLAR = [
  "openrouter.ai adresinde kurum adına bir hesap açın. Hesabı kişisel e-postayla değil, kurumun ortak adresiyle açmanızı öneririz.",
  "Hesaba kredi yükleyin. Kullanım bu krediden düşer.",
  "Keys bölümünde yeni bir anahtar oluşturun. Anahtara tanınır bir ad verin, örneğin kurumun kısa adı ve Akredit.",
  "Anahtar için bir harcama sınırı (kredi sınırı) koyun. Böylece beklenmedik bir kullanım bütçeyi aşamaz.",
  "Anahtarı kopyalayın. OpenRouter anahtarı yalnız oluşturulduğu anda tam gösterir.",
  "Akredit'te Panel, Ayarlar, Yapay zekâ hizmeti bölümüne gidin. Anahtarı OpenRouter anahtarı alanına yapıştırıp kaydedin.",
  "Bağlantıyı dene düğmesine basın. Sonuç aynı ekranda yazar.",
];

export default function YapayZeka() {
  return (
    <>
      <YapisalVeri sayfa={SAYFALAR.yz} />
      <SayfaBasi
        sayfa={SAYFALAR.yz}
        ozet="Akredit ilk etapta ücretsizdir. Yapay zekâ için kurum kendi OpenRouter anahtarını getirir. Kullanımın ücreti kurumun OpenRouter hesabına yansır."
      />
      <Bolum id="neden" baslik="Neden kendi anahtarınız" not="Maliyet ve denetim kurumda kalır.">
        <Metin>
          <p>
            Akredit bir yapay zekâ hizmeti satmaz. Taslak yazma ve belge sınıflama gibi işler için kurum kendi seçtiği
            hizmeti kullanır. Bu sayede ne kadar harcandığını kurum kendi hesabında görür ve sınırını kendisi koyar.
          </p>
          <p>
            OpenRouter, tek anahtarla birçok modele erişim sağlayan bir aracı hizmettir. Akredit'in yapay zekâ katmanı
            OpenRouter dışında EVREN, OpenAI uyumlu kurum sunucuları ve yerel modellerle de çalışabilecek biçimde
            yazıldı.
          </p>
        </Metin>
      </Bolum>

      <Bolum
        id="anahtar-alma"
        baslik="Anahtar nasıl alınır"
        not="OpenRouter ekranları değişebilir; adımların özü aynı kalır."
        zemin
      >
        <ol className="space-y-3">
          {ADIMLAR.map((a, i) => (
            <li key={a} className="grid grid-cols-[2rem_1fr] gap-2">
              <span className="font-semibold text-vurgu">{i + 1}.</span>
              <span>{a}</span>
            </li>
          ))}
        </ol>
      </Bolum>

      <Bolum id="saklama" baslik="Anahtar nerede, nasıl saklanır" not="Koddaki akış, olduğu gibi.">
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
              Şifreli anahtar kurumun ayarlarında durur. Düz hâli veritabanına yazılmaz. Sunucuda ana anahtar ayarlı
              değilse kayıt açık bir hatayla reddedilir; anahtar düz metin olarak saklanmaz.
            </li>
            <li>
              Anahtar hiçbir yanıtla tarayıcıya geri gönderilmez. Ekranda yalnız son dört karakteri, modeli, kaydedenin
              adı ve tarihi görünür.
            </li>
            <li>
              Kaydetme ve kaldırma değiştirilemez günlüğe yazılır. Günlükte anahtarın kendisi ya da bir parçası yoktur.
            </li>
            <li>Yeni anahtar girildiğinde eskisinin yerine geçer. Anahtar ekrandan kaldırılabilir.</li>
          </ul>
        </Metin>
      </Bolum>

      <Bolum id="deneme" baslik="Bağlantıyı dene" zemin>
        <Metin>
          <p>
            Bu düğme kayıtlı anahtarla OpenRouter'a tek kelimelik bir istek gönderir ve en çok bir belirteçlik yanıt
            ister. İstekte kurum verisi yoktur. Anahtar geçersizse ya da hizmete ulaşılamazsa ne olduğu sade bir
            cümleyle yazar.
          </p>
        </Metin>
        <TaslakNotu>
          <p className="font-semibold">Geliştirme durumu</p>
          <p className="mt-1">
            Anahtar kaydı, şifreli saklama ve bağlantı denemesi çalışır. Arka plan işlerinin kurumun kayıtlı anahtarıyla
            çalışmaya bağlanması henüz tamamlanmadı.
          </p>
        </TaslakNotu>
      </Bolum>

      <Bolum id="veri" baslik="Modele hangi veri gider" not="İşin gerektirdiği en az veri.">
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
          <h3>Maskeleme ve yurt dışı izni</h3>
          <p>
            OpenRouter yurt dışında bir hizmettir. Kurum ayarlarında yurt dışı izni kapalıyken yurt dışı hizmete yapılan
            her çağrı reddedilir. İzin açıksa giden metin önce maskelenir: T.C. kimlik numarası, telefon, e-posta, IBAN,
            öğrenci numarası ve kişi adları yer tutucuyla değiştirilir, yanıt gelince geri çevrilir.
          </p>
          <p>
            İzni açma kararını kurumun veri sorumlusuyla birlikte verin. Yurt dışı aktarımın hukuki değerlendirmesi
            taslak durumdadır ve avukat incelemesi bekler.
          </p>
          <p>
            OpenRouter hesabınızın gizlilik ayarlarında, istemlerin model eğitiminde kullanılmasına izin veren
            seçenekleri inceleyin.
          </p>
        </Metin>
      </Bolum>

      <Bolum id="kurum-ici" baslik="Kurum içi model" not="Veri kurumdan çıkmasın isteyenler için." zemin>
        <Metin>
          <p>
            Akredit tek kurumluk bir paketle kurumun kendi sunucusuna kurulabilir. Model de kurumun sunucusunda çalışır
            (Ollama ya da vLLM). Bu kurulumda yurt dışı izni açılamaz ve yalnız iç adresli model kabul edilir. Bu yolda
            anahtar ve kullanım ücreti gerekmez; donanım kurumundur.
          </p>
          <p>
            Paket yazıldı ve yükseltme zinciri sınandı. Temiz bir sunucuda Docker ile tam kurulum denemesi henüz
            yapılmadı.
          </p>
        </Metin>
        <p className="mt-6">
          <Link href="/guvenlik" className="font-semibold text-vurgu underline underline-offset-4">
            Güvenlik ve kişisel veriler
          </Link>
        </p>
      </Bolum>
    </>
  );
}
