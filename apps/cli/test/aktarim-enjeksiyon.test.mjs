// İnceleme dalga 3: paket satırlarının sütun adları dışarıdan gelir; SQL'e ad olarak eklenmeden önce
// tablonun gerçek sütunlarıyla sınanmalı. Aksi hâlde hazırlanmış bir paket yerel veritabanına keyfî sorgu sokar.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { kararliJson, paketAc } from "../lib/aktarim.mjs";

const TABLOLAR = ["kanitlar", "adimlar", "ciktilar", "oneriler", "yazma_planlari", "bologna_aktarimlari"];

function paket(ciktilar) {
  const govde = {
    bicim: "akredit-aktarim/1",
    olusturma: "2026-01-01T00:00:00Z",
    surum: 1,
    tablolar: { kanitlar: [], adimlar: [], oneriler: [], yazma_planlari: [], bologna_aktarimlari: [], ciktilar },
    kanitDosyalari: [],
    ekDosyalar: [],
    gunlukZinciri: { halkalar: [], son: "0".repeat(64) },
  };
  return { ...govde, paketOzeti: createHash("sha256").update(kararliJson(govde)).digest("hex") };
}

function yerel() {
  const vt = new DatabaseSync(":memory:");
  for (const t of TABLOLAR) vt.exec(`CREATE TABLE ${t} (id INTEGER PRIMARY KEY, kod TEXT)`);
  return { vt, ac: () => ({ prepare: (s) => vt.prepare(s), exec: (s) => vt.exec(s), close: () => {} }) };
}

test("paket açılırken sütun adı yoluyla SQL sokulamaz", () => {
  const { vt, ac } = yerel();
  const p = paket([{ "kod) SELECT ? UNION SELECT name FROM sqlite_master --": "x" }]);
  assert.throws(() => paketAc(p, mkdtempSync(join(tmpdir(), "akredit-enj-")), ac), /sütun/u);
  assert.equal(vt.prepare("SELECT COUNT(*) AS n FROM ciktilar").get().n, 0);
});

test("geçerli sütunlu satır açılır", () => {
  const { vt, ac } = yerel();
  paketAc(paket([{ id: 1, kod: "P1" }]), mkdtempSync(join(tmpdir(), "akredit-enj-")), ac);
  assert.equal(vt.prepare("SELECT kod FROM ciktilar").get().kod, "P1");
});
