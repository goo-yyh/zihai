"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { createProjectAction, updateProjectAction } from "@/actions/project";
import { FieldError } from "@/components/forms/form-message";
import { SubmitButton } from "@/components/forms/submit-button";
import { useI18n } from "@/components/i18n-provider";
import { MarkdownEditor } from "@/components/markdown/markdown-editor";
import { useReviewActions } from "@/components/project/review-submit";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialActionState, type ActionState } from "@/types/actions";

type ProjectValues = {
  id?: string;
  name?: string;
  description?: string;
  websiteUrl?: string | null;
  githubUrl?: string | null;
};

function isRedirectError(error: unknown) {
  return (
    error instanceof Error &&
    "digest" in error &&
    typeof error.digest === "string" &&
    error.digest.startsWith("NEXT_REDIRECT")
  );
}

export function ProjectForm({
  project = {},
  formId,
}: {
  project?: ProjectValues;
  // When set, the form is submitted from the edit page footer instead of an
  // inline button, so the save state is shared with the footer button.
  formId?: string;
}) {
  const { t } = useI18n();
  const { registerSaveProject, setSaving } = useReviewActions();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, setState] = useState<ActionState>(initialActionState);

  const saveProject = useCallback(
    async (formData: FormData, notifyOnSuccess = true) => {
      setSaving(true);
      try {
        const result = project.id
          ? await updateProjectAction(project.id, initialActionState, formData)
          : await createProjectAction(initialActionState, formData);
        setState(result);
        if (result.status === "success" && result.message && notifyOnSuccess) {
          toast.success(t(result.message));
        } else if (result.status === "error" && result.message) {
          toast.error(t(result.message));
        }
        return result.status === "success";
      } catch (error) {
        if (isRedirectError(error)) throw error;
        setState({
          status: "error",
          message: "Unable to save the project.",
        });
        toast.error(t("Unable to save the project."));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [project.id, setSaving, t],
  );

  const saveCurrentProject = useCallback(async () => {
    const form = formRef.current;
    if (!form) {
      toast.error(t("Unable to save the project."));
      return false;
    }
    if (!form.reportValidity()) return false;
    return saveProject(new FormData(form), false);
  }, [saveProject, t]);

  useEffect(() => {
    if (!formId || !project.id) return;
    return registerSaveProject(saveCurrentProject);
  }, [formId, project.id, registerSaveProject, saveCurrentProject]);

  async function submit(formData: FormData) {
    await saveProject(formData);
  }

  return (
    <form
      ref={formRef}
      id={formId}
      action={submit}
      // React runs form actions inside a transition that defers state
      // updates until the action settles, so the loading flag must be set in
      // the submit event (outside the transition) for the spinner to paint.
      // The event only fires after native validation passes.
      onSubmit={() => setSaving(true)}
      className="space-y-5"
    >
      <div className="space-y-1.5">
        <Label htmlFor="name">{t("Project name")}</Label>
        <Input
          id="name"
          name="name"
          defaultValue={project.name}
          minLength={2}
          maxLength={100}
          placeholder={t("A sharp, memorable name")}
          required
        />
        <FieldError errors={state.fieldErrors?.name} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">{t("What did you build?")}</Label>
        <MarkdownEditor
          id="description"
          name="description"
          initialValue={project.description}
          minLength={10}
          maxLength={4000}
          rows={10}
          placeholder={t(
            "Tell people what it does, who it helps, and what makes it interesting. Markdown is supported.",
          )}
          required
        />
        <div className="flex justify-between gap-3 text-xs text-muted-foreground">
          <span>{t("Markdown supported")}</span>
          <span>{t("10–4,000 characters")}</span>
        </div>
        <FieldError errors={state.fieldErrors?.description} />
      </div>
      <fieldset className="rounded-2xl border bg-muted/40 p-4">
        <legend className="px-2 text-sm font-bold">
          {t("Add at least one destination")}
        </legend>
        <div className="mt-2 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="websiteUrl">{t("Website URL")}</Label>
            <Input
              id="websiteUrl"
              name="websiteUrl"
              type="url"
              defaultValue={project.websiteUrl || ""}
              placeholder="https://your-product.com"
            />
            <FieldError errors={state.fieldErrors?.websiteUrl} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="githubUrl">{t("GitHub repository")}</Label>
            <Input
              id="githubUrl"
              name="githubUrl"
              type="url"
              defaultValue={project.githubUrl || ""}
              placeholder="https://github.com/owner/repo"
            />
            <FieldError errors={state.fieldErrors?.githubUrl} />
          </div>
        </div>
      </fieldset>
      {formId ? null : (
        <SubmitButton pendingLabel={project.id ? "Saving…" : "Creating…"}>
          {t(project.id ? "Save project" : "Create project")}
        </SubmitButton>
      )}
    </form>
  );
}
