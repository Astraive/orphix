declare namespace NodeJS {
  interface ProcessEnv {
    EXPO_PUBLIC_CONTROL_URL?: string;
    EXPO_PUBLIC_LINK_URL?: string;
    EXPO_PUBLIC_WEB_URL?: string;
  }
}

declare var process: {
  env: NodeJS.ProcessEnv;
};
