// node --test infra/kurum-ici/vt-kullanici.test.ts (denetle.sh çalıştırır).
// G-27-2: kurum içi kurulumda web ve işçi süper kullanıcıyla bağlanmaz.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const dizin = import.meta.dirname;
const oku = (yol: string) => readFileSync(join(dizin, yol), "utf8");
const betik = join(dizin, "postgres/02-uygulama-kullanicisi.sh");

test("compose: web/işçi uygulama kullanıcısıyla, göç süper kullanıcıyla bağlanır", () => {
  const c = oku("docker-compose.yml");
  const adresler = [...c.matchAll(/(AKREDIT_VT_ADRES|DATABASE_URL): (\S+)/g)].map((m) => [m[1], m[2]]);
  assert.deepEqual(adresler, [
    ["AKREDIT_VT_ADRES", "postgres://${UYGULAMA_VT_KULLANICI:?}:${UYGULAMA_VT_PAROLA:?}@vt:5432/${POSTGRES_DB:?}"],
    ["DATABASE_URL", "postgres://${POSTGRES_USER:?}:${POSTGRES_PASSWORD:?}@vt:5432/${POSTGRES_DB:?}"],
  ]);
  // Uygulama ortamı bloğunda süper kullanıcı parolası yok.
  const ortam = c.slice(c.indexOf("x-uygulama-ortami"), c.indexOf("services:"));
  assert.doesNotMatch(ortam, /POSTGRES_(USER|PASSWORD)/);
  assert.match(
    c,
    /\.\/postgres\/02-uygulama-kullanicisi\.sh:\/docker-entrypoint-initdb\.d\/02-uygulama-kullanicisi\.sh:ro/,
  );
  assert.match(c, /UYGULAMA_VT_PAROLA: \$\{UYGULAMA_VT_PAROLA:\?\}/);
});

test("Helm: uygulama ortamı ayrı gizli anahtarla; betik kopyası aynı; aynı ad reddedilir", () => {
  const y = oku("helm/akredit/templates/_helpers.tpl");
  const ortam = y.slice(y.indexOf('define "akredit.uygulamaOrtami"'));
  assert.doesNotMatch(ortam.slice(0, ortam.indexOf("{{- end -}}")), /POSTGRES_PASSWORD|\.Values\.vt\.kullanici/);
  assert.match(ortam, /key: UYGULAMA_VT_PAROLA/);
  assert.match(y, /fail "vt\.uygulamaKullanici, vt\.kullanici/);
  assert.equal(oku("helm/akredit/files/02-uygulama-kullanicisi.sh"), oku("postgres/02-uygulama-kullanicisi.sh"));
  const vt = oku("helm/akredit/templates/vt.yaml");
  assert.match(vt, /mountPath: \/docker-entrypoint-initdb\.d/);
  assert.match(vt, /vt-kullanici-\{\{ \.Release\.Revision \}\}/);
  assert.match(oku("helm/akredit/values.yaml"), /uygulamaKullanici: akredit_uyg/);
});

test("parola.sh boş gizlileri üretir, dolu olana dokunmaz", () => {
  const g = mkdtempSync(join(tmpdir(), "akredit-parola-"));
  try {
    const dosya = join(g, "akredit.env");
    writeFileSync(
      dosya,
      "POSTGRES_USER=akredit\nPOSTGRES_PASSWORD=elle-verilen\nUYGULAMA_VT_PAROLA=\nAKREDIT_ONAY_GIZLI=\n",
    );
    execFileSync(join(dizin, "parola.sh"), [dosya]);
    const ayar = Object.fromEntries(
      readFileSync(dosya, "utf8")
        .trim()
        .split("\n")
        .map((s) => s.split("=") as [string, string]),
    );
    assert.equal(ayar.POSTGRES_PASSWORD, "elle-verilen");
    for (const ad of ["UYGULAMA_VT_PAROLA", "AKREDIT_ONAY_GIZLI", "AKREDIT_ANKET_GIZLI", "AKREDIT_TAKMA_AD_ANAHTARI"])
      assert.match(ayar[ad] ?? "", /^[0-9a-f]{64}$/, ad);
    assert.notEqual(ayar.UYGULAMA_VT_PAROLA, ayar.AKREDIT_ONAY_GIZLI);
    // İkinci çalıştırma değeri değiştirmez (yükseltmede parola kaymaz).
    const once = readFileSync(dosya, "utf8");
    execFileSync(join(dizin, "parola.sh"), [dosya]);
    assert.equal(readFileSync(dosya, "utf8"), once);
  } finally {
    rmSync(g, { recursive: true, force: true });
  }
});

test("betik süper kullanıcı adını reddeder", () => {
  const s = spawnSync(betik, {
    env: {
      PATH: process.env.PATH,
      POSTGRES_USER: "akredit",
      POSTGRES_DB: "akredit",
      UYGULAMA_VT_KULLANICI: "akredit",
      UYGULAMA_VT_PAROLA: "x",
      PSQL: "false",
    },
  });
  assert.notEqual(s.status, 0);
  assert.match(String(s.stderr), /POSTGRES_USER ile aynı olamaz/);
});

// Gerçek PostgreSQL: makinede sunucu ikilileri varsa geçici küme açılır (CI'da denetle.sh ile).
const pgBin = ["/usr/lib/postgresql"]
  .filter(existsSync)
  .flatMap((k) => readdirSync(k).map((s) => join(k, s, "bin")))
  .find((b) => existsSync(join(b, "initdb")));

test("gerçek PostgreSQL: kullanıcı ayrıcalıksız, akredit_oturum üyesi, betik yinelenebilir", { skip: !pgBin }, () => {
  const bin = pgBin as string;
  const g = mkdtempSync(join(tmpdir(), "akredit-pg-"));
  const veri = join(g, "veri");
  const port = String(20000 + Math.floor(Math.random() * 20000));
  const env = { ...process.env, PGHOST: g, PGPORT: port };
  // initdb kök kullanıcıyla çalışmaz: kökken sunucu işlemleri postgres kullanıcısıyla yürütülür.
  const kok = process.getuid?.() === 0;
  if (kok) execFileSync("chown", ["postgres", g]);
  const sunucu = (komut: string, argv: string[]) =>
    kok
      ? execFileSync("runuser", ["-u", "postgres", "--", join(bin, komut), ...argv], { stdio: "ignore" })
      : execFileSync(join(bin, komut), argv, { stdio: "ignore" });
  sunucu("initdb", ["-D", veri, "-U", "akredit", "--auth=trust"]);
  sunucu("pg_ctl", ["-D", veri, "-o", `-k ${g} -p ${port} -c listen_addresses=''`, "-w", "start"]);
  try {
    execFileSync(join(bin, "createdb"), ["-U", "akredit", "akredit"], { env });
    const calistir = (parola: string) =>
      execFileSync(betik, {
        env: {
          ...env,
          POSTGRES_USER: "akredit",
          POSTGRES_DB: "akredit",
          UYGULAMA_VT_KULLANICI: "akredit_uyg",
          UYGULAMA_VT_PAROLA: parola,
        },
      });
    calistir("birinci");
    calistir("ikinci"); // ikinci çalıştırma hata vermez (yükseltme yolu)
    const sor = (sql: string) =>
      execFileSync("psql", ["-U", "akredit", "-d", "akredit", "-tAc", sql], { env, encoding: "utf8" }).trim();
    assert.equal(
      sor(
        "select rolsuper, rolbypassrls, rolcreaterole, rolcreatedb, rolcanlogin from pg_roles where rolname='akredit_uyg'",
      ),
      "f|f|f|f|t",
    );
    assert.equal(sor("select pg_has_role('akredit_uyg','akredit_oturum','member')"), "t");
    assert.equal(sor("select has_database_privilege('akredit_uyg','akredit','CREATE')"), "t");
    // Süper kullanıcının yapabildiği tetikleyici kapatma uygulama kullanıcısına yasak.
    sor("create table t(x int)");
    const s = spawnSync("psql", ["-U", "akredit_uyg", "-d", "akredit", "-c", "alter table t disable trigger all"], {
      env,
      encoding: "utf8",
    });
    assert.notEqual(s.status, 0);
    assert.match(s.stderr, /must be owner|sahibi/);
  } finally {
    sunucu("pg_ctl", ["-D", veri, "-m", "immediate", "stop"]);
    rmSync(g, { recursive: true, force: true });
  }
});
