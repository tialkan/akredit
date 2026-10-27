// API anahtarıyla aktör kurma. Anahtar yalnız doğrulanır; hiçbir yanıta, günlüğe ya da modele geçmez.
// Yetki = kişinin rolleri ∩ anahtarın kapsamı. İnsan kararı gerektiren eylemler MCP'de kapsamdan da düşürülür.

import { type Aktor, aktorYukle, ServisHatasi } from "@akredit/servis";
import { sema, type Vt } from "@akredit/vt";
import { type ApiAnahtariKaydi, apiAnahtariAyristir, apiAnahtariDogrula, type Eylem } from "@akredit/yetki";
import { eq } from "drizzle-orm";

/** MCP üzerinden hiçbir koşulda kullanılamayacak eylemler: karar, imza, dış gönderim, yönetim. */
export const MCP_YASAK_EYLEMLER: ReadonlySet<Eylem> = new Set<Eylem>([
  "karar.ver",
  "politika.imzala",
  "rapor.gonder",
  "kullanici.davet_et",
  "kullanici.ice_aktar",
  "rol.ata",
  "api_anahtari.yonet",
  "kurum.ayar_yonet",
]);

const kimlikYok = (neden: string) => new ServisHatasi("oturum_yok", `${neden} Yeni bir anahtar oluşturun.`);

/** `Authorization: Bearer akr_…` başlığından ya da çıplak anahtardan aktörü kurar. */
export async function anahtarAktoru(db: Vt, metin: string | null | undefined, simdi: Date): Promise<Aktor> {
  const ham = (metin ?? "").replace(/^Bearer\s+/iu, "").trim();
  const a = apiAnahtariAyristir(ham);
  if (!a) throw kimlikYok("Anahtar tanınmadı.");
  const [satir] = await db.select().from(sema.kimlikApiAnahtari).where(eq(sema.kimlikApiAnahtari.onek, a.onek));
  const kayit: ApiAnahtariKaydi | null = satir
    ? {
        id: satir.id,
        kurumId: satir.bagliKurumId,
        kisiId: satir.kisiId,
        onek: satir.onek,
        ozet: satir.ozet,
        kapsam: satir.kapsam as Eylem[],
        bitis: satir.bitis,
        iptal: satir.iptal,
      }
    : null;
  const d = apiAnahtariDogrula(ham, kayit, simdi);
  if (!d.gecerli) throw kimlikYok(d.neden);
  await db.update(sema.kimlikApiAnahtari).set({ sonKullanim: simdi }).where(eq(sema.kimlikApiAnahtari.id, d.kayit.id));
  const kapsam = d.kayit.kapsam.filter((e) => !MCP_YASAK_EYLEMLER.has(e));
  return aktorYukle(db, d.kayit.kurumId, d.kayit.kisiId, "anahtar", kapsam);
}
