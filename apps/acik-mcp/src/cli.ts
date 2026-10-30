#!/usr/bin/env node
// Yerel kullanım: `akredit-acik-mcp` stdio sunucusu (Claude Code, Cursor, VS Code). `--http [kapı]` ile yerel
// Streamable HTTP sunucusu açar (geliştirme ve deneme için). stdout yalnız protokole ayrılmıştır.

import { createServer } from "node:http";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { acikMcpIsleyici } from "./http.ts";
import { acikSunucu } from "./sunucu.ts";

const argv = process.argv.slice(2);
if (argv[0] === "--http") {
  const kapi = Number(argv[1] ?? 8787);
  const isleyici = acikMcpIsleyici({ gunluk: (k) => process.stderr.write(`${JSON.stringify(k)}\n`) });
  createServer(async (q, r) => {
    const parcalar: Buffer[] = [];
    for await (const p of q) parcalar.push(p as Buffer);
    const basliklar = new Headers();
    for (const [k, v] of Object.entries(q.headers)) if (typeof v === "string") basliklar.set(k, v);
    const govde = parcalar.length ? Buffer.concat(parcalar) : undefined;
    const y = await isleyici(
      new Request(`http://localhost:${kapi}${q.url ?? "/"}`, {
        method: q.method ?? "GET",
        headers: basliklar,
        ...(govde && q.method !== "GET" && q.method !== "HEAD" ? { body: govde } : {}),
      }),
    );
    r.writeHead(y.status, Object.fromEntries(y.headers));
    r.end(Buffer.from(await y.arrayBuffer()));
  }).listen(kapi, () => process.stderr.write(`Akredit açık MCP: http://localhost:${kapi}/mcp\n`));
} else {
  await acikSunucu().connect(new StdioServerTransport());
}
