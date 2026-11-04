"use client";

// Ana yoldan çekilen sayfaların üstündeki şerit: "Proje ayrıntıları" geri bağlantısı ve sayfanın durumu.
// Ana sayfa, kurulum, proje ayrıntıları ve iletişim ana yoldadır; onlarda şerit yoktur.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { DurumEtiketi } from "./durum-etiketi.tsx";
import { gecerliDurum, projeSayfasi } from "./icerik.ts";

const ANA_YOL = new Set(["/", "/proje", "/mcp-kullan", "/iletisim"]);

export function SayfaDurumu({ barindirma }: { barindirma: boolean }) {
  const yol = usePathname() ?? "/";
  const sayfa = ANA_YOL.has(yol) ? undefined : projeSayfasi(yol);
  if (!sayfa) return null;
  const { durum, not } = gecerliDurum(sayfa, barindirma);
  return (
    <div data-sayfa-durumu className="border-b border-cizgi bg-zemin">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 text-base">
        <Link href="/proje" className="inline-flex min-h-11 items-center text-vurgu underline underline-offset-4">
          Proje ayrıntıları
        </Link>
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="sr-only">Bu sayfanın durumu:</span>
          <DurumEtiketi durum={durum} />
          <span className="text-soluk">{not}</span>
        </p>
      </div>
    </div>
  );
}
