"use client";

// Bologna denetleyici ve istem üretici. Yapıştırılan sayfa bu tarayıcıda ayrıştırılır ve denetlenir.
// İstem panoya kopyalanır; hoca kendi yapay zekâsına yapıştırır. MCP gerekmez.

import { useId, useState } from "react";
import { type BolognaSonucu, bolognaDenetimi, DURUM_ADI, istemUret } from "./bologna.ts";
import { ALAN, DUGME, ETIKET, IKINCIL, Kutu, NOT, Tablo } from "./ortak.tsx";

const DURUM_SINIFI: Record<string, string> = {
  bos: "text-risk-yuksek",
  zayif: "text-risk-orta",
  tamam: "text-risk-dusuk",
  bilinmiyor: "text-soluk",
};

export default function BolognaPaneli() {
  const k = useId();
  const [ham, setHam] = useState("");
  const [sonuc, setSonuc] = useState<BolognaSonucu | null>(null);
  const [hata, setHata] = useState("");
  const [kopya, setKopya] = useState("");

  function denetle() {
    setKopya("");
    try {
      setSonuc(bolognaDenetimi(ham));
      setHata("");
    } catch (e) {
      setSonuc(null);
      setHata(e instanceof Error ? e.message : "Sayfa okunamadı. Ders sayfasının tamamını yapıştırın.");
    }
  }

  const istem = sonuc ? istemUret(sonuc) : "";

  async function kopyala() {
    try {
      await navigator.clipboard.writeText(istem);
      setKopya("İstem kopyalandı. Yapay zekânızın sohbetine yapıştırın.");
    } catch {
      const t = document.getElementById(`${k}-istem`) as HTMLTextAreaElement | null;
      t?.select();
      setKopya("Kopyalanamadı. Metin seçildi, Ctrl+C ile kopyalayın.");
    }
  }

  const eksik = sonuc?.alanlar.filter((a) => a.durum !== "tamam") ?? [];
  const iy = sonuc?.isYuku;

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <label htmlFor={`${k}-sayfa`} className={ETIKET}>
          Ders bilgi paketi sayfası
        </label>
        <p id={`${k}-ipucu`} className={NOT}>
          OBS'de dersin Bologna sayfasını açın. Ctrl+A ile hepsini seçip kopyalayın ve buraya yapıştırın. Sayfanın
          kaynağını (HTML) da yapıştırabilirsiniz.
        </p>
        <textarea
          id={`${k}-sayfa`}
          aria-describedby={`${k}-ipucu`}
          value={ham}
          onChange={(e) => setHam(e.target.value)}
          rows={7}
          spellCheck={false}
          className={`${ALAN} font-mono text-sm`}
        />
        <div>
          <button type="button" className={DUGME} onClick={denetle} disabled={!ham.trim()}>
            Denetle
          </button>
        </div>
      </div>

      {hata ? (
        <div role="alert">
          <Kutu tur="uyari">{hata}</Kutu>
        </div>
      ) : null}

      {sonuc ? (
        <section aria-labelledby={`${k}-sonuc`} className="grid gap-5" data-bologna-sonuc>
          <h3 id={`${k}-sonuc`} className="text-2xl text-vurgu">
            {sonuc.kod}
            {sonuc.ad ? ` ${sonuc.ad}` : ""}
          </h3>
          <p role="status">
            {eksik.length
              ? `${eksik.length} alan doldurulmalı ya da iyileştirilmeli.`
              : "Boş ya da zayıf alan bulunmadı."}
          </p>
          <Tablo
            baslik="Alanların durumu"
            sutunlar={["Alan", "Durum", "Neden"]}
            satirlar={sonuc.alanlar.map((a) => [
              a.ad,
              <span key="d" className={DURUM_SINIFI[a.durum]}>
                {DURUM_ADI[a.durum]}
              </span>,
              a.nedenler.join(" "),
            ])}
          />
          {iy ? (
            <div className="grid gap-2">
              <h4 className="text-xl text-vurgu">AKTS iş yükü</h4>
              <Tablo
                baslik="AKTS iş yükü"
                sutunlar={["Etkinlik", "Sayı", "Süre (saat)", "Toplam (saat)"]}
                satirlar={iy.satirlar.map((x) => [x.ad, String(x.sayi), String(x.sure), String(x.toplam)])}
              />
              <p data-is-yuku>
                Toplam {iy.toplam} saat.
                {iy.akts !== null
                  ? ` ${iy.akts} AKTS için hedef ${iy.akts} x 30 = ${iy.hedef} saat; AKTS başına ${iy.aktsBasinaSaat} saat. Sayfada 25-30 saat kabul edilir.`
                  : " AKTS okunamadı."}
              </p>
            </div>
          ) : null}
          <div className="grid gap-2">
            <h4 className="text-xl text-vurgu">Yapay zekânıza yapıştırılacak hazır istem</h4>
            <p className={NOT}>
              Eksik alanları, kuralları ve uydurma yasağını içerir. Öğrenci bilgisi içermez. Akredit kurulumu gerekmez.
            </p>
            <textarea
              id={`${k}-istem`}
              readOnly
              value={istem}
              rows={10}
              aria-label="Hazır istem"
              className={`${ALAN} text-sm`}
            />
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className={DUGME} onClick={kopyala}>
                İstemi kopyala
              </button>
              <a href="/mcp-kullan" className={IKINCIL}>
                Akredit'i yapay zekânıza ekleyin
              </a>
            </div>
            <p aria-live="polite" className="min-h-6 text-petrol">
              {kopya}
            </p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
