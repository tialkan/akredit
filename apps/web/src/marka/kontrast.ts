// WCAG 2.2 bağıl parlaklık ve kontrast oranı (https://www.w3.org/TR/WCAG22/#dfn-contrast-ratio).

export function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const tam = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
  if (!/^[0-9a-f]{6}$/i.test(tam)) throw new Error(`Geçersiz renk: ${hex}`);
  return [0, 2, 4].map((i) => Number.parseInt(tam.slice(i, i + 2), 16)) as [number, number, number];
}

export function bagilParlaklik(hex: string): number {
  const [r, g, b] = hexRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function kontrastOrani(a: string, b: string): number {
  const [l1, l2] = [bagilParlaklik(a), bagilParlaklik(b)].sort((x, y) => y - x) as [number, number];
  return (l1 + 0.05) / (l2 + 0.05);
}

/** globals.css'ten açık (:root) ve koyu (@media prefers-color-scheme: dark) belirteçlerini okur. */
export function belirtecleriOku(css: string): { acik: Record<string, string>; koyu: Record<string, string> } {
  const koyuBas = css.indexOf("@media (prefers-color-scheme: dark)");
  const temaBas = css.indexOf("@theme");
  if (koyuBas < 0 || temaBas < 0) throw new Error("Tema blokları bulunamadı");
  const oku = (parca: string) => {
    const s: Record<string, string> = {};
    for (const m of parca.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,6})\s*;/g)) s[m[1] as string] = m[2] as string;
    return s;
  };
  const acik = oku(css.slice(0, koyuBas));
  return { acik, koyu: { ...acik, ...oku(css.slice(koyuBas, temaBas)) } };
}
