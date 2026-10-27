# Sürüm yükseltme ve geri dönüş

## Yükseltme

1. Hazırlık makinesinde yeni sürümün demetini oluşturun ([kurulum.md](kurulum.md) 1. adım; model aynıysa `--model-dizini` vermeyin).
2. Sürüm notlarını okuyun: ayar dosyasına yeni değişken eklendiyse `ornek.env` ile karşılaştırın.
3. Sunucuda:

```bash
sudo /opt/akredit-demet-v0.4.0/kurum-ici/demet-yukle.sh /opt/akredit-demet-v0.4.0
sudo cp -a /opt/akredit/kurum-ici /opt/akredit/kurum-ici.v0.3.0          # eski betikler (dönüş için)
sudo rsync -a --delete /opt/akredit-demet-v0.4.0/kurum-ici/ /opt/akredit/kurum-ici/
sudo /opt/akredit/kurum-ici/yukselt.sh v0.4.0
```

`yukselt.sh` sırası:

1. Yeni imajların yerelde olduğu denetlenir (internet gerekmez).
2. **Yükseltme öncesi yedek:** `vt` kapsayıcısında `vt-yedek.sh al` → `/var/lib/akredit/yedekler/yukseltme-<eski>-<yeni>-<zaman>.dump` ve `.sha256`. Yedek alınamazsa hiçbir şey değişmez. Var olan yedeğin üzerine yazılmaz.
3. Göçler yeni sürümün işçi imajıyla uygulanır. Her göç kendi işlemindedir (transaction); başarısız göç yarım kalmaz.
4. Web ve işçi yeni sürümle açılır; web 150 sn içinde sağlıklı olmalıdır.
5. Başarıda `surumler.log`'a satır eklenir. **Göç ya da sağlık denetimi başarısızsa** web ve işçi otomatik olarak eski sürüme döner ve betik, veriyle dönüş komutunu yazdırır.

Göçler geriye uyumlu yazılır (genişlet/daralt kuralı: [../isletim/surum-ve-geri-alma.md](../isletim/surum-ve-geri-alma.md)); bu yüzden eski kod yeni şemada çalışır ve çoğu durumda kod dönüşü yeterlidir.

## Geri dönüş

### Yalnız kod (sık, güvenli)

```bash
sudo /opt/akredit/kurum-ici/geri-don.sh v0.3.0
```

Şema ve veri yerinde kalır. Yükseltmeden sonra yazılan her şey korunur.

### Veriyle dönüş (nadir, yıkıcı)

Yalnız göç veriyi bozduysa ya da eski kod yeni şemada çalışmıyorsa. **Yedekten sonra yazılan her şey kaybolur.** Önce kurum yöneticisinin yazılı kararı alınır; karar, gerekçe ve zaman kayda geçirilir ve kullanıcılara duyurulur.

```bash
ls /var/lib/akredit/yedekler/                 # yükseltme öncesi yedeği bulun
sudo /opt/akredit/kurum-ici.v0.3.0/geri-don.sh v0.3.0 --yedek yukseltme-v0.3.0-v0.4.0-20261027T120000Z.dump
```

Sıra: web ve işçi durur → **dönüş öncesi mevcut durumun da yedeği alınır** (karar yanlışsa bu yedeğe dönülür) → yedek özeti doğrulanır (tutmazsa durur, veritabanına dokunulmaz) → veritabanı yeniden oluşturulup yedek yüklenir → eski sürüm açılır → sağlık denetimi → kayıt.

İlke 4 (değiştirilemez kayıt) notu: dönüş, yedek anındaki değiştirilemez günlüğü olduğu gibi geri getirir; yedekten sonraki günlük kayıtları dönüş öncesi yedekte (`geri-donus-oncesi-*.dump`) kalır. Bu dosya silinmez, kurum arşivine alınır.

## Tatbikat

Yükseltme ve dönüş, her büyük sürümden önce bir deneme sunucusunda prova edilir: [tatbikat.md](tatbikat.md).
