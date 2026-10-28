import type { Metadata } from "next";
import { MetinSayfasi } from "../../../bilesenler/logo.tsx";
import { SAYFALAR } from "../../../site/icerik.ts";
import { sayfaUstVerisi } from "../../../site/yapisal.ts";

export const metadata: Metadata = sayfaUstVerisi(SAYFALAR.kvkk);

export default function Kvkk() {
  return (
    <MetinSayfasi baslik="Kişisel verilerin korunması">
      <div role="note" className="mt-6 rounded-sm border-2 border-risk-orta bg-risk-orta-zemin p-4 text-risk-orta">
        <p className="mt-0 font-bold">Bu sayfa taslaktır.</p>
        <p className="mt-1">
          Bu metin hukuki incelemeden geçmemiştir ve bağlayıcı değildir. Kesin metin bir avukatın incelemesinden sonra
          burada yayımlanacaktır.
        </p>
      </div>
      <h2>Roller</h2>
      <p>
        Akredit'i kullanan üniversite, platformdaki kişisel verilerin veri sorumlusudur. Akredit'i işleten taraf, bu
        verileri yalnız üniversite adına ve onun talimatıyla işler. Platformla ilgili haklarınızı kullanmak için önce
        üniversitenize başvurun.
      </p>
      <h2>Tasarım ilkelerimiz</h2>
      <ul>
        <li>En az kişisel veri: yalnız işin gerektirdiği veri işlenir.</li>
        <li>Öğrenci kimlikleri takma adla tutulur. Gerçek kimlikle eşleme yalnız üniversitededir.</li>
        <li>
          Kişisel veri, üniversite açıkça izin vermedikçe yurt dışındaki bir yapay zekâ hizmetine maskelenmeden
          gönderilmez.
        </li>
        <li>Üniversite, kullanılacak yapay zekâ hizmetini ayarlardan seçer; bu seçim seçenin adıyla kaydedilir.</li>
        <li>Verileriniz satılmaz ve yapay zekâ modellerini eğitmek için kullanılmaz.</li>
        <li>Parola ve doğrulama kodları yapay zekâya ve kayıtlara girmez.</li>
      </ul>
      <h2>Kayıtlar ve silme talepleri</h2>
      <p>
        Onaylar ve kanıt kayıtları değiştirilemez. Bir silme talebi kabul edildiğinde, takma adı gerçek kişiyle eşleyen
        bilgi silinir; mevcut kayıtlar kimseyle ilişkilendirilemez hale gelir ve silme işlemi yeni bir kayıtla
        belgelenir.
      </p>
      <h2>Yapay zekâya kişisel veri gitmez</h2>
      <p>
        Kurum dışındaki ya da yurt dışındaki bir yapay zekâ hizmetine giden her metin önce bir denetimden geçer. Ad,
        öğrenci numarası, kimlik numarası, e-posta, telefon, banka hesabı, adres ve imza gizlenir. Gizlenemeyen kişisel
        bilgi şüphesi varsa metin gönderilmez, bir yetkili inceler. Her gönderim için hangi türden kaç bilginin
        gizlendiği kaydedilir; bilginin kendisi kaydedilmez.
      </p>
      <h2>Kurum hukuk paketi</h2>
      <p>
        Üniversitenizin hukuk birimi için hazırladığımız taslak belgeler: veri işleme sözleşmesi, yurt dışı aktarım
        notu, VERBİS değerlendirmesi, aydınlatma metinleri, sorumluluk tablosu ve veri akışı listesi. Hepsi taslaktır ve
        avukat incelemesi gerektirir.
      </p>
      <p>
        <a href="/indir/akredit-kurum-hukuk-paketi.zip" download>
          Kurum hukuk paketini indir (.zip)
        </a>
      </p>
      <h2>Diğer metinler</h2>
      <ul>
        <li>
          <a href="/gizlilik">Gizlilik politikası</a>
        </li>
        <li>
          <a href="/kosullar">Kullanım koşulları</a>
        </li>
      </ul>
    </MetinSayfasi>
  );
}
