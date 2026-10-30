"use client";

// Sınav kâğıdı taraması ekranı (İP-43). Birincil eylem: onay bekleyen hücreyi kâğıda bakarak onaylamak ya da
// düzeltmek. Her kart tek tek karara bağlanır (Katman 2, toplu onay yok). Otomatik okunan hücreler de tabloda
// her zaman görünür. Örnek veri kipinde kurgu bir tarama gösterilir; kararlar yalnız ekranda tutulur.

import { useId, useState } from "react";
import { Dugme } from "../../../../../bilesenler/dugme.tsx";
import { GERCEK_VERI } from "../../../../../veri/istemci.ts";
import { ORNEK_KIP_ILETISI } from "../../_bologna/istemci.ts";
import {
  alanAdi,
  bekleyenKartlar,
  guvenYaz,
  type Hucre,
  NEDEN_METNI,
  ORNEK_TARAMA,
  puanYaz,
  type Tarama,
} from "./veri.ts";

export function TaramaPaneli() {
  const [tarama, setTarama] = useState<Tarama>(ORNEK_TARAMA);
  const [ileti, setIleti] = useState("");
  const kartlar = bekleyenKartlar(tarama);
  const kimlik = useId();

  if (GERCEK_VERI)
    return (
      <p>
        Kurum verisiyle tarama bu ekrana henüz bağlı değil. Taranmış kâğıtları yüklemek için kurum yöneticinize
        başvurun.
      </p>
    );

  function karar(h: Hucre, sonuc: "onaylandi" | "duzeltildi", deger: number | null) {
    setTarama((t) => ({
      ...t,
      hucreler: t.hucreler.map((x) =>
        x.hucreId === h.hucreId ? { ...x, karar: { sonuc, deger, zaman: new Date().toISOString() } } : x,
      ),
    }));
    setIleti(`${h.kagitSira}. kâğıt, ${alanAdi(h.alan).toLocaleLowerCase("tr-TR")}: kararınız kaydedildi.`);
  }

  return (
    <div className="space-y-6">
      <p>
        Kâğıtlar yalnız kurum içindeki modelle okundu ({tarama.model}). Öğrenci numaraları okunur okunmaz takma ada
        çevrildi; bu ekranda numara gösterilmez. Toplamı tutmayan ve azami puanı aşan hücreler her zaman size gelir.
      </p>
      <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-[14rem_1fr]">
        <dt className="font-semibold">Kâğıt</dt>
        <dd>{tarama.kagitSayisi}</dd>
        <dt className="font-semibold">Güven eşiği</dt>
        <dd>{guvenYaz(tarama.esik)}</dd>
        <dt className="font-semibold">Onayınızı bekleyen</dt>
        <dd>{kartlar.length}</dd>
      </dl>

      <p role="status" aria-live="polite" className="min-h-6">
        {ileti}
      </p>

      <section aria-labelledby={`${kimlik}-kartlar`} className="space-y-3">
        <h3 id={`${kimlik}-kartlar`} className="font-semibold">
          Onayınızı bekleyen hücreler
        </h3>
        {kartlar.length === 0 ? (
          <p>Onay bekleyen hücre yok. Puanları ölçmeye aktarabilirsiniz.</p>
        ) : (
          <ul className="space-y-3">
            {kartlar.map((h) => (
              <li key={h.hucreId}>
                <HucreKarti hucre={h} karar={karar} />
              </li>
            ))}
          </ul>
        )}
        <Dugme
          tur="birincil"
          disabled={kartlar.length > 0}
          aria-describedby={`${kimlik}-aktar`}
          onClick={() => setIleti(ORNEK_KIP_ILETISI)}
        >
          Puanları ölçmeye aktar
        </Dugme>
        <p id={`${kimlik}-aktar`} className="text-sm text-soluk">
          Bütün hücreler karara bağlanınca açılır. Toplam ve ortalamalar ölçme motorunda hesaplanır.
        </p>
      </section>

      <section aria-labelledby={`${kimlik}-tum`} className="space-y-2">
        <h3 id={`${kimlik}-tum`} className="font-semibold">
          Bütün hücreler
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <caption className="sr-only">Her kâğıdın okunan hücreleri, güveni ve durumu</caption>
            <thead>
              <tr className="border-b border-cizgi text-left">
                <th scope="col" className="py-1 pr-3">
                  Kâğıt
                </th>
                <th scope="col" className="py-1 pr-3">
                  Hücre
                </th>
                <th scope="col" className="py-1 pr-3">
                  Okunan
                </th>
                <th scope="col" className="py-1 pr-3">
                  Güven
                </th>
                <th scope="col" className="py-1">
                  Durum
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cizgi">
              {tarama.hucreler.map((h) => (
                <tr key={h.hucreId}>
                  <td className="py-1 pr-3">{h.kagitSira}</td>
                  <th scope="row" className="py-1 pr-3 text-left font-normal">
                    {alanAdi(h.alan)}
                  </th>
                  <td className="py-1 pr-3">{h.alan === "*numara" ? "gizli" : puanYaz(h.karar?.deger ?? h.deger)}</td>
                  <td className="py-1 pr-3">{guvenYaz(h.guven)}</td>
                  <td className="py-1">{durumMetni(h)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function durumMetni(h: Hucre): string {
  if (h.karar) return h.karar.sonuc === "onaylandi" ? "Onayladınız" : "Düzelttiniz";
  return h.katman.katman === 2 ? "Onayınızı bekliyor" : "Otomatik okundu";
}

function HucreKarti({
  hucre: h,
  karar,
}: {
  hucre: Hucre;
  karar: (h: Hucre, sonuc: "onaylandi" | "duzeltildi", deger: number | null) => void;
}) {
  const kimlik = useId();
  const [girdi, setGirdi] = useState("");
  const [hata, setHata] = useState("");
  const numara = h.alan === "*numara";
  const onaylanabilir =
    !numara && h.deger !== null && !h.nedenler.includes("azami_asimi") && !h.nedenler.includes("okunamadi");

  function duzelt() {
    if (numara) {
      if (!/^\d{4,14}$/u.test(girdi.trim())) return setHata("Kâğıttaki öğrenci numarasını rakamla yazın.");
      setHata("");
      return karar(h, "duzeltildi", null);
    }
    const x = Number(girdi.replace(",", "."));
    if (girdi.trim() === "" || !Number.isFinite(x) || x < 0) return setHata("Kâğıttaki puanı sayı olarak yazın.");
    if (h.azami !== null && x > h.azami) return setHata(`Bu soru için en çok ${puanYaz(h.azami)} puan verilebilir.`);
    setHata("");
    karar(h, "duzeltildi", x);
  }

  return (
    <article aria-labelledby={`${kimlik}-b`} className="rounded border border-cizgi bg-yuzey p-4">
      <h4 id={`${kimlik}-b`} className="font-semibold">
        {h.kagitSira}. kâğıt · {alanAdi(h.alan)}
      </h4>
      <ul className="mt-1 list-disc pl-5">
        {h.nedenler.map((n) => (
          <li key={n}>{NEDEN_METNI[n]}</li>
        ))}
      </ul>
      {!numara && (
        <p className="mt-2">
          Okunan: <strong className="font-semibold">{puanYaz(h.deger)}</strong>
          {h.azami !== null && ` (en çok ${puanYaz(h.azami)})`}, güven {guvenYaz(h.guven)}.
        </p>
      )}
      <p className="mt-1 text-sm text-soluk">Bu karar size aittir; toplu onaylanamaz.</p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        {onaylanabilir && (
          <Dugme tur="birincil" boy="kucuk" onClick={() => karar(h, "onaylandi", h.deger)}>
            Okunanı onayla
          </Dugme>
        )}
        <div className="flex flex-col">
          <label htmlFor={`${kimlik}-g`} className="text-sm font-semibold">
            {numara ? "Kâğıttaki öğrenci numarası" : "Doğru puan"}
          </label>
          <input
            id={`${kimlik}-g`}
            inputMode={numara ? "numeric" : "decimal"}
            autoComplete="off"
            className="min-h-9 w-40 rounded border border-cizgi-guclu bg-yuzey px-2"
            value={girdi}
            aria-invalid={hata ? true : undefined}
            aria-describedby={hata ? `${kimlik}-h` : undefined}
            onChange={(e) => setGirdi(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") duzelt();
            }}
          />
        </div>
        <Dugme tur="ikincil" boy="kucuk" onClick={duzelt}>
          {numara ? "Numarayı kaydet" : "Düzelt"}
        </Dugme>
      </div>
      {hata && (
        <p id={`${kimlik}-h`} className="mt-2 text-risk-yuksek">
          {hata}
        </p>
      )}
    </article>
  );
}
