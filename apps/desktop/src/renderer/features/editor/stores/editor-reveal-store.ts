import { create } from "zustand";

// A one-shot "scroll this file to this line" request, consumed by the matching
// FileEditor instance. `nonce` lets repeated jumps to the same file/line re-fire.
interface RevealTarget {
  filePath: string;
  line: number;
  nonce: number;
}

interface EditorRevealState {
  target: RevealTarget | null;
  reveal: (filePath: string, line: number) => void;
}

export const useEditorRevealStore = create<EditorRevealState>()((set) => ({
  target: null,
  reveal: (filePath, line) =>
    set((s) => ({ target: { filePath, line, nonce: (s.target?.nonce ?? 0) + 1 } })),
}));
