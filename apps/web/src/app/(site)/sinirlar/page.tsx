import type { Metadata } from "next";
import { Bolum, Metin, SayfaBasi, YapisalVeri } from "../../../site/bilesenler.tsx";
import { SAYFALAR } from "../../../site/icerik.ts";
import { sayfaUstVerisi } from "../../../site/yapisal.ts";

export const metadata: Metadata = sayfaUstVerisi(SAYFALAR.sinirlar);

export default function Sinirlar() {
  return (
    <>
      <YapisalVeri sayfa={SAYFALAR.sinirlar} />
      <SayfaBasi
        sayfa={SAYFALAR.sinirlar}
        ozet="Bir aracın ne yapmadığını bilmek, ne yaptığını bilmek kadar önemlidir."
      />
      <Bolum id="garanti" baslik="Sonuç garantisi yok">
        <Metin>
          <p>
            Akredit akreditasyon almanızı ya da bir değerlendirmede belli bir düzeye ulaşmanızı sağlamaz. Değerlendirme
            ve karar akreditasyon kuruluşunundur. Akredit yalnız hazırlık işini azaltır ve kanıtı düzenli tutar.
          </p>
        </Metin>
      </Bolum>
      <Bolum id="bag" baslik="Resmî bağ yok" zemin>
        <Metin>
          <p>
            Akredit bağımsız, açık kaynak bir yazılımdır. YÖKAK, MÜDEK ya da başka bir akreditasyon kuruluşuyla, YÖK ile
            ya da herhangi bir kamu kurumuyla bağı yoktur. Bu kuruluşların resmî aracı değildir ve onlar adına konuşmaz.
          </p>
          <p>Ölçüt metinleri bu kuruluşların yayımladığı belgelerden alınır ve kaynağıyla gösterilir.</p>
        </Metin>
      </Bolum>
      <Bolum id="beyan" baslik="Beyan insanda">
        <Metin>
          <ul>
            <li>Kurum adına beyan, olgunluk düzeyi kararı ve dış kuruma son gönderim bir kişinin kararıdır.</li>
            <li>Bu kararlar hiçbir politikayla otomatiğe bağlanamaz ve API anahtarıyla verilemez.</li>
            <li>Sistem yapılmamış bir faaliyeti yapılmış gibi yazmaz. Kanıtı olmayan yer EKSİK kalır.</li>
            <li>Öğrenci bilgi sisteminde son kaydı ve dış sisteme son gönderimi insan yapar.</li>
          </ul>
        </Metin>
      </Bolum>
      <Bolum id="durum" baslik="Bugünkü durum" zemin>
        <Metin>
          <ul>
            <li>Platform geliştirme aşamasındadır ve kurumlara açık değildir. Pilot uygulama başlamadı.</li>
            <li>
              Panel kurumun kendi kayıtlarıyla çalışır. Bağlayıcıları açma ve toplu belge yükleme ekranları henüz yok.
            </li>
            <li>Hukuk metinleri taslaktır. Bağımsız güvenlik denetimi yapılmadı.</li>
            <li>Hedeflenen zaman kazancı henüz ölçülmedi.</li>
          </ul>
        </Metin>
      </Bolum>
    </>
  );
}
