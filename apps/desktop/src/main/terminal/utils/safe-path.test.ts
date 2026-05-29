import assert from "node:assert/strict";
import test from "node:test";
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

  assert.equal(isExistingDirectory("C:\\broken\\agent\\path", probe), false);
});
