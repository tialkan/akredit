// Proje ayrıntılarındaki durum etiketi: rengin yanında her zaman yazılı ad (yalnız renge dayanmaz).
import { PROJE_DURUM_ADI, type ProjeDurumu } from "./icerik.ts";

const SINIF: Record<ProjeDurumu, string> = {
  calisiyor: "border-risk-dusuk bg-risk-dusuk-zemin text-risk-dusuk",
  askida: "border-risk-orta bg-risk-orta-zemin text-risk-orta",
  taslak: "border-cizgi-guclu bg-yuzey-2 text-metin",
};

export function DurumEtiketi({ durum }: { durum: ProjeDurumu }) {
  return (
    <span
      data-durum={durum}
      className={`inline-flex shrink-0 items-center rounded-sm border px-2 py-0.5 text-sm whitespace-nowrap ${SINIF[durum]}`}
    >
      {PROJE_DURUM_ADI[durum]}
    </span>
  );
}
