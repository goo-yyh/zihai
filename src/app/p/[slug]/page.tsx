import { CalendarDays, Code2, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { LikeButton } from "@/components/project/like-button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPublicProject } from "@/db/queries/public";
import { getSession } from "@/lib/session";
import { SITE_DESCRIPTION } from "@/lib/site";
import { formatDate, truncate } from "@/lib/utils";

export async function generateMetadata({ params }: PageProps<"/p/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const project = await getPublicProject(slug);
  if (!project) return { title: "Project not found", robots: { index: false, follow: false } };
  const description = truncate(project.description.replace(/[#*_`>\[\]]/g, ""), 155) || SITE_DESCRIPTION;
  return {
    title: project.name,
    description,
    alternates: { canonical: `/p/${project.slug}` },
    openGraph: { title: project.name, description, images: project.images[0] ? [{ url: project.images[0].url }] : undefined },
    twitter: { card: "summary_large_image", title: project.name, description, images: project.images[0] ? [project.images[0].url] : undefined },
  };
}

export default async function ProjectPage({ params }: PageProps<"/p/[slug]">) {
  const [{ slug }, session] = await Promise.all([params, getSession()]);
  const project = await getPublicProject(slug, session?.user.id);
  if (!project) notFound();
  const destination = project.githubUrl || project.websiteUrl!;
  const access = !session ? "login" : session.user.onboardingCompleted ? "ready" : "onboarding";

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-9 lg:grid-cols-[1fr_19rem]">
        <main className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><Badge variant="approved">Approved launch</Badge><h1 className="mt-4 text-4xl font-black tracking-[-0.04em] sm:text-5xl">{project.name}</h1><Link href={`/u/${project.ownerUsername}`} className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary"><Avatar src={project.ownerImage} alt={project.ownerUsername || "Builder"} size={30} /> @{project.ownerUsername}</Link></div>
            <div className="flex gap-2"><LikeButton projectId={project.id} initialLiked={project.viewerLiked} initialCount={project.likeCount} nextPath={`/p/${project.slug}`} access={access} /><Button asChild><a href={destination} target="_blank" rel="noopener noreferrer">{project.githubUrl ? <Code2 className="size-4" /> : <ExternalLink className="size-4" />} {project.githubUrl ? "View code" : "Visit product"}</a></Button></div>
          </div>

          <div className="mt-9 grid gap-3 sm:grid-cols-2">
            {project.images.map((image, index) => <div key={image.id} className={index === 0 ? "relative aspect-[16/9] overflow-hidden rounded-2xl border bg-muted sm:col-span-2" : "relative aspect-[16/10] overflow-hidden rounded-2xl border bg-muted"}><Image src={image.url} alt={`${project.name} screenshot ${index + 1}`} fill priority={index === 0} sizes={index === 0 ? "(max-width: 1024px) 100vw, 760px" : "(max-width: 640px) 100vw, 380px"} className="object-cover" /></div>)}
          </div>

          <article className="prose-zihai mt-10 rounded-2xl border bg-white p-6 sm:p-8"><ReactMarkdown remarkPlugins={[remarkGfm]}>{project.description}</ReactMarkdown></article>

          {project.iterations.length ? (
            <section className="mt-12"><div className="mb-6"><p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Build log</p><h2 className="mt-2 text-3xl font-black tracking-tight">Iterations</h2></div><div className="space-y-6">{project.iterations.map((iteration, index) => <article key={iteration.id} className="rounded-2xl border bg-white p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-mono text-xs font-bold text-primary">UPDATE {String(project.iterations.length - index).padStart(2, "0")}</p><h3 className="mt-1 text-xl font-black">{iteration.versionLabel || "Product update"}</h3></div><span className="text-xs text-muted-foreground">{formatDate(iteration.approvedAt || iteration.createdAt)}</span></div>{iteration.images.length ? <div className="mt-5 grid gap-3 sm:grid-cols-3">{iteration.images.map((image, imageIndex) => <div key={image.id} className="relative aspect-[16/10] overflow-hidden rounded-xl border bg-muted"><Image src={image.url} alt={`${iteration.versionLabel || "Iteration"} screenshot ${imageIndex + 1}`} fill sizes="(max-width: 640px) 100vw, 250px" className="object-cover" /></div>)}</div> : null}<div className="prose-zihai mt-5"><ReactMarkdown remarkPlugins={[remarkGfm]}>{iteration.description}</ReactMarkdown></div></article>)}</div></section>
          ) : null}
        </main>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border bg-white p-5"><p className="text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">Builder</p><div className="mt-4 flex items-center gap-3"><Avatar src={project.ownerImage} alt={project.ownerUsername || "Builder"} size={48} /><div><Link href={`/u/${project.ownerUsername}`} className="font-bold hover:text-primary">@{project.ownerUsername}</Link><p className="mt-1 text-xs text-muted-foreground">Joined {formatDate(project.ownerCreatedAt)}</p></div></div></div>
          <div className="rounded-2xl border bg-white p-5 text-sm"><div className="flex items-center gap-2 font-bold"><CalendarDays className="size-4 text-primary" /> Published</div><p className="mt-2 text-muted-foreground">{formatDate(project.publishedAt)}</p></div>
        </aside>
      </div>
    </div>
  );
}
