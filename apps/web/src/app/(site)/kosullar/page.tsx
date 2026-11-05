import type { Metadata } from "next";
import { MetinSayfasi } from "../../../bilesenler/logo.tsx";
import { SAYFALAR } from "../../../site/icerik.ts";
import { sayfaUstVerisi } from "../../../site/yapisal.ts";

export const metadata: Metadata = sayfaUstVerisi(SAYFALAR.kosullar);

export default function Sayfa() {
  return (
    <MetinSayfasi baslik="Kullanım koşulları">
      <section>
        <h2>Kapsam</h2>
        <p>
          Bu koşullar kamuya açık site, açık MCP aracı, demo ve ileride açılabilecek kurum hizmeti için ayrı
          değerlendirilir. İşletmeci kimliği, sözleşme tarafları ve yürürlük tarihi henüz belirlenmemiştir.
        </p>
      </section>
      <section>
        <h2>Hizmetin durumu</h2>
        <p>
          Açık araç mevcut istemciler üzerinden kullanılabilir. Demo uydurma veriyle sunulur. Kurumlara barındırılan
          hizmet, yeni kurum hesabı ve gerçek veriyle pilot şu anda askıdadır. Kendi sunucusuna kurulumda altyapı ve
          işletim sorumlulukları ilgili kuruma aittir.
        </p>
      </section>
      <section>
        <h2>Kullanıcı ve kurum sorumlulukları</h2>
        <p>
          Kullanıcı yalnız erişmeye ve işlemeye yetkili olduğu verileri kullanmalı; hesap, anahtar ve oturumlarını
          korumalı; başkalarının verisini hukuka aykırı yüklememeli ve hizmetin güvenliğini zedeleyen işlemlerden
          kaçınmalıdır. Kurum yetkileri, kullanıcı davetleri ve veri işleme talimatları yazılı sözleşmeyle
          belirlenmelidir.
        </p>
        <p>
          Özel nitelikli veriler, öğrenci kayıtları ve gizli belgeler paylaşılmadan önce gereklilik, yetki ve seçilen
          sağlayıcıların veri işleme koşulları değerlendirilmelidir.
        </p>
      </section>
      <section>
        <h2>Yapay zekâ, doğrulama ve karar</h2>
        <p>
          Yapay zekâ çıktıları hatalı, eksik veya güncelliğini yitirmiş olabilir. Kullanıcı kaynakları ve hesaplamaları
          inceler; kurum adına beyan, akademik onay ve dış kuruma son gönderim yetkili insanın kararına bağlıdır.
          Akredit herhangi bir akreditasyon sonucunu garanti etmez ve bir akreditasyon kuruluşu adına karar vermez.
        </p>
      </section>
      <section>
        <h2>Veri, fikrî haklar ve açık kaynak</h2>
        <p>
          Kurumun sağladığı veriler üzerindeki haklar ilgili kurum ve hak sahiplerinin uygulanabilir haklarına tabidir.
          Yazılım kaynak kodu kendi deposunda belirtilen Apache-2.0 lisansı ve üçüncü taraf lisansları kapsamında
          kullanılabilir; bu lisans hizmet sözleşmesi veya kurum verilerine genel erişim izni değildir. Resmî ölçüt ve
          belgelerin kullanım koşulları ayrıca geçerli olabilir.
        </p>
      </section>
      <section>
        <h2>Üçüncü taraf hizmetler ve maliyetler</h2>
        <p>
          Seçilen yapay zekâ hizmeti veya diğer sağlayıcıların ayrı koşulları, veri politikaları, kullanım sınırları ve
          ücretleri olabilir. Kurumun kendi anahtarıyla aldığı hizmetin maliyet ve sözleşme sorumluluğu ilgili
          düzenlemeyle belirlenir.
        </p>
      </section>
      <section>
        <h2>Erişilebilirlik, değişiklik ve uyuşmazlıklar</h2>
        <p>
          Hizmet bakım, arıza veya güvenlik nedeniyle kesintiye uğrayabilir. Destek kapsamı, süreklilik, bildirim,
          fesih, veri iadesi ve sorumluluk hükümleri kurum hizmeti açılmadan taraflar arasında ayrıca belirlenmelidir.
          Kanunen sınırlandırılamayan haklar saklıdır.
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
