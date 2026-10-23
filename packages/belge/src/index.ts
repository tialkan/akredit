// @akredit/belge: belge işleme. Kapsam ve kabul ölçütleri: plan/ip/IP-04-belge-isleme.md
// Aşağıdaki işlevler İP-04'te uygulanır. İmzalar paketler arası sözleşmedir; değiştirmek gerekirse ADR yaz.

import type {
  BelgeIpucu,
  BelgeMetni,
  BelgeTuru,
  CikarmaSecenekleri,
  DocxModeli,
  Parca,
  ParcalamaSecenekleri,
  TabloVerisi,
  XlsxSayfasi,
} from "./turler.ts";

export type * from "./turler.ts";

const UYGULANMADI = "Henüz uygulanmadı (İP-04).";

/** Baytların başından ve ipucundan belge türünü tahmin eder. */
export function turTahminEt(_veri: Uint8Array, _ipucu?: BelgeIpucu): BelgeTuru {
  throw new Error(UYGULANMADI);
}

/** Belgeden çapalı metin, tablolar ve uyarılar çıkarır. Taranmış belgede `ocrGerekli` true döner. */
export async function metinCikar(
  _veri: Uint8Array,
  _ipucu?: BelgeIpucu,
  _secenek?: CikarmaSecenekleri,
): Promise<BelgeMetni> {
  throw new Error(UYGULANMADI);
}

/** XLSX, ODS ya da CSV dosyasını ham hücre tablosu olarak okur. */
export async function tabloOku(_veri: Uint8Array, _ipucu?: BelgeIpucu): Promise<TabloVerisi> {
  throw new Error(UYGULANMADI);
}

/** Belge metnini arama ve atıf için çapalı parçalara böler. */
export function parcala(_belge: BelgeMetni, _secenek?: ParcalamaSecenekleri): Parca[] {
  throw new Error(UYGULANMADI);
}

/** Rapor modelinden Word (.docx) dosyası üretir. */
export async function docxUret(_model: DocxModeli): Promise<Uint8Array> {
  throw new Error(UYGULANMADI);
}

/** Tablolardan Excel (.xlsx) dosyası üretir. */
export async function xlsxUret(_sayfalar: XlsxSayfasi[]): Promise<Uint8Array> {
  throw new Error(UYGULANMADI);
}
