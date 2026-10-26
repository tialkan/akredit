import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";

// Bu ortamda tarayıcılar önceden kuruludur; indirme yapılmaz.
process.env.PLAYWRIGHT_BROWSERS_PATH ??= "/opt/pw-browsers";

/** Kurulu Chromium sürümü Playwright'ın beklediğinden farklıysa oradaki Chromium kullanılır. */
function yerelChromium(): string | undefined {
  const kok = process.env.PLAYWRIGHT_BROWSERS_PATH ?? "";
  if (!existsSync(kok)) return undefined;
  for (const d of readdirSync(kok)
    .filter((x) => /^chromium-\d+$/.test(x))
    .sort()
    .reverse()) {
    const yol = join(kok, d, "chrome-linux64", "chrome");
    if (existsSync(yol)) return yol;
  }
  return undefined;
}
const executablePath = process.env.E2E_CHROMIUM ?? yerelChromium();

const PORT = Number(process.env.E2E_PORT ?? 3107);

// Önce `pnpm build`; testler derlenmiş uygulamaya karşı çalışır.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: [["list"]],
  use: { baseURL: `http://127.0.0.1:${PORT}`, locale: "tr-TR", trace: "off", launchOptions: { executablePath } },
  webServer: {
    command: `pnpm exec next start -p ${PORT} -H 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    { name: "masaustu", use: { ...devices["Desktop Chrome"] }, testIgnore: /telefon\.spec\.ts/ },
    {
      name: "telefon",
      use: { ...devices["Desktop Chrome"], viewport: { width: 360, height: 740 }, hasTouch: true, isMobile: true },
      testMatch: /telefon\.spec\.ts/,
    },
  ],
});
