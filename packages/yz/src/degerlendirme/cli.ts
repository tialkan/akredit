// Kullanım: pnpm --filter @akredit/yz degerlendir --gorev kanit-siniflama --saglayici sahte
// Gerçek sağlayıcıyla değerlendirme bu İP'nin kapsamı dışındadır (anahtar gerektirir).
import { parseArgs } from "node:util";
import { kanitSiniflama } from "../gorevler/kanit-siniflama.ts";
import { toplantiBilgisi } from "../gorevler/toplanti-bilgisi.ts";
import { sahteSaglayici } from "../saglayicilar/sahte.ts";
import { type DegerlendirmeSonucu, degerlendir, sonucTablosu } from "./duzenek.ts";
import { KANIT_SINIFLAMA_ORNEKLERI, TOPLANTI_BILGISI_ORNEKLERI } from "./ornekler.ts";

export async function calistir(argv: string[]): Promise<{ sonuc: DegerlendirmeSonucu; cikti: string }> {
  const { values } = parseArgs({
    args: argv,
    options: { gorev: { type: "string" }, saglayici: { type: "string", default: "sahte" } },
  });
  if (values.saglayici !== "sahte") throw new Error("Şimdilik yalnız sahte sağlayıcıyla değerlendirme yapılabilir.");
  const sahte = (o: { sahteYanit?: string }) => sahteSaglayici([o.sahteYanit ?? "{}"]);
  let sonuc: DegerlendirmeSonucu;
  if (values.gorev === "kanit-siniflama") sonuc = await degerlendir(kanitSiniflama, KANIT_SINIFLAMA_ORNEKLERI, sahte);
  else if (values.gorev === "toplanti-bilgisi")
    sonuc = await degerlendir(toplantiBilgisi, TOPLANTI_BILGISI_ORNEKLERI, sahte);
  else throw new Error("Görev adı bilinmiyor. Seçenekler: kanit-siniflama, toplanti-bilgisi.");
  return { sonuc, cikti: sonucTablosu(sonuc) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  calistir(process.argv.slice(2)).then(
    ({ sonuc, cikti }) => {
      console.log(cikti);
      process.exitCode = sonuc.gecti ? 0 : 1;
    },
    (e: unknown) => {
      console.error(e instanceof Error ? e.message : String(e));
      process.exitCode = 2;
    },
  );
}
