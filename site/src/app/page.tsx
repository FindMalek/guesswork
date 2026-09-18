import { Hero } from "@/components/hero";
import { FeatureGrid } from "@/components/feature-grid";
import { SiteFooter } from "@/components/site-footer";

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <main className="flex-1">
        <Hero />
        <FeatureGrid />
      </main>
      <SiteFooter />
    </div>
  );
}
