import type { Metadata } from "next";
import { MetinSayfasi } from "../../../bilesenler/logo.tsx";

export const metadata: Metadata = { title: "Kullanım koşulları" };

export default function Kosullar() {
  return (
    <MetinSayfasi baslik="Kullanım koşulları">
      <div role="note" className="mt-6 rounded-lg border-2 border-risk-orta bg-risk-orta-zemin p-4 text-risk-orta">
        <p className="mt-0 font-bold">Bu sayfa taslaktır.</p>
        <p className="mt-1">Hukuki incelemeden geçmemiştir ve bağlayıcı değildir.</p>
      </div>
      <ul>
        <li>Hesaplar üniversite tarafından açılır. Giriş bilgilerinizi kimseyle paylaşmayın.</li>
        <li>
          Yapay zekâ yalnız öneri üretir ve yanılabilir. Üniversite adına beyan, onay ve dış kuruma gönderim sizin
          kararınızdır ve adınızla kaydedilir.
        </li>
        <li>Akredit, akreditasyon sonucunu garanti etmez.</li>
        <li>Kanıtlar, onaylar ve kayıtlar değiştirilemez; düzeltme yeni bir kayıtla yapılır.</li>
        <li>Yüklenen verinin hukuka uygun olmasından üniversite sorumludur.</li>
        <li>Yazılım Apache-2.0 lisanslıdır. Üniversitenin verisi üniversitenindir.</li>
      </ul>
    </MetinSayfasi>
  );
}
