import type { Metadata } from "next";
import { MetinSayfasi } from "../../../bilesenler/logo.tsx";
import { GORSELLER, SayfaGorseli } from "../../../site/gorsel.tsx";
import { SAYFALAR } from "../../../site/icerik.ts";
import { sayfaUstVerisi } from "../../../site/yapisal.ts";

export const metadata: Metadata = sayfaUstVerisi(SAYFALAR.guvenlik);

export default function Sayfa() {
  return (
    <MetinSayfasi baslik="Güvenlik ve kişisel veriler" gorsel={<SayfaGorseli gorsel={GORSELLER.guvenlik} />}>
      <section>
        <h2>Hizmetin mevcut durumu</h2>
        <p>
          Akredit açık kaynaklıdır. Açık araç ve uydurma verili demo erişilebilir; kurumlara barındırılan hizmet sponsor
          bulunana kadar askıdadır. Gerçek kurum verisiyle pilot yapılmamıştır. Bağımsız sızma testi henüz
          yapılmamıştır.
        </p>
      </section>
      <section>
        <h2>Yetkilendirme ve kurum ayrımı</h2>
        <p>
          Platform tasarımında kurum kapsamlı erişim, sunucu tarafında yetki kontrolü ve veritabanı satır güvenliği
          kullanılır. Bunların etkinliği kullanılan sürüm, kurulum, veritabanı rolü ve yapılandırmaya bağlıdır. Otomatik
          testler bağımsız sızma testinin yerine geçmez.
        </p>
      </section>
      <section>
        <h2>Kanıt ve kayıt bütünlüğü</h2>
        <p>
          Sistem kanıt sürümleri için içerik özeti ve kararlar için eklemeli kayıt yaklaşımını kullanır. Özet zinciri
          bazı değişikliklerin tespitine yardımcı olur; yetkili altyapı yöneticisine karşı mutlak değiştirilemezlik veya
          bütün ortamlarda eksiksiz denetim garantisi vermez.
        </p>
        <p>
          Kişisel verilerin silinmesi veya anonimleştirilmesi talepleri dosyalar, anahtarlar, türevler ve yedekler dahil
          somut kapsamda değerlendirilir. Takma adın bulunması veriyi kendiliğinden anonim yapmaz.
        </p>
      </section>
      <section>
        <h2>Yapay zekâ ve belge güvenliği</h2>
        <p>
          Belge ve dış kaynak içeriği talimat olarak kabul edilmemek üzere ele alınır; uygulama kontrolleri modelin
          hatasız davranacağını garanti etmez. Öneriler yetkili insan tarafından değerlendirilir; nihai beyan ve
          gönderim insana aittir.
        </p>
        <p>
          Kişisel veri azaltımı ve maskeleme hedeflenir. Otomatik tespit her veriyi yakalayamayabilir; sağlayıcı, veri
          akışı, aktarım şartları ve kurum izinleri kullanımdan önce doğrulanmalıdır. Gizli anahtar ve doğrulama kodları
          belgeye veya modele girilmemelidir.
        </p>
      </section>
      <section>
        <h2>Dosyalar, yedekler ve olay yönetimi</h2>
        <p>
          Dosya yükleme ve ayrıştırma, erişim sınırları ve kötü amaçlı içerik riskleriyle birlikte değerlendirilir.
          Yedekleme, geri yükleme, saklama ve imha düzeni gerçek kurulumda kurum ve işletmecinin belirlediği
          politikalara göre uygulanır. İhlal şüphesinde olayın kapsamı araştırılır ve ilgili bildirim yükümlülükleri
          somut olaya göre değerlendirilir.
        </p>
      </section>
      <section>
        <h2>Denetim ve bildirim</h2>
        <p>
          Tehdit modeli ve kontrol listeleri hazırlanmıştır; bağımsız denetim ve kiracı yalıtımının dış testle
          doğrulanması beklemektedir. Sertifika veya denetim tamamlanmış gibi sunulmaz.
        </p>
        <p>
          Güvenlik açığını herkese açık yayımlamadan önce iletişim sayfasındaki kanaldan bildirin. Etkilenen sürüm,
          güvenli biçimde tekrarlama adımları ve olası etki faydalıdır; gerçek kişisel veri veya gizli anahtar
          göndermeyin. Üç iş günü ilk yanıt hedefidir, garanti edilmiş hizmet seviyesi değildir.
        </p>
      </section>
      <section>
        <h2>Hukuki belgeler</h2>
        <p>
          KVKK, gizlilik ve kullanım koşulları ayrı sayfalarda yer alır. Akredit herhangi bir uyum belgesi veya
          sertifikasyon iddiasında bulunmaz.
        </p>
      </section>
      <nav aria-label="İlgili sayfalar">
        <p>
          <a href="/guvenlik">Güvenlik</a> · <a href="/kvkk">KVKK</a> · <a href="/gizlilik">Gizlilik</a> ·{" "}
          <a href="/kosullar">Kullanım koşulları</a> · <a href="/iletisim">İletişim</a>
        </p>
      </nav>
    </MetinSayfasi>
  );
}
