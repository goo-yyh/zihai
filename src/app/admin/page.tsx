import {
  CheckCircle2,
  Clock3,
  FolderKanban,
  ListChecks,
  Users,
  XCircle,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getAdminProjects, getAdminStats } from "@/db/queries/admin";
import { requireAdmin } from "@/lib/session";
import { formatDate } from "@/lib/utils";

export default async function AdminPage() {
  await requireAdmin();
  const [stats, pendingPage] = await Promise.all([
    getAdminStats(),
    getAdminProjects("pending", { pageSize: 8 }),
  ]);
  const pending = pendingPage.items;
  const cards = [
    ["Users", stats.users, Users],
    ["All projects", stats.projects, FolderKanban],
    ["Pending projects", stats.pendingProjects, Clock3],
    ["Pending iterations", stats.pendingIterations, ListChecks],
    ["Approved", stats.approvedProjects, CheckCircle2],
    ["Rejected", stats.rejectedProjects, XCircle],
  ] as const;
  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-semibold text-primary">Review operations</p>
        <h1 className="mt-1 text-3xl font-black tracking-tight">
          Admin overview
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Moderate launches, iterations, access, and platform safety.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(([label, value, Icon]) => (
          <Card key={label} className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-muted-foreground">
                {label}
              </p>
              <Icon className="size-4 text-primary" />
            </div>
            <p className="mt-4 text-3xl font-black">{value}</p>
          </Card>
        ))}
      </div>
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-black">Pending projects</h2>
          <Button asChild size="sm" variant="outline">
            <Link href="/admin/projects?status=pending">Open queue</Link>
          </Button>
        </div>
        {pending.length ? (
          <div className="overflow-hidden rounded-2xl border bg-white">
            {pending.map((project) => (
              <Link
                href={`/admin/projects/${project.id}`}
                key={project.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b p-4 last:border-0 hover:bg-muted/40"
              >
                <div>
                  <p className="font-bold">{project.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    @{project.ownerUsername || project.ownerEmail} · submitted{" "}
                    {formatDate(project.submittedAt)}
                  </p>
                </div>
                <Badge variant="pending">pending</Badge>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            The project queue is clear.
          </Card>
        )}
      </section>
    </div>
  );
}
