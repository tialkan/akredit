"use client";

// Panel kenar çubuğu. Geçerli sayfa aria-current ile duyurulur; dar ekranda açılır kapanır menü olur.

import {
  BookOpen,
  CalendarDays,
  CheckSquare,
  FileText,
  FolderArchive,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export const PANEL_MENUSU = [
  { href: "/panel", ad: "Genel bakış", simge: LayoutDashboard },
  { href: "/panel/onaylar", ad: "Onay kutusu", simge: CheckSquare },
  { href: "/panel/kanitlar", ad: "Kanıtlar", simge: FolderArchive },
  { href: "/panel/programlar/prog-bp", ad: "Program", simge: GraduationCap },
  { href: "/panel/dersler", ad: "Dersler", simge: BookOpen },
  { href: "/panel/raporlar", ad: "Raporlar", simge: FileText },
  { href: "/panel/surecler", ad: "Takvim ve görevler", simge: CalendarDays },
  { href: "/panel/ayarlar", ad: "Ayarlar", simge: Settings },
] as const;

export function aktifMi(yol: string, href: string): boolean {
  if (href === "/panel") return yol === "/panel";
  return yol === href || yol.startsWith(`${href}/`);
}

export function KenarCubugu({ bekleyenSayisi }: { bekleyenSayisi: number }) {
  const yol = usePathname() ?? "";
  const [acik, setAcik] = useState(false);
  return (
    <nav aria-label="Panel menüsü" className="border-b border-cizgi bg-yuzey md:min-h-full md:w-64 md:shrink-0 md:border-r md:border-b-0">
      <button
        type="button"
        className="flex min-h-11 w-full items-center gap-2 px-4 font-semibold md:hidden"
        aria-expanded={acik}
        aria-controls="panel-menusu"
        onClick={() => setAcik((a) => !a)}
      >
        <Menu aria-hidden className="size-5" />
        Menü
      </button>
      <ul id="panel-menusu" className={`${acik ? "block" : "hidden"} space-y-1 p-3 md:block`}>
        {PANEL_MENUSU.map((m) => {
          const aktif = aktifMi(yol, m.href);
          const Simge = m.simge;
          return (
            <li key={m.href}>
              <Link
                href={m.href}
                aria-current={aktif ? "page" : undefined}
                onClick={() => setAcik(false)}
                className={`flex min-h-11 items-center gap-3 rounded-md px-3 ${
                  aktif ? "bg-vurgu-zemin font-semibold text-vurgu" : "text-metin hover:bg-yuzey-2"
                }`}
              >
                <Simge aria-hidden className="size-5" />
                <span className="flex-1">{m.ad}</span>
                {m.href === "/panel/onaylar" && bekleyenSayisi > 0 ? (
                  <span className="rounded-full bg-vurgu px-2 text-sm font-semibold text-vurgu-metin">
                    {bekleyenSayisi}
                    <span className="sr-only"> bekleyen karar</span>
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
