const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// In a Bun monorepo, Metro can still drift toward the workspace root
// where web/desktop packages have different React-adjacent dependencies.
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
