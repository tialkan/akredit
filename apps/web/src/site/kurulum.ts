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

/**
 * Hocanın tek seferde kopyalayıp yapay zekâsına yapıştıracağı kurulum isteği (İP-49).
 * Asistan bağlayıcıyı ayarlara kendisi ekleyemez; hocayı adım adım yönlendirir. Tarayıcı aracı varsa
 * ayar sayfasını açabilir ama kaydetmeyi hoca yapar. Giriş bilgisi istemesi yasaktır.
 */
export const KURULUM_ISTEGI = [
  `Akredit'i kurmama yardım et. Akredit, yükseköğretimde akreditasyon ve Bologna işleri için ücretsiz bir MCP sunucusu. Adresi: ${MCP_ADRESI} (hesap ve giriş istemez).`,
  "1. Akredit araçların zaten bağlıysa doğrudan akredit istemini çalıştır ve bana hangi aracı kullanmak istediğimi sor.",
  "2. Bağlı değilse önce hangi uygulamayı kullandığımı sor (Claude web sitesi, Claude masaüstü, ChatGPT ya da başka). Sonra bu adresi özel bağlayıcı olarak eklememi çok kısa adımlarla, her seferinde tek adım anlat ve her adımdan sonra tamam dememi bekle. Tarayıcıyı kullanabiliyorsan ayar sayfasını sen aç, ama kaydet düğmesine ben basayım.",
  "3. Kurulum bitince yeni bir sohbet açmamı ve akredit yazmamı söyle.",
  "Benden parola ya da doğrulama kodu isteme.",
].join("\n");
