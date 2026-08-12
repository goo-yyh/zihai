import { Search } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getAdminUsers } from "@/db/queries/admin";
import { requireAdmin } from "@/lib/session";
import { formatDate } from "@/lib/utils";

export default async function AdminUsersPage({
  searchParams,
}: PageProps<"/admin/users">) {
  await requireAdmin();
  const { q } = await searchParams;
  const search = typeof q === "string" ? q.slice(0, 100) : "";
  const users = await getAdminUsers(search);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black tracking-tight">Users</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Inspect access, linked providers, publishing activity, and bans.
        </p>
      </div>
      <form className="flex max-w-xl gap-2" action="/admin/users">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={search}
            className="pl-9"
            placeholder="Search email or username"
          />
        </div>
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>
      <div className="overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Access</th>
              <th className="px-4 py-3">Providers</th>
              <th className="px-4 py-3">Projects</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((profile) => (
              <tr key={profile.id} className="border-b last:border-0">
                <td className="px-4 py-4">
                  <p className="font-bold">
                    {profile.username
                      ? `@${profile.username}`
                      : "Setup incomplete"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {profile.email}
                  </p>
                </td>
                <td className="px-4 py-4">
                  <div className="flex gap-1">
                    <Badge
                      variant={profile.role === "admin" ? "admin" : "user"}
                    >
                      {profile.role}
                    </Badge>
                    {profile.banned ? (
                      <span className="rounded-full bg-rose-100 px-2 py-1 text-[11px] font-bold uppercase text-rose-800">
                        banned
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-4 text-muted-foreground">
                  {profile.providers || "—"}
                </td>
                <td className="px-4 py-4">{profile.projectCount}</td>
                <td className="px-4 py-4 text-muted-foreground">
                  {formatDate(profile.createdAt)}
                </td>
                <td className="px-4 py-4 text-right">
                  <Link
                    href={`/admin/users/${encodeURIComponent(profile.id)}`}
                    className="font-bold text-primary hover:underline"
                  >
                    Inspect
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!users.length ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            No users match this search.
          </p>
        ) : null}
      </div>
    </div>
  );
}
