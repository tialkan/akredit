// Sessiz devir (İP-38), saf kısım: iş günü hesabı ve geçen dönemin onaylı taslağından yeni dönem taslağı.
// IO yapmaz; zaman ve girdiler parametredir. Birleştirme modelsizdir: hiçbir metin ya da sayı uydurulmaz,
// her değişiklik kaynağıyla (ders kaydı, okuma, PÜKÖ önlemi) fark listesine girer.

import { type BolognaTaslagi, type Bulgu, kanonikJson } from "@akredit/cekirdek";
import { yerelTarih } from "@akredit/surec";
import { tamDenetim } from "./saf.ts";

/** Kurum politikasında süre yoksa itiraz süresi (iş günü). */
export const VARSAYILAN_ITIRAZ_IS_GUNU = 5;
export const VARSAYILAN_SAAT_DILIMI = "Europe/Istanbul";

const GUN_MS = 86_400_000;

/** "YYYY-MM-DD" tarihinin haftanın günü (0 pazar … 6 cumartesi). */
function haftaGunu(tarih: string): number {
  return new Date(`${tarih}T12:00:00Z`).getUTCDay();
}

export interface IsGunuAyari {
  /** Kurumun tatil günleri, "YYYY-MM-DD" (resmî tatil listesi kurumca girilir; sistem hafızadan yazmaz). */
  tatiller?: readonly string[];
  saatDilimi?: string;
}

export function isGunuMu(tarih: string, ayar: IsGunuAyari = {}): boolean {
  const g = haftaGunu(tarih);
  return g !== 0 && g !== 6 && !(ayar.tatiller ?? []).includes(tarih);
}

/**
 * `baslangic` anından sonra `n` iş günü ekler; saat aynı kalır. Hafta sonu ve tatiller sayılmaz.
 * Ör. 2026-10-26 pazartesi 10:00 + 5 iş günü, 29 Ekim tatil verilmişse: 27, 28, 30 Ekim, 2, 3 Kasım → 3 Kasım 10:00.
 */
export function isGunuEkle(baslangic: Date, n: number, ayar: IsGunuAyari = {}): Date {
  const tz = ayar.saatDilimi ?? VARSAYILAN_SAAT_DILIMI;
  let an = baslangic.getTime();
  let sayilan = 0;
  for (let i = 0; sayilan < n && i < 400; i++) {
    an += GUN_MS;
    if (isGunuMu(yerelTarih(new Date(an), tz), ayar)) sayilan++;
  }
  return new Date(an);
}

/** `simdi`den `son`a kalan iş günü (bugün sayılmaz; süre dolduysa 0). */
export function kalanIsGunu(simdi: Date, son: Date, ayar: IsGunuAyari = {}): number {
  const tz = ayar.saatDilimi ?? VARSAYILAN_SAAT_DILIMI;
  if (simdi >= son) return 0;
  const sonGun = yerelTarih(son, tz);
  let kalan = 0;
  let an = simdi.getTime();
  for (let i = 0; i < 400; i++) {
    an += GUN_MS;
    const gun = yerelTarih(new Date(an), tz);
    if (gun > sonGun) break;
    if (isGunuMu(gun, ayar)) kalan++;
  }
  return kalan;
}

// ---------- Birleştirme ----------

export interface DersSistemAlanlari {
  kod: string;
  ad: string;
  akts: number;
  teorik: number;
  uygulama: number;
  laboratuvar: number;
}

/** Metin alanına uygulanabilen yapılandırılmış PÜKÖ önlemi. */
export const DUZELTILEBILIR_ALANLAR = ["amac", "icerik", "yontem", "notlar"] as const;
export type DuzeltilebilirAlan = (typeof DUZELTILEBILIR_ALANLAR)[number];

export interface DevirOnlemi {
  eylemId: string;
  tanim: string;
  asama: string;
  /** Önlem bir metin alanını değiştiriyorsa (önlemi kapatan insan kararıyla yazılmış). */
  bolognaDuzeltmesi?: { alan: DuzeltilebilirAlan; dil: "tr" | "en"; metin: string } | undefined;
}

export interface DevirFarki {
  alan: string;
  onceki: string;
  yeni: string;
  neden: string;
}

export interface DevirSonucu {
  taslak: BolognaTaslagi;
  fark: DevirFarki[];
  /** Taslağa uygulanan önlemler ve yalnız bilgi olarak listelenenler. */
  onlemler: { eylemId: string; tanim: string; uygulandi: boolean }[];
  /** Düşük riski bozan nedenler; boşsa düşük risk (süre dolumuyla onay alabilir). */
  riskNedenleri: string[];
  risk: "dusuk" | "orta";
  denetim: { hata: number; uyari: number };
}

const kisa = (v: unknown) => {
  const m = typeof v === "string" ? v : kanonikJson(v ?? null);
  return m.length > 160 ? `${m.slice(0, 157)}...` : m;
};

/**
 * Geçen dönemin onaylı taslağından yeni dönem taslağı. Sistem alanları (kod, ad, AKTS, T+U+L) ders kaydından,
 * program çıktısı kodları son okumadan gelir. Akademik karar gerektiren değişiklik (AKTS, T+U+L, program
 * çıktıları) ya da denetim hatası varsa risk ortadır: süre dolumuyla onaylanmaz, kararı öğretim elemanı verir.
 */
export function devirTaslagiKur(
  onceki: BolognaTaslagi,
  girdi: { ders: DersSistemAlanlari; programCiktilari: readonly string[] | null; onlemler: readonly DevirOnlemi[] },
): DevirSonucu {
  const t: BolognaTaslagi = structuredClone(onceki);
  const fark: DevirFarki[] = [];
  const riskNedenleri: string[] = [];
  const degistir = <K extends keyof BolognaTaslagi>(alan: K, yeni: BolognaTaslagi[K], neden: string) => {
    if (kanonikJson(t[alan] ?? null) === kanonikJson(yeni ?? null)) return false;
    fark.push({ alan: String(alan), onceki: kisa(t[alan]), yeni: kisa(yeni), neden });
    t[alan] = yeni;
    return true;
  };
  const d = girdi.ders;
  degistir("kod", d.kod, "Ders kaydı");
  degistir("ad", d.ad, "Ders kaydı");
  if (degistir("akts", d.akts, "Ders kaydı"))
    riskNedenleri.push("AKTS değişti: iş yükü ve müfredat kararı öğretim elemanının onayını ister.");
  if (degistir("tul", `${d.teorik}+${d.uygulama}+${d.laboratuvar}`, "Ders kaydı"))
    riskNedenleri.push("Teorik/uygulama/laboratuvar saatleri değişti: öğretim elemanı onaylamalı.");
  if (
    girdi.programCiktilari?.length &&
    degistir("programCiktilari", [...girdi.programCiktilari], "Son Bologna okuması")
  )
    riskNedenleri.push("Program çıktıları değişti: katkı matrisini öğretim elemanı gözden geçirmeli.");
  const onlemler: DevirSonucu["onlemler"] = [];
  for (const o of girdi.onlemler) {
    const dz = o.bolognaDuzeltmesi;
    if (!dz?.metin.trim()) {
      onlemler.push({ eylemId: o.eylemId, tanim: o.tanim, uygulandi: false });
      continue;
    }
    const yeni = { ...t[dz.alan], [dz.dil]: dz.metin.trim() };
    const oldu = degistir(dz.alan, yeni, `PÜKÖ önlemi: ${o.tanim}`);
    onlemler.push({ eylemId: o.eylemId, tanim: o.tanim, uygulandi: oldu });
  }
  const den = tamDenetim(t);
  if (den.hata > 0) riskNedenleri.push(`Taslakta ${den.hata} denetim hatası var: öğretim elemanı düzeltmeli.`);
  return {
    taslak: t,
    fark,
    onlemler,
    riskNedenleri,
    risk: riskNedenleri.length ? "orta" : "dusuk",
    denetim: { hata: den.hata, uyari: den.uyari },
  };
}

/** Bildirimde ve onay kutusunda gösterilen kısa fark özeti. */
export function farkOzetiMetni(
  s: Pick<DevirSonucu, "fark" | "onlemler" | "riskNedenleri">,
  bulgular: readonly Pick<Bulgu, "aciklama">[],
  sure: { son: Date | null; saatDilimi?: string },
): string {
  const satir: string[] = [];
  satir.push(
    s.fark.length
      ? `Geçen dönemden ${s.fark.length} alan değişti: ${s.fark.map((f) => f.alan).join(", ")}.`
      : "Geçen dönemin onaylı paketi değişmeden devredildi.",
  );
  const uygulanan = s.onlemler.filter((o) => o.uygulandi);
  if (uygulanan.length) satir.push(`Uygulanan önlemler: ${uygulanan.map((o) => o.tanim).join("; ")}.`);
  const bilgi = s.onlemler.filter((o) => !o.uygulandi);
  if (bilgi.length) satir.push(`Bilginize, kapanan önlemler: ${bilgi.map((o) => o.tanim).join("; ")}.`);
  if (bulgular.length) satir.push(`Kaynakta ${bulgular.length} eksik var; onaylanan paket yazılınca giderilir.`);
  if (s.riskNedenleri.length) satir.push(`Kararınız gerekiyor: ${s.riskNedenleri.join(" ")}`);
  else if (sure.son)
    satir.push(
      `İtiraz etmezseniz ${sure.son.toLocaleDateString("tr-TR", { timeZone: sure.saatDilimi ?? VARSAYILAN_SAAT_DILIMI })} tarihinde kurum yönergesine göre onaylanmış sayılır.`,
    );
  else satir.push("Kurumda bu iş için süreli onay yönergesi yok; taslağı siz onaylamalısınız.");
  return satir.join(" ");
}
