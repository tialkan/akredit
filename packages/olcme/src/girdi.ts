// Ölçme girdisinin tutarlılık denetimi (kurucu kararı 12.11.2026, review.md madde 2). dersiOlc bozuk girdiyi
// sessizce hesaplıyordu: tam puanı aşan puan %100'ün üstünde başarı, yinelenen satırda sonuncunun kazanması,
// bilinmeyen araç/soruya yazılan puanın atılıp öğrencinin 0 sayılması, aynı ÇK'nın PÇ'ye iki kez girmesi.
// Bu işlev hesaptan önce çağrılır; sorun varsa hesap yapılmaz, hocaya ne olduğunu ve ne yapılacağını söyler.
// Saf: IO yok. dersiOlc'nin kendisi değişmez (HESAP_SURUMU aynı kalır).

import type { DersOlcmeVerisi } from "@akredit/cekirdek";

const EN_COK = 10;

/** Hesabı bozacak girdi sorunları; boş dizi ise girdi tutarlıdır. İletiler Türkçe ve kullanıcıya gösterilebilir. */
export function olcmeGirdiSorunlari(v: DersOlcmeVerisi): string[] {
  const sorunlar: string[] = [];
  const ekle = (s: string) => sorunlar.push(s);

  const ckSay = new Map<string, number>();
  for (const c of v.ciktilar) ckSay.set(c.kod, (ckSay.get(c.kod) ?? 0) + 1);
  for (const [kod, n] of ckSay) if (n > 1) ekle(`Ders çıktısı ${kod} ${n} kez yazılmış. Her çıktıyı bir kez yazın.`);

  const araclar = new Map<string, Map<string, number>>();
  for (const a of v.araclar) {
    if (araclar.has(a.id)) ekle(`Ölçme aracı ${a.id} birden çok kez yazılmış. Her aracı bir kez yazın.`);
    const sorular = new Map<string, number>();
    for (const q of a.sorular) {
      if (sorular.has(q.no)) ekle(`${a.id} içinde ${q.no}. soru birden çok kez yazılmış.`);
      sorular.set(q.no, q.tamPuan);
      for (const e of q.eslemeler)
        if (!ckSay.has(e.ciktiKod))
          ekle(
            `${a.id} ${q.no}. soru, listede olmayan ${e.ciktiKod} çıktısına eşlenmiş. Çıktıyı ekleyin ya da eşlemeyi düzeltin.`,
          );
    }
    araclar.set(a.id, sorular);
  }

  const gorulen = new Set<string>();
  for (const p of v.puanlar) {
    const sorular = araclar.get(p.aracId);
    if (!sorular) {
      ekle(`${p.ogrenci} için tanımsız ${p.aracId} aracına puan yazılmış. Aracı ekleyin ya da satırı silin.`);
      continue;
    }
    const tam = sorular.get(p.soruNo);
    // Sorusuz araçta (toplam puan) soru numarası denetlenmez.
    if (sorular.size > 0 && tam === undefined) {
      ekle(`${p.ogrenci} için ${p.aracId} aracında olmayan ${p.soruNo}. soruya puan yazılmış.`);
      continue;
    }
    const anahtar = `${p.ogrenci}\u0000${p.aracId}\u0000${p.soruNo}`;
    if (gorulen.has(anahtar)) ekle(`${p.ogrenci} için ${p.aracId} ${p.soruNo}. soru puanı birden çok kez yazılmış.`);
    gorulen.add(anahtar);
    if (p.puan !== null && tam !== undefined && p.puan > tam)
      ekle(`${p.ogrenci} için ${p.aracId} ${p.soruNo}. soru puanı (${p.puan}) tam puanı (${tam}) aşıyor.`);
  }

  return sorunlar.length > EN_COK
    ? [...sorunlar.slice(0, EN_COK), `ve ${sorunlar.length - EN_COK} sorun daha.`]
    : sorunlar;
}
