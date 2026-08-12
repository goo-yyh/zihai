import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { UserActions } from "@/components/admin/user-actions";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminUser } from "@/db/queries/admin";
import { requireAdmin } from "@/lib/session";
import { formatDate } from "@/lib/utils";

export default async function AdminUserPage({
  params,
}: PageProps<"/admin/users/[id]">) {
  const [{ id }, admin] = await Promise.all([params, requireAdmin()]);
  const profile = await getAdminUser(id);
  if (!profile) notFound();
  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center gap-5">
        <Avatar
          src={profile.image}
          alt={profile.username || profile.email}
          size={80}
        />
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-black tracking-tight">
              {profile.username ? `@${profile.username}` : "Setup incomplete"}
            </h1>
            <Badge variant={profile.role === "admin" ? "admin" : "user"}>
              {profile.role}
            </Badge>
            {profile.banned ? (
              <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-800">
                Banned
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{profile.email}</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Joined", formatDate(profile.createdAt)],
          ["Last updated", formatDate(profile.updatedAt)],
          ["Providers", profile.providers || "—"],
          [
            "Onboarding",
            profile.onboardingCompleted ? "Complete" : "Incomplete",
          ],
        ].map(([label, value]) => (
          <Card key={label} className="p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {label}
            </p>
            <p className="mt-2 text-sm font-semibold">{value}</p>
          </Card>
        ))}
      </div>
      {profile.banReason ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <strong>Ban reason:</strong> {profile.banReason}
        </div>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Account controls</CardTitle>
        </CardHeader>
        <CardContent>
          <UserActions
            userId={profile.id}
            role={profile.role}
            banned={profile.banned}
            isSelf={admin.user.id === profile.id}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Projects ({profile.projects.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {profile.projects.length ? (
            <div className="divide-y rounded-xl border">
              {profile.projects.map((project) => (
                <div
                  key={project.id}
                  className="flex flex-wrap items-center justify-between gap-3 p-4"
                >
                  <div>
                    <p className="font-bold">{project.name}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Updated {formatDate(project.updatedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={project.status}>{project.status}</Badge>
                    <Button
                      asChild
                      size="icon"
                      variant="ghost"
                      className="size-8"
                    >
                      <Link href={`/admin/projects/${project.id}`}>
                        <ExternalLink className="size-4" />
                        <span className="sr-only">Open project</span>
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No projects.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
