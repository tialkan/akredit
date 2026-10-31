"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const BAGLANTILAR: { href: string; ad: string }[] = [
  { href: "/degerlendirici", ad: "Kanıt odası" },
  { href: "/degerlendirici/kanit/rapor", ad: "Raporlar" },
  { href: "/degerlendirici/soru", ad: "Soru sor" },
];

const RAPOR = "/degerlendirici/kanit/rapor";

/** Menüde etkin bağlantı: kanıt sayfaları kanıt odasına, rapor sayfaları raporlara aittir. */
export function etkinMi(yol: string, href: string): boolean {
  const rapor = yol === RAPOR || yol.startsWith(`${RAPOR}/`);
  if (href === "/degerlendirici") return yol === href || (yol.startsWith("/degerlendirici/kanit") && !rapor);
  if (href === RAPOR) return rapor;
  return yol === href || yol.startsWith(`${href}/`);
}

/** Değerlendirici menüsü: bulunulan sayfa `aria-current` ile ve görsel olarak belirtilir. */
export function PortalMenusu() {
  const yol = usePathname() ?? "";
  const etkin = (href: string) => etkinMi(yol, href);
  return (
    <nav aria-label="Değerlendirici menüsü">
      <ul className="flex gap-2 text-sm">
        {BAGLANTILAR.map((b) => (
          <li key={b.href}>
            <Link
              href={b.href}
              aria-current={etkin(b.href) ? "page" : undefined}
              className="inline-flex min-h-11 items-center px-2 underline-offset-4 hover:underline aria-[current=page]:font-semibold aria-[current=page]:underline"
            >
              {b.ad}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
