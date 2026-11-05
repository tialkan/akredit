// Sitenin gravür görselleri (İP-49). Kaynak ve istem özetleri: docs/tasarim/gorseller.md.
// Her görsel public/gorsel/ altında birkaç genişlikte durur (<ad>-<genişlik>.webp); tarayıcı ekrana uygun olanı
// seçer. En ve boy her zaman verilir (yerleşim kayması olmaz). Süs görselleri alt="" ve aria-hidden taşır.

export interface GorselBilgisi {
  ad: string;
  /** Asıl dosyanın eni ve boyu (en-boy oranı için). */
  en: number;
  boy: number;
  /** Üretilmiş genişlikler, küçükten büyüğe. */
  genislikler: number[];
}

export const GORSELLER = {
  calismaMasasi: { ad: "calisma-masasi", en: 1344, boy: 896, genislikler: [480, 960, 1344] },
  araclar: { ad: "araclar", en: 1800, boy: 450, genislikler: [900, 1800] },
  amfi: { ad: "amfi", en: 1680, boy: 720, genislikler: [840, 1680] },
  avlu: { ad: "avlu", en: 1456, boy: 816, genislikler: [728, 1456] },
  arsiv: { ad: "arsiv", en: 1000, boy: 1000, genislikler: [320, 640] },
} as const satisfies Record<string, GorselBilgisi>;

export function gorselKaynaklari(g: GorselBilgisi): { src: string; srcSet: string } {
  const yol = (w: number) => `/gorsel/${g.ad}-${w}.webp`;
  return {
    src: yol(g.genislikler[0] ?? g.en),
    srcSet: g.genislikler.map((w) => `${yol(w)} ${w}w`).join(", "),
  };
}

export function Gorsel({
  gorsel,
  alt,
  boyutlar,
  oncelikli = false,
  className = "",
}: {
  gorsel: GorselBilgisi;
  /** Anlamlı Türkçe açıklama; süs görselinde boş dize. */
  alt: string;
  /** sizes özniteliği: görselin ekrandaki genişliği. */
  boyutlar: string;
  /** İlk ekran görseli: hemen ve öncelikle yüklenir. Değilse tembel yüklenir. */
  oncelikli?: boolean;
  className?: string;
}) {
  const { src, srcSet } = gorselKaynaklari(gorsel);
  const sus = alt === "";
  return (
    // biome-ignore lint/performance/noImgElement: durağan dışa aktarımda da çalışan sade img; boyutlar elle verilir
    <img
      src={src}
      srcSet={srcSet}
      sizes={boyutlar}
      width={gorsel.en}
      height={gorsel.boy}
      alt={alt}
      aria-hidden={sus ? true : undefined}
      loading={oncelikli ? "eager" : "lazy"}
      decoding={oncelikli ? "sync" : "async"}
      fetchPriority={oncelikli ? "high" : undefined}
      className={`gravur h-auto w-full ${className}`}
    />
  );
}
