# ADR-0005: Alan modelinde Türkçe (ASCII) adlandırma

- Durum: kabul edildi (2026-10-23)

## Bağlam

Akreddit kodu alan kavramlarını Türkçe adlandırıyordu (`kanit`, `cikti`, `oneri`, `karar`). Ürün Türk yükseköğretim mevzuatına ve terimlerine dayanır; çeviri anlam kaybına yol açar.

## Karar

- Alan modeli, tablo ve işlev adları Türkçe, ASCII karakterlerle yazılır (`kanit_parcasi`, `olcmeSonucu`).
- Betik adları ve genel teknik terimler (build, test, typecheck, props) standart İngilizce kalır.
- Kullanıcıya görünen metinler ve kod yorumları Türkçedir.

## Sonuçlar

- Yeni katkıcılar için `docs/mimari.md` sözlüğü başvuru kaynağıdır.
