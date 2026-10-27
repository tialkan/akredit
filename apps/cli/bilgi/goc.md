# Çalışma klasörünü platforma taşıma kılavuzu

Akreddit'in adı artık Akredit. Komut satırında `akredit` ve eski `akreddit` adları aynı aracı çalıştırır; klasörün, kanıtların ve kayıtların biçimi değişmedi.

## Ne taşınır

Aktarım paketi kayıpsızdır:

- Kanıt dosyalarının kendisi (bayt bayt) ve SHA-256 özetleri,
- Program ve ders çıktıları,
- Öneriler ve kararlar (karar verenin adı ve zamanıyla),
- Yazma planları ve Bologna aktarımları,
- Adım günlüğünün tamamı, `gunluk/` ve `raporlar/` klasörlerindeki dosyalar.

Tarayıcı profili (`tarayici/`) taşınmaz; giriş bilgisi pakete girmez.

## Günlük zinciri

Her adım kaydı bir öncekine özetle bağlanır. Pakette tek bir adım değişir, silinir ya da araya kayıt girerse doğrulama hangi adımda kırıldığını söyler. Paketin bütünü ayrıca kendi özetiyle mühürlenir.

## Adımlar

1. Klasörde: `akredit aktar-paketi` (paket `kayit/aktarim/` altına yazılır; istersen `--cikti dosya.json`).
2. Doğrula: `akredit paket-dogrula <paket.json>`.
3. Göndermek için panelden bir anahtar al, `AKREDIT_ANAHTARI` ortam değişkenine yaz ve `akredit esitle` çalıştır. Kurum sunucusu için `--sunucu https://akredit.kurum.edu.tr`.
4. Bağlantı yoksa paket bilgisayarda kalır; çalışma çevrim dışı sürer, sonra yeniden dene.

Paketi başka bir bilgisayarda açmak için: `akredit paket-ac <paket.json> <yeni-klasor>`. Açılan klasörde de kayıtlar silinemez ve değiştirilemez.
