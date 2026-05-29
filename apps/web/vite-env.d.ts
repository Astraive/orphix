/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CONTROL_URL: string;
  readonly VITE_LINK_URL: string;
  readonly VITE_APP_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
