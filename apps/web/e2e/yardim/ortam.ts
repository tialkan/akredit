// Uçtan uca kurum açılışı testinin ortamı (İP-35). Yalnız test içindir: anahtar ve gizli değerler sabit,
// gerçek değildir. Veritabanı her koşuda boş bir PGlite dizinidir; e-postalar dizine JSON olarak yazılır.

import { tmpdir } from "node:os";
import { join } from "node:path";

export const PORT = Number(process.env.E2E_PORT ?? 3107);
export const BOLOGNA_PORT = Number(process.env.E2E_BOLOGNA_PORT ?? 3108);
/** Oturum çerezi Secure olduğu için tarayıcı "localhost" adresini kullanır (güvenli bağlam). */
export const KURULUM_ADRESI = `http://localhost:${PORT}`;
export const KOK = join(tmpdir(), `akredit-e2e-${PORT}`);
export const VT_DIZINI = join(KOK, "vt");
export const EPOSTA_DIZINI = join(KOK, "eposta");
export const DEPO_DIZINI = join(KOK, "kanit");

export const SUNUCU_ORTAMI: Record<string, string> = {
  AKREDIT_ADRES: KURULUM_ADRESI,
  AKREDIT_KIMLIK_GIZLI: "e2e-yalniz-test-icin-sabit-gizli-deger-0000",
  AKREDIT_VT_DIZIN: VT_DIZINI,
  AKREDIT_TEST_KIPI: "1",
  // Panel sayfaları örnek veriyle sınanır; derleme de `AKREDIT_ORNEK_VERI=1` ile yapılmalı (ci.yml).
  AKREDIT_ORNEK_VERI: "1",
  AKREDIT_TEST_EPOSTA_DIZINI: EPOSTA_DIZINI,
  // Yerel kanıt deposu (İP-37 köprüleri); üretim kipinde depo tanımsızsa sunucu açılmaz.
  AKREDIT_DEPO_DIZINI: DEPO_DIZINI,
  AKREDIT_DEPO_IMZA_GIZLISI: "e2e-yalniz-test-icin-depo-imza-gizlisi-0000",
  AKREDIT_BOLOGNA_YEREL_IZIN: "1",
  // 32 baytlık sabit test anahtarı (base64). Gerçek bir kurulumda kullanılmaz.
  AKREDIT_ANAHTAR_KASASI: Buffer.alloc(32, 7).toString("base64"),
};
