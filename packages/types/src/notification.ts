export type NotificationSeverity = "info" | "success" | "warning" | "error";
export type ActivityNotificationSource = "terminal" | "link" | "device";

export interface ActivityNotificationDraft {
  source: ActivityNotificationSource;
  severity: NotificationSeverity;
  title: string;
  message: string;
  terminalId?: string | null;
  createdAt?: string;
  dedupeKey?: string;
}

const ANSI_PATTERN =
  // eslint-disable-next-line no-control-regex
  /\u001B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g;

const SUCCESS_PATTERN =
  /\b(done|completed|compiled successfully|build succeeded|tests? passed|ready in|listening on|started successfully|deployed)\b/i;

const WARNING_PATTERN =
  /\b(warn(?:ing)?|deprecated|retry|timed out|timeout|attention|blocked)\b/i;

const ERROR_PATTERN =
  /\b(error|failed|exception|traceback|panic|cannot|unable to|denied|not found|exited with code)\b/i;

const NOISE_PATTERN =
  /^(ps [A-Z]:\\|[$>#]\s*$|[\s.\-_=~]+)$/i;

function normalizeTerminalLine(data: string): string {
  const lines = data
    .replace(ANSI_PATTERN, "")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line: string) => line.trim())
    .filter(Boolean);

  for (let index = lines.length - 1; index >= 0; index -= 1) {
    const line = lines[index];
    if (NOISE_PATTERN.test(line)) continue;
    return line.replace(/\s+/g, " ").slice(0, 180);
  }

  return "";
}

export function inspectTerminalOutput(
  terminalId: string,
  data: string,
): ActivityNotificationDraft | null {
  const line = normalizeTerminalLine(data);
  if (!line) return null;

  if (ERROR_PATTERN.test(line)) {
    return {
      source: "terminal",
      severity: "error",
      title: "Terminal needs attention",
      message: line,
      terminalId,
      dedupeKey: `terminal:error:${terminalId}:${line.toLowerCase()}`,
    };
  }

  if (WARNING_PATTERN.test(line)) {
    return {
      source: "terminal",
      severity: "warning",
      title: "Terminal warning",
      message: line,
      terminalId,
      dedupeKey: `terminal:warning:${terminalId}:${line.toLowerCase()}`,
    };
  }

  if (SUCCESS_PATTERN.test(line)) {
    return {
      source: "terminal",
      severity: "success",
      title: "Terminal completed",
      message: line,
      terminalId,
      dedupeKey: `terminal:success:${terminalId}:${line.toLowerCase()}`,
    };
  }

  return null;
}

export function createTerminalExitNotification(
  terminalId: string,
  exitCode: number | null,
): ActivityNotificationDraft | null {
  if (exitCode === null || exitCode === 0) {
    return {
      source: "terminal",
      severity: "success",
      title: "Terminal finished",
      message: `Terminal ${terminalId} exited cleanly.`,
      terminalId,
      dedupeKey: `terminal:exit:${terminalId}:0`,
    };
  }

  return {
    source: "terminal",
    severity: "error",
    title: "Terminal exited with errors",
    message: `Terminal ${terminalId} exited with code ${exitCode}.`,
    terminalId,
    dedupeKey: `terminal:exit:${terminalId}:${exitCode}`,
  };
}

export function notificationSeverityWeight(severity: NotificationSeverity): number {
  switch (severity) {
    case "error":
      return 4;
    case "warning":
      return 3;
    case "success":
      return 2;
    case "info":
    default:
      return 1;
  }
}

export function pickHighestNotificationSeverity(
  severities: Array<NotificationSeverity | null | undefined>,
): NotificationSeverity | null {
  let current: NotificationSeverity | null = null;

  for (const severity of severities) {
    if (!severity) continue;
    if (!current || notificationSeverityWeight(severity) > notificationSeverityWeight(current)) {
      current = severity;
    }
  }

  return current;
}
