// İsteğe bağlı virüs taraması: clamd INSTREAM protokolü (TCP). Kurulumda ClamAV yoksa tarayıcı verilmez.

import { createConnection } from "node:net";

export type TaramaSonucu = { temiz: true } | { temiz: false; bulgu: string };

export interface VirusTarayici {
  readonly ad: string;
  tara(veri: Uint8Array): Promise<TaramaSonucu>;
}

export function clamdTarayici(ayar: {
  host: string;
  port: number;
  sureMs?: number;
  parcaBoyutu?: number;
}): VirusTarayici {
  const parcaBoyutu = ayar.parcaBoyutu ?? 64 * 1024;
  return {
    ad: "clamav",
    tara(veri) {
      return new Promise((coz, reddet) => {
        const soket = createConnection({ host: ayar.host, port: ayar.port });
        let yanit = "";
        soket.setTimeout(ayar.sureMs ?? 60_000, () => {
          soket.destroy();
          reddet(new Error("Virüs taraması zamanında bitmedi."));
        });
        soket.on("error", () => reddet(new Error("Virüs tarama hizmetine ulaşılamadı.")));
        soket.on("data", (d) => {
          yanit += d.toString("utf8");
        });
        soket.on("end", () => {
          const s = yanit.replace(/\0/gu, "").trim();
          if (/: OK$/u.test(s)) coz({ temiz: true });
          else if (/ FOUND$/u.test(s))
            coz({ temiz: false, bulgu: s.replace(/^stream: /u, "").replace(/ FOUND$/u, "") });
          else reddet(new Error("Virüs tarama hizmeti anlaşılmayan bir yanıt verdi."));
        });
        soket.on("connect", () => {
          soket.write("zINSTREAM\0");
          for (let i = 0; i < veri.byteLength; i += parcaBoyutu) {
            const p = veri.subarray(i, i + parcaBoyutu);
            const uzunluk = Buffer.alloc(4);
            uzunluk.writeUInt32BE(p.byteLength);
            soket.write(uzunluk);
            soket.write(p);
          }
          soket.end(Buffer.alloc(4));
        });
      });
    },
  };
}
