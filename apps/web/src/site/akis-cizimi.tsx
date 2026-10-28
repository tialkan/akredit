// Kanıttan günlüğe akış çizimi. El yapımı SVG; süs değil, akışın sırasını ve iki kuralı gösterir:
// denetimden geçemeyen içerik EKSİK işaretlenir, onay insan kararıdır ve günlük yalnız eklenir.
// Geniş ekranda yatay, dar ekranda dikey çizim gösterilir; ikisi de aynı bilgiyi taşır.

const ADIMLAR = [
  { ad: "Kanıt", alt: "özetle saklanır" },
  { ad: "Hesap", alt: "ölçme motoru" },
  { ad: "Atıflı taslak", alt: "yapay zekâ yazar" },
  { ad: "Denetim", alt: "atıf, sayı, eksik" },
  { ad: "Onay", alt: "yetkili kişi" },
  { ad: "Günlük", alt: "yalnız eklenir" },
];

const ACIKLAMA =
  "Akış: kanıt, hesap, atıflı taslak, denetim, onay, değiştirilemez günlük. Denetimden geçemeyen içerik EKSİK işaretlenir. Onay adımı yalnız bir kişi tarafından yapılır.";

function Kutu({ x, y, g, ad, alt, onay }: { x: number; y: number; g: number; ad: string; alt: string; onay: boolean }) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={g}
        height={64}
        rx={2}
        fill={onay ? "var(--petrol-zemin)" : "var(--yuzey)"}
        stroke={onay ? "var(--petrol)" : "var(--cizgi-guclu)"}
        strokeWidth={onay ? 2 : 1}
      />
      <text
        x={x + g / 2}
        y={y + 28}
        textAnchor="middle"
        fontSize="16"
        fontWeight="700"
        fill={onay ? "var(--petrol)" : "var(--vurgu)"}
      >
        {ad}
      </text>
      <text x={x + g / 2} y={y + 48} textAnchor="middle" fontSize="13" fill="var(--soluk)">
        {alt}
      </text>
    </g>
  );
}

export function AkisCizimi() {
  const g = 132;
  const ara = 30;
  return (
    <figure className="mt-2">
      <svg role="img" aria-labelledby="akis-y-baslik" viewBox="0 0 980 170" className="hidden w-full md:block">
        <title id="akis-y-baslik">{ACIKLAMA}</title>
        <defs>
          <marker id="ok-y" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0 0L10 5L0 10z" fill="var(--soluk)" />
          </marker>
        </defs>
        {ADIMLAR.map((a, i) => {
          const x = 10 + i * (g + ara);
          return (
            <g key={a.ad}>
              <Kutu x={x} y={20} g={g} ad={a.ad} alt={a.alt} onay={a.ad === "Onay"} />
              {i < ADIMLAR.length - 1 ? (
                <line
                  x1={x + g + 2}
                  y1={52}
                  x2={x + g + ara - 3}
                  y2={52}
                  stroke="var(--soluk)"
                  strokeWidth="1.5"
                  markerEnd="url(#ok-y)"
                />
              ) : null}
            </g>
          );
        })}
        {/* Denetim (4. kutu) altından EKSİK dalı. */}
        <line
          x1={10 + 3 * (g + ara) + g / 2}
          y1={86}
          x2={10 + 3 * (g + ara) + g / 2}
          y2={118}
          stroke="var(--risk-yuksek)"
          strokeWidth="1.5"
          strokeDasharray="4 3"
          markerEnd="url(#ok-y)"
        />
        <text
          x={10 + 3 * (g + ara) + g / 2}
          y={138}
          textAnchor="middle"
          fontSize="13"
          fontWeight="700"
          fill="var(--risk-yuksek)"
        >
          EKSİK işareti
        </text>
        <text x={10 + 3 * (g + ara) + g / 2} y={156} textAnchor="middle" fontSize="12" fill="var(--soluk)">
          yapılmış gibi yazılmaz
        </text>
        <text x={10 + 4 * (g + ara) + g / 2} y={110} textAnchor="middle" fontSize="12" fill="var(--soluk)">
          onaylar, düzeltir
        </text>
        <text x={10 + 4 * (g + ara) + g / 2} y={126} textAnchor="middle" fontSize="12" fill="var(--soluk)">
          ya da reddeder
        </text>
      </svg>
      <svg
        role="img"
        aria-labelledby="akis-d-baslik"
        viewBox="0 0 320 560"
        className="mx-auto block w-full max-w-sm md:hidden"
      >
        <title id="akis-d-baslik">{ACIKLAMA}</title>
        <defs>
          <marker id="ok-d" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0 0L10 5L0 10z" fill="var(--soluk)" />
          </marker>
        </defs>
        {ADIMLAR.map((a, i) => {
          const y = 8 + i * 92;
          return (
            <g key={a.ad}>
              <Kutu x={10} y={y} g={190} ad={a.ad} alt={a.alt} onay={a.ad === "Onay"} />
              {i < ADIMLAR.length - 1 ? (
                <line
                  x1={105}
                  y1={y + 66}
                  x2={105}
                  y2={y + 89}
                  stroke="var(--soluk)"
                  strokeWidth="1.5"
                  markerEnd="url(#ok-d)"
                />
              ) : null}
            </g>
          );
        })}
        <line
          x1={202}
          y1={316}
          x2={230}
          y2={316}
          stroke="var(--risk-yuksek)"
          strokeWidth="1.5"
          strokeDasharray="4 3"
          markerEnd="url(#ok-d)"
        />
        <text x={236} y={312} fontSize="13" fontWeight="700" fill="var(--risk-yuksek)">
          EKSİK
        </text>
        <text x={236} y={328} fontSize="12" fill="var(--soluk)">
          işareti
        </text>
      </svg>
      <figcaption className="mt-3 text-sm text-soluk">
        Onay adımında kararı bir kişi verir ya da düşük ve orta riskte o kişinin imzaladığı politika. Yüksek riskte
        karar her zaman kişinindir.
      </figcaption>
    </figure>
  );
}
