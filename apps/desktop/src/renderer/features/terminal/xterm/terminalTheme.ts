import type { ITheme } from "@xterm/xterm";
import { getThemeById, createXtermTheme } from "@orphix/themes";

export const orphixTerminalTheme: ITheme = createXtermTheme(getThemeById("orphix.dark")) as ITheme;

export function toXtermTheme(themeId?: string): ITheme {
  return createXtermTheme(getThemeById(themeId ?? "orphix.dark")) as ITheme;
}
