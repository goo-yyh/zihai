import { Check, Code2, ExternalLink } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { approveProjectAction } from "@/actions/admin";
import { RejectionForm } from "@/components/admin/review-form";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminProject } from "@/db/queries/admin";
import { requireAdmin } from "@/lib/session";
import { formatDate } from "@/lib/utils";

export default async function AdminProjectPage({ params }: PageProps<"/admin/projects/[id]">) {
  const [{ id }] = await Promise.all([params, requireAdmin()]);
  const project = await getAdminProject(id);
  if (!project) notFound();
  const destination = project.githubUrl || project.websiteUrl!;
  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><h1 className="text-3xl font-black tracking-tight">{project.name}</h1><Badge variant={project.status}>{project.status}</Badge></div><Link href={`/admin/users/${encodeURIComponent(project.ownerId)}`} className="mt-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-primary"><Avatar src={project.ownerImage} alt={project.ownerUsername || project.ownerEmail} size={30} /> @{project.ownerUsername || project.ownerEmail}</Link></div><Button asChild variant="outline"><a href={destination} target="_blank" rel="noreferrer">{project.githubUrl ? <Code2 className="size-4" /> : <ExternalLink className="size-4" />} Inspect destination</a></Button></div>
      <div className="grid gap-3 sm:grid-cols-3">{project.images.map((image, index) => <div key={image.id} className="relative aspect-[16/10] overflow-hidden rounded-2xl border bg-muted"><Image src={image.blobUrl} alt={`Submission screenshot ${index + 1}`} fill sizes="(max-width: 640px) 100vw, 280px" className="object-cover" /></div>)}</div>
      <Card><CardHeader><CardTitle>Description</CardTitle></CardHeader><CardContent><article className="prose-zihai"><ReactMarkdown remarkPlugins={[remarkGfm]}>{project.description}</ReactMarkdown></article></CardContent></Card>
      <div className="grid gap-4 sm:grid-cols-3">{[["Submitted", project.submittedAt], ["Approved", project.approvedAt], ["Published", project.publishedAt]].map(([label, value]) => <Card key={String(label)} className="p-4"><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{String(label)}</p><p className="mt-2 text-sm font-semibold">{formatDate(value as Date | null)}</p></Card>)}</div>
      {project.status === "pending" ? <div className="grid gap-4 lg:grid-cols-2"><form action={approveProjectAction.bind(null, project.id)} className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4"><p className="font-bold text-emerald-900">Approve for publication</p><p className="mt-2 text-sm leading-6 text-emerald-800">This immediately makes the project visible on the homepage, profile, and sitemap.</p><Button type="submit" className="mt-4"><Check className="size-4" /> Approve</Button></form><RejectionForm kind="project" resourceId={project.id} /></div> : project.rejectionReason ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"><strong>Rejection reason:</strong> {project.rejectionReason}</div> : null}
      {project.logs.length ? <Card><CardHeader><CardTitle>Moderation history</CardTitle></CardHeader><CardContent className="space-y-3">{project.logs.map((log) => <div key={log.id} className="flex justify-between gap-4 border-b pb-3 text-sm last:border-0"><span><strong>{log.action.replaceAll("_", " ")}</strong>{log.reason ? ` — ${log.reason}` : ""}</span><span className="shrink-0 text-xs text-muted-foreground">{formatDate(log.createdAt)}</span></div>)}</CardContent></Card> : null}
    </div>
  );
}
