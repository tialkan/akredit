// Kurumun gördüğü değerlendirici erişim günlüğü (gunluk.oku yetkisi gerekir; değerlendirici göremez).

import type { Metadata } from "next";
import { BosDurum, SayfaBasligi } from "../../../bilesenler/temel.tsx";
import { ErisimGunluguGorunumu } from "../_portal/gorunum.tsx";
import { EYLEM, erisimGunlugu, hataBilgisi } from "../_portal/portal.ts";
import { servisBaglami } from "../_portal/sunucu.ts";

export const metadata: Metadata = { title: "Erişim günlüğü" };
export const dynamic = "force-dynamic";

const EYLEM_ADI: Record<string, string> = {
  [EYLEM.odaGoruntulendi]: "Kanıt odasını açtı",
  [EYLEM.kanitGoruntulendi]: "Kanıtı görüntüledi",
  [EYLEM.soruYanitlandi]: "Soru sordu",
  [EYLEM.erisimReddedildi]: "Erişimi reddedildi (süre doldu ya da yetki yok)",
};

export default async function ErisimGunluguSayfasi() {
  const b = await servisBaglami();
  if (!b)
    return (
      <>
        <SayfaBasligi baslik="Erişim günlüğü" />
        <BosDurum baslik="Erişim günlüğü bu sürümde kapalı" aciklama="Günlük yalnız gerçek kayıtlarla gösterilir." />
      </>
    );
  let kayitlar: Awaited<ReturnType<typeof erisimGunlugu>>;
  try {
    kayitlar = await erisimGunlugu(b);
  } catch (e) {
    const h = hataBilgisi(e);
    if (!h) throw e;
    return (
      <>
        <SayfaBasligi baslik="Erişim günlüğü" />
        <BosDurum baslik="Erişim yok" aciklama={h.ileti} />
      </>
    );
  }
  return (
    <ErisimGunluguGorunumu
      kayitlar={kayitlar.map((k) => ({
        id: k.id,
        zaman: new Date(k.zaman).toISOString(),
        kisiAdi: k.kisiAdi,
        islem: EYLEM_ADI[k.eylem] ?? k.eylem,
        ayrinti: [
          typeof k.ayrinti.soru === "string" ? `Soru: ${k.ayrinti.soru}` : "",
          typeof k.ayrinti.ozet === "string" ? `Kanıt ${k.ayrinti.ozet.slice(0, 8)}` : "",
          typeof k.ayrinti.arama === "string" ? `Arama: ${k.ayrinti.arama}` : "",
        ].join(""),
      }))}
    />
  );
}
