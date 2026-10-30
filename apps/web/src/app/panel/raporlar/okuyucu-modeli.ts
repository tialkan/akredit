// Rapor okuyucusunun veri modeli (İP-44): paragrafları cümlelere ayırır, her cümlenin atfını kanıta çözer,
// kanıt panelinde vurgulanacak parçaları ve dil bulgularını cümleye bağlar. Saf: sayfa (panel ya da
// değerlendirici portalı) veriyi okur, bu işlev yalnız birleştirir.

import {
  type Capa,
  capaYaz,
  type DilBulgusu,
  eksikleriAyristir,
  raporCumleleri,
  vurgulanacaklar,
} from "@akredit/cekirdek";

export interface OkuyucuKaniti {
  id: string;
  baslik: string;
  dosyaAdi: string;
  ozet: string;
  parcalar: { id: string; sira: number; metin: string; capa: unknown }[];
  onay: { sonuc: string; kisi: string | null; zaman: string; dayanak: string } | null;
}

export interface CumleAtfi {
  kanitId: string;
  /** Okunur konum: "s. 3", "Sayfa1!B4". */
  konum: string;
  /** Vurgulanacak parçalar ve parça içi satırlar. */
  vurgu: { parcaId: string; satirlar: number[] }[];
}

export interface OkuyucuCumlesi {
  id: string;
  /** Atıf işaretleri ayıklanmış görünen metin. */
  metin: string;
  atiflar: CumleAtfi[];
  /** Hesap atfı ([H:…]): deterministik hesaba dayanır, kanıt paneli açılmaz. */
  hesapli: boolean;
  eksik: boolean;
  dilBulgulari: { kural: string; onem: string; aciklama: string }[];
}

export interface OkuyucuBolumu {
  id: string;
  baslik: string;
  olcut: string;
  paragraflar: OkuyucuCumlesi[][];
}

interface GirdiBolumu {
  id: string;
  baslik: string;
  olcut: string;
  /** Servisin çözdüğü paragraf atıfları (örnek veride metinde işaret yoktur, atıf burada gelir). */
  paragraflar: { metin: string; atiflar: { kanitId: string; capa?: Capa | undefined }[] }[];
}

/** Görünen metinden atıf, hesap ve EKSİK işaretlerini ayıklar. */
export function gorunenMetin(metin: string): string {
  return metin
    .replace(/\s*\[(?:K|H):[^\]]*\]/gu, "")
    .replace(/\[(?:EKS[İI]K|[Ee]ksik)(?::\s*([^\]]*))?\]/gu, (_m, a: string | undefined) =>
      a?.trim() ? `(Kanıt yok: ${a.trim()})` : "(Kanıt yok)",
    )
    .replace(/\s+([.,;:])/gu, "$1")
    .trim();
}

export function okuyucuModeli(
  bolumler: readonly GirdiBolumu[],
  kanitlar: readonly OkuyucuKaniti[],
  dil: readonly (Pick<DilBulgusu, "kural" | "onem" | "aciklama" | "paragraf" | "cumle"> & { bolumId: string })[] = [],
): OkuyucuBolumu[] {
  return bolumler.map((b) => ({
    id: b.id,
    baslik: b.baslik,
    olcut: b.olcut,
    paragraflar: b.paragraflar.map((p, i) =>
      raporCumleleri(p.metin).map((c, j) => {
        let cozulemeyen = false;
        let yetkisiz = false;
        const atiflar: CumleAtfi[] = [];
        const atifEkle = (kanitId: string, capa: Capa | null | undefined) => {
          const k = kanitlar.find((x) => x.id === kanitId);
          atiflar.push({ kanitId, konum: capaYaz(capa), vurgu: k ? vurgulanacaklar(k.parcalar, capa) : [] });
        };
        if (c.kaynak !== "yok") {
          for (const a of c.atiflar) {
            const k = kanitlar.filter((x) => x.ozet.toLowerCase().startsWith(a.ozetOneki));
            const tek = k.length === 1 ? k[0] : undefined;
            if (tek) atifEkle(tek.id, a.capa);
            else if (k.length === 0 && p.atiflar.length > 0) yetkisiz = true;
            else cozulemeyen = true;
          }
          // Kanıt panele yüklenemedi (okuyanın yetkisi yok) ama servis atfı çözdü: cümle kanıtlıdır, panel
          // kanıtı göremediğini söyler.
          if (yetkisiz && atiflar.length === 0)
            for (const a of p.atiflar.filter((x) => !kanitlar.some((k) => k.id === x.kanitId)))
              atifEkle(a.kanitId, a.capa);
        } else if (eksikleriAyristir(c.metin).length === 0 && !/\[(?:K|H):/u.test(p.metin)) {
          // Metninde işaret olmayan paragraf (örnek veri): atıf servisin paragraf kaydından gelir.
          for (const a of p.atiflar) atifEkle(a.kanitId, a.capa);
        }
        const hesapli = c.hesaplar.length > 0;
        return {
          id: `${b.id}-p${i + 1}-c${j + 1}`,
          metin: gorunenMetin(c.metin),
          atiflar,
          hesapli,
          eksik: eksikleriAyristir(c.metin).length > 0 || (atiflar.length === 0 && !hesapli) || cozulemeyen,
          dilBulgulari: dil
            .filter((d) => d.bolumId === b.id && d.paragraf === i + 1 && d.cumle === j + 1)
            .map((d) => ({ kural: d.kural, onem: d.onem, aciklama: d.aciklama })),
        };
      }),
    ),
  }));
}

export const KURAL_ADI: Record<string, string> = {
  ustunluk: "Kanıtsız üstünlük",
  "olcusuz-nicelik": "Ölçüsüz nicelik",
  "yaziyla-sayi": "Yazıyla sayı",
  "oznesiz-eylem": "Öznesiz eylem",
  "donem-tutarliligi": "Dönem ve tarih",
};

export const ONEM_ADI: Record<string, string> = { yuksek: "Yüksek", orta: "Orta", dusuk: "Düşük" };
