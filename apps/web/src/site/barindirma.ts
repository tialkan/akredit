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
