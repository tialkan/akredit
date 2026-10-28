// İşçi uçtan uca sınaması: GERÇEK PostgreSQL ve gerçek pg-boss ile (`infra/gelistirme/isci-uctan-uca.sh`).
// Vitest değildir; CI'nın postgres işinde ve yerelde geçici kümeyle çalışır. Akış:
//   1. Göçler uygulanır; ayrıcalıksız uygulama kullanıcısı (akredit_oturum üyesi) açılır.
//   2. Uydurma kurum, ölçüt, kişi ve takvim eklenir (sahip bağlantısıyla, kurulum gibi).
//   3. İşçi `node apps/isci/src/ana.ts` ile, uygulama kullanıcısıyla, üretim kipinde başlatılır.
//      Yapay zekâ: 127.0.0.1'de sahte OpenAI uyumlu model sunucusu (kurum içi model yolu).
//   4. Web'in yapacağı gibi bir ZIP kanıt paketi pg-boss kuyruğuna verilir → hat işler → onay bekleyen öneri.
//   5. Süreç motoru turu hatırlatma bildirimi üretir.
//   6. Gömme yokken tam metin arama kanıtı bulur.
//   7. SIGTERM ile temiz kapanış (çıkış kodu 0).
// Bütün ad, adres ve kurumlar uydurmadır.

import { type ChildProcess, spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { yerelDepo } from "@akredit/depo";
import { gocleriUygula, kiraciIslemi, postgresBaglantisi, sema } from "@akredit/vt";
import { and, eq } from "drizzle-orm";
import { zipSync } from "fflate";
import { PgBoss } from "pg-boss";
import { kanitAra } from "../src/arama.ts";
import { pgBossKuyrugu, zipAl } from "../src/kanit-hatti/index.ts";
import { hazirSurecleriYukle } from "../src/surec/index.ts";

const KOK = new URL("../../../", import.meta.url).pathname;
const sahipAdresi = process.env.DATABASE_URL;
if (!sahipAdresi) {
  console.error("DATABASE_URL tanımlı değil (göç/sahip kullanıcısı).");
  process.exit(1);
}

const hatalar: string[] = [];
function denetle(kosul: boolean, ileti: string) {
  console.log(`${kosul ? "geçti" : "KALDI"}: ${ileti}`);
  if (!kosul) hatalar.push(ileti);
}
const bekle = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function bekleyerek<T>(ad: string, f: () => Promise<T | null | undefined>, sureMs = 90_000): Promise<T | null> {
  const son = Date.now() + sureMs;
  while (Date.now() < son) {
    const v = await f().catch(() => null);
    if (v) return v;
    await bekle(500);
  }
  console.log(`zaman aşımı: ${ad}`);
  return null;
}

// ---------- 1. Göçler ve uygulama kullanıcısı ----------
const sahip = postgresBaglantisi(sahipAdresi, { max: 2, onnotice: () => {} });
await gocleriUygula(sahip.db);
// Sabit ad: pg-boss şeması ilk açan kullanıcıya ait olur; sonraki çalıştırmalar aynı kullanıcıyla bağlanmalı.
const kullanici = "akredit_isci_e2e";
const parola = randomBytes(18).toString("base64url");
const vtAdi = new URL(sahipAdresi).pathname.slice(1);
// infra/uretim/postgres/02-uygulama-kullanicilari.sh ile aynı yetkiler.
await sahip.istemci.unsafe(`DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${kullanici}') THEN
    CREATE ROLE ${kullanici} WITH LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION IN ROLE akredit_oturum;
  END IF; END $$`);
await sahip.istemci.unsafe(`ALTER ROLE ${kullanici} PASSWORD '${parola}'`);
await sahip.istemci.unsafe(`GRANT CONNECT, CREATE ON DATABASE "${vtAdi}" TO ${kullanici}`);
const uygAdres = new URL(sahipAdresi);
uygAdres.username = kullanici;
uygAdres.password = parola;
const uygulamaAdresi = uygAdres.toString();

// ---------- 2. Uydurma kurum ----------
const KURUM = randomUUID();
const HOCA = randomUUID();
const tarih = (gun: number) =>
  new Date(Date.now() + gun * 86_400_000).toLocaleDateString("en-CA", { timeZone: "Europe/Istanbul" });
await sahip.db.insert(sema.kurum).values({
  id: KURUM,
  ad: "Uçtan Uca Uydurma Üniversitesi",
  // Dönem dün bitti, not girişi bugün kapanıyor: ders dosyası görevinin son tarihi 2 gün sonra, 3 gün kala
  // hatırlatması şimdiden zamanı gelmiş olur.
  ayarlar: { surec: { takvim: { donem_sonu: tarih(-1), not_giris_son: tarih(0) } }, yz: { yurtDisiIzin: false } },
});
const cerceveKod = `E2E-${randomBytes(3).toString("hex")}`;
const [cer] = await sahip.db
  .insert(sema.cerceve)
  .values({ kod: cerceveKod, ad: "Uydurma çerçeve", surum: "1" })
  .returning({ id: sema.cerceve.id });
await sahip.db.insert(sema.olcut).values([
  { cerceveId: cer?.id as string, kod: "U.1", baslik: "Öğrenci geri bildirimlerinin değerlendirilmesi", sira: 1 },
  { cerceveId: cer?.id as string, kod: "U.2", baslik: "Araştırma altyapısı", sira: 2 },
]);
await sahip.db
  .insert(sema.kisi)
  .values({ id: HOCA, kurumId: KURUM, adSoyad: "Deniz Uydurma", eposta: "deniz@uydurma.edu.tr" });
await sahip.db.insert(sema.rolAtamasi).values({
  kurumId: KURUM,
  kisiId: HOCA,
  rol: "ogretim_elemani",
  kapsamTuru: "kurum",
  kapsamId: KURUM,
  baslangic: new Date(Date.now() - 365 * 86_400_000),
});
await hazirSurecleriYukle(
  { db: sahip.db, saat: { simdi: () => new Date(), zamanla: () => () => {} }, eposta: { gonder: async () => {} } },
  KURUM,
);

// ---------- 3. Sahte model sunucusu ----------
let modelCagrisi = 0;
const model = createServer((istek, yanit) => {
  let govde = "";
  istek.on("data", (p) => {
    govde += p;
  });
  istek.on("end", () => {
    if (!istek.url?.endsWith("/chat/completions")) {
      yanit.writeHead(404).end();
      return;
    }
    modelCagrisi++;
    const g = JSON.parse(govde) as { messages: { content: string }[] };
    const metin = g.messages.map((m) => m.content).join("\n");
    const baslik = metin.match(/--- parça \[K:([0-9a-f]{8}[^\]]*)\] ---\n([^\n]{1,40})/u);
    const atif = baslik ? `[K:${baslik[1]} "${(baslik[2] ?? "").slice(0, 25).trim()}"]` : "[K:00000000]";
    const icerik = JSON.stringify({
      belgeTuru: "anket_raporu",
      olcutOnerileri: [{ olcutKod: "U.1", gerekce: "Belge öğrenci anketini değerlendiriyor.", atif, guven: 0.8 }],
    });
    yanit
      .writeHead(200, { "content-type": "application/json" })
      .end(JSON.stringify({ choices: [{ message: { content: icerik }, finish_reason: "stop" }] }));
  });
});
await new Promise<void>((r) => model.listen(0, "127.0.0.1", () => r()));
const modelPortu = (model.address() as AddressInfo).port;

// ---------- 4. İşçiyi başlat ----------
const depoDizini = mkdtempSync(join(tmpdir(), "akredit-e2e-depo-"));
const imzaGizlisi = randomBytes(24).toString("hex");
const isciPortu = 18_000 + Math.floor(Math.random() * 2000);
const cikti: string[] = [];
const isci: ChildProcess = spawn(process.execPath, ["apps/isci/src/ana.ts"], {
  cwd: KOK,
  env: {
    PATH: process.env.PATH,
    NODE_ENV: "production",
    AKREDIT_VT_ADRES: uygulamaAdresi,
    AKREDIT_ISCI_PORT: String(isciPortu),
    AKREDIT_DEPO_DIZINI: depoDizini,
    AKREDIT_DEPO_IMZA_GIZLISI: imzaGizlisi,
    AKREDIT_YZ_HAZIR: "ollama",
    AKREDIT_YZ_ADRES: `http://127.0.0.1:${modelPortu}/v1`,
    AKREDIT_YZ_MODEL: "sahte-model",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
isci.stdout?.on("data", (d) => cikti.push(String(d)));
isci.stderr?.on("data", (d) => cikti.push(String(d)));
const cikis = new Promise<number | null>((r) => isci.on("exit", (k) => r(k)));

const saglik = async () => {
  const y = await fetch(`http://127.0.0.1:${isciPortu}/saglik`);
  return { kod: y.status, govde: (await y.json()) as { durum: string; hatalar: string[] } };
};
const ilk = await bekleyerek("sağlık 200", async () => ((await saglik()).kod === 200 ? saglik() : null), 60_000);
denetle(ilk?.kod === 200, `işçi ayakta, /saglik 200 (${ilk?.govde.durum ?? "yanıt yok"})`);

// ---------- 5. ZIP kanıt (web'in yaptığı gibi: depoya koy + kuyruğa ver) ----------
const uretici = new PgBoss({ connectionString: uygulamaAdresi, schema: "pgboss", supervise: false, schedule: false });
await uretici.start();
const uygulama = postgresBaglantisi(uygulamaAdresi, { max: 2, onnotice: () => {} });
const zip = zipSync({
  "anket/ogrenci-anketi-2026.txt": new TextEncoder().encode(
    "Öğrenci anketi sonuçları değerlendirildi. Ders değerlendirme anketine 120 öğrenci katıldı.\n" +
      "Kalite komisyonu sonuçları bölüm kurulunda görüştü.",
  ),
  "__MACOSX/._gizli": new Uint8Array([1]),
});
const al = await zipAl(
  { db: uygulama.db, depo: yerelDepo({ kok: depoDizini, imzaGizlisi }), kuyruk: pgBossKuyrugu(uretici) },
  { kurumId: KURUM, kaynakTuru: "yukleme", veri: zip, paketAdi: "kanitlar.zip" },
);
const kanitId = al.dosyalar.find((d) => d.durum === "eklendi")?.kanitId;
denetle(
  al.dosyalar.length === 1 && Boolean(kanitId),
  `ZIP'ten bir kanıt alındı, sistem dosyası atlandı (${al.dosyalar.map((d) => d.durum).join(", ")})`,
);

const oneri = await bekleyerek("öneri", async () => {
  const l = await kiraciIslemi(uygulama.db, KURUM, (tx) =>
    tx
      .select({ id: sema.oneri.id, tur: sema.oneri.tur, icerik: sema.oneri.icerik })
      .from(sema.oneri)
      .where(and(eq(sema.oneri.hedefTuru, "kanit"), eq(sema.oneri.hedefId, kanitId as string))),
  );
  return l[0] ?? null;
});
denetle(Boolean(oneri), "hat işledi: çıkarma → zenginleştirme → sınıflama → öneri oluştu");
if (oneri) {
  const kararlar = await kiraciIslemi(uygulama.db, KURUM, (tx) =>
    tx.select({ id: sema.karar.id }).from(sema.karar).where(eq(sema.karar.oneriId, oneri.id)),
  );
  denetle(kararlar.length === 0, "öneri onay bekliyor (karar yok; insan onayı gerekli)");
  denetle(
    JSON.stringify(oneri.icerik).includes('"U.1"'),
    "öneri ölçüt kodunu taşıyor (modelin sayısı değil, listedeki kod)",
  );
}
denetle(modelCagrisi > 0, "model yalnız iç ağdaki (kurum içi) sunucuya çağrıldı");

// ---------- 6. Gömmesiz arama ----------
const bulunan = await kanitAra(uygulama.db, KURUM, "öğrencilerin anketleri");
denetle(
  bulunan.some((s) => s.kanitId === kanitId),
  "gömme yokken Türkçe tam metin arama kanıtı buldu (çekim ekleri: öğrencilerin/anketleri)",
);

// ---------- 7. Süreç motoru: hatırlatma ----------
// Açılıştaki tur görevi açar; hatırlatma bir sonraki turda gelir. Zamanlayıcıyı (5 dk) beklememek için tur
// web'in ya da zamanlayıcının koyduğu gibi kuyruğa elle konur.
const hatirlatma = await bekleyerek("hatırlatma", async () => {
  await uretici.send("surec.tik", {});
  await bekle(1500);
  const l = await kiraciIslemi(uygulama.db, KURUM, (tx) =>
    tx.select({ tur: sema.bildirim.tur, kisi: sema.bildirim.kisiId, icerik: sema.bildirim.icerik }).from(sema.bildirim),
  );
  return l.find((b) => b.tur.startsWith("hatirlat") && b.kisi === HOCA) ?? null;
});
denetle(Boolean(hatirlatma), "süreç motoru turu hocaya hatırlatma bildirimi üretti");
const gorevler = await kiraciIslemi(uygulama.db, KURUM, (tx) => tx.select({ id: sema.gorev.id }).from(sema.gorev));
denetle(gorevler.length >= 1, "takvimdeki tarihle süreç kendiliğinden başladı, görev açıldı");

// ---------- 8. Zamanlamalar ----------
const zamanlar = await uygulama.istemci.unsafe<{ name: string; key: string }[]>(
  "select name, key from pgboss.schedule order by name, key",
);
denetle(
  ["baglayici.planla:bologna", "baglayici.planla:eposta", "surec.tik:tik", "gunluk.dogrula:gunluk"].every((k) =>
    zamanlar.some((z) => `${z.name}:${z.key}` === k),
  ),
  `zamanlanmış işler kayıtlı (${zamanlar.length})`,
);

// ---------- 9. SIGTERM ----------
await uretici.stop({ graceful: true, timeout: 5000 });
await uygulama.kapat();
isci.kill("SIGTERM");
const kod = await Promise.race([cikis, bekle(50_000).then(() => "zaman aşımı")]);
denetle(kod === 0, `SIGTERM ile temiz kapandı (çıkış kodu ${String(kod)})`);
denetle(cikti.join("").includes("kapandı"), "kapanış günlüğe yazıldı");

model.close();
await sahip.kapat();
if (hatalar.length) {
  console.error(`\n${hatalar.length} denetim kaldı. İşçi çıktısının sonu:\n${cikti.join("").slice(-4000)}`);
  process.exit(1);
}
console.log("\nİşçi uçtan uca: bütün denetimler geçti.");
process.exit(0);
