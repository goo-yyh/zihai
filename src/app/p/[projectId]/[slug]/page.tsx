import { CalendarDays, TriangleAlert } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { cache, Suspense } from "react";

import { MarkdownContent } from "@/components/markdown/markdown-content";
import { ProjectImageCarousel } from "@/components/project/project-image-carousel";
import { LikeButton } from "@/components/project/like-button";
import { ProjectQrCodeButton } from "@/components/project/project-qr-code-button";
import { ProjectSuggestionButton } from "@/components/project/project-suggestion-button";
import { ProjectSuggestionPanel } from "@/components/project/project-suggestion-panel";
import { ProjectSectionUnavailable } from "@/components/project/project-section-unavailable";
import { RecommendedProjects } from "@/components/project/recommended-projects";
import { Avatar } from "@/components/ui/avatar";
import { ChromeIcon, GitHubIcon } from "@/components/ui/brand-icons";
import { Button } from "@/components/ui/button";
import {
  getPublicProject,
  getRecommendationPool,
  getViewerProjectLike,
} from "@/db/queries/public";
import { getProjectSuggestionSummary } from "@/db/queries/project-suggestions";
import { publicProfilePath, publicProjectPath } from "@/lib/public-routes";
import { getSession } from "@/lib/session";
import { getTranslations } from "@/lib/i18n-server";
import { selectRandomRecommendations } from "@/lib/recommendations";
import { SITE_DESCRIPTION } from "@/lib/site";
import { formatDate, truncate } from "@/lib/utils";
import { loadOptionalUiData } from "@/server/optional-ui-data";

const loadPublicProjectResult = cache(async (projectId: string) => {
  try {
    return {
      ok: true as const,
      project: await getPublicProject(projectId),
    };
  } catch (error) {
    console.error("Unable to load the public project page", error);
    return { ok: false as const };
  }
});

function ProjectPageUnavailable({
  retryPath,
  title,
  description,
  retryLabel,
}: {
  retryPath: string;
  title: string;
  description: string;
  retryLabel: string;
}) {
  return (
    <div
      role="alert"
      className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center"
    >
      <span className="rounded-2xl bg-rose-50 p-4 text-danger">
        <TriangleAlert className="size-7" />
      </span>
      <h1 className="mt-5 text-3xl font-black">{title}</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      <Button asChild className="mt-6">
        <a href={retryPath}>{retryLabel}</a>
      </Button>
    </div>
  );
}

async function ProjectSidebar({ projectId }: { projectId: string }) {
  const suggestionResult = await loadOptionalUiData(
    "project suggestion sidebar",
    () => getProjectSuggestionSummary(projectId),
  );
  if (!suggestionResult.ok) return <ProjectSectionUnavailable />;
  const suggestions = suggestionResult.data;
  if (suggestions.totalCount > 0) {
    return (
      <ProjectSuggestionPanel
        projectId={projectId}
        items={suggestions.items}
        totalCount={suggestions.totalCount}
      />
    );
  }
  const recommendationResult = await loadOptionalUiData(
    "project recommendations",
    () => getRecommendationPool(projectId),
  );
  if (!recommendationResult.ok) return <ProjectSectionUnavailable />;
  return (
    <RecommendedProjects
      key={projectId}
      pool={selectRandomRecommendations(recommendationResult.data, 5)}
    />
  );
}

async function ProjectSuggestionControl({
  projectId,
  projectName,
  ownerId,
  slug,
}: {
  projectId: string;
  projectName: string;
  ownerId: string;
  slug: string;
}) {
  const sessionResult = await loadOptionalUiData(
    "project suggestion control",
    getSession,
  );
  if (!sessionResult.ok) return null;
  const session = sessionResult.data;
  const accountState = !session
    ? "guest"
    : session.user.onboardingCompleted
      ? "ready"
      : "onboarding";
  return (
    <ProjectSuggestionButton
      projectId={projectId}
      projectName={projectName}
      nextPath={publicProjectPath({ id: projectId, slug })}
      accountState={accountState}
      isOwner={session?.user.id === ownerId}
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
  const viewerResult = await loadOptionalUiData(
    "project like control",
    async () => {
      const session = await getSession();
      const viewerLiked = session
        ? await getViewerProjectLike(projectId, session.user.id)
        : false;
      return { session, viewerLiked };
    },
  );
  if (!viewerResult.ok) return null;
  const { session, viewerLiked } = viewerResult.data;
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
      nextPath={publicProjectPath({ id: projectId, slug })}
      access={access}
    />
  );
}

export async function generateMetadata({
  params,
}: PageProps<"/p/[projectId]/[slug]">): Promise<Metadata> {
  const { projectId, slug } = await params;
  const [projectResult, { t }] = await Promise.all([
    loadPublicProjectResult(projectId),
    getTranslations(),
  ]);
  if (!projectResult.ok) {
    return {
      title: t("Project temporarily unavailable"),
      robots: { index: false, follow: false },
    };
  }
  const project = projectResult.project;
  if (!project)
    return {
      title: t("Project not found"),
      robots: { index: false, follow: false },
    };
  if (slug !== project.slug) permanentRedirect(publicProjectPath(project));
  const description =
    truncate(project.description.replace(/[#*_`>\[\]]/g, ""), 155) ||
    SITE_DESCRIPTION;
  const imageUrl = project.images[0]?.url;
  return {
    title: project.name,
    description,
    alternates: { canonical: publicProjectPath(project) },
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

export default async function ProjectPage({
  params,
}: PageProps<"/p/[projectId]/[slug]">) {
  const projectPromise = params.then(({ projectId }) =>
    loadPublicProjectResult(projectId),
  );
  const [{ projectId, slug }, projectResult, { locale, t }] = await Promise.all(
    [params, projectPromise, getTranslations()],
  );
  if (!projectResult.ok) {
    return (
      <ProjectPageUnavailable
        retryPath={publicProjectPath({ id: projectId, slug })}
        title={t("Project temporarily unavailable")}
        description={t(
          "The project could not be loaded right now. The rest of the site is still available.",
        )}
        retryLabel={t("Try again")}
      />
    );
  }
  const project = projectResult.project;
  if (!project) notFound();
  if (slug !== project.slug) permanentRedirect(publicProjectPath(project));
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
                href={publicProfilePath({
                  id: project.ownerId,
                  username: project.ownerUsername,
                })}
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
            <div className="flex flex-wrap gap-2">
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
                  slug={project.slug}
                  likeCount={project.likeCount}
                />
              </Suspense>
              <Suspense
                fallback={
                  <div
                    aria-hidden="true"
                    className="h-10 w-36 animate-pulse rounded-xl bg-muted"
                  />
                }
              >
                <ProjectSuggestionControl
                  projectId={project.id}
                  projectName={project.name}
                  ownerId={project.ownerId}
                  slug={project.slug}
                />
              </Suspense>
              {project.qrCodeUrl ? (
                <ProjectQrCodeButton
                  qrCodeUrl={project.qrCodeUrl}
                  projectName={project.name}
                  variant={
                    project.websiteUrl || project.githubUrl
                      ? "outline"
                      : "default"
                  }
                />
              ) : null}
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
                  variant={
                    project.websiteUrl || project.qrCodeUrl
                      ? "outline"
                      : "default"
                  }
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

          <article className="mt-10 rounded-2xl border bg-white p-6 sm:p-8">
            <MarkdownContent>{project.description}</MarkdownContent>
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
                  href={publicProfilePath({
                    id: project.ownerId,
                    username: project.ownerUsername,
                  })}
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
            <ProjectSidebar projectId={project.id} />
          </Suspense>
        </aside>
      </div>
    </div>
  );
}
