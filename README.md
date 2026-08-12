# zihAI

zihAI is a curated launchpad for independent AI products. Builders authenticate with GitHub or Google, finish a public profile, submit a product with 1–3 screenshots, and publish later iterations. Projects and iterations become public only after an administrator approves them.

## Stack

- Next.js 16 App Router, React 19, TypeScript, and Tailwind CSS 4
- Better Auth with GitHub/Google OAuth, username sign-in, and admin controls
- Neon PostgreSQL with Drizzle ORM and versioned SQL migrations
- Vercel Blob client uploads with signed, short-lived upload intents
- Vitest, ESLint, TypeScript route type generation, and GitHub Actions CI

## Product rules

- New accounts can only be created through GitHub or Google OAuth.
- Onboarding requires a unique username, an avatar, and a local password.
- A project links to exactly one public website or one GitHub repository.
- Projects and iterations each require 1–3 JPEG, PNG, or WebP images before submission.
- All new and materially edited public content returns to the moderation queue.
- Only approved projects, approved iterations, completed public profiles, and like counts are exposed publicly.

The image count is enforced twice: in the authenticated upload flow and in PostgreSQL triggers that serialize concurrent inserts. URL exclusivity, content lengths, canonical usernames, roles, MIME types, and file sizes also have database constraints.

## Local setup

Requirements: Node.js 22.13+ (Node 24 recommended), pnpm 11, a Neon PostgreSQL database, a Vercel Blob public store, and OAuth apps for GitHub and Google.

```bash
pnpm install
cp .env.example .env.local
pnpm db:migrate
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon pooled PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | At least 32 random characters |
| `BETTER_AUTH_URL` | Canonical auth origin, such as `http://localhost:3000` |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | GitHub OAuth credentials |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth credentials |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob read/write token for a public store |
| `NEXT_PUBLIC_SITE_URL` | Canonical public site URL without a trailing slash |

OAuth callback URLs:

- GitHub: `{BETTER_AUTH_URL}/api/auth/callback/github`
- Google: `{BETTER_AUTH_URL}/api/auth/callback/google`

Generate an auth secret with `openssl rand -base64 32`. Never commit real environment files or tokens.

## Database and first administrator

Generate a migration after schema changes, review the SQL, then apply it:

```bash
pnpm db:generate
pnpm db:check
pnpm db:migrate
```

After the intended administrator signs in once and completes onboarding:

```bash
pnpm admin:promote admin@example.com
```

The admin area is available at `/admin`. The script only promotes an existing account; it does not create credentials.

## Verification

```bash
pnpm check
```

This runs linting, generated route type checks, unit tests, and a production build. CI runs the same gates on every pull request and push to `main`.

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the production checklist, OAuth configuration, migration order, Blob setup, and rollback notes.

## Security model

- Proxy redirects are optimistic only. Every protected page, Server Action, and upload endpoint revalidates the Better Auth session and role.
- Resource ownership is checked in database queries before every mutation.
- Uploads use HMAC-signed, expiring intents bound to user, resource, pathname, and MIME type; uploaded metadata is verified before persistence.
- Public pages query approved records only. Markdown is rendered without raw HTML.
- Moderation and user access changes are retained in an append-only audit table.

Report security issues privately to the repository owner rather than opening a public issue.
