import { ROLLER } from "@akredit/yetki";
import type { Metadata } from "next";
import Link from "next/link";
import { Bolum, Dayanak, Dayanaklar, Metin, SayfaBasi, YapisalVeri } from "../../../site/bilesenler.tsx";
import { ROL_ADI, ROL_KARARI, SAYFALAR } from "../../../site/icerik.ts";
import { sayfaUstVerisi } from "../../../site/yapisal.ts";

export const metadata: Metadata = sayfaUstVerisi(SAYFALAR.giris);

// Dayanak: docs/raporlar/IP-09.md, docs/raporlar/IP-35.md, apps/web/src/kimlik/, packages/yetki/src/csv.ts.

const DAYANAKLAR = [
  "Roller ve eylemler: packages/yetki/src (ROLLER, ROL_EYLEMLERI, KURUM_DUZEYI_EYLEMLER).",
  "Kurum açılışı: apps/web/src/kimlik/kurum-acilisi.ts; docs/raporlar/IP-35.md.",
  "Toplu aktarım tablosu: packages/yetki/src/csv.ts.",
  "Değerlendirici süresi (DEGERLENDIRICI_AZAMI_SURE_MS) ve erişim günlüğü: packages/yetki/src; docs/raporlar/IP-22.md.",
];

export default function GirisVeHesap() {
  return (
    <>
      <YapisalVeri sayfa={SAYFALAR.giris} />
      <SayfaBasi
        sayfa={SAYFALAR.giris}
        ozet="Akredit'te parola yoktur. Kurumsal e-posta adresinize gelen tek kullanımlık bağlantıyla ya da kurumunuzun tek oturum sistemiyle girersiniz."
      />
      <Bolum no={1} id="yollar" baslik="İki giriş yolu">
        <Metin>
          <h3>E-postaya bağlantı</h3>
          <p>
            Giriş sayfasına kurumsal e-posta adresinizi yazarsınız. Adresinize tek kullanımlık bir bağlantı gelir.
            Bağlantı 10 dakika geçerlidir ve bir kez kullanılabilir.
          </p>
          <h3>Kurum tek oturumu</h3>
          <p>
            Kurumunuz OIDC ya da SAML 2.0 ile tek oturum sistemi tanımladıysa kurum hesabınızla girersiniz. Tek oturum
            sağlayıcısı yalnız kendi alan adındaki e-postalar için kimlik bildirebilir.
          </p>
          <h3>Oturum</h3>
          <p>
            Oturum 8 saat sürer. Yeni bir ağdan ve yeni bir cihazdan birlikte giriş yapılırsa size e-posta gider ve olay
            günlüğe yazılır.
          </p>
        </Metin>
        <p className="mt-6">
          <Link href="/giris" className="font-semibold text-vurgu underline underline-offset-4">
            Giriş sayfası
          </Link>
        </p>
      </Bolum>
      <Bolum no={2} id="davet" baslik="Hesap davetle açılır" zemin>
        <Metin>
          <p>
            Kurumun ilk yöneticisi kurumu kendisi açar: kurumsal e-postasına gelen tek kullanımlık bağlantıyla alan
            adını doğrular. Diğer herkes davetle katılır. E-posta adresine açılmış bir üyelik ya da süresi geçmemiş bir
            davet yoksa hesap oluşmaz. Bu kural e-posta bağlantısı ve tek oturum için aynıdır.
          </p>
          <p>
            Davet eden kişi, davet ettiği kişinin rolünü ve kapsamını da belirler: kurum, birim, program ya da ders.
            Değerlendirici daveti her zaman bitiş tarihlidir ve en çok 120 gündür.
          </p>
        </Metin>
      </Bolum>
      <Bolum no={3} id="roller" baslik="Sekiz rol, sekiz yetki kümesi" not="Kim neyi onaylayabilir.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] border-collapse text-left">
            <caption className="sr-only">Roller ve karar yetkileri</caption>
            <thead>
              <tr className="border-b-2 border-cizgi-guclu">
                <th scope="col" className="py-2 pr-4">
                  Rol
                </th>
                <th scope="col" className="py-2">
                  Karar ve onay yetkisi
                </th>
              </tr>
            </thead>
            <tbody>
              {ROLLER.map((r) => (
                <tr key={r} className="border-b border-cizgi align-top">
                  <th scope="row" className="py-3 pr-4 font-semibold">
                    {ROL_ADI[r]}
                  </th>
                  <td className="py-3">{ROL_KARARI[r]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-soluk">
          Roller kurum, birim, program ya da ders kapsamında verilir. Bir program sorumlusu yalnız kendi programındaki
          önerilere karar verir.
          <Dayanak n={1} /> Yüksek riskli kararlar (olgunluk düzeyi, kurum sistemine yazma, dış kuruma gönderim) hiçbir
          politikayla otomatiğe bağlanamaz.
        </p>
        <p className="mt-4">
          <Link href="/kimler-icin#matris" className="font-semibold text-vurgu underline underline-offset-4">
            Bütün eylemlerin rol tablosunu açın
          </Link>
        </p>
      </Bolum>
      <Bolum no={4} id="baslangic" baslik="Kurum nasıl başlar" zemin>
        <ol className="space-y-4">
          <li>
            <p className="font-semibold">1. Kurumu açın</p>
            <p className="text-soluk">
              İlk yönetici kurumu{" "}
              <Link href="/kurum-ac" className="text-vurgu underline underline-offset-4">
                Kurumunuzu açın
              </Link>{" "}
              sayfasından kendisi açar. Kurumsal e-postasına gelen bağlantı 30 dakika geçerlidir. Bir alan adına yalnız
              bir kurum açılır.
              <Dayanak n={2} />
            </p>
          </li>
          <li>
            <p className="font-semibold">2. Kurulum sihirbazını bitirin</p>
            <p className="text-soluk">
              Beş adım: OpenRouter anahtarı, yurt dışı aktarım kararı, Bologna adresinden program ve dersler, hocaların
              daveti, çerçeve.
            </p>
          </li>
          <li>
            <p className="font-semibold">3. Kişileri davet edin</p>
            <p className="text-soluk">
              Kişileri tek tek davet edin ya da bir tabloyla toplu aktarın. Tabloda ad soyad, e-posta, rol, kapsam türü
              ve kapsam kodu sütunları bulunur. Her satır denetlenir; hatalı satır numarasıyla bildirilir.
              <Dayanak n={3} />
            </p>
          </li>
          <li>
            <p className="font-semibold">4. Değerlendiriciye süreli erişim açın</p>
            <p className="text-soluk">
              Dış değerlendirici salt okunur bir hesapla, yalnız açılan kapsamı görür. Hesap en çok 120 gün sonra
              kendiliğinden kapanır. Kurum, değerlendiricinin neyi açtığını erişim günlüğünde görür.
              <Dayanak n={4} />
            </p>
          </li>
        </ol>
      </Bolum>
      <Dayanaklar ogeler={DAYANAKLAR} />
    </>
  );
}
