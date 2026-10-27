// Aktarım paketi (İP-24): klasör kayıpsız taşınır, günlük zinciri doğrulanır. Ağ yok; sunucu sahte fetch ile.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import { gunlukZinciri, kararliJson, paketDogrula, paketGonder } from "../lib/aktarim.mjs";

const ARAC = fileURLToPath(new URL("../bin/akreddit", import.meta.url));
const EV = mkdtempSync(join(tmpdir(), "akredit-aktarim-"));

function calistir(args, cwd = EV, env = {}) {
  return new Promise((r) => execFile(process.execPath, [ARAC, ...args], { cwd, env: { ...process.env, XDG_CONFIG_HOME: EV, AKREDIT_ANAHTARI: "", ...env } },
    (hata, stdout, stderr) => r({ kod: hata ? hata.code : 0, cikti: stdout + stderr })));
}

const TABLOLAR = ["kanitlar", "adimlar", "ciktilar", "oneriler", "yazma_planlari", "bologna_aktarimlari"];
function dokum(klasor) {
  const vt = new DatabaseSync(join(klasor, "kayit", "akreddit.sqlite"));
  const d = Object.fromEntries(TABLOLAR.map((t) => [t, vt.prepare(`SELECT * FROM ${t} ORDER BY id`).all()]));
  d.surum = vt.prepare("PRAGMA user_version").get().user_version;
  vt.close();
  return d;
}

async function doluKlasor() {
  const k = join(EV, "kaynak");
  await calistir(["kur", k]);
  writeFileSync(join(EV, "tutanak.pdf"), "%PDF-1.4 kurul tutanağı");
  writeFileSync(join(EV, "plan.txt"), "Ölçme planı: Ö1 vize, Ö2 proje");
  await calistir(["kanit-ekle", join(EV, "tutanak.pdf"), join(EV, "plan.txt")], k);
  await calistir(["cikti-ekle", "--tur", "program", "--kod", "P1", "--metin", "Program çıktısı bir"], k);
  await calistir(["cikti-ekle", "--tur", "ders", "--ders", "TBP201", "--kod", "Ö1", "--metin", "HTML sayfası tasarlar.", "--kanit", "2"], k);
  await calistir(["oner-etiket", "--kanit", "1", "--baslik", "Kurul tutanağı", "--gerekce", "Belgenin başlığında kurul adı geçiyor."], k);
  await calistir(["oner-matris", "--ders-cikti", "TBP201.Ö1", "--program-cikti", "P1", "--puan", "3", "--gerekce", "Ölçme planında proje ile ölçülüyor.", "--kanit", "2"], k);
  await calistir(["karar", "1", "onayla", "--onaylayan", "Deneme Hoca"], k);
  await calistir(["karar", "2", "duzelt", "--puan", "2", "--onaylayan", "Deneme Hoca"], k);
  await calistir(["yazma-plani", "--sistem", "bologna", "--adres", "https://ornek.edu.tr/x", "--alanlar", JSON.stringify([{ alan: "Amaç", mevcut: "", yeni: "Yeni amaç", kaynak: "onaylı öneri #1" }])], k);
  await calistir(["matris"], k);
  return k;
}

test("klasör paketlenir, yeni klasöre kayıpsız açılır, günlük zinciri doğrulanır", async () => {
  const k = await doluKlasor();
  const paket = join(EV, "paket.json");
  const r = await calistir(["aktar-paketi", "--cikti", paket], k);
  assert.equal(r.kod, 0, r.cikti);
  assert.match(r.cikti, /Kanıt: 2, çıktı: 2, öneri: 2 \(karar verilmiş 2\), yazma planı: 1/);

  const d = await calistir(["paket-dogrula", paket]);
  assert.equal(d.kod, 0, d.cikti);
  assert.match(d.cikti, /Paket sağlam/);

  const once = dokum(k);
  const hedef = join(EV, "hedef");
  const a = await calistir(["paket-ac", paket, hedef]);
  assert.equal(a.kod, 0, a.cikti);
  const sonra = dokum(hedef);
  // Paket hazırlandıktan sonra kaynağa "aktarim_paketi" adımı eklendi; o adım pakette yoktur.
  assert.equal(once.adimlar.at(-1).eylem, "aktarim_paketi");
  assert.deepEqual(sonra.adimlar, once.adimlar.slice(0, -1));
  for (const t of TABLOLAR.filter((x) => x !== "adimlar")) assert.deepEqual(sonra[t], once[t], t);
  assert.equal(sonra.surum, once.surum);
  // Kanıt baytları aynı ve salt okunur.
  for (const kn of once.kanitlar) {
    assert.deepEqual(readFileSync(join(hedef, kn.yol)), readFileSync(join(k, kn.yol)));
    assert.equal(statSync(join(hedef, kn.yol)).mode & 0o222, 0);
  }
  assert.equal(readFileSync(join(hedef, "raporlar", "matris.md"), "utf8"), readFileSync(join(k, "raporlar", "matris.md"), "utf8"));
  assert.ok(readdirSync(join(hedef, "gunluk")).some((x) => x.endsWith(".jsonl")));
  // Açılan klasörde değiştirilemezlik kuralları sürer.
  const vt = new DatabaseSync(join(hedef, "kayit", "akreddit.sqlite"));
  assert.throws(() => vt.exec("DELETE FROM adimlar"), /silinemez/);
  assert.throws(() => vt.exec("UPDATE oneriler SET karar = 'reddedildi' WHERE id = 1"), /değiştirilemez/);
  vt.close();
  // Yeni klasörden yeniden üretilen paketin günlük zinciri aynıdır.
  const paket2 = join(EV, "paket2.json");
  await calistir(["aktar-paketi", "--cikti", paket2], hedef);
  const p1 = JSON.parse(readFileSync(paket, "utf8"));
  const p2 = JSON.parse(readFileSync(paket2, "utf8"));
  assert.equal(p2.gunlukZinciri.son, p1.gunlukZinciri.son);

  const tekrar = await calistir(["paket-ac", paket, hedef]);
  assert.equal(tekrar.kod, 1);
  assert.match(tekrar.cikti, /Hedef klasör boş değil/);
});

test("değiştirilmiş günlük, silinmiş adım ya da bozuk kanıt yakalanır", async () => {
  const p = JSON.parse(readFileSync(join(EV, "paket.json"), "utf8"));
  assert.deepEqual(paketDogrula(p), []);

  // Adım değişti ve paket özeti yeniden hesaplandı: zincir yine kırılır.
  const yeniOzet = (x) => {
    const { paketOzeti, ...g } = x;
    return { ...g, paketOzeti: createHashHex(kararliJson(g)) };
  };
  const degisik = structuredClone(p);
  degisik.tablolar.adimlar[1].eylem = "baska";
  assert.match(paketDogrula(yeniOzet(degisik)).join(" "), /2\. adımda kırılıyor/);

  const silinmis = structuredClone(p);
  silinmis.tablolar.adimlar.splice(1, 1);
  assert.match(paketDogrula(yeniOzet(silinmis)).join(" "), /adım var, zincirde/);

  const bozuk = structuredClone(p);
  bozuk.kanitDosyalari[0].icerik = Buffer.from("başka").toString("base64");
  const s = paketDogrula(bozuk);
  assert.match(s.join(" "), /içeriği oluşturulduktan sonra değişmiş/);
  assert.match(s.join(" "), /Kanıt dosyasının özeti tutmuyor/);

  // Klasör dışına yazmaya çalışan yol reddedilir.
  const yol = yeniOzet(Object.assign(structuredClone(p), { ekDosyalar: [{ ...p.ekDosyalar[0], yol: "../disari.txt" }] }));
  writeFileSync(join(EV, "kotu.json"), JSON.stringify(yol));
  const kotu = await calistir(["paket-ac", join(EV, "kotu.json"), join(EV, "hedef-kotu")]);
  assert.equal(kotu.kod, 1);
  assert.match(kotu.cikti, /dosya yolu geçersiz/);

  const r = await calistir(["paket-dogrula", join(EV, "yok.json")]);
  assert.equal(r.kod, 1);
});

import { createHash } from "node:crypto";
const createHashHex = (x) => createHash("sha256").update(x).digest("hex");

test("günlük zinciri elle hesaplanan değerle aynı", () => {
  const a = [{ id: 1, eylem: "x" }];
  // sha256("0"*64 + '{"eylem":"x","id":1}')
  assert.deepEqual(gunlukZinciri(a), [createHashHex(`${"0".repeat(64)}{"eylem":"x","id":1}`)]);
  assert.equal(kararliJson({ b: 1, a: [null, "ç"] }), '{"a":[null,"ç"],"b":1}');
});

test("eşitleme: anahtar yoksa paket saklanır, sunucu yoksa çevrim dışı kalır", async () => {
  const k = join(EV, "kaynak");
  const r = await calistir(["esitle"], k);
  assert.equal(r.kod, 0);
  assert.match(r.cikti, /AKREDIT_ANAHTARI/);
  assert.ok(readdirSync(join(k, "kayit", "aktarim")).length >= 1);
  const u = await calistir(["esitle", "--sunucu", "http://127.0.0.1:9"], k, { AKREDIT_ANAHTARI: "akr_deneme" });
  assert.match(u.cikti, /Sunucuya ulaşılamadı/);
  assert.doesNotMatch(u.cikti, /akr_deneme/);
});

test("paketGonder: anahtar Bearer olarak gider, 401 ve 404 anlaşılır iletilere döner", async () => {
  const p = JSON.parse(readFileSync(join(EV, "paket.json"), "utf8"));
  const istekler = [];
  const sahte = (durumlar) => async (url, s = {}) => {
    istekler.push({ url, s });
    const durum = durumlar[url.endsWith("/ben") ? 0 : 1];
    return { status: durum, ok: durum < 300 };
  };
  assert.deepEqual(await paketGonder(p, { sunucu: "https://kurum.example/", anahtar: "akr_x", fetchIslevi: sahte([200, 201]) }), { tamam: true });
  assert.equal(istekler[1].url, "https://kurum.example/api/v1/aktarim");
  assert.equal(istekler[1].s.headers.authorization, "Bearer akr_x");
  assert.equal(istekler[1].s.headers["idempotency-key"], p.paketOzeti);
  assert.match((await paketGonder(p, { sunucu: "https://k", anahtar: "a", fetchIslevi: sahte([401, 0]) })).neden, /Anahtar kabul edilmedi/);
  assert.match((await paketGonder(p, { sunucu: "https://k", anahtar: "a", fetchIslevi: sahte([200, 404]) })).neden, /henüz klasör aktarımını kabul etmiyor/);
});
