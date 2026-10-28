"use client";

import type { YoneticiOzeti as Ozet } from "@akredit/cekirdek";
import { useBildirim } from "../../../bilesenler/etkilesimli.tsx";
import { YoneticiOzeti } from "../onaylar/yonetici-ozeti.tsx";

/** Örnek kipte nihai rapor onayının başındaki özet. Gerçek gönderim onay kutusunda kişi kararıyla verilir. */
export function NihaiOnayOrnegi({ ozet }: { ozet: Ozet }) {
  const bildir = useBildirim();
  return (
    <YoneticiOzeti
      baslik="Nihai rapor onayı: yönetici özeti"
      ozet={ozet}
      onayla={() => bildir("Onayınız özetle birlikte kaydedildi (örnek veri).", "basari")}
    />
  );
}
