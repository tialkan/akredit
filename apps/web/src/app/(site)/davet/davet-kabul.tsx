"use client";

// Davet kabulü: kullanıcı önce giriş yapar (davet edilen e-postayla), sonra daveti kabul eder.

import { useState } from "react";
import { BaglantiDugme, Dugme } from "../../../bilesenler/dugme.tsx";

export function DavetKabul({ belirtec }: { belirtec: string }) {
  const [durum, setDurum] = useState<{ tur: "bos" | "gonderiliyor" | "tamam" } | { tur: "hata"; ileti: string }>({
    tur: "bos",
  });
  async function kabulEt() {
    setDurum({ tur: "gonderiliyor" });
    try {
      const y = await fetch("/api/davet", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ belirtec }),
      });
      const v = (await y.json().catch(() => null)) as { hata?: unknown } | null;
      setDurum(
        y.ok
          ? { tur: "tamam" }
          : { tur: "hata", ileti: typeof v?.hata === "string" ? v.hata : "Davet kabul edilemedi. Yeniden deneyin." },
      );
    } catch {
      setDurum({ tur: "hata", ileti: "Sunucuya ulaşılamadı. Bağlantınızı denetleyip yeniden deneyin." });
    }
  }
  if (durum.tur === "tamam")
    return (
      <div className="mt-6 space-y-4">
        <p role="status">Davet kabul edildi. Artık kurumunuzun paneline girebilirsiniz.</p>
        <BaglantiDugme href="/panel" tur="birincil">
          Panele git
        </BaglantiDugme>
      </div>
    );
  return (
    <div className="mt-6 space-y-4">
      <p>Daveti kabul etmek için davet edilen e-posta adresiyle giriş yapmış olmalısınız.</p>
      <div className="flex flex-wrap gap-3">
        <Dugme tur="birincil" onClick={kabulEt} disabled={durum.tur === "gonderiliyor"}>
          Daveti kabul et
        </Dugme>
        <BaglantiDugme href="/giris">Önce giriş yap</BaglantiDugme>
      </div>
      <p role="alert" className="text-sm text-risk-yuksek">
        {durum.tur === "hata" ? durum.ileti : ""}
      </p>
    </div>
  );
}
