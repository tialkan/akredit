import type { Metadata } from "next";
import Link from "next/link";
import { Bolum, Metin, SayfaBasi, TaslakNotu, YapisalVeri } from "../../../site/bilesenler.tsx";
import { SAYFALAR } from "../../../site/icerik.ts";
import { sayfaUstVerisi } from "../../../site/yapisal.ts";

export const metadata: Metadata = sayfaUstVerisi(SAYFALAR.guvenlik);

// Dayanak: docs/guvenlik/README.md, docs/hukuk/README.md, docs/raporlar/IP-02, IP-09, IP-27, IP-28.

export default function Guvenlik() {
  return (
    <>
      <YapisalVeri sayfa={SAYFALAR.guvenlik} />
      <SayfaBasi
        sayfa={SAYFALAR.guvenlik}
        ozet="Bu sayfa sistemin bugün nasıl kurulduğunu anlatır. Bağımsız sızma testi henüz yapılmadı. Hukuk metinleri taslaktır."
      />
      <Bolum id="kayit" baslik="İz bırakmadan değiştirilemez kayıt">
        <Metin>
          <ul>
            <li>
              Kanıt dosyaları içerik özetiyle (SHA-256) saklanır. Üzerine yazılmaz; yeni sürüm ayrı kayıt olur. Aynı
              içerik iki kez eklenmez.
            </li>
            <li>Kayıt iz bırakmadan değiştirilemez. Her değişiklik, eskisinin yanında yeni kayıt olarak görünür.</li>
            <li>Öneri, karar ve günlük kayıtları yalnız eklenir. Bu kural veritabanında da uygulanır.</li>
            <li>
              Günlük kayıtları özet zinciriyle birbirine bağlıdır. Araya kayıt sokulursa ya da bir kayıt değişirse
              zincir bozulur.
            </li>
          </ul>
        </Metin>
      </Bolum>
      <Bolum id="yalitim" baslik="Kurumlar arası yalıtım" zemin>
        <Metin>
          <p>
            Her kurumun verisi veritabanında satır güvenliğiyle ayrılır. Uygulama kurum verisine yalnız o kurumla
            sınırlanmış bir işlem içinde erişir. Başka kurumun kaydı sorulduğunda "bulunamadı" döner. Bu davranış
            otomatik testlerle sınanır.
          </p>
          <p>Yetki her istekte sunucuda denetlenir. Reddedilen erişim de günlüğe yazılır.</p>
        </Metin>
      </Bolum>
      <Bolum id="yz" baslik="Yapay zekâ güvenceleri">
        <Metin>
          <ul>
            <li>
              Belgedeki, web sayfasındaki ve e-postadaki metin modele veri olarak gider. İçindeki komut benzeri cümleler
              işlenmez.
            </li>
            <li>Model bir kayıt yazmak isterse bu doğrudan yapılmaz; bekleyen bir onaya dönüşür.</li>
            <li>Parola, doğrulama kodu ve oturum bilgisi modele ve günlüğe girmez.</li>
            <li>
              Yurt dışındaki hizmet ancak kurum izin verirse kullanılır; o zaman da kişisel veriler maskelenir.{" "}
              <Link href="/yapay-zeka#veri">Ayrıntı</Link>
            </li>
          </ul>
        </Metin>
      </Bolum>
      <Bolum id="kvkk" baslik="Kişisel veriler" not="KVKK" zemin>
        <Metin>
          <ul>
            <li>
              Akredit'i kullanan üniversite veri sorumlusudur. Platformu işleten taraf veriyi üniversite adına işler.
            </li>
            <li>Öğrenci numarası kuruma özgü anahtarla takma ada çevrilir. Gerçek kimlikle eşleme üniversitededir.</li>
            <li>Anket yanıtı hiçbir yerde kişiye bağlanmaz.</li>
            <li>
              KVKK silme hakkı korunur. Silme talebi kabul edilirse takma adı kişiyle eşleyen bilgi silinir. Kayıtlar
              kimseyle ilişkilendirilemez hâle gelir. Silme işlemi de günlüğe yeni kayıt olarak girer.
            </li>
          </ul>
        </Metin>
        <TaslakNotu>
          <p className="font-semibold">Hukuk metinleri taslaktır.</p>
          <p className="mt-1">
            Aydınlatma metinleri, gizlilik politikası, çerez politikası, kullanım koşulları, veri işleme sözleşmesi,
            saklama ve imha politikası ile yurt dışı aktarım değerlendirmesi hazırlandı. Hiçbiri avukat incelemesinden
            geçmedi ve bağlayıcı değildir. İşletmecinin tüzel kimliği henüz belirlenmedi.
          </p>
        </TaslakNotu>
        <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2">
          <li>
            <Link href="/kvkk" className="font-semibold text-vurgu underline underline-offset-4">
              KVKK (taslak)
            </Link>
          </li>
          <li>
            <Link href="/gizlilik" className="font-semibold text-vurgu underline underline-offset-4">
              Gizlilik (taslak)
            </Link>
          </li>
          <li>
            <Link href="/kosullar" className="font-semibold text-vurgu underline underline-offset-4">
              Kullanım koşulları (taslak)
            </Link>
          </li>
        </ul>
      </Bolum>
      <Bolum id="durum" baslik="Denetim durumu">
        <Metin>
          <p>
            Tehdit modeli ve OWASP ASVS 4.0.3 düzey 2 kontrol listesi yazıldı. Kritik ya da yüksek önemde açık bulgu
            varken üretime çıkılmaması kuraldır. Bağımsız sızma testinin kapsamı hazırlandı; test henüz yapılmadı.
          </p>
          <h3>Açık bildirimi</h3>
          <p>
            Bir güvenlik açığı bulduğunuzu düşünüyorsanız herkese açık yazmadan önce{" "}
            <Link href="/iletisim">İletişim</Link> sayfasındaki yoldan bildirin. İlk yanıt hedefi 3 iş günüdür.
          </p>
        </Metin>
      </Bolum>
    </>
  );
}
