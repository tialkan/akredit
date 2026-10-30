"use client";

import { useActionState } from "react";
import { Dugme } from "../../../../bilesenler/dugme.tsx";
import { type DilEylemDurumu, dilBulgulariniKaydetEylem } from "./eylem.ts";

export function DilBulgulariFormu({ raporId }: { raporId: string }) {
  const [durum, eylem, bekliyor] = useActionState<DilEylemDurumu, FormData>(dilBulgulariniKaydetEylem, {
    durum: "bos",
  });
  return (
    <form action={eylem} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="raporId" value={raporId} />
      <Dugme type="submit" disabled={bekliyor}>
        Bulguları onay kutusuna ekle
      </Dugme>
      <p role="status" className="text-sm">
        {durum.durum === "bos" ? "" : durum.ileti}
      </p>
    </form>
  );
}
