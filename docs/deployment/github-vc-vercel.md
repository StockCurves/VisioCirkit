# GitHub VC Vercel Deployment

This deployment line is for the GitHub-backed VisioCirkit runtime. It is separate from the static `demo` deployment because GitHub OAuth needs server-side API routes.

## Runtime

Build with:

```bash
npm run build:github-vc
```

This pins `dist/index.html` to:

```html
<meta name="circuitikz-runtime" content="github-vc" />
```

## Vercel Project

Use a separate Vercel project from the static demo when possible. The GitHub VC project needs these environment variables:

```bash
GITHUB_CLIENT_ID
GITHUB_CLIENT_SECRET
AUTH_COOKIE_SECRET
APP_BASE_URL
```

`APP_BASE_URL` must be the public Vercel origin, for example:

```bash
https://visio-cirkit-github-vc.vercel.app
```

## GitHub OAuth App

Create a GitHub OAuth App and set the authorization callback URL to:

```text
https://YOUR_GITHUB_VC_DOMAIN/api/auth/github/callback
```

The app currently requests the `repo` scope because it reads, writes, creates, and deletes repository contents on behalf of the user.

## GitHub Actions Secrets

The `GitHub VC Deploy` workflow deploys from `deploy/github-vc-vercel`. Configure these repository secrets:

```bash
VERCEL_TOKEN
VERCEL_ORG_ID
GITHUB_VC_VERCEL_PROJECT_ID
```

The Vercel project itself should hold the OAuth secrets listed above.

## Security Model

The browser does not receive the GitHub access token. The OAuth callback stores an encrypted, HttpOnly, SameSite=Lax session cookie. Browser code calls same-origin API routes under `/api/github/...`; those serverless functions attach the GitHub token server-side.

This is intentionally different from the older local prototype, which returned `?token=...` and stored the token in `localStorage`.
