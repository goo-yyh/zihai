"use client";

import { MessageSquareText } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import { useI18n } from "@/components/i18n-provider";
import {
  ProjectSuggestionsDrawer,
  type PublicSuggestionItem,
} from "@/components/project/project-suggestions-drawer";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { projectSuggestionStatusLabel } from "@/lib/project-suggestion-lifecycle";
import { formatDate, truncate } from "@/lib/utils";

export function ProjectSuggestionPanel({
  projectId,
  items,
  totalCount,
}: {
  projectId: string;
  items: PublicSuggestionItem[];
  totalCount: number;
}) {
  const { locale, t } = useI18n();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const closeDrawer = useCallback(() => setOpen(false), []);

  return (
    <div className="rounded-2xl border bg-white p-5">
      <div className="flex items-center gap-2 text-sm font-bold">
        <MessageSquareText className="size-4 text-primary" />
        {t("Latest suggestions")}
      </div>
      <ul className="mt-4 space-y-4">
        {items.map((suggestion) => (
          <li
            key={suggestion.id}
            className="border-b pb-4 last:border-0 last:pb-0"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <Avatar
                  src={suggestion.author.image}
                  alt={suggestion.author.username || t("User")}
                  size={28}
                />
                <span className="truncate text-xs font-bold">
                  @{suggestion.author.username || t("Deleted user")}
                </span>
              </div>
              <Badge variant={suggestion.status} className="shrink-0">
                {t(projectSuggestionStatusLabel(suggestion.status))}
              </Badge>
            </div>
            <p className="mt-2 text-sm leading-5 text-muted-foreground">
              {truncate(suggestion.content, 110)}
            </p>
            {suggestion.rejectionReason ? (
              <p className="mt-2 text-xs leading-5 text-rose-700">
                {t("Rejection reason:")}{" "}
                {truncate(suggestion.rejectionReason, 90)}
              </p>
            ) : null}
            <p className="mt-2 text-[11px] text-muted-foreground">
              {formatDate(new Date(suggestion.createdAt), locale)}
            </p>
          </li>
        ))}
      </ul>
      <Button
        ref={triggerRef}
        type="button"
        variant="outline"
        className="mt-5 w-full"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        {t("View all ({count})", { count: totalCount })}
      </Button>
      <ProjectSuggestionsDrawer
        projectId={projectId}
        open={open}
        onClose={closeDrawer}
        triggerRef={triggerRef}
      />
    </div>
  );
}
