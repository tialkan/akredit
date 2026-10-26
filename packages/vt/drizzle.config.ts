// drizzle-kit yapılandırması: `pnpm --filter @akredit/vt goc:uret` şema göçünü src/gocler altına üretir.
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/sema/index.ts",
  out: "./src/gocler",
});
