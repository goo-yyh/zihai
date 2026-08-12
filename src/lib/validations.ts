import { z } from "zod";

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

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password must be at most 128 characters.");

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
    name: z.string().trim().min(2).max(100),
    description: z.string().trim().min(10).max(4000),
    websiteUrl: z.string().trim().optional().default(""),
    githubUrl: z.string().trim().optional().default(""),
  })
  .superRefine((data, context) => {
    const website = data.websiteUrl.length > 0;
    const github = data.githubUrl.length > 0;
    if (website === github) {
      context.addIssue({
        code: "custom",
        path: ["websiteUrl"],
        message: "Provide exactly one of Website URL or GitHub URL.",
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
  versionLabel: z.string().trim().max(80).optional().default(""),
  description: z.string().trim().min(10).max(4000),
});

export const rejectionSchema = z.object({
  reason: z.string().trim().min(3).max(2000),
});

export const uploadKindSchema = z.enum([
  "avatar",
  "project-image",
  "iteration-image",
]);

export const uploadPayloadSchema = z.object({
  kind: uploadKindSchema,
  projectId: z.uuid().optional(),
  iterationId: z.uuid().optional(),
});

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

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
