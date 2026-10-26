// Kimlik testleri için yardımcılar: göçlenmiş PGlite, iki kurumlu uydurma örnek veri, e-posta yakalayıcı,
// çerezli istek. Bütün adlar ve adresler uydurmadır.

import { gocleriUygula, pgliteBaglantisi, sema, type Vt } from "@akredit/vt";
import { sql } from "drizzle-orm";
import type { KimlikAyari, SsoSaglayicisi } from "./ayar.ts";
import { type EpostaGonderici, type KimlikSunucusu, kimlikSunucusuOlustur } from "./sunucu.ts";

export const ADRES = "http://akredit.test";
export const KURUM_A = "01900000-0000-7000-8000-00000000000a";
export const KURUM_B = "01900000-0000-7000-8000-00000000000b";
/** Test için sabit, gizli olmayan imza anahtarı. */
export const TEST_GIZLI = "test-icin-sabit-ve-gizli-olmayan-anahtar-0123456789";

export interface KurumOrnegi {
  kurumId: string;
  birimId: string;
  programId: string;
  dersId: string;
  yoneticiKisiId: string;
  yoneticiEposta: string;
}

export interface Gonderilen {
  alici: string;
  baglanti?: string;
  tur: "sihirli" | "supheli";
}

export function epostaYakalayici(): EpostaGonderici & { kutu: Gonderilen[] } {
  const kutu: Gonderilen[] = [];
  return {
    kutu,
    async sihirliBaglanti(alici, baglanti) {
      kutu.push({ alici, baglanti, tur: "sihirli" });
    },
    async supheliGiris(alici) {
      kutu.push({ alici, tur: "supheli" });
    },
  };
}

async function kurumEkle(db: Vt, kurumId: string, harf: string, alanAdi: string): Promise<KurumOrnegi> {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select set_config('app.kurum_id', ${kurumId}, true)`);
    await tx.insert(sema.kurum).values({ id: kurumId, ad: `Örnek ${harf} Üniversitesi`, alanAdi });
    const [birim] = await tx
      .insert(sema.birim)
      .values({ kurumId, tur: "myo", ad: `Örnek ${harf} MYO`, kod: `MYO-${harf}` })
      .returning();
    const [program] = await tx
      .insert(sema.program)
      // biome-ignore lint/style/noNonNullAssertion: az önce eklendi.
      .values({ kurumId, birimId: birim!.id, ad: `Program ${harf}`, duzey: "onlisans" })
      .returning();
    const [ders] = await tx
      .insert(sema.ders)
      // biome-ignore lint/style/noNonNullAssertion: az önce eklendi.
      .values({ kurumId, programId: program!.id, kod: `ORN${harf}101`, ad: "Örnek Ders", akts: 5, yariyil: 1 })
      .returning();
    const eposta = `yonetici@${alanAdi}`;
    const [kisi] = await tx
      .insert(sema.kisi)
      .values({ kurumId, adSoyad: `Deneme Yönetici ${harf}`, eposta })
      .returning();
    await tx.insert(sema.rolAtamasi).values({
      kurumId,
      // biome-ignore lint/style/noNonNullAssertion: az önce eklendi.
      kisiId: kisi!.id,
      rol: "kurum_yoneticisi",
      kapsamTuru: "kurum",
      kapsamId: kurumId,
      baslangic: new Date("2026-01-01T00:00:00Z"),
    });
    // biome-ignore lint/style/noNonNullAssertion: az önce eklendi.
    await tx.insert(sema.kimlikUyelik).values({ eposta, bagliKurumId: kurumId, kisiId: kisi!.id });
    return {
      kurumId,
      // biome-ignore lint/style/noNonNullAssertion: az önce eklendi.
      birimId: birim!.id,
      // biome-ignore lint/style/noNonNullAssertion: az önce eklendi.
      programId: program!.id,
      // biome-ignore lint/style/noNonNullAssertion: az önce eklendi.
      dersId: ders!.id,
      // biome-ignore lint/style/noNonNullAssertion: az önce eklendi.
      yoneticiKisiId: kisi!.id,
      yoneticiEposta: eposta,
    };
  });
}

export interface TestOrtami {
  k: KimlikSunucusu;
  db: Vt;
  a: KurumOrnegi;
  b: KurumOrnegi;
  eposta: ReturnType<typeof epostaYakalayici>;
  kayitlar: { duzey: string; ileti: string; ayrinti?: unknown }[];
  kapat: () => Promise<void>;
}

export async function testOrtami(ek: { sso?: SsoSaglayicisi[]; simdi?: () => Date } = {}): Promise<TestOrtami> {
  const b = await pgliteBaglantisi();
  await gocleriUygula(b.db);
  const a = await kurumEkle(b.db, KURUM_A, "A", "a.ornek.edu.tr");
  const bb = await kurumEkle(b.db, KURUM_B, "B", "b.ornek.edu.tr");
  const eposta = epostaYakalayici();
  const kayitlar: TestOrtami["kayitlar"] = [];
  const ayar: KimlikAyari = {
    temelAdres: ADRES,
    gizli: TEST_GIZLI,
    uretim: false,
    izinliKokenler: [],
    ssoSaglayicilari: ek.sso ?? [],
  };
  const k = kimlikSunucusuOlustur({
    db: b.db,
    ayar,
    eposta,
    kayitci: (duzey, ileti, ayrinti) => kayitlar.push({ duzey, ileti, ayrinti }),
    ...(ek.simdi ? { simdi: ek.simdi } : {}),
  });
  return { k, db: b.db, a, b: bb, eposta, kayitlar, kapat: b.kapat };
}

/** Basit çerez kavanozu: yanıtlardaki Set-Cookie'leri toplar. */
export class CerezKavanozu {
  readonly cerezler = new Map<string, string>();
  al(yanit: Response) {
    for (const c of yanit.headers.getSetCookie()) {
      const [cift] = c.split(";");
      const i = cift?.indexOf("=") ?? -1;
      if (!cift || i < 0) continue;
      const ad = cift.slice(0, i).trim();
      const deger = cift.slice(i + 1);
      if (deger === "" || /max-age=0/iu.test(c)) this.cerezler.delete(ad);
      else this.cerezler.set(ad, deger);
    }
  }
  baslik(): string {
    return [...this.cerezler].map(([a, d]) => `${a}=${d}`).join("; ");
  }
}

/** Kimlik uç noktasına istek. */
export async function kimlikIstegi(
  k: KimlikSunucusu,
  yol: string,
  secenek: { yontem?: string; govde?: unknown; kavanoz?: CerezKavanozu; basliklar?: Record<string, string> } = {},
): Promise<Response> {
  const basliklar = new Headers({ origin: ADRES, ...(secenek.basliklar ?? {}) });
  if (secenek.govde !== undefined) basliklar.set("content-type", "application/json");
  if (secenek.kavanoz?.cerezler.size) basliklar.set("cookie", secenek.kavanoz.baslik());
  const adres = yol.startsWith("http") ? yol : `${ADRES}${yol}`;
  const yanit = await k.auth.handler(
    new Request(adres, {
      method: secenek.yontem ?? (secenek.govde === undefined ? "GET" : "POST"),
      headers: basliklar,
      ...(secenek.govde === undefined ? {} : { body: JSON.stringify(secenek.govde) }),
    }),
  );
  secenek.kavanoz?.al(yanit);
  return yanit;
}

/** Sihirli bağlantıyla giriş yapar; oturum çerezli kavanozu döndürür. */
export async function sihirliGiris(o: TestOrtami, eposta: string, basliklar: Record<string, string> = {}) {
  const kavanoz = new CerezKavanozu();
  const y = await kimlikIstegi(o.k, "/api/kimlik/sign-in/magic-link", {
    govde: { email: eposta, callbackURL: "/panel" },
    basliklar,
  });
  if (y.status !== 200) throw new Error(`sihirli bağlantı isteği: ${y.status} ${await y.text()}`);
  const son = o.eposta.kutu.filter((x) => x.alici === eposta && x.tur === "sihirli").at(-1);
  if (!son?.baglanti) throw new Error("bağlantı gönderilmedi");
  const d = await kimlikIstegi(o.k, son.baglanti, { kavanoz, basliklar });
  return { kavanoz, yanit: d };
}

/** Korumalı isteğe uygun Request üretir. */
export function istek(
  yol: string,
  s: {
    kavanoz?: CerezKavanozu;
    anahtar?: string;
    yontem?: string;
    koken?: string | null;
    basliklar?: Record<string, string>;
  } = {},
): Request {
  const h = new Headers(s.basliklar ?? {});
  if (s.koken !== null) h.set("origin", s.koken ?? ADRES);
  if (s.kavanoz) h.set("cookie", s.kavanoz.baslik());
  if (s.anahtar) h.set("authorization", `Bearer ${s.anahtar}`);
  return new Request(`${ADRES}${yol}`, { method: s.yontem ?? "GET", headers: h });
}
