export type OrphixTerminalValue = string;

export interface OrphixTerminalPaneColors {
  background: OrphixTerminalValue;
  foreground: OrphixTerminalValue;
  border: OrphixTerminalValue;
  borderActive: OrphixTerminalValue;
  borderHover: OrphixTerminalValue;
  borderDisabled: OrphixTerminalValue;
  shadow: OrphixTerminalValue;
  shadowActive: OrphixTerminalValue;
}

export interface OrphixTerminalTabColors {
  background: OrphixTerminalValue;
  activeBackground: OrphixTerminalValue;
  hoverBackground: OrphixTerminalValue;
  foreground: OrphixTerminalValue;
  activeForeground: OrphixTerminalValue;
  disabledForeground: OrphixTerminalValue;
  border: OrphixTerminalValue;
}

export interface OrphixTerminalStatusColors {
  background: OrphixTerminalValue;
  foreground: OrphixTerminalValue;
}

export interface OrphixTerminalScrollbarColors {
  thumb: OrphixTerminalValue;
  thumbHover: OrphixTerminalValue;
  track: OrphixTerminalValue;
}

export interface OrphixTerminalSelectionColors {
  background: OrphixTerminalValue;
  foreground: OrphixTerminalValue;
}

export interface OrphixTerminalUITokens {
  pane: OrphixTerminalPaneColors;
  tab: OrphixTerminalTabColors;
  status: OrphixTerminalStatusColors;
  scrollbar: OrphixTerminalScrollbarColors;
  selection: OrphixTerminalSelectionColors;
}

export interface OrphixTerminalTheme {
  id: string;
  themeId: string;
  variantId: string;
  name: string;
  terminal: OrphixTerminalUITokens;
}
