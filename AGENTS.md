<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# zihAI agent guide

This file is the operating contract for coding agents in this repository. Read it completely before changing code. Then read `README.md`, `docs/ARCHITECTURE.md`, and the documentation closest to the area being changed.

## Required workflow

1. Inspect the current implementation and call sites before editing.
2. Preserve unrelated work and existing product behavior unless the request explicitly changes it.
3. Make the smallest coherent architectural change; do not patch the same rule independently in multiple layers.
4. Add or update tests for pure business rules and regressions.
5. Run `pnpm format` after edits.
6. Run `pnpm check` before handing off. If database schema changed, also run `pnpm db:check` and inspect the generated SQL.

Never claim a check passed unless it was run in the current workspace.

## Product invariants

These rules are non-negotiable unless the product specification changes:

- Accounts are created only through GitHub or Google OAuth.
- Onboarding must finish before projects, iterations, or likes can be created.
- A project has exactly one destination: website URL XOR GitHub repository URL.
- A project or iteration has one to three images.
- Draft, pending, rejected, and archived content is not public.
- Editing approved public fields returns that resource to pending review.
- A pending iteration does not unpublish its approved project.
- A user can like an approved project at most once.
- At least one administrator must always exist.
- Every public user-authored field is moderated before publication.

The database is the final enforcement layer for XOR URLs, unique likes, owner relationships, and concurrent image limits.

## Architecture boundaries

Follow the dependency direction documented in `docs/ARCHITECTURE.md`:

```text
app/components → actions/route handlers → server services → db/integrations
                              ↓
                         lib rules
```

### Routes and components

- `src/app` composes pages, metadata, and transport adapters.
- Keep `page.tsx` readable. Move reusable SQL to `src/db/queries` and reusable UI to `src/components`.
- Client components may collect input and invoke Server Actions. They must not import `@/db`, `@/lib/auth`, environment secrets, or `src/server` modules.
- Do not hide authorization rules only in the UI.

### Server Actions

- Every exported function in a `"use server"` file must be async.
- Treat every Server Action as a public POST endpoint.
- Follow this order: session/role check, input parsing, ownership check, mutation/service call, cache invalidation, result or redirect.
- Use Zod on the server even when the browser validates the same field.
- Keep actions grouped by resource. Project image actions do not belong in the main project form Action file; admin user actions do not belong in project moderation files.
- Redirect only after mutations and revalidation complete. Remember that `redirect()` throws a framework control-flow exception.

### Server services

- Put workflows that cross database and provider boundaries in `src/server`.
- Start server-only modules with `import "server-only"`.
- Blob credentials and operations go through `src/server/blob.ts`.
- Mutation-to-path mappings go through `src/server/cache.ts`.
- Upload authorization belongs in `upload-policy.ts`; completed-object persistence belongs in `upload-persistence.ts`.
- Do not move rendering concerns into services.

### Database

- `src/db/schema` is the schema source of truth.
- `src/db/queries` contains named read models; avoid SQL scattered through pages.
- Include ownership in mutation predicates, not only in a prior lookup.
- Use transactions for state transitions, moderation plus audit logs, and ordered image changes.
- Lock the row when concurrent reviewers or image callbacks could change the same resource.
- Do not edit a migration that may have reached a shared environment. Generate a new migration with `pnpm db:generate` and review its SQL.
- Never run automatic production schema mutation during application startup.

## Moderation lifecycle

`src/lib/content-lifecycle.ts` is the only source of truth for edit transitions and image-count submission rules.

- Never hand-code separate approved/pending/rejected branches in an Action or upload callback.
- Text edits, URL edits, image uploads, image deletions, and image reordering must use the same transition.
- Approved project edits clear the previous approval/publication state and hide the project until reapproval.
- Rejected edits return to a clean draft; they do not silently resubmit.
- Submission and approval both re-check the one-to-three image invariant.

Add table-driven tests when changing lifecycle behavior.

## Authentication and authorization

- Page guards: `requireUser`, `requireOnboardedUser`, `requireAdmin`.
- Mutation guards: `assertUser`, `assertOnboardedUser`, `assertAdmin`.
- Proxy redirects are optimistic navigation only and never sufficient authorization.
- Re-check resource ownership inside every mutation and Blob callback.
- Do not accept client-provided role, owner ID, moderation status, pathname, or approved timestamp as authoritative.
- When changing admin roles or deleting an admin account, preserve the advisory-lock protection around the final-admin invariant.

## Upload and Blob rules

- Supported types are JPEG, PNG, and WebP only.
- Avatar limit is 2 MiB; project and iteration image limit is 5 MiB each.
- Direct uploads require a signed, expiring intent bound to the user, target resource, pathname, and MIME type.
- Verify Blob-reported metadata before inserting a row.
- Store both the display URL and pathname. URLs render files; pathnames delete them.
- If a new upload cannot be persisted, delete the new Blob as compensation.
- After a successful replacement commit, cleanup failure for the old Blob must not delete the newly referenced Blob.
- Blob and PostgreSQL are not one transaction. State the operation ordering explicitly when adding a new file workflow.

Never expose `BLOB_READ_WRITE_TOKEN` or any other secret through a `NEXT_PUBLIC_` variable.

## Cache invalidation

Use the helpers in `src/server/cache.ts`. Do not scatter new `revalidatePath` calls through Actions.

Before completing a mutation, identify every consumer:

- Project public data: homepage, `/p/{slug}`, `/u/{username}`.
- Iteration public data: `/p/{slug}`.
- Avatar or username: homepage, profile, project pages, and account UI.
- Admin review or user changes: relevant queue, audit page, and admin counts.

If a new page consumes mutable data, update the relevant cache helper in the same change.

## Validation and errors

- Put reusable Zod schemas in `src/lib/validations.ts`.
- Expected safe failures use `UserFacingError` or a structured `ActionState`.
- Unexpected errors must be logged server-side and returned to users as generic messages.
- Never return raw SQL, provider, OAuth, or environment errors to the browser.
- Avoid substring matching as a business contract. Add a typed error for new expected failure modes.

## Code style and readability

- TypeScript strict mode stays enabled.
- Use descriptive domain names (`projectId`, `pendingIteration`) rather than generic names (`data`, `item`) when context is not obvious.
- Prefer early returns to deeply nested conditionals.
- Keep functions focused; split files when unrelated resources or integration phases accumulate.
- Comments should explain invariants, concurrency, or non-obvious ordering—not restate syntax.
- Use direct imports for mutation modules; do not rebuild a large catch-all Action barrel.
- Let Prettier format JSX and configuration. Do not compress components into single-line markup.
- Avoid `any`, unchecked type assertions, and non-null assertions. If an external callback has a weaker type, validate before narrowing.

## Testing expectations

The minimum gate is:

```bash
pnpm check
```

It runs:

1. Prettier verification
2. ESLint
3. Next.js route generation and TypeScript
4. Vitest
5. Production build

Also apply the relevant checks below:

- Validation or lifecycle change: add/update Vitest cases.
- Schema change: `pnpm db:generate`, inspect SQL, `pnpm db:check`.
- Auth change: test both OAuth providers, onboarding, username login, and unauthorized calls.
- Upload change: test MIME, size, count, ownership, callback compensation, replacement cleanup, and cache refresh.
- Moderation change: test pending-only review, concurrent review behavior, public visibility, rejection reason, and audit entry.
- Responsive UI change: inspect mobile, tablet, and desktop layouts.

## Definition of done

A change is complete only when:

- authorization and ownership are enforced server-side;
- validation exists at the request boundary;
- database constraints remain aligned with application rules;
- Blob cleanup and failure ordering are explicit where files are involved;
- affected caches are revalidated;
- loading, success, and error feedback remain visible;
- formatting, lint, types, tests, migration checks when applicable, and build pass;
- documentation is updated when commands, boundaries, environment variables, or operational steps change;
- no mock data, placeholder, debug logging, or unresolved TODO is introduced.
