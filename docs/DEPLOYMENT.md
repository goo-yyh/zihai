# Production deployment

The target deployment is Vercel (Pro recommended for production controls), Neon PostgreSQL, and a public Vercel Blob store.

## 1. Provision services

1. Create a Neon project in the deployment region nearest the primary audience.
2. Copy the pooled connection string into `DATABASE_URL`.
3. Create a public Vercel Blob store and connect it to the Vercel project. Confirm `BLOB_READ_WRITE_TOKEN` is present.
4. Generate a unique production `BETTER_AUTH_SECRET`; never reuse the local or preview secret.
5. Set `BETTER_AUTH_URL` and `NEXT_PUBLIC_SITE_URL` to the final HTTPS origin with no trailing slash.
6. Create a Resend API key for the verified `aioff.dev` domain and set `RESEND_API_KEY`. `AUTH_EMAIL_FROM` is optional and defaults to `zihAI <auth@aioff.dev>`. Resend configuration is validated only when an authentication email is sent, so public routes do not depend on the mail provider.
7. Open the Vercel project's Analytics page and enable Web Analytics. The application mounts `@vercel/analytics` in the root layout, so no analytics environment variable is required.

Use separate databases, Blob stores, OAuth apps, Resend API keys, and auth secrets for preview and production deployments.

## 2. Configure authentication providers

Create GitHub and Google OAuth clients for the production origin. Register these exact callback URLs:

```text
https://your-domain.example/api/auth/callback/github
https://your-domain.example/api/auth/callback/google
```

Set the matching client IDs and secrets in the Vercel Production environment. Add equivalent credentials for local or preview environments only when those origins are explicitly registered with the providers.

In Resend, keep `aioff.dev` verified and confirm that `auth@aioff.dev` is permitted as a sender. Add the Resend variables to Vercel Production and Preview. Never expose the API key through a `NEXT_PUBLIC_` variable.

## 3. Apply the database migration

Run migrations from a controlled release job or trusted workstation before directing production traffic to a schema-dependent release:

```bash
make install
make vercel-version
make vercel-link
make db-check-production
make db-migrate-production CONFIRM_PRODUCTION=yes
```

The Preview database uses the `staging` branch environment variables by default:

```bash
make db-check-preview
make db-migrate-preview
```

Set `PREVIEW_BRANCH=feature-x` to target another Preview branch. Production mutations require `CONFIRM_PRODUCTION=yes`; the guard is intentional and must not be removed from automation.

The initial migration includes concurrency-safe image-count triggers and integrity constraints beyond the generated Drizzle schema. Review generated migrations before applying future schema changes; do not edit a migration after it has reached production.

## 4. Verify and deploy

```bash
pnpm check
```

The production build does not initialize the database or authentication service.
Every deployed runtime still requires the real server environment variables from
this document; a successful build does not prove that OAuth, PostgreSQL, or Blob
access is configured.

Deploy the same commit verified by CI. After deployment:

1. Open `/api/auth/ok` or begin a sign-in and confirm the auth origin is correct.
2. Test email OTP delivery to both `qq.com` and `163.com`, confirm other domains and lookalike suffixes are rejected, then test GitHub and Google sign-in with non-admin accounts.
3. Complete onboarding through each provider, set a username and password, then verify username/password sign-in and password changes.
4. Upload three screenshots; confirm a fourth is rejected.
5. Promote the intended first administrator with `pnpm admin:promote <email>`.
6. Approve the project and confirm it appears on `/`, `/p/{slug}`, `/u/{username}`, and `/sitemap.xml`.
7. Create and approve an iteration, then verify the public build log.
8. Confirm `/admin`, `/dashboard`, and `/settings` are inaccessible to unauthorized users.
9. Confirm a page visit sends a request to Vercel's Web Analytics endpoint and appears in the Analytics dashboard.

## 5. Operations and rollback

- Vercel application rollbacks do not roll back the database. Prefer backward-compatible migrations and deploy schema changes before code that requires them.
- Keep Neon point-in-time restore and Vercel deployment retention enabled according to the organization’s recovery policy.
- A failed Blob-to-database callback deletes the newly uploaded object. Account and project deletion remove Blob objects before relational rows.
- Rotate any exposed OAuth, Better Auth, Neon, or Blob credential immediately and revoke affected sessions.
- Review `/admin/audit` for moderation and access-control changes.
