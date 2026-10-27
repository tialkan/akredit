"use client";

import { ONERI_RISKI, type OneriTuru } from "@akredit/cekirdek";
import { useEffect, useState } from "react";
import { Dugme } from "../../../bilesenler/dugme.tsx";
import { useBildirim } from "../../../bilesenler/etkilesimli.tsx";
import { IsaretKutusu, MetinAlani, Secim } from "../../../bilesenler/form.tsx";
import { Kart, Rozet } from "../../../bilesenler/temel.tsx";
import { istemciVeriKaynagi } from "../../../veri/istemci.ts";
import type { Ayarlar, YzSaglayici } from "../../../veri/kaynak.ts";
import { ONERI_TURU_ETIKETI, RISK_ETIKETI, tarihYaz } from "../../../veri/yardimci.ts";

const SAGLAYICILAR: { deger: YzSaglayici; ad: string; aciklama: string }[] = [
  { deger: "evren", ad: "EVREN", aciklama: "Yurt içinde barındırılan hizmet." },
  { deger: "kurum_sunucusu", ad: "Kurumun kendi sunucusu", aciklama: "Veri kurumdan çıkmaz." },
  { deger: "ollama", ad: "Ollama (yerel model)", aciklama: "Model kurumun bilgisayarında çalışır." },
  { deger: "diger", ad: "Diğer", aciklama: "Yurt dışında olabilir; aşağıdaki izin ayarına uyulur." },
];

/** Politikaya bağlanabilen türler: yüksek riskli türler hiç listelenmez. */
const DEVREDILEBILIR = (Object.keys(ONERI_RISKI) as OneriTuru[]).filter((t) => ONERI_RISKI[t] !== "yuksek");

export function AyarlarFormu({ ilk }: { ilk: Ayarlar }) {
  const kaynak = istemciVeriKaynagi();
  const bildir = useBildirim();
  const [ayarlar, setAyarlar] = useState(ilk);
  const [kurumAdi, setKurumAdi] = useState(ilk.kurumAdi);
  const [kisaAd, setKisaAd] = useState(ilk.kurumKisaAdi);
  const [imzalar, setImzalar] = useState<Record<string, string>>({});
  const [yeni, setYeni] = useState({
    ad: "",
    turler: [] as OneriTuru[],
    risk: "dusuk" as "dusuk" | "orta",
    guven: "90",
  });
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    void kaynak.ayarlar().then(setAyarlar);
  }, [kaynak]);

  const guncelle = async (d: Parameters<typeof kaynak.ayarlariGuncelle>[0], mesaj: string) => {
    setAyarlar(await kaynak.ayarlariGuncelle(d));
    bildir(mesaj, "basari");
  };

  const politikaOlustur = async () => {
    const s = await kaynak.politikaTaslagiOlustur({
      ad: yeni.ad,
      oneriTurleri: yeni.turler,
      enYuksekRisk: yeni.risk,
      enDusukGuven: Number(yeni.guven) / 100,
    });
    if (!s.tamam) return setHata(s.hata);
    setHata(null);
    setYeni({ ad: "", turler: [], risk: "dusuk", guven: "90" });
    setAyarlar(await kaynak.ayarlar());
    bildir("Politika taslağı oluşturuldu. Yürürlüğe girmesi için imzalayın.", "basari");
  };

  const imzala = async (id: string) => {
    const s = await kaynak.politikaImzala(id, imzalar[id] ?? "");
    if (!s.tamam) return bildir(s.hata, "hata");
    setAyarlar(await kaynak.ayarlar());
    bildir("Politika imzalandı ve günlüğe yazıldı.", "basari");
  };

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Kart baslik="Kurum bilgisi">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void guncelle({ kurumAdi, kurumKisaAdi: kisaAd }, "Kurum bilgisi kaydedildi.");
          }}
        >
          <MetinAlani etiket="Kurum adı" value={kurumAdi} onChange={(e) => setKurumAdi(e.target.value)} required />
          <MetinAlani etiket="Kısa ad" value={kisaAd} onChange={(e) => setKisaAd(e.target.value)} />
          <Dugme type="submit" tur="birincil">
            Kaydet
          </Dugme>
        </form>
      </Kart>

      <Kart baslik="Yapay zekâ hizmeti">
        <fieldset>
          <legend className="mb-2 font-semibold">Önerileri hazırlayan hizmet</legend>
          <div className="space-y-2">
            {SAGLAYICILAR.map((s) => (
              <label
                key={s.deger}
                className="flex cursor-pointer items-start gap-3 rounded-md border border-cizgi p-3 has-[:checked]:border-vurgu has-[:checked]:bg-vurgu-zemin"
              >
                <input
                  type="radio"
                  name="saglayici"
                  className="mt-1 size-5 accent-[var(--vurgu)]"
                  checked={ayarlar.yzSaglayici === s.deger}
                  onChange={() => void guncelle({ yzSaglayici: s.deger }, `Yapay zekâ hizmeti: ${s.ad}`)}
                />
                <span>
                  <span className="font-semibold">{s.ad}</span>
                  <span className="block text-sm text-soluk">{s.aciklama}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <div className="mt-5 rounded-md border border-cizgi-guclu p-4">
          <div className="flex items-start gap-3">
            <input
              id="yurt-disi-izni"
              type="checkbox"
              role="switch"
              aria-checked={ayarlar.yurtDisiIzni}
              aria-describedby="yurt-disi-aciklama"
              className="mt-1 size-5 accent-[var(--vurgu)]"
              checked={ayarlar.yurtDisiIzni}
              onChange={(e) =>
                void guncelle(
                  { yurtDisiIzni: e.target.checked },
                  e.target.checked ? "Yurt dışı hizmete izin verildi." : "Yurt dışı hizmete izin kaldırıldı.",
                )
              }
            />
            <div>
              <label htmlFor="yurt-disi-izni" className="font-semibold">
                Yurt dışındaki yapay zekâ hizmetine izin ver
              </label>
              <p id="yurt-disi-aciklama" className="text-sm text-soluk">
                Kapalıyken kişisel veri içeren belgeler yurt dışındaki bir hizmete gönderilmez. Açıkken bile öğrenci
                kimlikleri takma adla gider. Bu kararı kurumunuzun veri sorumlusuyla birlikte verin.
              </p>
              <p className="mt-1 text-sm font-semibold">Şu an: {ayarlar.yurtDisiIzni ? "İzin var" : "İzin yok"}</p>
            </div>
          </div>
        </div>
      </Kart>

      <Kart baslik="Yetki politikaları" className="xl:col-span-2">
        <p className="mb-4 max-w-prose text-soluk">
          Politika, belirli türdeki önerilerin sizin adınıza onaylanmasıdır. Ancak imzalandığında yürürlüğe girer.
          Yüksek riskli işler hiçbir politikayla onaylanamaz.
        </p>
        <ul className="space-y-3">
          {ayarlar.politikalar.map((p) => (
            <li key={p.id} className="rounded-md border border-cizgi p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-semibold">{p.ad}</h3>
                <Rozet vurgulu={p.durum === "imzali"}>
                  {p.durum === "imzali" ? "✓ İmzalı, yürürlükte" : "İmza bekliyor"}
                </Rozet>
              </div>
              <p className="mt-1 text-sm text-soluk">
                Türler: {p.kapsam.oneriTurleri.map((t) => ONERI_TURU_ETIKETI[t]).join(", ")} · Risk sınırı:{" "}
                {RISK_ETIKETI[p.kapsam.enYuksekRisk]} · En düşük güven: %{Math.round(p.kapsam.enDusukGuven * 100)}
              </p>
              <p className="text-sm text-soluk">
                {p.imzalayan && p.imzaZamani
                  ? `İmzalayan: ${p.imzalayan}, ${tarihYaz(p.imzaZamani)}`
                  : `Oluşturan: ${p.olusturan}, ${tarihYaz(p.olusturma)}`}
              </p>
              {p.durum === "imza_bekliyor" ? (
                <form
                  className="mt-3 flex flex-wrap items-end gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void imzala(p.id);
                  }}
                >
                  <MetinAlani
                    etiket="İmzalamak için adınızı yazın"
                    className="min-w-64 flex-1"
                    value={imzalar[p.id] ?? ""}
                    onChange={(e) => setImzalar((m) => ({ ...m, [p.id]: e.target.value }))}
                  />
                  <Dugme type="submit" tur="birincil">
                    İmzala
                  </Dugme>
                </form>
              ) : null}
            </li>
          ))}
        </ul>

        <form
          className="mt-6 space-y-4 border-t border-cizgi pt-5"
          aria-labelledby="yeni-politika"
          onSubmit={(e) => {
            e.preventDefault();
            void politikaOlustur();
          }}
        >
          <h3 id="yeni-politika" className="text-lg font-semibold">
            Yeni politika
          </h3>
          <MetinAlani
            etiket="Politikanın adı"
            value={yeni.ad}
            onChange={(e) => setYeni({ ...yeni, ad: e.target.value })}
          />
          <fieldset>
            <legend className="mb-2 font-semibold">Öneri türleri</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {DEVREDILEBILIR.map((t) => (
                <IsaretKutusu
                  key={t}
                  etiket={ONERI_TURU_ETIKETI[t]}
                  ipucu={RISK_ETIKETI[ONERI_RISKI[t]]}
                  checked={yeni.turler.includes(t)}
                  onChange={(e) =>
                    setYeni({
                      ...yeni,
                      turler: e.target.checked ? [...yeni.turler, t] : yeni.turler.filter((x) => x !== t),
                    })
                  }
                />
              ))}
            </div>
            <p className="mt-2 text-sm text-soluk">
              Olgunluk düzeyi, yazma planı ve dış gönderim yüksek risklidir; listede yoktur.
            </p>
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <Secim
              etiket="Risk sınırı"
              value={yeni.risk}
              onChange={(e) => setYeni({ ...yeni, risk: e.target.value === "orta" ? "orta" : "dusuk" })}
            >
              <option value="dusuk">Düşük risk</option>
              <option value="orta">Orta risk</option>
            </Secim>
            <MetinAlani
              etiket="En düşük güven (yüzde)"
              type="number"
              min={0}
              max={100}
              value={yeni.guven}
              onChange={(e) => setYeni({ ...yeni, guven: e.target.value })}
            />
          </div>
          {hata ? (
            <p role="alert" className="font-semibold text-risk-yuksek">
              {hata}
            </p>
          ) : null}
          <Dugme type="submit" tur="birincil">
            Taslağı oluştur
          </Dugme>
        </form>
      </Kart>
    </div>
  );
}
