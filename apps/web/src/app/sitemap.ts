import type { MetadataRoute } from "next";
import { SAYFALAR, SON_GUNCELLEME } from "../site/icerik.ts";
import { tamAdres } from "../site/yapisal.ts";
import { KILAVUZLAR } from "./(site)/belgeler/icerik.ts";

// Askıdaki sayfa site haritasına girmez (ADR 0008): arama sonucunda çalışmayan bir hizmet öne çıkmasın.
const HARITA_DISI = new Set(["/kurum-demosu"]);

// lastModified: içeriğin son gerçek değişikliği (icerik.ts SON_GUNCELLEME); her derlemede değişmez.
export default function sitemap(): MetadataRoute.Sitemap {
  const tarih = new Date(`${SON_GUNCELLEME}T00:00:00Z`);
  return [
    ...Object.values(SAYFALAR)
      .filter((s) => !HARITA_DISI.has(s.yol))
      .map((s) => ({ url: tamAdres(s.yol), lastModified: tarih })),
    ...KILAVUZLAR.map((k) => ({ url: tamAdres(`/belgeler/${k.yol}`), lastModified: tarih })),
  ];
}
