-- Eklentiler ve roller. Elle yazılmıştır; tekrar çalıştırmak bir şey değiştirmez.
-- sha256() ve gen_random_uuid() PostgreSQL 13+ ile yerleşik geldiği için pgcrypto gerekmez.
CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
DO $$
BEGIN
  -- Göçleri çalıştıran ve tabloların sahibi olan rol (üretimde altyapı oluşturur; burada yalnız yoksa).
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'akredit_sahip') THEN
    CREATE ROLE akredit_sahip NOLOGIN;
  END IF;
  -- Uygulamanın kullandığı rol: satır güvenliğini atlayamaz, yalnız gereken DML yetkileri vardır.
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'akredit_uygulama') THEN
    CREATE ROLE akredit_uygulama NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE;
  END IF;
END
$$;
