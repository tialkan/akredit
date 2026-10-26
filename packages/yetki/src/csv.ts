// Toplu kullanıcı içe aktarma (CSV). Başlık satırı zorunlu:
// `ad_soyad,eposta,rol,kapsam_turu,kapsam_kodu[,unvan][,bitis]`. Ayraç virgül ya da noktalı virgül.
// Kurum kapsamında `kapsam_kodu` boş bırakılır. Satırlar zod ile doğrulanır; hatalar satır numarasıyla döner.

import { z } from "zod";
import { KAPSAM_TURLERI, ROLLER, SURELI_ROLLER } from "./matris.ts";

/** Tırnaklı alanları destekleyen küçük CSV ayrıştırıcı (RFC 4180). */
export function csvAyristir(metin: string, ayrac?: "," | ";"): string[][] {
  const temiz = metin.replace(/^﻿/u, "");
  const ilkSatir = temiz.split(/\r?\n/u, 1)[0] ?? "";
  const a = ayrac ?? (ilkSatir.split(";").length > ilkSatir.split(",").length ? ";" : ",");
  const satirlar: string[][] = [];
  let satir: string[] = [];
  let alan = "";
  let tirnak = false;
  for (let i = 0; i < temiz.length; i++) {
    const c = temiz[i];
    if (tirnak) {
      if (c === '"') {
        if (temiz[i + 1] === '"') {
          alan += '"';
          i++;
        } else tirnak = false;
      } else alan += c;
    } else if (c === '"') tirnak = true;
    else if (c === a) {
      satir.push(alan);
      alan = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && temiz[i + 1] === "\n") i++;
      satir.push(alan);
      satirlar.push(satir);
      satir = [];
      alan = "";
    } else alan += c;
  }
  if (alan !== "" || satir.length > 0) {
    satir.push(alan);
    satirlar.push(satir);
  }
  return satirlar.filter((s) => s.some((x) => x.trim() !== ""));
}

const tarih = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/u, "Tarih YYYY-AA-GG biçiminde olmalı.")
  .transform((s) => new Date(`${s}T00:00:00Z`))
  .refine((d) => !Number.isNaN(d.getTime()), "Tarih geçersiz.");

export const IceAktarmaSatiri = z
  .object({
    ad_soyad: z.string().trim().min(3, "Ad soyad en az 3 harf olmalı.").max(200),
    eposta: z.string().trim().toLowerCase().pipe(z.email("E-posta adresi geçersiz.")),
    rol: z.enum(ROLLER, "Rol tanınmadı."),
    kapsam_turu: z.enum(KAPSAM_TURLERI, "Kapsam türü kurum, birim, program ya da ders olmalı."),
    kapsam_kodu: z.string().trim().default(""),
    unvan: z
      .string()
      .trim()
      .optional()
      .transform((x) => (x ? x : undefined)),
    bitis: z
      .string()
      .trim()
      .optional()
      .transform((x) => (x ? x : undefined))
      .pipe(tarih.optional()),
  })
  .refine((s) => s.kapsam_turu === "kurum" || s.kapsam_kodu !== "", {
    message: "Birim, program ya da ders için kapsam kodu yazılmalı.",
    path: ["kapsam_kodu"],
  })
  .refine((s) => !SURELI_ROLLER.has(s.rol) || s.bitis !== undefined, {
    message: "Değerlendirici için bitiş tarihi zorunludur.",
    path: ["bitis"],
  });
export type IceAktarmaSatiri = z.infer<typeof IceAktarmaSatiri>;

export interface IceAktarmaHatasi {
  /** 1'den başlayan dosya satırı (başlık 1. satır). */
  satir: number;
  ileti: string;
}

export interface IceAktarmaSonucu {
  satirlar: { satir: number; veri: IceAktarmaSatiri }[];
  hatalar: IceAktarmaHatasi[];
}

const ZORUNLU = ["ad_soyad", "eposta", "rol", "kapsam_turu", "kapsam_kodu"] as const;
/** Bir dosyada en çok kaç kullanıcı içe aktarılır. */
export const ICE_AKTARMA_AZAMI = 2000;

/** CSV metnini doğrular. Aynı e-posta + rol + kapsam iki kez yazılmışsa ikinci satır hata sayılır. */
export function kullaniciCsvDogrula(metin: string): IceAktarmaSonucu {
  const tablo = csvAyristir(metin);
  const baslik = (tablo[0] ?? []).map((x) => x.trim().toLowerCase());
  const eksik = ZORUNLU.filter((b) => !baslik.includes(b));
  if (eksik.length > 0)
    return { satirlar: [], hatalar: [{ satir: 1, ileti: `Başlıkta eksik sütun: ${eksik.join(", ")}.` }] };
  if (tablo.length - 1 > ICE_AKTARMA_AZAMI)
    return { satirlar: [], hatalar: [{ satir: 1, ileti: `Bir dosyada en çok ${ICE_AKTARMA_AZAMI} kişi olabilir.` }] };
  const sonuc: IceAktarmaSonucu = { satirlar: [], hatalar: [] };
  const gorulen = new Set<string>();
  tablo.slice(1).forEach((hucreler, i) => {
    const satir = i + 2;
    const nesne: Record<string, string> = {};
    baslik.forEach((b, j) => {
      nesne[b] = hucreler[j] ?? "";
    });
    const p = IceAktarmaSatiri.safeParse(nesne);
    if (!p.success) {
      sonuc.hatalar.push({ satir, ileti: p.error.issues.map((x) => x.message).join(" ") });
      return;
    }
    const anahtar = `${p.data.eposta}|${p.data.rol}|${p.data.kapsam_turu}|${p.data.kapsam_kodu}`;
    if (gorulen.has(anahtar)) {
      sonuc.hatalar.push({ satir, ileti: "Bu satır dosyada daha önce yazılmış." });
      return;
    }
    gorulen.add(anahtar);
    sonuc.satirlar.push({ satir, veri: p.data });
  });
  return sonuc;
}
