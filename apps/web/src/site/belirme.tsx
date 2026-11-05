"use client";

// Bölümlerin bir kez yükselip belirmesi (İP-49). Ziyaretçi ilk kez kaydırdığında, o an ekranın altında kalan
// data-belir öğeleri "bekliyor" olur ve ekrana girince "acik" olur. İlk açılışta hiçbir şey gizlenmez: betik
// çalışmasa, hareket azaltma tercihi olsa ya da sayfa hiç kaydırılmasa da her şey görünür ve okunur.
// Klavyeyle gizli bir bölüme gelinirse bölüm hemen açılır.

import { useEffect } from "react";

export function BelirmeGozlemcisi() {
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ac = (o: Element) => {
      if (o instanceof HTMLElement) o.dataset.belir = "acik";
    };
    const gozlemci = new IntersectionObserver(
      (girdiler) => {
        for (const g of girdiler) {
          if (!g.isIntersecting) continue;
          ac(g.target);
          gozlemci.unobserve(g.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.1 },
    );
    const basla = () => {
      for (const o of document.querySelectorAll<HTMLElement>("[data-belir]")) {
        if (o.dataset.belir === "acik") continue;
        if (o.getBoundingClientRect().top > window.innerHeight) {
          o.dataset.belir = "bekliyor";
          gozlemci.observe(o);
        } else ac(o);
      }
      document.documentElement.classList.add("belirme-hazir");
    };
    const odak = (e: FocusEvent) => {
      const b = e.target instanceof Element ? e.target.closest("[data-belir]") : null;
      if (b) ac(b);
    };
    window.addEventListener("scroll", basla, { once: true, passive: true });
    document.addEventListener("focusin", odak);
    return () => {
      window.removeEventListener("scroll", basla);
      document.removeEventListener("focusin", odak);
      gozlemci.disconnect();
    };
  }, []);
  return null;
}
