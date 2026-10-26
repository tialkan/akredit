import type { Metadata } from "next";
import Link from "next/link";
import { MetinSayfasi } from "../../../bilesenler/logo.tsx";

export const metadata: Metadata = { title: "Nasıl çalışır" };

export default function NasilCalisir() {
  return (
    <MetinSayfasi
      baslik="Nasıl çalışır"
      ozet="Akredit işi ikiye böler: hazırlığı sistem yapar, kararı siz verirsiniz. Her adım kayıt altındadır."
    >
      <h2>1. Kanıtlar toplanır</h2>
      <p>
        Ders bilgi paketleri, not listeleri, tutanaklar, anket sonuçları ve diğer belgeler sisteme alınır. Her dosya
        içerik özetiyle saklanır; sonradan değiştirilemez ve silinemez. Yeni sürüm yeni kayıt olarak eklenir.
      </p>
      <h2>2. Sistem hazırlar</h2>
      <p>Sistem kanıtları ölçütlerle eşler, ölçme sonuçlarını hesaplar ve rapor bölümlerinin taslağını yazar.</p>
      <ul>
        <li>Her olgusal cümle bir kanıta, dosya ve sayfasıyla bağlanır.</li>
        <li>Kanıta bağlanamayan içerik “EKSİK” olarak işaretlenir, yapılmış gibi yazılmaz.</li>
        <li>Sayılar yapay zekânın metninden değil, hesaplamadan gelir.</li>
      </ul>
      <h2>3. Siz karar verirsiniz</h2>
      <p>
        Hazırlanan her öneri <Link href="/panel/onaylar">onay kutusuna</Link> düşer. Her satırda önerinin özü,
        gerekçesi, sistemin güveni ve dayandığı kanıt alıntısı vardır. Onaylar, düzeltir ya da reddedersiniz.
      </p>
      <h3>Risk düzeyleri</h3>
      <ul>
        <li>
          <strong>Düşük risk</strong> (ör. kanıt etiketi): toplu onaylanabilir.
        </li>
        <li>
          <strong>Orta risk</strong> (ör. matris katkısı, rapor bölümü): toplu onaylanabilir, kanıt bir tıkla açılır.
        </li>
        <li>
          <strong>Yüksek risk</strong> (ör. olgunluk düzeyi beyanı, dış kuruma gönderim): her zaman tek tek ve kanıtlar
          açıkken onaylanır. Otomatik onaya bağlanamaz.
        </li>
      </ul>
      <h3>Otomatik onay politikası</h3>
      <p>
        Sık tekrarlanan düşük ve orta riskli işler için “bu türü bundan sonra otomatik onayla” diyebilirsiniz. Bu bir
        yetki devri politikasıdır; adınızla imzalanır, kapsamı ve güven eşiği yazılıdır ve günlüğe girer.
      </p>
      <h2>4. Kayıt kalır</h2>
      <p>
        Her karar; veren kişinin adı, zamanı ve dayanağıyla (doğrudan ya da imzalı politika) değiştirilemez günlüğe
        yazılır. Düzeltme yeni bir kayıtla yapılır; eski kayıt silinmez.
      </p>
    </MetinSayfasi>
  );
}
