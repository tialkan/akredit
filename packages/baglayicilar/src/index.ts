// @akredit/baglayicilar: Kurum sistemleri ve açık veri kaynakları bağlayıcıları: Bologna (Proliz), OBS not aktarımı,
// AVESİS, YÖK Atlas, UBYS/OBS, EBYS, e-posta (MIME, IMAP), Google Drive / OneDrive.
// Kapsam ve kabul ölçütleri: plan/ip/IP-05-baglayicilar.md, plan/ip/IP-23-baglayicilar-2.md

export const PAKET = "@akredit/baglayicilar";

export * from "./avesis/avesis.ts";
export * from "./avesis/istek.ts";
export * from "./baglayici.ts";
export * from "./bologna-proliz/ayristir.ts";
export * from "./bologna-proliz/oku.ts";
export * from "./bulut/belirtec.ts";
export * from "./bulut/esitleme.ts";
export * from "./ebys/ebys.ts";
export type * from "./ebys/kanit.ts";
export * from "./eposta/imap.ts";
export * from "./eposta/mime.ts";
export * from "./not-aktarimi/aktar.ts";
export * from "./not-aktarimi/profil.ts";
export * from "./ubys/ubys.ts";
export * from "./web-tarama/index.ts";
export * from "./yokatlas/yokatlas.ts";
