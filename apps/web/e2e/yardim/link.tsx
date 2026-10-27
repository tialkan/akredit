// Testte görünüm bileşenleri Next dışında çizilir; `next/link` yerine aynı işaretlemeyi (<a href>) veren yalın
// bağlantı kullanılır (e2e/tsconfig.json yol eşlemesi). Sunucu çiziminde next/link de yalnız <a> üretir.
import type { AnchorHTMLAttributes } from "react";

export default function Link({ href, ...diger }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return <a href={href} {...diger} />;
}
