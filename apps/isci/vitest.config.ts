import { defineConfig } from "vitest/config";

// PGlite ve göçler paralel yükte yavaş açılabiliyor; süreler bu yüzden uzun.
// Her test dosyası kendi PGlite örneğini açar; CI'daki 2 çekirdekli makinede çok sayıda paralel çatal
// bellek yüzünden çökebiliyor (Node 24'te "Worker forks emitted error"). Paralellik 2 ile sınırlanır.
export default defineConfig({ test: { hookTimeout: 60_000, testTimeout: 30_000, maxWorkers: 2 } });
