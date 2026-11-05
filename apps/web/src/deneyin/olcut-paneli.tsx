"use client";

// Ölçüt ve kanıt arama. Çerçeve verisi bu sekme açılınca yüklenir; arama tarayıcıda yapılır.

import { type FormEvent, useId, useState } from "react";
import { type AramaSonucu, CERCEVE_SECENEKLERI, type OlcutAyrintisi, olcutAra, olcutGetir } from "./olcut.ts";
import { ALAN, DUGME, ETIKET, IKINCIL, Kutu, NOT } from "./ortak.tsx";

const KANIT_ADI: Record<string, string> = {
  belge: "Belge",
  tutanak: "Tutanak",
  anket: "Anket",
  istatistik: "İstatistik",
  ders_bilgi_paketi: "Ders bilgi paketi",
  matris: "Matris",
  rapor: "Rapor",
  web_sayfasi: "Web sayfası",
  diger: "Diğer",
};

export default function OlcutPaneli() {
  const k = useId();
  const [cerceve, setCerceve] = useState(CERCEVE_SECENEKLERI[0]?.kod ?? "");
  const [sorgu, setSorgu] = useState("");
  const [arama, setArama] = useState<{ toplam: number; sonuclar: AramaSonucu[] } | null>(null);
  const [secili, setSecili] = useState<OlcutAyrintisi | null>(null);
  const [hata, setHata] = useState("");

  function ara(e: FormEvent) {
    e.preventDefault();
    setSecili(null);
    setHata("");
    setArama(olcutAra(sorgu, cerceve));
  }

  function ac(kod: string) {
    try {
      setSecili(olcutGetir(kod, cerceve));
      setHata("");
      requestAnimationFrame(() => document.getElementById(`${k}-ayrinti`)?.focus());
    } catch {
      setHata("Ölçüt açılamadı. Başka bir sonuç seçin.");
    }
  }

  return (
    <div className="grid gap-6">
      <form onSubmit={ara} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
        <label className="grid gap-1">
          <span className={ETIKET}>Çerçeve</span>
          <select value={cerceve} onChange={(e) => setCerceve(e.target.value)} className={`${ALAN} min-h-11`}>
            {CERCEVE_SECENEKLERI.map((c) => (
              <option key={c.kod} value={c.kod}>
                {c.ad}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1">
          <span className={ETIKET}>Sözcük ya da kod</span>
          <input
            type="search"
            value={sorgu}
            onChange={(e) => setSorgu(e.target.value)}
            placeholder="paydaş katılımı ya da B.1"
            className={`${ALAN} min-h-11`}
          />
        </label>
        <button type="submit" className={DUGME} disabled={!sorgu.trim()}>
          Ara
        </button>
      </form>

      {arama ? (
        <div className="grid gap-3">
          <p role="status">
            {arama.toplam ? `${arama.toplam} ölçüt bulundu.` : "Sonuç yok. Başka bir sözcük deneyin."}
          </p>
          {arama.sonuclar.length ? (
            <ul className="grid gap-2">
              {arama.sonuclar.map((o) => (
                <li key={o.kod}>
                  <button
                    type="button"
                    onClick={() => ac(o.kod)}
                    aria-pressed={secili?.kod === o.kod}
                    className={`${IKINCIL} w-full justify-start py-2 text-left`}
                  >
                    <span className="min-w-0">
                      <span className="text-vurgu">{o.kod}</span> {o.baslik}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {hata ? (
        <div role="alert">
          <Kutu tur="uyari">{hata}</Kutu>
        </div>
      ) : null}

      {secili ? (
        <section
          id={`${k}-ayrinti`}
          tabIndex={-1}
          aria-labelledby={`${k}-baslik`}
          className="grid gap-3 rounded-sm border border-cizgi-guclu bg-zemin p-4"
          data-olcut-ayrinti
        >
          <p className={NOT}>{secili.cerceve}</p>
          <h3 id={`${k}-baslik`} className="text-2xl text-vurgu">
            {secili.kod} {secili.baslik}
          </h3>
          <p className="flex flex-wrap gap-2">
            {secili.uzmanOnayiBekliyor ? (
              <span className="rounded-sm border border-risk-orta bg-risk-orta-zemin px-2 py-0.5 text-sm text-risk-orta">
                Uzman onayı bekliyor
              </span>
            ) : null}
            {secili.dogrulanmadi ? (
              <span className="rounded-sm border border-cizgi-guclu px-2 py-0.5 text-sm">Metin belgeden alınamadı</span>
            ) : null}
          </p>
          <p className="whitespace-pre-line">{secili.metin}</p>
          {secili.kaynak ? (
            <dl className="grid gap-1 text-base">
              <div>
                <dt className="inline text-soluk">Kaynak belge: </dt>
                <dd className="inline">
                  <a href={secili.kaynak.adres} className="text-vurgu underline underline-offset-4" rel="noopener">
                    {secili.kaynak.ad}
                  </a>
                </dd>
              </div>
              {secili.kaynak.sayfa ? (
                <div>
                  <dt className="inline text-soluk">Sayfa: </dt>
                  <dd className="inline">{secili.kaynak.sayfa}</dd>
                </div>
              ) : null}
              {secili.kaynak.erisimTarihi ? (
                <div>
                  <dt className="inline text-soluk">Erişim: </dt>
                  <dd className="inline">{secili.kaynak.erisimTarihi}</dd>
                </div>
              ) : null}
              {secili.kaynak.sha256 ? (
                <div>
                  <dt className="inline text-soluk">Dosya özeti (SHA-256): </dt>
                  <dd className="inline font-mono text-sm break-all">{secili.kaynak.sha256}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
          {secili.kanitlar.length ? (
            <div>
              <h4 className="text-xl text-vurgu">Örnek kanıtlar</h4>
              <p className={NOT}>Akredit'in önerisidir, resmî metin değildir.</p>
              <ul className="mt-2 list-disc pl-5">
                {secili.kanitlar.map((x) => (
                  <li key={`${x.tur}-${x.aciklama}`}>
                    {KANIT_ADI[x.tur] ?? x.tur}: {x.aciklama}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
