import type { Metadata } from "next";
import { Bolum, Metin, SayfaBasi, YapisalVeri } from "../../../site/bilesenler.tsx";
import { ILETISIM_ADRESI, PROJE_SAHIBI, SAYFALAR } from "../../../site/icerik.ts";
import { sayfaUstVerisi } from "../../../site/yapisal.ts";

export const metadata: Metadata = sayfaUstVerisi(SAYFALAR.iletisim);

export default function Iletisim() {
  return (
    <>
      <YapisalVeri sayfa={SAYFALAR.iletisim} />
      <SayfaBasi sayfa={SAYFALAR.iletisim} ozet="Görüş, sponsorluk, güvenlik bildirimi." />
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
            Kurum hizmeti, pilot ve kurum açma sponsor bulunana kadar askıda. Barındırma giderini üstlenmek isterseniz
            LinkedIn'den yazın.
          </p>
        </Metin>
      </Bolum>
      <Bolum id="guvenlik" baslik="Güvenlik açığı bildirimi">
        <Metin>
          <p>
            Açıkları herkese açık yazmayın: LinkedIn'den özel ileti ya da{" "}
            <a href="https://github.com/tialkan/akredit/security/advisories/new">GitHub güvenlik bildirimi</a>. Sürümü,
            adımları ve etkiyi yazın. İlk yanıt hedefi 3 iş günü.
          </p>
        </Metin>
      </Bolum>
    </>
  );
}
