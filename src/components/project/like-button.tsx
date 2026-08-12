"use client";

import { Heart, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";

import { toggleLikeAction } from "@/actions/like";
import { Button } from "@/components/ui/button";

export function LikeButton({
  projectId,
  initialLiked,
  initialCount,
  nextPath,
  access,
}: {
  projectId: string;
  initialLiked: boolean;
  initialCount: number;
  nextPath: string;
  access: "ready" | "login" | "onboarding";
}) {
  const [pending, startTransition] = useTransition();
  const [state, updateOptimistic] = useOptimistic(
    { liked: initialLiked, count: initialCount },
    (current) => ({
      liked: !current.liked,
      count: current.count + (current.liked ? -1 : 1),
    }),
  );

  if (access !== "ready") {
    const href = access === "login"
      ? `/login?next=${encodeURIComponent(nextPath)}`
      : `/onboarding?next=${encodeURIComponent(nextPath)}`;
    return (
      <Button asChild variant="outline">
        <Link href={href}><Heart className="size-4" /> {initialCount}</Link>
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant={state.liked ? "accent" : "outline"}
      disabled={pending}
      aria-pressed={state.liked}
      onClick={() => {
        startTransition(async () => {
          updateOptimistic(undefined);
          try {
            await toggleLikeAction(projectId);
          } catch {
            toast.error("Could not update your like.");
          }
        });
      }}
    >
      {pending ? <LoaderCircle className="size-4 animate-spin" /> : <Heart className={state.liked ? "size-4 fill-current" : "size-4"} />}
      {state.count}
    </Button>
  );
}
