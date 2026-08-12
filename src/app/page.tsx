import { ArrowRight, Blocks, Rocket, Sparkles } from "lucide-react";
import Link from "next/link";

import { ProjectGrid } from "@/components/project/project-grid";
import { Button } from "@/components/ui/button";
import { getLatestProjects, getPopularProjects } from "@/db/queries/public";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [latest, popular] = await Promise.all([
    getLatestProjects(12),
    getPopularProjects(3),
  ]);

  return (
    <>
      <section className="relative overflow-hidden border-b">
        <div className="dot-grid absolute inset-0 opacity-45" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1fr_0.75fr] lg:items-center lg:px-8">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border bg-white/80 px-3 py-1.5 text-xs font-bold shadow-sm">
              <Sparkles className="size-3.5 text-primary" /> Built with AI. Shipped by humans.
            </span>
            <h1 className="mt-7 max-w-4xl text-5xl font-black tracking-[-0.055em] sm:text-7xl">
              Find the next <span className="text-primary">useful thing.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground sm:text-xl">
              A curated launchpad for independent AI products. Discover what builders are shipping, follow every iteration, and support the work you want to see win.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="#latest">Explore products <ArrowRight className="size-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="accent">
                <Link href="/submit"><Rocket className="size-4" /> Submit yours</Link>
              </Button>
            </div>
          </div>
          <div className="rounded-[2rem] border bg-foreground p-7 text-white shadow-[0_30px_90px_rgb(22_26_22/20%)] sm:p-9">
            <Blocks className="size-9 text-accent" />
            <p className="mt-8 font-mono text-xs font-bold uppercase tracking-[0.18em] text-accent">The zihAI standard</p>
            <div className="mt-5 space-y-5">
              {[
                ["01", "Real products", "A working website or public GitHub repository."],
                ["02", "Human review", "Every launch and iteration is checked before publishing."],
                ["03", "Visible progress", "Updates stay attached to the product that inspired them."],
              ].map(([number, title, copy]) => (
                <div key={number} className="grid grid-cols-[2.5rem_1fr] gap-3 border-t border-white/15 pt-5">
                  <span className="font-mono text-sm text-white/45">{number}</span>
                  <div><p className="font-bold">{title}</p><p className="mt-1 text-sm leading-6 text-white/60">{copy}</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {popular.length ? (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="mb-7 flex items-end justify-between gap-4">
            <div><p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Community picks</p><h2 className="mt-2 text-3xl font-black tracking-tight">Popular right now</h2></div>
          </div>
          <ProjectGrid projects={popular} />
        </section>
      ) : null}

      <section id="latest" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mb-7">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Fresh launches</p>
          <h2 className="mt-2 text-3xl font-black tracking-tight">Latest products</h2>
          <p className="mt-2 text-sm text-muted-foreground">Recently approved by the zihAI review team.</p>
        </div>
        <ProjectGrid projects={latest} />
      </section>
    </>
  );
}
