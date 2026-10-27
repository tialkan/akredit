"use client";

// Programın Bologna sayfalarını okuma: sunucudan (adresle) ya da komut satırı aracının okuma dosyasını yükleyerek.

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Dugme } from "../../../../bilesenler/dugme.tsx";
import { bolognaIstegi, ORNEK_KIP_ILETISI } from "../_bologna/istemci.ts";

interface OkumaSonucu {
  yeni: boolean;
  dersSayisi: number;
  okunamayan: string[];
}

export function OkumaFormu({ programId, gercek }: { programId: string; gercek: boolean }) {
  const kimlik = useId();
  const yonlendirici = useRouter();
  const [ileti, setIleti] = useState<string | null>(null);
  const [bekliyor, setBekliyor] = useState(false);

  async function gonder(govde: unknown) {
    if (!gercek) return setIleti(ORNEK_KIP_ILETISI);
    setBekliyor(true);
    const s = await bolognaIstegi<OkumaSonucu>("POST", `/programlar/${programId}/okumalar`, govde);
    setBekliyor(false);
    if (!s.tamam) return setIleti(s.hata);
    const o = s.deger;
    setIleti(
      `${o.dersSayisi} ders okundu${o.okunamayan.length ? `, okunamayan: ${o.okunamayan.join(", ")}` : ""}.${o.yeni ? "" : " Bu okuma daha önce kaydedilmişti."}`,
    );
    yonlendirici.refresh();
  }

  async function dosya(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      await gonder({ veri: JSON.parse(await f.text()) });
    } catch {
      setIleti("Dosya okunamadı. Komut satırı aracının Bologna okuma dosyasını seçin.");
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-end gap-3">
      <Dugme onClick={() => gonder({})} disabled={bekliyor} aria-busy={bekliyor}>
        Sayfaları yeniden oku
      </Dugme>
      <div>
        <label htmlFor={`${kimlik}-dosya`} className="block font-semibold">
          ya da okuma dosyası yükleyin
        </label>
        <input id={`${kimlik}-dosya`} type="file" accept="application/json,.json" onChange={dosya} />
      </div>
      <p aria-live="polite" role="status" className="w-full">
        {ileti}
      </p>
    </div>
  );
}
