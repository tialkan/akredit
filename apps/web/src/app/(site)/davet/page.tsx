import type { Metadata } from "next";
import { DavetKabul } from "./davet-kabul.tsx";

export const metadata: Metadata = { title: "Davet", robots: { index: false } };

// Davet bağlantısı: `/davet?b=<belirteç>` (kimlik/yonetim.ts davetOlustur üretir).
export default async function DavetSayfasi({ searchParams }: { searchParams: Promise<{ b?: string | string[] }> }) {
  const b = (await searchParams).b;
  const belirtec = typeof b === "string" && /^\S{16,200}$/u.test(b) ? b : null;
  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <h1 className="text-3xl font-bold tracking-tight">Kuruma katılın</h1>
      {belirtec ? (
        <DavetKabul belirtec={belirtec} />
      ) : (
        <p className="mt-4">Davet bağlantısı eksik ya da bozuk. E-postadaki bağlantıyı yeniden açın.</p>
      )}
    </div>
  );
}
