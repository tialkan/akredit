// npm derlemesinde iş alanı paketi belirteçlerinin derlenmiş kopyaya göreli yola çevrilmesi (İP-49).

import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { belirtecleriCevir, GOMULU } from "../scripts/derle.ts";

const DIST = join(import.meta.dirname, "..", "dist");

describe("belirtecleriCevir", () => {
  it("uygulama dosyasında @akredit içe aktarmalarını göreli yola çevirir, dış paketlere dokunmaz", () => {
    const dosya = join(DIST, "apps/acik-mcp/src/araclar.js");
    const metin = [
      'import { a } from "@akredit/cekirdek";',
      "export * from '@akredit/olcme';",
      'const y = await import("@akredit/yz");',
      'import { z } from "zod";',
      'import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";',
    ].join("\n");
    // dist/apps/acik-mcp/src → dist/packages/...: üç düzey yukarı.
    expect(belirtecleriCevir(metin, dosya).split("\n")).toEqual([
      'import { a } from "../../../packages/cekirdek/src/index.js";',
      "export * from '../../../packages/olcme/src/index.js';",
      'const y = await import("../../../packages/yz/src/index.js");',
      'import { z } from "zod";',
      'import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";',
    ]);
  });

  it("iş alanı paketinin kendi içindeki başka pakete bağımlılığı da çevrilir", () => {
    const dosya = join(DIST, "packages/olcme/src/alt/hesap.js");
    expect(belirtecleriCevir('import { x } from "@akredit/cekirdek";', dosya)).toBe(
      'import { x } from "../../../cekirdek/src/index.js";',
    );
  });

  it("gömülmeyen iş alanı paketinde derleme durur", () => {
    expect(() => belirtecleriCevir('import "@akredit/vt";', join(DIST, "apps/acik-mcp/src/x.js"))).toThrow(
      /gömülmeyen iş alanı paketi @akredit\/vt/u,
    );
    expect(Object.keys(GOMULU).sort()).toEqual([
      "@akredit/cekirdek",
      "@akredit/cerceveler",
      "@akredit/olcme",
      "@akredit/yz",
    ]);
  });
});
