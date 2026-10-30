// Sınav taraması yükleme ucu (İP-43): çok sayfalı PDF, görüntü (PNG, JPEG, TIFF) ya da PDF'lerden oluşan ZIP.
//
// Denetim sırası: örnek kip, köken (Origin), kurum içi model (yoksa dosya okunmadan 409), gövde boyutu (parçalı
// aktarımda da sınırlı okunur), biçim, oturum ve yetki (servis), dosya türü (içerikten), depoya koyma, istek kaydı.
// Dosya burada yalnız depoya konur; işçi onu `kanitAl` ile `kaynakAyrinti.amac = "sinav_taramasi"` vererek kanıt
// olarak alır (metin ve YZ kuyruğuna girmez) ve taramayı çalıştırır.

import { ServisHatasi, sinavTarama } from "@akredit/servis";
import { GERCEK_VERI, servisBaglami } from "../../../../../../veri/sunucu.ts";
import { ortamdanDepo } from "../../../../../api/_ortak/kopruler.ts";
import { tekiller } from "../../../../../api/_ortak/sunucu.ts";
import { sinirliGovde } from "../../../../../api/istek/_ortak.ts";

export const dynamic = "force-dynamic";

/** Çok parçalı gövdede dosyanın üstüne tanınan pay. */
const GOVDE_PAYI = 64 * 1024;

const yanit = (durum: number, govde: Record<string, unknown>) =>
  Response.json(govde, { status: durum, headers: { "cache-control": "no-store" } });

export async function POST(istek: Request): Promise<Response> {
  if (!GERCEK_VERI) return yanit(409, { hata: "Örnek veri kipinde dosya yüklenemez." });
  const { kimlik } = await tekiller();
  const koken = istek.headers.get("origin");
  if (!koken || (koken !== new URL(kimlik.ayar.temelAdres).origin && !kimlik.ayar.izinliKokenler.includes(koken)))
    return yanit(403, { hata: "İstek bu siteden gelmedi. Sayfayı yenileyip yeniden deneyin." });
  const model = sinavTarama.yerelModelDurumu(process.env);
  if (!model.acik) return yanit(409, { hata: model.ileti });
  let depo = null;
  try {
    depo = ortamdanDepo(process.env);
  } catch {
    depo = null;
  }
  if (!depo) return yanit(503, { hata: "Kanıt deposu tanımlı değil. Yöneticinize bildirin." });

  const govde = await sinirliGovde(istek, sinavTarama.TARAMA_DOSYA_SINIRI + GOVDE_PAYI);
  if (!govde) return yanit(413, { hata: "Dosya çok büyük (en çok 100 MB). Kâğıtları bölerek yükleyin." });
  let form: FormData;
  try {
    form = await new Response(govde, {
      headers: { "content-type": istek.headers.get("content-type") ?? "" },
    }).formData();
  } catch {
    return yanit(400, { hata: "Gönderilen form okunamadı. Dosyayı yeniden seçip gönderin." });
  }
  const dosya = form.get("dosya");
  const olcmeAraciId = form.get("olcmeAraciId");
  if (!(dosya instanceof File) || typeof olcmeAraciId !== "string")
    return yanit(400, { hata: "Taranmış kâğıtların dosyasını ve sınavı seçin." });

  const b = await servisBaglami();
  try {
    const r = await sinavTarama.taramaIstegiKaydet(
      b,
      { olcmeAraciId },
      { veri: new Uint8Array(await dosya.arrayBuffer()), dosyaAdi: dosya.name },
      { depo, ortam: process.env },
    );
    return yanit(201, { istekId: r.istekId });
  } catch (e) {
    if (e instanceof ServisHatasi) return yanit(e.durum, { hata: e.message });
    if (e && typeof e === "object" && "issues" in e) return yanit(400, { hata: "Sınav seçimi geçersiz." });
    throw e;
  }
}
