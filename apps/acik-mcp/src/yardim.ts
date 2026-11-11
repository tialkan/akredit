// Kurulum ve engel çözme rehberi. Metinler sabittir, model üretmez. Hocanın kendi OBS'sine tarayıcıyla girmesi
// için adımlar verir. Değişmez kural: kullanıcı adı, parola ve doğrulama kodu yalnız OBS'nin kendi ekranına,
// hocanın kendisi tarafından yazılır; asistana ve Akredit'e hiç yazılmaz. CAPTCHA'yı hoca çözer. OBS'de Kaydet'e
// hoca ya da hocanın açık izniyle asistan basar; onaya Gönder düğmesine hoca basar.
//
// Menü ve düğme adları istemcinin sürümüne göre değişir. Doğrulanmamış adlar `degisebilir: true` ile işaretlidir.

import { z } from "zod";
import { arac, KOD_KAYNAGI } from "./temel.ts";

export interface Adim {
  no: number;
  yap: string;
  /** Adımdan sonra ekranda ne görüleceği. */
  goreceginiz?: string;
  /** Menü ya da düğme adı sürüme göre değişebilir, doğrulanmadı. */
  degisebilir?: boolean;
}

type HamAdim = [yap: string, goreceginiz?: string, degisebilir?: boolean];

const numarala = (xs: HamAdim[]): Adim[] =>
  xs.map(([yap, goreceginiz, degisebilir], i) => ({
    no: i + 1,
    yap,
    ...(goreceginiz ? { goreceginiz } : {}),
    ...(degisebilir ? { degisebilir: true } : {}),
  }));

/** Her rehberin başında hocaya söylenecek giriş kuralı. */
export const GIRIS_KURALI_HOCAYA =
  "Kullanıcı adınızı ve parolanızı yalnız OBS'nin kendi giriş ekranına, kendiniz yazın. Bana, sohbete ya da Akredit'e asla yazmayın. Doğrulama kodu (SMS, e-posta) ve CAPTCHA da yalnız sizindir.";

export const MCP_ADRESI = "https://akredit.org/mcp";

export const ISTEMCILER = [
  "claude_web",
  "claude_masaustu",
  "claude_chrome",
  "chatgpt",
  "cursor",
  "vscode",
  "claude_code",
] as const;
export type Istemci = (typeof ISTEMCILER)[number];

const ISTEMCI_ADI: Record<Istemci, string> = {
  claude_web: "Claude (claude.ai, web)",
  claude_masaustu: "Claude masaüstü uygulaması",
  claude_chrome: "Claude in Chrome (Chrome eklentisi)",
  chatgpt: "ChatGPT",
  cursor: "Cursor",
  vscode: "VS Code",
  claude_code: "Claude Code",
};

const BAGLAYICI: Record<Istemci, HamAdim[]> = {
  // Anthropic yardım belgesi "Get started with custom connectors using remote MCP" (erişim 2026-11-05).
  claude_web: [
    ["claude.ai adresine girin ve oturum açın.", "Sol tarafta sohbet listesi, ortada yazı kutusu."],
    ["Customize (Özelleştir), ardından Connectors (Bağlayıcılar) bölümünü açın.", "Bağlı araçların listesi."],
    ["+ Add düğmesine, ardından Add custom connector seçeneğine basın.", "Ad ve adres soran pencere."],
    [`Ad olarak Akredit, adres olarak ${MCP_ADRESI} yazın ve Continue deyin.`, "Kimlik doğrulama seçenekleri."],
    ["Authentication altında No sign in seçin ve Add deyin.", "Listede Akredit görünür."],
    [
      "Ücretsiz planda tek özel bağlayıcı eklenebilir. Team ve Enterprise planlarında bağlayıcıyı kuruluş sahibi ekler; siz Connectors listesinde Akredit'i bulup Connect dersiniz.",
      undefined,
    ],
    [
      "Yeni sohbet açın. Yazı kutusunun altındaki + düğmesinden Akredit'in açık olduğunu denetleyin.",
      "Akredit'in yanında açık anahtar.",
      true,
    ],
    [
      "akredit yazın. Menü gelmezse Akredit araçlarıyla Bologna paketimi denetle yazın.",
      "Odak menüsü: numaralı seçenekler.",
    ],
  ],
  claude_masaustu: [
    ["Claude masaüstü uygulamasını açın ve oturum açın.", "claude.ai ile aynı görünüm."],
    ["Customize (Özelleştir), ardından Connectors (Bağlayıcılar) bölümünü açın.", "Bağlayıcı listesi."],
    [
      `+ Add, Add custom connector ile ad Akredit, adres ${MCP_ADRESI} yazın; Authentication altında No sign in seçip Add deyin.`,
      "Listede Akredit görünür.",
    ],
    ["Yeni sohbette akredit yazın. Menü gelmezse Akredit araçlarıyla Bologna paketimi denetle yazın.", "Odak menüsü."],
  ],
  claude_chrome: [
    ["Önce Claude'a Akredit bağlayıcısını ekleyin (Claude web adımları).", "Sohbette Akredit açık."],
    [
      "Chrome tarayıcısını açın. Chrome Web Mağazası'nda Claude eklentisini arayın (Claude in Chrome).",
      "Eklentinin sayfası.",
      true,
    ],
    ["Chrome'a ekle düğmesine basın, izin penceresinde onaylayın.", "Sağ üstte Claude simgesi.", true],
    ["Yapboz simgesinden Claude'u sabitleyin (iğne simgesi).", "Claude simgesi araç çubuğunda kalır.", true],
    ["Simgeye tıklayın, Claude hesabınızla oturum açın.", "Tarayıcının kenarında Claude paneli açılır.", true],
    [
      "OBS sayfanızı aynı pencerede açın; panelde akredit yazın.",
      "Asistan OBS sayfasını okumak için izin ister; siz onaylarsınız.",
    ],
    [
      "Eklenti bazı planlarda ya da kurum hesaplarında kapalı olabilir; o durumda kopyala-yapıştır yedeğini kullanın.",
      undefined,
      true,
    ],
  ],
  // OpenAI geliştirici belgesi "Custom MCP server" (erişim 2026-11-05). Hangi planlarda açık olduğu belgede yazmıyor.
  chatgpt: [
    ["chatgpt.com adresinde, web tarayıcısında oturum açın.", "Sohbet ekranı."],
    ["chatgpt.com/plugins adresini açın; + düğmesine basıp Add custom MCP server seçin.", "Ad ve bağlantı soran form."],
    [
      `Ad olarak Akredit yazın; Connection altında Server URL olarak ${MCP_ADRESI} girin; kimlik doğrulama olarak no authentication seçin.`,
      undefined,
      true,
    ],
    [
      "Uyarıyı okuyup I understand and want to continue, ardından Create as a plugin deyin; sonra eklentiyi kurun.",
      "Akredit eklentilerinizde görünür.",
      true,
    ],
    [
      "Bu özelliğin açık olup olmadığı planınıza göre değişebilir. Kurum hesabında çalışma alanı izinleri yöneticiye bağlıdır.",
      undefined,
      true,
    ],
    ["Yeni sohbette @ yazıp Akredit'i seçin, sonra akredit yazın.", "Odak menüsü."],
  ],
  cursor: [
    ["Cursor'da Settings (Ayarlar), ardından MCP bölümünü açın.", "MCP sunucu listesi.", true],
    [
      `Add new MCP server ile ad akredit, adres ${MCP_ADRESI} girin. Ya da .cursor/mcp.json dosyasına ekleyin.`,
      "Akredit yeşil noktayla görünür.",
      true,
    ],
    ["Sohbet panelinde eğik çizgi (/) yazın ve akredit seçin.", "Odak menüsü."],
  ],
  vscode: [
    ["Komut paletini açın (Ctrl+Shift+P, Mac'te Cmd+Shift+P).", "Üstte arama kutusu."],
    ["MCP: Add Server yazıp seçin, HTTP türünü seçin.", "Adres soran kutu.", true],
    [`Adres olarak ${MCP_ADRESI}, ad olarak akredit yazın.`, "Akredit sunucu listesinde."],
    ["Copilot sohbetinde ajan (Agent) kipini seçin, eğik çizgiyle akredit komutunu çalıştırın.", "Odak menüsü.", true],
  ],
  claude_code: [
    [
      `Uçbirimde şunu çalıştırın: claude mcp add --transport http akredit ${MCP_ADRESI}`,
      "Added HTTP MCP server iletisi.",
    ],
    ["claude komutuyla oturumu açın, /mcp ile Akredit'in bağlı olduğunu denetleyin.", "akredit: connected.", true],
    ["Eğik çizgiyle akredit komutunu seçin.", "Odak menüsü."],
  ],
};

/** Bağlayıcı ekleme adımları; site (akredit.org ana sayfası) aynı adımları buradan okur. */
export function baglayiciAdimlari(istemci: Istemci): Adim[] {
  return numarala(BAGLAYICI[istemci]);
}

const TARAYICI: Record<Istemci, HamAdim[]> = {
  claude_web: [
    [
      "claude.ai web sürümü kendi başına OBS'nize giremez. Tarayıcı için Claude in Chrome eklentisini ya da masaüstü uygulamasını kullanın.",
      undefined,
    ],
    [
      "Bunlar yoksa kopyala-yapıştır yedeği: OBS'de ders sayfasını açın, Ctrl+A ile hepsini seçin, Ctrl+C ile kopyalayın, sohbete Ctrl+V ile yapıştırın.",
      "Asistan sayfayı ayrıştırır.",
    ],
  ],
  claude_masaustu: [
    [
      "Masaüstü uygulamasında sohbetin yanında tarayıcı paneli açılabilir. Panelin düğmesi ya da menüsü sürüme göre değişir.",
      "Sohbetin yanında küçük bir tarayıcı.",
      true,
    ],
    ["Asistandan OBS adresinizi açmasını isteyin ya da adresi panele siz yazın.", "OBS giriş ekranı."],
    [
      "Kullanıcı adınızı ve parolanızı panelde OBS'nin kendi kutularına kendiniz yazın. Sohbete yazmayın.",
      "OBS ana sayfası.",
    ],
    [
      "Asistana 'girdim' yazın. Asistan ders listesini okur ve bütün derslerinizin Bologna sayfasını tarar.",
      "Eksikler ve öneriler sohbette tek listede görünür.",
    ],
  ],
  claude_chrome: [
    ["Chrome'da yeni sekmede OBS adresinizi açın.", "OBS giriş ekranı."],
    [
      "Kullanıcı adınızı ve parolanızı OBS'nin kendi kutularına kendiniz yazın; varsa doğrulama kodunu ve CAPTCHA'yı siz girin.",
      "OBS ana sayfası.",
    ],
    [
      "Claude simgesine tıklayıp paneli açın, 'OBS'ye girdim' yazın.",
      "Asistan sayfayı okumak için izin isteyebilir; onaylayın.",
      true,
    ],
    [
      "Asistan ders listesini okur ve bütün derslerinizi tarar; hangi dersle başlanacağını numarayla seçersiniz.",
      "Eksiklerin ve önerilerin tek listesi.",
    ],
    [
      "Asistan formu doldurursa her alanı gözle denetleyin. Kaydet'e siz basarsınız; isterseniz açık izninizle asistan basar. Onaya Gönder düğmesine siz basarsınız.",
      "OBS'nin kayıt iletisi.",
    ],
  ],
  chatgpt: [
    [
      "Yazı kutusundaki Araçlar (Tools) menüsünden Ajan modunu (Agent mode) seçin.",
      "ChatGPT kendi tarayıcısını açar.",
      true,
    ],
    ["OBS adresinizi açmasını isteyin.", "OBS giriş ekranı ajanın tarayıcısında."],
    [
      "Giriş ekranında Devral (Take over) düğmesine basın; kullanıcı adı ve parolayı kendiniz yazın. Sohbete yazmayın.",
      "OBS ana sayfası.",
      true,
    ],
    ["Denetimi asistana geri verin.", "Asistan sayfayı okur."],
    ["Kaydet'e siz basarsınız ya da açık izninizle asistan basar. Onaya Gönder düğmesine siz basarsınız.", undefined],
  ],
  cursor: [
    ["Cursor'un tarayıcı aracı sürüme göre değişir. Varsa asistandan OBS adresini açmasını isteyin.", undefined, true],
    ["Yoksa kopyala-yapıştır yedeği: sayfada Ctrl+A, Ctrl+C, sohbete Ctrl+V.", "Asistan sayfayı ayrıştırır."],
  ],
  vscode: [
    ["VS Code'da OBS'ye tarayıcıyla girmek için ek araç gerekir; bu en zor yoldur.", undefined, true],
    [
      "En kolayı kopyala-yapıştır: tarayıcınızda OBS sayfasında Ctrl+A, Ctrl+C, sohbete Ctrl+V.",
      "Asistan sayfayı ayrıştırır.",
    ],
  ],
  claude_code: [
    [
      "Claude Code'da tarayıcı için Claude in Chrome eklentisi bağlanabilir; adımlar sürüme göre değişir.",
      undefined,
      true,
    ],
    ["Yoksa kopyala-yapıştır yedeği: sayfada Ctrl+A, Ctrl+C, uçbirime yapıştırın.", "Asistan sayfayı ayrıştırır."],
  ],
};

export const ENGELLER = [
  "tarayici_araci_yok",
  "site_acilmiyor",
  "giris_duvari",
  "captcha",
  "cerceve",
  "oturum_dustu",
  "sayfa_okunamiyor",
  "kaydet_basilamiyor",
  "akredit_gorunmuyor",
] as const;
export type Engel = (typeof ENGELLER)[number];

const KOPYALA_YAPISTIR: HamAdim[] = [
  ["Yedek yol: OBS'de ders bilgi paketi sayfasını kendiniz açın.", "Ders sayfası."],
  ["Sayfanın boş bir yerine tıklayın, Ctrl+A ile hepsini seçin (Mac'te Cmd+A).", "Sayfa mavi seçilir."],
  ["Ctrl+C ile kopyalayın (Mac'te Cmd+C).", undefined],
  [
    "Sohbete dönüp Ctrl+V ile yapıştırın ve gönderin.",
    "Asistan alanları ayrıştırıp bulunan ve bulunamayan alanları söyler.",
  ],
];

const ENGEL_ADIMLARI: Record<Engel, { ad: string; adimlar: HamAdim[]; yedek: boolean }> = {
  tarayici_araci_yok: {
    ad: "Asistanın tarayıcı aracı yok",
    adimlar: [
      [
        "Claude kullanıyorsanız Claude in Chrome eklentisini kurun (kurulum_yardimi, istemci: claude_chrome).",
        undefined,
      ],
      ["Claude masaüstü uygulamasında sohbetin yanındaki tarayıcı panelini açmayı deneyin.", undefined, true],
      ["ChatGPT'de Araçlar menüsünden Ajan modunu seçin.", undefined, true],
    ],
    yedek: true,
  },
  site_acilmiyor: {
    ad: "OBS sitesi açılmıyor",
    adimlar: [
      ["Adresi kendi tarayıcınızda açıp deneyin. Açılıyorsa adresi asistana olduğu gibi verin.", undefined],
      [
        "Kurum dışından erişim kapalı olabilir (VPN ya da kampüs ağı). Kurumunuzun bilgi işlem sayfasına bakın.",
        undefined,
      ],
      ["Site bakımda olabilir; birkaç dakika sonra yeniden deneyin.", undefined],
    ],
    yedek: true,
  },
  giris_duvari: {
    ad: "Giriş ekranı",
    adimlar: [
      ["Bu normaldir. Kullanıcı adınızı ve parolanızı OBS'nin kendi kutularına kendiniz yazın.", "OBS ana sayfası."],
      [
        "Asistana yalnız 'girdim' yazın. Parolayı sohbete yazmayın; yazdıysanız silin ve parolanızı değiştirin.",
        undefined,
      ],
      ["e-Devlet ya da kurum tek oturum açma ekranı gelirse onu da kendiniz tamamlayın.", undefined],
    ],
    yedek: false,
  },
  captcha: {
    ad: "Ben robot değilim (CAPTCHA) kutusu",
    adimlar: [
      ["CAPTCHA'yı siz çözün; asistan çözmez.", undefined],
      ["Çözdükten sonra asistana 'devam' yazın.", "Asistan kaldığı yerden sürer."],
    ],
    yedek: false,
  },
  cerceve: {
    ad: "Sayfa çerçeve (iframe) içinde, asistan içeriği göremiyor",
    adimlar: [
      [
        "Ders sayfasındaki bağlantıya sağ tıklayın, Bağlantıyı yeni sekmede aç seçin.",
        "Sayfa tek başına açılır.",
        true,
      ],
      ["Asistandan bu yeni sekmeyi okumasını isteyin.", undefined],
    ],
    yedek: true,
  },
  oturum_dustu: {
    ad: "Oturum düştü ya da süre doldu",
    adimlar: [
      ["OBS'ye yeniden kendiniz girin (kullanıcı adı ve parolayı yalnız OBS ekranına).", "OBS ana sayfası."],
      [
        "Kaydedilmemiş alanlar silinmiş olabilir. Asistandan son seçilen metni yeniden istemek için 'kopya metnini ver' yazın.",
        undefined,
      ],
      ["Uzun formlarda her sekmeyi doldurduktan sonra Kaydet'e basın.", undefined],
    ],
    yedek: false,
  },
  sayfa_okunamiyor: {
    ad: "Asistan sayfayı okuyamıyor ya da alanları bulamıyor",
    adimlar: [
      ["Sayfanın tamamen yüklendiğini bekleyin ve asistandan yeniden okumasını isteyin.", undefined],
      ["Bologna sayfasında dersin Ders Bilgileri sekmesinde olduğunuzu denetleyin.", undefined, true],
    ],
    yedek: true,
  },
  kaydet_basilamiyor: {
    ad: "Kaydet ya da Gönder",
    adimlar: [
      [
        "Kaydet'e siz basarsınız; isterseniz asistan sizin açık izninizle (evet ya da bir kez hepsini kaydet) basar. Onaya Gönder düğmesine yalnız siz basarsınız.",
        undefined,
      ],
      ["Basmadan önce alanları gözle denetleyin.", undefined],
      ["Düğme pasifse zorunlu bir alan boş olabilir; OBS'nin kırmızı uyarısına bakın ve asistana söyleyin.", undefined],
    ],
    yedek: false,
  },
  akredit_gorunmuyor: {
    ad: "Akredit araçları ya da akredit komutu görünmüyor",
    adimlar: [
      ["Yeni bir sohbet açın; bağlayıcı eski sohbette görünmeyebilir.", undefined],
      ["Yazı kutusunun altındaki + ya da araç menüsünden Akredit'in açık olduğunu denetleyin.", undefined, true],
      ["Komut görünmüyorsa 'Akredit ile başlayalım' yazmanız yeter.", "Asistan odak menüsünü gösterir."],
      [`Bağlayıcı adresinin tam olarak ${MCP_ADRESI} olduğunu denetleyin.`, undefined],
    ],
    yedek: false,
  },
};

export const kurulumYardimiAraci = arac({
  ad: "kurulum_yardimi",
  baslik: "Kurulum yardımı",
  aciklama:
    "Akredit bağlayıcısını eklemek ve OBS'ye tarayıcıyla girmek için istemciye göre adım adım rehber verir: Claude web ve masaüstü, Claude in Chrome, ChatGPT, Cursor, VS Code, Claude Code. Her adımda ekranda ne görüleceğini söyler.",
  // Adımlar hocayla tek tek yürür; her adımda hocanın "oldu" demesi beklenir.
  hocayaSimdiSor: true,
  sonrakiAdim:
    "Adımları hocaya tek tek gösterin: bir adım verin, 'oldu' demesini bekleyin, sonra sıradakine geçin. 'değişebilir' işaretli menü adını 'sizde biraz farklı olabilir' diye söyleyin. Giriş kuralını hocaya bir kez açıkça söyleyin.",
  girdi: z.object({
    istemci: z.enum(ISTEMCILER).describe("Hocanın kullandığı asistan"),
    konu: z
      .enum(["baglayici", "tarayici", "hepsi"])
      .default("hepsi")
      .describe("Bağlayıcı ekleme, OBS'ye tarayıcıyla giriş ya da ikisi"),
  }),
  calistir: ({ istemci, konu }) => ({
    sonuc: {
      istemci: ISTEMCI_ADI[istemci],
      girisKurali: GIRIS_KURALI_HOCAYA,
      ...(konu !== "tarayici" ? { baglayiciAdimlari: numarala(BAGLAYICI[istemci]) } : {}),
      ...(konu !== "baglayici" ? { tarayiciAdimlari: numarala(TARAYICI[istemci]) } : {}),
      not: "Menü adları istemcinin sürümüne ve diline göre değişebilir. 'degisebilir' işaretli adlar doğrulanmadı.",
    },
    kaynak: [KOD_KAYNAGI("apps/acik-mcp/src/yardim.ts", "Akredit kurulum rehberi")],
  }),
});

/** Asistanın hocaya sormadan önce kendisinin deneyeceği toparlama; yalnız giriş, CAPTCHA ve kurulum hocadadır. */
const KENDI_TOPARLAMA: Partial<Record<Engel, string>> = {
  cerceve:
    "Hocaya 'yeni sekmede açın' demeden önce: sayfadaki iframe'in src adresini okuyup o adrese kendiniz gidin ve sayfayı yeniden okuyun. Giriş ekranına düşerseniz adımlara geçin.",
  sayfa_okunamiyor:
    "Hocaya söylemeden önce: sayfadaki sekmeleri (Ders Bilgileri, Öğrenme Çıktıları, Ders Akışı, Katkı) sırayla açıp metinlerini birleştirin ve bologna_ayristir'ı yeniden çağırın. Hâlâ temel alanlar okunamıyorsa adımlara geçin.",
  kaydet_basilamiyor:
    "Önce kendiniz: sayfayı aşağı kaydırıp sekmenin kendi Kaydet düğmesini arayın, açık uyarı penceresi varsa okuyun. Hata iletisi bir alanı gösteriyorsa onu düzeltin (onaylanan içerik değişmeden). Olmazsa adımlara geçin.",
  oturum_dustu:
    "Taslağı kaybetmeyin: hemen bologna_kopya_metni ile yedek metni alın. Hocaya tek mesajda 'Oturum düştü; OBS sekmesinde yeniden girip girdim yazın, kaldığım yerden sürdürürüm' deyin ve aynı mesajda kopya metnini verin.",
  site_acilmiyor:
    "Önce kendiniz: adresi http/https ve www'lü/www'süz deneyin, kurumun OBS sayfasını web aramasıyla bulun. Olmazsa adımlara geçin.",
};

export const engelCozAraci = arac({
  ad: "engel_coz",
  baslik: "Engel çöz",
  aciklama:
    "OBS'ye girerken ya da sayfayı okurken çıkan engel için numaralı çözüm adımları verir: tarayıcı aracı yok, site açılmıyor, giriş ekranı, CAPTCHA, çerçeve, oturum düşmesi, sayfa okunamıyor, Kaydet düğmesi, Akredit görünmüyor. Gerekirse kopyala-yapıştır yedeğini de verir.",
  sonrakiAdim:
    "Adımları hocaya tek tek gösterin. Hiçbiri olmazsa kopyala-yapıştır yedeğine geçin. Parola, doğrulama kodu ya da çerez istemeyin.",
  girdi: z.object({
    engel: z.enum(ENGELLER),
    istemci: z.enum(ISTEMCILER).optional(),
  }),
  calistir: ({ engel, istemci }) => {
    const e = ENGEL_ADIMLARI[engel];
    const ozel = engel === "tarayici_araci_yok" && istemci ? TARAYICI[istemci] : [];
    return {
      sonuc: {
        engel: e.ad,
        ...(KENDI_TOPARLAMA[engel] ? { asistanOnceKendisiDener: KENDI_TOPARLAMA[engel] } : {}),
        girisKurali: GIRIS_KURALI_HOCAYA,
        adimlar: numarala([...ozel, ...e.adimlar]),
        ...(e.yedek ? { yedekYol: numarala(KOPYALA_YAPISTIR) } : {}),
        obsyeYazmaYedegi:
          "Tarayıcı aracı yoksa asistan bologna_kopya_metni ile alan alan kopyalanacak metni verir; siz OBS'de ilgili kutuya yapıştırıp Kaydet'e basarsınız.",
      },
      kaynak: [KOD_KAYNAGI("apps/acik-mcp/src/yardim.ts", "Akredit engel çözme rehberi")],
      ...(KENDI_TOPARLAMA[engel] && engel !== "oturum_dustu"
        ? {
            hocayaSimdiSor: false,
            sonrakiAdim:
              "Önce asistanOnceKendisiDener'i hocaya sormadan uygulayın. Çözülmezse adımları hocaya tek tek gösterin. Parola, doğrulama kodu ya da çerez istemeyin.",
          }
        : { hocayaSimdiSor: true }),
    };
  },
});
