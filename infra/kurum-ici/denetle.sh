#!/usr/bin/env bash
# Kurum içi kurulum paketinin durağan ve davranış denetimi. Docker sunucusu, ağ ya da sır gerektirmez.
#   1. Betik sözdizimi ve çalıştırma izni
#   2. Sabit imaj sürümleri (latest yok)
#   3. YAML ayrıştırma
#   4. Veri yerleşimi: yalnız caddy dış ağda; YZ adresi iç model; yurt dışı izni kapalı; model sunucusu çevrimdışı
#   5. docker compose config (sahte değerlerle; her model profiliyle)
#   6. Helm: ağ ilkesi açık; helm varsa lint + template
#   7. Demet: oluştur -> doğrula -> yükle; değiştirilmiş demet reddedilir (sahte docker ile)
#   8. Yerel model ayarı: yz-ayari.test.ts (yalnız iç adres, yurt dışı izni kapalı)
# Kullanım (depo kökünden): infra/kurum-ici/denetle.sh
set -euo pipefail

dizin="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
kok="$(cd "$dizin/../.." && pwd)"
hata=0
gec() { echo "  GEÇTİ  $*"; }
kal() { echo "  KALDI  $*"; hata=1; }
gecici="$(mktemp -d)"
trap 'rm -rf "$gecici"' EXIT

echo "1. Betik sözdizimi"
while IFS= read -r b; do
  if bash -n "$b"; then gec "${b#"$kok"/}"; else kal "${b#"$kok"/}"; fi
  [[ -x "$b" ]] || kal "${b#"$kok"/} çalıştırılabilir değil"
done < <(find "$dizin" -name '*.sh' | sort)

echo "2. Sabit imaj sürümleri"
if grep -rnE '(image:|_IMAJI=|: )[^#]*:latest\b' "$dizin" --include='*.yml' --include='*.yaml' --include='*.env'; then
  kal "latest etiketi bulundu"
else
  gec "latest yok"
fi
while IFS= read -r satir; do
  [[ "$satir" =~ ^[A-Z_]+_IMAJI=[^:@]+:[A-Za-z0-9._-]+(@sha256:[0-9a-f]{64})?$ ]] || kal "sürümsüz imaj: $satir"
done < <(grep -E '^[A-Z_]+_IMAJI=' "$dizin/surumler.env")
gec "surumler.env biçimi"
for ad in CADDY_IMAJI VT_IMAJI; do
  u="$(grep -E "^$ad=" "$kok/infra/uretim/surumler.env" | cut -d= -f2-)"
  k="$(grep -E "^$ad=" "$dizin/surumler.env" | cut -d= -f2-)"
  [[ "$u" == "$k" ]] && gec "$ad üretimle aynı ($k)" || kal "$ad üretimden farklı ($k / $u)"
done

echo "3. YAML ayrıştırma"
for y in "$dizin/docker-compose.yml" "$dizin/helm/akredit/Chart.yaml" "$dizin/helm/akredit/values.yaml"; do
  if python3 -c 'import sys,yaml; yaml.safe_load(open(sys.argv[1]))' "$y" 2>/dev/null; then gec "${y#"$kok"/}"; else kal "${y#"$kok"/}"; fi
done

echo "4. Veri yerleşimi"
python3 - "$dizin/docker-compose.yml" "$dizin/ornek.env" <<'PY' || hata=1
import re, sys, yaml
c = yaml.safe_load(open(sys.argv[1]))
ag = c["networks"]
sorun = 0
def kal(m):
    global sorun; sorun = 1; print("  KALDI ", m)
def gec(m): print("  GEÇTİ ", m)
for ad, h in c["services"].items():
    n = h.get("networks", [])
    adlar = list(n.keys()) if isinstance(n, dict) else list(n)
    if not adlar: kal(f"{ad}: ağ belirtilmemiş (varsayılan ağ dışa açıktır)"); continue
    if h.get("network_mode"): kal(f"{ad}: network_mode kullanılamaz")
    disa = [a for a in adlar if not (ag.get(a) or {}).get("internal")]
    if ad == "caddy":
        gec(f"caddy: dış ağ {disa} (tek açık hizmet)")
    elif disa:
        kal(f"{ad}: dışa açık ağda {disa}")
    else:
        gec(f"{ad}: yalnız iç ağlar {adlar}")
    if ad != "caddy" and h.get("ports"): kal(f"{ad}: port yayımlamamalı")
ortam = c["x-uygulama-ortami"]
if ortam.get("AKREDIT_YZ_YURT_DISI_IZIN") == "hayir": gec("yurt dışı izni sabit 'hayir'")
else: kal("AKREDIT_YZ_YURT_DISI_IZIN 'hayir' değil")
env = dict(l.split("=", 1) for l in open(sys.argv[2]).read().splitlines() if re.match(r"^[A-Z0-9_]+=", l))
if re.match(r"^http://model:\d+/v1$", env.get("AKREDIT_YZ_ADRES", "")): gec("örnek YZ adresi iç model")
else: kal("örnek YZ adresi iç model değil")
if env.get("AKREDIT_YZ_HAZIR") in ("ollama", "vllm"): gec("örnek YZ hazırı yerel")
else: kal("örnek YZ hazırı yerel değil")
v = c["services"]["vllm"]["environment"]
if v.get("HF_HUB_OFFLINE") == "1" and v.get("VLLM_NO_USAGE_STATS") == "1": gec("vLLM çevrimdışı, kullanım istatistiği kapalı")
else: kal("vLLM çevrimdışı ayarları eksik")
sys.exit(sorun)
PY
if grep -q 'yurtIci: true' <(grep -E '^\s+(vllm|ollama|sglang):' "$kok/packages/yz/src/saglayicilar/openai-uyumlu.ts"); then
  gec "@akredit/yz: vllm/ollama/sglang yurt içi sayılıyor"
else
  kal "@akredit/yz HAZIRLAR'da yerel sağlayıcı yurt içi değil"
fi
grep -q 'auto_https disable_certs' "$dizin/Caddyfile" && gec "Caddy: ACME kapalı" || kal "Caddy ACME açık"

echo "5. Compose yapılandırması"
if command -v docker >/dev/null && docker compose version >/dev/null 2>&1; then
  grep -E '^[A-Z0-9_]+=' "$dizin/ornek.env" | sed -E 's/=$/=sahte-deger/' >"$gecici/sahte.env"
  for p in "ollama depo" vllm; do
    profil=(); for x in $p; do profil+=(--profile "$x"); done
    if AKREDIT_SURUM=v0.0.0 docker compose --project-directory "$dizin" -f "$dizin/docker-compose.yml" \
      --env-file "$dizin/surumler.env" --env-file "$gecici/sahte.env" --profile goc "${profil[@]}" config -q; then
      gec "docker compose config (profil: $p)"
    else
      kal "docker compose config (profil: $p)"
    fi
  done
else
  echo "  ATLANDI docker compose yok"
fi

echo "6. Helm şeması"
grep -qE '^disariCikisYasak: true' "$dizin/helm/akredit/values.yaml" && gec "values: disariCikisYasak true" || kal "disariCikisYasak true değil"
grep -q 'kind: NetworkPolicy' "$dizin/helm/akredit/templates/ag-ilkesi.yaml" && gec "ağ ilkesi şablonu var" || kal "ağ ilkesi yok"
grep -q 'AKREDIT_YZ_YURT_DISI_IZIN' "$dizin/helm/akredit/templates/_helpers.tpl" && gec "Helm YZ ortamı yurt dışı izni kapalı" || kal "Helm YZ ortamı eksik"
if command -v helm >/dev/null; then
  if helm lint "$dizin/helm/akredit" --set surum=v0.0.0 >/dev/null; then gec "helm lint"; else kal "helm lint"; fi
  for s in ollama vllm; do
    if helm template t "$dizin/helm/akredit" --set surum=v0.0.0 --set yz.sunucu=$s >/dev/null; then gec "helm template ($s)"; else kal "helm template ($s)"; fi
  done
  if helm template t "$dizin/helm/akredit" --set surum=v0.0.0 --set disariCikisYasak=false >/dev/null 2>&1; then
    kal "disariCikisYasak=false kabul edildi"; else gec "disariCikisYasak=false reddedildi"; fi
else
  echo "  ATLANDI helm yok (şablonlar işlenmedi)"
fi

echo "7. Kurulum demeti (sahte docker ile)"
mkdir -p "$gecici/bin" "$gecici/model/blobs"
cat >"$gecici/bin/docker" <<'SAHTE'
#!/usr/bin/env bash
# Sahte docker: pull/inspect/save/load çağrılarını taklit eder.
d="${SAHTE_DOCKER_DIZINI:?}"
case "$1" in
  pull) [[ "$2" == *yok-boyle-imaj* ]] && exit 1; echo "$2" >>"$d/cekilen"; exit 0 ;;
  image) # image inspect [-f ...] ad
    ad="${!#}"
    if grep -qxF "$ad" "$d/yuklu" 2>/dev/null || grep -qxF "$ad" "$d/cekilen" 2>/dev/null; then
      [[ "$3" == "-f" ]] && echo "${ad%%:*}@sha256:$(printf '%s' "$ad" | sha256sum | cut -c1-64)"; exit 0
    fi; exit 1 ;;
  save) shift 2; printf '%s\n' "${@:2}" >"$1"; exit 0 ;;
  load) cat "$3" >>"$d/yuklu"; exit 0 ;;
esac
exit 1
SAHTE
chmod +x "$gecici/bin/docker"
printf 'agirlik' >"$gecici/model/blobs/sha256-sahte"
export SAHTE_DOCKER_DIZINI="$gecici"
D="$gecici/bin/docker"
if DOCKER="$D" WEB_IMAJ_ADI=ornek/web ISCI_IMAJ_ADI=ornek/isci "$dizin/demet-olustur.sh" v0.0.1 "$gecici/demet" \
  --model-dizini "$gecici/model" >/dev/null; then gec "demet oluşturuldu"; else kal "demet oluşturulamadı"; fi
[[ "$(wc -l <"$gecici/demet/imajlar.txt")" -eq $((2 + $(grep -cE '^[A-Z_]+_IMAJI=' "$dizin/surumler.env"))) ]] \
  && gec "imajlar.txt: uygulama + surumler.env imajları, özetli" || kal "imajlar.txt eksik"
grep -q '@sha256:' "$gecici/demet/imajlar.txt" && gec "içerik özetleri yazıldı" || kal "özet yok"
if DOCKER="$D" "$gecici/demet/kurum-ici/demet-yukle.sh" "$gecici/demet" --model-hedef "$gecici/hedef" >/dev/null; then
  gec "demet doğrulandı ve yüklendi"; else kal "demet yüklenemedi"; fi
[[ "$(cat "$gecici/hedef/blobs/sha256-sahte" 2>/dev/null)" == "agirlik" ]] && gec "model ağırlıkları açıldı" || kal "model açılmadı"
printf 'x' >>"$gecici/demet/kurum-ici/kur.sh"
if DOCKER="$D" "$gecici/demet/kurum-ici/demet-yukle.sh" "$gecici/demet" --model-hedef "$gecici/hedef2" >/dev/null 2>&1; then
  kal "değiştirilmiş demet kabul edildi"; else gec "değiştirilmiş demet reddedildi"; fi
[[ ! -e "$gecici/hedef2" ]] && gec "reddedilen demetten hiçbir şey yüklenmedi" || kal "reddedilen demetten yükleme yapıldı"
if DOCKER="$D" WEB_IMAJ_ADI=yok-boyle-imaj "$dizin/demet-olustur.sh" v0.0.1 "$gecici/demet2" >/dev/null 2>&1; then
  kal "bulunamayan imajla demet oluştu"; else gec "bulunamayan imaj demeti durdurdu"; fi

echo "8. Yerel model ayarı (node --test)"
if (cd "$kok" && node --test infra/kurum-ici/yz-ayari.test.ts >"$gecici/yz.log" 2>&1); then
  gec "yz-ayari.test.ts ($(grep -E '^# pass' "$gecici/yz.log" | awk '{print $3}') test)"
else
  kal "yz-ayari.test.ts"; cat "$gecici/yz.log"
fi

if ((hata)); then echo "SONUÇ: BAŞARISIZ"; exit 1; fi
echo "SONUÇ: BAŞARILI"
