import type { Metadata } from "next";
import { Bolum, Metin, SayfaBasi, YapisalVeri } from "../../../site/bilesenler.tsx";
import { ILETISIM_ADRESI, PROJE_SAHIBI, SAYFALAR } from "../../../site/icerik.ts";
import { sayfaUstVerisi } from "../../../site/yapisal.ts";

export const metadata: Metadata = sayfaUstVerisi(SAYFALAR.iletisim);

export default function Iletisim() {
  return (
    <>
      <YapisalVeri sayfa={SAYFALAR.iletisim} />
      <SayfaBasi sayfa={SAYFALAR.iletisim} ozet="Görüş, sponsorluk ve güvenlik bildirimleri için." />
      <Bolum id="sahip" baslik="Proje sahibi">
        <Metin>
          <p>
            Proje sahibi {PROJE_SAHIBI}. İletişim: <a href={ILETISIM_ADRESI}>LinkedIn</a>
          </p>
        </Metin>
      </Bolum>
      <Bolum id="sponsor" baslik="Sponsorluk" zemin>
        <Metin>
          <p>
            Platform tamamlandı ve açık kaynaktır. Kurumlara barındırılan hizmet, pilot uygulama ve kurum açma sponsor
            bulunana kadar askıda.
          </p>
          <p>
            Barındırma giderini üstlenip hizmetin kurumlara açılmasını sağlamak isterseniz LinkedIn üzerinden yazın.
          </p>
        </Metin>
      </Bolum>
      <Bolum id="guvenlik" baslik="Güvenlik açığı bildirimi">
        <Metin>
          <p>
            Açıkları herkese açık yazmadan, LinkedIn üzerinden özel ileti olarak bildirin. Bildirimde etkilenen sürümü,
            yeniden üretme adımlarını ve olası etkiyi yazın. İlk yanıt hedefi 3 iş günüdür.
          </p>
        </Metin>
      </Bolum>
    </>
  );
}
