// Google Forms ve LimeSurvey CSV dışa aktarımlarını içe alır. Kimlik ve iz sütunları (e-posta, belirteç,
// IP, zaman damgası, yönlendiren adres, kayıt no) okunmaz: yanıtlar anonim kaydedilir. Sütunlar soru
// metni ya da koduyla eşlenir; tanım verilmezse sütun değerlerinden çıkarılır.

import { type HucreDegeri, tabloOku } from "@akredit/belge";
import { kucukHarf } from "@akredit/cekirdek";
import { LIKERT_5 } from "./sablonlar.ts";
import { AnketTanimi, type Soru, type Yanit, YanitHatasi, yanitDogrula } from "./sema.ts";

export type Kaynak = "google_forms" | "limesurvey" | "bilinmiyor";

/** Okunmayan sütunlar (küçük harfle). */
const ATILAN = new Set([
  // Google Forms
  "zaman damgası",
  "timestamp",
  "e-posta adresi",
  "email address",
  "e-posta",
  "puan",
  "score",
  "kullanıcı adı",
  "username",
  // LimeSurvey
  "id",
  "response id",
  "submitdate",
  "date submitted",
  "lastpage",
  "last page",
  "startlanguage",
  "start language",
  "seed",
  "token",
  "startdate",
  "date started",
  "datestamp",
  "date last action",
  "ipaddr",
  "ip address",
  "refurl",
  "referrer url",
  "email",
  "firstname",
  "lastname",
]);

const normal = (s: string) => kucukHarf(s.trim().replace(/\s+/gu, " "));

export interface IceAktarmaSonucu {
  kaynak: Kaynak;
  tanim: AnketTanimi;
  yanitlar: Yanit[];
  /** Okunmayan (kimlik/iz) sütunların başlıkları. */
  atilanSutunlar: string[];
  /** Tanımda karşılığı olmayan sütunlar. */
  eslesmeyenSutunlar: string[];
  /** Geçersiz satırlar: CSV satır numarası (başlık 1) ve neden. */
  hatalar: { satir: number; neden: string }[];
}

function kaynakBul(basliklar: string[]): Kaynak {
  const b = new Set(basliklar.map(normal));
  if (b.has("zaman damgası") || b.has("timestamp")) return "google_forms";
  if (b.has("submitdate") || b.has("lastpage") || b.has("startlanguage") || b.has("date submitted"))
    return "limesurvey";
  return "bilinmiyor";
}

function soruKodu(i: number) {
  return `s${i + 1}`;
}

/** Tanım verilmediğinde sütun değerlerinden soru türünü çıkarır. */
function soruCikar(baslik: string, i: number, degerler: HucreDegeri[]): Soru {
  const dolu = degerler.filter((v) => v !== null && v !== "");
  const metin = baslik.trim().slice(0, 500) || `Soru ${i + 1}`;
  const etiketler = LIKERT_5.map(normal);
  if (dolu.length && dolu.every((v) => typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= 5))
    return { kod: soruKodu(i), metin, tur: "likert", secenekler: LIKERT_5, zorunlu: false };
  if (dolu.length && dolu.every((v) => typeof v === "string" && etiketler.includes(normal(v))))
    return { kod: soruKodu(i), metin, tur: "likert", secenekler: LIKERT_5, zorunlu: false };
  if (dolu.length && dolu.every((v) => typeof v === "number"))
    return { kod: soruKodu(i), metin, tur: "sayi", zorunlu: false, enAz: Math.min(0, ...(dolu as number[])) };
  return { kod: soruKodu(i), metin, tur: "acik", zorunlu: false };
}

function degerCevir(s: Soru, v: HucreDegeri): unknown {
  if (v === null || v === "") return null;
  if (s.tur === "likert" && typeof v === "string") {
    const i = (s.secenekler ?? []).map(normal).indexOf(normal(v));
    return i >= 0 ? i + 1 : v;
  }
  if (s.tur === "coklu_secim" && typeof v === "string") return v.split(/;\s*|,\s*/u).filter(Boolean);
  if (s.tur === "acik") return String(v);
  return v;
}

/** CSV (ya da XLSX/ODS) dışa aktarımını okur. */
export async function csvIceAktar(
  veri: Uint8Array,
  secenek: { tanim?: AnketTanimi; baslik?: string; ad?: string } = {},
): Promise<IceAktarmaSonucu> {
  const t = await tabloOku(veri, { ad: secenek.ad ?? "yanitlar.csv" });
  const satirlar = t.sayfalar[0]?.satirlar ?? [];
  if (!satirlar.length) throw new YanitHatasi(t.uyarilar?.[0] ?? "Dosya boş ya da okunamadı.");
  const [baslikSatiri, ...govde] = satirlar;
  if (!baslikSatiri?.length) throw new YanitHatasi("Dosyada başlık satırı yok.");
  const basliklar = baslikSatiri.map((h) => String(h ?? ""));
  const kaynak = kaynakBul(basliklar);
  const atilanSutunlar: string[] = [];
  const kullanilan: { i: number; baslik: string }[] = [];
  basliklar.forEach((b, i) => {
    if (ATILAN.has(normal(b))) atilanSutunlar.push(b);
    else if (b.trim()) kullanilan.push({ i, baslik: b });
  });

  let tanim: AnketTanimi;
  const esleme = new Map<number, Soru>();
  const eslesmeyenSutunlar: string[] = [];
  if (secenek.tanim) {
    tanim = secenek.tanim;
    for (const { i, baslik } of kullanilan) {
      // LimeSurvey başlığı "kod" ya da "kod. Soru metni" olabilir.
      const n = normal(baslik);
      const s = tanim.sorular.find(
        (x) => normal(x.metin) === n || x.kod === n || n.startsWith(`${x.kod}.`) || n.startsWith(`${x.kod} `),
      );
      if (s) esleme.set(i, s);
      else eslesmeyenSutunlar.push(baslik);
    }
  } else {
    const sorular = kullanilan.map(({ i, baslik }, k) => {
      const s = soruCikar(
        baslik,
        k,
        govde.map((r) => r[i] ?? null),
      );
      esleme.set(i, s);
      return s;
    });
    tanim = AnketTanimi.parse({
      baslik: secenek.baslik ?? "İçe aktarılan anket",
      hedefKitle: "ogrenci",
      sorular,
    });
  }

  const yanitlar: Yanit[] = [];
  const hatalar: { satir: number; neden: string }[] = [];
  govde.forEach((r, k) => {
    if (r.every((h) => h === null || h === "")) return;
    const ham: Record<string, unknown> = {};
    for (const [i, s] of esleme) ham[s.kod] = degerCevir(s, r[i] ?? null);
    try {
      yanitlar.push(yanitDogrula(tanim, ham));
    } catch (e) {
      hatalar.push({ satir: k + 2, neden: e instanceof YanitHatasi ? e.message : "Satır okunamadı." });
    }
  });
  return { kaynak, tanim, yanitlar, atilanSutunlar, eslesmeyenSutunlar, hatalar };
}
