import { egilim, gostergeHesapla, hedefSapmasi, kaynakMetni, raporTablosu, type SapmaDurumu } from "@akredit/gosterge";
import type { Metadata } from "next";
import { Tablo } from "../../../bilesenler/tablo.tsx";
import { EksikIsareti, Kart, Rozet, SayfaBasligi } from "../../../bilesenler/temel.tsx";
import { gostergeVerisi } from "../../../veri/sunucu.ts";

export const metadata: Metadata = { title: "Göstergeler" };

const DURUM: Record<SapmaDurumu, string> = {
  hedefte: "✓ Hedefte",
  uyari: "Hedefe yakın",
  sapma: "Hedefin gerisinde",
  hedef_yok: "Hedef yok",
  EKSIK: "Veri eksik",
};
const EGILIM = { iyilesiyor: "İyileşiyor", kotulesiyor: "Kötüleşiyor", durgun: "Değişmiyor", yetersiz_veri: "Veri yetersiz" };

const sayi = (x: number) => x.toLocaleString("tr-TR", { maximumFractionDigits: 2 });

const ACIKLAMA =
  "Stratejik plan ve faaliyet raporu göstergeleri. Her değer kaynağından hesaplanır; hedefin gerisinde kalan gösterge için onay kutusuna eylem önerisi düşer.";

export default async function GostergelerSayfasi() {
  const pano = await gostergeVerisi();
  if (!pano)
    return (
      <>
        <SayfaBasligi baslik="Göstergeler" aciklama={ACIKLAMA} />
        <Kart baslik="Erişim yok">
          <p>
            Göstergeleri görmek için kurum düzeyinde ölçme verisini okuma yetkiniz olmalı. Kurum yöneticinize başvurun.
          </p>
        </Kart>
      </>
    );
  const { donemler, tanimlar, veriler, reddedilenler } = pano;
  const son = donemler[donemler.length - 1] ?? "";
  const satirlar = raporTablosu(tanimlar, veriler, donemler);
  return (
    <>
      <SayfaBasligi baslik="Göstergeler" aciklama={ACIKLAMA} />
      <div className="space-y-6">
        {tanimlar.length === 0 ? (
          <Kart baslik="Henüz gösterge yok">
            <p>Kurumun gösterge tanımları eklenince değerler burada kaynaklarıyla görünür.</p>
          </Kart>
        ) : null}
        {reddedilenler.length ? (
          <Kart baslik="Hesaba girmeyen veriler" baslikDuzeyi={2}>
            <p className="text-sm text-soluk">Bu değerler kaynağı ya da kanıtı eksik olduğu için hesaba katılmadı.</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              {reddedilenler.map((r, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: liste yalnız okunur, sırası değişmez.
                <li key={i}>
                  <span className="font-semibold">{r.gostergeKod}</span>
                  {r.donem ? ` · ${r.donem}` : ""}
                  {r.anahtar ? ` · ${r.anahtar}` : ""}: {r.neden}
                </li>
              ))}
            </ul>
          </Kart>
        ) : null}
        <Tablo
          baslik="Gösterge tablosu"
          sutunlar={[
            { anahtar: "ad", baslik: "Gösterge", siralanabilir: true, satirBasligi: true },
            ...donemler.map((d) => ({ anahtar: d, baslik: d })),
            { anahtar: "hedef", baslik: `${son} hedefi` },
            { anahtar: "durum", baslik: "Durum", siralanabilir: true },
            { anahtar: "egilim", baslik: "Eğilim" },
          ]}
          satirlar={satirlar.map((s) => ({
            anahtar: s.kod,
            degerler: { ad: s.ad, durum: DURUM[s.sonDurum] },
            hucreler: {
              ad: (
                <span>
                  <span className="font-semibold">{s.kod}</span> {s.ad}
                  <span className="block text-sm text-soluk">
                    {s.plan === "stratejik_plan" ? "Stratejik plan" : "Faaliyet raporu"}
                    {s.planHedefi ? `, ${s.planHedefi}` : ""}
                  </span>
                </span>
              ),
              ...Object.fromEntries(
                donemler.map((d) => {
                  const v = s.degerler[d];
                  return [
                    d,
                    v === null || v === undefined ? (
                      <EksikIsareti key={d} aciklama="Veri yok" />
                    ) : (
                      `${sayi(v)} ${s.birim}`
                    ),
                  ];
                }),
              ),
              hedef: s.hedef === null ? "Yok" : `${sayi(s.hedef)} ${s.birim}`,
              durum: <Rozet vurgulu={s.sonDurum === "sapma"}>{DURUM[s.sonDurum]}</Rozet>,
              egilim: EGILIM[s.egilim.yorum],
            },
          }))}
        />
        {tanimlar.map((t) => {
          const olcumler = donemler.map((d) => gostergeHesapla(t, d, veriler));
          const sonOlcum = olcumler[olcumler.length - 1];
          const sapma = sonOlcum ? hedefSapmasi(t, sonOlcum) : null;
          return (
            <Kart key={t.kod} baslik={`${t.kod} ${t.ad}`} baslikDuzeyi={2}>
              <p className="text-sm text-soluk">
                Hesap: {olcumler[0]?.hesap}. Eğilim: {EGILIM[egilim(t, olcumler).yorum]}.
              </p>
              {sapma?.durum === "sapma" ? (
                <p className="mt-2 font-semibold">Hedefin gerisinde: onay kutusunda bir iyileştirme eylemi önerildi.</p>
              ) : null}
              <h3 className="mt-3 font-semibold">Kaynaklar</h3>
              <ul className="mt-1 space-y-2">
                {olcumler.map((o) => (
                  <li key={o.donem}>
                    <span className="font-semibold">{o.donem}:</span>{" "}
                    {o.deger === null ? (
                      <>
                        <EksikIsareti aciklama="Veri yok" /> {o.eksikler.join(" ")}
                      </>
                    ) : (
                      <ul className="ml-4 list-disc">
                        {o.girdiler.map((g) => (
                          <li key={g.anahtar}>
                            {g.anahtar} = {sayi(g.deger)} ({kaynakMetni(g.kaynak)})
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            </Kart>
          );
        })}
      </div>
    </>
  );
}
