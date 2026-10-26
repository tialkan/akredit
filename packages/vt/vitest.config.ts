import { defineConfig } from "vitest/config";

// PGlite göçleri paralel yükte yavaş açılabiliyor; kanca süresi bu yüzden uzun.
export default defineConfig({ test: { hookTimeout: 60_000, testTimeout: 30_000 } });
