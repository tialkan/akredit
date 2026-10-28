# syntax=docker/dockerfile:1.7
# apps/web için çok aşamalı imaj (Next.js standalone). Depo kökünden derlenir:
#   docker build -f infra/gelistirme/web.Dockerfile -t akredit-web .
# Son aşamada yalnız derleme çıktısı vardır; kaynak, .env ve geliştirme bağımlılıkları imaja girmez.

ARG NODE_SURUMU=22-alpine

FROM node:${NODE_SURUMU} AS derleme
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0 NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /depo
COPY . .
RUN pnpm install --frozen-lockfile --filter "@akredit/web..." && pnpm --filter @akredit/web build

FROM node:${NODE_SURUMU} AS calisma
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /uygulama
COPY --from=derleme --chown=node:node /depo/apps/web/.next/standalone ./
COPY --from=derleme --chown=node:node /depo/apps/web/.next/static ./apps/web/.next/static
COPY --from=derleme --chown=node:node /depo/apps/web/public ./apps/web/public
# Yerel nesne deposu (Coolify: işçiyle aynı `akredit-kanit` birimi /veri/kanit'e bağlanır).
RUN mkdir -p /veri/kanit && chown node:node /veri/kanit
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "apps/web/server.js"]
