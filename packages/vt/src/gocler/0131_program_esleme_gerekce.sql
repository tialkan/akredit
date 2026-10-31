-- Program tablo eşlemesi önerisinin gerekçesi ve kaynakları (İP-47, YZ öneri görevi). Elle yazılmıştır.
--
-- Öneri (YZ ya da kişi) gerekçe metni ve dayandığı kayıtları (Bologna okuma kanıtı ve ders kodu, PÇ metni,
-- kurul çıktısı) taşıyabilir. Karar satırında gerekçe boştur; kararın dayanağı `dayanak` sütunundadır.
-- Tablo yalnız eklenir; bu sütun da sonradan değiştirilemez.

ALTER TABLE program_esleme ADD COLUMN gerekce jsonb;
--> statement-breakpoint
ALTER TABLE program_esleme ADD CONSTRAINT program_esleme_gerekce CHECK (
  gerekce IS NULL OR (durum = 'oneri' AND jsonb_typeof(gerekce) = 'object')
);
