// Anket bağlantısı için QR kodu (SVG). Yazdırılıp sınıfta gösterilebilir; bağlantı belirteç içermez
// (açık bağlantılı anket), tekrar yanıt engeli tarayıcıdaki kimliksiz belirteçle yapılır.

import QRCode from "qrcode";

export async function qrSvg(metin: string): Promise<string> {
  if (!/^https?:\/\//u.test(metin)) throw new RangeError("QR kodu yalnız bağlantı için üretilir.");
  return QRCode.toString(metin, { type: "svg", errorCorrectionLevel: "M", margin: 2 });
}
