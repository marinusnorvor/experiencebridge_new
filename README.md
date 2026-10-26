
# ExperienceBridge

**Real Work. Verified Experience.**

ExperienceBridge is a platform developed by Team JAMS for the XANIX Challenge 2026.

It aims to connect emerging talent with real projects from organizations, supported by mentorship, structured assessments, and evidence-backed Experience Passports.

## Technology Stack

- Frontend: Next.js, TypeScript
- Backend: FastAPI, Python
- Database: Neon PostgreSQL
- Hosting: Vercel
- CI/CD: GitHub Actions
- Code Review: Automated checks, AI-assisted review, and human approval

## System Architecture

ExperienceBridge uses a decoupled frontend and backend architecture.

- The Next.js frontend communicates with the FastAPI REST API.
- FastAPI handles business logic, permissions, and database access.
- Neon PostgreSQL stores structured application data.
- Staging and production use isolated backend and database environments.

## Local development

Start the FastAPI backend from the repository root:

```powershell
.\apps\api\.venv\Scripts\python.exe apps/api/run_dev.py
```

Start the Next.js frontend in a second terminal:

```powershell
cd apps/web
npm run dev
```

The four portal dashboard routes are structural placeholders. Authentication, authorization, database access, and business workflows are not implemented.

## Project Documentation

All specifications are in the `docs/` directory:

1. [Product Requirements](docs/01-product-requirements.md)
2. [System Architecture](docs/02-system-architecture.md)
3. [Database and API](docs/03-database-api.md)
4. [UI/UX Design](docs/04-ui-ux.md)
5. [Development Roadmap](docs/05-development-roadmap.md)
6. [Engineering Standards](docs/06-engineering-standards.md)

AI coding agents must follow [AGENTS.md](AGENTS.md).

## Git Workflow

1. Developers work on individual feature branches.
2. Pull requests target `staging`.
3. Automated checks and AI-assisted review are performed.
4. The technical lead reviews and approves changes.
5. Approved changes merge into `staging` for testing.
6. Tested releases are approved and merged into `main`.

## Project Status

Planning and infrastructure setup are in progress.

The specifications remain subject to team review. GitHub Actions CI runs validation for pull requests targeting `staging` and `main`. Production deployment and external service integrations are not yet configured.

## CI checks

GitHub Actions runs frontend linting, TypeScript checks, a production build, backend tests, and Python syntax validation for pull requests targeting `staging` or `main`. The CI workflows do not deploy applications or require database credentials.

Run the frontend checks from the repository root. Install the locked dependencies once with `npm ci`, then run:

```powershell
npm run lint --workspace=web
npm run typecheck --workspace=web
npm run build --workspace=web
```

For backend checks, create the API virtual environment with Python 3.11 and install the declared dependencies once:

```powershell
py -3.11 -m venv apps/api/.venv
.\apps\api\.venv\Scripts\python.exe -m pip install -r apps/api/requirements.txt
```

Then run the tests and syntax validation from the repository root:

```powershell
.\apps\api\.venv\Scripts\python.exe -m pytest apps/api/app/tests
.\apps\api\.venv\Scripts\python.exe -m compileall -q apps/api/app apps/api/main.py apps/api/run_dev.py
```

## Team

Team JAMS — XANIX Challenge 2026.
