const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// In a pnpm monorepo, Metro may resolve deps from the root .pnpm store
// where web/desktop packages have different versions (e.g. react-dom@19).
// Restrict resolution to the mobile app's own node_modules first.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  "@orphix/types": path.resolve(workspaceRoot, "packages/types/src"),
};

// Watch the workspace root so monorepo packages (e.g. @orphix/ui) are picked up
config.watchFolders = [workspaceRoot];

module.exports = config;
