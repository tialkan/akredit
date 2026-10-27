# Güvenlik belgeleri

İP-27 ile oluşturuldu (2026-10-27). Bu klasör Akredit'in güvenlik durumunun tek kaynağıdır.

| Belge | İçerik |
|---|---|
| [tehdit-modeli.md](tehdit-modeli.md) | Varlıklar, güven sınırları, STRIDE tablosu, YZ'ye özgü riskler |
| [asvs-l2.md](asvs-l2.md) | OWASP ASVS 4.0.3 düzey 2 kontrol listesi: durum, kanıt (dosya/test), açık kalemler |
| [bulgular.md](bulgular.md) | İnceleme dalgaları ve İP-27 bulgularının durumu (açık/kapandı), önem derecesi |
| [dis-denetim-kapsami.md](dis-denetim-kapsami.md) | Bağımsız sızma testi kapsamı ve teklif isteme taslağı (insan işi) |

Sorumlu bildirim süreci kök dizindeki `SECURITY.md` dosyasındadır.

## Üretime çıkış kuralı

Kritik ya da yüksek önemde **açık** bulgu varken üretime çıkılmaz (İP-27 kabul ölçütü). Durum
[bulgular.md](bulgular.md) tablosundan okunur; dış denetim raporu geldiğinde bulguları aynı tabloya eklenir.

## Veritabanı rolleri (İP-27)

| Rol | Giriş | Ne yapar |
|---|---|---|
| `POSTGRES_USER` (kapsayıcı süper kullanıcısı) | evet | Yalnız göçler (`goc` hizmeti) ve bakım. Uygulama bu kullanıcıyla bağlanmaz. |
| `akredit_sahip` | hayır | Tablo sahibi rolü (göç 0000). |
| `akredit_oturum` | hayır | Web ve işçinin giriş kullanıcısının üye olduğu rol (göç 0008): süper kullanıcı değil, satır güvenliğini atlayamaz, tablo sahibi değil; kimlik tablolarına açık ilkeyle erişir, `akredit_uygulama` rolüne geçebilir. |
| `akredit_uygulama` | hayır | Kiracı işlemi (`kiraciIslemi`) içinde etkin rol; kiracı tablolarında satır güvenliği zorunlu. |
| `UYGULAMA_VT_KULLANICI` | evet | `akredit_oturum` üyesi giriş kullanıcısı; pg-boss şeması için veritabanında CREATE yetkisi. |
| `IZLEME_VT_KULLANICI` | evet | Yalnız `pg_monitor` (postgres-exporter). |
| `YEDEK_KULLANICI` | evet | Yalnız REPLICATION. |

Yeni kurulumda kullanıcılar `infra/uretim/postgres/02-uygulama-kullanicilari.sh` ile ilk açılışta oluşur.
**Var olan kurulumda** bu betik çalışmaz. Sürümü dağıtmadan önce göçleri çalıştırın (0008 rolü kurar),
sonra yönetici olarak bir kez şunu çalıştırın (parolaları gizli kasadan verin), `.env` dosyasına
`UYGULAMA_VT_*` ve `IZLEME_VT_*` değerlerini ekleyin:

```sql
CREATE ROLE akredit_uyg WITH LOGIN NOSUPERUSER NOBYPASSRLS NOCREATEDB NOCREATEROLE NOREPLICATION
  IN ROLE akredit_oturum PASSWORD '<gizli kasadan>';
GRANT CONNECT, CREATE ON DATABASE akredit TO akredit_uyg;
-- pg-boss şeması önceden süper kullanıcıyla kurulduysa sahipliği devredin:
ALTER SCHEMA pgboss OWNER TO akredit_uyg;
CREATE ROLE akredit_izleme WITH LOGIN IN ROLE pg_monitor PASSWORD '<gizli kasadan>';
GRANT CONNECT ON DATABASE akredit TO akredit_izleme;
```

İlk açılış betiği ve göçler gerçek PostgreSQL 16 + pgvector üzerinde sınandı (İP-27 raporu), ama
Docker Compose ile uçtan uca dağıtım ve var olan kurulumun geçişi sınanmadı; hazırlık ortamında
`dagit.sh hazirlik` ile denenmeden üretime uygulanmamalıdır. Kurum içi kurulum (`infra/kurum-ici`)
henüz eski düzendedir.
