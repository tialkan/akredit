// Yerel disk sürücüsü (geliştirme ve kurum içi küçük kurulum). Dosya `wx` bayrağıyla açılır, böylece var olan
// dosyanın üzerine yazılamaz; yazıldıktan sonra salt okunur yapılır. Ara dosya + yeniden adlandırma ile
// yarım yazılmış dosya asıl anahtarda görünmez.

import { randomBytes } from "node:crypto";
import { chmod, link, mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { ozetHesapla } from "@akredit/cekirdek";
import {
  anahtarCoz,
  butunlukDenetle,
  DepoHatasi,
  imzaliBaglantiUret,
  type NesneDeposu,
  nesneAnahtari,
  simdiSn,
  sureDenetle,
} from "./depo.ts";

export interface YerelDepoAyari {
  kok: string;
  /** İmzalı bağlantı gizli anahtarı (en az 32 karakter). */
  imzaGizlisi: string;
  /** Bağlantı ön eki, ör. "/indir". */
  baglantiOnEki?: string;
}

export function yerelDepo(ayar: YerelDepoAyari): NesneDeposu {
  if (ayar.imzaGizlisi.length < 32) throw new DepoHatasi("İmza gizlisi en az 32 karakter olmalı.");
  const yol = (anahtar: string) => {
    const { kurumId, ozet } = anahtarCoz(anahtar);
    return { dizin: join(ayar.kok, kurumId, ozet.slice(0, 2)), dosya: join(ayar.kok, kurumId, ozet.slice(0, 2), ozet) };
  };
  const varMi = async (anahtar: string) => {
    try {
      await stat(yol(anahtar).dosya);
      return true;
    } catch {
      return false;
    }
  };
  return {
    ad: "yerel",
    kilitli: false,
    varMi,
    async koy(kurumId, veri) {
      const ozet = ozetHesapla(veri);
      const anahtar = nesneAnahtari(kurumId, ozet);
      const { dizin, dosya } = yol(anahtar);
      const sonuc = { anahtar, ozet, boyut: veri.byteLength };
      if (await varMi(anahtar)) {
        butunlukDenetle(anahtar, new Uint8Array(await readFile(dosya)));
        return { ...sonuc, yeni: false };
      }
      await mkdir(dizin, { recursive: true });
      const gecici = `${dosya}.${randomBytes(6).toString("hex")}.yaziliyor`;
      await writeFile(gecici, veri, { flag: "wx", mode: 0o444 });
      try {
        // link() hedef varsa başarısız olur: eşzamanlı iki yazıcıdan yalnız biri kazanır, üzerine yazılmaz.
        await link(gecici, dosya);
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
        butunlukDenetle(anahtar, new Uint8Array(await readFile(dosya)));
        return { ...sonuc, yeni: false };
      } finally {
        await unlink(gecici).catch(() => undefined);
      }
      await chmod(dosya, 0o444);
      return { ...sonuc, yeni: true };
    },
    async al(anahtar) {
      let veri: Uint8Array;
      try {
        veri = new Uint8Array(await readFile(yol(anahtar).dosya));
      } catch {
        throw new DepoHatasi("Dosya bulunamadı.");
      }
      butunlukDenetle(anahtar, veri);
      return veri;
    },
    async baglanti(anahtar, sureSn, simdi = simdiSn()) {
      sureDenetle(sureSn);
      return imzaliBaglantiUret(ayar.baglantiOnEki ?? "/indir", anahtar, simdi + sureSn, ayar.imzaGizlisi);
    },
  };
}

/** Testler ve tek süreçli geliştirme için bellek içi depo. */
export function bellekDepo(imzaGizlisi = "bellek-depo-icin-uydurma-gizli-anahtar-0000"): NesneDeposu & {
  readonly nesneler: Map<string, Uint8Array>;
} {
  const nesneler = new Map<string, Uint8Array>();
  return {
    ad: "bellek",
    kilitli: false,
    nesneler,
    async varMi(anahtar) {
      return nesneler.has(anahtar);
    },
    async koy(kurumId, veri) {
      const ozet = ozetHesapla(veri);
      const anahtar = nesneAnahtari(kurumId, ozet);
      const yeni = !nesneler.has(anahtar);
      if (yeni) nesneler.set(anahtar, veri.slice());
      return { anahtar, ozet, boyut: veri.byteLength, yeni };
    },
    async al(anahtar) {
      const v = nesneler.get(anahtar);
      if (!v) throw new DepoHatasi("Dosya bulunamadı.");
      butunlukDenetle(anahtar, v);
      return v.slice();
    },
    async baglanti(anahtar, sureSn, simdi = simdiSn()) {
      sureDenetle(sureSn);
      return imzaliBaglantiUret("/indir", anahtar, simdi + sureSn, imzaGizlisi);
    },
  };
}
