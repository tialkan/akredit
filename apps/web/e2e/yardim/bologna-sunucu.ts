// Kayıtlı Bologna sayfalarını (packages/baglayicilar/test/fixtures/bologna-canli) yerelde sunar.
// Ağa çıkılmaz; kurulum sihirbazının Bologna adımı bu sunucudan okur.
import { readFile } from "node:fs/promises";
import { createServer } from "node:http";
import { join } from "node:path";
import { BOLOGNA_PORT } from "./ortam.ts";

const DIZIN = join(import.meta.dirname, "../../../../packages/baglayicilar/test/fixtures/bologna-canli");

createServer(async (istek, yanit) => {
  const u = new URL(istek.url ?? "/", `http://127.0.0.1:${BOLOGNA_PORT}`);
  const ad = u.pathname.split("/").at(-1) ?? "";
  let dosya: string | null = null;
  if (ad === "progCourseDetails.aspx") {
    const id = u.searchParams.get("curCourse") ?? "";
    if (/^\d+$/u.test(id)) dosya = `ders-${id}.html`;
  } else if (/^prog[A-Za-z]+\.aspx$/u.test(ad)) dosya = ad.replace(/\.aspx$/u, ".html");
  if (!dosya) {
    yanit.writeHead(404).end();
    return;
  }
  try {
    const html = await readFile(join(DIZIN, dosya));
    yanit.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(html);
  } catch {
    yanit.writeHead(404).end();
  }
}).listen(BOLOGNA_PORT, "127.0.0.1");
