import type { Metadata } from "next";
import { MetinSayfasi } from "../../../bilesenler/logo.tsx";

export const metadata: Metadata = { title: "KVKK" };

export default function Kvkk() {
  return (
    <MetinSayfasi baslik="Kişisel verilerin korunması">
      <div role="note" className="mt-6 rounded-lg border-2 border-risk-orta bg-risk-orta-zemin p-4 text-risk-orta">
        <p className="mt-0 font-bold">Bu sayfa taslaktır.</p>
        <p className="mt-1">
          Aydınlatma metni henüz hukuki incelemeden geçmemiştir ve bağlayıcı değildir. Kesin metin hukuk incelemesinden
          sonra burada yayımlanacaktır.
        </p>
      </div>
      <h2>Tasarım ilkelerimiz</h2>
      <ul>
        <li>En az kişisel veri: yalnız işin gerektirdiği veri işlenir.</li>
        <li>Öğrenci kimlikleri takma adla tutulur.</li>
        <li>
          Kişisel veri, kurum açıkça izin vermedikçe yurt dışındaki bir yapay zekâ hizmetine maskelenmeden gönderilmez.
        </li>
        <li>Kurum, kullanılacak yapay zekâ hizmetini ayarlardan seçer.</li>
      </ul>
      <h2>Henüz yazılmamış bölümler</h2>
      <p>Veri sorumlusu, işleme amaçları, hukuki sebepler, aktarım ve başvuru hakları bölümleri hazırlanmaktadır.</p>
    </MetinSayfasi>
  );
}
