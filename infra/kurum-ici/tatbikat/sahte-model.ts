// Tatbikat için OpenAI uyumlu sahte model sunucusu (yalnız 127.0.0.1). Gelen her isteği günlüğe yazar.
// Kullanım: node sahte-model.ts <port> <günlük-dosyası>
import { appendFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";

const port = Number(process.argv[2]);
const gunluk = process.argv[3];
if (!port || !gunluk) throw new Error("kullanım: sahte-model.ts <port> <günlük>");

const sunucu = createServer((istek, yanit) => {
  appendFileSync(gunluk, `${istek.method} ${istek.url}\n`);
  istek.resume();
  istek.on("end", () => {
    yanit.writeHead(200, { "content-type": "application/json" });
    yanit.end(JSON.stringify({ choices: [{ message: { content: "yerel-yanit" }, finish_reason: "stop" }] }));
  });
});
sunucu.listen(port, "127.0.0.1", () => writeFileSync(gunluk, ""));
