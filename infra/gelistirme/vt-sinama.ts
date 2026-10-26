// Gerçek PostgreSQL sınaması (CI'daki Postgres hizmetiyle). PGlite tek bağlantılı olduğu için birim
// testlerinde sınanamayan iki davranışı denetler:
// 1. Göçlerin aynı anda iki süreçten uygulanması (danışma kilidi) ve tekrar uygulanınca değişmemesi.
// 2. Aynı kuruma ayrı bağlantılardan eşzamanlı günlük yazımı: `sira` 1..N boşluksuz, özet zinciri sağlam.
// Örnek kurum uydurmadır; her çalıştırmada yeni kimlikle eklenir.

import { randomBytes, randomUUID } from "node:crypto";
import {
  gocleriUygula,
  gunlugeYaz,
  kiraciIslemi,
  postgresBaglantisi,
  zinciriDogrula,
} from "../../packages/vt/src/index.ts";

const adres = process.env.DATABASE_URL;
if (!adres) {
  console.error("DATABASE_URL tanımlı değil.");
  process.exit(1);
}

const ESZAMANLI = Number(process.env.ESZAMANLI ?? 40);
const hatalar: string[] = [];
function denetle(kosul: boolean, ileti: string) {
  console.log(`${kosul ? "geçti" : "KALDI"}: ${ileti}`);
  if (!kosul) hatalar.push(ileti);
}

const sessiz = { onnotice: () => {} };

// 1. Göçler: iki ayrı bağlantıdan aynı anda.
const g1 = postgresBaglantisi(adres, { max: 1, ...sessiz });
const g2 = postgresBaglantisi(adres, { max: 1, ...sessiz });
const [u1, u2] = await Promise.all([gocleriUygula(g1.db), gocleriUygula(g2.db)]);
const ikinciKez = await gocleriUygula(g1.db);
await Promise.all([g1.kapat(), g2.kapat()]);
denetle(new Set([...u1, ...u2]).size === u1.length + u2.length, "eşzamanlı göçlerde hiçbir göç iki kez uygulanmadı");
denetle(ikinciKez.length === 0, "göçleri tekrar uygulamak bir şey değiştirmedi");

// 2. Eşzamanlı günlük yazımı: havuzda ESZAMANLI bağlantı, her biri ayrı işlemde bir kayıt.
const { db, istemci, kapat } = postgresBaglantisi(adres, { max: ESZAMANLI, ...sessiz });
try {
  const kurumId = randomUUID();
  const ad = `Sınama Üniversitesi ${randomBytes(3).toString("hex")}`;
  await istemci`insert into kurum (id, ad) values (${kurumId}, ${ad})`;
  await Promise.all(
    Array.from({ length: ESZAMANLI }, (_, i) =>
      kiraciIslemi(db, kurumId, async (tx) => {
        await gunlugeYaz(tx, { aktor: { tur: "sistem", id: null }, eylem: "sinama.eszamanli", ayrinti: { i } });
      }),
    ),
  );
  const satirlar = await istemci<{ sira: number }[]>`select sira from gunluk where kurum_id = ${kurumId} order by sira`;
  const siralar = satirlar.map((s) => Number(s.sira));
  denetle(siralar.length === ESZAMANLI, `${ESZAMANLI} eşzamanlı kaydın hepsi yazıldı (${siralar.length})`);
  denetle(
    siralar.every((s, i) => s === i + 1),
    "sıra numaraları 1'den başlayıp boşluksuz ilerliyor",
  );
  denetle((await zinciriDogrula(db, kurumId)) === null, "özet zinciri veritabanında doğrulandı");
} finally {
  await kapat();
}

if (hatalar.length) {
  console.error(`${hatalar.length} denetim kaldı.`);
  process.exit(1);
}
console.log("Gerçek PostgreSQL sınaması tamam.");
