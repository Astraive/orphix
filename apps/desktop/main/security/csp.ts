// In dev mode, skip CSP entirely — Vite HMR needs websocket + eval
// In production, enforce strict CSP
export const CSP_PROD = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data:",
  "connect-src 'self'",
].join("; ");
