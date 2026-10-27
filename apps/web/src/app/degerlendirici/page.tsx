import type { Metadata } from "next";
import { portalAc } from "./_portal/durum.tsx";
import { KanitOdasiGorunumu } from "./_portal/gorunum.tsx";
import { kanitOdasi, OdaFiltresi, ziyaretProgrami } from "./_portal/portal.ts";

export const metadata: Metadata = { title: "Kanıt odası" };
export const dynamic = "force-dynamic";

export default async function KanitOdasi({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const acilis = await portalAc();
  if ("durum" in acilis) return acilis.durum;
  const { p } = acilis;
  const sp = await searchParams;
  const f = OdaFiltresi.safeParse({
    arama: typeof sp.arama === "string" && sp.arama ? sp.arama : undefined,
    olcut: typeof sp.olcut === "string" && sp.olcut ? sp.olcut : undefined,
  });
  const filtre = f.success ? f.data : {};
  const [gruplar, program] = await Promise.all([kanitOdasi(p, filtre), ziyaretProgrami(p)]);
  return <KanitOdasiGorunumu erisimBitis={p.erisimBitis} program={program} filtre={filtre} gruplar={gruplar} />;
}
