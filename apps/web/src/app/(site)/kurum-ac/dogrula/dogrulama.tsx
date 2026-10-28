"use client";

import { useState } from "react";
import { BaglantiDugme, Dugme } from "../../../../bilesenler/dugme.tsx";

type Durum =
  | { tur: "bos" | "gonderiliyor" }
  | { tur: "tamam"; kurumAdi: string; girisGonderildi: boolean }
  | { tur: "hata"; ileti: string };

export function Dogrulama({ belirtec }: { belirtec: string }) {
  const [durum, setDurum] = useState<Durum>({ tur: "bos" });
  async function ac() {
    setDurum({ tur: "gonderiliyor" });
    try {
      const y = await fetch("/api/kurum-acilisi/dogrula", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ belirtec }),
      });
      const v = (await y.json().catch(() => null)) as {
        hata?: string;
        kurumAdi?: string;
        girisGonderildi?: boolean;
      } | null;
      setDurum(
        y.ok
          ? { tur: "tamam", kurumAdi: v?.kurumAdi ?? "", girisGonderildi: v?.girisGonderildi === true }
          : { tur: "hata", ileti: v?.hata ?? "Kurum açılamadı. Yeniden deneyin." },
      );
    } catch {
      setDurum({ tur: "hata", ileti: "Sunucuya ulaşılamadı. Bağlantınızı denetleyip yeniden deneyin." });
    }
  }
  if (durum.tur === "tamam")
    return (
      <div role="status" className="mt-6 space-y-4">
        <p className="font-semibold">{durum.kurumAdi} açıldı. Kurum yöneticisi sizsiniz.</p>
        {durum.girisGonderildi ? (
          <p>
            Giriş bağlantınızı e-postanıza gönderdik. Bağlantıyı açınca kurulum sihirbazı başlar. Bağlantı 10 dakika
            geçerlidir.
          </p>
        ) : (
          <>
            <p>Giriş bağlantısı gönderilemedi. Giriş sayfasından kurumsal e-postanızla yeniden isteyin.</p>
            <BaglantiDugme href="/giris" tur="birincil">
              Giriş sayfası
            </BaglantiDugme>
          </>
        )}
      </div>
    );
  return (
    <div className="mt-6 space-y-4">
      <p>Bu düğmeye basınca kurumunuz açılır ve siz ilk yöneticisi olursunuz. Bağlantı bir kez kullanılabilir.</p>
      <Dugme tur="birincil" onClick={ac} disabled={durum.tur === "gonderiliyor"}>
        Kurumu aç
      </Dugme>
      <p role="alert" className="text-sm font-semibold text-risk-yuksek">
        {durum.tur === "hata" ? durum.ileti : ""}
      </p>
    </div>
  );
}
