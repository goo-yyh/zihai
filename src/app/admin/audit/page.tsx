import { getAuditLogs } from "@/db/queries/admin";
import { requireAdmin } from "@/lib/session";
import { formatDate } from "@/lib/utils";

export default async function AuditPage() {
  await requireAdmin();
  const logs = await getAuditLogs();
  return (
    <div className="space-y-6"><div><h1 className="text-3xl font-black tracking-tight">Audit log</h1><p className="mt-2 text-sm text-muted-foreground">The latest 500 moderation and access-control events.</p></div><div className="overflow-x-auto rounded-2xl border bg-white"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="px-4 py-3">Action</th><th className="px-4 py-3">Admin</th><th className="px-4 py-3">Target</th><th className="px-4 py-3">Reason</th><th className="px-4 py-3">Date</th></tr></thead><tbody>{logs.map((log) => <tr key={log.id} className="border-b last:border-0"><td className="px-4 py-4 font-bold">{log.action.replaceAll("_", " ")}</td><td className="px-4 py-4 text-muted-foreground">@{log.adminUsername || log.adminEmail || "deleted admin"}</td><td className="px-4 py-4 font-mono text-xs">{log.targetType}:{log.targetId}</td><td className="max-w-xs px-4 py-4 text-muted-foreground">{log.reason || "—"}</td><td className="px-4 py-4 text-muted-foreground">{formatDate(log.createdAt)}</td></tr>)}</tbody></table>{!logs.length ? <p className="p-8 text-center text-sm text-muted-foreground">No moderation actions recorded yet.</p> : null}</div></div>
  );
}
