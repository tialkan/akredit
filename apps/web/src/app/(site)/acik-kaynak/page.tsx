import type { Metadata } from "next";
import { MetinSayfasi } from "../../../bilesenler/logo.tsx";

export const metadata: Metadata = { title: "Açık kaynak" };

export default function AcikKaynak() {
  return (
    <MetinSayfasi baslik="Açık kaynak" ozet="Akredit'in kodu Apache 2.0 lisansıyla açıktır.">
      <h2>Neden açık kaynak?</h2>
      <ul>
        <li>Kalite güvencesi şeffaflık ister: sistemin nasıl öneri hazırladığı incelenebilmeli.</li>
        <li>Kurumlar tek bir firmaya bağımlı kalmamalı.</li>
        <li>Üniversiteler kendi ihtiyaçlarına göre geliştirip katkı verebilmeli.</li>
      </ul>
      <h2>Ne demek değildir?</h2>
      <p>
        Açık kaynak olması, her kurumun kendi kurulumunu yapması gerektiği anlamına gelmez. Kurum içi kurulum seçeneği
        yol haritasındadır, henüz hazır değildir.
      </p>
      <h2>Akreddit komut satırı aracı</h2>
      <p>
        Akredit, daha önce geliştirilen Akreddit komut satırı aracının üzerine kurulmaktadır. Araç aynı depoda yer alır
        ve çalışmaya devam eder.
      </p>
    </MetinSayfasi>
  );
}
