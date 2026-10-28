// Bağlayıcı eşitleme işleri: kurum ayarında açık olan bağlayıcıyı çalıştırır, çıktısını kanıt hattına verir.
// - Bologna, AVESİS, YÖK Atlas: okunan veri JSON kanıt olur. İçerik özetiyle tekilleşir: değişmeyen veri
//   yeni kanıt üretmez ("zaten var"). Okuma zamanı kanıt içeriğine değil kaynak ayrıntısına yazılır.
// - E-posta (IMAP, XOAUTH2) ve Drive: ekler/dosyalar kanıt olur; eşitleme durumu ve yenilenen şifreli
//   belirteç kurum ayarına geri yazılır. Açık metin belirteç hiçbir yere yazılmaz.
// Ağ ve saat dışarıdan verilir (testte sahte bağlam).

import { connect } from "node:tls";
import {
  avesisProfiliOku,
  type BelirtecKasasi,
  type DisBaglam,
  gecerliBelirtec,
  type IstemciBilgisi,
  imapEsitle,
  klasorEsitle,
  type OAuthSaglayici,
  programIstatistikleriniOku,
  programiOku,
  type Soket,
} from "@akredit/baglayicilar";
import { kiraciIslemi, sema } from "@akredit/vt";
import { isNotNull } from "drizzle-orm";
import { epostaAl, type HatBaglami, kanitAl } from "../kanit-hatti/index.ts";
import { type BaglayiciTuru, baglayiciAyari, baglayiciAyariGuncelle } from "./kurumlar.ts";

export interface EsitlemeBaglami {
  hat: HatBaglami;
  dis: DisBaglam;
  /** OAuth belirteç kasası (AKREDIT_BAGLAYICI_ANAHTARI). Yoksa e-posta ve Drive çalışmaz. */
  kasa: BelirtecKasasi | null;
  istemciler: Partial<Record<OAuthSaglayici, IstemciBilgisi>>;
  /** IMAP için TLS soketi. Verilmezse node:tls kullanılır. */
  soketAc?: (sunucu: string, port: number) => Promise<Soket>;
}

export interface EsitlemeOzeti {
  tur: BaglayiciTuru;
  durum: "kapali" | "tamam" | "hata";
  eklenen: number;
  zatenVar: number;
  ileti?: string;
}

/** Okuma zamanlarını içerikten çıkarır: aynı veri her hafta aynı özeti versin. */
function kararliJson(v: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(v, (k, x) => (k === "okunma" ? undefined : x), 2));
}

async function jsonKanit(
  e: EsitlemeBaglami,
  kurumId: string,
  dosyaAdi: string,
  veri: unknown,
  ayrinti: Record<string, unknown>,
) {
  return kanitAl(e.hat, {
    kurumId,
    veri: kararliJson(veri),
    dosyaAdi,
    mime: "application/json",
    kaynakTuru: "baglayici",
    kaynakAyrinti: { ...ayrinti, okunma: e.dis.simdi().toISOString() },
  });
}

function say(o: { eklenen: number; zatenVar: number }, d: { durum: string }) {
  if (d.durum === "eklendi") o.eklenen++;
  else if (d.durum === "zaten_var") o.zatenVar++;
}

const tlsSoket = (sunucu: string, port: number): Promise<Soket> =>
  new Promise((coz, reddet) => {
    const s = connect({ host: sunucu, port, servername: sunucu });
    const parcalar: Uint8Array[] = [];
    const bekleyen: ((p: Uint8Array | null) => void)[] = [];
    let bitti = false;
    s.on("data", (d: Buffer) => {
      const p = new Uint8Array(d);
      const b = bekleyen.shift();
      if (b) b(p);
      else parcalar.push(p);
    });
    s.on("end", () => {
      bitti = true;
      for (const b of bekleyen.splice(0)) b(null);
    });
    s.once("secureConnect", () =>
      coz({
        yaz: (v) => new Promise((ok, h) => s.write(v, (e) => (e ? h(e) : ok()))),
        oku: () =>
          new Promise((ok) => {
            const p = parcalar.shift();
            if (p) ok(p);
            else if (bitti) ok(null);
            else bekleyen.push(ok);
          }),
        kapat: async () => {
          s.end();
        },
      }),
    );
    s.once("error", reddet);
    s.setTimeout(60_000, () => s.destroy(new Error("Posta sunucusu yanıt vermedi.")));
  });

/** Kurumun bir bağlayıcısını eşitler. Kapalıysa hiçbir şey yapmaz. Hata iletisi kurum ayarına yazılır. */
export async function baglayiciEsitle(e: EsitlemeBaglami, kurumId: string, tur: BaglayiciTuru): Promise<EsitlemeOzeti> {
  const o: EsitlemeOzeti = { tur, durum: "tamam", eklenen: 0, zatenVar: 0 };
  const db = e.hat.db;
  const ek: Record<string, unknown> = {};
  try {
    if (tur === "bologna") {
      const a = await baglayiciAyari(db, kurumId, "bologna");
      if (!a) return { ...o, durum: "kapali" };
      for (const adres of a.adresler) {
        const veri = await programiOku(adres, e.dis);
        const ad = `bologna-${new URL(adres).searchParams.get("curSunit") ?? "program"}.json`;
        say(o, await jsonKanit(e, kurumId, ad, veri, { baglayici: "bologna", adres }));
      }
    } else if (tur === "avesis") {
      const a = await baglayiciAyari(db, kurumId, "avesis");
      if (!a) return { ...o, durum: "kapali" };
      const kisiler = await kiraciIslemi(db, kurumId, (tx) =>
        tx
          .select({ id: sema.kisi.id, adres: sema.kisi.avesisAdresi })
          .from(sema.kisi)
          .where(isNotNull(sema.kisi.avesisAdresi)),
      );
      const hatalar: string[] = [];
      for (const k of kisiler) {
        try {
          const r = await avesisProfiliOku(k.adres as string, e.dis);
          say(
            o,
            await jsonKanit(e, kurumId, `avesis-${k.id}.json`, r, {
              baglayici: "avesis",
              adres: k.adres,
              kisiId: k.id,
            }),
          );
        } catch {
          hatalar.push(k.id);
        }
      }
      if (hatalar.length) o.ileti = `${hatalar.length} kişinin AVESİS sayfası okunamadı.`;
    } else if (tur === "yokatlas") {
      const a = await baglayiciAyari(db, kurumId, "yokatlas");
      if (!a) return { ...o, durum: "kapali" };
      const r = await programIstatistikleriniOku(a.programKodlari, e.dis);
      say(o, await jsonKanit(e, kurumId, "yokatlas.json", r, { baglayici: "yokatlas", kodlar: a.programKodlari }));
      if (r.hatalar.length) o.ileti = `${r.hatalar.length} program okunamadı.`;
    } else if (tur === "eposta") {
      const a = await baglayiciAyari(db, kurumId, "eposta");
      if (!a) return { ...o, durum: "kapali" };
      const istemci = e.istemciler[a.saglayici];
      if (!e.kasa || !istemci) throw new Error("E-posta bağlantısı bu sunucuda yapılandırılmamış.");
      const b = await gecerliBelirtec(e.kasa, a.belirtec, kurumId, a.saglayici, istemci, e.dis);
      if (b.yenilendi) ek.belirtec = b.sifreli;
      const soket = await (e.soketAc ?? tlsSoket)(a.sunucu, a.port);
      let s: Awaited<ReturnType<typeof imapEsitle>>;
      try {
        s = await imapEsitle(soket, a.durum, {
          kullanici: a.kullanici,
          erisim: b.belirtec.erisim,
          kutu: a.kutu,
          guvenilirSunucu: a.guvenilirSunucu,
        });
      } finally {
        await soket.kapat().catch(() => {});
      }
      for (const ileti of s.iletiler) {
        const t = await epostaAl(e.hat, { kurumId, ...ileti }, { izinliGonderenler: a.izinliGonderenler });
        for (const d of t.dosyalar) say(o, d);
      }
      ek.durum = s.durum;
    } else {
      const a = await baglayiciAyari(db, kurumId, "drive");
      if (!a) return { ...o, durum: "kapali" };
      const istemci = e.istemciler[a.saglayici];
      if (!e.kasa || !istemci) throw new Error("Bulut bağlantısı bu sunucuda yapılandırılmamış.");
      const b = await gecerliBelirtec(e.kasa, a.belirtec, kurumId, a.saglayici, istemci, e.dis);
      if (b.yenilendi) ek.belirtec = b.sifreli;
      const s = await klasorEsitle(a.saglayici, a.klasorId, b.belirtec.erisim, a.durum, e.dis);
      for (const g of s.girdiler) say(o, await kanitAl(e.hat, { kurumId, ...g }));
      ek.durum = s.durum;
      if (s.kaybolan.length) o.ileti = `${s.kaybolan.length} dosya bulutta artık yok (kanıtlar korunur).`;
    }
  } catch (h) {
    o.durum = "hata";
    // Bağlayıcı hataları kullanıcıya gösterilebilir Türkçe iletidir; belirteç içermez (İP-23).
    o.ileti = (h instanceof Error ? h.message : "Eşitleme başarısız oldu.").slice(0, 300);
  }
  await baglayiciAyariGuncelle(db, kurumId, tur, {
    ...ek,
    son: {
      zaman: e.dis.simdi().toISOString(),
      eklenen: o.eklenen,
      zatenVar: o.zatenVar,
      ...(o.ileti ? { ileti: o.ileti } : {}),
    },
  });
  return o;
}
