// Program akreditasyonu ÖDR tabloları (İP-47). Tablolar kurumun Bologna verisinden ve kurumun onayladığı
// eşlemelerden üretilir; model kullanılmaz. Verisi olmayan hücre EKSİK yazılır ve nedeni görünür. Eşlemeyi
// Akredit tahmin etmez: öneri yalnız gösterilir, tabloya kurum kullanıcısının kararı girer.

import type { Hucre, UretilenTablo } from "@akredit/cerceveler";
import type { odrTablolari as T } from "@akredit/servis";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BosDurum, KirintiYolu, SayfaBasligi } from "../../../../../bilesenler/temel.tsx";
import { panelVeriKaynagi } from "../../../../../veri/sunucu.ts";
import { eslemeKaydet } from "./eylem.ts";
import { cerceveSec, degerMetni, hucreMetni, ILETILER, kararOzeti, kaynakMetni } from "./gorunum.ts";
import { GERCEK_VERI, tabloDurumu } from "./sunucu.ts";

export const metadata: Metadata = { title: "Program tabloları" };

export async function generateStaticParams() {
  if (GERCEK_VERI) return [];
  return (await (await panelVeriKaynagi()).programlar()).map((p) => ({ id: p.id }));
}

const odak = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-odak";
const alanSinifi = `mt-1 block w-full rounded-sm border border-cizgi-guclu bg-yuzey px-3 py-2 text-metin ${odak}`;
const dugme = (birincil = false) =>
  [
    "inline-flex min-h-11 items-center justify-center rounded-sm border px-4",
    birincil ? "border-vurgu bg-vurgu text-vurgu-metin" : "border-cizgi-guclu bg-yuzey text-metin hover:bg-yuzey-2",
    odak,
  ].join(" ");

export default async function ProgramTablolariSayfasi({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const p = await searchParams;
  const program = (await (await panelVeriKaynagi()).programlar()).find((x) => x.id === id);
  if (!program) notFound();
  const { odrTablolari } = await import("@akredit/servis");
  const cerceveler = odrTablolari.tabloCerceveleri();
  const cerceveKod = cerceveSec(p.cerceve, cerceveler);
  const kaynakGoster = p.kaynak === "1";
  const ileti = typeof p.ileti === "string" ? ILETILER[p.ileti] : undefined;
  const sonuc = await tabloDurumu(program.id, program.ad, cerceveKod);
  const yol = `/panel/programlar/${program.id}/tablolar`;

  return (
    <>
      <KirintiYolu
        ogeler={[
          { ad: "Panel", href: "/panel" },
          { ad: program.ad, href: `/panel/programlar/${program.id}` },
          { ad: "Program tabloları" },
        ]}
      />
      <SayfaBasligi
        baslik="Program tabloları"
        aciklama={`${program.ad}. Öz değerlendirme raporu tabloları kurumun Bologna verisinden ve onayladığınız eşlemelerden üretilir. Verisi olmayan hücre EKSİK yazılır.`}
      />

      <form
        method="get"
        action={yol}
        className="mb-6 flex flex-wrap items-end gap-4 rounded-sm border border-cizgi bg-yuzey p-4"
      >
        <label className="block min-w-64 text-sm">
          Akreditasyon çerçevesi
          <select name="cerceve" defaultValue={cerceveKod} className={alanSinifi}>
            {cerceveler.map((c) => (
              <option key={c.kod} value={c.kod}>
                {c.ad}
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" name="kaynak" value="1" defaultChecked={kaynakGoster} className={`size-5 ${odak}`} />
          Hücre kaynaklarını göster
        </label>
        <button type="submit" className={dugme(true)}>
          Tabloları göster
        </button>
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
        <Gorunum durum={sonuc.durum} kaynakGoster={kaynakGoster} yol={yol} />
      )}
    </>
  );
}

function Gorunum({ durum, kaynakGoster, yol }: { durum: T.ProgramTablolari; kaynakGoster: boolean; yol: string }) {
  const indir = (bicim: "docx" | "xlsx") =>
    `${yol}/indir?${new URLSearchParams({ cerceve: durum.cerceve.kod, bicim }).toString()}`;
  const eksik = durum.tablolar.reduce((n, t) => n + t.eksikSayisi, 0);
  return (
    <>
      <section aria-labelledby="ozet-baslik" className="mb-8 rounded-sm border border-cizgi bg-yuzey p-4">
        <h2 id="ozet-baslik" className="text-lg">
          {durum.cerceve.ad}
        </h2>
        <ul className="mt-2 space-y-1 text-sm">
          <li>
            Bologna verisi:{" "}
            {durum.bologna
              ? `${new Date(durum.bologna.okundu).toLocaleDateString("tr-TR", { timeZone: "Europe/Istanbul" })} tarihli okuma`
              : "aktarılmadı. Önce ders bilgi paketini aktarın."}
          </li>
          <li>
            {durum.tablolar.length} tablo, {eksik} EKSİK hücre.
          </li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-3">
          <a href={indir("docx")} className={dugme()} download>
            Word olarak indir
          </a>
          <a href={indir("xlsx")} className={dugme()} download>
            Excel olarak indir
          </a>
          <a href="#eslemeler" className={dugme()}>
            Eşlemelere git
          </a>
        </div>
      </section>

      <nav aria-label="Tablolar" className="mb-6">
        <ol className="flex flex-wrap gap-2 text-sm">
          {durum.tablolar.map((t) => (
            <li key={t.tanimKod}>
              <a
                href={`#tablo-${t.tanimKod}`}
                className={`inline-flex min-h-11 items-center px-2 underline underline-offset-4 ${odak}`}
              >
                {t.baslik}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {durum.tablolar.map((t) => (
        <TabloBolumu key={t.tanimKod} tablo={t} kaynakGoster={kaynakGoster} />
      ))}

      <EslemeFormu durum={durum} />
    </>
  );
}

function HucreIcerigi({ h, kaynakGoster }: { h: Hucre; kaynakGoster: boolean }) {
  if (h.tur === "eksik")
    return (
      <>
        <span className="inline-block rounded-sm border border-dashed border-risk-yuksek px-1 text-risk-yuksek">
          EKSİK
        </span>
        <span className="mt-1 block text-xs text-soluk">{h.neden}</span>
      </>
    );
  if (h.tur === "bos") return null;
  return (
    <>
      {h.metin}
      {kaynakGoster ? <span className="mt-1 block text-xs text-soluk">Kaynak: {kaynakMetni(h.kaynak)}</span> : null}
    </>
  );
}

function TabloBolumu({ tablo: t, kaynakGoster }: { tablo: UretilenTablo; kaynakGoster: boolean }) {
  const yer = t.kaynak.sayfa === null ? t.kaynak.bolum : `${t.kaynak.bolum}, s. ${t.kaynak.sayfa}`;
  const baslikId = `tablo-${t.tanimKod}`;
  return (
    <section aria-labelledby={baslikId} className="mb-10">
      <h2 id={baslikId} className="text-lg">
        {t.baslik}
      </h2>
      <p className="mt-1 text-sm text-soluk">
        Kaynak şablon: {t.kaynak.dosya} ({yer}). {t.eksikSayisi} EKSİK hücre.
      </p>
      <section
        className={`mt-3 overflow-x-auto rounded-sm border border-cizgi ${odak}`}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: kaydırılabilir tablo klavyeyle kaydırılır (WCAG 2.1.1)
        tabIndex={0}
        aria-label={t.baslik}
      >
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">
            {t.baslik}, {t.programAd}
          </caption>
          <thead className="bg-yuzey-2">
            <tr>
              {t.basliklar.map((b, i) => (
                <th
                  // biome-ignore lint/suspicious/noArrayIndexKey: tablo satır ve sütunları sabit sıralıdır, yeniden sıralanmaz
                  key={`${i}-${b}`}
                  scope="col"
                  className="border-b border-cizgi px-3 py-2 text-left align-bottom font-normal"
                >
                  {b}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {t.satirlar.map((s, i) =>
              s.tur === "ara" ? (
                // biome-ignore lint/suspicious/noArrayIndexKey: tablo satırları sabit sıralıdır
                <tr key={`ara-${i}-${s.metin}`}>
                  <th
                    scope="colgroup"
                    colSpan={t.basliklar.length}
                    className="bg-yuzey px-3 py-2 text-left font-normal text-soluk"
                  >
                    {s.metin}
                  </th>
                </tr>
              ) : (
                <tr
                  // biome-ignore lint/suspicious/noArrayIndexKey: tablo satır ve sütunları sabit sıralıdır, yeniden sıralanmaz
                  key={`${s.tur}-${i}-${hucreMetni(s.hucreler[0] ?? { tur: "bos" })}`}
                  className={s.tur === "toplam" ? "border-t-2 border-cizgi-guclu" : ""}
                >
                  {s.hucreler.map((h, j) =>
                    j === 0 ? (
                      <th
                        // biome-ignore lint/suspicious/noArrayIndexKey: tablo satır ve sütunları sabit sıralıdır, yeniden sıralanmaz
                        key={j}
                        scope="row"
                        className="border-b border-cizgi px-3 py-2 text-left align-top font-normal"
                      >
                        <HucreIcerigi h={h} kaynakGoster={kaynakGoster} />
                      </th>
                    ) : (
                      // biome-ignore lint/suspicious/noArrayIndexKey: sütunlar sabit sıralıdır
                      <td key={j} className="border-b border-cizgi px-3 py-2 align-top">
                        <HucreIcerigi h={h} kaynakGoster={kaynakGoster} />
                      </td>
                    ),
                  )}
                </tr>
              ),
            )}
          </tbody>
        </table>
      </section>
      {t.notlar.length ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-soluk">
          {t.notlar.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function KararHucresi({ s, etiketler }: { s: T.EslemeSatiri; etiketler?: Map<string, string> }) {
  return (
    <>
      {s.karar ? (
        <>
          <span>{degerMetni(s.karar.deger, etiketler)}</span>
          <span className="mt-1 block text-xs text-soluk">{kararOzeti(s.karar)}</span>
        </>
      ) : (
        <span className="inline-block rounded-sm border border-dashed border-risk-yuksek px-1 text-risk-yuksek">
          EKSİK
        </span>
      )}
      {s.oneri ? (
        <span className="mt-1 block text-xs text-soluk">
          {s.oneri.uretici === "yz" ? "Yapay zekâ önerisi" : "Öneri"}: {degerMetni(s.oneri.deger, etiketler)}.
          Onaylanmadı.
        </span>
      ) : null}
    </>
  );
}

function EslemeFormu({ durum }: { durum: T.ProgramTablolari }) {
  const e = durum.eslemeler;
  const kurul = new Map(durum.cerceve.kurulCiktilari.map((k) => [k.kod, k.etiket]));
  const ad = durum.cerceve.dersEslemeAdi;
  if (!durum.bologna)
    return (
      <section id="eslemeler" aria-labelledby="esleme-baslik" className="mb-10">
        <h2 id="esleme-baslik" className="text-lg">
          Eşlemeler
        </h2>
        <BosDurum
          baslik="Bologna verisi aktarılmadı."
          aciklama="Eşleme için önce programın ders bilgi paketini aktarın."
        />
      </section>
    );
  return (
    <section id="eslemeler" aria-labelledby="esleme-baslik" className="mb-10">
      <h2 id="esleme-baslik" className="text-lg">
        Eşlemeler
      </h2>
      <p className="mt-1 max-w-3xl text-sm text-soluk">
        Ders {ad}, program çıktısı ile kurul çıktısı ilişkisi ve seçmeli ders yer sayısı kurumun kararıdır. Akredit
        bunları tahmin etmez. Öneri tabloya girmez; seçip onayladığınız değer adınız, zaman ve dayanakla kaydedilir.
        Önceki karar silinmez, yeni karar geçerli olur.
      </p>
      <form action={eslemeKaydet} className="mt-4 space-y-8">
        <input type="hidden" name="program" value={durum.program.id} />
        <input type="hidden" name="cerceve" value={durum.cerceve.kod} />

        <fieldset className="rounded-sm border border-cizgi bg-yuzey p-4">
          <legend className="px-1">Ders {ad}</legend>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  <th scope="col" className="px-2 py-2 text-left font-normal">
                    Ders
                  </th>
                  <th scope="col" className="px-2 py-2 text-left font-normal">
                    Geçerli karar
                  </th>
                  <th scope="col" className="px-2 py-2 text-left font-normal">
                    Yeni karar
                  </th>
                </tr>
              </thead>
              <tbody>
                {e.dersler.map((s) => (
                  <tr key={s.anahtar} className="border-t border-cizgi">
                    <th scope="row" className="px-2 py-2 text-left align-top font-normal">
                      {s.etiket}
                    </th>
                    <td className="px-2 py-2 align-top">
                      <KararHucresi s={s} />
                    </td>
                    <td className="px-2 py-2 align-top">
                      <select
                        name={`ders:${s.anahtar}`}
                        defaultValue=""
                        aria-label={`${s.etiket} için ${ad}`}
                        className={alanSinifi}
                      >
                        <option value="">Değiştirme</option>
                        {durum.cerceve.dersKodlari.map((k) => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </fieldset>

        {e.pcKurul.length ? (
          <fieldset className="rounded-sm border border-cizgi bg-yuzey p-4">
            <legend className="px-1">Program çıktısı ile kurul çıktısı</legend>
            <p className="text-sm text-soluk">
              Satırı kaydetmek için "Bu satırı onayla" kutusunu işaretleyin. Hiçbir kurul çıktısı seçilmezse program
              çıktısı hiçbirini kapsamaz diye kaydedilir.
            </p>
            {e.pcKurul.map((s) => (
              <fieldset key={s.anahtar} className="mt-4 border-t border-cizgi pt-3">
                <legend className="text-sm">{s.etiket}</legend>
                <div className="mt-1 text-sm">
                  <KararHucresi s={s} etiketler={kurul} />
                </div>
                <div className="mt-2 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
                  {durum.cerceve.kurulCiktilari.map((k) => (
                    <label key={k.kod} className="flex min-h-11 items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name={`pc:${s.anahtar}`}
                        value={k.kod}
                        defaultChecked={Array.isArray(s.karar?.deger) && s.karar.deger.includes(k.kod)}
                        className={`size-5 ${odak}`}
                      />
                      {k.etiket}
                    </label>
                  ))}
                </div>
                <label className="mt-2 flex min-h-11 items-center gap-2 text-sm">
                  <input type="checkbox" name={`pc-onay:${s.anahtar}`} value="1" className={`size-5 ${odak}`} />
                  Bu satırı onayla
                </label>
              </fieldset>
            ))}
          </fieldset>
        ) : null}

        {e.secmeliYer.length ? (
          <fieldset className="rounded-sm border border-cizgi bg-yuzey p-4">
            <legend className="px-1">Seçmeli ders yer sayısı</legend>
            <p className="text-sm text-soluk">
              Eğitim planında o yarıyılda kaç seçmeli ders yeri var? Toplamlar bu sayıyla hesaplanır; girilmezse toplam
              EKSİK kalır.
            </p>
            <div className="mt-2 grid gap-4 sm:grid-cols-3">
              {e.secmeliYer.map((s) => (
                <div key={s.anahtar}>
                  <label className="block text-sm">
                    {s.etiket}
                    <input
                      type="number"
                      name={`yer:${s.anahtar}`}
                      min={0}
                      max={50}
                      step={1}
                      inputMode="numeric"
                      className={alanSinifi}
                    />
                  </label>
                  <div className="mt-1 text-sm">
                    <KararHucresi s={s} />
                  </div>
                </div>
              ))}
            </div>
          </fieldset>
        ) : null}

        <div className="max-w-xl">
          <label className="block text-sm">
            Dayanak (zorunlu)
            <input
              name="dayanak"
              required
              minLength={3}
              maxLength={500}
              aria-describedby="dayanak-aciklama"
              className={alanSinifi}
            />
          </label>
          <p id="dayanak-aciklama" className="mt-1 text-sm text-soluk">
            Örnek: bölüm kurulu kararının tarihi ve sayısı.
          </p>
          <button type="submit" className={`${dugme(true)} mt-4`}>
            Seçimleri onayla
          </button>
        </div>
      </form>
    </section>
  );
}
