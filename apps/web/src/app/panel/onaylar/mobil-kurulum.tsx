"use client";

// Mobil kurulum (İP-33): servis çalışanını kaydeder, bildirim iznini yönetir, bağlantı durumunu izler.
// İzin reddedilir ya da tarayıcı desteklemezse e-posta özeti yolu gösterilir.

import { Bell, BellOff, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { Dugme } from "../../../bilesenler/dugme.tsx";
import { type BildirimYolu, base64UrlCoz, bildirimMetni, bildirimYolu, type IzinDurumu, KAPSAM } from "./mobil.ts";

const GENEL_ANAHTAR = process.env.NEXT_PUBLIC_AKREDIT_VAPID_GENEL;

export function useCevrimici(): boolean {
  const [cevrimici, setCevrimici] = useState(true);
  useEffect(() => {
    const guncelle = () => setCevrimici(navigator.onLine);
    guncelle();
    window.addEventListener("online", guncelle);
    window.addEventListener("offline", guncelle);
    return () => {
      window.removeEventListener("online", guncelle);
      window.removeEventListener("offline", guncelle);
    };
  }, []);
  return cevrimici;
}

function izinOku(): IzinDurumu {
  if (typeof window === "undefined" || !("Notification" in window)) return "desteklenmiyor";
  return Notification.permission;
}

function anlikDestegi(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

export function MobilKurulum() {
  const [yol, setYol] = useState<BildirimYolu | null>(null);
  const [mesgul, setMesgul] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register(`${KAPSAM}/sw.js`, { scope: KAPSAM }).catch(() => undefined);
    }
    setYol(bildirimYolu(izinOku(), anlikDestegi(), GENEL_ANAHTAR));
  }, []);

  const izinIste = async () => {
    setMesgul(true);
    try {
      const izin = await Notification.requestPermission();
      let sonuc = bildirimYolu(izin, anlikDestegi(), GENEL_ANAHTAR);
      if (sonuc.yol === "anlik" && GENEL_ANAHTAR) {
        try {
          const kayit = await navigator.serviceWorker.ready;
          const abonelik = await kayit.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: base64UrlCoz(GENEL_ANAHTAR) as BufferSource,
          });
          const y = await fetch(`${KAPSAM}/abonelik`, {
            method: "POST",
            credentials: "same-origin",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(abonelik.toJSON()),
          });
          if (!y.ok) sonuc = { yol: "eposta", neden: "yapilandirilmadi" };
        } catch {
          sonuc = { yol: "eposta", neden: "yapilandirilmadi" };
        }
      }
      setYol(sonuc);
    } finally {
      setMesgul(false);
    }
  };

  if (!yol) return null;
  const simge =
    yol.yol === "anlik" ? (
      <Bell aria-hidden className="size-5 shrink-0" />
    ) : yol.yol === "eposta" ? (
      <Mail aria-hidden className="size-5 shrink-0" />
    ) : (
      <BellOff aria-hidden className="size-5 shrink-0" />
    );
  return (
    <section
      aria-label="Bildirimler"
      data-bildirim-yolu={yol.yol}
      className="mb-4 flex flex-wrap items-center gap-3 rounded-sm border border-cizgi bg-yuzey p-3 text-sm"
    >
      {simge}
      <p className="min-w-0 flex-1" role="status">
        {bildirimMetni(yol)}
      </p>
      {yol.yol === "izin-iste" ? (
        <Dugme boy="orta" tur="birincil" disabled={mesgul} onClick={() => void izinIste()}>
          Bildirimleri aç
        </Dugme>
      ) : null}
    </section>
  );
}
