// Yük testi (İP-31). k6 ile çalışır; k6 bir npm paketi değildir, ayrı kurulur (https://k6.io).
//   pnpm --filter @akredit/web build && pnpm --filter @akredit/web start
//   k6 run -e TABAN=http://127.0.0.1:3000 apps/web/yuk/k6-panel.js
// Senaryo: bir fakültenin kalite haftası; 50 eşzamanlı kullanıcı tanıtım, panel ve onay sayfalarında gezinir.
// Eşikler aşılırsa k6 sıfırdan farklı kodla çıkar. Sonuçlar docs/denetim/performans.md'ye yazılır.

import { check, sleep } from "k6";
import http from "k6/http";

const TABAN = __ENV.TABAN || "http://127.0.0.1:3000";

export const options = {
  stages: [
    { duration: "30s", target: 50 },
    { duration: "2m", target: 50 },
    { duration: "20s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"],
    "http_req_duration{tur:sayfa}": ["p(95)<800"],
    "http_req_duration{tur:onay}": ["p(95)<1500"],
  },
};

const SAYFALAR = ["/", "/panel", "/panel/kanitlar", "/panel/gostergeler", "/panel/surecler"];

export default function () {
  for (const yol of SAYFALAR) {
    const y = http.get(`${TABAN}${yol}`, { tags: { tur: "sayfa" } });
    check(y, { "sayfa 200": (r) => r.status === 200 });
    sleep(1 + Math.random() * 2);
  }
  const o = http.get(`${TABAN}/panel/onaylar`, { tags: { tur: "onay" } });
  check(o, { "onay kutusu 200": (r) => r.status === 200 });
  sleep(2);
}
