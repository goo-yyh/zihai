import { Plus } from "lucide-react";
import Link from "next/link";

import { ProjectDiscovery } from "@/components/project/project-discovery";
import { Button } from "@/components/ui/button";
import { getPublicProjects } from "@/db/queries/public";
import { getTranslations } from "@/lib/i18n-server";
import { projectDiscoveryParamsSchema } from "@/lib/project-discovery";

export const dynamic = "force-dynamic";

function firstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function Home({ searchParams }: PageProps<"/">) {
  const rawSearchParams = await searchParams;
  const parsed = projectDiscoveryParamsSchema.safeParse({
    sort: firstSearchParam(rawSearchParams.sort),
    query: firstSearchParam(rawSearchParams.q),
    page: 1,
  });
  const filters = parsed.success
    ? parsed.data
    : projectDiscoveryParamsSchema.parse({});
  const [initialPage, { t }] = await Promise.all([
    getPublicProjects(filters),
    getTranslations(),
  ]);

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <ProjectDiscovery
        initialPage={initialPage}
        initialSort={filters.sort}
        initialQuery={filters.query}
      />

      <Button
        asChild
        size="lg"
        className="fixed right-4 bottom-4 z-30 size-14 rounded-full p-0 shadow-[0_16px_40px_rgb(22_26_22/28%)] sm:right-6 sm:bottom-6 sm:w-auto sm:px-5"
      >
        <Link href="/submit" title={t("Submit a project")}>
          <Plus className="size-5" />
          <span className="sr-only sm:not-sr-only">
            {t("Submit a project")}
          </span>
        </Link>
      </Button>
    </section>
  );
}
