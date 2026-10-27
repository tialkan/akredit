-- Uygulama oturum rolü (İP-27, inceleme dalga 3 #1). Elle yazılmıştır.
-- Üretimde web ve işçi veritabanına kapsayıcının süper kullanıcısıyla bağlanıyordu: işlem dışındaki
-- sorgular satır güvenliğini atlıyor, yalnız-ekleme tetikleyicileri kapatılabiliyordu. Bu göç, giriş
-- kullanıcılarının (altyapı oluşturur) üye olacağı ayrıcalıksız `akredit_oturum` rolünü tanımlar:
--   * süper kullanıcı değil, satır güvenliğini atlayamaz, tablo sahibi değil (tetikleyici kapatamaz);
--   * `akredit_uygulama` üyesidir: `kiraciIslemi` içindeki `set local role akredit_uygulama` çalışır;
--   * kimlik katmanı tablolarına (kiracı tablosu değil) açık ilkeyle erişir.
-- Kiracı tablolarında satır güvenliği zorunlu olduğundan, işlem dışındaki sorgu hiçbir kurumun
-- satırını görmez.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'akredit_oturum') THEN
    CREATE ROLE akredit_oturum NOLOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION;
  END IF;
END
$$;
--> statement-breakpoint
GRANT akredit_uygulama TO akredit_oturum;
--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO akredit_oturum;
--> statement-breakpoint
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['kimlik_kullanici','kimlik_oturum','kimlik_hesap','kimlik_dogrulama',
                            'kimlik_sso_saglayici','kimlik_uyelik','kimlik_davet','kimlik_api_anahtari',
                            'kimlik_giris_izi','istek_tekrari']
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO akredit_oturum', t);
    EXECUTE format('DROP POLICY IF EXISTS oturum_erisimi ON %I', t);
    EXECUTE format('CREATE POLICY oturum_erisimi ON %I TO akredit_oturum USING (true) WITH CHECK (true)', t);
  END LOOP;
END
$$;
