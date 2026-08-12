import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { getAdminProjects } from "@/db/queries/admin";
import { requireAdmin } from "@/lib/session";
import { cn, formatDate } from "@/lib/utils";

const statuses = [
  "all",
  "pending",
  "approved",
  "rejected",
  "draft",
  "archived",
] as const;

export default async function AdminProjectsPage({
  searchParams,
}: PageProps<"/admin/projects">) {
  await requireAdmin();
  const { status } = await searchParams;
  const active =
    typeof status === "string" &&
    statuses.includes(status as (typeof statuses)[number])
      ? status
      : "all";
  const projects = await getAdminProjects(
    active === "all" ? undefined : active,
  );
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">
          Project moderation
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Review every project state and its submission context.
        </p>
      </div>
      <nav className="flex gap-2 overflow-x-auto pb-1">
        {statuses.map((item) => (
          <Link
            key={item}
            href={
              item === "all"
                ? "/admin/projects"
                : `/admin/projects?status=${item}`
            }
            className={cn(
              "rounded-full border bg-white px-3 py-1.5 text-xs font-bold capitalize",
              active === item && "border-primary bg-primary text-white",
            )}
          >
            {item}
          </Link>
        ))}
      </nav>
      <div className="overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Project</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((project) => (
              <tr key={project.id} className="border-b last:border-0">
                <td className="px-4 py-4 font-bold">{project.name}</td>
                <td className="px-4 py-4 text-muted-foreground">
                  @{project.ownerUsername || project.ownerEmail}
                </td>
                <td className="px-4 py-4">
                  <Badge variant={project.status}>{project.status}</Badge>
                </td>
                <td className="px-4 py-4 text-muted-foreground">
                  {formatDate(project.submittedAt)}
                </td>
                <td className="px-4 py-4 text-right">
                  <Link
                    href={`/admin/projects/${project.id}`}
                    className="font-bold text-primary hover:underline"
                  >
                    Review
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!projects.length ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            No projects in this view.
          </p>
        ) : null}
      </div>
    </div>
  );
}
