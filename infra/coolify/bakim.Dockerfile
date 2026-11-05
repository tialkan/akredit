# Güncelleme penceresi sayfası: küçük, durağan, ana uygulamadan bağımsız (İP-49).
FROM nginx:1.27.5-alpine
COPY infra/coolify/bakim/nginx.conf /etc/nginx/conf.d/default.conf
COPY infra/coolify/bakim/index.html infra/coolify/bakim/isaret.svg /usr/share/nginx/html/
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1/isaret.svg >/dev/null || exit 1
