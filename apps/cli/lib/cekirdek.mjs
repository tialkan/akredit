// @akredit/cekirdek ile CLI arasındaki köprü (İP-24).
// İş kuralları tek yerde, @akredit/cekirdek içinde. Bu dosya çekirdeğin sonucunu
// CLI'nin eski biçimine çevirir; komut çıktısı ve çıkış kodları değişmez.
// Eski uygulamalar (lib/bologna.mjs `denetle`, lib/bologna-taslak.mjs) eşdeğerlik testinin
// referansı olarak yerinde kalır: test/esdegerlik.test.mjs.
import { bolognaDenetle, taslakDenetle as cekirdekTaslakDenetle } from "@akredit/cekirdek";

/** CLI biçimi: { duzey, ders, kural, aciklama }. Çekirdekte `ders` alanının adı `konu`. */
export function denetle(veri, { aktsSaat = [25, 30], guncellikAy = 12, simdi = Date.now() } = {}) {
  return bolognaDenetle(veri, { aktsSaat, guncellikAy, simdi }).map((b) => ({
    duzey: b.duzey,
    ders: b.konu ?? "-",
    kural: b.kural,
    aciklama: b.aciklama,
  }));
}

/** CLI biçimi: hatalar ve uyarılar "K8: metin" dizeleridir. */
export function taslakDenetle(t, { bolen = 30 } = {}) {
  const s = cekirdekTaslakDenetle(t, { bolen });
  const dize = (b) => `${b.kural}: ${b.aciklama}`;
  return {
    hatalar: s.bulgular.filter((b) => b.duzey === "hata").map(dize),
    uyarilar: s.bulgular.filter((b) => b.duzey !== "hata").map(dize),
    isToplam: s.isToplam,
    hedef: s.hedef,
  };
}
