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
    ek: "Masaüstü uygulamasında da aynı menüler vardır. Ücretsiz planda tek özel bağlayıcı eklenebilir; Team ve Enterprise planlarında bağlayıcıyı kuruluş sahibi ekler.",
  },
  { kimlik: "chatgpt", ad: "ChatGPT", istemci: "chatgpt", adet: 5 },
];

export const GELISTIRICI_ARACLARI: Uygulama[] = [
  { kimlik: "claude-code", ad: "Claude Code", istemci: "claude_code", adet: 2, komut: CLAUDE_CODE_KOMUTU },
  { kimlik: "cursor", ad: "Cursor", istemci: "cursor", adet: 2 },
  { kimlik: "vscode", ad: "VS Code", istemci: "vscode", adet: 3 },
];

export const kurulumAdimlari = (u: Uygulama): Adim[] => baglayiciAdimlari(u.istemci).slice(0, u.adet);

/**
 * Hocanın tek seferde kopyalayıp yapay zekâsına yapıştıracağı kurulum isteği (İP-49).
 * Asistan soru sormaz: çalıştığı uygulamayı kendisi bilir, araçları varsa kurulumu kendisi yapar, yoksa tek
 * mesajda numaralı adımlar verir. Giriş bilgisi istemesi yasaktır.
 */
export const KURULUM_ISTEGI = [
  `Akredit'i benim için kur. Akredit, yükseköğretimde akreditasyon ve Bologna işleri için ücretsiz bir MCP sunucusu. Adresi: ${MCP_ADRESI} (hesap ve giriş istemez).`,
  "1. Akredit araçların zaten bağlıysa hemen akredit istemini çalıştır ve bana yalnız hangi aracı kullanmak istediğimi sor.",
  "2. Bağlı değilse kurulumu sen yap, bana soru sorma: hangi uygulamada çalıştığını kendin bil. Komut çalıştırabiliyorsan (Claude Code gibi) bağlayıcıyı kendin ekle. Tarayıcı ya da bilgisayar kontrolün varsa ayar sayfasını kendin aç, adresi kendin yaz ve ekle; yalnız uygulamanın kendisi benden onay isterse ben onaylarım. Bunların hiçbiri yoksa tam olarak tıklayacağım yerleri tek mesajda, kısa ve numaralı yaz.",
  "3. Kurulum bitince araçları kendin dene; çalışıyorsa doğrudan akredit istemiyle başla. Yeni sohbet gerekiyorsa bunu tek cümleyle söyle.",
  "Benden parola ya da doğrulama kodu isteme.",
].join("\n");
