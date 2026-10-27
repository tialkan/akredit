# Yerel model sunucusu

Akredit'in yapay zekâ katmanı (`@akredit/yz`) OpenAI uyumlu her sunucuyla konuşur. Kurum içi kurulumda yalnız **Ollama**, **vLLM** ve **SGLang** seçilebilir; adres iç ağda olmalıdır (`infra/kurum-ici/yz-ayari.ts` denetler).

Yapay zekâ Akredit'te öneri üretir: kanıt sınıflama, toplantı bilgisi çıkarma, taslak metin. Sayılar modelden gelmez, her olgusal cümle kanıta bağlanır, onay insandadır. Bu yüzden zayıf bir model **yanlış kayıt üretmez**, yalnız daha çok öneriyi "insan incelemeli" durumuna düşürür. Model seçiminde ölçüt budur: önerilerin ne kadarının şema ve atıf denetiminden geçtiği.

## Sunucu seçimi

| | Ollama | vLLM | SGLang |
|---|---|---|---|
| Donanım | CPU ya da tek GPU | NVIDIA GPU (gerekli) | NVIDIA GPU (gerekli) |
| Model biçimi | GGUF (nicemlenmiş) | Hugging Face (safetensors), AWQ/GPTQ | Hugging Face |
| Eşzamanlı kullanıcı | Az (sıralı) | Çok (sürekli toplu işleme) | Çok |
| JSON şemaya bağlı çıktı | İstem yoluyla | Yerel (`response_format`) | İstem yoluyla (Akredit tarafında) |
| Kurulum paketinde | `--profile ollama` | `--profile vllm` | Compose'ta yok; `AKREDIT_YZ_HAZIR=sglang` ile dış (iç ağdaki) sunucu |

Öneri: deneme ve küçük birimlerde Ollama; fakülte ve üniversite genelinde vLLM.

## Aday modeller

Aşağıdaki modeller açık ağırlıklı, Türkçe metin üretebilen ve araç çağrısı / JSON çıktısı destekleyen ailelerdir. **Akredit görevlerinde Türkçe başarımları bu İP'de ölçülmedi (DOĞRULANMADI)**: ortamda model sunucusu ve GPU yoktu. Kurum, aşağıdaki "Ölçüm" adımını kendi donanımında çalıştırıp sonucu saklamalıdır. Lisans koşulları model kartından okunmalıdır (DOĞRULANMADI); kurumun kullanımına uygunluğu kurum hukuk birimi onaylar.

| Aile | Boyutlar (örnek) | Not |
|---|---|---|
| Qwen2.5 Instruct | 7B, 14B, 32B, 72B | Çok dilli, uzun bağlam; Ollama: `qwen2.5:14b` |
| Llama 3.1 / 3.3 Instruct | 8B, 70B | Lisans: Llama topluluk lisansı |
| Gemma 2 | 9B, 27B | Lisans: Gemma kullanım koşulları |
| Mistral Small | 22B–24B | |

Daha yeni sürümler çıktıkça aynı ölçümle karşılaştırın; tabloyu güncel tutmak kurumun işidir.

## Donanım: bellek hesabı

Model ağırlıklarının bellek ihtiyacı yaklaşık **parametre sayısı × parametre başına bayt**tır:

| Biçim | Bayt/parametre | 7B | 14B | 32B | 72B |
|---|---|---|---|---|---|
| FP16/BF16 | 2 | 14 GB | 28 GB | 64 GB | 144 GB |
| 8 bit | 1 | 7 GB | 14 GB | 32 GB | 72 GB |
| 4 bit (Q4, AWQ) | ~0,5 | ~3,5 GB | ~7 GB | ~16 GB | ~36 GB |

(Hesap: 14×10⁹ parametre × 2 bayt = 28×10⁹ bayt ≈ 28 GB. 4 bit biçimlerde ölçek katsayıları nedeniyle gerçek boyut biraz büyüktür.) Buna bağlam önbelleği (KV) eklenir: uzun belgeler ve çok sayıda eşzamanlı istek için ağırlıkların üstüne **%20–50 pay** bırakın. CPU'da (Ollama) aynı hesap sistem belleği için geçerlidir; yanıt süresi GPU'ya göre çok daha uzundur.

Başlangıç önerileri (ölçümle doğrulanmalı):

- 1 × 24 GB GPU: 14B 4 bit (Ollama) ya da 14B AWQ (vLLM).
- 1 × 48 GB GPU: 32B 4 bit ya da 14B BF16.
- 2 × 80 GB GPU: 72B 4 bit/8 bit, vLLM `--tensor-parallel-size 2` (compose'ta `vllm` komutuna eklenir).

## Ölçüm (kurumda yapılır)

`infra/kurum-ici/model-olc.ts`, `@akredit/yz` değerlendirme düzeneğini kurumun modeliyle çalıştırır: kanıt sınıflama ve toplantı bilgisi görevlerinin kurgu altın örnekleri; şema geçerliliği, atıf geçerliliği ve alan doğruluğu. İstek yalnız iç adrese gider.

```bash
# Sunucuda, işçi kapsayıcısının içinden (iç ağda `model` adı çözülür):
docker compose -p akredit-kurum exec -T isci node infra/kurum-ici/model-olc.ts | tee model-olcum-$(date +%F).txt
```

Eşik: atıf ve şema geçerliliği %100. Karşılamayan modelle Akredit yine çalışır, ancak öneriler insan incelemesine düşer. Sonuç dosyasını model seçimi kararının kanıtı olarak saklayın. Ölçüm örnekleri azdır (kurgu); kurum kendi kanıtlarından (kişisel veri içermeyen) örnekler ekleyerek ölçümü genişletebilir.

## Veri yurt dışına çıkmaz: nasıl güvence altında

1. **Ağ:** web, işçi ve model Docker `internal` ağlarındadır (Kubernetes'te `NetworkPolicy`); internete yol yoktur. `denetle.sh` her hizmetin ağını denetler.
2. **Ayar:** `yz-ayari.ts` yalnız `ollama`/`vllm`/`sglang` hazırlarını, iç ana makine adlarını ya da özel IP'leri kabul eder; yurt dışı iznini açmaz.
3. **Politika:** `@akredit/yz` `politikaUygula` yurt dışı sağlayıcıyı izinsiz reddeder.
4. **Model sunucusu:** vLLM `HF_HUB_OFFLINE=1`, `VLLM_NO_USAGE_STATS=1`; Ollama ağırlıkları demetle gelir, çalışırken indirme yapmaz.
