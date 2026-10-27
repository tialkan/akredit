# Sürüm, yayın ve geri alma

## Akış

| Olay | İmaj etiketi | Hedef | Onay |
|---|---|---|---|
| `main`'e push | `ana-<12 haneli sha>` | hazırlık | otomatik |
| `vX.Y.Z` etiketi | `vX.Y.Z` | üretim | GitHub `uretim` ortamında zorunlu onaylayıcı |

İş akışı: `.github/workflows/yayin.yml`. İmajlar `ghcr.io/<sahip>/akredit-web` ve `akredit-isci`; köken (provenance) ve SBOM ile yayımlanır. `latest` etiketi üretilmez ve kullanılmaz.

Sunucuda yayın `infra/uretim/dagit.sh` ile yapılır (iş akışı SSH ile bunu çağırır; elle de çalıştırılabilir). Sıra:

1. Sırlar belleğe açılır (`sirlar-ac.sh`).
2. Yeni imajlar çekilir. (Çekme başarısızsa hiçbir şey değişmez.)
3. Üretimde göç öncesi taban yedek alınır.
4. Göçler `goc` hizmetiyle (işçi imajı, `node infra/uretim/goc.ts`) uygulanır. **Göç başarısızsa** betik durur; eski sürüm çalışmaya devam eder.
5. Web ve işçi yeni sürümle yeniden açılır.
6. Web sağlık denetimi 150 sn içinde `healthy` olmazsa web ve işçi **otomatik olarak önceki sürüme** döner, betik hata verir.
7. Başarıda `/var/lib/akredit/<ortam>/surumler.log`'a satır eklenir.

## Göçlerin güvenli sırası (genişlet / daralt)

Göçler yalnız ileriye uygulanır; geri alma göçü yoktur. Bu yüzden her göç **bir önceki sürümün kodu da çalışabilecek** biçimde yazılır:

1. **Genişlet** (sürüm N): yeni sütun/tablo eklenir, eskisi kalır. Yeni sütun boş olabilir ya da varsayılanlıdır. Kod iki yere de yazar.
2. **Taşı**: veri arka planda yeni yapıya kopyalanır (işçi işi).
3. **Daralt** (sürüm N+1 ya da sonrası): eski sütun kaldırılır. Bu ancak N-1'e dönme ihtiyacı kalmadığında yapılır.

Yasak tek adımlar: sütun adını değiştirmek, sütun silmek, `NOT NULL`'u varsayılansız eklemek, tipi daraltmak. Değiştirilemez günlük ve kanıt tablolarında (ilke 4) hiçbir göç satır silmez ya da güncellemez.

Göç PR'ında inceleyen şu soruyu yanıtlar: "Bu göç uygulandıktan sonra bir önceki sürüm çalışır mı?"

## Geri alma

### Kod geri alma (sık, güvenli)

```bash
sudo infra/uretim/geri-al.sh uretim            # kayıttaki bir önceki sürüme
sudo infra/uretim/geri-al.sh uretim v0.4.1     # belirli sürüme
```

Göç çalıştırılmaz; şema yerinde kalır. Genişlet/daralt kuralı uyulduysa eski kod yeni şemada çalışır.

### Veriyle geri dönüş (nadir, yıkıcı)

Bir göç veriyi bozduysa: [yedekleme-ve-geri-donus.md](yedekleme-ve-geri-donus.md#b-belirli-bir-ana-yanlış-silme-bozuk-göç), dağıtım öncesi alınan taban yedekten göçün başladığı andan hemen öncesine dönülür. Bu andan sonra yazılan veriler kaybolur; karar ve gerekçesi kayda geçirilir, kullanıcılara duyurulur.

## Sürüm numarası

Anlamsal sürüm: `vBÜYÜK.KÜÇÜK.YAMA`. Etiket ana daldaki ve hazırlıkta denenmiş bir commit'e konur:

```bash
git tag -s v0.1.0 -m "v0.1.0" <sha> && git push origin v0.1.0
```

## GitHub kurulumu (kullanıcı)

Depo ayarlarında:

1. **Environments → `hazirlik`**: değişken `HAZIRLIK_SUNUCU` (adres), `HAZIRLIK_SSH_BILINEN` (`ssh-keyscan -t ed25519 SUNUCU` çıktısı); sır `DAGITIM_SSH_ANAHTARI`.
2. **Environments → `uretim`**: `URETIM_SUNUCU`, `URETIM_SSH_BILINEN`, `DAGITIM_SSH_ANAHTARI`; **Required reviewers** en az bir kişi; **Deployment branches and tags**: yalnız `v*.*.*` etiketleri.
3. Sunucuda `akredit` kullanıcısının `authorized_keys`'ine dağıtım açık anahtarı eklenir (yalnız bu iş için ayrı anahtar); `sudoers`'a yalnız şu izin:
   ```
   akredit ALL=(root) NOPASSWD: /opt/akredit/infra/uretim/dagit.sh
   ```
   Dikkat: `akredit` kullanıcısı `/opt/akredit`'e yazabildiği için bu izin pratikte root yetkisi demektir (betiği değiştirip sudo ile çalıştırabilir). Dağıtım anahtarı bu yüzden yalnız GitHub `hazirlik`/`uretim` ortam sırlarında durur. Daha sıkı ayrım (root sahipli salt okunur depo + ayrı çekme kullanıcısı) ileride yapılabilir.
4. GHCR paketleri ilk yayından sonra **private** ise sunucuda `docker login ghcr.io` (salt okunur paket belirteciyle) yapılır.

Değişkenler tanımlanmadıkça iş akışı yalnız imajları üretir, dağıtım adımları atlanır.
