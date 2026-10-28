import { YOKAK_KIDR_3_2_1 } from "@akredit/cerceveler";
import type { Metadata } from "next";
import { Bolum, Metin, SayfaBasi, YapisalVeri } from "../../../site/bilesenler.tsx";
import { yokakOzeti } from "../../../site/cerceve-ozeti.ts";
import { SAYFALAR } from "../../../site/icerik.ts";
import { sayfaUstVerisi } from "../../../site/yapisal.ts";

export const metadata: Metadata = sayfaUstVerisi(SAYFALAR.cerceveler);

function Kaynak({ adres, sha256, erisim }: { adres: string; sha256: string; erisim: string }) {
  return (
    <dl className="mt-4 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[8rem_1fr]">
      <dt className="text-soluk">Kaynak adres</dt>
      <dd className="break-all">
        <a href={adres} className="text-vurgu underline underline-offset-4">
          {decodeURI(adres)}
        </a>
      </dd>
      <dt className="text-soluk">Erişim tarihi</dt>
      <dd>{erisim}</dd>
      <dt className="text-soluk">Dosya özeti</dt>
      <dd className="break-all">SHA-256 {sha256}</dd>
    </dl>
  );
}

export default function Cerceveler() {
  const y = yokakOzeti();
  const k = YOKAK_KIDR_3_2_1;
  return (
    <>
      <YapisalVeri sayfa={SAYFALAR.cerceveler} />
      <SayfaBasi
        sayfa={SAYFALAR.cerceveler}
        ozet="Ölçüt metinleri hafızadan yazılmaz. Resmî belgeden çıkarılır; belgenin adresi, erişim tarihi ve dosya özeti metnin yanında saklanır."
      />
      <Bolum id="yokak" baslik={`YÖKAK ${y.c.surum}`} not={y.c.ad}>
        <p className="text-lg">
          {y.basliklar.length} ana başlık, {y.olcutSayisi} ölçüt, {y.altOlcutSayisi} alt ölçüt. Başlıklar ve ölçüt
          metinleri belgeden alınmıştır.
        </p>
        <ul className="mt-6 divide-y divide-cizgi border-y border-cizgi">
          {y.basliklar.map((b) => (
            <li key={b.kod} className="py-4">
              <p className="font-semibold">
                {b.kod}. {b.baslik}
              </p>
              <ul className="mt-2 grid gap-x-8 gap-y-1 text-soluk sm:grid-cols-2">
                {b.altOlcutler.map((o) => (
                  <li key={o.kod}>
                    {o.kod} {o.baslik}
                    <span className="text-sm"> ({o.altOlcutler.length} alt ölçüt)</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
        {y.c.kaynak?.sha256 ? (
          <Kaynak adres={y.c.kaynak.adres} sha256={y.c.kaynak.sha256} erisim={y.c.kaynak.erisimTarihi} />
        ) : null}
        <Metin>
          <p>
            {y.altOlcutSayisi - y.dogrulanmamisDuzey} alt ölçütte 1-5 olgunluk düzeyi metinleri ve örnek kanıtlar da
            belgeden alınmıştır. {y.dogrulanmamisDuzey} alt ölçütün düzey metni belgeden ayrıştırılamadı ve DOĞRULANMADI
            olarak işaretlidir.
          </p>
        </Metin>
      </Bolum>
      <Bolum id="kidr" baslik={`KİDR ${k.surum}`} not={k.ad} zemin>
        <p>
          Kurum İç Değerlendirme Raporu için {k.raporSablonu.length} şablon bölüm başlığı, Hazırlama Kılavuzu'nun Ek-1
          şablonundan alınmıştır. Ölçüt ağacı YÖKAK {y.c.surum} ile aynıdır.
        </p>
        <ol className="mt-4 grid list-decimal gap-x-8 gap-y-1 pl-6 sm:grid-cols-2">
          {k.raporSablonu.map((b) => (
            <li key={b.kod}>{b.baslik}</li>
          ))}
        </ol>
        {k.kaynak?.sha256 ? (
          <Kaynak adres={k.kaynak.adres} sha256={k.kaynak.sha256} erisim={k.kaynak.erisimTarihi} />
        ) : null}
      </Bolum>
      <Bolum id="dogrulama" baslik="Uzman onayı" not="Metin ile belge arasındaki son karar insanda.">
        <Metin>
          <p>
            Her başlığın ve metnin belgenin kaynak sayfasında birebir geçtiği otomatik testle denetlenir. Yine de hiçbir
            çerçeve henüz uzman onayından geçmedi. Onay, bir uzmanın adı ve zamanıyla verilir; o zamana kadar ekranda
            "Uzman doğrulaması bekliyor" yazar.
          </p>
          <p>
            Bir rapor bir çerçeve sürümüne bağlanır. Yeni sürüm geldiğinde eski rapor kendi sürümüyle açılmaya devam
            eder.
          </p>
        </Metin>
      </Bolum>
      <Bolum id="henuz-yok" baslik="Henüz yok" zemin>
        <Metin>
          <ul>
            <li>
              MÜDEK ve diğer program akreditasyon kuruluşları: resmî belge kütüphaneye eklenmedi, ölçüt ağacı boştur.
            </li>
            <li>
              Önlisans programları için Akredit'in kendi iç çerçevesi vardır. Bu resmî bir çerçeve değildir ve ekranda
              öyle yazar.
            </li>
          </ul>
          <p>Yeni bir çerçeve, resmî belgesi alınıp özeti kaydedilmeden eklenmez.</p>
        </Metin>
      </Bolum>
    </>
  );
}
