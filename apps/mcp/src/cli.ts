#!/usr/bin/env node
// Çalıştırma: yerel (stdio) `akredit-mcp`, uzak (HTTP) `akredit-mcp --http [kapı]`.
// Veritabanı: AKREDIT_VT_ADRES (PostgreSQL) ya da AKREDIT_VT_DIZIN (PGlite). Yerelde anahtar: AKREDIT_ANAHTARI.

import { createServer } from "node:http";
import { pgliteBaglantisi, postgresBaglantisi } from "@akredit/vt";
import { mcpHttpIsleyici, mcpStdio } from "./tasima.ts";

async function vt() {
  const adres = process.env.AKREDIT_VT_ADRES;
  if (adres) return postgresBaglantisi(adres).db;
  const dizin = process.env.AKREDIT_VT_DIZIN;
  if (dizin) return (await pgliteBaglantisi(dizin)).db;
  throw new Error("Veritabanı adresi tanımlı değil (AKREDIT_VT_ADRES ya da AKREDIT_VT_DIZIN).");
}

const argv = process.argv.slice(2);
const db = await vt();
if (argv[0] === "--http") {
  const kapi = Number(argv[1] ?? process.env.PORT ?? 8787);
  const isle = mcpHttpIsleyici({
    db,
    izinliKokenler: (process.env.AKREDIT_MCP_KOKENLER ?? "").split(",").filter(Boolean),
  });
  createServer(async (q, r) => {
    const parcalar: Buffer[] = [];
    for await (const p of q) parcalar.push(p as Buffer);
    const basliklar = new Headers();
    for (const [k, v] of Object.entries(q.headers)) if (typeof v === "string") basliklar.set(k, v);
    const istek = new Request(`http://yerel${q.url ?? "/"}`, {
      method: q.method ?? "GET",
      headers: basliklar,
      ...(q.method === "POST" ? { body: Buffer.concat(parcalar) } : {}),
    });
    const y = await isle(istek);
    r.writeHead(y.status, Object.fromEntries(y.headers));
    r.end(Buffer.from(await y.arrayBuffer()));
  }).listen(kapi, "127.0.0.1");
  process.stderr.write(`Akredit MCP sunucusu 127.0.0.1:${kapi} adresinde.\n`);
} else {
  const anahtar = process.env.AKREDIT_ANAHTARI;
  if (!anahtar) {
    process.stderr.write("AKREDIT_ANAHTARI tanımlı değil. Ayarlardan bir API anahtarı oluşturun.\n");
    process.exit(1);
  }
  await mcpStdio({ db, anahtar, girdi: process.stdin, cikti: process.stdout });
}
