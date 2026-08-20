import { z } from "zod";

import { UPLOAD_KINDS } from "@/lib/image-policy";

export const RESERVED_USERNAMES = new Set([
  "admin",
  "api",
  "login",
  "signup",
  "settings",
  "dashboard",
  "projects",
  "project",
  "submit",
  "auth",
  "account",
  "help",
  "about",
  "robots",
  "sitemap",
]);

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Username must be at least 3 characters.")
  .max(24, "Username must be at most 24 characters.")
  .regex(/^[a-z0-9_-]+$/, "Use only a-z, 0-9, _ or -.")
  .refine((value) => !RESERVED_USERNAMES.has(value), {
    message: "This username is reserved.",
  });

export const contactEmailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "Contact email must be at most 254 characters.")
  .pipe(z.email("Enter a valid contact email."));

const websiteUrlSchema = z
  .url("Enter a valid website URL.")
  .refine((value) => ["http:", "https:"].includes(new URL(value).protocol), {
    message: "Website URL must use http or https.",
  });

const githubUrlSchema = z
  .url("Enter a valid GitHub repository URL.")
  .refine((value) => {
    const url = new URL(value);
    const segments = url.pathname
      .replace(/\.git$/, "")
      .split("/")
      .filter(Boolean);
    return (
      url.protocol === "https:" &&
      url.hostname.toLowerCase() === "github.com" &&
      segments.length === 2
    );
  }, "Use a GitHub repository URL such as https://github.com/owner/repo.");

export const projectInputSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Project name must be at least 2 characters.")
      .max(100, "Project name must be at most 100 characters."),
    description: z
      .string()
      .trim()
      .min(10, "Description must be at least 10 characters.")
      .max(4000, "Description must be at most 4,000 characters."),
    websiteUrl: z.string().trim().optional().default(""),
    githubUrl: z.string().trim().optional().default(""),
  })
  .superRefine((data, context) => {
    const website = data.websiteUrl.length > 0;
    const github = data.githubUrl.length > 0;
    if (!website && !github) {
      context.addIssue({
        code: "custom",
        path: ["websiteUrl"],
        message: "Provide a Website URL, a GitHub URL, or both.",
      });
      return;
    }
    if (website) {
      const parsed = websiteUrlSchema.safeParse(data.websiteUrl);
      if (!parsed.success) {
        context.addIssue({
          code: "custom",
          path: ["websiteUrl"],
          message: parsed.error.issues[0]?.message ?? "Invalid website URL.",
        });
      }
    }
    if (github) {
      const parsed = githubUrlSchema.safeParse(data.githubUrl);
      if (!parsed.success) {
        context.addIssue({
          code: "custom",
          path: ["githubUrl"],
          message: parsed.error.issues[0]?.message ?? "Invalid GitHub URL.",
        });
      }
    }
  })
  .transform((data) => ({
    name: data.name,
    description: data.description,
    websiteUrl: data.websiteUrl ? normalizeUrl(data.websiteUrl) : null,
    githubUrl: data.githubUrl ? normalizeGithubUrl(data.githubUrl) : null,
  }));

export const iterationInputSchema = z.object({
  versionLabel: z
    .string()
    .trim()
    .max(80, "Version label must be at most 80 characters.")
    .optional()
    .default(""),
  description: z
    .string()
    .trim()
    .min(10, "Description must be at least 10 characters.")
    .max(4000, "Description must be at most 4,000 characters."),
});

export const rejectionSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, "Rejection reason must be at least 3 characters.")
    .max(2000, "Rejection reason must be at most 2,000 characters."),
});

export const feedbackSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Feedback must be at least 1 character.")
    .max(2000, "Feedback must be at most 2,000 characters."),
});

export const uploadKindSchema = z.enum(UPLOAD_KINDS);

export const uploadPayloadSchema = z.object({
  kind: uploadKindSchema,
  projectId: z.uuid().optional(),
  iterationId: z.uuid().optional(),
});

export const uploadCompletionSchema = z.object({
  blob: z.object({
    url: z
      .url("Enter a valid Blob URL.")
      .refine((value) => new URL(value).protocol === "https:", {
        message: "Blob URL must use https.",
      }),
    pathname: z
      .string()
      .trim()
      .min(1, "Blob pathname is required.")
      .max(1024, "Blob pathname is too long."),
  }),
  clientPayload: z
    .string()
    .min(1, "Upload intent is required.")
    .max(8192, "Upload intent is too long."),
});

export function normalizeUrl(value: string) {
  const url = new URL(value.trim());
  url.hash = "";
  return url.toString();
}

export function normalizeGithubUrl(value: string) {
  const url = new URL(value.trim());
  url.hash = "";
  url.search = "";
  url.pathname = url.pathname.replace(/\.git\/?$/, "").replace(/\/$/, "");
  return url.toString();
}
