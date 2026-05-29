// Allowed redirect URIs — must match registered values
// All auth goes through the web app — desktop/mobile get forwarded from here
export const ALLOWED_REDIRECT_URIS: readonly string[] = (() => {
  const val = process.env.ALLOWED_REDIRECT_URIS;
  if (!val) {
    if (process.env.NODE_ENV === "production") throw new Error("ALLOWED_REDIRECT_URIS env var required in production");
    return ["http://localhost:3000/auth/callback"];
  }
  return val.split(",");
})();
