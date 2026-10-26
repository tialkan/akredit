# Bağımsız inceleme: 1. dalga (İP-01…07)

Tarih: 2026-10-27. Dal: `inceleme/dalga-1`. Yöntem: kod ve testler doğrudan okundu, `pnpm verify` çalıştırıldı; yazar raporlarına dayanılmadı.

## Düzeltilenler (testle kanıtlı)

1. **Türü yüksek riskli öneri politikayla karara bağlanabiliyordu (vt, ilke 3).** `oneri.risk` sütunu türün riskinden düşük yazılabiliyordu (ör. `dis_gonderim` + `dusuk`). Karar tetikleyicisi yalnız bu sütuna baktığından, bu türü kapsayan bir politika (`en_yuksek_risk = dusuk`) ile dış gönderim kararı kişisiz geçiyordu. Düzeltme: `0003_tur_riski.sql` — `oneri_turu_riski()`, öneri eklemede tür riskinden düşük risk reddi, politikada yüksek riskli tür reddi, karar tetikleyicisinde etkin risk = `greatest(risk, tür riski)`. Test: `packages/vt/test/inceleme.test.ts` (4 test, düzeltmeden önce 4'ü de başarısızdı).
2. **Ajan döngüsünde araç çıktısı modele sarılmadan gidiyordu (yz, ilke 5).** Belge/web okuyan araçların çıktısı sınırlayıcısız, talimat kalıbı işaretlenmeden aktarılıyordu. Düzeltme: `ajanCalistir` araç çıktısını `guvenilmeyenSar` ile sarar. Test: `ajan-yapilandirilmis.test.ts` içinde etiket taklidi ve talimat kalıbı örneği.

## Açık bulgular (önem sırasıyla)

1. **Orta — Kişi kimlikleri kiracı sınırını aşabilir (vt).** `karar.karar_veren_kisi_id`, `yetki_politikasi.imzalayan_kisi_id` ve benzeri `kisi` yabancı anahtarları kurum denetlemez; FK denetimi RLS'yi atladığından başka kurumun kişisi karar veren/imzalayan olarak yazılabilir. Öneri: `(kurum_id, kisi_id)` bileşik FK ya da tetikleyici.
2. **Orta — Yetki politikasının birim/program kapsamı veritabanında uygulanmıyor.** `karar_denetle` `birim_idleri`/`program_idleri` sütunlarına bakmaz; yalnız `@akredit/cekirdek politikaUygulanirMi` bakar. Öneri konumu şemada olmadığı için İP-13'te çözülmeli.
3. **Orta — Çekirdek `politikaUygulanirMi` iptal edilmiş politikayı bilmez.** İptal yeni kayıtla yapılıyor (`iptal_ettigi_id`), ama çekirdek işlevi iptal kayıtlarını almıyor; yalnız VT tetikleyicisi yakalıyor. İP-13'te imza eklenmeli.
4. **Düşük — Sayı güvencesi yazıyla yazılmış sayıları yakalamaz (yz `sayilariDenetle`).** "beş toplantı", "yüzde kırk" gibi ifadeler dayanaksız sayı olarak işaretlenmez. Model metnindeki sayı bu yolla rapora sızabilir; İP-20 rapor hattında ek kural (yazıyla sayı sözlüğü) önerilir.
5. **Düşük — KVKK maskesi sabit hat telefonlarını kapsamaz.** `TELEFON` deseni yalnız 5xx cep numaralarını yakalar (ör. 0212 … maskelenmez).
6. **Düşük — Günlüğe aktör türü serbest yazılır.** Uygulama rolü `gunluk` kaydında `aktor.tur = kisi` ve herhangi bir kimlik yazabilir; aktörün oturumla bağlanması İP-09/İP-12'ye kalıyor.
7. **Bilgi — Web paneli yalnız bellek veri kaynağıyla çalışıyor**; yüksek risk toplu onay yasağı ve politika türü denetimi `BellekVeriKaynagi` içinde doğru, gerçek API'de (İP-12) yeniden uygulanmalı (VT tetikleyicisi artık son savunma hattı).

## Durum

`pnpm verify` temiz. VT testleri 39 → 43, YZ testleri 100 → 101.
