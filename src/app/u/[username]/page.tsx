import { CalendarDays } from "lucide-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProjectGrid } from "@/components/project/project-grid";
import { Avatar } from "@/components/ui/avatar";
import { getPublicProfile } from "@/db/queries/public";
import { formatDate } from "@/lib/utils";

export async function generateMetadata({
  params,
}: PageProps<"/u/[username]">): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicProfile(username);
  if (!profile)
    return {
      title: "Builder not found",
      robots: { index: false, follow: false },
    };
  return {
    title: `@${profile.username}`,
    description: `Explore AI products built by @${profile.username} on zihAI.`,
    alternates: { canonical: `/u/${profile.username}` },
  };
}

export default async function ProfilePage({
  params,
}: PageProps<"/u/[username]">) {
  const { username } = await params;
  const profile = await getPublicProfile(username);
  if (!profile) notFound();
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <header className="rounded-[2rem] border bg-foreground p-7 text-white sm:p-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar
            src={profile.image}
            alt={profile.username || "Builder"}
            size={96}
            className="ring-4 ring-white/15"
          />
          <div>
            <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-accent">
              Builder profile
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-tight">
              @{profile.username}
            </h1>
            <p className="mt-3 flex items-center gap-2 text-sm text-white/60">
              <CalendarDays className="size-4" /> Building here since{" "}
              {formatDate(profile.createdAt)}
            </p>
          </div>
        </div>
      </header>
      <section className="mt-12">
        <div className="mb-6">
          <h2 className="text-3xl font-black tracking-tight">
            Approved products
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {profile.projects.length} public{" "}
            {profile.projects.length === 1 ? "launch" : "launches"}
          </p>
        </div>
        <ProjectGrid projects={profile.projects} />
      </section>
    </div>
  );
}
