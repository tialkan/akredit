import { defineConfig } from "vitest/config";

// PGlite ve göçler paralel yükte yavaş açılabiliyor; süreler bu yüzden uzun.
export default defineConfig({ test: { hookTimeout: 60_000, testTimeout: 30_000 } });
