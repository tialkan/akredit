"use client";

// Sınav kâğıdı taraması ekranı (İP-43). Birincil eylem: onay bekleyen hücreyi kâğıda bakarak onaylamak ya da
// düzeltmek. Her kart tek tek karara bağlanır (Katman 2, toplu onay yok). Kartlar bitince otomatik okunan
// hücrelerin özeti tek ekranda gösterilir (inceleme D8-3): hoca istediği hücreyi açıp düzeltir, sonra özeti tek
// dokunuşla onaylayıp puanları aktarır (Katman 1, yalnız doğrudan). Örnek veri kipinde kararlar yalnız ekranda
// tutulur.

import { useId, useState } from "react";
import { Dugme } from "../../../../../bilesenler/dugme.tsx";
import { GERCEK_VERI } from "../../../../../veri/istemci.ts";
import { ORNEK_KIP_ILETISI } from "../../_bologna/istemci.ts";
import { aktarEylem, hucreKarariEylem, kirpintiEylem } from "./eylem.ts";
import {
  alanAdi,
  bekleyenKartlar,
  gecerliDeger,
  guvenYaz,
  type Hucre,
  NEDEN_METNI,
  otomatikHucreler,
  ozetSutunlari,
  puanYaz,
  type Tarama,
} from "./veri.ts";

type Karar = (
  h: Hucre,
  sonuc: "onaylandi" | "duzeltildi",
  deger: number | null,
  ogrenciNo?: string,
) => Promise<string | null>;

export function TaramaPaneli({ dersId, ilk }: { dersId: string; ilk: Tarama }) {
  const [tarama, setTarama] = useState<Tarama>(ilk);
  const [ileti, setIleti] = useState("");
  const [acik, setAcik] = useState<string | null>(null);
  const [aktariliyor, setAktariliyor] = useState(false);
  const kartlar = bekleyenKartlar(tarama);
  const oto = otomatikHucreler(tarama);
  const kimlik = useId();

  /** Kararı kaydeder; hata varsa iletisini döndürür (kart altında gösterilir). */
  const karar: Karar = async (h, sonuc, deger, ogrenciNo) => {
    const ad = `${h.kagitSira}. kâğıt, ${alanAdi(h.alan).toLocaleLowerCase("tr-TR")}`;
    if (GERCEK_VERI) {
      const r = await hucreKarariEylem(tarama.taramaId, {
        hucreId: h.hucreId,
        sonuc,
        ...(sonuc === "duzeltildi" && h.alan !== "*numara" ? { deger } : {}),
        ...(ogrenciNo ? { ogrenciNo } : {}),
      });
      if (!r.tamam) return r.ileti;
      setTarama(r.veri);
    } else {
      setTarama((t) => {
        const hucreler = t.hucreler.map((x) =>
          x.hucreId === h.hucreId ? { ...x, karar: { sonuc, deger, zaman: new Date().toISOString() } } : x,
        );
        const y = { ...t, hucreler };
        return { ...y, otomatikOzet: { ...t.otomatikOzet, sayi: otomatikHucreler(y).length } };
      });
    }
    setIleti(`${ad}: kararınız kaydedildi.`);
    return null;
  };

  async function aktar() {
    if (!GERCEK_VERI) return setIleti(ORNEK_KIP_ILETISI);
    setAktariliyor(true);
    const r = await aktarEylem(dersId, tarama.taramaId, tarama.otomatikOzet.ozet);
    setAktariliyor(false);
    if (!r.tamam) return setIleti(r.ileti);
    setTarama((t) => ({ ...t, aktarildi: true }));
    setIleti(
      `Puanlar ölçmeye aktarıldı: ${r.veri.ogrenciSayisi} öğrenci, ${r.veri.puanSayisi} puan. Onayladığınız özette ${r.veri.otomatikSayisi} otomatik hücre vardı.`,
    );
  }

  const acikHucre = acik ? tarama.hucreler.find((h) => h.hucreId === acik) : undefined;

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
        <dt className="font-semibold">Otomatik okunan</dt>
        <dd>{oto.length}</dd>
      </dl>

      <p role="status" aria-live="polite" className="min-h-6">
        {ileti}
      </p>

      <section aria-labelledby={`${kimlik}-kartlar`} className="space-y-3">
        <h3 id={`${kimlik}-kartlar`} className="font-semibold">
          1. Onayınızı bekleyen hücreler
        </h3>
        {kartlar.length === 0 ? (
          <p>Onay bekleyen hücre yok.</p>
        ) : (
          <ul className="space-y-3">
            {kartlar.map((h) => (
              <li key={h.hucreId}>
                <HucreKarti hucre={h} karar={karar} sahip={tarama.sahip} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby={`${kimlik}-ozet`} className="space-y-3">
        <h3 id={`${kimlik}-ozet`} className="font-semibold">
          2. Aktarım özeti: otomatik okunan puanlar
        </h3>
        {tarama.aktarildi ? (
          <p>Bu taramanın puanları ölçmeye aktarıldı. Hücreler artık değiştirilemez.</p>
        ) : (
          <>
            <p>
              {oto.length} hücre otomatik okundu: güven eşiğin üstünde, okunan sayı kutudaki yazıyla eşleşiyor ve
              toplamlar tutuyor. Aktarmadan önce göz atın. Yanlış gördüğünüz hücreyi seçip düzeltin; düzelttiğiniz hücre
              özetten çıkar ve sizin değerinizle aktarılır.
            </p>
            <OzetTablosu tarama={tarama} acik={acik} ac={(id) => setAcik((v) => (v === id ? null : id))} />
            {acikHucre && (
              <OtomatikDuzeltme key={acikHucre.hucreId} hucre={acikHucre} karar={karar} kapat={() => setAcik(null)} />
            )}
          </>
        )}
        <Dugme
          tur="birincil"
          disabled={kartlar.length > 0 || tarama.aktarildi || aktariliyor}
          aria-describedby={`${kimlik}-aktar`}
          onClick={aktar}
        >
          Özeti onayla ve puanları aktar
        </Dugme>
        <p id={`${kimlik}-aktar`} className="text-sm text-soluk">
          {kartlar.length > 0
            ? "Önce onayınızı bekleyen hücreleri karara bağlayın."
            : `Tek dokunuşla ${oto.length} otomatik hücreyi ve verdiğiniz kararları onaylarsınız; onay adınızla günlüğe yazılır.`}{" "}
          Toplam ve ortalamalar ölçme motorunda hesaplanır.
        </p>
      </section>

      <details className="rounded border border-cizgi p-3">
        <summary className="cursor-pointer font-semibold">Bütün hücreler (güven ve durum)</summary>
        <div className="mt-2 overflow-x-auto">
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
                  <td className="py-1 pr-3">{h.alan === "*numara" ? "gizli" : puanYaz(gecerliDeger(h))}</td>
                  <td className="py-1 pr-3">{guvenYaz(h.guven)}</td>
                  <td className="py-1">{durumMetni(h)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}

function durumMetni(h: Hucre): string {
  if (h.karar) return h.karar.sonuc === "onaylandi" ? "Onayladınız" : "Düzelttiniz";
  return h.katman.katman === 2 ? "Onayınızı bekliyor" : "Otomatik okundu";
}

/** Tek ekranlık özet: satır kâğıt, sütun soru. Otomatik hücre düğmedir (açıp düzeltmek için). */
function OzetTablosu({ tarama, acik, ac }: { tarama: Tarama; acik: string | null; ac: (id: string) => void }) {
  const sutunlar = ozetSutunlari(tarama);
  const kagitlar = [...new Set(tarama.hucreler.map((h) => h.kagitSira))].sort((a, b) => a - b);
  const bul = (k: number, a: string) => tarama.hucreler.find((h) => h.kagitSira === k && h.alan === a);
  return (
    <div className="overflow-x-auto">
      <table className="text-sm">
        <caption className="sr-only">
          Aktarılacak puanlar. Otomatik okunan hücreyi açıp düzeltebilirsiniz; işaretli hücrelere karar verdiniz.
        </caption>
        <thead>
          <tr className="border-b border-cizgi text-left">
            <th scope="col" className="py-1 pr-3">
              Kâğıt
            </th>
            {sutunlar.map((s) => (
              <th key={s} scope="col" className="px-2 py-1 text-right">
                {s === "*toplam" ? "Toplam" : `S${s}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-cizgi">
          {kagitlar.map((k) => (
            <tr key={k}>
              <th scope="row" className="py-1 pr-3 text-left font-normal">
                {k}. kâğıt
              </th>
              {sutunlar.map((s) => {
                const h = bul(k, s);
                if (!h)
                  return (
                    <td key={s} className="px-2 py-1 text-right text-soluk">
                      -
                    </td>
                  );
                const otomatik = h.katman.katman === 0 && h.karar === null;
                const deger = puanYaz(gecerliDeger(h));
                return (
                  <td key={s} className="px-1 py-0.5 text-right">
                    {otomatik ? (
                      <button
                        type="button"
                        aria-expanded={acik === h.hucreId}
                        aria-label={`${k}. kâğıt, ${alanAdi(s)}: ${deger}, otomatik okundu. Açıp düzeltin.`}
                        className="min-h-9 min-w-12 rounded border border-cizgi px-2 hover:bg-yuzey-2"
                        onClick={() => ac(h.hucreId)}
                      >
                        {deger}
                      </button>
                    ) : (
                      <span className="inline-block min-w-12 px-2">
                        {deger}
                        <span className="sr-only">
                          , {h.karar ? durumMetni(h).toLocaleLowerCase("tr-TR") : "onayınızı bekliyor"}
                        </span>
                        <span aria-hidden="true" className="ml-0.5 text-xs text-soluk">
                          {h.karar ? "(karar)" : "(bekliyor)"}
                        </span>
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OtomatikDuzeltme({ hucre: h, karar, kapat }: { hucre: Hucre; karar: Karar; kapat: () => void }) {
  const kimlik = useId();
  const [girdi, setGirdi] = useState("");
  const [hata, setHata] = useState("");
  const numara = h.alan === "*numara";

  async function duzelt() {
    const x = Number(girdi.replace(",", "."));
    if (girdi.trim() === "" || !Number.isFinite(x) || x < 0) return setHata("Kâğıttaki puanı sayı olarak yazın.");
    if (h.azami !== null && x > h.azami) return setHata(`Bu soru için en çok ${puanYaz(h.azami)} puan verilebilir.`);
    const e = await karar(h, "duzeltildi", x);
    if (e) return setHata(e);
    kapat();
  }

  if (numara) return null;
  return (
    <section aria-labelledby={`${kimlik}-b`} className="rounded border border-cizgi-guclu bg-yuzey p-4">
      <h4 id={`${kimlik}-b`} className="font-semibold">
        {h.kagitSira}. kâğıt · {alanAdi(h.alan)} (otomatik okundu)
      </h4>
      <p className="mt-1">
        Okunan: {puanYaz(h.deger)}
        {h.azami !== null && ` (en çok ${puanYaz(h.azami)})`}, güven {guvenYaz(h.guven)}.
      </p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div className="flex flex-col">
          <label htmlFor={`${kimlik}-g`} className="text-sm font-semibold">
            Düzeltilmiş puan
          </label>
          <input
            id={`${kimlik}-g`}
            inputMode="decimal"
            autoComplete="off"
            className="min-h-9 w-40 rounded border border-cizgi-guclu bg-yuzey px-2"
            value={girdi}
            aria-invalid={hata ? true : undefined}
            aria-describedby={hata ? `${kimlik}-h` : undefined}
            onChange={(e) => setGirdi(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void duzelt();
              if (e.key === "Escape") kapat();
            }}
          />
        </div>
        <Dugme tur="ikincil" boy="kucuk" onClick={() => void duzelt()}>
          Düzeltmeyi kaydet
        </Dugme>
        <Dugme tur="sessiz" boy="kucuk" onClick={kapat}>
          Vazgeç
        </Dugme>
      </div>
      {hata && (
        <p id={`${kimlik}-h`} className="mt-2 text-risk-yuksek">
          {hata}
        </p>
      )}
    </section>
  );
}

function HucreKarti({ hucre: h, karar, sahip }: { hucre: Hucre; karar: Karar; sahip: boolean }) {
  const kimlik = useId();
  const [girdi, setGirdi] = useState("");
  const [hata, setHata] = useState("");
  const [goruntu, setGoruntu] = useState<{ adres: string; bitis: string } | null>(null);
  const numara = h.alan === "*numara";
  const onaylanabilir =
    !numara && h.deger !== null && !h.nedenler.includes("azami_asimi") && !h.nedenler.includes("okunamadi");

  async function gonder(sonuc: "onaylandi" | "duzeltildi", deger: number | null, ogrenciNo?: string) {
    const e = await karar(h, sonuc, deger, ogrenciNo);
    setHata(e ?? "");
  }

  function duzelt() {
    if (numara) {
      const no = girdi.trim();
      if (!/^\d{4,14}$/u.test(no)) return setHata("Kâğıttaki öğrenci numarasını rakamla yazın.");
      setHata("");
      return void gonder("duzeltildi", null, no);
    }
    const x = Number(girdi.replace(",", "."));
    if (girdi.trim() === "" || !Number.isFinite(x) || x < 0) return setHata("Kâğıttaki puanı sayı olarak yazın.");
    if (h.azami !== null && x > h.azami) return setHata(`Bu soru için en çok ${puanYaz(h.azami)} puan verilebilir.`);
    setHata("");
    void gonder("duzeltildi", x);
  }

  async function goster() {
    if (!GERCEK_VERI) return setHata(ORNEK_KIP_ILETISI);
    const r = await kirpintiEylem(h.hucreId);
    if (!r.tamam) return setHata(r.ileti);
    setHata("");
    setGoruntu(r.veri);
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
      {numara && h.kirpinti && (
        <div className="mt-2 space-y-2">
          <p className="text-sm text-soluk">
            Numara kutusunun görüntüsünü yalnız taramayı başlatan kişi ve dersin onay yetkilisi görebilir; her açılış
            günlüğe yazılır.{sahip ? "" : " Taramayı siz başlatmadınız; onay yetkiniz denetlenir."}
          </p>
          {goruntu ? (
            <>
              {/* biome-ignore lint/performance/noImgElement: kısa süreli imzalı adres; görüntü işlenmez */}
              <img
                src={goruntu.adres}
                alt="Öğrenci numarası kutusunun taranmış görüntüsü"
                className="max-h-24 rounded border border-cizgi"
              />
              <p className="text-sm text-soluk">
                Bağlantı {new Date(goruntu.bitis).toLocaleTimeString("tr-TR")} saatine kadar geçerli.
              </p>
            </>
          ) : (
            <Dugme tur="ikincil" boy="kucuk" onClick={() => void goster()}>
              Numara kutusunu göster
            </Dugme>
          )}
        </div>
      )}
      <p className="mt-1 text-sm text-soluk">Bu karar size aittir; toplu onaylanamaz.</p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        {onaylanabilir && (
          <Dugme tur="birincil" boy="kucuk" onClick={() => void gonder("onaylandi", h.deger)}>
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
