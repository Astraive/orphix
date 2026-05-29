import test from "node:test";
import assert from "node:assert/strict";
import { DockerManager } from "./DockerManager.ts";

test("DockerManager delegates workspace discovery to orphix-core", async () => {
  const calls: Array<[string, unknown[]]> = [];
  const core = {
    dockerDiscoverWorkspace: async (...args: unknown[]) => {
      calls.push(["dockerDiscoverWorkspace", args]);
      return {
        cwd: String(args[0]),
        files: [],
        options: [],
        composeFiles: [],
        dockerfiles: [],
      };
    },
  };

  const manager = new DockerManager(core as never);
  const workspace = await manager.discoverWorkspace("E:/project");

  assert.equal(workspace.cwd, "E:/project");
  assert.deepEqual(calls, [["dockerDiscoverWorkspace", ["E:/project"]]]);
});

test("DockerManager delegates container operations to orphix-core", async () => {
  const calls: Array<[string, unknown[]]> = [];
  const core = new Proxy({}, {
    get: (_target, prop) => async (...args: unknown[]) => {
      calls.push([String(prop), args]);
      if (prop === "dockerPs") return [];
      if (prop === "dockerLogs") return "";
      if (prop === "dockerExec") return { shell: "docker", args: ["exec", "-it", args[0], args[1]] };
      return undefined;
    },
  });

  const manager = new DockerManager(core as never);
  await manager.ps(true);
  await manager.start("abc");
  await manager.stop("abc");
  await manager.remove("abc", true);
  await manager.exec("abc", "/bin/bash");

  assert.deepEqual(calls, [
    ["dockerPs", [true]],
    ["dockerStart", ["abc"]],
    ["dockerStop", ["abc"]],
    ["dockerRemove", ["abc", true]],
    ["dockerExec", ["abc", "/bin/bash"]],
  ]);
});
