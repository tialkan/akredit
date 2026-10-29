"use client";

// Karar kartları (İP-39): katman 2 zorunlu kararlar. Toplu onay yoktur; her kart tek tek ve kanıtıyla verilir.
// Kartta: durum (hesaptan sayı + kaynak), kök neden (soru bazlı analiz), iki-üç önlem seçeneği ve
// "kendi önlemini yaz". Kartta geçen süre onay yorgunluğu göstergesine (kişisiz, toplu) girer.

import { type KartKararSuresi, onayYorgunlugu, onlemMetniGecerliMi } from "@akredit/cekirdek";
import type { puko } from "@akredit/servis";
import { Keyboard } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Dugme } from "../../../bilesenler/dugme.tsx";
import { IletisimKutusu, useBildirim } from "../../../bilesenler/etkilesimli.tsx";
import { UzunMetinAlani } from "../../../bilesenler/form.tsx";
import { BosDurum, Rozet } from "../../../bilesenler/temel.tsx";
import { KART_KISAYOLLARI, kartKisayolu, yuzde } from "./kisayol.ts";

type Secim = { tur: "secenek"; id: string } | { tur: "kendi" };

const OLCUM_ADI = { ck: "Ders çıktısı", pc: "Program çıktısı" } as const;

export function KararKartlari({ ilkKartlar }: { ilkKartlar: puko.KararKarti[] }) {
  const bildir = useBildirim();
  const [kartlar, setKartlar] = useState(ilkKartlar);
  const [odak, setOdak] = useState(0);
  const [secimler, setSecimler] = useState<Record<string, Secim>>({});
  const [kendiMetin, setKendiMetin] = useState<Record<string, string>>({});
  const [hata, setHata] = useState<Record<string, string>>({});
  const [sureler, setSureler] = useState<KartKararSuresi[]>([]);
  const [yardim, setYardim] = useState(false);
  const acilis = useRef(Date.now());
  const kartRef = useRef<Map<string, HTMLElement>>(new Map());

  const aktif = kartlar[odak];

  // Odak değişince kartın süresi yeniden başlar.
  // biome-ignore lint/correctness/useExhaustiveDependencies: süre yalnız odak değişince sıfırlanır.
  useEffect(() => {
    acilis.current = Date.now();
    if (aktif) kartRef.current.get(aktif.id)?.focus();
  }, [odak]);

  const sec = (kart: puko.KararKarti, s: Secim) => {
    setSecimler((x) => ({ ...x, [kart.id]: s }));
    setHata((x) => ({ ...x, [kart.id]: "" }));
    if (s.tur === "kendi") setTimeout(() => document.getElementById(`onlem-metin-${kart.id}`)?.focus(), 0);
  };

  const kaydet = (kart: puko.KararKarti) => {
    const s = secimler[kart.id];
    if (!s) return setHata((x) => ({ ...x, [kart.id]: "Önce bir önlem seçin ya da kendi önleminizi yazın." }));
    let metin: string;
    if (s.tur === "kendi") {
      metin = (kendiMetin[kart.id] ?? "").trim();
      if (!metin) return setHata((x) => ({ ...x, [kart.id]: "Önleminizi yazın." }));
    } else {
      const o = kart.secenekler.find((x) => x.id === s.id);
      if (!o || !onlemMetniGecerliMi(o.metin).gecerli)
        return setHata((x) => ({ ...x, [kart.id]: "Bu önlem kullanılamaz. Başka birini seçin." }));
      metin = o.metin;
    }
    const sureMs = Date.now() - acilis.current;
    setSureler((x) => [...x, { katman: 2, sureMs, sonuc: s.tur === "kendi" ? "duzeltildi" : "onaylandi" }]);
    setKartlar((x) => x.filter((k) => k.id !== kart.id));
    setOdak((o) => Math.max(0, Math.min(o, kartlar.length - 2)));
    bildir(`Karar kaydedildi: ${metin}. Önlem gelecek dönemin ders bilgi paketine ve görevlere eklenecek.`, "basari");
  };

  useEffect(() => {
    const dinle = (e: KeyboardEvent) => {
      const hedef = e.target as HTMLElement | null;
      if (hedef && (hedef.tagName === "TEXTAREA" || hedef.tagName === "INPUT")) return;
      const eylem = kartKisayolu(e.key, e.ctrlKey || e.metaKey || e.altKey);
      if (!eylem || !aktif) return;
      e.preventDefault();
      if (eylem.tur === "sonraki") setOdak((o) => Math.min(o + 1, kartlar.length - 1));
      else if (eylem.tur === "onceki") setOdak((o) => Math.max(o - 1, 0));
      else if (eylem.tur === "sec") {
        const s = aktif.secenekler[eylem.sira];
        if (s) sec(aktif, { tur: "secenek", id: s.id });
      } else if (eylem.tur === "kendi") sec(aktif, { tur: "kendi" });
      else if (eylem.tur === "kaydet") kaydet(aktif);
      else setYardim(true);
    };
    window.addEventListener("keydown", dinle);
    return () => window.removeEventListener("keydown", dinle);
  });

  const yorgunluk = onayYorgunlugu(sureler);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p aria-live="polite">
          {kartlar.length ? `${kartlar.length} karar bekliyor.` : "Bekleyen zorunlu karar yok."} Bu kararlar
          devredilemez ve toplu verilemez.
        </p>
        <Dugme
          tur="sessiz"
          boy="kucuk"
          simge={<Keyboard aria-hidden className="size-4" />}
          onClick={() => setYardim(true)}
        >
          Kısayollar
        </Dugme>
      </div>

      {kartlar.length === 0 ? (
        <BosDurum
          baslik="Bütün kararlar verildi"
          aciklama="Yeni ölçüm sonuçları geldiğinde eşik altı kalanlar burada görünür."
        />
      ) : (
        <ol className="space-y-4" aria-label="Karar kartları">
          {kartlar.map((kart, i) => {
            const k = kart.kume;
            const secim = secimler[kart.id];
            const baslikId = `kart-${kart.id}-baslik`;
            return (
              <li key={kart.id}>
                <article
                  ref={(e) => {
                    if (e) kartRef.current.set(kart.id, e);
                    else kartRef.current.delete(kart.id);
                  }}
                  tabIndex={-1}
                  aria-labelledby={baslikId}
                  aria-current={i === odak ? "true" : undefined}
                  onFocus={() => i !== odak && setOdak(i)}
                  className={`rounded border bg-yuzey p-4 focus:outline-2 focus:outline-offset-2 ${
                    i === odak ? "border-vurgu" : "border-cizgi"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 id={baslikId} className="text-lg font-bold">
                      {OLCUM_ADI[k.olcumTuru]} {k.kod}: {k.olcumler.length} ders eşiğin altında
                    </h2>
                    <Rozet vurgulu>Zorunlu karar</Rozet>
                    {kart.oncekiPukoId ? <Rozet>Önceki önlem yetmedi</Rozet> : null}
                  </div>
                  <p className="mt-1 text-sm text-soluk">
                    {k.donem} · Eşik {yuzde(k.esik)} · {kart.katman.gerekce}
                  </p>

                  <h3 className="mt-3 font-semibold">Durum</h3>
                  <table className="mt-1 w-full text-left text-sm">
                    <caption className="sr-only">Eşik altı ya da ölçülemeyen sonuçlar ve kaynakları</caption>
                    <thead>
                      <tr>
                        <th scope="col">Ders</th>
                        <th scope="col">Değer</th>
                        <th scope="col">Eşiğe uzaklık</th>
                        <th scope="col">Kaynak</th>
                      </tr>
                    </thead>
                    <tbody>
                      {k.olcumler.map((o) => (
                        <tr key={o.dersKodu}>
                          <th scope="row">{o.dersKodu}</th>
                          <td>{o.deger === null ? "Ölçülemedi" : yuzde(o.deger)}</td>
                          <td>{o.deger === null ? "Hesaplanamadı" : yuzde(o.esik - o.deger)}</td>
                          <td>Ölçme hesabı {o.kaynak.hesapSurumu}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <h3 className="mt-3 font-semibold">Kök neden</h3>
                  <ul className="mt-1 list-disc pl-5 text-sm">
                    {k.olcumler.flatMap((o) =>
                      (kart.kokNedenler[o.dersKodu] ?? []).map((n) => (
                        <li key={`${o.dersKodu}-${n.tur}-${n.soruNo ?? ""}`}>
                          {o.dersKodu}: {n.aciklama}
                        </li>
                      )),
                    )}
                    {k.olcumler.every((o) => !(kart.kokNedenler[o.dersKodu] ?? []).length) ? (
                      <li>Soru bazlı analizde belirgin bir neden bulunmadı.</li>
                    ) : null}
                  </ul>

                  <fieldset className="mt-3">
                    <legend className="font-semibold">Önlem</legend>
                    <div className="mt-1 space-y-2">
                      {kart.secenekler.map((s, si) => (
                        <label key={s.id} className="flex items-start gap-2">
                          <input
                            type="radio"
                            name={`onlem-${kart.id}`}
                            className="mt-1 size-5 accent-[var(--vurgu)]"
                            checked={secim?.tur === "secenek" && secim.id === s.id}
                            onChange={() => sec(kart, { tur: "secenek", id: s.id })}
                          />
                          <span>
                            <span className="sr-only">Seçenek {si + 1}: </span>
                            {s.metin}
                            {s.uretici === "yz" ? (
                              <span className="text-sm text-soluk"> (yapay zekâ önerisi)</span>
                            ) : null}
                          </span>
                        </label>
                      ))}
                      <label className="flex items-start gap-2">
                        <input
                          type="radio"
                          name={`onlem-${kart.id}`}
                          className="mt-1 size-5 accent-[var(--vurgu)]"
                          checked={secim?.tur === "kendi"}
                          onChange={() => sec(kart, { tur: "kendi" })}
                        />
                        <span>Kendi önlemimi yazacağım</span>
                      </label>
                    </div>
                  </fieldset>
                  {secim?.tur === "kendi" ? (
                    <UzunMetinAlani
                      className="mt-2"
                      etiket="Önleminiz"
                      id={`onlem-metin-${kart.id}`}
                      maxLength={280}
                      value={kendiMetin[kart.id] ?? ""}
                      onChange={(e) => {
                        const deger = e.currentTarget.value;
                        setKendiMetin((x) => ({ ...x, [kart.id]: deger }));
                      }}
                    />
                  ) : null}
                  {hata[kart.id] ? (
                    <p role="alert" className="mt-2 font-semibold text-risk-yuksek">
                      {hata[kart.id]}
                    </p>
                  ) : null}
                  <div className="mt-3">
                    <Dugme tur="birincil" onClick={() => kaydet(kart)}>
                      Kararı kaydet
                    </Dugme>
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      )}

      <section aria-labelledby="yorgunluk-baslik" className="rounded border border-cizgi bg-yuzey p-4">
        <h2 id="yorgunluk-baslik" className="text-lg font-bold">
          Karar süresi (kurum geneli)
        </h2>
        {yorgunluk.gizli ? (
          <p className="mt-1 text-soluk">Gösterge en az beş karardan sonra görünür. Kişi bazında gösterilmez.</p>
        ) : (
          <dl className="mt-1 grid grid-cols-2 gap-x-4">
            <dt>Karar sayısı</dt>
            <dd>{yorgunluk.kararSayisi}</dd>
            <dt>Ortanca süre</dt>
            <dd>{yorgunluk.ortancaSn?.toLocaleString("tr-TR", { maximumFractionDigits: 1 })} sn</dd>
            <dt>İki saniyeden kısa onay</dt>
            <dd>{yorgunluk.incelemedenOnay}</dd>
          </dl>
        )}
      </section>

      <IletisimKutusu acik={yardim} kapat={() => setYardim(false)} baslik="Klavye kısayolları">
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
          {KART_KISAYOLLARI.map((k) => (
            <div key={k.tus} className="contents">
              <dt>
                <kbd>{k.tus}</kbd>
              </dt>
              <dd>{k.aciklama}</dd>
            </div>
          ))}
        </dl>
      </IletisimKutusu>
    </div>
  );
}
