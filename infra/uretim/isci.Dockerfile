# syntax=docker/dockerfile:1.7
# Üretim işçi + göç imajı. Depo kökünden derlenir:
#   docker build -f infra/uretim/isci.Dockerfile -t akredit-isci .
#
# Neden infra/gelistirme/isci.Dockerfile değil: o imaj `pnpm deploy` kullanır ve iç paketleri
# (@akredit/vt ...) node_modules altına kopyalar. Node, node_modules altındaki .ts dosyalarının
# tiplerini ayıklamaz (ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING); bu İP'de yerelde
# `pnpm deploy` çıktısında `import("@akredit/vt")` bu hatayla düştü. Burada çalışma alanı
# düzeni korunur: iç paketler packages/ altında kalır, node_modules yalnız bağlantı içerir.
#
# Aynı imaj göçleri de çalıştırır:  node infra/uretim/goc.ts

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
RUN mkdir -p /veri/kanit && chown node:node /veri/kanit
USER node
# Sağlık: /saglik (veritabanı, iş kuyruğu, yapılandırma). 503 ise kapsayıcı sağlıksız sayılır.
HEALTHCHECK --interval=30s --timeout=10s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.AKREDIT_ISCI_PORT||8080)+'/saglik').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
# Giriş noktası (İP-36): kuyruklar, zamanlanmış işler, SIGTERM'de zarif kapanış.
CMD ["node", "apps/isci/src/ana.ts"]
