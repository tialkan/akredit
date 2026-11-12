// Sitenin görselleri (İP-49; 12.11.2026'dan beri Ankara serisi). Kaynak ve istem özetleri: docs/tasarim/gorseller.md.
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

// Dosya adı içerik değişince değişmeli: /gorsel/* bir yıl değişmez önbellektedir (guvenlik/basliklar.ts).
// Gravürden Ankara serisine geçen üç görsel bu yüzden "ankara-" önekiyle yeniden adlandırıldı (12.11.2026).
export const GORSELLER = {
  amfi: { ad: "ankara-amfi", en: 1680, boy: 720, genislikler: [840, 1680] },
  avlu: { ad: "ankara-avlu", en: 1456, boy: 816, genislikler: [728, 1456] },
  arsiv: { ad: "ankara-arsiv", en: 1000, boy: 1000, genislikler: [320, 640] },
  // Ankara serisi (Midjourney, 12.11.2026): Hamamönü evleri ve Ankara Kalesi, alt bant.
  hamamonu: { ad: "hamamonu", en: 1200, boy: 420, genislikler: [600, 1200] },
  // Askıdaki sayfaların tanıtım görselleri (askida-tanitim.tsx), oran 5:2.
  kurumPlatformu: { ad: "kurum-platformu", en: 1600, boy: 640, genislikler: [800, 1600] },
  pilot: { ad: "pilot", en: 1600, boy: 640, genislikler: [800, 1600] },
  giris: { ad: "giris", en: 1600, boy: 640, genislikler: [800, 1600] },
  kurumDemosu: { ad: "kurum-demosu", en: 1600, boy: 640, genislikler: [800, 1600] },
  // Bilgi sayfalarının ilk ekran görselleri (Ankara serisi, 13.11.2026), oran 5:2, SayfaBasi'nin yanında.
  neYapar: { ad: "sayfa-ne-yapar", en: 1280, boy: 512, genislikler: [640, 1280] },
  nasil: { ad: "sayfa-nasil", en: 1280, boy: 512, genislikler: [640, 1280] },
  kimlerIcin: { ad: "sayfa-kimler-icin", en: 1280, boy: 512, genislikler: [640, 1280] },
  cerceveler: { ad: "sayfa-cerceveler", en: 1280, boy: 512, genislikler: [640, 1280] },
  yapayZeka: { ad: "sayfa-yapay-zeka", en: 1280, boy: 512, genislikler: [640, 1280] },
  guvenlik: { ad: "sayfa-guvenlik", en: 1280, boy: 512, genislikler: [640, 1280] },
  yolHaritasi: { ad: "sayfa-yol-haritasi", en: 1280, boy: 512, genislikler: [640, 1280] },
  sss: { ad: "sayfa-sss", en: 1280, boy: 512, genislikler: [640, 1280] },
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

/** Bilgi sayfası başlığının yanındaki süs görseli (SayfaBasi gorsel). */
export function SayfaGorseli({ gorsel }: { gorsel: GorselBilgisi }) {
  return (
    <Gorsel
      gorsel={gorsel}
      alt=""
      boyutlar="(min-width: 64rem) 32rem, (min-width: 28rem) 28rem, calc(100vw - 2rem)"
      oncelikli
    />
  );
}
