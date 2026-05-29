export type { IconComponent, IconPack, FileIconProps } from "./types";
export { calatestiaPack, calatestiaIcons } from "./calatestia";

import { calatestiaPack } from "./calatestia";
import type { IconPack } from "./types";

// Active icon pack — change this to switch icon packs
export const activeIconPack: IconPack = calatestiaPack;

export function getFileIcon(fileName: string, isDir: boolean, isOpen?: boolean) {
  return activeIconPack.getFileIcon(fileName, isDir, isOpen);
}
