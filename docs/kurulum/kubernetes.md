# Kubernetes'e kurulum (Helm)

Şema: `infra/kurum-ici/helm/akredit`. Tek kurum, tek ad alanı. Veritabanı küme içinde StatefulSet olarak çalışır; kurumun yönetilen PostgreSQL'i varsa şema ileride buna göre genişletilmelidir (şimdilik desteklenmez).

> Bu şema bu İP'de `helm lint` / `helm template` ile **sınanamadı** (ortamda Helm yoktu). İlk kurulumdan önce aşağıdaki 0. adımı mutlaka çalıştırın.

## 0. Şemayı sına

```bash
helm lint infra/kurum-ici/helm/akredit --set surum=v0.3.0
helm template t infra/kurum-ici/helm/akredit --set surum=v0.3.0 --set yz.sunucu=vllm >/dev/null
infra/kurum-ici/denetle.sh        # helm kuruluysa lint/template ve "ağ ilkesi kapatılamaz" denetimini de yapar
```

## 1. Küme gereksinimleri

- NetworkPolicy uygulayan bir CNI (Calico, Cilium). **Uygulamayan CNI'de (ör. düz flannel) dışa çıkış yasağı çalışmaz.** Denetim: ad alanında bir pod açıp `curl -m 5 https://example.org` zaman aşımına düşmelidir.
- Varsayılan depolama sınıfı (veritabanı 50 Gi, model 100 Gi).
- Ingress denetleyicisi (varsayılan `nginx`) ve kurumun TLS sertifikası.
- GPU kullanılacaksa NVIDIA GPU Operator ya da cihaz eklentisi.

## 2. İmajlar ve gizli değerler

İnternete kapalı kümede imajlar kurumun iç kayıt defterine itilir:

```bash
demet-yukle.sh <demet>                    # bir yönetici makinesinde, imajlar Docker'a yüklenir
while read -r ad _; do docker tag "$ad" "kayit.kurum.example/$ad" && docker push "kayit.kurum.example/$ad"; done < <demet>/imajlar.txt
```

```bash
kubectl create namespace akredit
kubectl -n akredit create secret tls akredit-tls --cert=akredit.crt --key=akredit.key
kubectl -n akredit create secret generic akredit-gizli \
  --from-literal=POSTGRES_PASSWORD="$(openssl rand -hex 32)" \
  --from-literal=UYGULAMA_VT_PAROLA="$(openssl rand -hex 32)" \
  --from-literal=AKREDIT_ONAY_GIZLI="$(openssl rand -hex 32)" \
  --from-literal=AKREDIT_ANKET_GIZLI="$(openssl rand -hex 32)" \
  --from-literal=AKREDIT_TAKMA_AD_ANAHTARI="$(openssl rand -hex 32)" \
  --from-literal=S3_ERISIM_ANAHTARI=... --from-literal=S3_GIZLI_ANAHTAR=...
```

`POSTGRES_PASSWORD` yalnız göç işinin kullandığı süper kullanıcınındır; web ve işçi `UYGULAMA_VT_PAROLA` ile ayrıcalıksız `akredit_uyg` kullanıcısıyla bağlanır (`vt.uygulamaKullanici`). Eski bir kurulumu yükseltirken gizli nesneye `UYGULAMA_VT_PAROLA` anahtarını ekleyin; kullanıcıyı yükseltme kancası açar.

Parolalar onaltılık (hex) üretilmelidir: veritabanı adresine olduğu gibi yazılır, özel karakter adresi bozar. `AKREDIT_TAKMA_AD_ANAHTARI`'nın kopyasını kurum kasasında saklayın.

## 3. Model ağırlıkları

Şema `<sürüm>-modeller` adlı bir kalıcı birim açar. Demetteki `modeller.tar` bu birime bir kez açılır:

```bash
helm install akredit infra/kurum-ici/helm/akredit -n akredit -f degerler.yaml   # birim oluşur
kubectl -n akredit run model-yukle --rm -i --image=<kayıt>/ollama/ollama:0.4.7 --overrides='...birimi /modeller altına bağlayan pod...' -- tar -C /modeller -xf - < modeller.tar
kubectl -n akredit rollout restart deploy/akredit-model
```

## 4. Değerler ve kurulum

`degerler.yaml` örneği:

```yaml
surum: v0.3.0
imajlar:
  kayitDefteri: kayit.kurum.example
  web: ghcr.io/SAHIP/akredit-web
  isci: ghcr.io/SAHIP/akredit-isci
alanAdi: akredit.kurum.example
s3: { ucNoktasi: "http://s3.kurum.internal:9000", kova: akredit-kanit }
yz: { sunucu: vllm, model: Qwen2.5-14B-Instruct, gpu: 1 }
```

```bash
helm install akredit infra/kurum-ici/helm/akredit -n akredit -f degerler.yaml
```

Göçler `post-install` kancasıyla çalışır; ilk kurulumda web podları göçler bitene kadar hazır olmayabilir. `disariCikisYasak: false` verilirse şema kurulmaz.

## 5. Yükseltme ve geri dönüş

```bash
kubectl -n akredit exec akredit-vt-0 -- sh -c 'pg_dump -U akredit -d akredit -Fc' > yukseltme-oncesi.dump   # yedek
helm upgrade akredit infra/kurum-ici/helm/akredit -n akredit -f degerler.yaml --set surum=v0.4.0
helm rollback akredit -n akredit          # yalnız kod; şema yerinde kalır
```

Göçler `pre-upgrade` kancasıyla, yeni podlardan önce çalışır; göç başarısızsa Helm yükseltmeyi durdurur. Veriyle geri dönüş için [yukseltme-ve-geri-donus.md](yukseltme-ve-geri-donus.md) "Veriyle dönüş" bölümündeki sıra uygulanır (web/işçi `replicas=0`, `pg_restore`, `helm rollback`).
