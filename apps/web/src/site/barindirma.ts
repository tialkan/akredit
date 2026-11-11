// Barındırılan kurum hizmeti bayrağı (kurucu kararı 2026-11-01, docs/adr/0008-mcp-odagi-barindirma-askida.md).
// Kurum açma, pilot başvurusu ve kurum girişi yalnız AKREDIT_BARINDIRMA=1 iken açıktır. Varsayılan kapalıdır.
// Bütün sayfalar istek başına işlendiği için (src/app/layout.tsx, connection()) değer çalışma anında okunur.
// Demo (/deneyin) ve herkese açık MCP (/mcp) bu bayraktan etkilenmez.

export type Ortam = Record<string, string | undefined>;

export const barindirmaAcik = (ortam: Ortam = process.env): boolean => ortam.AKREDIT_BARINDIRMA === "1";

/** Kapalıyken yeni kayıt uçlarının döndüğü yanıt. 503: hizmet geçici olarak sunulmuyor. */
export const BARINDIRMA_KAPALI_YANITI = {
  durum: 503,
  govde: {
    hata: "Kurumlara barındırılan hizmet şu an sunulmuyor, yeni kayıt alınmıyor. Ayrıntı için iletişim sayfasına bakın.",
  },
} as const;

export function barindirmaKapaliYaniti(): Response {
  return Response.json(BARINDIRMA_KAPALI_YANITI.govde, { status: BARINDIRMA_KAPALI_YANITI.durum });
}

/**
 * Yalnız POST kabul eden form uçları tarayıcıda açılınca (GET) boş 405 yerine ilgili tanıtım sayfasına 303 ile
 * yönlenir. POST davranışı değişmez. Göreli adres: tarayıcı aynı sitede kalır, temel adres bilinmesi gerekmez.
 */
export function tanitimaYonlendir(yol: string): Response {
  return new Response(null, { status: 303, headers: { location: yol, "cache-control": "no-store" } });
}

/**
 * Panel ve değerlendirici portalının tanıtım sayfasına yönleneceği durum: barındırma kapalı, demo oturumu da
 * açılamıyor ve gerçek veri kipi. Bu durumda akredit.org'da oturum olamaz; sayfa veritabanına gitmeden yönlenir
 * (önceden veritabanı olmadığı için 500 dönüyordu). Barındırma ya da demo açıkken `null`: davranış aynen kalır.
 */
export function askidaPanelYonlendirmesi(ortam: Ortam = process.env, gercekVeri = true): "/kurum-demosu" | null {
  if (!gercekVeri || barindirmaAcik(ortam) || ortam.AKREDIT_DEMO === "1") return null;
  return "/kurum-demosu";
}
