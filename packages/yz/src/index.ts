// @akredit/yz: Sağlayıcıdan bağımsız yapay zekâ katmanı: model bağdaştırıcıları, araç döngüsü, atıf ve KVKK güvenceleri, değerlendirme düzeneği.
// Kapsam ve kabul ölçütleri: plan/ip/IP-03-yz-katmani.md

export const PAKET = "@akredit/yz";

export * from "./ajan.ts";
export * from "./anahtar-kasasi.ts";
export * from "./degerlendirme/duzenek.ts";
export * from "./gorevler/bologna-taslagi/index.ts";
export * as bolognaOrnek from "./gorevler/bologna-taslagi/ornek.ts";
export * from "./gorevler/gorev.ts";
export * from "./gorevler/kanit-avcisi/index.ts";
export * from "./gorevler/kanit-siniflama.ts";
export * from "./gorevler/saha-sorulari.ts";
export * from "./gorevler/toplanti-bilgisi.ts";
export * from "./guvence/atif.ts";
// Çıkış kapısı (İP-40). `tekMetinKapisi` ve `cikisIzniDenetle` bilerek dışa açılmaz: kapı bağlamını yalnız paket kurar.
export {
  type CikisAyari,
  type CikisIslemi,
  type CikisKaydi,
  type CikisKipi,
  type CikisSonucu,
  cikisKapisi,
  InsanIncelemesiGerekliHatasi,
  kapiDenetimi,
  SAGLAYICI_KATALOGU,
  type SaglayiciBilgisi,
  saglayiciBilgisi,
} from "./guvence/cikis-kapisi.ts";
export * from "./guvence/istem-kalkani.ts";
export * from "./guvence/kvkk.ts";
export * from "./guvence/politika.ts";
export * from "./guvence/sayi.ts";
export * from "./http.ts";
export * from "./olcum.ts";
export * from "./saglayici.ts";
export * from "./saglayicilar/anthropic.ts";
export * from "./saglayicilar/kayit.ts";
export * from "./saglayicilar/openai-uyumlu.ts";
export * from "./saglayicilar/sahte.ts";
export * from "./web-arama/index.ts";
export * from "./yapilandirilmis.ts";
