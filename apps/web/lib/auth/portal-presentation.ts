/** EB-012: local interface development only; never grants API permissions. */
export function isPortalPresentationMode(): boolean {
  return (
    process.env.NODE_ENV === "development" &&
    !process.env.VERCEL &&
    (!process.env.NEXT_PUBLIC_APP_ENV ||
      process.env.NEXT_PUBLIC_APP_ENV === "development")
  );
}
