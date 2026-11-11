import type { MetadataRoute } from "next";
import { SAYFALAR, SON_GUNCELLEME } from "../site/icerik.ts";
import { tamAdres } from "../site/yapisal.ts";
import { KILAVUZLAR } from "./(site)/belgeler/icerik.ts";

// SAYFALAR'da kaydı olmayan (kendi üst verisini taşıyan) ama herkese açık ve çalışan sayfa.
const EK_YOLLAR = ["/deneyin"];

// lastModified: içeriğin son gerçek değişikliği (icerik.ts SON_GUNCELLEME); her derlemede değişmez.
export default function sitemap(): MetadataRoute.Sitemap {
  const tarih = new Date(`${SON_GUNCELLEME}T00:00:00Z`);
  return [
    ...Object.values(SAYFALAR).map((s) => ({ url: tamAdres(s.yol), lastModified: tarih })),
    ...EK_YOLLAR.map((yol) => ({ url: tamAdres(yol), lastModified: tarih })),
    ...KILAVUZLAR.map((k) => ({ url: tamAdres(`/belgeler/${k.yol}`), lastModified: tarih })),
  ];
}
