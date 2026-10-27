// Kurumun kendi yerel modelinin Türkçe görevlerdeki başarımını ölçer (docs/kurulum/yerel-model.md).
// @akredit/yz değerlendirme düzeneği ve kurgu altın örnekleri kullanılır; istekler yalnız AKREDIT_YZ_ADRES'e
// (iç adres zorunlu) gider. Sonuç tablosu yazdırılır; kurum bunu model seçiminin kanıtı olarak saklar.
//
// Kullanım (depo kökünden, model sunucusuna erişen bir makinede):
//   AKREDIT_YZ_HAZIR=ollama AKREDIT_YZ_ADRES=http://127.0.0.1:11434/v1 AKREDIT_YZ_MODEL=qwen2.5:14b \
//     node infra/kurum-ici/model-olc.ts

import { KANIT_SINIFLAMA_ORNEKLERI, TOPLANTI_BILGISI_ORNEKLERI } from "../../packages/yz/src/degerlendirme/ornekler.ts";
import { degerlendir, kanitSiniflama, sonucTablosu, toplantiBilgisi } from "../../packages/yz/src/index.ts";
import { kurumIciSaglayici } from "./yz-ayari.ts";

try {
  const { saglayici } = kurumIciSaglayici(process.env);
  console.log(`Model: ${saglayici.ad} / ${saglayici.model}  (${new Date().toISOString()})`);
  const a = await degerlendir(kanitSiniflama, KANIT_SINIFLAMA_ORNEKLERI, () => saglayici);
  console.log(`\nKanıt sınıflama\n${sonucTablosu(a)}`);
  const b = await degerlendir(toplantiBilgisi, TOPLANTI_BILGISI_ORNEKLERI, () => saglayici);
  console.log(`\nToplantı bilgisi\n${sonucTablosu(b)}`);
  process.exitCode = a.gecti && b.gecti ? 0 : 1;
} catch (e) {
  console.error(e instanceof Error ? e.message : String(e));
  process.exitCode = 2;
}
