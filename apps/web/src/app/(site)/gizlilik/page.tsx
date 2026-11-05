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
          Site işletmecisinin tüzel kimliği ve adresi henüz kesinleşmemiştir. İletişim için sitedeki iletişim sayfası
          kullanılabilir. Kişisel veri başvurularının resmî kanalı, veri sorumlusu ve temsilcisi belirlendiğinde ayrıca
          duyurulmalıdır.
        </p>
      </section>
      <section>
        <h2>Hangi bilgiler işlenebilir?</h2>
        <p>
          İletişim kurduğunuzda paylaştığınız ad, iletişim bilgileri ve mesaj içeriği; teknik hizmetin çalışması
          sırasında bağlantı, hata, güvenlik ve erişim bilgileri işlenebilir. Bunların fiilen toplanıp toplanmadığı ve
          tutulma süresi kullanılan altyapı üzerinden doğrulanmalıdır.
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
        <p>
          Kişisel verilerin satışı, model eğitiminde kullanımı veya yurt dışına aktarımı hakkında nihai beyan ancak
          işletmeci ve tüm sağlayıcıların gerçek uygulamaları doğrulandıktan sonra yapılabilir.
        </p>
      </section>
      <section>
        <h2>Çerezler ve benzeri teknolojiler</h2>
        <p>
          Sitede kullanılan çerezler ve yerel depolama teknolojileri; adları, sağlayıcıları, amaçları, süreleri ve veri
          aktarım yerleriyle envanterlenmelidir. Sırf giriş teknolojisi kullanılması her çerezin zorunlu olduğu anlamına
          gelmez.
        </p>
        <p>
          Gerekli olmayan çerezler için uygun hukuki şart bulunmuyorsa çalıştırılmadan önce geçerli tercih alınmalı;
          kabul, ret ve tercih yönetimi erişilebilir olmalıdır. Site için mevcut çerez envanteri veya tamamlanmış izin
          mekanizması iddiası taşımaz.
        </p>
      </section>
      <section>
        <h2>Saklama, güvenlik ve başvuru</h2>
        <p>
          Saklama süreleri kategori ve amaca göre belirlenir; süre veya amaç sona erdiğinde yasal yükümlülüklerle
          birlikte silme, yok etme veya anonimleştirme değerlendirilir. Yetkilendirme, erişim ve kayıtların korunması
          için uygulanabilir tedbirler seçilir; hiçbir internet hizmeti mutlak güvenlik garantisi veremez.
        </p>
        <p>
          Kişisel veri haklarınız ve başvuru yolları için KVKK sayfasına; güvenlik açığı bildirimi için iletişim
          sayfasına bakın. Hizmet veya veri akışları değiştiğinde politika gözden geçirilir ve geçerli sürüm tarihi
          eklenir.
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
