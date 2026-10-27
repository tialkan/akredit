// S3 uyumlu sürücü (AWS S3, MinIO, Ceph, kurum içi). SDK yerine `fetch` + AWS İmza Sürüm 4 kullanılır:
// bağımlılık yok, test edilebilir (sahte fetch). Üzerine yazma `If-None-Match: *` ile sunucuda engellenir;
// nesne kilidi açıksa her yazım COMPLIANCE kipinde saklama süresiyle gönderilir.

import { createHash, createHmac } from "node:crypto";
import { ozetHesapla } from "@akredit/cekirdek";
import { butunlukDenetle, DepoHatasi, type NesneDeposu, nesneAnahtari, simdiSn, sureDenetle } from "./depo.ts";

export type FetchIslevi = (adres: string, ayar: RequestInit) => Promise<Response>;

export interface S3Ayari {
  /** ör. "https://s3.eu-central-1.amazonaws.com" ya da "http://minio:9000" */
  ucNokta: string;
  bolge: string;
  kova: string;
  erisimAnahtari: string;
  gizliAnahtar: string;
  /** true: `ucNokta/kova/anahtar` (MinIO); false: `kova.ucNokta/anahtar` (AWS). Varsayılan true. */
  yolBicimi?: boolean;
  /** Verilirse nesne kilidi (COMPLIANCE) bu kadar gün saklama ile uygulanır. Kovada kilit açık olmalı. */
  kilitGun?: number;
  /** Anahtar ön eki, ör. "kanit/". */
  onEk?: string;
  fetch?: FetchIslevi;
  /** Test için sabit saat (ms). */
  saat?: () => number;
}

const sha256Hex = (v: string | Uint8Array) => createHash("sha256").update(v).digest("hex");
const hmac = (k: string | Buffer, v: string) => createHmac("sha256", k).update(v).digest();

/** RFC 3986 kodlaması (S3 kuralı: `/` yol içinde korunur). */
export function uriKodla(metin: string, egikCizgiKorunsun = false): string {
  return [...new TextEncoder().encode(metin)]
    .map((b) => {
      const c = String.fromCharCode(b);
      if (/[A-Za-z0-9\-._~]/u.test(c) || (egikCizgiKorunsun && c === "/")) return c;
      return `%${b.toString(16).toUpperCase().padStart(2, "0")}`;
    })
    .join("");
}

function amzTarih(ms: number): { tarih: string; gun: string } {
  const tarih = new Date(ms)
    .toISOString()
    .replace(/[-:]/gu, "")
    .replace(/\.\d{3}/u, "");
  return { tarih, gun: tarih.slice(0, 8) };
}

function imzaAnahtari(gizli: string, gun: string, bolge: string): Buffer {
  return hmac(hmac(hmac(hmac(`AWS4${gizli}`, gun), bolge), "s3"), "aws4_request");
}

interface ImzaGirdisi {
  yontem: string;
  yol: string;
  sorgu: [string, string][];
  basliklar: Record<string, string>;
  yukOzeti: string;
  tarih: string;
  gun: string;
  bolge: string;
  gizli: string;
}

/** SigV4 imzası; kanonik istek ve imzalanan başlıkları da döndürür (test için). */
export function sigv4(g: ImzaGirdisi): { imza: string; imzaliBasliklar: string; kanonik: string } {
  const sorgu = [...g.sorgu]
    .map(([a, d]) => [uriKodla(a), uriKodla(d)] as const)
    .sort((x, y) => (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : x[1] < y[1] ? -1 : 1))
    .map(([a, d]) => `${a}=${d}`)
    .join("&");
  const adlar = Object.keys(g.basliklar)
    .map((a) => a.toLowerCase())
    .sort();
  // SigV4: değerin başı/sonu kırpılır, içteki ardışık boşluklar tek boşluğa indirilir.
  const kucuk = Object.fromEntries(
    Object.entries(g.basliklar).map(([a, d]) => [a.toLowerCase(), d.trim().replace(/ +/gu, " ")]),
  );
  const kanonikBasliklar = adlar.map((a) => `${a}:${kucuk[a]}\n`).join("");
  const imzaliBasliklar = adlar.join(";");
  const kanonik = [g.yontem, g.yol, sorgu, kanonikBasliklar, imzaliBasliklar, g.yukOzeti].join("\n");
  const kapsam = `${g.gun}/${g.bolge}/s3/aws4_request`;
  const imzalanacak = ["AWS4-HMAC-SHA256", g.tarih, kapsam, sha256Hex(kanonik)].join("\n");
  const imza = createHmac("sha256", imzaAnahtari(g.gizli, g.gun, g.bolge))
    .update(imzalanacak)
    .digest("hex");
  return { imza, imzaliBasliklar, kanonik };
}

export function s3Depo(ayar: S3Ayari): NesneDeposu {
  const f = ayar.fetch ?? ((a, b) => fetch(a, b));
  const saat = ayar.saat ?? Date.now;
  const uc = new URL(ayar.ucNokta);
  const yolBicimi = ayar.yolBicimi ?? true;
  const host = yolBicimi ? uc.host : `${ayar.kova}.${uc.host}`;
  const nesneYolu = (anahtar: string) =>
    `${yolBicimi ? `/${uriKodla(ayar.kova)}` : ""}/${uriKodla(`${ayar.onEk ?? ""}${anahtar}`, true)}`;
  const adres = (yol: string, sorgu = "") => `${uc.protocol}//${host}${yol}${sorgu ? `?${sorgu}` : ""}`;

  async function istek(yontem: string, anahtar: string, govde?: Uint8Array, ek: Record<string, string> = {}) {
    const { tarih, gun } = amzTarih(saat());
    const yukOzeti = govde ? sha256Hex(govde) : sha256Hex("");
    const basliklar: Record<string, string> = {
      host,
      "x-amz-content-sha256": yukOzeti,
      "x-amz-date": tarih,
      ...ek,
    };
    const yol = nesneYolu(anahtar);
    const { imza, imzaliBasliklar } = sigv4({
      yontem,
      yol,
      sorgu: [],
      basliklar,
      yukOzeti,
      tarih,
      gun,
      bolge: ayar.bolge,
      gizli: ayar.gizliAnahtar,
    });
    const { host: _h, ...gonderilen } = basliklar;
    gonderilen.authorization = `AWS4-HMAC-SHA256 Credential=${ayar.erisimAnahtari}/${gun}/${ayar.bolge}/s3/aws4_request, SignedHeaders=${imzaliBasliklar}, Signature=${imza}`;
    const init: RequestInit = { method: yontem, headers: gonderilen };
    if (govde) init.body = govde as unknown as NonNullable<RequestInit["body"]>;
    try {
      return await f(adres(yol), init);
    } catch {
      throw new DepoHatasi("Dosya deposuna ulaşılamadı. Biraz sonra yeniden deneyin.");
    }
  }

  const varMi = async (anahtar: string) => {
    const y = await istek("HEAD", anahtar);
    if (y.status === 404) return false;
    if (!y.ok) throw new DepoHatasi("Dosya deposu yanıt vermedi. Biraz sonra yeniden deneyin.");
    return true;
  };

  return {
    ad: "s3",
    kilitli: ayar.kilitGun !== undefined,
    varMi,
    async koy(kurumId, veri, secenek) {
      const ozet = ozetHesapla(veri);
      const anahtar = nesneAnahtari(kurumId, ozet);
      const sonuc = { anahtar, ozet, boyut: veri.byteLength };
      const ek: Record<string, string> = {
        "if-none-match": "*",
        "content-type": secenek?.mime ?? "application/octet-stream",
        "x-amz-checksum-sha256": Buffer.from(ozet, "hex").toString("base64"),
      };
      if (ayar.kilitGun !== undefined) {
        ek["x-amz-object-lock-mode"] = "COMPLIANCE";
        ek["x-amz-object-lock-retain-until-date"] = new Date(saat() + ayar.kilitGun * 86_400_000).toISOString();
      }
      const y = await istek("PUT", anahtar, veri, ek);
      // 412: nesne zaten var (koşullu yazım). İçerik adresli olduğundan içerik aynıdır.
      if (y.status === 412) return { ...sonuc, yeni: false };
      // 409: eşzamanlı koşullu yazım çakışması. Öteki yazım başarısız olmuş olabilir; nesne gerçekten
      // yoksa "zaten var" sayılmaz, kanıt satırı olmayan bir nesneye bağlanmasın.
      if (y.status === 409) {
        if (await varMi(anahtar)) return { ...sonuc, yeni: false };
        throw new DepoHatasi("Dosya saklanamadı. Biraz sonra yeniden deneyin.");
      }
      if (!y.ok) throw new DepoHatasi("Dosya saklanamadı. Biraz sonra yeniden deneyin.");
      return { ...sonuc, yeni: true };
    },
    async al(anahtar) {
      const y = await istek("GET", anahtar);
      if (y.status === 404) throw new DepoHatasi("Dosya bulunamadı.");
      if (!y.ok) throw new DepoHatasi("Dosya okunamadı. Biraz sonra yeniden deneyin.");
      const veri = new Uint8Array(await y.arrayBuffer());
      butunlukDenetle(anahtar, veri);
      return veri;
    },
    async baglanti(anahtar, sureSn, simdi = simdiSn()) {
      sureDenetle(sureSn);
      return s3OnImzaliAdres({ ...ayar, host, yol: nesneYolu(anahtar), protokol: uc.protocol }, sureSn, simdi * 1000);
    },
  };
}

/** Ön imzalı GET adresi (SigV4 sorgu imzası). */
export function s3OnImzaliAdres(
  a: { host: string; yol: string; protokol: string; bolge: string; erisimAnahtari: string; gizliAnahtar: string },
  sureSn: number,
  ms: number,
): string {
  const { tarih, gun } = amzTarih(ms);
  const sorgu: [string, string][] = [
    ["X-Amz-Algorithm", "AWS4-HMAC-SHA256"],
    ["X-Amz-Credential", `${a.erisimAnahtari}/${gun}/${a.bolge}/s3/aws4_request`],
    ["X-Amz-Date", tarih],
    ["X-Amz-Expires", String(sureSn)],
    ["X-Amz-SignedHeaders", "host"],
  ];
  const { imza } = sigv4({
    yontem: "GET",
    yol: a.yol,
    sorgu,
    basliklar: { host: a.host },
    yukOzeti: "UNSIGNED-PAYLOAD",
    tarih,
    gun,
    bolge: a.bolge,
    gizli: a.gizliAnahtar,
  });
  const q = [...sorgu, ["X-Amz-Signature", imza]].map(([k, v]) => `${uriKodla(k ?? "")}=${uriKodla(v ?? "")}`);
  return `${a.protokol}//${a.host}${a.yol}?${q.join("&")}`;
}
