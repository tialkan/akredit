import type { Metadata } from "next";
import { MetinSayfasi } from "../../../bilesenler/logo.tsx";
import { SAYFALAR } from "../../../site/icerik.ts";
import { sayfaUstVerisi } from "../../../site/yapisal.ts";

export const metadata: Metadata = sayfaUstVerisi(SAYFALAR.kvkk);

export default function Sayfa() {
  return (
    <MetinSayfasi baslik="Kişisel verilerin korunması">
      <section>
        <h2>Kapsam ve mevcut durum</h2>
        <p>
          Bu metin; akredit.org ziyaretçilerini, açık MCP aracını kullananları ve ileride kurum hizmetini kullanabilecek
          kişileri bilgilendirmek üzere hazırlanmıştır. Kurumlara barındırılan hizmet ve gerçek kurum verisiyle pilot şu
          anda askıdadır. Demo uydurma veriler kullanır.
        </p>
        <p>
          Site ve açık aracın veri sorumlusu Tarık İsmet ALKAN'dır. Başvuru kanalı:{" "}
          <a href="mailto:iletisim@akredit.org">iletisim@akredit.org</a>. Posta adresi bu kanaldan istenebilir.
        </p>
      </section>
      <section>
        <h2>Veri sorumluluğu ve roller</h2>
        <p>
          Kurum tarafından yürütülen akademik süreçlerde işleme amaç ve araçlarını belirleyen yükseköğretim kurumu veri
          sorumlusu olabilir; Akredit işletmecisinin rolü somut hizmete ve sözleşmeye göre değerlendirilir. Site
          iletişimi, güvenlik veya benzeri işletmecinin kendi amaçları bakımından ayrı bir sorumluluk doğabilir. Her
          faaliyet için rol ve taraflar ayrıca belirlenir.
        </p>
        <p>
          Kendi sunucusuna kurulumda sistemi işleten kurumun, kendi altyapısı ve seçtiği hizmet sağlayıcılar bakımından
          ayrı yükümlülükleri olabilir.
        </p>
      </section>
      <section>
        <h2>Veri kategorileri ve kaynakları</h2>
        <p>
          Kullanılan işleve göre iletişim ve kullanıcı kimliği, kurumsal üyelik ve yetki bilgileri, güvenlik ve işlem
          kayıtları, kanıt belgeleri ve bunlarda yer alan öğrenci, çalışan veya paydaş bilgileri işlenebilir. Sınav,
          staj ve anket belgeleri özel nitelikli veya üçüncü kişilere ait veriler içerebilir.
        </p>
        <p>
          Veriler ilgili kişinin doğrudan girişiyle, kurumun yetkili kullanıcısı veya entegrasyonuyla ya da hizmetin
          güvenli biçimde işletilmesi sırasında elektronik ortamda elde edilebilir.
        </p>
      </section>
      <section>
        <h2>Amaçlar ve hukuki sebepler</h2>
        <p>
          Muhtemel amaçlar; talebin yanıtlanması, kimlik ve yetki yönetimi, kalite süreçlerinin yürütülmesi, hizmet
          güvenliği, destek, kayıt ve hukuki yükümlülüklerin yerine getirilmesidir. Aynı verinin farklı amaçlarla
          işlenmesi farklı değerlendirme gerektirebilir.
        </p>
        <p>
          Her amaç için uygulanabilir hukuki sebep ayrı değerlendirilir. Sözleşmenin kurulması veya ifası, hukuki
          yükümlülük ya da meşru menfaat gibi sebepler ancak somut şartları sağlandığında kullanılabilir. Gerekli olduğu
          durumlarda açık rıza özgür iradeyle, belirli ve bilgilendirilmiş olarak ayrıca alınır; aydınlatma metni rıza
          yerine geçmez.
        </p>
      </section>
      <section>
        <h2>Aktarım ve yapay zekâ</h2>
        <p>
          Kurumun seçtiği model sağlayıcısı, barındırma ve teknik destek hizmetleri veri alıcısı veya alt işleyen
          olabilir. Gönderilen verinin kapsamı, alıcılar, ülkeler, saklama koşulları ve model eğitimi kullanımı gerçek
          yapılandırma ve sözleşmelerle doğrulanır.
        </p>
        <p>
          Yurt dışı aktarımda Kanun’un ilgili hükümleri ve somut aktarım mekanizması değerlendirilir; yalnız kurumun
          onayı veya verinin maskelenmesi tek başına her aktarım için yeterli güvence sayılmaz. Maskelenen veride
          kişilerin yeniden belirlenebilirliği ayrıca incelenir.
        </p>
      </section>
      <section>
        <h2>Saklama ve ilgili kişi hakları</h2>
        <p>
          Veriler işleme amacı, uygulanabilir mevzuat, sözleşme ve kurumun onaylı saklama planına göre tutulur; süre
          dolduğunda uygun silme, yok etme veya anonim hâle getirme işlemi değerlendirilir. Dosyalar, türevler, arama
          dizinleri ve yedekler ayrı ayrı ele alınmalıdır.
        </p>
        <p>
          Kanun’un 11. maddesi kapsamındaki bilgi alma, düzeltme, silme veya yok etme, aktarılan üçüncü kişilere
          bildirme ve diğer haklar için ilgili veri sorumlusuna başvurulabilir. Kurum verileri bakımından öncelikle
          ilgili üniversitenin resmî başvuru kanalı kullanılmalıdır. Site ve açık araçla ilgili başvurular{" "}
          <a href="mailto:iletisim@akredit.org">iletisim@akredit.org</a> adresine yazılı olarak yapılabilir.
        </p>
      </section>
      <section>
        <h2>Güvenlik ve sınırlar</h2>
        <p>
          Yetki sınırlandırması, kayıt bütünlüğü ve veri azaltımı amaçlanır. Takma adlandırma tek başına anonimleştirme
          değildir; bir anahtarın silinmesi de bütün kopya ve bağlantılar değerlendirilmeden verinin geri döndürülemez
          biçimde anonimleştiğini göstermez. Silme başvuruları somut veri ve saklama yükümlülükleri temelinde ele
          alınır.
        </p>
      </section>
      <section>
        <h2>İlgili belgeler</h2>
        <p>
          Gizlilik politikası, kullanım koşulları ve güvenlik sayfası bu metni tamamlar. Kurumlara yönelik veri işleme
          ve aktarım düzenlemeleri ayrıca sözleşmeyle ve hukuk incelemesiyle belirlenmelidir.
        </p>
      </section>
      <p>
        <a href="/indir/akredit-kurum-hukuk-paketi.zip" download>
          Kurum hukuk paketi taslağını indir (.zip)
        </a>
      </p>
      <nav aria-label="İlgili sayfalar">
        <p>
          <a href="/guvenlik">Güvenlik</a> · <a href="/kvkk">KVKK</a> · <a href="/gizlilik">Gizlilik</a> ·{" "}
          <a href="/kosullar">Kullanım koşulları</a> · <a href="/iletisim">İletişim</a>
        </p>
      </nav>
    </MetinSayfasi>
  );
}
