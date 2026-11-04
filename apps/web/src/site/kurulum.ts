// Ana sayfadaki kurulum adımları (İP-49). Adımlar elle yazılmaz; herkese açık MCP'nin kurulum rehberinden
// (kurulum_yardimi aracı, apps/acik-mcp) okunur. Sitede yalnız bağlayıcıyı ekleyen adımlar gösterilir;
// "akredit yazın" ana sayfada ikinci adımdır.

import { type Adim, baglayiciAdimlari, type Istemci, MCP_ADRESI } from "@akredit/acik-mcp";

export { MCP_ADRESI };

export const CLAUDE_CODE_KOMUTU = `claude mcp add --transport http akredit ${MCP_ADRESI}`;

export interface Uygulama {
  kimlik: string;
  ad: string;
  istemci: Istemci;
  /** Rehberdeki adımlardan ilk kaçı bağlayıcıyı ekler. */
  adet: number;
  acik?: boolean;
  ek?: string;
  komut?: string;
}

export const UYGULAMALAR: Uygulama[] = [
  {
    kimlik: "claude",
    ad: "Claude (claude.ai ya da masaüstü uygulaması)",
    istemci: "claude_web",
    adet: 5,
    acik: true,
    ek: "Masaüstü uygulamasında da aynı menüler vardır.",
  },
  { kimlik: "chatgpt", ad: "ChatGPT", istemci: "chatgpt", adet: 4 },
];

export const GELISTIRICI_ARACLARI: Uygulama[] = [
  { kimlik: "claude-code", ad: "Claude Code", istemci: "claude_code", adet: 2, komut: CLAUDE_CODE_KOMUTU },
  { kimlik: "cursor", ad: "Cursor", istemci: "cursor", adet: 2 },
  { kimlik: "vscode", ad: "VS Code", istemci: "vscode", adet: 3 },
];

export const kurulumAdimlari = (u: Uygulama): Adim[] => baglayiciAdimlari(u.istemci).slice(0, u.adet);
