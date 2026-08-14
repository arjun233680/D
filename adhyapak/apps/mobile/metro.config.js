// Learn more: https://docs.expo.dev/guides/monorepos/
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch the whole workspace so @adhyapak/core is picked up from source.
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
// Hierarchical lookup stays on deliberately.
//
// Disabling it — as the monorepo guide suggests — limits resolution to the two
// directories above, and npm does not put everything there: a package whose
// version conflicts with a hoisted one is nested inside its dependent, and
// Metro then cannot see it at all. That is what broke the release build, twice
// over, on expo-router's own expo-glass-effect and expo-symbols. Nothing here
// is duplicated across the workspace, so the extra lookup path costs nothing.

module.exports = config;
