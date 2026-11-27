import { SkipLink } from "@/components/layout/skip-link";
import type { Metadata } from "next";

import { BuiltWith } from "@/features/marketing/components/built-with";
import { DemoSection } from "@/features/marketing/components/demo-section";
import { Faq } from "@/features/marketing/components/faq";
import { Hero } from "@/features/marketing/components/hero";
import { ModulesShowcase } from "@/features/marketing/components/modules-showcase";
import { Problems } from "@/features/marketing/components/problems";
import { SiteFooter } from "@/features/marketing/components/site-footer";
import { SiteHeader } from "@/features/marketing/components/site-header";

export const metadata: Metadata = {
  title: { absolute: "FABRIL — Gestión de producción para pequeñas fábricas" },
  description:
    "Producción, stock, recetas, compras y costos de tu fábrica en un solo lugar. Calculá materiales, evitá faltantes y conocé el costo real de cada producto.",
  openGraph: {
    title: "FABRIL — Gestión de producción para pequeñas fábricas",
    description: "Sabé qué fabricar, con qué material y a qué costo.",
    locale: "es_AR",
    type: "website",
  },
};

export default function LandingPage() {
  return (
    <>
      <SkipLink />
      <SiteHeader />
      <main id="contenido">
        <Hero />
        <Problems />
        <ModulesShowcase />
        <BuiltWith />
        <Faq />
        <DemoSection />
      </main>
      <SiteFooter />
    </>
  );
}
