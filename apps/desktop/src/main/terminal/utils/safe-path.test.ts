import { test, expect } from "vitest";
import type fs from "node:fs";

import { isExistingDirectory } from "./safe-path.ts";

test("isExistingDirectory returns false when stat throws ECONNRESET", () => {
  const probe = {
    statSync: () => {
      const error = new Error("ECONNRESET: connection reset by peer, stat") as NodeJS.ErrnoException;
      error.code = "ECONNRESET";
      throw error;
    },
  } as unknown as { statSync: typeof fs.statSync };

  expect(isExistingDirectory("C:\\broken\\agent\\path", probe)).toBe(false);
});
