"use client";

// Onay kutusu: hocanın neredeyse tek dokunduğu ekran.
// Kurallar: yüksek risk toplu seçilemez, politikaya bağlanamaz; kanıtları her zaman açıktır.
// Kurallar arayüzde gizlemeyle yetinmez, VeriKaynagi da aynı kuralları uygular.

import { etkinRisk, ONERI_RISKI, type OneriId, type RiskDuzeyi } from "@akredit/cekirdek";
import { Check, FileText, Keyboard, Pencil, Wand2, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dugme } from "../../../bilesenler/dugme.tsx";
import { IletisimKutusu, useBildirim } from "../../../bilesenler/etkilesimli.tsx";
import { IsaretKutusu, MetinAlani, UzunMetinAlani } from "../../../bilesenler/form.tsx";
import { BosDurum, RiskRozeti, Rozet } from "../../../bilesenler/temel.tsx";
import { istemciVeriKaynagi } from "../../../veri/istemci.ts";
import type { OneriGorunumu, PolitikaKaydi } from "../../../veri/kaynak.ts";
import {
  KISAYOLLAR,
  kisayolEylemi,
  ONERI_TURU_ETIKETI,
  RISK_ETIKETI,
  riskeGoreGrupla,
  sinirla,
  yuzdeYaz,
} from "../../../veri/yardimci.ts";

type Atif = OneriGorunumu["atiflar"][number];

const GRUP_ACIKLAMASI: Record<RiskDuzeyi, string> = {
  yuksek:
    "Kurum adına beyan ya da dış gönderim. Her biri tek tek ve kanıtıyla incelenir; toplu onay ve otomatik onay yoktur.",
  orta: "İçeriği etkileyen öneriler. Kanıtına bakıp toplu onaylayabilirsiniz.",
  dusuk: "Etiketleme gibi düşük etkili işler. Toplu onaylayabilirsiniz.",
};

export function OnayKutusu({
  ilkOneriler,
  kanitAdlari,
}: {
  ilkOneriler: OneriGorunumu[];
  kanitAdlari: Record<string, string>;
}) {
  const kaynak = istemciVeriKaynagi();
  const bildir = useBildirim();
  const [oneriler, setOneriler] = useState(ilkOneriler);
  const [secili, setSecili] = useState<Set<OneriId>>(new Set());
  const [odak, setOdak] = useState(0);
  const [duzenlenen, setDuzenlenen] = useState<{ id: OneriId; metin: string } | null>(null);
  const [ret, setRet] = useState<{ id: OneriId; gerekce: string } | null>(null);
  const [kanit, setKanit] = useState<Atif | null>(null);
  const [politika, setPolitika] = useState<OneriGorunumu | null>(null);
  const [yardim, setYardim] = useState(false);
  const [sonKararSayisi, setSonKararSayisi] = useState(0);
  const [hazir, setHazir] = useState(false);
  const satirlar = useRef<Map<OneriId, HTMLElement>>(new Map());

  const yenile = useCallback(async () => {
    setOneriler(await kaynak.bekleyenOneriler());
    setSonKararSayisi((await kaynak.kararlar()).length);
  }, [kaynak]);

  useEffect(() => {
    setHazir(true);
    void yenile();
  }, [yenile]);

  const gruplar = useMemo(() => riskeGoreGrupla(oneriler, etkinRisk), [oneriler]);
  const sirali = useMemo(() => gruplar.flatMap((g) => g.ogeler), [gruplar]);
  const odaktaki = sirali[sinirla(odak, 0, sirali.length - 1)];

  const odaklan = useCallback(
    (i: number) => {
      const yeni = sinirla(i, 0, sirali.length - 1);
      setOdak(yeni);
      const o = sirali[yeni];
      if (o) satirlar.current.get(o.id)?.focus();
    },
    [sirali],
  );

  const karar = async (
    o: OneriGorunumu,
    sonuc: "onaylandi" | "duzeltildi" | "reddedildi",
    ek: { duzeltme?: string; gerekce?: string } = {},
  ) => {
    const s = await kaynak.kararVer({ oneriId: o.id, sonuc, ...ek });
    if (!s.tamam) {
      bildir(s.hata, "hata");
      return;
    }
    const metin = { onaylandi: "Onaylandı", duzeltildi: "Düzeltilerek onaylandı", reddedildi: "Reddedildi" }[sonuc];
    bildir(`${metin}: ${o.icerik.baslik}`, "basari");
    setSecili((s) => {
      const y = new Set(s);
      y.delete(o.id);
      return y;
    });
    await yenile();
  };

  const topluOnayla = async () => {
    const idler = [...secili];
    const s = await kaynak.topluKararVer(idler);
    if (!s.tamam) {
      bildir(s.hata, "hata");
      return;
    }
    bildir(`${s.deger.length} öneri onaylandı.`, "basari");
    setSecili(new Set());
    await yenile();
  };

  const secimDegistir = useCallback(
    (o: OneriGorunumu) => {
      if (etkinRisk(o) === "yuksek") {
        bildir("Yüksek riskli öneriler toplu seçilemez. Tek tek onaylayın.", "hata");
        return;
      }
      setSecili((s) => {
        const y = new Set(s);
        if (y.has(o.id)) y.delete(o.id);
        else y.add(o.id);
        return y;
      });
    },
    [bildir],
  );

  // Klavye kısayolları: yazı alanlarında ve açık iletişim kutusunda çalışmaz.
  useEffect(() => {
    const dinle = (e: KeyboardEvent) => {
      const hedef = e.target as HTMLElement | null;
      if (hedef?.closest("input, textarea, select, [contenteditable=true], dialog")) return;
      const eylem = kisayolEylemi(e.key, e.ctrlKey || e.metaKey || e.altKey);
      if (!eylem) return;
      e.preventDefault();
      if (eylem === "yardim") return setYardim(true);
      if (eylem === "sonraki") return odaklan(odak + 1);
      if (eylem === "onceki") return odaklan(odak - 1);
      if (!odaktaki) return;
      if (eylem === "onayla") void karar(odaktaki, "onaylandi");
      if (eylem === "duzelt") setDuzenlenen({ id: odaktaki.id, metin: odaktaki.icerik.metin });
      if (eylem === "reddet") setRet({ id: odaktaki.id, gerekce: "" });
      if (eylem === "sec") secimDegistir(odaktaki);
    };
    window.addEventListener("keydown", dinle);
    return () => window.removeEventListener("keydown", dinle);
  });

  const reddedilen = ret ? oneriler.find((o) => o.id === ret.id) : undefined;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3" data-hazir={hazir ? "evet" : undefined}>
        <p className="text-soluk" aria-live="polite">
          {oneriler.length} öneri bekliyor · bu oturumda {sonKararSayisi} karar verdiniz
        </p>
        <Dugme
          boy="kucuk"
          tur="sessiz"
          className="ml-auto"
          onClick={() => setYardim(true)}
          simge={<Keyboard aria-hidden className="size-4" />}
        >
          Klavye kısayolları
        </Dugme>
      </div>

      {oneriler.length === 0 ? (
        <BosDurum baslik="Bekleyen karar yok" aciklama="Yeni öneriler hazırlandığında burada görünecek." />
      ) : null}

      {gruplar.map(({ risk, ogeler }) => {
        if (ogeler.length === 0) return null;
        const toplu = risk !== "yuksek";
        const grupSecili = ogeler.filter((o) => secili.has(o.id));
        const hepsi = grupSecili.length === ogeler.length;
        return (
          <section key={risk} aria-labelledby={`grup-${risk}`} className="mb-8">
            <div className="sticky top-0 z-10 -mx-2 mb-3 flex flex-wrap items-center gap-3 border-b border-cizgi bg-zemin/95 px-2 py-2 backdrop-blur">
              <h2 id={`grup-${risk}`} className="flex items-center gap-2 text-xl font-bold">
                <RiskRozeti risk={risk} />
                <span>{ogeler.length} öneri</span>
              </h2>
              {toplu ? (
                <div className="ml-auto flex flex-wrap items-center gap-3">
                  <IsaretKutusu
                    etiket="Tümünü seç"
                    checked={hepsi}
                    onChange={() =>
                      setSecili((s) => {
                        const y = new Set(s);
                        for (const o of ogeler) {
                          if (hepsi) y.delete(o.id);
                          else y.add(o.id);
                        }
                        return y;
                      })
                    }
                  />
                  <Dugme
                    tur="birincil"
                    boy="kucuk"
                    disabled={grupSecili.length === 0}
                    onClick={() => {
                      setSecili(new Set(grupSecili.map((o) => o.id)));
                      void (async () => {
                        const s = await kaynak.topluKararVer(grupSecili.map((o) => o.id));
                        if (!s.tamam) return bildir(s.hata, "hata");
                        bildir(`${s.deger.length} öneri onaylandı.`, "basari");
                        setSecili(new Set());
                        await yenile();
                      })();
                    }}
                    simge={<Check aria-hidden className="size-4" />}
                  >
                    Seçilenleri onayla ({grupSecili.length})
                  </Dugme>
                </div>
              ) : null}
            </div>
            <p className="mb-3 max-w-prose text-sm text-soluk">{GRUP_ACIKLAMASI[risk]}</p>
            <ul className="space-y-3">
              {ogeler.map((o) => {
                const sira = sirali.indexOf(o);
                const odakta = sira === odak;
                const duzenleniyor = duzenlenen?.id === o.id;
                return (
                  <li key={o.id}>
                    <article
                      ref={(el) => {
                        if (el) satirlar.current.set(o.id, el);
                        else satirlar.current.delete(o.id);
                      }}
                      tabIndex={-1}
                      aria-labelledby={`${o.id}-baslik`}
                      onFocus={() => setOdak(sira)}
                      className={`rounded-lg border bg-yuzey p-4 ${
                        odakta
                          ? "border-vurgu ring-2 ring-vurgu"
                          : risk === "yuksek"
                            ? "border-risk-yuksek"
                            : "border-cizgi"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {toplu ? (
                          <input
                            type="checkbox"
                            className="mt-1.5 size-5 shrink-0 accent-[var(--vurgu)]"
                            checked={secili.has(o.id)}
                            onChange={() => secimDegistir(o)}
                            aria-label={`Seç: ${o.icerik.baslik}`}
                          />
                        ) : null}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 text-sm">
                            <Rozet>{ONERI_TURU_ETIKETI[o.tur]}</Rozet>
                            <span className="text-soluk">{o.konum}</span>
                            <span className="text-soluk">· Güven {yuzdeYaz(o.guven)}</span>
                          </div>
                          <h3 id={`${o.id}-baslik`} className="mt-1 text-lg font-semibold">
                            {o.icerik.baslik}
                          </h3>
                          {duzenleniyor ? (
                            <form
                              className="mt-2 space-y-2"
                              onSubmit={(e) => {
                                e.preventDefault();
                                void karar(o, "duzeltildi", { duzeltme: duzenlenen.metin }).then(() =>
                                  setDuzenlenen(null),
                                );
                              }}
                            >
                              <UzunMetinAlani
                                etiket="Düzeltilmiş metin"
                                value={duzenlenen.metin}
                                onChange={(e) => setDuzenlenen({ id: o.id, metin: e.target.value })}
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <Dugme type="submit" tur="birincil" boy="kucuk">
                                  Düzeltmeyi kaydet
                                </Dugme>
                                <Dugme boy="kucuk" onClick={() => setDuzenlenen(null)}>
                                  Vazgeç
                                </Dugme>
                              </div>
                            </form>
                          ) : (
                            <p className="mt-1">{o.icerik.metin}</p>
                          )}
                          <p className="mt-2 text-sm text-soluk">
                            <span className="font-semibold text-metin">Gerekçe: </span>
                            {o.gerekce}
                          </p>
                          <AtifListesi
                            atiflar={o.atiflar}
                            acik={risk === "yuksek"}
                            kanitAdlari={kanitAdlari}
                            ac={(a) => setKanit(a)}
                          />
                          {duzenleniyor ? null : (
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Dugme
                                tur="birincil"
                                boy="kucuk"
                                onClick={() => void karar(o, "onaylandi")}
                                simge={<Check aria-hidden className="size-4" />}
                              >
                                Onayla
                              </Dugme>
                              <Dugme
                                boy="kucuk"
                                onClick={() => setDuzenlenen({ id: o.id, metin: o.icerik.metin })}
                                simge={<Pencil aria-hidden className="size-4" />}
                              >
                                Düzelt
                              </Dugme>
                              <Dugme
                                tur="tehlike"
                                boy="kucuk"
                                onClick={() => setRet({ id: o.id, gerekce: "" })}
                                simge={<X aria-hidden className="size-4" />}
                              >
                                Reddet
                              </Dugme>
                              {toplu && ONERI_RISKI[o.tur] !== "yuksek" ? (
                                <Dugme
                                  tur="sessiz"
                                  boy="kucuk"
                                  onClick={() => setPolitika(o)}
                                  simge={<Wand2 aria-hidden className="size-4" />}
                                >
                                  Bu türü bundan sonra otomatik onayla
                                </Dugme>
                              ) : null}
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {secili.size > 0 ? (
        <div className="sticky bottom-3 z-20 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-vurgu bg-yuzey p-3 shadow-lg">
          <span className="font-semibold">{secili.size} öneri seçili</span>
          <div className="flex gap-2">
            <Dugme boy="kucuk" onClick={() => setSecili(new Set())}>
              Seçimi temizle
            </Dugme>
            <Dugme
              tur="birincil"
              boy="kucuk"
              onClick={() => void topluOnayla()}
              simge={<Check aria-hidden className="size-4" />}
            >
              Seçilenlerin hepsini onayla
            </Dugme>
          </div>
        </div>
      ) : null}

      <IletisimKutusu
        acik={ret !== null}
        kapat={() => setRet(null)}
        baslik="Öneriyi reddet"
        aciklama={reddedilen?.icerik.baslik}
        altlik={
          <>
            <Dugme onClick={() => setRet(null)}>Vazgeç</Dugme>
            <Dugme
              tur="tehlike"
              onClick={() => {
                if (!reddedilen || !ret) return;
                void karar(reddedilen, "reddedildi", { gerekce: ret.gerekce }).then(() => setRet(null));
              }}
            >
              Reddet
            </Dugme>
          </>
        }
      >
        <UzunMetinAlani
          etiket="Gerekçe (isteğe bağlı)"
          ipucu="Gerekçe, benzer önerilerin daha iyi hazırlanmasına yardım eder."
          value={ret?.gerekce ?? ""}
          onChange={(e) => setRet((r) => (r ? { ...r, gerekce: e.target.value } : r))}
        />
      </IletisimKutusu>

      <IletisimKutusu
        acik={kanit !== null}
        kapat={() => setKanit(null)}
        baslik={kanit ? (kanitAdlari[kanit.kanitId] ?? "Kanıt") : "Kanıt"}
        aciklama={kanit?.capa?.sayfa ? `Sayfa ${kanit.capa.sayfa}` : undefined}
        altlik={
          kanit ? (
            <Link
              href={`/panel/kanitlar/${kanit.kanitId}${kanit.parcaId ? `#${kanit.parcaId}` : ""}`}
              className="inline-flex min-h-11 items-center gap-2 font-semibold text-vurgu underline underline-offset-4"
            >
              <FileText aria-hidden className="size-4" />
              Kanıtın tamamını aç
            </Link>
          ) : null
        }
      >
        <blockquote className="border-l-4 border-vurgu bg-vurgu-zemin px-4 py-3 text-lg">“{kanit?.alinti}”</blockquote>
      </IletisimKutusu>

      <PolitikaKutusu oneri={politika} kapat={() => setPolitika(null)} />

      <IletisimKutusu acik={yardim} kapat={() => setYardim(false)} baslik="Klavye kısayolları">
        <dl className="grid grid-cols-[3rem_1fr] gap-y-2">
          {KISAYOLLAR.map((k) => (
            <div key={k.tus} className="contents">
              <dt>
                <kbd className="rounded border border-cizgi-guclu bg-yuzey-2 px-2 py-0.5 font-mono">{k.tus}</kbd>
              </dt>
              <dd>{k.aciklama}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm text-soluk">Kısayollar bir metin alanına yazarken çalışmaz.</p>
      </IletisimKutusu>
    </>
  );
}

function AtifListesi({
  atiflar,
  acik,
  kanitAdlari,
  ac,
}: {
  atiflar: Atif[];
  acik: boolean;
  kanitAdlari: Record<string, string>;
  ac: (a: Atif) => void;
}) {
  if (atiflar.length === 0)
    return (
      <p className="mt-2 inline-flex items-center gap-1 rounded border-2 border-dashed border-risk-yuksek bg-risk-yuksek-zemin px-2 py-1 text-sm font-bold text-risk-yuksek">
        EKSİK: Bu öneri hiçbir kanıta bağlanamadı. Onaylamadan önce kanıt ekleyin.
      </p>
    );
  return (
    <div className="mt-2">
      <p className="text-sm font-semibold">Kanıt</p>
      <ul className="mt-1 space-y-2">
        {atiflar.map((a) => (
          <li key={`${a.kanitId}-${a.parcaId ?? ""}`}>
            <button
              type="button"
              onClick={() => ac(a)}
              className="inline-flex min-h-8 items-center gap-1 rounded-full border border-vurgu bg-vurgu-zemin px-3 text-sm font-semibold text-vurgu hover:underline"
            >
              <FileText aria-hidden className="size-4" />
              {kanitAdlari[a.kanitId] ?? a.kanitId}
              {a.capa?.sayfa ? `, s. ${a.capa.sayfa}` : ""}
            </button>
            {acik && a.alinti ? (
              <blockquote className="mt-1 border-l-4 border-cizgi-guclu pl-3 text-sm">“{a.alinti}”</blockquote>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function PolitikaKutusu({ oneri, kapat }: { oneri: OneriGorunumu | null; kapat: () => void }) {
  const kaynak = istemciVeriKaynagi();
  const bildir = useBildirim();
  const [ad, setAd] = useState("");
  const [guven, setGuven] = useState("90");
  const [hata, setHata] = useState<string | null>(null);
  const [taslak, setTaslak] = useState<PolitikaKaydi | null>(null);
  const [imza, setImza] = useState("");

  useEffect(() => {
    if (oneri) {
      setAd(`${ONERI_TURU_ETIKETI[oneri.tur]} otomatik onayı`);
      setGuven("90");
      setHata(null);
      setTaslak(null);
      setImza("");
    }
  }, [oneri]);

  if (!oneri) return <IletisimKutusu acik={false} kapat={kapat} baslik="Otomatik onay politikası" />;
  const risk = ONERI_RISKI[oneri.tur];

  const olustur = async () => {
    const s = await kaynak.politikaTaslagiOlustur({
      ad,
      oneriTurleri: [oneri.tur],
      enYuksekRisk: risk,
      enDusukGuven: Number(guven) / 100,
    });
    if (!s.tamam) return setHata(s.hata);
    setHata(null);
    setTaslak(s.deger);
  };

  const imzala = async () => {
    if (!taslak) return;
    const s = await kaynak.politikaImzala(taslak.id, imza);
    if (!s.tamam) return setHata(s.hata);
    bildir("Politika imzalandı ve günlüğe yazıldı.", "basari");
    kapat();
  };

  return (
    <IletisimKutusu
      acik
      kapat={kapat}
      baslik="Otomatik onay politikası"
      aciklama={`“${ONERI_TURU_ETIKETI[oneri.tur]}” türündeki öneriler bundan sonra sizin adınıza onaylansın.`}
      altlik={
        taslak ? (
          <>
            <Dugme onClick={kapat}>Sonra imzalarım</Dugme>
            <Dugme tur="birincil" onClick={() => void imzala()}>
              İmzala
            </Dugme>
          </>
        ) : (
          <>
            <Dugme onClick={kapat}>Vazgeç</Dugme>
            <Dugme tur="birincil" onClick={() => void olustur()}>
              Taslağı oluştur
            </Dugme>
          </>
        )
      }
    >
      {taslak ? (
        <div className="space-y-3">
          <p>
            Taslak hazır. Politika ancak siz imzalayınca yürürlüğe girer. İmza adınız ve zamanıyla günlüğe yazılır.
            İmzalamazsanız taslak Ayarlar sayfasında bekler.
          </p>
          <MetinAlani
            etiket="İmzalamak için adınızı yazın"
            ipucu="Hesabınızdaki adla aynı olmalı."
            value={imza}
            onChange={(e) => setImza(e.target.value)}
            hata={hata}
          />
        </div>
      ) : (
        <div className="space-y-4">
          <ul className="list-disc space-y-1 pl-5 text-sm">
            <li>Risk sınırı: {RISK_ETIKETI[risk]}. Yüksek riskli işler hiçbir zaman otomatik onaylanmaz.</li>
            <li>Güveni eşiğin altında kalan öneriler yine onay kutusuna düşer.</li>
            <li>Politikayı istediğiniz zaman Ayarlar sayfasından görebilirsiniz.</li>
          </ul>
          <MetinAlani etiket="Politikanın adı" value={ad} onChange={(e) => setAd(e.target.value)} />
          <MetinAlani
            etiket="En düşük güven (yüzde)"
            type="number"
            min={0}
            max={100}
            inputMode="numeric"
            value={guven}
            onChange={(e) => setGuven(e.target.value)}
            hata={hata}
          />
        </div>
      )}
    </IletisimKutusu>
  );
}
