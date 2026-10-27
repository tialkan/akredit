import type { Metadata } from "next";
import { MetinSayfasi } from "../../../bilesenler/logo.tsx";

export const metadata: Metadata = { title: "Gizlilik" };

export default function Gizlilik() {
  return (
    <MetinSayfasi baslik="Gizlilik politikası">
      <div role="note" className="mt-6 rounded-lg border-2 border-risk-orta bg-risk-orta-zemin p-4 text-risk-orta">
        <p className="mt-0 font-bold">Bu sayfa taslaktır.</p>
        <p className="mt-1">Hukuki incelemeden geçmemiştir ve bağlayıcı değildir.</p>
      </div>
      <h2>Ne topluyoruz?</h2>
      <p>
        İletişim formunda adınızı, e-postanızı ve iletinizi; güvenlik için bağlantı kayıtlarını (adres ve zaman)
        tutarız. Üniversitelerin platformdaki verileri için üniversite sorumludur, biz onun adına işleriz.
      </p>
      <h2>Ne yapmıyoruz?</h2>
      <ul>
        <li>Veri satmıyoruz.</li>
        <li>Reklam ya da izleme çerezi kullanmıyoruz; yalnız girişin çalışması için gerekli çerezler vardır.</li>
        <li>Üniversite verisini yapay zekâ modellerini eğitmek için kullanmıyoruz.</li>
      </ul>
      <h2>Haklarınız</h2>
      <p>
        Platformdaki verilerinizle ilgili başvuruları üniversitenize yapın. Bize gelen başvuruları üniversiteye
        iletiriz. Site ile ilgili sorular için <a href="/iletisim">iletişim</a> sayfasını kullanın.
      </p>
    </MetinSayfasi>
  );
}
