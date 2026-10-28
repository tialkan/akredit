import type { Metadata } from "next";
import Link from "next/link";
import { Bolum, Metin, SayfaBasi, YapisalVeri } from "../../../site/bilesenler.tsx";
import { SAYFALAR } from "../../../site/icerik.ts";
import { sayfaUstVerisi } from "../../../site/yapisal.ts";

export const metadata: Metadata = sayfaUstVerisi(SAYFALAR.giris);

// Dayanak: docs/raporlar/IP-09.md, apps/web/src/kimlik/, packages/yetki/src/csv.ts.

export default function GirisVeHesap() {
  return (
    <>
      <YapisalVeri sayfa={SAYFALAR.giris} />
      <SayfaBasi
        sayfa={SAYFALAR.giris}
        ozet="Akredit'te parola yoktur. Kurumsal e-posta adresinize gelen tek kullanımlık bağlantıyla ya da kurumunuzun tek oturum sistemiyle girersiniz."
      />
      <Bolum id="yollar" baslik="İki giriş yolu">
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
      <Bolum id="davet" baslik="Hesap yalnız davetle" zemin>
        <Metin>
          <p>
            Kimse kendi kendine hesap açamaz. E-posta adresine açılmış bir üyelik ya da süresi geçmemiş bir davet yoksa
            hesap oluşmaz. Bu kural e-posta bağlantısı ve tek oturum için aynıdır.
          </p>
          <p>
            Davet eden kişi, davet ettiği kişinin rolünü ve kapsamını da belirler: kurum, birim, program ya da ders.
            Değerlendirici daveti her zaman bitiş tarihlidir ve en çok 120 gündür.
          </p>
        </Metin>
      </Bolum>
      <Bolum id="baslangic" baslik="Kurum nasıl başlar">
        <ol className="space-y-4">
          <li>
            <p className="font-semibold">1. Kurum ve ilk yönetici</p>
            <p className="text-soluk">
              Kurum kaydı ve ilk kurum yöneticisi şu an kendi kendine açılamaz. Platformu işleten taraf tanımlar. Kurum
              içi kurulumda bunu kurumun bilgi işlem birimi yapar.
            </p>
          </li>
          <li>
            <p className="font-semibold">2. Kişileri davet etmek</p>
            <p className="text-soluk">
              Kurum yöneticisi kişileri tek tek davet eder ya da bir tabloyla toplu aktarır. Tabloda ad soyad, e-posta,
              rol, kapsam türü ve kapsam kodu sütunları bulunur. Her satır denetlenir; hatalı satır numarasıyla
              bildirilir.
            </p>
          </li>
          <li>
            <p className="font-semibold">3. Birim ve programlar</p>
            <p className="text-soluk">
              Roller birim, program ya da ders kapsamında verilir. Birim ve program yapısı kurulumda tanımlanır. Bunun
              için ayrı bir panel ekranı henüz yoktur.
            </p>
          </li>
          <li>
            <p className="font-semibold">4. Ayarlar</p>
            <p className="text-soluk">
              Kurum yöneticisi yapay zekâ hizmetini seçer, gerekiyorsa{" "}
              <Link href="/yapay-zeka" className="text-vurgu underline underline-offset-4">
                OpenRouter anahtarını
              </Link>{" "}
              girer ve yurt dışı iznine karar verir.
            </p>
          </li>
        </ol>
      </Bolum>
    </>
  );
}
