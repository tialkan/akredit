// Ortamdaki AKREDIT_YZ_* ayarıyla yerel modele tek soru sorar, yanıtı yazdırır.
// Gerçek kurulumda model denemesi için de kullanılır (docs/kurulum/yerel-model.md "Deneme").
import { kurumIciSaglayici } from "../yz-ayari.ts";

try {
  const { saglayici } = kurumIciSaglayici(process.env);
  const y = await saglayici.sohbet({
    mesajlar: [{ rol: "kullanici", icerik: process.argv[2] ?? "Tek kelimeyle yanıt ver: hazır mısın?" }],
    enCokBelirtec: 64,
  });
  console.log(y.icerik.trim());
} catch (e) {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
}
