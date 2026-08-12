import { notFound, redirect } from "next/navigation";

import { IterationForm } from "@/components/project/iteration-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getOwnedProject } from "@/db/queries/dashboard";
import { requireOnboardedUser } from "@/lib/session";

export default async function NewIterationPage({
  params,
}: PageProps<"/dashboard/projects/[id]/iterations/new">) {
  const [{ id }, session] = await Promise.all([params, requireOnboardedUser()]);
  const project = await getOwnedProject(id, session.user.id);
  if (!project) notFound();
  if (project.status !== "approved") redirect(`/dashboard/projects/${id}/edit`);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">
          {project.name}
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight">
          Create an iteration
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Capture what changed. You will add screenshots on the next screen.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Update details</CardTitle>
          <CardDescription>
            Focus on meaningful product progress, not a changelog dump.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <IterationForm projectId={project.id} />
        </CardContent>
      </Card>
    </div>
  );
}
