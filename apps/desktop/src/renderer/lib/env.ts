// Shared env resolution for desktop renderer.
// Values are inlined at build time by electron-vite (see electron.vite.config.ts define block).

export const CONTROL_URL: string = import.meta.env.VITE_CONTROL_URL ?? "http://localhost:2605";
export const LINK_URL: string = import.meta.env.VITE_LINK_URL ?? "http://localhost:2606";
