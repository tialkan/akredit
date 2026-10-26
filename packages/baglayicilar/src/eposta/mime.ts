// Ham MIME (RFC 5322 / 2045-2047 / 2231) e-posta ayrıştırıcı. İP-10 epostaAl'ın beklediği iletiyi üretir.
// - Yalnız ekler ve üst bilgiler alınır; gövde metni modele ya da kanıta geçmez (belge veridir, talimat değildir).
// - Authentication-Results yalnız güvenilir sunucunun (authserv-id) eklediği başlıktan okunur; gönderenin
//   kendi yazdığı sahte başlık sayılmaz. Güvenilir başlık yoksa sonuçlar "none" olur ve epostaAl reddeder.
// - Boyut, parça sayısı ve iç içe derinlik sınırlıdır.

import { z } from "zod";

export interface MimeSiniri {
  enBuyukBoyut: number;
  enCokParca: number;
  enDerin: number;
}
export const VARSAYILAN_MIME_SINIRI: MimeSiniri = { enBuyukBoyut: 40 * 1024 * 1024, enCokParca: 200, enDerin: 8 };

const SPF = ["pass", "fail", "softfail", "neutral", "none", "temperror", "permerror"] as const;
const DKIM = ["pass", "fail", "neutral", "none", "temperror", "permerror"] as const;
const DMARC = ["pass", "fail", "none", "temperror", "permerror"] as const;

export const AyrisanIletiSemasi = z.object({
  gonderen: z.string(),
  konu: z.string(),
  mesajKimligi: z.string().nullable(),
  tarih: z.string().nullable(),
  dogrulama: z.object({ spf: z.enum(SPF), dkim: z.enum(DKIM), dmarc: z.enum(DMARC) }),
  ekler: z.array(z.object({ ad: z.string(), mime: z.string(), veri: z.custom<Uint8Array>((v) => v instanceof Uint8Array) })),
  uyarilar: z.array(z.string()),
});
/** epostaAl'a `{ kurumId, ...ileti }` olarak verilir (uyarilar, mesajKimligi, tarih fazladan alanlardır). */
export type AyrisanIleti = z.infer<typeof AyrisanIletiSemasi>;

export class MimeHatasi extends Error {}

// Baytları birebir taşımak için "latin1" (ikili) dize kullanılır.
const ikili = (v: Uint8Array) => Buffer.from(v).toString("latin1");
const bayt = (s: string) => new Uint8Array(Buffer.from(s, "latin1"));

function charsetCoz(veri: Uint8Array, charset: string | undefined): string {
  const c = (charset ?? "utf-8").toLowerCase().trim();
  const ad = c === "iso-8859-9" || c === "latin5" ? "iso-8859-9" : c === "us-ascii" ? "utf-8" : c;
  try {
    return new TextDecoder(ad).decode(veri);
  } catch {
    return new TextDecoder("utf-8").decode(veri);
  }
}

export function qpCoz(s: string, baslikMi = false): Uint8Array {
  const t = (baslikMi ? s.replace(/_/g, " ") : s).replace(/=\r?\n/g, "");
  return bayt(t.replace(/=([0-9A-Fa-f]{2})/g, (_, h: string) => String.fromCharCode(Number.parseInt(h, 16))));
}

/** RFC 2047 kodlanmış sözcükleri çözer: =?utf-8?B?...?= / =?iso-8859-9?Q?...?= */
export function kodluSozcukCoz(s: string): string {
  return s
    .replace(/(=\?[^?]+\?[bBqQ]\?[^?]*\?=)\s+(?==\?)/g, "$1")
    .replace(/=\?([^?*]+)(?:\*[^?]*)?\?([bBqQ])\?([^?]*)\?=/g, (_, cs: string, kod: string, metin: string) =>
      charsetCoz(kod.toUpperCase() === "B" ? new Uint8Array(Buffer.from(metin, "base64")) : qpCoz(metin, true), cs),
    );
}

export interface Baslik {
  ad: string;
  deger: string;
}

export function basliklariAyir(ham: string): Baslik[] {
  const satirlar = ham.replace(/\r?\n[ \t]+/g, " ").split(/\r?\n/);
  const cik: Baslik[] = [];
  for (const s of satirlar) {
    const i = s.indexOf(":");
    if (i <= 0) continue;
    cik.push({ ad: s.slice(0, i).trim().toLowerCase(), deger: s.slice(i + 1).trim() });
  }
  return cik;
}

/** "text/plain; charset=utf-8; name*=utf-8''%C3%B6rnek.pdf" → { deger, param } (RFC 2231 dahil). */
export function parametreler(deger: string): { deger: string; param: Record<string, string> } {
  const parcalar: string[] = [];
  let tirnak = false;
  let cur = "";
  for (const ch of deger) {
    if (ch === '"') tirnak = !tirnak;
    if (ch === ";" && !tirnak) {
      parcalar.push(cur);
      cur = "";
    } else cur += ch;
  }
  parcalar.push(cur);
  const param: Record<string, string> = {};
  const devam: Record<string, { sira: number; v: string; kodlu: boolean }[]> = {};
  for (const p of parcalar.slice(1)) {
    const m = p.trim().match(/^([^=*\s]+)(\*(\d+))?(\*)?\s*=\s*(.*)$/s);
    if (!m) continue;
    const ad = (m[1] ?? "").toLowerCase();
    let v = (m[5] ?? "").trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1).replace(/\\(.)/g, "$1");
    if (m[2] || m[4]) (devam[ad] ??= []).push({ sira: Number(m[3] ?? 0), v, kodlu: !!m[4] });
    else param[ad] = v;
  }
  for (const [ad, liste] of Object.entries(devam)) {
    liste.sort((a, b) => a.sira - b.sira);
    let charset = "utf-8";
    const baytlar: string[] = [];
    for (const [i, x] of liste.entries()) {
      let v = x.v;
      if (x.kodlu) {
        if (i === 0) {
          const k = v.match(/^([^']*)'[^']*'(.*)$/s);
          if (k) {
            charset = k[1] || "utf-8";
            v = k[2] ?? "";
          }
        }
        v = v.replace(/%([0-9A-Fa-f]{2})/g, (_, h: string) => String.fromCharCode(Number.parseInt(h, 16)));
      }
      baytlar.push(v);
    }
    param[ad] = charsetCoz(bayt(baytlar.join("")), charset);
  }
  return { deger: (parcalar[0] ?? "").trim().toLowerCase(), param };
}

/** "Ad <a@b>" ya da "a@b" → küçük harfli adres. */
export function adresAl(deger: string): string {
  const m = deger.match(/<([^<>\s]+@[^<>\s]+)>/) ?? deger.match(/([^\s<>"(),;:]+@[^\s<>"(),;:]+)/);
  return (m?.[1] ?? "").toLowerCase();
}

/**
 * Authentication-Results başlıklarından yalnız `guvenilirSunucu` (authserv-id) olanı okur.
 * RFC 8601: "mx.ornek.edu.tr; spf=pass smtp.mailfrom=…; dkim=pass header.d=…; dmarc=pass …"
 */
export function dogrulamaOku(basliklar: Baslik[], guvenilirSunucu: string): AyrisanIleti["dogrulama"] {
  const sonuc: AyrisanIleti["dogrulama"] = { spf: "none", dkim: "none", dmarc: "none" };
  const ar = basliklar.find(
    (b) => b.ad === "authentication-results" && (b.deger.split(";")[0] ?? "").trim().split(/\s+/)[0]?.toLowerCase() === guvenilirSunucu.toLowerCase(),
  );
  if (!ar) return sonuc;
  const dkimler: string[] = [];
  for (const p of ar.deger.split(";").slice(1)) {
    const m = p.trim().match(/^(spf|dkim|dmarc)\s*=\s*([a-z]+)/i);
    if (!m) continue;
    const yontem = (m[1] ?? "").toLowerCase();
    const r = (m[2] ?? "").toLowerCase();
    if (yontem === "spf" && (SPF as readonly string[]).includes(r)) sonuc.spf = r as (typeof SPF)[number];
    if (yontem === "dmarc" && (DMARC as readonly string[]).includes(r)) sonuc.dmarc = r as (typeof DMARC)[number];
    if (yontem === "dkim") dkimler.push(r);
  }
  // Birden çok DKIM imzasında biri geçerliyse "pass".
  const dk = dkimler.includes("pass") ? "pass" : (dkimler[0] ?? "none");
  if ((DKIM as readonly string[]).includes(dk)) sonuc.dkim = dk as (typeof DKIM)[number];
  return sonuc;
}

function govdeCoz(govde: string, kodlama: string): Uint8Array {
  const k = kodlama.toLowerCase().trim();
  if (k === "base64") return new Uint8Array(Buffer.from(govde.replace(/[^A-Za-z0-9+/=]/g, ""), "base64"));
  if (k === "quoted-printable") return qpCoz(govde);
  return bayt(govde);
}

/** Başlık bloğu: ham 8 bit baytlar UTF-8 olarak okunur (RFC 6532); kodlanmış sözcükler ayrıca çözülür. */
const basUtf8 = (s: string) => charsetCoz(bayt(s), "utf-8");

function bolumle(ham: string): { bas: string; govde: string } {
  const m = ham.match(/\r?\n\r?\n/);
  if (!m || m.index === undefined) return { bas: ham, govde: "" };
  return { bas: ham.slice(0, m.index), govde: ham.slice(m.index + m[0].length) };
}

const dosyaAdi = (s: string) =>
  s
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_")
    .replace(/^\.+/, "")
    .slice(0, 200);

/** Ham iletiyi ayrıştırır. `guvenilirSunucu`: kurumun posta sunucusunun authserv-id'si (ör. "mx.ornek.edu.tr"). */
export function mimeAyristir(veri: Uint8Array, guvenilirSunucu: string, sinir: MimeSiniri = VARSAYILAN_MIME_SINIRI): AyrisanIleti {
  if (veri.byteLength > sinir.enBuyukBoyut) throw new MimeHatasi("E-posta çok büyük; ekleri bölerek gönderin.");
  const { bas, govde } = bolumle(ikili(veri));
  const basliklar = basliklariAyir(basUtf8(bas));
  const al = (ad: string) => basliklar.find((b) => b.ad === ad)?.deger;
  const uyarilar: string[] = [];
  const ekler: AyrisanIleti["ekler"] = [];
  let parcaSayisi = 0;

  const gez = (bh: Baslik[], g: string, derinlik: number) => {
    if (++parcaSayisi > sinir.enCokParca) throw new MimeHatasi("E-postada çok fazla parça var.");
    if (derinlik > sinir.enDerin) throw new MimeHatasi("E-posta yapısı çok iç içe.");
    const h = (ad: string) => bh.find((b) => b.ad === ad)?.deger;
    const ct = parametreler(h("content-type") ?? "text/plain; charset=us-ascii");
    if (ct.deger.startsWith("multipart/")) {
      const sinirDizesi = ct.param.boundary;
      if (!sinirDizesi) {
        uyarilar.push("Bölünmüş bir parça okunamadı.");
        return;
      }
      const ayrac = `--${sinirDizesi}`;
      const parcalar = g.split(new RegExp(`\\r?\\n?${ayrac.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:--)?[ \\t]*\\r?\\n?`));
      // İlk parça önsöz, son parça sonsöz.
      for (const p of parcalar.slice(1, -1)) {
        const alt = bolumle(p);
        gez(basliklariAyir(basUtf8(alt.bas)), alt.govde, derinlik + 1);
      }
      return;
    }
    if (ct.deger === "message/rfc822") {
      const alt = bolumle(g);
      gez(basliklariAyir(basUtf8(alt.bas)), alt.govde, derinlik + 1);
      return;
    }
    const cd = parametreler(h("content-disposition") ?? "");
    const ad = cd.param.filename ?? ct.param.name;
    const ekMi = cd.deger === "attachment" || (ad !== undefined && !ct.deger.startsWith("text/"));
    if (!ekMi || !ad) return; // gövde metni alınmaz
    const temiz = dosyaAdi(kodluSozcukCoz(ad));
    if (!temiz) {
      uyarilar.push("Adı okunamayan bir ek atlandı.");
      return;
    }
    ekler.push({ ad: temiz, mime: ct.deger, veri: govdeCoz(g, h("content-transfer-encoding") ?? "7bit") });
  };
  gez(basliklar, govde, 0);

  const konuHam = al("subject");
  const tarihHam = al("date");
  const tarih = tarihHam && !Number.isNaN(Date.parse(tarihHam)) ? new Date(tarihHam).toISOString() : null;
  return AyrisanIletiSemasi.parse({
    gonderen: adresAl(kodluSozcukCoz(al("from") ?? "")),
    konu: konuHam ? kodluSozcukCoz(konuHam).slice(0, 500) : "",
    mesajKimligi: al("message-id")?.slice(0, 300) ?? null,
    tarih,
    dogrulama: dogrulamaOku(basliklar, guvenilirSunucu),
    ekler,
    uyarilar,
  });
}
