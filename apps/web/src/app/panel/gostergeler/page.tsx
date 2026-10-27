import { egilim, gostergeHesapla, hedefSapmasi, kaynakMetni, raporTablosu, type SapmaDurumu } from "@akredit/gosterge";
import type { Metadata } from "next";
import { Tablo } from "../../../bilesenler/tablo.tsx";
import { EksikIsareti, Kart, Rozet, SayfaBasligi } from "../../../bilesenler/temel.tsx";
import { ORNEK_DONEMLER, ORNEK_TANIMLAR, ORNEK_VERILER } from "./ornek.ts";

export const metadata: Metadata = { title: "Göstergeler" };

const DURUM: Record<SapmaDurumu, string> = {
  hedefte: "✓ Hedefte",
  uyari: "Hedefe yakın",
  sapma: "⚠ Hedefin gerisinde",
  hedef_yok: "Hedef yok",
  EKSIK: "Veri eksik",
};
const EGILIM = { iyilesiyor: "↗ İyileşiyor", kotulesiyor: "↘ Kötüleşiyor", durgun: "→ Değişmiyor", yetersiz_veri: "—" };

const sayi = (x: number) => x.toLocaleString("tr-TR", { maximumFractionDigits: 2 });

export default function GostergelerSayfasi() {
  const donemler = [...ORNEK_DONEMLER];
  const son = donemler[donemler.length - 1] as string;
  const satirlar = raporTablosu(ORNEK_TANIMLAR, ORNEK_VERILER, donemler);
  return (
    <>
      <SayfaBasligi
        baslik="Göstergeler"
        aciklama="Stratejik plan ve faaliyet raporu göstergeleri. Her değer kaynağından hesaplanır; hedefin gerisinde kalan gösterge için onay kutusuna eylem önerisi düşer."
      />
      <div className="space-y-6">
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
              hedef: s.hedef === null ? "—" : `${sayi(s.hedef)} ${s.birim}`,
              durum: <Rozet vurgulu={s.sonDurum === "sapma"}>{DURUM[s.sonDurum]}</Rozet>,
              egilim: EGILIM[s.egilim.yorum],
            },
          }))}
        />
        {ORNEK_TANIMLAR.map((t) => {
          const olcumler = donemler.map((d) => gostergeHesapla(t, d, ORNEK_VERILER));
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
