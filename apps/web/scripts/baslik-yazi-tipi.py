# Başlık yazı tipinin (Source Serif 4, 600, OFL 1.1) Türkçe alt kümesini üretir.
# Neden: başlık yazı tipi yalnız h1 ve h2'de kullanılır; paketin latin ve latin-ext dosyaları birlikte ~40 KB'tır.
# Türkçe metin için gereken karakterlere indirilince ~18 KB kalır ve tanıtım sitesinin aktarım bütçesi
# (e2e/butceler.ts) aşılmaz.
# Kullanım (fonttools ve brotli gerekir): python3 -I apps/web/scripts/baslik-yazi-tipi.py
from pathlib import Path

from fontTools import subset

KOK = Path(__file__).resolve().parent.parent
KAYNAK = KOK / "node_modules/@fontsource/source-serif-4/files"
HEDEF = KOK / "src/app/yazi"

# Temel Latin, Latin-1 (â, î, û, ç, ö, ü ve noktalama), § ve tipografik tırnaklar, üç nokta.
LATIN = "U+0020-007E,U+00A0-00FF,U+2018-201E,U+2026,U+2060"
# Türkçeye özgü: Ğ ğ, İ ı, Ş ş.
TURKCE = "U+011E-011F,U+0130-0131,U+015E-015F"

for ad, aralik in (("latin", LATIN), ("latin-ext", TURKCE)):
    secenek = subset.Options()
    secenek.flavor = "woff2"
    secenek.layout_features = ["kern", "liga", "lnum", "tnum"]
    font = subset.load_font(str(KAYNAK / f"source-serif-4-{ad}-600-normal.woff2"), secenek)
    s = subset.Subsetter(secenek)
    s.populate(unicodes=subset.parse_unicodes(aralik))
    s.subset(font)
    HEDEF.mkdir(exist_ok=True)
    cikti = HEDEF / f"source-serif-4-600-{ad}.woff2"
    subset.save_font(font, str(cikti), secenek)
    print(cikti.name, cikti.stat().st_size)
