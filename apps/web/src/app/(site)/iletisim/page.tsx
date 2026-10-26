import type { Metadata } from "next";
import { MetinSayfasi } from "../../../bilesenler/logo.tsx";

export const metadata: Metadata = { title: "İletişim" };

export default function Iletisim() {
  return (
    <MetinSayfasi baslik="İletişim" ozet="Görüş, pilot katılımı ve güvenlik bildirimleri için.">
      <h2>Kurumlar ve pilot uygulama</h2>
      <p>Pilot uygulama için başvuru yolu henüz açılmadı. Açıldığında bu sayfada duyurulacaktır.</p>
      <h2>Proje sahibi</h2>
      <p>
        Tarık İsmet ALKAN: <a href="https://kulular.com.tr">kulular.com.tr</a>
      </p>
      <h2>Güvenlik bildirimi</h2>
      <p>Güvenlik açıklarını lütfen herkese açık yazmadan önce proje sahibine doğrudan bildirin.</p>
    </MetinSayfasi>
  );
}
