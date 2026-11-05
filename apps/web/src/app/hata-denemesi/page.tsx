import { notFound } from "next/navigation";

// Yalnız uçtan uca testlerde (AKREDIT_TEST_KIPI=1) 500 hata sayfasını sınamak için kasıtlı hata atar.
// Başka her ortamda 404'tür.

export const dynamic = "force-dynamic";

export default function HataDenemesi() {
  if (process.env.AKREDIT_TEST_KIPI !== "1") notFound();
  throw new Error("Kasıtlı test hatası (iç ayrıntı gösterilmemeli)");
}
