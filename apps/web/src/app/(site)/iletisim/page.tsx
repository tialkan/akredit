import type { Metadata } from "next";
import { Bolum, Metin, SayfaBasi, YapisalVeri } from "../../../site/bilesenler.tsx";
import { SAYFALAR } from "../../../site/icerik.ts";
import { sayfaUstVerisi } from "../../../site/yapisal.ts";

export const metadata: Metadata = sayfaUstVerisi(SAYFALAR.iletisim);

export default function Iletisim() {
  return (
    <>
      <YapisalVeri sayfa={SAYFALAR.iletisim} />
      <SayfaBasi sayfa={SAYFALAR.iletisim} ozet="Görüş, pilot katılımı ve güvenlik bildirimleri için." />
      <Bolum id="sahip" baslik="Proje sahibi">
        <Metin>
          <p>
            Tarık İsmet ALKAN. İletişim kanalı: <a href="https://kulular.com.tr">kulular.com.tr</a>
          </p>
        </Metin>
      </Bolum>
      <Bolum id="pilot" baslik="Pilot uygulama" zemin>
        <Metin>
          <p>Pilot uygulama için başvuru yolu henüz açılmadı. Açıldığında bu sayfada duyurulacak.</p>
        </Metin>
      </Bolum>
      <Bolum id="guvenlik" baslik="Güvenlik açığı bildirimi">
        <Metin>
          <p>
            Açıkları herkese açık yazmadan, yukarıdaki kanaldan özel olarak bildirin. Bildirimde etkilenen sürümü,
            yeniden üretme adımlarını ve olası etkiyi yazın. İlk yanıt hedefi 3 iş günüdür.
          </p>
        </Metin>
      </Bolum>
    </>
  );
}
