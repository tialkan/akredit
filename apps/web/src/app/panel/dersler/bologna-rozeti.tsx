import type { Ders } from "../../../veri/kaynak.ts";

const ETIKET: Record<Ders["bolognaDurumu"], { metin: string; sinif: string }> = {
  guncel: { metin: "✓ Güncel", sinif: "border-risk-dusuk bg-risk-dusuk-zemin text-risk-dusuk" },
  eksik: { metin: "! Eksik", sinif: "border-risk-yuksek bg-risk-yuksek-zemin text-risk-yuksek" },
  onay_bekliyor: { metin: "… Onay bekliyor", sinif: "border-risk-orta bg-risk-orta-zemin text-risk-orta" },
};

export function BolognaRozeti({ durum }: { durum: Ders["bolognaDurumu"] }) {
  const e = ETIKET[durum];
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-sm font-semibold ${e.sinif}`}>{e.metin}</span>
  );
}
