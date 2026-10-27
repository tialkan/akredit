// node --test infra/kurum-ici/yz-ayari.test.ts (denetle.sh çalıştırır). Ağ yoktur: fetch sahtedir.
import assert from "node:assert/strict";
import { test } from "node:test";
import { openaiUyumlu, politikaUygula } from "../../packages/yz/src/index.ts";
import { icAdresMi, KurumIciYzHatasi, kurumIciSaglayici } from "./yz-ayari.ts";

const tamam = {
  AKREDIT_YZ_HAZIR: "ollama",
  AKREDIT_YZ_ADRES: "http://model:11434/v1",
  AKREDIT_YZ_MODEL: "qwen2.5:14b",
  AKREDIT_YZ_YURT_DISI_IZIN: "hayir",
};

test("iç adresler kabul, genel adresler ret", () => {
  for (const h of ["model", "akredit-model", "localhost", "127.0.0.1", "10.2.3.4", "172.16.0.9", "192.168.1.5"])
    assert.equal(icAdresMi(h), true, h);
  for (const h of ["akredit-model.akredit.svc.cluster.local", "gpu.kurum.internal", "fd12:3456::1"])
    assert.equal(icAdresMi(h), true, h);
  for (const h of ["api.openai.com", "openrouter.ai", "8.8.8.8", "172.32.0.1", "evren-llmapi.ssyz.org.tr"])
    assert.equal(icAdresMi(h), false, h);
});

test("geçerli ayar iç model sunucusuna istek atar", async () => {
  const istekler: string[] = [];
  const sahte = (async (adres: string | URL | Request) => {
    istekler.push(String(adres));
    return new Response(JSON.stringify({ choices: [{ message: { content: "tamam" }, finish_reason: "stop" }] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }) as typeof fetch;
  const { saglayici, ayar } = kurumIciSaglayici(tamam, sahte);
  assert.equal(ayar.yurtDisiIzin, false);
  assert.equal(saglayici.yurtIci, true);
  const y = await saglayici.sohbet({ mesajlar: [{ rol: "kullanici", icerik: "merhaba" }] });
  assert.equal(y.icerik, "tamam");
  assert.deepEqual(istekler, ["http://model:11434/v1/chat/completions"]);
});

test("yurt dışı ya da yerel olmayan her ayar reddedilir", () => {
  const ret = (degisiklik: Record<string, string>) =>
    assert.throws(() => kurumIciSaglayici({ ...tamam, ...degisiklik }), KurumIciYzHatasi);
  ret({ AKREDIT_YZ_HAZIR: "openai" });
  ret({ AKREDIT_YZ_HAZIR: "evren" });
  ret({ AKREDIT_YZ_ADRES: "https://api.openai.com/v1" }); // hazır ollama ama adres dışarıda
  ret({ AKREDIT_YZ_ADRES: "http://kullanici:parola@model:11434/v1" });
  ret({ AKREDIT_YZ_ADRES: "ftp://model/v1" });
  ret({ AKREDIT_YZ_ADRES: "bozuk adres" });
  ret({ AKREDIT_YZ_MODEL: "" });
  ret({ AKREDIT_YZ_YURT_DISI_IZIN: "evet" });
});

test("hazır adres boşsa hazır ayarın yerel adresi kullanılır", () => {
  const { saglayici } = kurumIciSaglayici({ ...tamam, AKREDIT_YZ_HAZIR: "vllm", AKREDIT_YZ_ADRES: "" });
  assert.equal(saglayici.ad, "vllm");
});

test("politika katmanı yurt dışı sağlayıcıyı izinsiz reddeder (kurum içi ayar)", () => {
  const disari = openaiUyumlu({ hazir: "openai", model: "x", anahtar: "sahte" });
  assert.throws(() => politikaUygula(disari, { yurtDisiIzin: false }), /yurt dışındaki/u);
});
