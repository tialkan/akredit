# syntax=docker/dockerfile:1.7
# apps/isci için çok aşamalı imaj. Depo kökünden derlenir:
#   docker build -f infra/gelistirme/isci.Dockerfile -t akredit-isci .
# Node TypeScript'i doğrudan çalıştırır; derleme adımı yoktur. `pnpm deploy` yalnız üretim bağımlılıklarını taşır.

ARG NODE_SURUMU=22-alpine

FROM node:${NODE_SURUMU} AS derleme
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable
WORKDIR /depo
COPY . .
RUN pnpm install --frozen-lockfile --filter "@akredit/isci..." \
  && pnpm --filter @akredit/isci deploy --prod --legacy /cikti

FROM node:${NODE_SURUMU} AS calisma
ENV NODE_ENV=production
WORKDIR /uygulama
COPY --from=derleme --chown=node:node /cikti ./
USER node
# İşçi HTTP sunmaz; sağlık denetimi giriş modülünün yüklenebildiğini sınar. İP-10/14 işçiyi
# kalıcı sürece çevirdiğinde kuyruk bağlantısını sınayan bir denetimle değiştirilmeli.
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node -e "import('/uygulama/src/index.ts').then(()=>process.exit(0),()=>process.exit(1))"
CMD ["node", "src/index.ts"]
