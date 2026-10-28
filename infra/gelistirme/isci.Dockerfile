# syntax=docker/dockerfile:1.7
# apps/isci için imaj (CI ve yerel deneme). Depo kökünden derlenir:
#   docker build -f infra/gelistirme/isci.Dockerfile -t akredit-isci .
# Node TypeScript'i doğrudan çalıştırır; derleme adımı yoktur. Eskiden `pnpm deploy` kullanılıyordu; o yol iç
# paketleri node_modules altına kopyaladığı için Node .ts dosyalarının tiplerini ayıklamıyordu
# (ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING, İP-26 raporu). İP-36'dan beri infra/uretim/isci.Dockerfile ile
# aynı düzen: çalışma alanı korunur, iç paketler packages/ altında kalır.

ARG NODE_SURUMU=22-alpine

FROM node:${NODE_SURUMU} AS derleme
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /uygulama
COPY . .
RUN pnpm install --frozen-lockfile --prod --filter "@akredit/isci..." \
  && rm -rf apps/web apps/cli docs plan .github

FROM node:${NODE_SURUMU} AS calisma
ENV NODE_ENV=production
WORKDIR /uygulama
COPY --from=derleme --chown=node:node /uygulama ./
USER node
# Sağlık: /saglik (veritabanı, iş kuyruğu, yapılandırma). 503 ise kapsayıcı sağlıksız sayılır.
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.AKREDIT_ISCI_PORT||8080)+'/saglik').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
# Giriş noktası (İP-36): kuyruklar, zamanlanmış işler, SIGTERM'de zarif kapanış.
CMD ["node", "apps/isci/src/ana.ts"]
