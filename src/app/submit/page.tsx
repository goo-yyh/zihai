import type { Metadata } from "next";

import { ProjectForm } from "@/components/project/project-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireOnboardedUser } from "@/lib/session";

export const metadata: Metadata = { title: "Submit a project", robots: { index: false, follow: false } };

export default async function SubmitPage() {
  await requireOnboardedUser();
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <div className="mb-7"><p className="text-xs font-black uppercase tracking-[0.18em] text-primary">New launch</p><h1 className="mt-2 text-4xl font-black tracking-tight">Show us what you built</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Start with the story and destination. You will add 1–3 screenshots before submitting for human review.</p></div>
      <Card><CardHeader><CardTitle>Project details</CardTitle><CardDescription>Use a public website or a public GitHub repository—not both.</CardDescription></CardHeader><CardContent className="pt-4"><ProjectForm /></CardContent></Card>
    </div>
  );
}
