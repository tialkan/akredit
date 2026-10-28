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

/** globals.css'teki :root belirteçlerini okur. Sitede yalnız açık tema vardır; koyu tema bloğu bulunursa hata verir. */
export function belirtecleriOku(css: string): { acik: Record<string, string> } {
  if (/prefers-color-scheme:\s*dark/u.test(css)) throw new Error("Koyu tema bloğu bulunmamalı");
  const temaBas = css.indexOf("@theme");
  if (temaBas < 0) throw new Error("Tema bloğu bulunamadı");
  const acik: Record<string, string> = {};
  for (const m of css.slice(0, temaBas).matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{3,6})\s*;/g))
    acik[m[1] as string] = m[2] as string;
  return { acik };
}
