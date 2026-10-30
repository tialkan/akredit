"use client";

// Cümleden kanıta tek tık (İP-44). Her cümle bir düğmedir: Sekme tuşuyla cümleler arasında gezilir, Enter
// ya da tıklama yan paneli açar. Panel kanıtın ilgili sayfasını ya da satırını vurgular, SHA-256 özetini ve
// onay bilgisini gösterir. Kanıtı olmayan cümle ayrı renkte ve "kanıt yok" yazısıyla görünür. Bileşen salt
// okunurdur; panelde ve değerlendirici portalında aynen kullanılır.

import { FileText, X } from "lucide-react";
import { Fragment, useEffect, useRef, useState } from "react";
import { KURAL_ADI, type OkuyucuBolumu, type OkuyucuCumlesi, type OkuyucuKaniti } from "./okuyucu-modeli.ts";

function tarih(iso: string): string {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(new Date(iso));
}

const SONUC: Record<string, string> = {
  onaylandi: "Onaylandı",
  duzeltildi: "Düzeltilerek onaylandı",
  reddedildi: "Reddedildi",
};
const DAYANAK: Record<string, string> = {
  dogrudan: "kişinin kararı",
  politika: "yetki devri politikası",
  sure_dolumu: "süre dolumu",
};

function konum(c: unknown): string {
  const k = (c ?? {}) as Record<string, unknown>;
  if (typeof k.hucre === "string") return k.hucre;
  if (typeof k.sayfa === "number") return `Sayfa ${k.sayfa}`;
  if (typeof k.slayt === "number") return `Slayt ${k.slayt}`;
  if (typeof k.bolum === "string") return `Bölüm ${k.bolum}`;
  if (typeof k.satir === "number") return `Satır ${k.satir}`;
  return "";
}

function KanitPaneli({
  cumle,
  kanitlar,
  erisilemeyen,
  kapat,
  kanitYolu,
}: {
  cumle: OkuyucuCumlesi;
  kanitlar: Record<string, OkuyucuKaniti>;
  kanitYolu: string;
  erisilemeyen: readonly string[];
  kapat: () => void;
}) {
  const [secili, setSecili] = useState(0);
  const baslik = useRef<HTMLHeadingElement>(null);
  const atif = cumle.atiflar[secili];
  const kanit = atif ? kanitlar[atif.kanitId] : undefined;
  const vurguluParcalar = new Map((atif?.vurgu ?? []).map((v) => [v.parcaId, v.satirlar]));

  useEffect(() => {
    baslik.current?.focus();
    const ilk = atif?.vurgu[0]?.parcaId;
    if (ilk) document.getElementById(`parca-${ilk}`)?.scrollIntoView({ block: "nearest" });
  }, [atif]);

  return (
    <section
      aria-labelledby="kanit-paneli-baslik"
      className="rounded-sm border border-cizgi bg-yuzey p-4 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto"
      onKeyDown={(e) => {
        if (e.key === "Escape") kapat();
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <h2 id="kanit-paneli-baslik" ref={baslik} tabIndex={-1} className="text-lg font-semibold">
          {cumle.eksik ? "Bu cümlenin kanıtı yok" : kanit ? kanit.baslik : "Kanıt"}
        </h2>
        <button
          type="button"
          onClick={kapat}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded hover:bg-yuzey-2"
        >
          <X aria-hidden className="size-5" />
          <span className="sr-only">Paneli kapat</span>
        </button>
      </div>
      <p className="mt-1 text-sm text-soluk">“{cumle.metin}”</p>

      {cumle.eksik ? (
        <p className="mt-3 rounded-sm border border-dashed border-risk-yuksek bg-risk-yuksek-zemin p-3">
          Bu cümle hiçbir kanıta bağlı değil. Kanıt eklenene kadar raporda kanıtsız iddia olarak işaretli kalır.
        </p>
      ) : cumle.atiflar.length === 0 && cumle.hesapli ? (
        <p className="mt-3">Bu cümledeki değer kayıtlı bir hesaptan gelir. Hesabın dayanakları rapor ekindedir.</p>
      ) : null}

      {cumle.atiflar.length > 1 && (
        <fieldset className="mt-3 flex flex-wrap gap-2">
          <legend className="sr-only">Cümlenin kanıtları</legend>
          {cumle.atiflar.map((a, i) => (
            <button
              key={`${a.kanitId}-${a.konum}`}
              type="button"
              aria-pressed={i === secili}
              onClick={() => setSecili(i)}
              className={`min-h-11 rounded-full border px-3 text-sm ${i === secili ? "border-vurgu bg-vurgu-zemin font-semibold text-vurgu" : "border-cizgi"}`}
            >
              {kanitlar[a.kanitId]?.baslik ?? "Kanıt"} {a.konum}
            </button>
          ))}
        </fieldset>
      )}

      {atif && !kanit && (
        <p className="mt-3">
          {erisilemeyen.includes(atif.kanitId)
            ? "Bu kanıtı görme yetkiniz yok."
            : "Kanıt bulunamadı. Kalite biriminden kanıtın kaydını denetlemesini isteyin."}
        </p>
      )}

      {kanit && atif && (
        <>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
            <dt className="text-soluk">Dosya</dt>
            <dd className="break-all">{kanit.dosyaAdi}</dd>
            <dt className="text-soluk">Konum</dt>
            <dd>{atif.konum || "Belgenin tamamı"}</dd>
            <dt className="text-soluk">İçerik özeti</dt>
            <dd>
              <code className="break-all text-xs">{kanit.ozet}</code>
              <span className="sr-only"> (SHA-256)</span>
            </dd>
            <dt className="text-soluk">Onay</dt>
            <dd>
              {kanit.onay ? (
                <>
                  {SONUC[kanit.onay.sonuc] ?? kanit.onay.sonuc}
                  {kanit.onay.kisi ? `, ${kanit.onay.kisi}` : ""},{" "}
                  <time dateTime={kanit.onay.zaman}>{tarih(kanit.onay.zaman)}</time> (
                  {DAYANAK[kanit.onay.dayanak] ?? kanit.onay.dayanak})
                </>
              ) : (
                "Ölçüt bağı için karar kaydı yok"
              )}
            </dd>
          </dl>
          <p className="mt-2 text-sm">
            <a
              href={`${kanitYolu}${kanit.id}${atif.vurgu[0] ? `#${atif.vurgu[0].parcaId}` : ""}`}
              className="inline-block py-2 underline underline-offset-4"
            >
              Kanıtı ayrı sayfada aç
            </a>
          </p>
          {atif.konum && atif.vurgu.length === 0 && (
            <p className="mt-3 text-sm">
              Belirtilen konum belgenin okunan metninde bulunamadı. Belgenin tamamı gösteriliyor.
            </p>
          )}
          {kanit.parcalar.length === 0 ? (
            <p className="mt-3">Bu belgenin metni henüz okunmadı.</p>
          ) : (
            <ol className="mt-3 space-y-3" aria-label="Belge metni">
              {kanit.parcalar.map((p) => {
                const satirlar = vurguluParcalar.get(p.id);
                const vurgulu = satirlar !== undefined;
                return (
                  <li
                    key={p.id}
                    id={`parca-${p.id}`}
                    className={`rounded-sm border p-3 ${vurgulu ? "border-vurgu bg-vurgu-zemin" : "border-cizgi"}`}
                  >
                    <p className="mb-1 text-sm text-soluk">
                      {konum(p.capa) || `Parça ${p.sira + 1}`}
                      {vurgulu ? <span className="ml-2 font-semibold text-vurgu">Atıf verilen yer</span> : null}
                    </p>
                    <p className="whitespace-pre-wrap text-sm">
                      {satirlar && satirlar.length > 0
                        ? p.metin.split("\n").map((s, i) => (
                            // biome-ignore lint/suspicious/noArrayIndexKey: satırlar sabit sıralı
                            <Fragment key={i}>
                              {satirlar.includes(i) ? <mark className="bg-risk-orta-zemin text-metin">{s}</mark> : s}
                              {"\n"}
                            </Fragment>
                          ))
                        : p.metin}
                    </p>
                  </li>
                );
              })}
            </ol>
          )}
        </>
      )}
    </section>
  );
}

export interface RaporOkuyucuOzellikleri {
  bolumler: OkuyucuBolumu[];
  kanitlar: OkuyucuKaniti[];
  erisilemeyen?: string[];
  /** Panel açık başlasın istenen cümle (bağlantıyla gelen ya da test çizimi). */
  ilkAcik?: string;
  /** Kanıt sayfasının yolu: panelde "/panel/kanitlar/", portalda "/degerlendirici/kanit/". */
  kanitYolu?: string;
}

export function RaporOkuyucu({
  bolumler,
  kanitlar,
  erisilemeyen = [],
  ilkAcik,
  kanitYolu = "/panel/kanitlar/",
}: RaporOkuyucuOzellikleri) {
  const [acik, setAcik] = useState<OkuyucuCumlesi | null>(
    () => bolumler.flatMap((b) => b.paragraflar.flat()).find((c) => c.id === ilkAcik) ?? null,
  );
  const sonDugme = useRef<HTMLButtonElement | null>(null);
  const kanitHaritasi = Object.fromEntries(kanitlar.map((k) => [k.id, k]));
  const kapat = () => {
    setAcik(null);
    sonDugme.current?.focus();
  };
  return (
    <div className={`grid gap-6 ${acik ? "lg:grid-cols-[1fr_28rem]" : ""}`}>
      <article className="space-y-8 rounded-sm border border-cizgi bg-yuzey p-6">
        <p className="text-sm text-soluk">
          Bir cümleyi seçin, kanıtı yanda açılır. Sekme tuşuyla cümleler arasında gezilir, Esc paneli kapatır.
        </p>
        {bolumler.map((b, i) => (
          <section key={b.id} id={b.id} aria-labelledby={`${b.id}-b`} className="scroll-mt-4">
            <h2 id={`${b.id}-b`} className="flex flex-wrap items-center gap-2 text-xl font-semibold">
              {i + 1}. {b.baslik}
              {b.olcut ? (
                <span className="rounded-full border border-cizgi px-2 text-sm font-normal">{b.olcut}</span>
              ) : null}
            </h2>
            <div className="mt-3 space-y-4">
              {b.paragraflar.map((p, j) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: paragraflar sabit sıralı
                <p key={j} className="max-w-prose text-lg leading-relaxed">
                  {p.map((c) => (
                    <Fragment key={c.id}>
                      <button
                        type="button"
                        aria-expanded={acik?.id === c.id}
                        aria-controls={acik?.id === c.id ? "kanit-paneli" : undefined}
                        onClick={(e) => {
                          sonDugme.current = e.currentTarget;
                          setAcik(c);
                        }}
                        className={`inline rounded-sm px-0.5 text-left underline-offset-4 hover:underline ${
                          c.eksik ? "bg-risk-yuksek-zemin text-metin decoration-dashed" : ""
                        } ${acik?.id === c.id ? "bg-vurgu-zemin underline" : ""} ${
                          c.dilBulgulari.length ? "underline decoration-risk-orta decoration-wavy" : ""
                        }`}
                      >
                        {c.metin}
                        {c.eksik ? (
                          <span className="ml-1 text-sm font-semibold text-risk-yuksek">(kanıt yok)</span>
                        ) : null}
                        {!c.eksik && c.atiflar.length > 0 ? (
                          <FileText aria-hidden className="ml-1 inline size-4 align-baseline text-vurgu" />
                        ) : null}
                        <span className="sr-only">
                          {c.eksik
                            ? ""
                            : c.atiflar.length
                              ? `, ${c.atiflar.length} kanıt`
                              : c.hesapli
                                ? ", hesaba dayalı"
                                : ""}
                          {c.dilBulgulari.length
                            ? `, dil bulgusu: ${c.dilBulgulari.map((d) => KURAL_ADI[d.kural] ?? d.kural).join(", ")}`
                            : ""}
                        </span>
                      </button>{" "}
                    </Fragment>
                  ))}
                </p>
              ))}
            </div>
          </section>
        ))}
      </article>
      {acik ? (
        <div id="kanit-paneli">
          <KanitPaneli
            key={acik.id}
            cumle={acik}
            kanitlar={kanitHaritasi}
            erisilemeyen={erisilemeyen}
            kapat={kapat}
            kanitYolu={kanitYolu}
          />
        </div>
      ) : null}
    </div>
  );
}
