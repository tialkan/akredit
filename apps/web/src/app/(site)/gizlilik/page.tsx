import type { Metadata } from "next";
import { MetinSayfasi } from "../../../bilesenler/logo.tsx";
import { SAYFALAR } from "../../../site/icerik.ts";
import { sayfaUstVerisi } from "../../../site/yapisal.ts";

export const metadata: Metadata = sayfaUstVerisi(SAYFALAR.gizlilik);

export default function Sayfa() {
  return (
    <MetinSayfasi baslik="Gizlilik politikası">
      <section>
        <h2>Bu politikanın kapsamı</h2>
        <p>
          Bu politika akredit.org sitesini, açık aracı ve varsa kurum tarafından kurulan platformu hangi bağlamda
          kullandığınızı anlamanıza yardımcı olur. Barındırılan kurum hizmeti ve gerçek kurum verisiyle pilot şu anda
          askıdadır; demo uydurma veriler içerir.
        </p>
      </section>
      <section>
        <h2>İşletmeci ve iletişim</h2>
        <p>
          Siteyi Tarık İsmet ALKAN işletir. Kişisel veri başvuruları ve sorular için:{" "}
          <a href="mailto:iletisim@akredit.org">iletisim@akredit.org</a>.
        </p>
      </section>
      <section>
        <h2>Hangi bilgiler işlenebilir?</h2>
        <p>
          İletişim kurduğunuzda paylaştığınız ad, iletişim bilgileri ve mesaj içeriği; teknik hizmetin çalışması
          sırasında bağlantı, hata, güvenlik ve erişim bilgileri işlenebilir.
        </p>
        <p>
          Açık MCP aracına gönderdiğiniz içerik seçtiğiniz yapay zekâ istemcisinden ve sağlayıcısından geçebilir. Bu
          üçüncü tarafların kendi hizmet koşulları ve veri uygulamaları da geçerlidir. Parola, doğrulama kodu ve
          gereksiz kişisel veri göndermeyin.
        </p>
      </section>
      <section>
        <h2>Kurum ve demo verileri</h2>
        <p>
          Kurumun kendi ortamına kurduğu sistemde verilerin kapsamını, kullanıcılara verilen yetkileri ve sağlayıcıları
          kurum belirler. Kurum verileri hakkındaki sorular ilgili kuruma yöneltilmelidir. Demodaki bilgiler örnektir;
          gerçek öğrenci veya çalışan bilgileri yüklemek için kullanılmamalıdır.
        </p>
      </section>
      <section>
        <h2>Amaçlar ve paylaşım</h2>
        <p>
          Bilgiler somut duruma göre iletişimin yanıtlanması, hizmetin yürütülmesi, güvenliğin sağlanması ve yasal
          yükümlülükler amacıyla işlenebilir. Barındırma, güvenlik, destek veya yapay zekâ hizmeti sunan taraflara
          erişim gerekip gerekmediği ve bunun hukuki dayanağı hizmet başlamadan belirlenir.
        </p>
        <p>Kişisel veriler satılmaz.</p>
      </section>
      <section>
        <h2>Çerezler ve benzeri teknolojiler</h2>
        <p>Site reklam amaçlı çerez kullanmaz.</p>
        <p>Zorunlu olmayan bir çerez eklenirse önce izniniz alınır; kabul ve ret eşit kolaylıkta sunulur.</p>
      </section>
      <section>
        <h2>Saklama, güvenlik ve başvuru</h2>
        <p>
          Saklama süreleri kategori ve amaca göre belirlenir; süre veya amaç sona erdiğinde yasal yükümlülüklerle
          birlikte silme, yok etme veya anonimleştirme değerlendirilir. Yetkilendirme, erişim ve kayıtların korunması
          için uygulanabilir tedbirler seçilir; hiçbir internet hizmeti mutlak güvenlik garantisi veremez.
        </p>
        <p>
          Kişisel veri haklarınız için KVKK sayfasına bakın; başvuru:{" "}
          <a href="mailto:iletisim@akredit.org">iletisim@akredit.org</a>. Hizmet veya veri akışları değiştiğinde
          politika gözden geçirilir ve geçerli sürüm tarihi eklenir.
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
