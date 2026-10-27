// Kurumun gördüğü değerlendirici erişim günlüğü (gunluk.oku yetkisi gerekir; değerlendirici göremez).

import type { Metadata } from "next";
import { BosDurum, SayfaBasligi } from "../../../bilesenler/temel.tsx";
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
      <BosDurum baslik="Erişim günlüğü bu sürümde kapalı" aciklama="Günlük yalnız gerçek kayıtlarla gösterilir." />
    );
  let kayitlar: Awaited<ReturnType<typeof erisimGunlugu>>;
  try {
    kayitlar = await erisimGunlugu(b);
  } catch (e) {
    const h = hataBilgisi(e);
    if (!h) throw e;
    return <BosDurum baslik="Erişim yok" aciklama={h.ileti} />;
  }
  const zaman = new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  });
  return (
    <>
      <SayfaBasligi
        baslik="Değerlendirici erişim günlüğü"
        aciklama="Değerlendiricilerin her görüntülemesi ve sorusu burada. Kayıtlar değiştirilemez."
      />
      {kayitlar.length === 0 ? (
        <p>Henüz kayıt yok.</p>
      ) : (
        <table className="w-full text-sm">
          <caption className="sr-only">Değerlendirici erişim kayıtları, en yeni önce</caption>
          <thead>
            <tr className="text-left">
              <th scope="col">Zaman</th>
              <th scope="col">Kişi</th>
              <th scope="col">İşlem</th>
              <th scope="col">Ayrıntı</th>
            </tr>
          </thead>
          <tbody>
            {kayitlar.map((k) => (
              <tr key={k.id} className="border-t border-cizgi align-top">
                <td>{zaman.format(new Date(k.zaman))}</td>
                <td>{k.kisiAdi ?? "Bilinmiyor"}</td>
                <td>{EYLEM_ADI[k.eylem] ?? k.eylem}</td>
                <td className="whitespace-pre-wrap">
                  {typeof k.ayrinti.soru === "string" ? `Soru: ${k.ayrinti.soru}` : ""}
                  {typeof k.ayrinti.ozet === "string" ? `Kanıt ${k.ayrinti.ozet.slice(0, 8)}` : ""}
                  {typeof k.ayrinti.arama === "string" ? `Arama: ${k.ayrinti.arama}` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
