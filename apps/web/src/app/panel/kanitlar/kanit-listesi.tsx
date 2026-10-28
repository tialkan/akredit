"use client";

import { Upload } from "lucide-react";
import Link from "next/link";
import { type DragEvent, useId, useMemo, useRef, useState } from "react";
import { MetinAlani, Secim } from "../../../bilesenler/form.tsx";
import { Tablo } from "../../../bilesenler/tablo.tsx";
import { Rozet } from "../../../bilesenler/temel.tsx";
import type { KanitGorunumu } from "../../../veri/kaynak.ts";
import { boyutYaz, metinAramaAnahtari, tarihYaz } from "../../../veri/yardimci.ts";

const KAYNAK_ETIKETI: Record<KanitGorunumu["kaynakTuru"], string> = {
  yukleme: "Yükleme",
  baglayici: "Otomatik aktarım",
  eposta: "E-posta",
  uretilen: "Sistemin ürettiği",
};

export function KanitListesi({ kanitlar, olcutler }: { kanitlar: KanitGorunumu[]; olcutler: readonly string[] }) {
  const [arama, setArama] = useState("");
  const [kaynak, setKaynak] = useState("");
  const [olcut, setOlcut] = useState("");

  const suzulmus = useMemo(() => {
    const a = metinAramaAnahtari(arama);
    return kanitlar.filter(
      (k) =>
        (!kaynak || k.kaynakTuru === kaynak) &&
        (!olcut || k.olcutler.includes(olcut)) &&
        (!a || metinAramaAnahtari(`${k.baslik} ${k.dosyaAdi}`).includes(a)),
    );
  }, [kanitlar, arama, kaynak, olcut]);

  return (
    <div className="space-y-6">
      <YuklemeAlani />
      <search>
        <form className="grid gap-4 sm:grid-cols-3" onSubmit={(e) => e.preventDefault()} aria-label="Kanıt süzgeci">
          <MetinAlani
            etiket="Ara"
            type="search"
            value={arama}
            onChange={(e) => setArama(e.target.value)}
            placeholder="Başlık ya da dosya adı"
          />
          <Secim etiket="Kaynak" value={kaynak} onChange={(e) => setKaynak(e.target.value)}>
            <option value="">Hepsi</option>
            {Object.entries(KAYNAK_ETIKETI).map(([d, ad]) => (
              <option key={d} value={d}>
                {ad}
              </option>
            ))}
          </Secim>
          <Secim etiket="Ölçüt" value={olcut} onChange={(e) => setOlcut(e.target.value)}>
            <option value="">Hepsi</option>
            {olcutler.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </Secim>
        </form>
      </search>
      <p aria-live="polite" className="text-soluk">
        {suzulmus.length} kanıt gösteriliyor
      </p>
      <Tablo
        baslik="Kanıtlar"
        bosMetin="Bu süzgece uyan kanıt yok. Aramayı ya da süzgeçleri değiştirin."
        sutunlar={[
          { anahtar: "baslik", baslik: "Kanıt", siralanabilir: true, satirBasligi: true },
          { anahtar: "olcut", baslik: "Ölçütler" },
          { anahtar: "kaynak", baslik: "Kaynak", siralanabilir: true },
          { anahtar: "tarih", baslik: "Belge tarihi", siralanabilir: true },
          { anahtar: "boyut", baslik: "Boyut", siralanabilir: true, sinif: "text-right" },
        ]}
        satirlar={suzulmus.map((k) => ({
          anahtar: k.id,
          degerler: {
            baslik: k.baslik,
            kaynak: KAYNAK_ETIKETI[k.kaynakTuru],
            tarih: k.belgeTarihi ?? "",
            boyut: k.boyut,
          },
          hucreler: {
            baslik: (
              <Link href={`/panel/kanitlar/${k.id}`} className="text-vurgu underline underline-offset-2">
                {k.baslik}
                <span className="block text-sm font-normal text-soluk no-underline">{k.dosyaAdi}</span>
              </Link>
            ),
            olcut: (
              <span className="flex flex-wrap gap-1">
                {k.olcutler.map((o) => (
                  <Rozet key={o}>{o}</Rozet>
                ))}
              </span>
            ),
            kaynak: KAYNAK_ETIKETI[k.kaynakTuru],
            tarih: k.belgeTarihi ? tarihYaz(k.belgeTarihi) : "Yok",
            boyut: boyutYaz(k.boyut),
          },
        }))}
      />
    </div>
  );
}

/** Sürükle-bırak yükleme arayüzü. Dosya sunucuya gönderilmez (sunucu tarafı İP-10). */
function YuklemeAlani() {
  const id = useId();
  const girdi = useRef<HTMLInputElement>(null);
  const [ustunde, setUstunde] = useState(false);
  const [dosyalar, setDosyalar] = useState<{ ad: string; boyut: number }[]>([]);

  const ekle = (liste: FileList | null) => {
    if (!liste) return;
    setDosyalar((d) => [...d, ...Array.from(liste, (f) => ({ ad: f.name, boyut: f.size }))]);
  };
  const birak = (e: DragEvent) => {
    e.preventDefault();
    setUstunde(false);
    ekle(e.dataTransfer.files);
  };

  return (
    <section aria-labelledby={`${id}-baslik`}>
      <h2 id={`${id}-baslik`} className="sr-only">
        Kanıt yükle
      </h2>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: bırakma alanı; klavye için içindeki düğme kullanılır */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setUstunde(true);
        }}
        onDragLeave={() => setUstunde(false)}
        onDrop={birak}
        className={`flex flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center ${
          ustunde ? "border-vurgu bg-vurgu-zemin" : "border-cizgi-guclu bg-yuzey"
        }`}
      >
        <Upload aria-hidden className="size-8 text-vurgu" />
        <p className="font-semibold">Dosyaları buraya sürükleyin</p>
        <p className="text-sm text-soluk">ya da</p>
        <label
          htmlFor={`${id}-girdi`}
          className="inline-flex min-h-11 cursor-pointer items-center rounded-md border border-cizgi-guclu bg-yuzey px-4 font-semibold hover:bg-yuzey-2 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-[var(--odak)]"
        >
          Bilgisayardan dosya seçin
          <input
            id={`${id}-girdi`}
            ref={girdi}
            type="file"
            multiple
            className="sr-only"
            onChange={(e) => ekle(e.target.files)}
          />
        </label>
        <p className="text-sm text-soluk">Yüklenen dosyalar silinmez ve değiştirilmez; yeni sürüm yeni kayıt olur.</p>
      </div>
      {dosyalar.length > 0 ? (
        <div className="mt-3 rounded-md border border-risk-orta bg-risk-orta-zemin p-3 text-risk-orta" role="status">
          <p className="font-semibold">Önizleme: yükleme henüz sunucuya bağlı değil, dosyalar kaydedilmedi.</p>
          <ul className="mt-1 list-disc pl-5">
            {dosyalar.map((d, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: aynı adlı dosyalar olabilir
              <li key={`${d.ad}-${i}`}>
                {d.ad} ({boyutYaz(d.boyut)})
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
