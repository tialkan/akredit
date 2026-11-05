"use client";

// ÇK/PÇ hesaplayıcı. Tablo yapıştırılır ya da dosyadan okunur; dosya FileReader ile bu tarayıcıda okunur,
// hiçbir yere yüklenmez. Kimlik sütunları okunur okunmaz atılır. Hesap @akredit/olcme ile bu sayfada yapılır.

import { type ChangeEvent, useId, useState } from "react";
import {
  CK_BASLIKLARI,
  ciktiKodlari,
  type HazirTablo,
  type HesapSonucu,
  hesapla,
  matrisSatiriOku,
  PC_BASLIKLARI,
  sonucCsv,
  sonucSatirlari,
  tabloyuHazirla,
} from "./olcme.ts";
import { ALAN, DUGME, ETIKET, IKINCIL, Kutu, NOT, Tablo } from "./ortak.tsx";

/** Örnek tablo: uydurma ad ve numaralar. Atılacaklarını göstermek için kimlik sütunları bilerek vardır. */
const ORNEK = [
  "Ad Soyad\tÖğrenci No\tVize S1 (ÇK1) /20\tVize S2 (ÇK2) /30\tFinal S1 (ÇK1) /40\tFinal S2 (ÇK3) /60\tÖdev ÇK3 /100",
  "Deniz Kurgu\t20269001\t15\t20\t30\t40\t80",
  "Ece Örnek\t20269002\t8\t25\t20\t35\t70",
  "Can Deneme\t20269003\t18\t12\t35\t55\t90",
  "Ada Uydurma\t20269004\t10\t28\t25\t20\t60",
  "Efe Taslak\t20269005\t5\t10\t15\t30\t50",
].join("\n");

export default function CkPaneli() {
  const k = useId();
  const [ham, setHam] = useState("");
  const [hazir, setHazir] = useState<HazirTablo | null>(null);
  const [hata, setHata] = useState("");
  const [tamPuan, setTamPuan] = useState<Record<string, string>>({});
  const [eslemeler, setEslemeler] = useState<Record<string, string>>({});
  const [agirlik, setAgirlik] = useState<Record<string, string>>({});
  const [matris, setMatris] = useState<Record<string, string>>({});
  const [esik, setEsik] = useState("60");
  const [sonuc, setSonuc] = useState<HesapSonucu | null>(null);

  function oku(metin: string) {
    setSonuc(null);
    const h = tabloyuHazirla(metin);
    if (h.ogrenciSayisi === 0 || h.sutunlar.length === 0) {
      setHazir(null);
      setHata(
        "Tabloda sınav ya da soru sütunu bulunamadı. İlk satır başlık olmalı, ör. Vize S1 (ÇK1) /20. Sonra yeniden deneyin.",
      );
      return;
    }
    setHata("");
    setHazir(h);
    setTamPuan(Object.fromEntries(h.sutunlar.map((s) => [s.baslik, s.tamPuan === null ? "" : String(s.tamPuan)])));
    setEslemeler(Object.fromEntries(h.sutunlar.map((s) => [s.baslik, s.ciktilar.join(", ")])));
    setAgirlik(Object.fromEntries(h.araclar.map((a) => [a.id, ""])));
    // Ham metin bellekte tutulmaz: kimlikli hâl atılır, yalnız ayıklanmış tablo kalır.
    setHam("");
  }

  function dosyaSec(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (/\.xlsx?$/iu.test(f.name)) {
      setHata("Excel dosyası doğrudan okunmuyor. Excel'de hücreleri seçip kopyalayın ve kutuya yapıştırın.");
      return;
    }
    const r = new FileReader();
    r.onload = () => oku(String(r.result ?? ""));
    r.onerror = () => setHata("Dosya okunamadı. Tabloyu kopyalayıp kutuya yapıştırın.");
    r.readAsText(f);
  }

  const ckKodlari = [...new Set(Object.values(eslemeler).flatMap(ciktiKodlari))].sort(
    (a, b) => Number(a.slice(1)) - Number(b.slice(1)),
  );

  function hesapYap() {
    if (!hazir) return;
    const sayi = (x: string) => Number(x.replace(",", "."));
    const e = Number.isFinite(sayi(esik)) ? Math.min(100, Math.max(0, sayi(esik))) : 60;
    setSonuc(
      hesapla(hazir, {
        tamPuanlar: Object.fromEntries(
          Object.entries(tamPuan)
            .filter(([, v]) => v.trim() && sayi(v) > 0)
            .map(([b, v]) => [b, sayi(v)]),
        ),
        eslemeler: Object.fromEntries(
          Object.entries(eslemeler)
            .map(([b, v]): [string, string[]] => [b, ciktiKodlari(v)])
            .filter(([, v]) => v.length),
        ),
        agirliklar: Object.fromEntries(
          Object.entries(agirlik)
            .filter(([, v]) => v.trim() && Number.isFinite(sayi(v)))
            .map(([id, v]) => [id, sayi(v)]),
        ),
        matris: Object.fromEntries(
          ckKodlari
            .map((c): [string, Record<string, number>] => [c, matrisSatiriOku(matris[c] ?? "")])
            .filter(([, v]) => Object.keys(v).length),
        ),
        esik: e,
      }),
    );
  }

  function csvIndir() {
    if (!sonuc?.tamam) return;
    const url = URL.createObjectURL(new Blob([sonucCsv(sonuc.sonuc)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "ck-pc-sonucu.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <label htmlFor={`${k}-tablo`} className={ETIKET}>
          Not tablosu
        </label>
        <p id={`${k}-ipucu`} className={NOT}>
          Excel'de tabloyu seçip kopyalayın, buraya yapıştırın. İlk satır başlık olsun: Vize S1 (ÇK1) /20 gibi. Ad,
          soyad ve numara sütunları okunur okunmaz atılır.
        </p>
        <textarea
          id={`${k}-tablo`}
          aria-describedby={`${k}-ipucu`}
          value={ham}
          onChange={(e) => setHam(e.target.value)}
          rows={7}
          spellCheck={false}
          className={`${ALAN} font-mono text-sm`}
        />
        <div className="flex flex-wrap gap-3">
          <button type="button" className={DUGME} onClick={() => oku(ham)} disabled={!ham.trim()}>
            Tabloyu oku
          </button>
          <label className={`${IKINCIL} cursor-pointer focus-within:outline-2 focus-within:outline-odak`}>
            <input type="file" accept=".csv,.tsv,.txt,.xls,.xlsx" onChange={dosyaSec} className="sr-only" />
            CSV dosyası seç
          </label>
          <button type="button" className={IKINCIL} onClick={() => setHam(ORNEK)}>
            Örnek tabloyu koy
          </button>
        </div>
      </div>

      {hata ? (
        <div role="alert">
          <Kutu tur="uyari">{hata}</Kutu>
        </div>
      ) : null}

      {hazir ? (
        <div className="grid gap-6">
          <div role="status" data-atilan>
            <Kutu tur="basari">
              <p>
                {hazir.ogrenciSayisi} öğrenci okundu. Öğrenciler o1, o2 diye adlandırıldı.
                {hazir.atilan.length
                  ? ` Atılan sütunlar: ${hazir.atilan.map((a) => a.replace(/ sütunu$/u, "")).join(", ")}.`
                  : " Kimlik sütunu bulunmadı."}
              </p>
              {hazir.yoksayilan.length ? (
                <p className="mt-1 text-soluk">Hesaba katılmayan sütunlar: {hazir.yoksayilan.join(", ")}.</p>
              ) : null}
            </Kutu>
          </div>

          <fieldset className="grid gap-3">
            <legend className="mb-2 font-baslik text-xl text-vurgu">Sorular</legend>
            <p className={NOT}>Başlıktan okunamayan tam puanı ve ders çıktısını (ÇK) siz yazın.</p>
            <Tablo
              baslik="Sorular ve ders çıktıları"
              sutunlar={["Sütun", "Tam puan", "Ölçtüğü ÇK"]}
              satirlar={hazir.sutunlar.map((s, i) => [
                s.baslik,
                <input
                  key="t"
                  aria-label={`${s.baslik} tam puanı`}
                  inputMode="decimal"
                  value={tamPuan[s.baslik] ?? ""}
                  onChange={(e) => setTamPuan({ ...tamPuan, [s.baslik]: e.target.value })}
                  className={`${ALAN} w-24`}
                  data-satir={i}
                />,
                <input
                  key="c"
                  aria-label={`${s.baslik} ölçtüğü ders çıktısı`}
                  placeholder="ÇK1"
                  value={eslemeler[s.baslik] ?? ""}
                  onChange={(e) => setEslemeler({ ...eslemeler, [s.baslik]: e.target.value })}
                  className={`${ALAN} w-28`}
                />,
              ])}
            />
          </fieldset>

          <fieldset className="grid gap-3">
            <legend className="mb-2 font-baslik text-xl text-vurgu">Ders notundaki yüzdeler</legend>
            <p className={NOT}>Bologna sayfanızdaki değerlendirme yüzdelerini yazın. Toplam 100 olmalı.</p>
            <div className="flex flex-wrap gap-4">
              {hazir.araclar.map((a) => (
                <label key={a.id} className="grid gap-1">
                  <span className={ETIKET}>{a.ad} (%)</span>
                  <input
                    inputMode="decimal"
                    value={agirlik[a.id] ?? ""}
                    onChange={(e) => setAgirlik({ ...agirlik, [a.id]: e.target.value })}
                    className={`${ALAN} w-28`}
                  />
                </label>
              ))}
              <label className="grid gap-1">
                <span className={ETIKET}>Başarı eşiği</span>
                <input
                  inputMode="decimal"
                  value={esik}
                  onChange={(e) => setEsik(e.target.value)}
                  className={`${ALAN} w-28`}
                />
              </label>
            </div>
          </fieldset>

          {ckKodlari.length ? (
            <details className="rounded-sm border border-cizgi p-4">
              <summary className="min-h-11 cursor-pointer content-center">
                Program çıktısı (PÇ) için katkılar (isteğe bağlı)
              </summary>
              <p className={`${NOT} mt-2`}>
                Her ÇK'nın program çıktılarına katkısını 1-5 arası yazın: P1:3, P2:5. Boş bırakırsanız PÇ hesaplanmaz.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {ckKodlari.map((c) => (
                  <label key={c} className="grid gap-1">
                    <span className={ETIKET}>{c.replace(/^Ö/u, "ÇK")} katkıları</span>
                    <input
                      placeholder="P1:3, P2:5"
                      value={matris[c] ?? ""}
                      onChange={(e) => setMatris({ ...matris, [c]: e.target.value })}
                      className={ALAN}
                    />
                  </label>
                ))}
              </div>
            </details>
          ) : null}

          <div>
            <button type="button" className={DUGME} onClick={hesapYap}>
              Hesapla
            </button>
          </div>
        </div>
      ) : null}

      {sonuc && !sonuc.tamam ? (
        <div role="alert">
          <Kutu tur="uyari">
            <p>Hesap için şunlar eksik:</p>
            <ul className="mt-2 list-disc pl-5">
              {sonuc.eksikler.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </Kutu>
        </div>
      ) : null}

      {sonuc?.tamam ? (
        <section aria-labelledby={`${k}-sonuc`} className="grid gap-4" data-ck-sonuc>
          <h3 id={`${k}-sonuc`} className="text-2xl text-vurgu" tabIndex={-1}>
            Sonuç
          </h3>
          <p>
            {sonuc.sonuc.ogrenciSayisi} öğrenci, eşik {sonuc.sonuc.esik}. Ders notu ortalaması{" "}
            {sonuc.sonuc.notIstatistikleri.ortalama === null
              ? "hesaplanamadı"
              : sonuc.sonuc.notIstatistikleri.ortalama.toFixed(1).replace(".", ",")}
            .
          </p>
          <Tablo baslik="Ders çıktısı başarısı" sutunlar={CK_BASLIKLARI} satirlar={sonucSatirlari(sonuc.sonuc).ck} />
          {sonuc.sonuc.pcSaglanmasi.length ? (
            <Tablo
              baslik="Program çıktısı sağlanması"
              sutunlar={PC_BASLIKLARI}
              satirlar={sonucSatirlari(sonuc.sonuc).pc}
            />
          ) : null}
          <p className={NOT}>
            Hesap Akredit ölçme motoruyla bu sayfada yapıldı. Aynı tablo her zaman aynı sonucu verir.
          </p>
          <div>
            <button type="button" className={IKINCIL} onClick={csvIndir}>
              Sonucu CSV olarak indir
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
