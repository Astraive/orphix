// In dev mode, skip CSP entirely — Vite HMR needs websocket + eval
// In production, enforce strict CSP
const LINK_URL = process.env.ORPHIX_LINK_URL ?? "http://localhost:2606";
const LINK_WS_URL = LINK_URL.replace(/^http/, "ws");

export const CSP_PROD = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data:",
  `connect-src 'self' ${LINK_URL} ${LINK_WS_URL}`,
].join("; ");
