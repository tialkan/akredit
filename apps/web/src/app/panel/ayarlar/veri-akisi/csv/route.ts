// Veri akış envanteri CSV olarak (İP-40). Kurum verisi içermez; kod tabanından üretilir.
import { envanterCsv } from "../../../../../veri/veri-akisi.ts";
import { guncelEnvanter } from "../../../../../veri/veri-akisi-girdi.ts";

export const dynamic = "force-static";

export function GET() {
  return new Response(envanterCsv(guncelEnvanter()), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="akredit-veri-akis-envanteri.csv"',
    },
  });
}
