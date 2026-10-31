-- Program eşlemesine disiplin ya da program seçimi (İP-47). Elle yazılmıştır.
--
-- MÜDEK EK-1 disipline özgü konular ve FEDEK programa özgü ölçütler için programın hangi disipline ya da
-- programa girdiğini kurum seçer; Akredit program adından tahmin etmez. Seçim `ozgu_bolum` türünde,
-- `anahtar = 'bolum'` ile, değer bölüm kodları dizisi olarak yalnız eklenir. Karar kuralları değişmez:
-- kararda karar veren kişi ve dayanak zorunlu, son karar geçerli.

ALTER TABLE program_esleme DROP CONSTRAINT program_esleme_tur;
--> statement-breakpoint
ALTER TABLE program_esleme ADD CONSTRAINT program_esleme_tur CHECK (
  tur IN ('ders_kategorisi', 'pc_kurul', 'secmeli_yer', 'ozgu_bolum')
);
--> statement-breakpoint
ALTER TABLE program_esleme DROP CONSTRAINT program_esleme_deger;
--> statement-breakpoint
ALTER TABLE program_esleme ADD CONSTRAINT program_esleme_deger CHECK (
  (tur = 'ders_kategorisi' AND jsonb_typeof(deger) = 'string')
  OR (tur = 'pc_kurul' AND jsonb_typeof(deger) = 'array')
  OR (tur = 'ozgu_bolum' AND jsonb_typeof(deger) = 'array' AND jsonb_array_length(deger) > 0 AND anahtar = 'bolum'
      AND cerceve_kod IS NOT NULL)
  OR (tur = 'secmeli_yer' AND jsonb_typeof(deger) = 'number' AND (deger #>> '{}')::numeric >= 0
      AND (deger #>> '{}')::numeric = floor((deger #>> '{}')::numeric))
);
