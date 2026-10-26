// `/api/v1` REST işleyicisi: çerçeveden bağımsız (Request → Response). Kimlik doğrulama çağıranın işidir
// (web'de `korumali` oturum ya da API anahtarından aktörü kurar); bu katman aktör yoksa 401 döner.
// Her uç: hız sınırı → yol/sorgu/gövde zod doğrulaması → servis (yetki + günlük) → Türkçe hata gövdesi.

import { ozetHesapla } from "@akredit/cekirdek";
import type { Vt } from "@akredit/vt";
import { z } from "zod";
import type { Aktor, ServisBaglami } from "../baglam.ts";
import { dogrulamaHatasi, ServisHatasi } from "../hata.ts";
import type { HizSiniri } from "./hiz.ts";
import type { TekrarDeposu } from "./tekrar.ts";
import { ucBul } from "./uclar.ts";

export const API_ONEKI = "/api/v1";

export interface IsleyiciSecenekleri {
  db: Vt;
  simdi?: () => Date;
  hiz?: HizSiniri;
  tekrar?: TekrarDeposu;
  /** Beklenmeyen hataları kaydetmek için (giriş bilgisi içermez). */
  kayitci?: (e: unknown) => void;
}

export interface HataGovdesi {
  hata: string;
  kod: string;
  alanlar?: { alan: string; ileti: string }[];
}

const json = (govde: unknown, durum: number, ek: Record<string, string> = {}) =>
  new Response(durum === 204 ? null : JSON.stringify(govde), {
    status: durum,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...ek },
  });

export function hataYaniti(e: ServisHatasi, ek: Record<string, string> = {}): Response {
  const g: HataGovdesi = { hata: e.message, kod: e.kod, ...(e.alanlar.length ? { alanlar: e.alanlar } : {}) };
  return json(g, e.durum, ek);
}

const ANAHTAR = /^[A-Za-z0-9_.:-]{8,200}$/u;

export function apiIsleyici(s: IsleyiciSecenekleri) {
  const simdi = s.simdi ?? (() => new Date());
  return async (istek: Request, aktor: Aktor | null): Promise<Response> => {
    try {
      const adres = new URL(istek.url);
      const yol = adres.pathname.startsWith(API_ONEKI) ? adres.pathname.slice(API_ONEKI.length) : adres.pathname;
      const bulunan = ucBul(istek.method, yol || "/");
      if (bulunan === null) throw new ServisHatasi("bulunamadi", "Böyle bir adres yok. Adresi denetleyin.");
      if (bulunan === "yontem")
        return hataYaniti(new ServisHatasi("gecersiz_istek", "Bu adres bu istek türünü desteklemiyor."));
      if (!aktor)
        throw new ServisHatasi("oturum_yok", "Oturumunuz yok ya da süresi doldu. Lütfen yeniden giriş yapın.");

      if (s.hiz) {
        const h = s.hiz.al(`${aktor.kurumId}:${aktor.kisiId}:${aktor.tur}`);
        if (!h.izin)
          return hataYaniti(
            new ServisHatasi(
              "cok_fazla_istek",
              `Çok sık istek gönderildi. ${h.bekle} saniye bekleyip yeniden deneyin.`,
            ),
            { "retry-after": String(h.bekle) },
          );
      }

      const { uc } = bulunan;
      const sorgu = uc.sorgu
        ? uc.sorgu.safeParse(Object.fromEntries(adres.searchParams))
        : ({ success: true, data: {} } as const);
      if (!sorgu.success) throw dogrulamaHatasi(sorgu.error);

      let ham: unknown;
      let metin = "";
      if (uc.govde) {
        metin = await istek.text();
        if (metin.length > 1_000_000) throw new ServisHatasi("gecersiz_istek", "Gönderilen veri çok büyük.");
        try {
          ham = metin ? JSON.parse(metin) : {};
        } catch {
          throw new ServisHatasi("gecersiz_istek", "Gönderilen veri okunamadı. Geçerli JSON gönderin.");
        }
        const g = uc.govde.safeParse(ham);
        if (!g.success) throw dogrulamaHatasi(g.error as z.ZodError);
      }

      const b: ServisBaglami = { db: s.db, aktor, simdi };
      const calistir = async () => {
        const deger = await uc.isle(b, { yol: bulunan.yol, sorgu: sorgu.data, govde: ham });
        return { durum: uc.basariDurumu ?? 200, govde: deger };
      };

      const tekrarAnahtari = istek.headers.get("idempotency-key");
      if (uc.yontem !== "GET" && tekrarAnahtari && s.tekrar) {
        if (!ANAHTAR.test(tekrarAnahtari))
          throw new ServisHatasi("gecersiz_istek", "Tekrar anahtarı 8-200 karakter; harf, rakam ve - _ . : içermeli.");
        const a = { kurumId: aktor.kurumId, kisiId: aktor.kisiId, anahtar: tekrarAnahtari };
        const ayirma = await s.tekrar.ayir(a, ozetHesapla(`${uc.yontem} ${yol}\n${metin}`));
        if (ayirma.tur === "tekrar") return json(ayirma.govde, ayirma.durum, { "idempotent-replayed": "true" });
        if (ayirma.tur === "isleniyor")
          throw new ServisHatasi("cakisma", "Aynı istek hâlâ işleniyor. Biraz sonra yeniden deneyin.");
        if (ayirma.tur === "uyusmazlik")
          throw new ServisHatasi(
            "kural_ihlali",
            "Bu tekrar anahtarı başka bir istekte kullanılmış. Yeni bir anahtar kullanın.",
          );
        try {
          const r = await calistir();
          await s.tekrar.tamamla(a, r.durum, r.govde);
          return json(r.govde, r.durum);
        } catch (e) {
          // Kural ve doğrulama hataları da saklanır (aynı istek aynı yanıtı alır); beklenmeyenler bırakılır.
          if (e instanceof ServisHatasi && e.durum < 500) {
            const g: HataGovdesi = { hata: e.message, kod: e.kod, ...(e.alanlar.length ? { alanlar: e.alanlar } : {}) };
            await s.tekrar.tamamla(a, e.durum, g);
          } else await s.tekrar.birak(a);
          throw e;
        }
      }
      const r = await calistir();
      return json(r.govde, r.durum);
    } catch (e) {
      if (e instanceof ServisHatasi) return hataYaniti(e);
      if (e instanceof z.ZodError) return hataYaniti(dogrulamaHatasi(e));
      s.kayitci?.(e);
      return hataYaniti(new ServisHatasi("beklenmeyen", "Beklenmeyen bir sorun oluştu. Biraz sonra yeniden deneyin."));
    }
  };
}
