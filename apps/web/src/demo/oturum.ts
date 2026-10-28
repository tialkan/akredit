// Demo oturumu (İP-41): `/deneyin` sayfasında seçilen rolle, etkin demo neslinin kurumuna iki saatlik oturum.
//
// Her ziyaretçi için demo kurumunda ayrı bir "Ziyaretçi" kişisi açılır; rol atamaları demo neslinin şablonundan
// (kurum ayarı) kopyalanır ve oturumla aynı anda biter. Kimlik katmanında ziyaretçi, teslim edilemeyen
// `.invalid` alan adlı bir kullanıcıdır; üyeliği `demo_bitis` taşır (`kimlik/erisim.ts` bu süreyi zorlar ve
// izinleri `DEMO_EYLEMLERI` ile sınırlar). Oturum Better Auth'un kendi oturum tablosuna yazılır; çerez
// Better Auth'un imza biçimiyle (HMAC-SHA256) imzalanır. Oturum belirteci günlüğe ve yanıta yazılmaz,
// yalnız Set-Cookie başlığına gider.

import { createHmac, randomBytes } from "node:crypto";
import { demoAyariOku, etkinDemoKurumu } from "@akredit/ornek-veri/yukle";
import { gunlugeYaz, kiraciIslemi, sema } from "@akredit/vt";
import type { KimlikSunucusu } from "../kimlik/sunucu.ts";
import { DEMO_EPOSTA_ALANI, DEMO_ROL_BILGISI, DEMO_SURESI_MS, type DemoRolu } from "./roller.ts";

export class DemoHatasi extends Error {
  readonly durum: 503;
  constructor(ileti: string) {
    super(ileti);
    this.durum = 503;
  }
}

export interface DemoOturumu {
  /** Set-Cookie başlığının değeri. Gizlidir: günlüğe yazılmaz. */
  cerez: string;
  bitis: Date;
  kurumId: string;
  kisiId: string;
}

/** Better Auth'un imzalı çerez biçimi: `encodeURIComponent(deger + "." + base64(HMAC-SHA256(gizli, deger)))`. */
export function imzaliCerezDegeri(deger: string, gizli: string): string {
  return encodeURIComponent(`${deger}.${createHmac("sha256", gizli).update(deger).digest("base64")}`);
}

export async function demoOturumuAc(
  k: KimlikSunucusu,
  rol: DemoRolu,
  rastgele: (n: number) => Buffer = randomBytes,
): Promise<DemoOturumu> {
  const kurumId = await etkinDemoKurumu(k.db);
  const ayar = kurumId ? await demoAyariOku(k.db, kurumId) : null;
  const sablon = ayar?.personalar[rol];
  if (!kurumId || !sablon) throw new DemoHatasi("Örnek kurum şu an hazırlanıyor. Birkaç dakika sonra yeniden deneyin.");

  const simdi = k.simdi();
  const bitis = new Date(simdi.getTime() + DEMO_SURESI_MS);
  const bilgi = DEMO_ROL_BILGISI[rol];
  const kisiId = await kiraciIslemi(k.db, kurumId, async (tx) => {
    const [kisi] = await tx
      .insert(sema.kisi)
      .values({ kurumId, adSoyad: "Ziyaretçi", unvan: `${bilgi.ad} (örnek rol)` })
      .returning({ id: sema.kisi.id });
    if (!kisi) throw new Error("Ziyaretçi kişisi eklenemedi.");
    await tx.insert(sema.rolAtamasi).values(
      sablon.atamalar.map((a) => ({
        kurumId,
        kisiId: kisi.id,
        rol: a.rol,
        kapsamTuru: a.kapsamTuru,
        kapsamId: a.kapsamId,
        baslangic: simdi,
        bitis,
      })),
    );
    await gunlugeYaz(tx, {
      aktor: { tur: "sistem", id: null },
      eylem: "demo.oturum_acildi",
      hedef: { tur: "kisi", id: kisi.id },
      ayrinti: { rol, bitis: bitis.toISOString() },
    });
    return kisi.id;
  });

  const eposta = `ziyaretci-${rastgele(9).toString("hex")}@${DEMO_EPOSTA_ALANI}`;
  await k.db
    .insert(sema.kimlikUyelik)
    .values({ eposta, bagliKurumId: kurumId, kisiId, demoBitis: bitis, demoRolu: rol });
  const ctx = await k.auth.$context;
  const kullanici = await ctx.internalAdapter.createUser(
    { email: eposta, name: "Ziyaretçi", emailVerified: true },
    { method: "akredit-demo" },
  );
  if (!kullanici) throw new Error("Ziyaretçi hesabı açılamadı.");
  const oturum = await ctx.internalAdapter.createSession(kullanici.id, false, { expiresAt: bitis }, true);
  if (!oturum) throw new Error("Ziyaretçi oturumu açılamadı.");

  const c = ctx.authCookies.sessionToken;
  const parcalar = [
    `${c.name}=${imzaliCerezDegeri(oturum.token, k.ayar.gizli)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.floor(DEMO_SURESI_MS / 1000)}`,
  ];
  if (k.ayar.uretim) parcalar.push("Secure");
  return { cerez: parcalar.join("; "), bitis, kurumId, kisiId };
}
