// ÖDR kurucu (saf): çerçevenin rapor şablonundan, onaylı kanıt bağlarından, program düzeyi ölçme hesabından
// ve süreç kayıtlarından (eylemler) bölüm taslaklarını kurar. Bütün olgusal cümleler kalıptan, kayıtlardaki
// değerlerle yazılır ve denetimden geçer; denetimi geçmeyen cümle rapora girmez, yerine [EKSİK] yazılır.

import { atifYaz } from "@akredit/cekirdek";
import { type Cerceve, DOGRULANMADI, dogrulamaRozeti, type Olcut, tumOlcutler } from "@akredit/cerceveler";
import { cumleDenetle, cumlelereBol, type DenetimKaynaklari } from "./denetim.ts";

export interface OnayliKanit {
  kanitId: string;
  ozet: string;
  dosyaAdi: string;
  /** Kararla onaylanmış ölçüt kodları. */
  olcutKodlari: string[];
  /** Onay kararının zamanı (ISO) ve onaylayanın adı. */
  onayZamani: string;
  onaylayan: string;
}

/** Deterministik hesap kaynağı (ör. program PÇ sağlanması). `degerler` biçimlenmiş metinlerdir. */
export interface HesapKaynagi {
  kimlik: string;
  ad: string;
  /** Hesabın girdileri (ölçme sonucu kimliği + girdi özeti) ve hesap sürümü. */
  dayanak: string;
  /** Ölçüt kodu → bu ölçüt için yazılacak satırlar: [etiket, biçimli değer, açıklama]. */
  satirlar: { etiket: string; deger: string; aciklama: string }[];
  /** Hesabın hangi ölçütlere girdi olduğu (kanıt gereksinimi `uretenSurec: "olcme"`). */
  olcutKodlari: string[];
}

export interface SurecKaydi {
  tanim: string;
  pukoAsamasi: string;
  olcutKodlari: string[];
  kanitOzetleri: string[];
}

export interface EkMetin {
  olcutKod: string;
  metin: string;
  kaynak: "yz" | "kisi";
}

export interface OdrGirdisi {
  cerceve: Cerceve;
  programAd: string;
  kanitlar: OnayliKanit[];
  hesaplar: HesapKaynagi[];
  surecKayitlari: SurecKaydi[];
  ekMetinler?: EkMetin[];
}

export interface OdrParagraf {
  metin: string;
  eksik: boolean;
  kanitOzetleri: string[];
  hesapKimlikleri: string[];
}

export interface OdrOlcutu {
  kod: string;
  baslik: string;
  metin: string;
  metinDurumu: Olcut["metinDurumu"];
  kanitSayisi: number;
  paragraflar: OdrParagraf[];
  /** Kapsama durumu: onaylı kanıt var mı. */
  kapsandi: boolean;
}

export interface OdrBolumu {
  sira: number;
  kod: string;
  baslik: string;
  olcutler: OdrOlcutu[];
}

export interface OdrEksigi {
  olcutKod: string;
  baslik: string;
  neden: string;
  gereksinimler: string[];
}

export interface OdrTaslagi {
  cerceve: { kod: string; ad: string; surum: string; rozet: string; kaynak: string | null; resmi: boolean };
  /** "cerceve": şablon çerçeveden; "olcut_agaci": çerçevede şablon yok, ana ölçütler bölüm sayıldı. */
  sablonKaynagi: "cerceve" | "olcut_agaci";
  programAd: string;
  bolumler: OdrBolumu[];
  eksikler: OdrEksigi[];
  kanitlar: OnayliKanit[];
  hesaplar: HesapKaynagi[];
  /** Denetimde çıkarılan cümle sayısı (ek metinlerden). */
  cikarilanCumle: number;
}

const tarihYaz = (iso: string) => {
  const [y, a, g] = iso.slice(0, 10).split("-");
  return `${g}.${a}.${y}`;
};

function kaynaklar(g: OdrGirdisi): DenetimKaynaklari {
  return {
    kanitlar: new Map(g.kanitlar.map((k) => [k.ozet, [k.dosyaAdi, tarihYaz(k.onayZamani)]])),
    hesaplar: new Map(g.hesaplar.map((h) => [h.kimlik, h.satirlar.flatMap((s) => [s.etiket, s.deger, s.aciklama])])),
  };
}

/** Bir ölçütün kendisi ve alt ölçütleri. */
function altAgac(o: Olcut): Olcut[] {
  return tumOlcutler([o]);
}

export function odrKur(g: OdrGirdisi): OdrTaslagi {
  const c = g.cerceve;
  const hepsi = tumOlcutler(c.olcutler);
  const kodla = new Map(hepsi.map((o) => [o.kod, o]));
  const sablonKaynagi = c.raporSablonu.length ? "cerceve" : "olcut_agaci";
  const sablon = c.raporSablonu.length
    ? c.raporSablonu
    : c.olcutler.map((o) => ({ kod: o.kod, baslik: o.baslik, olcutKodlari: [o.kod] }));
  const k = kaynaklar(g);
  const eksikler: OdrEksigi[] = [];
  let cikarilanCumle = 0;

  const paragraf = (metin: string): OdrParagraf => {
    const d = cumleDenetle(metin, k);
    if (!d.gecerli) {
      cikarilanCumle++;
      return {
        metin: "[EKSİK: Doğrulanamayan bir kayıt rapora alınmadı.]",
        eksik: true,
        kanitOzetleri: [],
        hesapKimlikleri: [],
      };
    }
    return { metin, eksik: d.eksik, kanitOzetleri: d.kanitOzetleri, hesapKimlikleri: d.hesapKimlikleri };
  };

  const olcutYaz = (o: Olcut): OdrOlcutu => {
    const kanitlar = g.kanitlar.filter((x) => x.olcutKodlari.includes(o.kod));
    const p: OdrParagraf[] = [];
    for (const x of kanitlar)
      p.push(
        paragraf(
          `“${x.dosyaAdi}” bu ölçütün kanıtı olarak ${tarihYaz(x.onayZamani)} tarihinde onaylandı ${atifYaz(x.ozet)}.`,
        ),
      );
    for (const h of g.hesaplar.filter((x) => x.olcutKodlari.includes(o.kod)))
      for (const s of h.satirlar)
        p.push(paragraf(`${s.etiket}: ${s.deger} (${s.aciklama}) [H:${h.kimlik.slice(0, 8)}].`));
    for (const s of g.surecKayitlari.filter((x) => x.olcutKodlari.includes(o.kod))) {
      const onayli = s.kanitOzetleri.filter((oz) => k.kanitlar.has(oz));
      p.push(
        onayli.length
          ? paragraf(`Süreç kaydı (${s.pukoAsamasi}): ${s.tanim} ${onayli.map((oz) => atifYaz(oz)).join(" ")}.`)
          : paragraf(`[EKSİK: Bir süreç kaydının (${s.pukoAsamasi}) onaylı kanıtı yok.]`),
      );
    }
    for (const e of (g.ekMetinler ?? []).filter((x) => x.olcutKod === o.kod))
      for (const cumle of cumlelereBol(e.metin)) {
        const d = cumleDenetle(cumle, k);
        if (d.gecerli && !d.eksik)
          p.push({ metin: cumle, eksik: false, kanitOzetleri: d.kanitOzetleri, hesapKimlikleri: d.hesapKimlikleri });
        else cikarilanCumle++;
      }
    const altlarda = altAgac(o)
      .slice(1)
      .some((a) => g.kanitlar.some((x) => x.olcutKodlari.includes(a.kod)));
    const kapsandi = kanitlar.length > 0;
    if (!kapsandi && o.altOlcutler.length === 0) {
      const gereksinimler = o.kanitGereksinimleri.map((x) => x.aciklama);
      const ek = gereksinimler.length ? ` Beklenen: ${gereksinimler.join("; ")}.` : "";
      p.push(paragraf(`[EKSİK: Bu ölçüt için onaylı kanıt yok.${ek}]`));
      eksikler.push({ olcutKod: o.kod, baslik: o.baslik, neden: "Onaylı kanıt yok", gereksinimler });
    } else if (!kapsandi && !altlarda) {
      eksikler.push({
        olcutKod: o.kod,
        baslik: o.baslik,
        neden: "Alt ölçütlerin hiçbirinde onaylı kanıt yok",
        gereksinimler: [],
      });
    }
    return {
      kod: o.kod,
      baslik: o.baslik,
      metin: o.metin,
      metinDurumu: o.metinDurumu,
      kanitSayisi: kanitlar.length,
      paragraflar: p,
      kapsandi,
    };
  };

  const bolumler: OdrBolumu[] = sablon.map((s, i) => {
    const kodlar: Olcut[] = [];
    for (const kod of s.olcutKodlari) {
      const o = kodla.get(kod);
      if (o) for (const a of altAgac(o)) if (!kodlar.includes(a)) kodlar.push(a);
    }
    return { sira: i + 1, kod: s.kod, baslik: s.baslik, olcutler: kodlar.map(olcutYaz) };
  });
  if (hepsi.length === 0)
    eksikler.push({
      olcutKod: "—",
      baslik: c.ad,
      neden: `Çerçevenin ölçütleri resmî belgeden alınamadı (${DOGRULANMADI})`,
      gereksinimler: [],
    });

  const kullanilan = new Set(
    bolumler.flatMap((b) => b.olcutler.flatMap((o) => o.paragraflar.flatMap((p) => p.kanitOzetleri))),
  );
  return {
    cerceve: {
      kod: c.kod,
      ad: c.ad,
      surum: c.surum,
      rozet: dogrulamaRozeti(c).metin,
      kaynak: c.kaynak?.adres ?? null,
      resmi: c.resmi,
    },
    sablonKaynagi,
    programAd: g.programAd,
    bolumler,
    eksikler,
    kanitlar: g.kanitlar.filter((x) => kullanilan.has(x.ozet)),
    hesaplar: g.hesaplar,
    cikarilanCumle,
  };
}

/** Bölümün atıflı Markdown metni (rapor bölümü sürümü olarak saklanır). */
export function bolumMetni(b: OdrBolumu): string {
  return b.olcutler
    .map((o) => [`### ${o.kod} ${o.baslik}`, ...o.paragraflar.map((p) => p.metin)].join("\n\n"))
    .join("\n\n");
}
