import type { Metadata } from "next";
import { Bolum, Metin, SayfaBasi, YapisalVeri } from "../../../site/bilesenler.tsx";
import { SAYFALAR } from "../../../site/icerik.ts";
import { sayfaUstVerisi } from "../../../site/yapisal.ts";

export const metadata: Metadata = sayfaUstVerisi(SAYFALAR.acikKaynak);

export default function AcikKaynak() {
  return (
    <>
      <YapisalVeri sayfa={SAYFALAR.acikKaynak} />
      <SayfaBasi sayfa={SAYFALAR.acikKaynak} ozet="Akredit'in kodu Apache-2.0 lisansıyla açıktır." />
      <Bolum id="neden" baslik="Neden açık">
        <Metin>
          <ul>
            <li>Kalite güvencesi şeffaflık ister. Sistemin öneriyi nasıl hazırladığı incelenebilmeli.</li>
            <li>Kurumlar tek bir firmaya bağlı kalmamalı.</li>
            <li>Üniversiteler kendi ihtiyacına göre geliştirip katkı verebilmeli.</li>
          </ul>
        </Metin>
      </Bolum>
      <Bolum id="lisans" baslik="Lisans" zemin>
        <Metin>
          <p>
            Apache License 2.0. Kod kullanılabilir, değiştirilebilir ve dağıtılabilir. Lisans metni ve telif bildirimi
            korunur. Yazılım olduğu gibi sunulur; lisans herhangi bir garanti vermez.
          </p>
          <p>Yeni bağımlılık yalnız Apache-2.0 ile uyumlu lisanslardan (MIT, BSD, Apache, ISC) seçilir.</p>
        </Metin>
      </Bolum>
      <Bolum id="akreddit" baslik="Akreddit komut satırı aracı">
        <Metin>
          <p>
            Akredit, daha önce geliştirilen Akreddit komut satırı aracının devamıdır. Araç aynı depoda yer alır ve
            çalışmaya devam eder. Aracın önceki deposu:{" "}
            <a href="https://github.com/tialkan/akreddit">github.com/tialkan/akreddit</a>
          </p>
          <p>
            Kurum içi kurulum için tek kurumluk bir paket hazırlandı. Temiz sunucuda tam kurulum denemesi henüz
            yapılmadı.
          </p>
        </Metin>
      </Bolum>
    </>
  );
}
