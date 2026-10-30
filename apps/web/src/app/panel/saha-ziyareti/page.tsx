// Saha ziyareti hazırlık simülatörü (İP-48). Değerlendiricinin sorabileceği sorular kuralla çıkarılır (her
// ölçüt ve raporda EKSİK işaretli her cümle), her soruya onaylı kanıt eşlenir. Cevap yazılmaz. Hazırlık
// oranı kanıtlı soru payıdır; ziyaretin sonucunu öngören bir rakam gösterilmez.

import type { Metadata } from "next";
import Link from "next/link";
import { dugmeSinifi } from "../../../bilesenler/dugme.tsx";
import { BosDurum, EksikIsareti, Rozet, SayfaBasligi } from "../../../bilesenler/temel.tsx";
import { panelVeriKaynagi } from "../../../veri/sunucu.ts";
import { provaKaydet } from "./eylem.ts";
import { KAYNAK_ADLARI, oranMetni, provaOzeti, ROL_SECENEKLERI, SAHA_CERCEVELERI, secimOku } from "./gorunum.ts";
import { GERCEK_VERI, sahaDurumu } from "./sunucu.ts";

export const metadata: Metadata = { title: "Saha ziyareti hazırlığı" };

const ILETILER: Record<string, string> = {
  hazir: "İşaretiniz kaydedildi.",
  gorev: "Eksik kaydedildi. Kalite komisyonu için görev açıldı.",
  "gorev-var": "Bu soru için açık bir görev zaten var. İşaretiniz kaydedildi.",
  yetki: "Bu programda prova işareti koyma yetkiniz yok. Kalite komisyonuna başvurun.",
  hata: "İşaret kaydedilemedi. Sayfayı yenileyip yeniden deneyin.",
  ornek: "Örnek veri kipinde işaret kaydedilmez.",
};

const secimSinifi =
  "mt-1 block w-full rounded-sm border border-cizgi bg-yuzey px-3 py-2 text-metin focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-vurgu";

export default async function SahaZiyaretiSayfasi({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const p = await searchParams;
  const kaynak = await panelVeriKaynagi();
  const programlar = (await kaynak.programlar()).map((x) => ({ id: x.id, ad: x.ad }));
  const baslik = (
    <SayfaBasligi
      baslik="Saha ziyareti hazırlığı"
      aciklama="Değerlendiricinin sorabileceği sorular ve her sorunun kanıtı. Cevap metni yazılmaz; kanıtı olmayan soru hazırlıksız görünür."
    />
  );
  if (!programlar.length)
    return (
      <>
        {baslik}
        <BosDurum baslik="Yetkili olduğunuz bir program yok." />
      </>
    );
  const secim = secimOku(p, programlar);
  const programAd = programlar.find((x) => x.id === secim.programId)?.ad ?? "";
  const sonuc = await sahaDurumu(secim.programId, programAd, secim.cerceveKod);
  const ileti = typeof p.ileti === "string" ? ILETILER[p.ileti] : undefined;

  return (
    <>
      {baslik}
      <form method="get" className="mb-6 grid gap-4 rounded-sm border border-cizgi bg-yuzey p-4 sm:grid-cols-4">
        <label className="block text-sm font-semibold">
          Program
          <select name="program" defaultValue={secim.programId} className={secimSinifi}>
            {programlar.map((x) => (
              <option key={x.id} value={x.id}>
                {x.ad}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Çerçeve
          <select name="cerceve" defaultValue={secim.cerceveKod} className={secimSinifi}>
            {SAHA_CERCEVELERI.map(([k, ad]) => (
              <option key={k} value={k}>
                {ad}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold">
          Prova rolü
          <select name="rol" defaultValue={secim.rol} className={secimSinifi}>
            {ROL_SECENEKLERI.map(([k, ad]) => (
              <option key={k} value={k}>
                {ad}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <button type="submit" className={dugmeSinifi("birincil")}>
            Soruları göster
          </button>
        </div>
      </form>

      {ileti ? (
        <p role="status" className="mb-6 rounded-sm border border-cizgi bg-yuzey-2 px-4 py-3">
          {ileti}
        </p>
      ) : null}

      {!sonuc.tamam ? (
        <p
          role="alert"
          className="rounded-sm border border-risk-yuksek bg-risk-yuksek-zemin px-4 py-3 text-risk-yuksek"
        >
          {sonuc.ileti}
        </p>
      ) : (
        <SahaGorunumu durum={sonuc.durum} rol={secim.rol} cerceveKod={secim.cerceveKod} />
      )}
    </>
  );
}

type Durum = Extract<Awaited<ReturnType<typeof sahaDurumu>>, { tamam: true }>["durum"];

function SahaGorunumu({
  durum,
  rol,
  cerceveKod,
}: {
  durum: Durum;
  rol: Durum["sorular"][number]["roller"][number];
  cerceveKod: string;
}) {
  const { sorular, isaretli, eksik } = provaOzeti(durum, rol);
  const rolAdi = ROL_SECENEKLERI.find(([k]) => k === rol)?.[1] ?? "";
  return (
    <>
      <section aria-labelledby="hazirlik-basligi" className="mb-8">
        <h2 id="hazirlik-basligi" className="mb-2 text-xl font-semibold">
          Hazırlık durumu
        </h2>
        <p className="mb-3 max-w-prose text-soluk">
          Oran, kanıtı olan soruların tüm sorulara payıdır. Ziyaretin sonucunu öngörmez.
          {durum.odrSurumu === null
            ? " Bu program ve çerçeve için öz değerlendirme raporu yok; eksik soruları rapordan alınamadı."
            : ` Eksik soruları öz değerlendirme raporunun ${durum.odrSurumu}. sürümünden alındı.`}
        </p>
        <p className="mb-4 flex flex-wrap gap-2">
          <Rozet vurgulu>
            {durum.toplam.kanitli} / {durum.toplam.soru} soru kanıtlı ({oranMetni(durum.toplam.oran)})
          </Rozet>
          {durum.modelOnerisi?.soru ? (
            <Rozet>
              Model önerisi {durum.modelOnerisi.soru} soru (orana girmez), {durum.modelOnerisi.kanitli} kanıtlı
            </Rozet>
          ) : null}
          {durum.yz ? (
            <Rozet>
              Dil düzeltmesi {durum.yz.duzeltilen}, önerilen soru {durum.yz.onerilen}
            </Rozet>
          ) : null}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] border-collapse text-left text-sm">
            <caption className="sr-only">Ölçüt başına kanıtlı soru oranı</caption>
            <thead>
              <tr className="border-b border-cizgi">
                <th scope="col" className="py-2 pr-4">
                  Ölçüt
                </th>
                <th scope="col" className="py-2 pr-4 text-right">
                  Soru
                </th>
                <th scope="col" className="py-2 pr-4 text-right">
                  Kanıtlı
                </th>
                <th scope="col" className="py-2 text-right">
                  Oran
                </th>
              </tr>
            </thead>
            <tbody>
              {durum.hazirlik.map((h) => (
                <tr key={h.olcutKod} className="border-b border-cizgi">
                  <th scope="row" className="py-2 pr-4 font-normal">
                    <span className="font-semibold">{h.olcutKod}</span> {h.baslik}
                  </th>
                  <td className="py-2 pr-4 text-right tabular-nums">{h.soru}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{h.kanitli}</td>
                  <td className="py-2 text-right tabular-nums">{oranMetni(h.oran)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="prova-basligi">
        <h2 id="prova-basligi" className="mb-2 text-xl font-semibold">
          Prova: {rolAdi}
        </h2>
        <p className="mb-4 text-soluk">
          Soruları sırayla okuyun, kanıtı açın ve işaretleyin. {isaretli} / {sorular.length} soru işaretlendi
          {eksik ? `, ${eksik} soruda eksik var` : ""}.{GERCEK_VERI ? "" : " Örnek veri kipinde işaret kaydedilmez."}
        </p>
        {!sorular.length ? (
          <BosDurum baslik="Bu rol için soru yok." aciklama="Başka bir rol seçin." />
        ) : (
          <ol className="grid gap-4">
            {sorular.map((s, i) => {
              const isaret = durum.prova[s.id];
              return (
                <li key={s.id} id={`soru-${s.id}`} className="rounded-sm border border-cizgi bg-yuzey p-4">
                  <p className="mb-2 flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-semibold">Soru {i + 1}</span>
                    <Rozet>{s.olcutKod}</Rozet>
                    <Rozet>{KAYNAK_ADLARI[s.kaynak]}</Rozet>
                    {s.hazirlik === "hazir" ? (
                      <Rozet vurgulu>Kanıtlı</Rozet>
                    ) : (
                      <EksikIsareti aciklama="Hazırlıksız, kanıt yok" />
                    )}
                  </p>
                  <h3 className="text-base font-semibold">{s.metin}</h3>
                  {s.kanitlar.length ? (
                    <ul className="mt-2 list-disc pl-5 text-sm">
                      {s.kanitlar.map((k) => (
                        <li key={k.kanitId}>
                          {GERCEK_VERI ? (
                            <Link
                              href={`/panel/kanitlar/${k.kanitId}`}
                              className="text-vurgu underline underline-offset-2"
                            >
                              {k.dosyaAdi}
                            </Link>
                          ) : (
                            k.dosyaAdi
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-sm text-soluk">Bu soruyu karşılayan onaylı kanıt yok.</p>
                  )}
                  <form action={provaKaydet} className="mt-3 flex flex-wrap items-center gap-2">
                    <input type="hidden" name="program" value={durum.programId} />
                    <input type="hidden" name="cerceve" value={cerceveKod} />
                    <input type="hidden" name="rol" value={rol} />
                    <input type="hidden" name="soru" value={s.id} />
                    <button
                      type="submit"
                      name="durum"
                      value="hazirim"
                      aria-pressed={isaret === "hazirim"}
                      className={dugmeSinifi(isaret === "hazirim" ? "birincil" : "ikincil", "kucuk")}
                    >
                      Hazırım
                    </button>
                    <button
                      type="submit"
                      name="durum"
                      value="eksik_var"
                      aria-pressed={isaret === "eksik_var"}
                      className={dugmeSinifi(
                        isaret === "eksik_var" ? "tehlike" : "ikincil",
                        "kucuk",
                        isaret === "eksik_var" ? "bg-risk-yuksek-zemin" : "",
                      )}
                    >
                      Eksik var
                    </button>
                  </form>
                </li>
              );
            })}
          </ol>
        )}
      </section>
    </>
  );
}
