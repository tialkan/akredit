// Üç katmanlı karar modeli (İP-39, ADR-0004). Saf ve deterministik: aynı girdi her zaman aynı katmanı verir.
//
// Katman 0: tam otomatik. Kaynak sistemde zaten onaylı birincil veri ve eşiği geçen ölçüm onaya düşmez;
//           kanıt olarak mühürlenir, günlüğe "otomatik, dayanak: kaynak sistem" diye girer.
// Katman 1: süreli varsayılan onay (İP-38 ile ortak). İmzalı politika, düşük/orta risk, fark özeti ve süre.
// Katman 2: zorunlu karar. Devredilemez; politika ve toplu onay yoktur.

import { etkinRisk } from "../oneri.ts";
import type { Oneri, OneriTuru } from "../turler.ts";

export type KararKatmani = 0 | 1 | 2;

/** Birincil verinin geldiği resmî sistem. */
export type KaynakSistem = "obs" | "avesis" | "yoksis" | "ebys" | "bologna" | "diger";

export type KatmanGirdisi =
  | {
      tur: "birincil_veri";
      kaynakSistem: KaynakSistem;
      /** Kaynak sistemde onaylı mı (ör. OBS'de ilan edilmiş not, AVESİS'te onaylı yayın)? */
      kaynaktaOnayli: boolean;
    }
  | {
      tur: "olcum";
      /** "ck" ders çıktısı, "pc" program çıktısı. */
      olcumTuru: "ck" | "pc";
      /** Hesaplanan değer (0-100); hesaplanamadıysa null. */
      deger: number | null;
      esik: number;
    }
  | {
      tur: "oneri";
      oneri: Pick<Oneri, "tur" | "risk">;
      /** Uygulanabilir, imzalı bir yetki politikası var mı (`politikaUygulanirMi` sonucu)? */
      politikaUygulanir: boolean;
      /** Öneri müfredat, AKTS, ÇK ya da değerlendirme ağırlığını değiştiriyor mu? */
      mufredatDegisikligi?: boolean;
      /** Nihai rapor (KİDR/ÖDR/BİDR'in son hâli) mi? */
      nihaiRapor?: boolean;
      /** Önceki sürümden fark özeti var mı (süreli onay fark özetini göndermeden işlemez)? */
      farkOzetiVar?: boolean;
      /** Eşik altı bir sonuca karşı önlem önerisi mi? */
      esikAltiOnlem?: boolean;
    };

export interface KatmanSonucu {
  katman: KararKatmani;
  /** Kuralın kısa adı; günlükte ve arayüzde görünür, testlerde sabitlenir. */
  kural: string;
  /** Kullanıcıya görünen gerekçe. */
  gerekce: string;
  /** Kişiden başkasına (politikaya, süreye) bırakılamaz. */
  devredilemez: boolean;
}

/** Her zaman kişi kararı isteyen öneri türleri. */
const ZORUNLU_TURLER: ReadonlySet<OneriTuru> = new Set(["olgunluk_duzeyi", "dis_gonderim", "yazma_plani"]);

const sonuc = (katman: KararKatmani, kural: string, gerekce: string): KatmanSonucu => ({
  katman,
  kural,
  gerekce,
  devredilemez: katman === 2,
});

/**
 * Katmanı belirler. Kurallar sırayla denenir; ilk tutan kazanır. Belirsiz durum hiçbir zaman daha
 * aşağı (daha otomatik) katmana düşmez: ölçülemeyen sonuç ve kaynakta onaysız veri kişiye gider.
 */
export function katmanBelirle(g: KatmanGirdisi): KatmanSonucu {
  if (g.tur === "birincil_veri") {
    if (g.kaynaktaOnayli)
      return sonuc(
        0,
        "K0-kaynakta-onayli",
        "Veri resmî kaynak sistemde zaten onaylı. Onaya düşmez; kanıt olarak kaydedilir. Dayanak: kaynak sistem.",
      );
    return sonuc(1, "K1-kaynakta-onaysiz", "Veri kaynak sistemde henüz onaylı değil. Sorumlunun onayı gerekir.");
  }
  if (g.tur === "olcum") {
    if (g.deger === null || !Number.isFinite(g.deger))
      return sonuc(2, "K2-olculemedi", "Sonuç hesaplanamadı. Ne yapılacağına bir kişi karar vermeli.");
    if (g.deger >= g.esik)
      return sonuc(0, "K0-esik-gecti", "Sonuç eşiğin üstünde. Onaya düşmez; kanıt olarak kaydedilir.");
    return sonuc(2, "K2-esik-alti", "Sonuç eşiğin altında. Önlem kararı kişiye aittir ve devredilemez.");
  }
  const tur = g.oneri.tur;
  if (ZORUNLU_TURLER.has(tur))
    return sonuc(2, "K2-yuksek-tur", "Kurum adına beyan, olgunluk düzeyi ya da dış gönderim. Kişi karar verir.");
  if (g.nihaiRapor) return sonuc(2, "K2-nihai-rapor", "Nihai rapor kurum adına beyandır. Kişi karar verir.");
  if (g.mufredatDegisikligi)
    return sonuc(2, "K2-mufredat", "Müfredat, AKTS ya da çıktı değişikliği. Kişi karar verir.");
  if (g.esikAltiOnlem) return sonuc(2, "K2-esik-alti-onlem", "Eşik altı sonuca karşı önlem. Kişi karar verir.");
  if (etkinRisk(g.oneri) === "yuksek") return sonuc(2, "K2-yuksek-risk", "Önerinin riski yüksek. Kişi karar verir.");
  if (!g.politikaUygulanir)
    return sonuc(1, "K1-politika-yok", "Bu öneriyi kapsayan imzalı bir politika yok. Sorumlu kişi onaylar.");
  if (!g.farkOzetiVar)
    return sonuc(1, "K1-fark-ozeti-yok", "Fark özeti yok; süre dolunca onaylanmış sayılamaz. Sorumlu kişi onaylar.");
  return sonuc(
    1,
    "K1-sureli-varsayilan",
    "Fark özeti gönderilir; süre içinde itiraz yoksa imzalı politikaya dayanarak onaylanmış sayılır.",
  );
}

/**
 * Süreli varsayılan onay kullanılabilir mi? Yalnız katman 1 ve yalnız `K1-sureli-varsayilan` kuralı.
 * Diğer katman 1 durumları sorumlunun açık onayını bekler.
 */
export function sureliOnayUygunMu(s: KatmanSonucu): boolean {
  return s.katman === 1 && s.kural === "K1-sureli-varsayilan";
}

/** Toplu onay yalnız katman 2 dışındaki önerilerde olur. */
export function topluOnayaUygunMu(s: KatmanSonucu): boolean {
  return !s.devredilemez;
}

/**
 * Katman 2 bir kararın kabul edilebilirliği: politika ya da süre dayanağı reddedilir, kararı veren
 * kişi ve kartta geçen süre bulunmalıdır.
 */
export function zorunluKararDenetle(
  s: KatmanSonucu,
  karar: { dayanak: "dogrudan" | "politika" | "sure"; kararVeren: string; toplu?: boolean },
): { gecerli: boolean; hatalar: string[] } {
  const hatalar: string[] = [];
  if (s.devredilemez) {
    if (karar.dayanak !== "dogrudan") hatalar.push("Bu karar devredilemez; politika ya da süre dolması ile verilemez.");
    if (karar.toplu) hatalar.push("Bu karar toplu verilemez; kartı tek tek inceleyin.");
  }
  if (!karar.kararVeren.trim()) hatalar.push("Kararı veren kişi yazılmalı.");
  return { gecerli: hatalar.length === 0, hatalar };
}
