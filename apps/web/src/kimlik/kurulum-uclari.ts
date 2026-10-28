// `/api/kurulum/*`: kurulum sihirbazı ve birim/program yönetimi uçları (İP-35). Her uç oturum ister (`korumali`: CSRF + bağlam);
// yetki, doğrulama ve günlük `@akredit/servis` içinde yapılır. Bu uçlar veri kipinden bağımsız olarak her zaman
// gerçek veritabanıyla çalışır: kurum açmak ve kurmak gerçek bir işlemdir.

import { kurulum, politika, type ServisBaglami, ServisHatasi } from "@akredit/servis";
import type { Vt } from "@akredit/vt";
import { z } from "zod";
import { aktorOlustur } from "../app/api/_ortak/v1.ts";
import { hataYaniti, type IstekBaglami, korumali } from "./erisim.ts";
import { hocalariDavetEt } from "./kurum-acilisi.ts";
import type { KimlikSunucusu } from "./sunucu.ts";
import { rolAta } from "./yonetim.ts";

type Isleyici = (s: ServisBaglami, govde: unknown, p: string[], b: IstekBaglami, k: KimlikSunucusu) => Promise<unknown>;

const yerelBologna = () => process.env.AKREDIT_TEST_KIPI === "1" && process.env.AKREDIT_BOLOGNA_YEREL_IZIN === "1";

const RolGirdisi = z
  .object({
    kisiId: z.uuid(),
    rol: z.enum([
      "kurum_yoneticisi",
      "kalite_komisyonu_baskani",
      "kalite_komisyonu_uyesi",
      "birim_kalite_sorumlusu",
      "program_sorumlusu",
      "ogretim_elemani",
      "gozlemci",
    ]),
    kapsam: z.object({ tur: z.enum(["kurum", "birim", "program", "ders"]), id: z.uuid() }).strict(),
  })
  .strict();

/** "YÖNTEM yol" → işleyici. Yoldaki `:id` parçası `p[0]` olarak gelir. */
const UCLAR: Record<string, Isleyici> = {
  "GET durum": (s) => kurulum.kurulumDurumu(s),
  "POST yz-anahtari": (s, g) => politika.yzAnahtariKaydet(s, g),
  "GET yurt-disi-metni": async () => ({
    metin: kurulum.YURT_DISI_METNI,
    surum: kurulum.YURT_DISI_METNI_SURUMU,
    ozet: kurulum.YURT_DISI_METNI_OZETI,
  }),
  "POST yurt-disi-karari": (s, g) => kurulum.yurtDisiKarariImzala(s, g),
  "GET cerceveler": async () => kurulum.cerceveSecenekleri(),
  "POST cerceveler": (s, g) => kurulum.cercevelerSec(s, g),
  "POST bologna/onizle": (s, g) => kurulum.bolognaOnizle(s, g, { yerelIzin: yerelBologna() }),
  "POST bologna/uygula": (s, g) => kurulum.bolognaUygula(s, g),
  "GET birimler": (s) => kurulum.birimler(s),
  "POST birimler": (s, g) => kurulum.birimEkle(s, g),
  "PATCH birimler/:id": (s, g, p) => kurulum.birimDuzelt(s, p[0] as string, g),
  "GET birimler/:id/duzeltmeler": (s, _g, p) => kurulum.duzeltmeGecmisi(s, "birim", p[0] as string),
  "POST programlar": (s, g) => kurulum.programEkle(s, g),
  "PATCH programlar/:id": (s, g, p) => kurulum.programDuzelt(s, p[0] as string, g),
  "GET programlar/:id/duzeltmeler": (s, _g, p) => kurulum.duzeltmeGecmisi(s, "program", p[0] as string),
  "GET kisiler": (s) => kurulum.kisiler(s),
  "POST roller": async (_s, g, _p, b, k) => {
    const r = RolGirdisi.parse(g);
    await rolAta(k, b, r.kisiId, r.rol, r.kapsam, null);
    return { tamam: true };
  },
  "POST davet": (_s, g, _p, b, k) => hocalariDavetEt(k, b, g),
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

function eslestir(yontem: string, parcalar: string[]): { is: Isleyici; p: string[] } | null {
  const p: string[] = [];
  const kalip = parcalar.map((x) => {
    if (UUID.test(x)) {
      p.push(x);
      return ":id";
    }
    return x;
  });
  const is = UCLAR[`${yontem} ${kalip.join("/")}`];
  return is ? { is, p } : null;
}

/** `/api/kurulum/*` işleyicisi. Testte doğrudan, uygulamada rota dosyasından çağrılır. */
export function kurulumIsleyici(kimlik: KimlikSunucusu, db: Vt, simdi: () => Date = () => new Date()) {
  return korumali(kimlik, async (i, b) => {
    const yol = new URL(i.url).pathname
      .replace(/^\/api\/kurulum\/?/u, "")
      .split("/")
      .filter(Boolean);
    const e = eslestir(i.method, yol);
    if (!e) return Response.json({ hata: "Bu adres bulunamadı." }, { status: 404 });
    if (b.tur !== "oturum")
      return Response.json({ hata: "Kurulum yalnız oturum açarak yapılabilir." }, { status: 403 });
    let govde: unknown = null;
    if (i.method !== "GET")
      try {
        govde = await i.json();
      } catch {
        return Response.json({ hata: "İstek gövdesi okunamadı." }, { status: 400 });
      }
    const s: ServisBaglami = { db, aktor: aktorOlustur(b), simdi };
    try {
      return Response.json(await e.is(s, govde, e.p, b, kimlik));
    } catch (h) {
      if (h instanceof ServisHatasi)
        return Response.json({ hata: h.message, kod: h.kod, alanlar: h.alanlar }, { status: h.durum });
      if (h instanceof z.ZodError)
        return Response.json(
          {
            hata: "Bilgiler eksik ya da hatalı. Alanları düzeltip yeniden deneyin.",
            alanlar: h.issues.map((x) => ({ alan: x.path.join("."), ileti: x.message })),
          },
          { status: 400 },
        );
      return hataYaniti(h);
    }
  });
}
