import { Hero } from "@/components/hero";
import { SiteFooter } from "@/components/site-footer";
import { getRepoStars, getPluginVersion } from "@/lib/github";

export default async function Home() {
  const stars = await getRepoStars();
  const version = getPluginVersion();

  return (
    <div className="relative z-10 flex min-h-full flex-1 flex-col">
      <main className="flex flex-1 flex-col items-center justify-center">
        <Hero version={version} />
      </main>
      <SiteFooter stars={stars} />
    </div>
  );
}
