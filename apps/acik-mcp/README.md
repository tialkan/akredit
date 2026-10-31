# @akredit/acik-mcp

Yükseköğretimde kalite güvencesi ve akreditasyon işleri için herkese açık MCP sunucusu. Kendi yapay zekâ aracınıza (Claude, Claude Code, Cursor, VS Code) bağlanır ve ona yedi araç verir:

| Araç | Ne yapar |
|---|---|
| `olcut_ara` | YÖKAK ölçütlerinde arama yapar. |
| `olcut_getir` | Bir ölçütün resmî metnini, üst ve alt ölçütlerini getirir. |
| `olgunluk_duzeyleri` | Alt ölçütün olgunluk düzeylerini ve örnek kanıtlarını getirir. |
| `oz_degerlendirme_iskeleti` | Öz değerlendirme raporu iskeletini çıkarır; her bölüm EKSİK işaretli ve gereken kanıt türleriyle gelir. |
| `bologna_denetle` | Bologna ders bilgisini eksik ve tutarsız alanlar için denetler. |
| `ck_pc_hesapla` | Ders öğrenme çıktısı ve program çıktısı sağlanma düzeyini hesaplar. |
| `rapor_dil_denetle` | Rapor metninde kanıtsız üstünlük, belirsiz özne gibi dil sorunlarını işaretler. |

## Salt okuma

- Bütün araçlar salt okumadır ve aynı girdiye aynı sonucu verir.
- Hesap ve anahtar gerekmez. Kurum verisine erişmez, hiçbir yere yazmaz, yapay zekâ modeli çağırmaz.
- Ölçüt metinleri resmî belgeden alınmıştır. Her yanıt kaynağını (belge adresi, sayfa, SHA-256) taşır. Belgeden alınamayan metin DOĞRULANMADI olarak döner.
- Sayılar yalnız hesaptan gelir; araçlar metin uydurmaz.
- Araçlara öğrenci adı, numarası ya da başka kişisel veri göndermeyin. Bağladığınız yapay zekâ hizmeti girdiyi kendi koşullarıyla işler.

## Bağlantı

İki yol var: akredit.org üzerindeki uzak sunucu ya da kendi bilgisayarınızda çalışan yerel sunucu. Menü adları istemcinin sürümüne göre değişebilir.

Uzak sunucu adresi:

```
https://akredit.org/mcp
```

### Claude (claude.ai)

Customize > Connectors > + Add > Add custom connector. Adres olarak `https://akredit.org/mcp` yazın ve oturum açma gerektirmeyen seçeneği (No sign in) seçin.

### Claude Code

Uzak sunucu:

```bash
claude mcp add --transport http akredit https://akredit.org/mcp
```

Yerel sunucu (Node.js 22.18 ya da üstü):

```bash
claude mcp add akredit -- npx -y @akredit/acik-mcp
```

### Cursor

`.cursor/mcp.json` (proje) ya da `~/.cursor/mcp.json` (bütün projeler):

```json
{
  "mcpServers": {
    "akredit": { "url": "https://akredit.org/mcp" }
  }
}
```

### VS Code

`.vscode/mcp.json`:

```json
{
  "servers": {
    "akredit": { "type": "http", "url": "https://akredit.org/mcp" }
  }
}
```

Ya da komut paletinden "MCP: Add Server".

### Yerel çalıştırma

```bash
npx -y @akredit/acik-mcp            # stdio sunucusu
npx -y @akredit/acik-mcp --http 8787 # yerel HTTP: http://localhost:8787/mcp
```

## YÖKAK ile bağı yoktur

Akredit bağımsız, açık kaynak bir araçtır. YÖKAK ya da başka bir akreditasyon kuruluşu ile bağı yoktur, onlar adına konuşmaz. Sonuçlar resmî değerlendirme yerine geçmez; beyan ve karar kurumdadır.

## Bağlantılar

- Kullanım sayfası: https://akredit.org/mcp-kullan
- Kaynak kodu: https://github.com/tialkan/akredit
- Lisans: Apache-2.0
