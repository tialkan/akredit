// `/saglik` HTTP ucu: 200 (çalışıyor) ya da 503 (başlamadı, kapanıyor, veritabanına ulaşılamıyor, yapılandırma
// eksik). Gövde kısa JSON'dur; gizli değer, kurum adı ya da kişisel veri içermez.

import { createServer, type Server } from "node:http";

export interface SaglikRaporu {
  saglikli: boolean;
  durum: string;
  hatalar: string[];
  uyarilar: string[];
  [ek: string]: unknown;
}

export function saglikSunucusu(rapor: () => Promise<SaglikRaporu>) {
  const sunucu: Server = createServer((istek, yanit) => {
    if (istek.method !== "GET" || (istek.url ?? "").split("?")[0] !== "/saglik") {
      yanit.writeHead(404, { "content-type": "application/json; charset=utf-8" }).end('{"durum":"yok"}');
      return;
    }
    rapor()
      .catch(
        (): SaglikRaporu => ({ saglikli: false, durum: "hata", hatalar: ["Sağlık denetimi başarısız."], uyarilar: [] }),
      )
      .then((r) => {
        yanit
          .writeHead(r.saglikli ? 200 : 503, {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store",
          })
          .end(JSON.stringify(r));
      });
  });
  return {
    dinle: (port: number) =>
      new Promise<number>((coz) => {
        sunucu.listen(port, () => {
          const a = sunucu.address();
          coz(typeof a === "object" && a ? a.port : port);
        });
      }),
    kapat: () => new Promise<void>((coz) => sunucu.close(() => coz())),
  };
}
