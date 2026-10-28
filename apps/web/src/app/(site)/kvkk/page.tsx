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
