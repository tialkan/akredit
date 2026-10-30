"use client";

// Şablon düzenleyici (İP-43): hoca örnek kâğıt sayfası üzerinde öğrenci numarası kutusunu, soru puan kutularını
// ve (varsa) kâğıttaki toplam kutusunu işaretler. Kayıt `@akredit/servis` şablon şemasına gider (konumlar sayfaya
// göre oransal, 0-1).
//
// Üç yol da aynı sonucu verir: fareyle (ya da dokunmayla) sürükleyerek çizmek; klavyeyle (kutu alanına odaklanıp
// ok tuşlarıyla taşımak, Shift ile hızlı, Alt ile boyutlandırmak); ya da sayı alanlarına konumu yüzde olarak
// yazmak. Örnek sayfa görüntüsü yalnız tarayıcıda gösterilir, sunucuya gönderilmez.

import { type KeyboardEvent, type PointerEvent, useEffect, useId, useMemo, useRef, useState } from "react";
import { Dugme } from "../../../../../bilesenler/dugme.tsx";
import { sablonKaydetEylem } from "./eylem.ts";
import { alanAdi, type Kutu, type PanelAraci, type Sablon } from "./veri.ts";

const NUMARA = "*numara";
const TOPLAM = "*toplam";
const ADIM = 0.01;
const HIZLI = 0.05;
const EN_KUCUK = 0.01;

const yuvarla = (x: number) => Math.round(x * 10000) / 10000;
const sinirla = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));

/** Kutuyu sayfanın içinde tutar. */
export function kutuDuzelt(k: Kutu): Kutu {
  const genislik = sinirla(k.genislik, EN_KUCUK, 1);
  const yukseklik = sinirla(k.yukseklik, EN_KUCUK, 1);
  return {
    sayfa: Math.max(1, Math.round(k.sayfa)),
    x: yuvarla(sinirla(k.x, 0, 1 - genislik)),
    y: yuvarla(sinirla(k.y, 0, 1 - yukseklik)),
    genislik: yuvarla(genislik),
    yukseklik: yuvarla(yukseklik),
  };
}

/** Ok tuşunun kutuya etkisi: taşıma ya da (Alt ile) boyutlandırma. Tanınmayan tuşta null. */
export function tusEtkisi(k: Kutu, tus: string, hizli: boolean, boyut: boolean): Kutu | null {
  const d = hizli ? HIZLI : ADIM;
  const yon: Record<string, [number, number]> = {
    ArrowLeft: [-d, 0],
    ArrowRight: [d, 0],
    ArrowUp: [0, -d],
    ArrowDown: [0, d],
  };
  const v = yon[tus];
  if (!v) return null;
  return kutuDuzelt(
    boyut
      ? { ...k, genislik: k.genislik + v[0], yukseklik: k.yukseklik + v[1] }
      : { ...k, x: k.x + v[0], y: k.y + v[1] },
  );
}

/** Kaydetmeden önce denetim; eksik varsa Türkçe iletiler. */
export function sablonDenetle(
  kutular: Record<string, Kutu | null>,
  sorular: readonly string[],
): { tamam: true } | { tamam: false; eksikler: string[] } {
  const eksik: string[] = [];
  if (!kutular[NUMARA]) eksik.push("Öğrenci numarası kutusunu işaretleyin.");
  for (const s of sorular) if (!kutular[s]) eksik.push(`Soru ${s} kutusunu işaretleyin.`);
  return eksik.length ? { tamam: false, eksikler: eksik } : { tamam: true };
}

const VARSAYILAN: Kutu = { sayfa: 1, x: 0.4, y: 0.45, genislik: 0.15, yukseklik: 0.06 };

export function SablonDuzenleyici({ dersId, arac }: { dersId: string; arac: PanelAraci }) {
  const kimlik = useId();
  const sorular = useMemo(() => arac.sorular.map((q) => q.numara), [arac.sorular]);
  const adlar = useMemo(() => [NUMARA, ...sorular, TOPLAM], [sorular]);
  const [kutular, setKutular] = useState<Record<string, Kutu | null>>(() => baslangic(arac));
  const [secili, setSecili] = useState<string>(NUMARA);
  const [sayfa, setSayfa] = useState(1);
  const [sinirTuru, setSinirTuru] = useState<"sayfa" | "kapak">(arac.sablon?.sinir.tur ?? "sayfa");
  const [sayfaSayisi, setSayfaSayisi] = useState(
    arac.sablon?.sinir.tur === "sayfa" ? String(arac.sablon.sinir.sayfaSayisi) : "1",
  );
  const [isaret, setIsaret] = useState(arac.sablon?.sinir.tur === "kapak" ? arac.sablon.sinir.isaret : "");
  const [numaraUzunlugu, setNumaraUzunlugu] = useState(
    arac.sablon?.numaraUzunlugu ? String(arac.sablon.numaraUzunlugu) : "",
  );
  const [goruntu, setGoruntu] = useState<string | null>(null);
  const [ileti, setIleti] = useState("");
  const [hatalar, setHatalar] = useState<string[]>([]);
  const [kaydediliyor, setKaydediliyor] = useState(false);
  const alan = useRef<HTMLDivElement>(null);
  const cizim = useRef<{ x: number; y: number } | null>(null);

  useEffect(
    () => () => {
      if (goruntu) URL.revokeObjectURL(goruntu);
    },
    [goruntu],
  );

  const kutu = kutular[secili] ?? null;
  const enCokSayfa = sinirTuru === "sayfa" ? Math.max(1, Math.min(20, Number(sayfaSayisi) || 1)) : 20;

  function koy(ad: string, k: Kutu | null) {
    setKutular((v) => ({ ...v, [ad]: k ? kutuDuzelt(k) : null }));
  }

  function konum(e: PointerEvent<HTMLDivElement>): { x: number; y: number } {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: sinirla((e.clientX - r.left) / r.width, 0, 1), y: sinirla((e.clientY - r.top) / r.height, 0, 1) };
  }

  function basla(e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    cizim.current = konum(e);
  }
  function surukle(e: PointerEvent<HTMLDivElement>) {
    const b = cizim.current;
    if (!b) return;
    const p = konum(e);
    koy(secili, {
      sayfa,
      x: Math.min(b.x, p.x),
      y: Math.min(b.y, p.y),
      genislik: Math.max(EN_KUCUK, Math.abs(p.x - b.x)),
      yukseklik: Math.max(EN_KUCUK, Math.abs(p.y - b.y)),
    });
  }
  function bitir() {
    if (!cizim.current) return;
    cizim.current = null;
    setIleti(`${alanAdi(secili)} kutusu işaretlendi.`);
  }

  function tus(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!kutu) {
        koy(secili, { ...VARSAYILAN, sayfa });
        setIleti(`${alanAdi(secili)} kutusu sayfanın ortasına kondu. Ok tuşlarıyla taşıyın, Alt ile boyutlandırın.`);
      }
      return;
    }
    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      koy(secili, null);
      setIleti(`${alanAdi(secili)} kutusu kaldırıldı.`);
      return;
    }
    if (!kutu) return;
    const y = tusEtkisi(kutu, e.key, e.shiftKey, e.altKey);
    if (!y) return;
    e.preventDefault();
    koy(secili, y);
    setIleti(konumMetni(alanAdi(secili), y));
  }

  async function kaydet() {
    const d = sablonDenetle(kutular, sorular);
    if (!d.tamam) {
      setHatalar(d.eksikler);
      setIleti("Şablon kaydedilmedi; eksikleri tamamlayın.");
      return;
    }
    const uzunluk = numaraUzunlugu.trim() ? Number(numaraUzunlugu) : undefined;
    if (uzunluk !== undefined && (!Number.isInteger(uzunluk) || uzunluk < 4 || uzunluk > 14)) {
      setHatalar(["Numara hane sayısı 4 ile 14 arasında bir tam sayı olmalı ya da boş bırakılmalı."]);
      return;
    }
    if (sinirTuru === "kapak" && isaret.trim().length < 3) {
      setHatalar(["Kapak sayfasındaki işaret metnini (en az 3 harf) yazın."]);
      return;
    }
    const sablon: Sablon = {
      sinir:
        sinirTuru === "sayfa" ? { tur: "sayfa", sayfaSayisi: enCokSayfa } : { tur: "kapak", isaret: isaret.trim() },
      numara: kutular[NUMARA] as Kutu,
      ...(uzunluk ? { numaraUzunlugu: uzunluk } : {}),
      ...(kutular[TOPLAM] ? { toplam: kutular[TOPLAM] as Kutu } : {}),
      sorular: sorular.map((s) => ({ soruNo: s, kutu: kutular[s] as Kutu })),
    };
    setHatalar([]);
    setKaydediliyor(true);
    const r = await sablonKaydetEylem(dersId, arac.id, sablon);
    setKaydediliyor(false);
    setIleti(r.tamam ? "Şablon kaydedildi. Artık taranmış kâğıtları yükleyebilirsiniz." : r.ileti);
  }

  const sayfadakiler = adlar.filter((a) => kutular[a] && (kutular[a] as Kutu).sayfa === sayfa);

  return (
    <div className="space-y-4">
      <p>
        Örnek bir kâğıt üzerinde öğrenci numarası kutusunu ve her sorunun puan kutusunu bir kez işaretleyin. Bütün
        kâğıtlar bu yerlere göre okunur.
      </p>

      <fieldset className="space-y-2">
        <legend className="font-semibold">Kâğıtlar nasıl ayrılsın?</legend>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name={`${kimlik}-sinir`}
              checked={sinirTuru === "sayfa"}
              onChange={() => setSinirTuru("sayfa")}
            />
            Her kâğıt aynı sayıda sayfa
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name={`${kimlik}-sinir`}
              checked={sinirTuru === "kapak"}
              onChange={() => setSinirTuru("kapak")}
            />
            Her kâğıt işaretli bir kapakla başlar
          </label>
        </div>
        {sinirTuru === "sayfa" ? (
          <Alan etiket="Kâğıt başına sayfa" kimlik={`${kimlik}-ss`}>
            <input
              id={`${kimlik}-ss`}
              inputMode="numeric"
              className={GIRDI}
              value={sayfaSayisi}
              onChange={(e) => setSayfaSayisi(e.target.value)}
            />
          </Alan>
        ) : (
          <Alan etiket="Kapaktaki işaret metni" kimlik={`${kimlik}-is`}>
            <input
              id={`${kimlik}-is`}
              className={`${GIRDI} w-72`}
              value={isaret}
              onChange={(e) => setIsaret(e.target.value)}
            />
          </Alan>
        )}
        <Alan etiket="Öğrenci numarasının hane sayısı (isteğe bağlı)" kimlik={`${kimlik}-nu`}>
          <input
            id={`${kimlik}-nu`}
            inputMode="numeric"
            className={GIRDI}
            value={numaraUzunlugu}
            onChange={(e) => setNumaraUzunlugu(e.target.value)}
          />
        </Alan>
      </fieldset>

      <div className="flex flex-wrap items-end gap-4">
        <Alan etiket="Örnek sayfa görüntüsü (yalnız bu ekranda gösterilir)" kimlik={`${kimlik}-g`}>
          <input
            id={`${kimlik}-g`}
            type="file"
            accept="image/png,image/jpeg"
            className="text-sm"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setGoruntu(f ? URL.createObjectURL(f) : null);
            }}
          />
        </Alan>
        <Alan etiket="Gösterilen sayfa" kimlik={`${kimlik}-sy`}>
          <select
            id={`${kimlik}-sy`}
            className={GIRDI}
            value={sayfa}
            onChange={(e) => setSayfa(Number(e.target.value))}
          >
            {sayfaNumaralari(enCokSayfa).map((n) => (
              <option key={n} value={n}>
                {n}. sayfa
              </option>
            ))}
          </select>
        </Alan>
      </div>

      <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
        <fieldset className="space-y-1">
          <legend className="font-semibold">İşaretlenecek kutu</legend>
          {adlar.map((a) => (
            <label key={a} className="flex items-center gap-2">
              <input
                type="radio"
                name={`${kimlik}-kutu`}
                checked={secili === a}
                onChange={() => {
                  setSecili(a);
                  const k = kutular[a];
                  if (k) setSayfa(k.sayfa);
                }}
              />
              <span>
                {alanAdi(a)}
                {a === TOPLAM && " (isteğe bağlı)"}
                <span className="text-sm text-soluk">
                  {" "}
                  · {kutular[a] ? `${(kutular[a] as Kutu).sayfa}. sayfada işaretli` : "işaretlenmedi"}
                </span>
              </span>
            </label>
          ))}
        </fieldset>

        <div className="space-y-2">
          <p id={`${kimlik}-yardim`} className="text-sm text-soluk">
            Sayfa alanında seçili kutuyu fareyle sürükleyerek çizin. Klavyeyle: alana odaklanın, Enter ile kutu koyun,
            ok tuşlarıyla taşıyın (Shift ile hızlı), Alt ve ok tuşlarıyla boyutlandırın, Delete ile kaldırın.
          </p>
          <div
            ref={alan}
            role="application"
            aria-roledescription="kutu işaretleme alanı"
            // biome-ignore lint/a11y/noNoninteractiveTabindex: kendi klavye etkileşimi olan işaretleme alanı
            tabIndex={0}
            aria-label={`${sayfa}. sayfa, seçili kutu: ${alanAdi(secili)}`}
            aria-describedby={`${kimlik}-yardim`}
            className="relative aspect-[210/297] w-full max-w-xl touch-none select-none overflow-hidden rounded border border-cizgi-guclu bg-yuzey-2 bg-contain bg-top bg-no-repeat focus-visible:outline-3 focus-visible:outline-odak"
            style={goruntu ? { backgroundImage: `url(${goruntu})` } : undefined}
            onPointerDown={basla}
            onPointerMove={surukle}
            onPointerUp={bitir}
            onPointerCancel={bitir}
            onKeyDown={tus}
          >
            {!goruntu && (
              <span className="absolute inset-x-0 top-1/3 px-4 text-center text-sm text-soluk">
                Örnek sayfa görüntüsü seçmeden de kutuları konumuyla işaretleyebilirsiniz.
              </span>
            )}
            {sayfadakiler.map((a) => {
              const k = kutular[a] as Kutu;
              const sec = a === secili;
              return (
                <span
                  key={a}
                  aria-hidden="true"
                  className={`absolute rounded-sm border-2 ${sec ? "border-odak bg-odak/10" : "border-vurgu bg-vurgu/5"}`}
                  style={{
                    left: `${k.x * 100}%`,
                    top: `${k.y * 100}%`,
                    width: `${k.genislik * 100}%`,
                    height: `${k.yukseklik * 100}%`,
                  }}
                >
                  <span className="absolute -top-5 left-0 rounded-sm bg-yuzey px-1 text-xs font-semibold text-metin">
                    {kisaAd(a)}
                  </span>
                </span>
              );
            })}
          </div>

          <fieldset className="flex flex-wrap items-end gap-3">
            <legend className="mb-1 text-sm font-semibold">{alanAdi(secili)}: konum (sayfanın yüzdesi)</legend>
            {(["x", "y", "genislik", "yukseklik"] as const).map((o) => (
              <Alan key={o} etiket={OLCU_ADI[o]} kimlik={`${kimlik}-${o}`}>
                <input
                  id={`${kimlik}-${o}`}
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  className={`${GIRDI} w-24`}
                  value={kutu ? Math.round(kutu[o] * 1000) / 10 : ""}
                  placeholder="-"
                  onChange={(e) => {
                    const v = Number(e.target.value.replace(",", "."));
                    if (!Number.isFinite(v)) return;
                    koy(secili, { ...(kutu ?? { ...VARSAYILAN, sayfa }), [o]: v / 100 });
                  }}
                />
              </Alan>
            ))}
            <Alan etiket="Sayfa" kimlik={`${kimlik}-ks`}>
              <input
                id={`${kimlik}-ks`}
                type="number"
                min={1}
                max={enCokSayfa}
                className={`${GIRDI} w-20`}
                value={kutu?.sayfa ?? ""}
                placeholder="-"
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (!Number.isInteger(v) || v < 1 || v > enCokSayfa) return;
                  koy(secili, { ...(kutu ?? { ...VARSAYILAN }), sayfa: v });
                  setSayfa(v);
                }}
              />
            </Alan>
            {kutu && (
              <Dugme boy="kucuk" tur="sessiz" onClick={() => koy(secili, null)}>
                Kutuyu kaldır
              </Dugme>
            )}
          </fieldset>
        </div>
      </div>

      {hatalar.length > 0 && (
        <ul className="list-disc pl-5 text-risk-yuksek">
          {hatalar.map((h) => (
            <li key={h}>{h}</li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Dugme tur="birincil" onClick={kaydet} disabled={kaydediliyor}>
          Şablonu kaydet
        </Dugme>
        <p role="status" aria-live="polite" className="min-h-6">
          {ileti}
        </p>
      </div>
    </div>
  );
}

const GIRDI = "min-h-9 w-28 rounded border border-cizgi-guclu bg-yuzey px-2";
const OLCU_ADI = { x: "Soldan", y: "Üstten", genislik: "Genişlik", yukseklik: "Yükseklik" } as const;

function Alan({ etiket, kimlik, children }: { etiket: string; kimlik: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <label htmlFor={kimlik} className="text-sm font-semibold">
        {etiket}
      </label>
      {children}
    </div>
  );
}

function sayfaNumaralari(n: number): number[] {
  const v: number[] = [];
  for (let i = 1; i <= n; i++) v.push(i);
  return v;
}

function kisaAd(a: string): string {
  if (a === NUMARA) return "No";
  if (a === TOPLAM) return "Toplam";
  return `S${a}`;
}

function konumMetni(ad: string, k: Kutu): string {
  const y = (v: number) => `%${Math.round(v * 100)}`;
  return `${ad}: soldan ${y(k.x)}, üstten ${y(k.y)}, genişlik ${y(k.genislik)}, yükseklik ${y(k.yukseklik)}.`;
}

function baslangic(arac: PanelAraci): Record<string, Kutu | null> {
  const s = arac.sablon;
  const v: Record<string, Kutu | null> = { [NUMARA]: s?.numara ?? null, [TOPLAM]: s?.toplam ?? null };
  for (const q of arac.sorular) v[q.numara] = s?.sorular.find((x) => x.soruNo === q.numara)?.kutu ?? null;
  return v;
}
