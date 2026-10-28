# FastAPI TypeScript client

This package contains the TypeScript client for the actual FastAPI OpenAPI document. The current contract exposes the existing `GET /health` liveness endpoint only; no business API or authentication behavior is defined here.

## Regenerate the contract

1. Start FastAPI locally using `.\apps\api\.venv\Scripts\python.exe apps/api/run_dev.py` from the repository root.
2. From `apps/web`, run `npm run api:generate`.

The script fetches `http://127.0.0.1:8000/openapi.json` by default, saves the response to `openapi.json`, and runs `openapi-typescript` to update `src/generated/schema.d.ts`. Set `FASTAPI_OPENAPI_URL` only when generating from a different trusted FastAPI instance. The generated JSON and TypeScript are safe to commit; they contain the API contract, not credentials.

Web code should use `createApiClient()` through `apps/web/lib/api/client.ts`. Keep all database access behind FastAPI.
