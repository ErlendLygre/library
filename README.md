# Home Library

A small web app for a household's book collection: browse the shared library, add books (with ISBN lookup), and write your own review and rating of each book.

- **Backend:** ASP.NET Core 10 minimal API, EF Core, PostgreSQL, ASP.NET Core Identity (cookie auth)
- **Frontend:** React + TypeScript (Vite), React Router, TanStack Query
- **Hosting:** one Scaleway Serverless Container that serves both the API and the SPA, plus a Scaleway Serverless SQL Database
- **Infrastructure:** OpenTofu
- **CI/CD:** GitHub Actions

## Live demo

**https://erlendlygre.github.io/library/**

The demo is the real React UI running against an in-browser fake of the API (`frontend/src/api/demo.ts`). Its data is stored in your browser's `localStorage`. Sign in as `admin@demo.local` or `kari@demo.local` (password `demo`). Use **Reset demo data** in the banner to start over.

To build the demo yourself, run `npm run build:demo` in `frontend/`. The production build doesn't include the demo code.

```
backend/     .NET solution (src/Library.Api, tests/Library.Api.Tests)
frontend/    React app
infra/       OpenTofu: registry, serverless DB, IAM credentials, container
infra/bootstrap/   one-time: Object Storage bucket for tofu state
scripts/deploy.sh  manual deploy
Dockerfile   multi-stage build -> single runtime image
```

## Features

- A shared household library with search (title, author, ISBN or shelf), sorting and paging.
- Book details: author, year, publisher, pages, ISBN, shelf location, cover and description.
- **ISBN lookup** through Open Library, which fills in the details automatically.
- Each user writes **one review per book**, with a 1–5 star rating, text and the date they finished reading. Average ratings appear across the app.
- Users and roles:
  - **There is no open sign-up.** The first admin is created from configuration, and admins create other users.
  - Any signed-in user can add books and edit their details.
  - Only the user who added a book, or an admin, can delete it.
  - Deleting a user removes their reviews but keeps the books they added.

## Local development

You need the .NET 10 SDK, Node 22 and Docker.

```bash
docker compose up -d db                 # PostgreSQL on localhost:5432
```

```bash
cd backend/src/Library.Api && dotnet run  # API on http://localhost:5000
```

```bash
cd frontend && npm install && npm run dev  # UI on http://localhost:5173
```

The API applies migrations on startup. It also seeds the admin from `appsettings.Development.json`: sign in with `admin@example.com` / `changeme123`.

To run the full production image locally instead (it's served at http://localhost:8080):

```bash
docker compose --profile app up --build
```

### Tests

```bash
cd backend && dotnet test     # integration tests against a throwaway Postgres (Testcontainers; needs Docker)
```

```bash
cd frontend && npm run lint && npm run build
```

### Database migrations

```bash
dotnet tool install -g dotnet-ef
```

```bash
cd backend/src/Library.Api && dotnet ef migrations add <Name> -o Data/Migrations
```

## Deploying to Scaleway

### What gets created

| Resource | Purpose | Cost when idle |
|---|---|---|
| Container Registry namespace (private) | Stores the app image | Storage only: cents per month |
| Serverless SQL Database | PostgreSQL that scales to zero | Storage only: cents per month |
| IAM application, policy and API key | Database credentials. Serverless SQL DB authenticates through IAM. | Free |
| Serverless Container (`min_scale = 0`) | Runs the app with HTTPS | Nothing when idle; billed per use |
| Object Storage bucket (bootstrap) | OpenTofu state | Negligible |

The tradeoff is a cold start of a few seconds on the first request after an idle period, while both the container and the database wake up.

### 1. Create an API key

Create an API key in the Scaleway console, either for your user or, preferably, for an IAM application dedicated to deployments. Its policy must allow the following:

- **Project scope:**
  - `ContainersFullAccess`
  - `ContainerRegistryFullAccess`
  - `ServerlessSQLDatabaseFullAccess`
  - `ObjectStorageFullAccess`
- **Organization scope:** `IAMManager`. The tofu config creates an IAM application, policy and key for the database, so it needs this.

### 2. Create the state bucket (once)

```bash
export SCW_ACCESS_KEY=... SCW_SECRET_KEY=... SCW_DEFAULT_ORGANIZATION_ID=...
```

```bash
cd infra/bootstrap && tofu init && tofu apply -var project_id=<project-id> -var bucket_name=library-tofu-state-<unique>
```

### 3a. Deploy with GitHub Actions (recommended)

Add the following settings to the repository (**Settings → Secrets and variables → Actions**):

| Kind | Name | Value |
|---|---|---|
| Secret | `SCW_ACCESS_KEY` | API access key |
| Secret | `SCW_SECRET_KEY` | API secret key |
| Secret | `SCW_DEFAULT_ORGANIZATION_ID` | Organization ID |
| Secret | `SCW_DEFAULT_PROJECT_ID` | Project ID |
| Variable | `TF_STATE_BUCKET` | Bucket name from step 2 |
| Variable | `ADMIN_EMAIL` | Email for the first admin account |
| Variable | `CUSTOM_DOMAIN` | *(optional)* e.g. `library.example.com` |

Every push to `main` runs the deploy workflow:

1. CI: backend tests, frontend lint and build, `tofu validate`.
2. Make sure the registry exists.
3. Build the image and push it, tagged with the commit SHA.
4. `tofu apply` with that image tag.

The app URL appears in the workflow summary. The deploy job uses the `production` GitHub environment, so you can add required reviewers there if you want.

### 3b. Deploy manually

```bash
export SCW_ACCESS_KEY=... SCW_SECRET_KEY=... SCW_DEFAULT_ORGANIZATION_ID=...
export TF_VAR_project_id=... TF_VAR_admin_email=you@example.com TF_STATE_BUCKET=library-tofu-state-<unique>
```

```bash
./scripts/deploy.sh
```

### First sign-in

If you didn't set `admin_password`, tofu generates one:

```bash
cd infra && tofu output -raw admin_password
```

Sign in with `ADMIN_EMAIL` and that password, then change it under your account page. The admin is only seeded when no admin exists, so later deploys won't reset it. After that, add your household members under **Users**.

### Custom domain

1. Create a `CNAME` record from your hostname to the `container_endpoint` output.
2. Set `CUSTOM_DOMAIN` (or `TF_VAR_custom_domain`) and deploy again. Scaleway provisions the TLS certificate.

## Configuration reference

The app reads these settings as environment variables:

| Variable | Description |
|---|---|
| `ConnectionStrings__Library` | Npgsql connection string |
| `Admin__Email` / `Admin__Password` | Initial admin account, created only if no admin exists |
| `Admin__DisplayName` | Display name of the initial admin (default `Admin`) |
| `RateLimiting__LoginPerMinute` | Login attempts allowed per IP per minute (default 10) |

Data-protection keys, which sign the auth cookies, are stored in the database. Sessions therefore survive restarts and scale-to-zero.
