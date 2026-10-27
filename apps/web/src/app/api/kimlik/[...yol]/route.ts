// Kimlik uç noktaları (Better Auth): sihirli bağlantı, kurumsal tek oturum (OIDC/SAML), oturum.

import { tekiller } from "../../_ortak/sunucu.ts";

export const dynamic = "force-dynamic";

async function isle(istek: Request): Promise<Response> {
  const { kimlik } = await tekiller();
  return kimlik.auth.handler(istek);
}

export { isle as GET, isle as POST };
