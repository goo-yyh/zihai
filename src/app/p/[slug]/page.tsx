import { CalendarDays } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { ProjectImageCarousel } from "@/components/project/project-image-carousel";
import { LikeButton } from "@/components/project/like-button";
import { RecentUpdates } from "@/components/project/recent-updates";
import { RecommendedProjects } from "@/components/project/recommended-projects";
import { Avatar } from "@/components/ui/avatar";
import { ChromeIcon, GitHubIcon } from "@/components/ui/brand-icons";
import { Button } from "@/components/ui/button";
import {
  getPublicProject,
  getRecommendationPool,
  getPublicProjectIterations,
  getViewerProjectLike,
} from "@/db/queries/public";
import { isFeatureEnabled } from "@/lib/features";
import { getSession } from "@/lib/session";
import { getTranslations } from "@/lib/i18n-server";
import { SITE_DESCRIPTION } from "@/lib/site";
import { formatDate, truncate } from "@/lib/utils";

async function ProjectSidebar({
  slug,
  iterationsEnabled,
}: {
  slug: string;
  iterationsEnabled: boolean;
}) {
  if (!iterationsEnabled) {
    const recommendations = await getRecommendationPool(slug);
    return <RecommendedProjects pool={recommendations} />;
  }

  const iterations = await getPublicProjectIterations(slug);
  if (!iterations.length) {
    const recommendations = await getRecommendationPool(slug);
    return <RecommendedProjects pool={recommendations} />;
  }

  return (
    <RecentUpdates
      items={iterations.map((iteration) => ({
        id: iteration.id,
        versionLabel: iteration.versionLabel,
        description: iteration.description,
        approvedAt: iteration.approvedAt
          ? new Date(iteration.approvedAt).toISOString()
          : null,
        createdAt: new Date(iteration.createdAt).toISOString(),
        images: iteration.images.map((image) => ({
          id: image.id,
          url: image.url,
        })),
      }))}
    />
  );
}

async function ProjectLikeControl({
  projectId,
  slug,
  likeCount,
}: {
  projectId: string;
  slug: string;
  likeCount: number;
}) {
  const session = await getSession();
  const viewerLiked = session
    ? await getViewerProjectLike(slug, session.user.id)
    : false;
  const access = !session
    ? "login"
    : session.user.onboardingCompleted
      ? "ready"
      : "onboarding";

  return (
    <LikeButton
      projectId={projectId}
      initialLiked={viewerLiked}
      initialCount={likeCount}
      nextPath={`/p/${slug}`}
      access={access}
    />
  );
}

export async function generateMetadata({
  params,
}: PageProps<"/p/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const [project, { t }] = await Promise.all([
    getPublicProject(slug),
    getTranslations(),
  ]);
  if (!project)
    return {
      title: t("Project not found"),
      robots: { index: false, follow: false },
    };
  const description =
    truncate(project.description.replace(/[#*_`>\[\]]/g, ""), 155) ||
    SITE_DESCRIPTION;
  const imageUrl = project.images[0]?.url;
  return {
    title: project.name,
    description,
    alternates: { canonical: `/p/${project.slug}` },
    openGraph: {
      title: project.name,
      description,
      images: imageUrl ? [{ url: imageUrl }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: project.name,
      description,
      images: imageUrl ? [imageUrl] : undefined,
    },
  };
}

export default async function ProjectPage({ params }: PageProps<"/p/[slug]">) {
  const projectPromise = params.then(({ slug }) => getPublicProject(slug));
  const [{ slug }, project, { locale, t }] = await Promise.all([
    params,
    projectPromise,
    getTranslations(),
  ]);
  if (!project) notFound();
  const iterationsEnabled = isFeatureEnabled("iterations");

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="grid gap-9 lg:grid-cols-[1fr_19rem]">
        <main className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-4xl font-black tracking-[-0.04em] sm:text-5xl">
                {project.name}
              </h1>
              <Link
                href={`/u/${project.ownerUsername}`}
                className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary"
              >
                <Avatar
                  src={project.ownerImage}
                  alt={project.ownerUsername || t("Builder")}
                  size={30}
                />{" "}
                @{project.ownerUsername}
              </Link>
            </div>
            <div className="flex gap-2">
              <Suspense
                fallback={
                  <div
                    aria-hidden="true"
                    className="h-9 w-16 animate-pulse rounded-xl bg-muted"
                  />
                }
              >
                <ProjectLikeControl
                  projectId={project.id}
                  slug={slug}
                  likeCount={project.likeCount}
                />
              </Suspense>
              {project.websiteUrl ? (
                <Button asChild variant="outline">
                  <a
                    href={project.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ChromeIcon className="size-4" /> {t("Visit product")}
                  </a>
                </Button>
              ) : null}
              {project.githubUrl ? (
                <Button
                  asChild
                  variant={project.websiteUrl ? "outline" : "default"}
                >
                  <a
                    href={project.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <GitHubIcon className="size-4" /> {t("View code")}
                  </a>
                </Button>
              ) : null}
            </div>
          </div>

          <ProjectImageCarousel
            images={project.images}
            projectName={project.name}
          />

          <article className="prose-zihai mt-10 rounded-2xl border bg-white p-6 sm:p-8">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {project.description}
            </ReactMarkdown>
          </article>
        </main>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border bg-white p-5">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-muted-foreground">
              {t("Builder")}
            </p>
            <div className="mt-4 flex items-center gap-3">
              <Avatar
                src={project.ownerImage}
                alt={project.ownerUsername || t("Builder")}
                size={48}
              />
              <div>
                <Link
                  href={`/u/${project.ownerUsername}`}
                  className="font-bold hover:text-primary"
                >
                  @{project.ownerUsername}
                </Link>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("Joined")} {formatDate(project.ownerCreatedAt, locale)}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border bg-white p-5 text-sm">
            <div className="flex items-center gap-2 font-bold">
              <CalendarDays className="size-4 text-primary" /> {t("Published")}
            </div>
            <p className="mt-2 text-muted-foreground">
              {formatDate(project.publishedAt, locale)}
            </p>
          </div>
          <Suspense
            fallback={
              <div
                aria-hidden="true"
                className="rounded-2xl border bg-white p-5"
              >
                <div className="h-32 animate-pulse rounded-lg bg-muted" />
              </div>
            }
          >
            <ProjectSidebar slug={slug} iterationsEnabled={iterationsEnabled} />
          </Suspense>
        </aside>
      </div>
    </div>
  );
}
