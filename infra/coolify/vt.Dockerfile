# Coolify için veritabanı imajı: ilk açılış betikleri ve ayar dosyası imaja gömülür
# (Coolify'da depodan dosya bağlamak yerine). Sürüm infra/uretim/surumler.env ile aynı.
FROM pgvector/pgvector:0.8.0-pg17
COPY infra/uretim/postgres/postgresql.conf /etc/postgresql/postgresql.conf
COPY infra/uretim/postgres/01-yedek-kullanici.sh /docker-entrypoint-initdb.d/01-yedek-kullanici.sh
COPY infra/uretim/postgres/02-uygulama-kullanicilari.sh /docker-entrypoint-initdb.d/02-uygulama-kullanicilari.sh
