// Kanıt arama. Gömme (anlamsal vektör) her kurumda yok: OpenRouter gömme sunmuyor ve kurum anahtarıyla
// çalışan işte gömme atlanıyor (İP-35). Bu yüzden temel arama PostgreSQL tam metin aramasıdır: Türkçe kök
// bulucu (`turkish`), 0010 göçündeki GIN dizini. Sorgu vektörü verilir ve parçaların gömmesi varsa sonuç
// anlamsal benzerlikle yeniden sıralanır; yoksa yalnız metin eşleşmesi kullanılır.
// Kayıp (belgelendi, docs/raporlar/IP-36.md): eş anlamlı ve farklı sözcüklerle yazılmış içerik bulunmaz;
// yalnız aynı köke inen sözcükler eşleşir.

import { kiraciIslemi, type SorguSonucu, satirlar, type Vt } from "@akredit/vt";
import { sql } from "drizzle-orm";

export interface AramaSonucu {
  kanitId: string;
  parcaId: string;
  sira: number;
  capa: unknown;
  /** Eşleşen yerin kısa alıntısı (belgeden birebir). */
  alinti: string;
  puan: number;
  yontem: "tam_metin" | "tam_metin+gomme";
}

export async function kanitAra(
  db: Vt,
  kurumId: string,
  sorgu: string,
  secenek: { sinir?: number; sorguGommesi?: number[] } = {},
): Promise<AramaSonucu[]> {
  const q = sorgu.trim().slice(0, 500);
  if (!q) return [];
  const sinir = Math.min(Math.max(secenek.sinir ?? 20, 1), 100);
  const g = secenek.sorguGommesi;
  const vektor = g?.length && g.every(Number.isFinite) ? `[${g.join(",")}]` : null;
  return kiraciIslemi(db, kurumId, async (tx) => {
    const s = (await tx.execute(sql`
      with sorgu as (select websearch_to_tsquery('turkish', ${q}) as tq)
      select p.kanit_id::text as "kanitId", p.id::text as "parcaId", p.sira, p.capa,
             ts_headline('turkish', p.metin, sorgu.tq, 'MaxWords=25, MinWords=8, StartSel="", StopSel=""') as alinti,
             ts_rank(to_tsvector('turkish', p.metin), sorgu.tq) as metin_puani,
             ${vektor ? sql`case when p.gomme is null then null else 1 - (p.gomme <=> ${vektor}::vector) end` : sql`null`} as benzerlik
      from kanit_parcasi p, sorgu
      where to_tsvector('turkish', p.metin) @@ sorgu.tq
      order by metin_puani desc, p.kanit_id, p.sira
      limit ${sinir * 3}
    `)) as unknown as SorguSonucu<{
      kanitId: string;
      parcaId: string;
      sira: number;
      capa: unknown;
      alinti: string;
      metin_puani: number;
      benzerlik: number | null;
    }>;
    return satirlar(s)
      .map((r) => {
        const b = r.benzerlik === null ? null : Number(r.benzerlik);
        return {
          kanitId: r.kanitId,
          parcaId: r.parcaId,
          sira: r.sira,
          capa: r.capa,
          alinti: r.alinti,
          puan: b === null ? Number(r.metin_puani) : Number(r.metin_puani) + b,
          yontem: (b === null ? "tam_metin" : "tam_metin+gomme") as AramaSonucu["yontem"],
        };
      })
      .sort((a, b) => b.puan - a.puan)
      .slice(0, sinir);
  });
}
