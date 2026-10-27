// Anket raporu ve kanıt dosyası. Bütün sayılar `anketSonucu`ndan gelir. Açık uçlu özet maddeleri yanıt
// kimliklerine atıflıdır; maddenin destek sayısı atıflardan sayılır. Kanıt, içerik özetiyle (SHA-256) döner.

import { ozetHesapla } from "@akredit/cekirdek";
import type { AnketSonucu } from "./istatistik.ts";
import type { AcikOzet } from "./ozet.ts";
import { kisaKimlik } from "./sema.ts";

const sayi = (x: number, b = 2) => x.toLocaleString("tr-TR", { maximumFractionDigits: b, minimumFractionDigits: 0 });
const yuzde = (x: number) => `%${sayi(x * 100, 1)}`;

export interface AnketRaporu {
  dosyaAdi: string;
  icerik: Uint8Array;
  ozet: string;
  metin: string;
}

export function anketRaporuMetni(baslik: string, sonuc: AnketSonucu, ozetler: readonly AcikOzet[] = []): string {
  const s: string[] = [`# ${baslik}`, ""];
  s.push(`Yanıt sayısı: ${sonuc.yanitSayisi}`);
  if (sonuc.yanitOrani !== null) s.push(`Yanıt oranı: ${yuzde(sonuc.yanitOrani)}`);
  s.push(`Dağılımlar en az ${sonuc.esik} yanıtta gösterilir.`, "");
  for (const r of sonuc.sorular) {
    s.push(`## ${r.metin}`, "", `Yanıtlayan: ${r.n}`);
    if (r.tur === "acik") {
      const o = ozetler.find((x) => x.soru === r.metin);
      if (o?.maddeler.length) {
        s.push("", "Yanıtlardan çıkan başlıca görüşler (yapay zekâ özeti, onay bekler):");
        for (const m of o.maddeler)
          s.push(`- ${m.metin} (${m.destek} yanıt) ${m.yanitIdleri.map((i) => `[Y:${kisaKimlik(i)}]`).join(" ")}`);
      }
      s.push("");
      continue;
    }
    if (r.gizli) {
      s.push("", "[EKSİK: Yanıt sayısı eşiğin altında; sonuç gösterilmez.]", "");
      continue;
    }
    if (r.ozet)
      s.push(
        `Ortalama ${sayi(r.ozet.ortalama)}, ortanca ${sayi(r.ozet.ortanca)}` +
          (r.ozet.standartSapma === null ? "" : `, standart sapma ${sayi(r.ozet.standartSapma)}`) +
          `, en az ${sayi(r.ozet.enAz)}, en çok ${sayi(r.ozet.enCok)}`,
      );
    if (r.dagilim) {
      s.push("", "| Seçenek | Sayı | Oran |", "|---|---|---|");
      for (const d of r.dagilim) s.push(`| ${d.secenek} | ${d.sayi} | ${yuzde(d.oran)} |`);
    }
    s.push("");
  }
  return `${s.join("\n").trimEnd()}\n`;
}

/** Rapor metnini kanıt dosyasına çevirir (Markdown, UTF-8). */
export function anketRaporu(baslik: string, sonuc: AnketSonucu, ozetler: readonly AcikOzet[] = []): AnketRaporu {
  const metin = anketRaporuMetni(baslik, sonuc, ozetler);
  const icerik = new TextEncoder().encode(metin);
  const ad = baslik
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[̀-ͯ]/gu, "")
    .replace(/ı/gu, "i")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-|-$/gu, "");
  return { dosyaAdi: `${ad || "anket"}-raporu.md`, icerik, ozet: ozetHesapla(icerik), metin };
}
