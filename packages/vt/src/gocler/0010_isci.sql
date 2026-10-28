-- İşçi girişi (İP-36). Elle yazılmıştır.
-- 1) `isci_kurumlari()`: işçi ayrıcalıksız uygulama kullanıcısıyla (akredit_oturum üyesi) bağlanır. `kurum`
--    tablosunda satır güvenliği zorunlu olduğundan işlem dışında hiçbir kurumu göremez. Zamanlanmış işlerin
--    kurumları dolaşabilmesi için yalnız kimlikleri döndüren, tanımlayıcı haklarıyla çalışan işlev. Ad,
--    ayar ya da başka sütun vermez; kurumun içi yine `kiraciIslemi` ile, o kurumun kimliğiyle okunur.
-- 2) Kanıt parçalarında tam metin arama dizini (Türkçe kök bulucu). Gömme olmadığında arama bununla çalışır.

CREATE OR REPLACE FUNCTION isci_kurumlari() RETURNS SETOF uuid
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
  AS $$ SELECT id FROM kurum ORDER BY id $$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION isci_kurumlari() FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION isci_kurumlari() TO akredit_oturum;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS kanit_parcasi_tam_metin ON kanit_parcasi USING gin (to_tsvector('turkish', metin));
