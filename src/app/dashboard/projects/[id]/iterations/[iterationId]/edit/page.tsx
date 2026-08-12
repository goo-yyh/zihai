import { Send, Trash2 } from "lucide-react";
import { notFound } from "next/navigation";

import {
  deleteIterationAction,
  submitIterationAction,
} from "@/actions/iteration";
import { ConfirmSubmitButton } from "@/components/forms/confirm-submit-button";
import { ImageManager } from "@/components/project/image-manager";
import { IterationForm } from "@/components/project/iteration-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getOwnedIteration } from "@/db/queries/dashboard";
import { requireOnboardedUser } from "@/lib/session";
import { formatDate } from "@/lib/utils";

export default async function EditIterationPage({
  params,
}: PageProps<"/dashboard/projects/[id]/iterations/[iterationId]/edit">) {
  const [{ id, iterationId }, session] = await Promise.all([
    params,
    requireOnboardedUser(),
  ]);
  const iteration = await getOwnedIteration(iterationId, session.user.id);
  if (!iteration || iteration.projectId !== id) notFound();
  const canSubmit =
    ["draft", "rejected"].includes(iteration.status) &&
    iteration.images.length >= 1 &&
    iteration.projectStatus === "approved";

  return (
    <div className="space-y-7">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-black tracking-tight">
            {iteration.versionLabel || "Untitled iteration"}
          </h1>
          <Badge variant={iteration.status}>{iteration.status}</Badge>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          For {iteration.projectName} · Created{" "}
          {formatDate(iteration.createdAt)}
        </p>
      </div>
      {iteration.rejectionReason ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <p className="font-bold text-rose-900">Reviewer feedback</p>
          <p className="mt-1 text-sm text-rose-800">
            {iteration.rejectionReason}
          </p>
        </div>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle>Iteration story</CardTitle>
          <CardDescription>
            Editing an approved iteration sends it back to review.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <IterationForm
            projectId={iteration.projectId}
            iteration={iteration}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Screenshots</CardTitle>
          <CardDescription>
            Add 1–3 images that make the improvement visible.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <ImageManager
            kind="iteration-image"
            resourceId={iteration.id}
            projectId={iteration.projectId}
            images={iteration.images}
          />
        </CardContent>
      </Card>
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-white p-5">
        <div>
          <p className="font-bold">Review controls</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Only approved parent projects can receive new iterations.
          </p>
        </div>
        <div className="flex gap-2">
          <form action={deleteIterationAction.bind(null, iteration.id)}>
            <ConfirmSubmitButton
              variant="danger"
              message="Delete this iteration and every uploaded image permanently?"
            >
              <Trash2 className="size-4" /> Delete
            </ConfirmSubmitButton>
          </form>
          {["draft", "rejected"].includes(iteration.status) ? (
            <form action={submitIterationAction.bind(null, iteration.id)}>
              <Button type="submit" disabled={!canSubmit}>
                <Send className="size-4" /> Submit for review
              </Button>
            </form>
          ) : null}
        </div>
      </div>
    </div>
  );
}
