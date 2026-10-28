// Ana sayfadaki onay kutusu önizlemesi. Paneldeki öneri kartının (src/app/panel/onaylar) sadeleştirilmiş çizimidir;
// veri kurgudur ve öyle etiketlenir. Hareket bilgi taşır: öneri "onay bekliyor" durumundan "onaylandı" durumuna geçer
// ve karar günlüğe bir satır olarak eklenir. Hareket yalnız CSS'tedir (istemci betiği yok) ve hareket azaltma
// tercihinde hiç oynamaz; o zaman son durum doğrudan görünür. Ekran okuyucu son durumu okur.

export function OnayOnizleme() {
  return (
    <figure className="onizleme" aria-labelledby="onizleme-baslik">
      <figcaption className="flex items-baseline justify-between gap-4 pb-3 text-sm text-soluk">
        <span id="onizleme-baslik" className="font-semibold text-metin">
          Onay kutusundan bir öneri
        </span>
        <span>Örnek veri</span>
      </figcaption>
      <div className="onizleme-kart rounded-sm border bg-yuzey">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-cizgi px-4 py-2.5 text-sm sm:px-5">
          <span className="rounded-sm bg-risk-orta-zemin px-2 py-0.5 font-semibold text-risk-orta">Orta risk</span>
          <span className="text-soluk">Ders dosyası</span>
          <span className="ml-auto inline-grid text-right font-semibold">
            <span className="onizleme-bekliyor col-start-1 row-start-1 text-soluk" aria-hidden>
              Onay bekliyor
            </span>
            <span className="onizleme-onaylandi col-start-1 row-start-1 text-petrol">
              <svg aria-hidden viewBox="0 0 16 16" className="mr-1 inline size-4 align-[-2px]">
                <path d="M3 8.5l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="2" />
              </svg>
              Onaylandı
            </span>
          </span>
        </div>
        <div className="px-4 py-4 sm:px-5">
          <p className="text-lg font-semibold leading-snug">BP101 için ÇK1 sağlanma düzeyi</p>
          <p className="mt-1 text-soluk">2026 Güz dönemi, 58 öğrencinin vize ve final notlarından.</p>
          <dl className="sayilar mt-4 grid grid-cols-3 border-y border-cizgi text-center">
            <div className="py-2.5">
              <dt className="text-xs text-soluk">Sağlanma</dt>
              <dd className="font-serif text-2xl font-semibold text-vurgu">%71,4</dd>
            </div>
            <div className="border-x border-cizgi py-2.5">
              <dt className="text-xs text-soluk">Eşik</dt>
              <dd className="font-serif text-2xl font-semibold">%60,0</dd>
            </div>
            <div className="py-2.5">
              <dt className="text-xs text-soluk">Öğrenci</dt>
              <dd className="font-serif text-2xl font-semibold">58</dd>
            </div>
          </dl>
          <p className="mt-3 text-sm text-soluk">
            Hesap ölçme motorundan; dayanak: <span className="text-metin">Not dökümü, sayfa 1</span>{" "}
            <span className="sayilar whitespace-nowrap">özet 3f9a…c21e</span>
          </p>
          <div className="mt-4 flex flex-wrap gap-2 text-sm font-semibold" aria-hidden>
            <span className="onizleme-dugme inline-flex min-h-9 items-center rounded bg-vurgu px-3 text-vurgu-metin">
              Onayla
            </span>
            <span className="inline-flex min-h-9 items-center rounded border border-cizgi-guclu px-3">Düzelt</span>
            <span className="inline-flex min-h-9 items-center rounded border border-cizgi-guclu px-3 text-risk-yuksek">
              Reddet
            </span>
          </div>
        </div>
        <p className="onizleme-gunluk sayilar flex flex-wrap justify-between gap-x-4 border-t border-cizgi bg-petrol-zemin px-4 py-2 text-sm text-petrol sm:px-5">
          <span>Günlüğe eklendi: Dr. Öğr. Üyesi Deniz Örnek</span>
          <span>12.01.2027 14:32</span>
        </p>
      </div>
    </figure>
  );
}
