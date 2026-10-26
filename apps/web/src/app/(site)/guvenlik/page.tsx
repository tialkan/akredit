import type { Metadata } from "next";
import { MetinSayfasi } from "../../../bilesenler/logo.tsx";

export const metadata: Metadata = { title: "Güvenlik" };

export default function Guvenlik() {
  return (
    <MetinSayfasi
      baslik="Güvenlik yaklaşımı"
      ozet="Bu sayfa tasarım ilkelerimizi anlatır. Ürün geliştirme aşamasındadır; bağımsız güvenlik denetimi henüz yapılmamıştır."
    >
      <h2>Değiştirilemez kayıt</h2>
      <ul>
        <li>Kanıt dosyaları içerik özetiyle (SHA-256) saklanır; üzerine yazılmaz, silinmez.</li>
        <li>Öneri, karar ve günlük kayıtları yalnız eklenir.</li>
      </ul>
      <h2>Kurumlar arası yalıtım</h2>
      <p>Her kurumun verisi ayrı tutulur; bir kurumun kullanıcısı başka kurumun verisini göremez.</p>
      <h2>Yapay zekâ ile ilgili güvenceler</h2>
      <ul>
        <li>Belgelerdeki metinler yapay zekâya talimat olarak geçmez; yalnız veri olarak okunur.</li>
        <li>Parola, doğrulama kodu ve oturum bilgisi yapay zekâya ve günlüğe girmez.</li>
        <li>Kurum adına beyan ve dış kuruma gönderim her zaman bir kişinin kararıdır.</li>
      </ul>
      <h2>Açık kaynak</h2>
      <p>Kod açıktır; kurumlar ve araştırmacılar nasıl çalıştığını inceleyebilir.</p>
      <h2>Güvenlik açığı bildirimi</h2>
      <p>
        Bir açık bulduğunuzu düşünüyorsanız lütfen herkese açık yazmadan önce İletişim sayfasındaki yoldan bildirin.
      </p>
    </MetinSayfasi>
  );
}
