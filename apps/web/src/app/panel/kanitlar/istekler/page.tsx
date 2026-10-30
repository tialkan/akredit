// Belge istekleri (İP-45): idari birimlerden hesapsız belge isteme ve durum listesi. Gelen belge doğrulanmamış
// kanıttır; kabul, onay kutusundaki kanıt etiketi önerisine verilen karardır.

import { belgeIstegi } from "@akredit/servis";
import type { Metadata } from "next";
import Link from "next/link";
import { SayfaBasligi } from "../../../../bilesenler/temel.tsx";
import { GERCEK_VERI, servisBaglami } from "../../../../veri/sunucu.ts";
import { IstekFormu } from "./istek-formu.tsx";

export const metadata: Metadata = { title: "Belge istekleri" };
export const dynamic = "force-dynamic";

const DURUM_ADI: Record<belgeIstegi.IstekDurumu, string> = {
  bekliyor: "Bekliyor",
  suresi_doldu: "Süresi doldu",
  yuklendi: "Yüklendi, kabul bekliyor",
  kabul_edildi: "Kabul edildi",
  reddedildi: "Reddedildi",
};

const tarih = (x: string) => new Date(x).toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" });

export default async function IsteklerSayfasi() {
  const liste = GERCEK_VERI ? await belgeIstegi.istekleri(await servisBaglami()) : [];
  return (
    <>
      <SayfaBasligi
        baslik="Belge istekleri"
        aciklama="İdari birimlerden hesap açmadan belge isteyin. Birim yetkilisi tek kullanımlık bağlantıyla yükler; belge siz kabul edene kadar kanıt sayılmaz."
      />
      <section aria-labelledby="yeni-istek" className="mb-8">
        <h2 id="yeni-istek" className="mb-3 text-lg font-semibold">
          Yeni istek
        </h2>
        {GERCEK_VERI ? (
          <IstekFormu varsayilanGun={belgeIstegi.VARSAYILAN_GUN} enUzunGun={belgeIstegi.EN_UZUN_GUN} />
        ) : (
          <p>Örnek veriyle çalışılıyor; istek oluşturulamaz.</p>
        )}
      </section>
      <section aria-labelledby="istek-listesi">
        <h2 id="istek-listesi" className="mb-3 text-lg font-semibold">
          İstekler
        </h2>
        {liste.length === 0 ? (
          <p className="text-soluk">Henüz istek yok.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-cizgi">
                  <th scope="col" className="py-2 pr-4">
                    İstenen
                  </th>
                  <th scope="col" className="py-2 pr-4">
                    Birim
                  </th>
                  <th scope="col" className="py-2 pr-4">
                    Son tarih
                  </th>
                  <th scope="col" className="py-2 pr-4">
                    E-posta
                  </th>
                  <th scope="col" className="py-2">
                    Durum
                  </th>
                </tr>
              </thead>
              <tbody>
                {liste.map((s) => (
                  <tr key={s.id} className="border-b border-cizgi align-top">
                    <td className="py-2 pr-4">{s.istenen}</td>
                    <td className="py-2 pr-4">{s.birimAdi ?? "Belirtilmedi"}</td>
                    <td className="py-2 pr-4">{tarih(s.son)}</td>
                    <td className="py-2 pr-4">
                      {s.gonderim?.durum === "gonderildi" ? (
                        "Gönderildi"
                      ) : (
                        <>
                          <span className="font-semibold">Gönderilmedi</span>
                          {s.gonderim?.neden ? <span className="block text-soluk">{s.gonderim.neden}</span> : null}
                        </>
                      )}
                    </td>
                    <td className="py-2">
                      {DURUM_ADI[s.durum]}
                      {s.durum === "yuklendi" ? (
                        <Link href="/panel/onaylar" className="block underline underline-offset-4">
                          İncele ve karar ver
                        </Link>
                      ) : null}
                      {s.kanitId && s.durum === "kabul_edildi" ? (
                        <Link href={`/panel/kanitlar/${s.kanitId}`} className="block underline underline-offset-4">
                          Kanıtı aç
                        </Link>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
