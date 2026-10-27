// Gündem taslağı ve EBYS'ye uygun tutanak metni (saf mantık). Gündem yalnız sistemdeki açık eylemlerden ve
// açık görevlerden (eksiklerden) kurulur; madde uydurulmaz. Tutanak çıktısı yalnız insan onayından sonra,
// onaylayanın adı ve zamanıyla üretilir.

import type { TaslakKarari, TaslakKatilimcisi } from "./tutanak.ts";

export interface AcikEylem {
  id: string;
  tanim: string;
  pukoAsamasi: "planla" | "uygula" | "kontrol_et" | "onlem_al";
  hedefTarih: Date | null;
  olcutKodlari: string[];
}

export interface AcikGorev {
  id: string;
  baslik: string;
  sonTarih: Date | null;
}

export interface GundemMaddesi {
  sira: number;
  baslik: string;
  kaynak: { tur: "eylem" | "gorev" | "acilis" | "dilek"; id: string | null };
  gecikmis: boolean;
  olcutKodlari: string[];
}

/** Açılış, gecikmişler önce olmak üzere eylem ve görev maddeleri, sonda dilek ve temenniler. */
export function gundemTaslagi(g: { eylemler: readonly AcikEylem[]; gorevler: readonly AcikGorev[]; simdi: Date }) {
  const gec = (t: Date | null) => t !== null && t.getTime() < g.simdi.getTime();
  const zaman = (t: Date | null) => t?.getTime() ?? Number.POSITIVE_INFINITY;
  const govde = [
    ...g.eylemler
      .filter((e) => e.pukoAsamasi !== "onlem_al")
      .map((e) => ({
        baslik: `Eylem durumu: ${e.tanim}`,
        kaynak: { tur: "eylem" as const, id: e.id },
        gecikmis: gec(e.hedefTarih),
        t: zaman(e.hedefTarih),
        olcutKodlari: e.olcutKodlari,
      })),
    ...g.gorevler.map((x) => ({
      baslik: `Eksik iş: ${x.baslik}`,
      kaynak: { tur: "gorev" as const, id: x.id },
      gecikmis: gec(x.sonTarih),
      t: zaman(x.sonTarih),
      olcutKodlari: [] as string[],
    })),
  ].sort((a, b) => Number(b.gecikmis) - Number(a.gecikmis) || a.t - b.t);
  const maddeler: Omit<GundemMaddesi, "sira">[] = [
    {
      baslik: "Açılış ve önceki toplantı kararlarının izlenmesi",
      kaynak: { tur: "acilis", id: null },
      gecikmis: false,
      olcutKodlari: [],
    },
    ...govde.map(({ t: _t, ...m }) => m),
    { baslik: "Dilek ve temenniler", kaynak: { tur: "dilek", id: null }, gecikmis: false, olcutKodlari: [] },
  ];
  return maddeler.map((m, i) => ({ ...m, sira: i + 1 }));
}

export interface EbysGirdisi {
  kurumAdi: string;
  baslik: string;
  zaman: Date;
  gundem: readonly GundemMaddesi[];
  katilimcilar: readonly TaslakKatilimcisi[];
  kararlar: readonly TaslakKarari[];
  onay: { onaylayan: string; zaman: Date; sonuc: "onaylandi" | "duzeltildi" } | null;
  /** Düzeltme kararında insanın yazdığı metin; varsa tutanağın metni budur. */
  duzeltilmisMetin?: string | null;
}

const tarih = (d: Date) => d.toISOString().slice(0, 10);

/**
 * EBYS'ye yüklenecek düz metin tutanak (UTF-8, CRLF). Sayı ve imza EBYS'de verilir; burada boş bırakılır.
 * Onaysız taslak için üretilmez.
 */
export function ebysTutanagi(g: EbysGirdisi): string {
  if (!g.onay) throw new Error("Tutanak onaylanmadan çıktı alınamaz.");
  const s: string[] = [
    "T.C.",
    g.kurumAdi,
    "TOPLANTI TUTANAĞI",
    "",
    `Konu: ${g.baslik}`,
    `Toplantı tarihi: ${tarih(g.zaman)}`,
    "Sayı: (EBYS tarafından verilecek)",
    "",
    "GÜNDEM",
    ...g.gundem.map((m) => `${m.sira}. ${m.baslik}`),
    "",
    "KATILIMCILAR",
    ...g.katilimcilar.map((k) => `- ${k.ad}${k.durum === "eksik" ? " (katılımı kayıtta doğrulanmadı)" : ""}`),
    "",
  ];
  if (g.duzeltilmisMetin) s.push("TUTANAK METNİ", g.duzeltilmisMetin, "");
  else {
    s.push("KARARLAR");
    if (g.kararlar.length === 0) s.push("Karar alınmamıştır.");
    for (const k of g.kararlar) s.push(`Karar ${k.no}: ${k.metin}`, `  Kaynak: ${k.atif}`);
    s.push("");
  }
  s.push(
    `Onaylayan: ${g.onay.onaylayan}`,
    `Onay zamanı: ${g.onay.zaman.toISOString()}`,
    `Onay türü: ${g.onay.sonuc === "duzeltildi" ? "düzeltilerek onaylandı" : "onaylandı"}`,
  );
  return `${s.join("\r\n")}\r\n`;
}
