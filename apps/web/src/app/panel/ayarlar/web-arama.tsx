"use client";

// Kurum ayarı: web araması (İP-37). Başka kurumların örnek uygulamalarını OpenRouter web aramasıyla bulur.
// Arama sorusu yurt dışındaki hizmete gider; bu yüzden yurt dışı izni yokken bölüm devre dışıdır ve nedeni yazılır.
// Sunucu da aynı kuralı uygular (`@akredit/servis` politika.ts).

import { useEffect, useState } from "react";
import { Dugme } from "../../../bilesenler/dugme.tsx";
import { MetinAlani } from "../../../bilesenler/form.tsx";
import { Kart } from "../../../bilesenler/temel.tsx";
import type { AyarDegisikligi, Ayarlar } from "../../../veri/kaynak.ts";

export function WebArama({
  ayarlar,
  guncelle,
}: {
  ayarlar: Ayarlar;
  guncelle: (d: AyarDegisikligi, mesaj: string) => Promise<void>;
}) {
  const izin = ayarlar.yurtDisiIzni;
  const acik = izin && ayarlar.webArama.acik;
  const [sonuc, setSonuc] = useState(String(ayarlar.webArama.enCokSonuc));
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    setSonuc(String(ayarlar.webArama.enCokSonuc));
  }, [ayarlar.webArama.enCokSonuc]);

  const kaydet = () => {
    const n = Number(sonuc);
    if (!Number.isInteger(n) || n < 1 || n > 10) {
      setHata("1 ile 10 arasında bir tam sayı yazın.");
      return;
    }
    setHata(null);
    void guncelle({ webArama: { enCokSonuc: n } }, `Web araması: istek başına en çok ${n} sonuç.`);
  };

  return (
    <Kart baslik="Web araması">
      <p className="mb-4 max-w-prose text-soluk">
        Kanıt ararken başka kurumların örnek uygulamalarını da bulur. Bulunan sayfalar kaynak olarak listelenir; kanıt
        sayılmaz ve rapora kanıt diye girmez. Arama sorusu yalnız ölçüt bilgisinden kurulur, belge metni gönderilmez.
      </p>
      {!izin ? (
        <p id="web-arama-neden" className="mb-4 rounded border border-cizgi-guclu p-3 text-sm font-semibold">
          Devre dışı: web araması yurt dışındaki hizmeti kullanır. Açmak için önce "Yurt dışındaki yapay zekâ hizmetine
          izin ver" ayarını açın.
        </p>
      ) : null}
      <div className="flex items-start gap-3">
        <input
          id="web-arama-acik"
          type="checkbox"
          role="switch"
          aria-checked={acik}
          aria-describedby={izin ? "web-arama-aciklama" : "web-arama-neden web-arama-aciklama"}
          className="mt-1 size-5 shrink-0 accent-[var(--vurgu)] disabled:cursor-not-allowed"
          checked={acik}
          disabled={!izin}
          onChange={(e) =>
            void guncelle(
              { webArama: { acik: e.target.checked } },
              e.target.checked ? "Web araması açıldı." : "Web araması kapatıldı.",
            )
          }
        />
        <div>
          <label htmlFor="web-arama-acik" className="font-semibold">
            Başka kurumlarda örnek ara
          </label>
          <p id="web-arama-aciklama" className="text-sm text-soluk">
            Her arama kurumun anahtarından ücretlendirilir. Kurumun kendi alan adı sonuçlara alınmaz.
          </p>
          <p className="mt-1 text-sm font-semibold">Şu an: {acik ? "Açık" : "Kapalı"}</p>
        </div>
      </div>
      <form
        noValidate
        className="mt-4 flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          kaydet();
        }}
      >
        <MetinAlani
          etiket="İstek başına en çok sonuç"
          ipucu="1 ile 10 arası. Az sonuç daha ucuzdur."
          type="number"
          inputMode="numeric"
          min={1}
          max={10}
          step={1}
          className="w-56"
          value={sonuc}
          disabled={!izin}
          hata={hata ?? undefined}
          onChange={(e) => setSonuc(e.target.value)}
        />
        <Dugme type="submit" tur="ikincil" disabled={!izin}>
          Kaydet
        </Dugme>
      </form>
    </Kart>
  );
}
