import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageDirectory = dirname(fileURLToPath(import.meta.url));
const specPath = resolve(packageDirectory, "../openapi.json");
const specUrl = process.env.FASTAPI_OPENAPI_URL ?? "http://127.0.0.1:8000/openapi.json";

let response;
try {
  response = await fetch(specUrl);
} catch {
  throw new Error("Could not reach FastAPI OpenAPI. Start the API or set FASTAPI_OPENAPI_URL.");
}

if (!response.ok) {
  throw new Error(`FastAPI OpenAPI request failed with HTTP ${response.status}.`);
}

const document = await response.json();
if (
  typeof document !== "object" ||
  document === null ||
  typeof document.openapi !== "string" ||
  !document.openapi.startsWith("3.") ||
  typeof document.paths?.["/health"]?.get !== "object"
) {
  throw new Error("FastAPI OpenAPI did not contain the expected OpenAPI schema and GET /health.");
}

await mkdir(dirname(specPath), { recursive: true });
await writeFile(specPath, `${JSON.stringify(document, null, 2)}\n`, "utf8");
console.info("Saved the live FastAPI OpenAPI document to packages/api-client/openapi.json.");
