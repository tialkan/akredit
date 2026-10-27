import type { Metadata } from "next";
import Link from "next/link";
import { SayfaBasligi } from "../../bilesenler/temel.tsx";
import { portalAc, tarihYaz } from "./_portal/durum.tsx";
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
  return (
    <>
      <SayfaBasligi
        baslik="Kanıt odası"
        aciklama={`Kanıtlar ölçütlere göre düzenlendi. Erişiminiz ${tarihYaz(p.erisimBitis)} tarihinde sona erer. Her görüntüleme kuruma açık bir günlüğe yazılır.`}
      />
      {program.length > 0 && (
        <section aria-labelledby="program-baslik" className="mb-6 rounded-lg border border-cizgi bg-yuzey p-4">
          <h2 id="program-baslik" className="font-semibold">
            Ziyaret programı
          </h2>
          <ol className="mt-2 space-y-1 text-sm">
            {program.map((z) => (
              <li key={`${z.tarih}-${z.saat ?? ""}-${z.etkinlik}`}>
                <span className="font-semibold">
                  {tarihYaz(z.tarih)}
                  {z.saat ? `, ${z.saat}` : ""}
                </span>
                : {z.etkinlik}
                {z.yer ? <span className="text-soluk"> ({z.yer})</span> : null}
              </li>
            ))}
          </ol>
        </section>
      )}
      <form aria-label="Kanıt arama" method="get" className="mb-6 flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-sm">
          Ara
          <input
            name="arama"
            defaultValue={filtre.arama ?? ""}
            className="mt-1 rounded border border-cizgi px-2 py-1"
            maxLength={200}
          />
        </label>
        <label className="flex flex-col text-sm">
          Ölçüt kodu
          <input
            name="olcut"
            defaultValue={filtre.olcut ?? ""}
            className="mt-1 rounded border border-cizgi px-2 py-1"
            maxLength={50}
          />
        </label>
        <button type="submit" className="rounded border border-cizgi px-3 py-1">
          Süz
        </button>
      </form>
      {gruplar.length === 0 ? (
        <p>Aramanıza uyan kanıt yok.</p>
      ) : (
        gruplar.map((g) => (
          <section key={g.olcut ?? "olcutsuz"} aria-label={g.olcut ?? "Ölçüte bağlanmamış"} className="mb-6">
            <h2 className="mb-2 font-semibold">{g.olcut ?? "Ölçüte bağlanmamış kanıtlar"}</h2>
            <ul className="space-y-1">
              {g.kanitlar.map((k) => (
                <li key={k.id}>
                  <Link href={`/degerlendirici/kanit/${k.id}`} className="underline underline-offset-4">
                    {k.baslik}
                  </Link>
                  <span className="text-sm text-soluk">
                    {" "}
                    · {k.dosyaAdi}
                    {k.belgeTarihi ? ` · ${tarihYaz(k.belgeTarihi)}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </>
  );
}
