export function getPublicApiBaseUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!configuredUrl) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured for this web build.");
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(configuredUrl);
  } catch {
    throw new Error("NEXT_PUBLIC_API_BASE_URL must be a valid public HTTP(S) origin.");
  }

  if (
    !["http:", "https:"].includes(parsedUrl.protocol) ||
    parsedUrl.username ||
    parsedUrl.password ||
    parsedUrl.pathname !== "/" ||
    parsedUrl.search ||
    parsedUrl.hash
  ) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL must be a public HTTP(S) origin without credentials.");
  }

  const appEnv = process.env.NEXT_PUBLIC_APP_ENV?.trim() || process.env.NODE_ENV;
  if (appEnv === "production" && parsedUrl.protocol !== "https:") {
    throw new Error("Production NEXT_PUBLIC_API_BASE_URL must use HTTPS.");
  }
  return parsedUrl.origin;
}

