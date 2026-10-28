import type { MetadataRoute } from "next";
import { SITE_ADRESI } from "../site/icerik.ts";

// Deneme ortamında (AKREDIT_ORTAM=hazirlik) bütün site dizine kapalıdır. Üretimde tanıtım sayfaları açıktır;
// panel, API ve kişiye özel bağlantılar kapalıdır. Arama ve alıntı botlarına izin verilir; model eğitimi
// botları (GPTBot, ClaudeBot, Google-Extended, CCBot) için karar: kapalı (kontrol listesi 115a).

const KAPALI = ["/panel", "/api/", "/degerlendirici", "/davet", "/onay/", "/anket/"];
const EGITIM_BOTLARI = ["GPTBot", "ClaudeBot", "Google-Extended", "CCBot"];

// Ortam değişkeni çalışma anında okunur; derleme anına sabitlenmez.
export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  if (process.env.AKREDIT_ORTAM === "hazirlik") return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: KAPALI },
      { userAgent: EGITIM_BOTLARI, disallow: "/" },
    ],
    sitemap: `${SITE_ADRESI}/sitemap.xml`,
    host: SITE_ADRESI,
  };
}
