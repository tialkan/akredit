import type { Metadata } from "next";
import { HataSayfasi } from "../../site/hata-sayfasi.tsx";

// Bakım ya da geçici erişilemezlik sayfası (İP-49). Bakım sırasında ters vekil bütün istekleri bu adrese
// yönlendirebilir. Arama motorlarına kapalıdır.

export const metadata: Metadata = { title: "Bakımda", robots: { index: false } };

export default function Bakim() {
  return (
    <HataSayfasi kod="503" baslik="Kısa bir bakım yapıyoruz">
      <p>Akredit geçici olarak kullanılamıyor. Birkaç dakika sonra sayfayı yenileyin.</p>
    </HataSayfasi>
  );
}
