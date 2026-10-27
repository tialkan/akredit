// Kimlik uç noktaları (Better Auth): sihirli bağlantı, kurumsal tek oturum (OIDC/SAML), oturum.
// Oturum kapatma yanıtı cihazdaki onay listesi önbelleğini de temizletir (inceleme dalga 3).

import { cikisYanitiniSertlestir } from "../../../panel/onaylar/mobil.ts";
import { tekiller } from "../../_ortak/sunucu.ts";

export const dynamic = "force-dynamic";

async function isle(istek: Request): Promise<Response> {
  const { kimlik } = await tekiller();
  return cikisYanitiniSertlestir(new URL(istek.url).pathname, await kimlik.auth.handler(istek));
}

export { isle as GET, isle as POST };
