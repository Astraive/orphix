/**
 * Build clean PTY environment — filter to string values only, ensure TERM.
 */
export function buildPtyEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === 'string') {
      env[key] = value;
    }
  }
  env.TERM = 'xterm-256color';
  env.COLORTERM = env.COLORTERM || 'truecolor';
  if (!env.NO_COLOR) {
    env.FORCE_COLOR = env.FORCE_COLOR || '1';
  } else {
    delete env.FORCE_COLOR;
  }
  return env;
}
